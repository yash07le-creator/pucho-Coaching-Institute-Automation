// src/lib/dal.ts — the data-access layer (standards §19.3): who is asking, what they may see, scoped queries, DTOs.
// Every read and every write of an entity — from a Server Component, a Server Action or a Route Handler a flow calls —
// goes through here, so one place knows the entity vocabulary (ENTITIES from os.yaml), the role → entity access map
// and the per-person scope (ACCESS, generated), the audit log and the encrypted columns.
import 'server-only';
import { randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { PoolClient } from 'pg';
import { pool, query } from './db';
import { ENTITIES } from '@/config/os.config';
import { SCOPES, PUBLIC_ENTITIES } from '@/config/access';
import { encryptField, decryptField, isCiphertext, blindIndex, encryptionConfigured } from './crypto';
import { normaliseFormat, canonicalValue, type FieldRule } from './validate';
import type { SessionUser } from './auth';

export type Actor = { kind: 'user'; user: SessionUser } | { kind: 'flow'; name: string } | { kind: 'public'; page: string } | { kind: 'system' };
export type Row = Record<string, string>;
type Entity = { id: { column: string; prefix: string }; columns: string[]; types?: Record<string, string>; created?: string | null; encrypted?: string[]; status?: { column: string; values: string[] } | null; unique?: string[]; unique_together?: string[][]; field_rules?: Record<string, { type?: string }> };
const E = ENTITIES as unknown as Record<string, Entity>;
type Q = { query: PoolClient['query'] };

export class NotFound extends Error { constructor(m = 'Not found') { super(m); } }
/** A write the actor may not make (a scoped person writing a row for someone else, or Postgres RLS WITH CHECK, 42501). → 403. */
export class Forbidden extends Error { constructor(m = 'Not allowed') { super(m); } }
/** A write would duplicate a value the entity declared `unique` (or `unique_together`), or an id that already exists.
 *  Carries the offending field(s) and — ONLY when that row is inside the actor's scope — the existing row's id (§14.4:
 *  a row outside your scope does not exist to you, so a 409 never names it). → 409. */
export class Conflict extends Error {
  /** The other columns of a unique_together group ("Quotation_No" for Quotation_No+Item_Code). The error is keyed on the
   *  group's LAST column, a real field, so the form can show it inline and gates can name it (v4.9 gate finding). */
  public with: string[];
  constructor(public field: string, public existingId: string) {
    super('Duplicate');
    const parts = field.split('+'); this.field = parts[parts.length - 1]; this.with = parts.slice(0, -1);
  }
}
/** The database refused a value its CHECK guards (the app-layer Zod is the first line; this is the last). → 400. */
export class Invalid extends Error { constructor(public field: string) { super('Invalid value'); } }
/** The one 409 wording every door uses: the id only when the actor may see that row. */
export const conflictMessage = (c: Conflict) =>
  `already in use${c.with.length ? ` with this ${c.with.map((x) => x.replace(/_/g, ' ')).join(' + ')}` : ''}${c.existingId ? ` (${c.existingId})` : ''}`;

export const table = (entity: string) => `"${entity}"`;
export const col = (c: string) => `"${c.toLowerCase()}"`;
export function entityOf(name: string): Entity { const e = E[name]; if (!e) throw new NotFound(`no entity ${name}`); return e; }

/** Map a Postgres unique-violation constraint name back to a field label for the 409 body. Our indexes are named
 *  `<table>_<col…>_uq` (gen_schema); a composite one maps back to its unique_together group ("A+B"). */
function uniqueFieldFromConstraint(entity: string, constraint?: string): string {
  if (!constraint) return 'value';
  const e = entityOf(entity); let s = constraint.toLowerCase(); const pre = `${entity.toLowerCase()}_`;
  if (s.startsWith(pre)) s = s.slice(pre.length);
  if (s.endsWith('_uq')) s = s.slice(0, -3);
  const match = e.columns.find((c) => c.toLowerCase() === s);
  if (match) return match;
  const g = (e.unique_together ?? []).find((x) => x.map((c) => c.toLowerCase()).join('_') === s);
  return g ? g.join('+') : s || 'value';
}
/** A v4.9 CHECK is named `<table[:24]>_<col[:24]>_v49_<hash>` (scaffold_os.py check_sync_sql), an older inline one `<table>_<col>_check`. */
function checkFieldFromConstraint(entity: string, constraint?: string): string {
  const m = /^(.*)_v49_[0-9a-f]{8}$/.exec(constraint ?? '') ?? /^(.*)_check$/.exec(constraint ?? '');
  if (!m) return 'value';
  let s = m[1].toLowerCase(); const t = entity.toLowerCase();
  for (const pre of [`${t.slice(0, 24)}_`, `${t}_`]) if (s.startsWith(pre)) { s = s.slice(pre.length); break; }
  return entityOf(entity).columns.find((c) => c.toLowerCase() === s || c.toLowerCase().slice(0, 24) === s) ?? 'value';
}
const pgCode = (err: unknown) => (err as { code?: string })?.code;
/** One translation of a database refusal into the DAL's vocabulary, for every write. */
function mapWriteError(entity: string, err: unknown): unknown {
  if (err instanceof Conflict || err instanceof Invalid || err instanceof Forbidden || err instanceof NotFound) return err;
  const code = pgCode(err); const constraint = (err as { constraint?: string })?.constraint;
  if (code === '23505') return new Conflict(uniqueFieldFromConstraint(entity, constraint), '');   // the UNIQUE index is the last line
  if (code === '23514') return new Invalid(checkFieldFromConstraint(entity, constraint));
  if (code === '42501') return new Forbidden();                                                    // RLS WITH CHECK (or a missing grant)
  return err;
}

/** May this actor read the entity at all? (A record they may not see is a 404, never a 403 — §14.4.) */
export function canRead(actor: Actor, entity: string): boolean {
  if (!(entity in E)) return false;
  if (actor.kind === 'system' || actor.kind === 'flow') return true;
  if (actor.kind === 'public') return ((PUBLIC_ENTITIES as unknown as Record<string, string[]>)[actor.page] ?? []).includes(entity);
  // v5.1 (G6): the entities the person's role reads — ∪ PAGE_ENTITIES over the pages it ticks (lib/roles.ts roleAccess)
  const allowed = actor.user.entities;
  return allowed === '*' || allowed.includes(entity);
}
export type Scope = { column: string; value: string; email: string };
/** The column a self-service role is pinned to on this entity (`Rep={{user}}` on every page it can open, or roles[].scope)
 *  — scope applies server-side, on reads AND writes. v5.1: the scope is the role's BASE role's (a custom role keeps the record
 *  scope of the role it started from), and a record belongs to the person when the column holds their name OR their email,
 *  trimmed, case-insensitive (LEAP log C4). */
export function scopeOf(actor: Actor, entity: string): Scope | null {
  if (actor.kind !== 'user') return null;
  const s = ((SCOPES as unknown as Record<string, Record<string, string>>)[actor.user.base] ?? {})[entity];
  // trimmed; an EMPTY name or email never matches anything (fix round 1): '' would otherwise match every row whose scope
  // column is empty. Both empty → the person sees and writes nothing on this entity.
  return s ? { column: s, value: (actor.user.name ?? '').trim(), email: (actor.user.email ?? '').trim() } : null;
}
const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
/** Does a stored / sent scope value name this person (name or email, trimmed, any case)? Empty never matches. */
export const isMine = (scope: Scope, v: unknown) => { const x = norm(v); return x !== '' && ((norm(scope.value) !== '' && x === norm(scope.value)) || (norm(scope.email) !== '' && x === norm(scope.email))); };
/** The SQL twin of isMine — `lower(trim(col::text)) IN (nullif(lower(trim($a)), ''), nullif(lower(trim($b)), ''))`: an empty
 *  parameter becomes NULL, which matches nothing (not even an empty column). Parameters are numbered by the caller. */
const scopeSql = (scope: Scope, a: number) => `lower(trim(${col(scope.column)}::text)) IN (nullif(lower(trim($${a}::text)), ''), nullif(lower(trim($${a + 1}::text)), ''))`;

// ── value shaping: the kernel reads every value as a string (as it did from CSV / PostgREST); the database keeps real types ──
function fromDb(e: Entity, r: Record<string, unknown>, entity: string): Row {
  const out: Row = {};
  for (const c of e.columns) {
    const v = r[c.toLowerCase()];
    let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (e.encrypted?.includes(c) && isCiphertext(s)) { try { s = decryptField(s, `${entity}.${c}:${r[e.id.column.toLowerCase()]}`); } catch { s = '••••'; } }
    out[c] = s;
  }
  return out;
}
const uniqueCols = (e: Entity) => new Set([...(e.unique ?? []), ...(e.unique_together ?? []).flat()]);
/** The stored form of a value: typed formats normalised (email lower-case, phone without separators, GSTIN upper-case — so
 *  uniqueness compares what a person means, v4.9 review D), and a blank in a declared-unique column stored as NULL (a UNIQUE
 *  index treats NULLs as distinct, so two records without a mobile are not duplicates — review B). */
function storedValue(e: Entity, c: string, v: unknown): unknown {
  if (v == null) return v;
  // v5.0: the canonical form validate.ts judged ("₹1,25,000" → 125000, "15/10/2026" → 2026-10-15, "High" → the list's "high")
  let out: unknown = canonicalValue(e.field_rules?.[c] as FieldRule | undefined, e.types?.[c], v);
  if (typeof out === 'string' && (e.types?.[c] ?? 'text') === 'text') out = out.trim();   // v4.9 QA: "   " is not a value; edges trimmed
  if (typeof out === 'string' && out.trim() === '' && uniqueCols(e).has(c)) out = null;
  return out;
}
function toDb(e: Entity, entity: string, row: Record<string, unknown>, id: string): { cols: string[]; vals: unknown[] } {
  const cols: string[] = []; const vals: unknown[] = [];
  for (const c of e.columns) {
    if (!(c in row)) continue;
    const raw = row[c]; const t = e.types?.[c] ?? 'text';
    let v: unknown = raw == null ? null : Array.isArray(raw) || (typeof raw === 'object') ? JSON.stringify(raw) : raw;
    v = storedValue(e, c, v);
    if (typeof v === 'string' && t !== 'text') v = v.trim();   // "   " in a number / date column is empty, never 0
    if (v === '' && t !== 'text') v = null;
    // v4.9 QA: a value that is not a number / not a date is REFUSED (400 naming the column) — never stored as empty, never a 500.
    // lib/validate.ts refuses it first on every door; this is the last line for any path that skipped it.
    if (v != null && t === 'numeric') { const n = Number(typeof v === 'string' ? v.trim() : v); if (!Number.isFinite(n)) throw new Invalid(c); v = n; }
    if (v != null && t === 'boolean') v = ['true', '1', 'yes', 'on', 'y', 't'].includes(String(v).toLowerCase());
    if (v != null && (t === 'date' || t === 'timestamptz') && String(v).trim() === '') v = null;
    if (v != null && (t === 'date' || t === 'timestamptz') && String(v).trim() !== 'now' && Number.isNaN(Date.parse(String(v)))) throw new Invalid(c);   // 'now' = Postgres's own literal
    if (v != null && e.encrypted?.includes(c)) {
      if (!encryptionConfigured()) throw new Error(`${entity}.${c} is declared encrypted but FIELD_ENC_KEYS is not set`);
      const plain = String(v); v = encryptField(plain, `${entity}.${c}:${id}`); cols.push(`${c.toLowerCase()}_bidx`); vals.push(blindIndex(plain));
    }
    cols.push(c.toLowerCase()); vals.push(v);
  }
  return { cols, vals };
}

/** v4.9 (§19) · set the row-level-security context for this transaction, so Postgres enforces the same scope the DAL does
 *  (db/rls.sql). `pucho.scope` = the person's name, `pucho.scope_email` = their email (v5.1, C4), `pucho.unscoped` = '1' for an actor with no scope on this entity
 *  (admin, flow, system). set_config(…, true) is transaction-local, so every caller runs inside a BEGIN/COMMIT. In dev the
 *  app connects as the superuser, which bypasses RLS, so this is a no-op locally; on a handed-over Pucho DB (a login IN ROLE
 *  app) it is what makes a cross-scope row invisible even to a query that forgot its WHERE. */
async function setScope(client: Q, actor: Actor, entity: string): Promise<void> {
  const scope = scopeOf(actor, entity);
  if (scope) await client.query("SELECT set_config('pucho.scope', $1, true), set_config('pucho.scope_email', $2, true), set_config('pucho.unscoped', '0', true)", [scope.value, scope.email]);
  else await client.query("SELECT set_config('pucho.scope', '', true), set_config('pucho.scope_email', '', true), set_config('pucho.unscoped', '1', true)");
}
/** Run `fn` with the RLS context lifted (whole-table facts the DAL needs: the next id number, whether a unique value is taken),
 *  then put the actor's context back. Only the DAL's own fixed queries run inside; nothing from the caller is returned raw. */
async function unscopedFor<T>(client: Q, actor: Actor, entity: string, fn: () => Promise<T>): Promise<T> {
  await client.query("SELECT set_config('pucho.unscoped', '1', true)");
  try { return await fn(); } finally { await setScope(client, actor, entity); }
}

/** v5.1 (LEAP log C4) · does ANY record of `entity` belong to this person (the scope column holds their name or email,
 *  trimmed, any case)? For the admin's "matches no record" warning: a whole-table fact, so it runs in its own transaction
 *  with the RLS context marked unscoped (on a login IN ROLE app the policy would otherwise hide every row). Only this fixed
 *  query runs inside; the answer is a boolean. */
export async function scopeHasRecord(entity: string, column: string, name: string, email: string): Promise<boolean> {
  const e = entityOf(entity); if (!e.columns.includes(column)) return false;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('pucho.scope', '', true), set_config('pucho.scope_email', '', true), set_config('pucho.unscoped', '1', true)");
    const r = await client.query(`SELECT 1 FROM ${table(entity)} WHERE lower(trim(${col(column)}::text)) IN (nullif(lower(trim($1::text)), ''), nullif(lower(trim($2::text)), '')) LIMIT 1`, [name, email]);
    await client.query('COMMIT');
    return r.rows.length > 0;
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; } finally { client.release(); }
}

// v4.9 review F · one transaction for several DAL writes (an effect that inserts a head, its lines and patches another
// row): inside inTransaction every insertRows / patchRow / getRow joins the same client, so a later Conflict / Invalid /
// Forbidden rolls the earlier writes back too. Calls inside must be sequential (one client, one RLS context at a time).
const TX = new AsyncLocalStorage<PoolClient>();
export async function inTransaction<T>(fn: () => Promise<T>): Promise<T> {
  if (TX.getStore()) return fn();
  const client = await pool.connect();
  try { await client.query('BEGIN'); const r = await TX.run(client, fn); await client.query('COMMIT'); return r; }
  catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; } finally { client.release(); }
}
/** Run `fn` inside a transaction whose RLS scope context is set for `actor`/`entity` (the caller's, when one is open). */
async function inScope<T>(actor: Actor, entity: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const outer = TX.getStore();
  if (outer) { await setScope(outer, actor, entity); return fn(outer); }
  const client = await pool.connect();
  try { await client.query('BEGIN'); await setScope(client, actor, entity); const r = await fn(client); await client.query('COMMIT'); return r; }
  catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; } finally { client.release(); }
}

// ── reads (each inside a transaction that sets the RLS scope context; the app-layer WHERE stays as the first guard) ──
/** v5.0 · a value a person picked from another table's list (`from: team_members.Name`) must still exist there — the browser's
 *  dropdown cannot be trusted on its own (a stale tab, a crafted request). Case-insensitive; an unchanged stored value is not
 *  re-judged. People's writes only (Server Actions, a page action): a flow may legitimately write a name the list does not hold yet. */
export async function lookupErrors(entity: string, row: Record<string, unknown>, current?: Record<string, unknown> | null): Promise<Record<string, string> | null> {
  const rules = ((ENTITIES as any)[entity]?.field_rules ?? {}) as Record<string, FieldRule>; const errors: Record<string, string> = {};
  for (const [c, r] of Object.entries(rules)) {
    if (!r.from || !(c in row)) continue;
    const v = String(row[c] ?? '').trim(); if (!v) continue;
    if (current && String(current[c] ?? '').trim().toLowerCase() === v.toLowerCase()) continue;
    const [src, srcCol] = r.from.split('.'); const se = (ENTITIES as any)[src];
    if (!se || !se.columns.includes(srcCol)) continue;
    const q = await query(`SELECT 1 FROM ${table(src)} WHERE lower(trim(${col(srcCol)}::text)) = lower($1) LIMIT 1`, [v]);
    if (!q.length) errors[c] = `must be one of the existing ${src.replace(/_/g, ' ')} (${srcCol.replace(/_/g, ' ')})`;
  }
  return Object.keys(errors).length ? errors : null;
}
export async function listRows(actor: Actor, entity: string): Promise<Row[]> {
  if (!canRead(actor, entity)) throw new NotFound();
  const e = entityOf(entity); const scope = scopeOf(actor, entity);
  const rows = await inScope(actor, entity, (c) => c.query(
    `SELECT row_to_json(t) AS r FROM ${table(entity)} t ${scope ? `WHERE ${scopeSql(scope, 1)}` : ''} ORDER BY t._seq DESC`, scope ? [scope.value, scope.email] : []));
  return rows.rows.map((x: { r: Record<string, unknown> }) => fromDb(e, x.r, entity));
}
export async function getRow(actor: Actor, entity: string, id: string): Promise<Row | null> {
  if (!canRead(actor, entity)) return null;
  const e = entityOf(entity); const scope = scopeOf(actor, entity);
  const rows = await inScope(actor, entity, (c) => c.query(
    `SELECT row_to_json(t) AS r FROM ${table(entity)} t WHERE ${col(e.id.column)} = $1 ${scope ? `AND ${scopeSql(scope, 2)}` : ''}`, scope ? [id, scope.value, scope.email] : [id]));
  return rows.rows[0] ? fromDb(e, rows.rows[0].r, entity) : null;
}
/** Everything the actor may read, for the entities named — one round trip per entity, missing ones skipped. */
export async function loadEntities(actor: Actor, names: string[]): Promise<Record<string, Row[]>> {
  const out: Record<string, Row[]> = {};
  await Promise.all([...new Set(names)].filter((n) => n in E && canRead(actor, n)).map(async (n) => { out[n] = await listRows(actor, n); }));
  return out;
}

/** v4.9 duplicate detection. Pre-check the entity's declared uniqueness — field-level `unique:` (each its own group) and
 *  entity-level `unique_together:` (a composite group) — against a row about to be written, on the NORMALISED value the
 *  row will be stored with. Runs on the write's own transaction with the RLS context lifted (a value another person's row
 *  holds is still taken — the UNIQUE index would refuse it anyway), but only names the existing row when it is inside the
 *  actor's scope. Returns the first conflict or null. `exceptId` excludes the row being patched. A group whose columns are
 *  not all present and non-empty is skipped; encrypted columns are not matched here (the UNIQUE index on them is the guard). */
export async function findDuplicate(entity: string, row: Record<string, unknown>, exceptId?: string, ctx?: { client: Q; actor: Actor }): Promise<{ field: string; id: string } | null> {
  const e = entityOf(entity); const actor: Actor = ctx?.actor ?? { kind: 'system' }; const scope = scopeOf(actor, entity);
  const groups: string[][] = [...(e.unique ?? []).map((c) => [c]), ...(e.unique_together ?? [])];
  const run = async (client: Q) => {
    for (const g of groups) {
      if (g.some((c) => e.encrypted?.includes(c))) continue;
      const vals = g.map((c) => storedValue(e, c, row[c]));
      if (!g.every((c, i) => c in row && vals[i] != null && String(vals[i]).trim() !== '')) continue;
      const where = g.map((c, i) => `${col(c)} = $${i + 1}`).join(' AND ');
      const sql = `SELECT ${col(e.id.column)} AS id${scope ? `, ${col(scope.column)}::text AS sc` : ''} FROM ${table(entity)} WHERE ${where}${exceptId ? ` AND ${col(e.id.column)} <> $${g.length + 1}` : ''} LIMIT 1`;
      const r = await unscopedFor(client, actor, entity, () => client.query(sql, exceptId ? [...vals.map(String), exceptId] : vals.map(String)));
      const hit = r.rows[0] as { id: string; sc?: string } | undefined;
      if (hit) return { field: g.join('+'), id: !scope || isMine(scope, hit.sc) ? String(hit.id) : '' };
    }
    return null;
  };
  if (ctx) return run(ctx.client);
  return inScope(actor, entity, run);
}

// ── ids: <prefix><year>-<nnnn>, numbered inside the year, under an advisory lock so two inserts never share one. The next
// number is the highest existing one + 1 — NOT count + 1 (seeded / imported ids are sparse) — and it is read over the WHOLE
// table: under RLS a scoped person sees only their own rows, so a max over that slice collided with another person's id and
// ON CONFLICT DO NOTHING dropped the row (v4.9 security round). The lock is transaction-scoped: pass the write's client. ──
export async function nextId(entity: string, client?: Q, actor: Actor = { kind: 'system' }): Promise<string> {
  const e = entityOf(entity); const year = String(new Date().getFullYear()); const sep = e.id.prefix.endsWith('-') ? '-' : '/';
  const run = async (c: Q) => {
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [entity]);
    const r = await unscopedFor(c, actor, entity, () => c.query(`SELECT coalesce(max(substring(${col(e.id.column)} from '([0-9]{1,15})$')::bigint), 0)::text AS n FROM ${table(entity)} WHERE ${col(e.id.column)} LIKE $1`, [`${e.id.prefix}${year}${sep}%`]));
    return `${e.id.prefix}${year}${sep}${String(Number(r.rows[0].n) + 1).padStart(4, '0')}`;
  };
  return client ? run(client) : inScope(actor, entity, run);
}

/** A scoped person writes only their own rows: the scope column is set to them when blank, and a different value is refused. */
function pinScope(actor: Actor, entity: string, row: Record<string, unknown>): void {
  const scope = scopeOf(actor, entity); if (!scope) return;
  const v = String(row[scope.column] ?? '').trim();
  if (v && !isMine(scope, v)) throw new Forbidden();
  const own = v || scope.value || scope.email;      // their name or email as they gave it; blank → their name (else email)
  if (!own) throw new Forbidden();                   // a person with neither cannot own a row (never an empty scope value)
  row[scope.column] = own;
}

// ── writes ──
export async function insertRows(actor: Actor, entity: string, rows: Record<string, unknown>[], opts: { flow?: string; action?: string; audit?: boolean } = {}): Promise<Row[]> {
  const e = entityOf(entity); const scope = scopeOf(actor, entity);
  try {
    return await inScope(actor, entity, async (client) => {
      const out: Row[] = [];
      for (const raw of rows) {
        const row: Record<string, unknown> = {};
        for (const c of e.columns) if (c in raw) row[c] = raw[c];
        pinScope(actor, entity, row);                       // v4.9: a rep cannot create a row for another rep
        let id = String(row[e.id.column] ?? '').trim();
        if (!id) id = await nextId(entity, client, actor);
        row[e.id.column] = id;
        const dup = await findDuplicate(entity, row, undefined, { client, actor });   // refuse a declared-unique collision before the insert (→ 409)
        if (dup) throw new Conflict(dup.field, dup.id);
        if (e.created && !row[e.created]) row[e.created] = new Date().toISOString();
        const { cols, vals } = toDb(e, entity, row, id);
        const r = await client.query(
          `INSERT INTO ${table(entity)} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${vals.map((_, i) => `$${i + 1}`).join(', ')})
           ON CONFLICT (${col(e.id.column)}) DO NOTHING RETURNING row_to_json(${table(entity)}) AS r`, vals);
        // the id is taken: a 409, never a 201 with [] (a flow's retry learns the row exists; the id is named only to an unscoped caller)
        if (!r.rows[0]) throw new Conflict(e.id.column, scope ? '' : id);
        const stored = fromDb(e, r.rows[0].r, entity); out.push(stored);
        if (opts.audit !== false) await writeAudit(actor, opts.flow ?? 'direct', opts.action ?? 'insert', entity, stored[e.id.column], stored, client);
      }
      return out;
    });
  } catch (err) { throw mapWriteError(entity, err); }
}

export async function patchRow(actor: Actor, entity: string, id: string, patch: Record<string, unknown>, opts: { flow?: string; action?: string; audit?: boolean } = {}): Promise<Row | null> {
  const e = entityOf(entity); const scope = scopeOf(actor, entity);
  if (scope && scope.column in patch && !isMine(scope, patch[scope.column])) throw new Forbidden();   // v4.9: a row cannot be moved out of the person's scope
  const { cols, vals } = toDb(e, entity, Object.fromEntries(Object.entries(patch).filter(([k]) => k !== e.id.column)), id);
  if (!cols.length) return getRow(actor, entity, id);
  try {
    return await inScope(actor, entity, async (client) => {
      const dup = await findDuplicate(entity, patch, id, { client, actor });   // a patch may not move a unique value onto another row's (→ 409)
      if (dup) throw new Conflict(dup.field, dup.id);
      const r = await client.query(
        `UPDATE ${table(entity)} SET ${cols.map((cc, i) => `"${cc}" = $${i + 1}`).join(', ')} WHERE ${col(e.id.column)} = $${cols.length + 1} ${scope ? `AND ${scopeSql(scope, cols.length + 2)}` : ''}
         RETURNING row_to_json(${table(entity)}) AS r`, scope ? [...vals, id, scope.value, scope.email] : [...vals, id]);
      if (!r.rows[0]) return null;                                               // a row outside the person's scope does not exist to them
      if (opts.audit !== false) await writeAudit(actor, opts.flow ?? 'direct', opts.action ?? 'patch', entity, id, patch, client);
      return fromDb(e, r.rows[0].r, entity);
    });
  } catch (err) { throw mapWriteError(entity, err); }
}

/** A scheduled sync owns its whole table: clear and refill in one transaction (the Sheets `clear_sheet` + insert of v3). */
export async function replaceRows(actor: Actor, entity: string, rows: Record<string, unknown>[], opts: { flow?: string } = {}): Promise<number> {
  const e = entityOf(entity); const scope = scopeOf(actor, entity);
  try {
    return await inScope(actor, entity, async (client) => {     // v4.9: a scoped sync only clears/refills rows in its own scope
      await client.query(`DELETE FROM ${table(entity)}`);
      let n = 0;
      for (const raw of rows) {
        const row: Record<string, unknown> = {}; for (const c of e.columns) if (c in raw) row[c] = raw[c];
        pinScope(actor, entity, row);
        let id = String(row[e.id.column] ?? '').trim(); if (!id) id = await nextId(entity, client, actor); row[e.id.column] = id;
        const { cols, vals } = toDb(e, entity, row, id);
        const r = await client.query(`INSERT INTO ${table(entity)} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${vals.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT (${col(e.id.column)}) DO NOTHING`, vals);
        if (!r.rowCount) throw new Conflict(e.id.column, scope ? '' : id);       // a repeated id in the batch, or one outside the caller's scope
        n += r.rowCount;
      }
      await writeAudit(actor, opts.flow ?? 'sync', 'replace', entity, '', { rows: n }, client);
      return n;
    });
  } catch (err) { throw mapWriteError(entity, err); }
}

// ── audit (os.audit: true): one writer — this layer — for every write, whoever asked for it. Written on the write's own
// transaction when there is one, so a write and its audit row commit (or roll back) together. audit_log itself is never
// scoped (scaffold_os validate refuses a scope on it), so the row-level policy cannot hide or refuse it. ──
const AUDIT = 'audit_log' in E;
export const actorName = (a: Actor) => a.kind === 'user' ? a.user.name : a.kind === 'flow' ? `flow:${a.name}` : a.kind === 'public' ? 'public form' : 'system';
export async function writeAudit(actor: Actor, flow: string, action: string, entity: string, recordId: string, payload: Record<string, unknown>, client?: Q) {
  if (!AUDIT || entity === 'audit_log') return;
  const summary = Object.entries(payload).filter(([k, v]) => !k.startsWith('_') && k !== 'action' && typeof v !== 'object' && String(v ?? '').trim()).slice(0, 4).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v).slice(0, 40)}`).join(' · ');
  const a = E.audit_log; const row = { Audit_ID: `AUD-${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString('hex').toUpperCase()}`, At: new Date().toISOString(), Who: actorName(actor), Flow: flow, Action: action, Entity: entity, Record_ID: String(recordId ?? ''), Summary: summary };
  const { cols, vals } = toDb(a, 'audit_log', row, row.Audit_ID);
  const sql = `INSERT INTO "audit_log" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${vals.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT DO NOTHING`;
  const c = client ?? TX.getStore();
  if (c) await c.query(sql, vals); else await query(sql, vals);
}

// ── files (D6): bytes live in the database, under the plan's cap ──
export async function storeFile(actor: Actor, f: { name: string; mime: string; data: Buffer; entity?: string; recordId?: string }): Promise<{ id: string; url: string }> {
  const maxMb = Number(process.env.FILES_MAX_MB || 10); const capMb = Number(process.env.FILES_CAP_MB || 400);
  if (f.data.length > maxMb * 1024 * 1024) throw new Error(`File is over ${maxMb} MB`);
  const used = await query<{ used: string }>('SELECT coalesce(sum(size), 0)::text AS used FROM files');
  if (Number(used[0].used) + f.data.length > capMb * 1024 * 1024) throw new Error('The storage cap for this OS is reached — delete old files or raise the plan');
  const id = `F-${randomBytes(8).toString('hex')}`;
  await query('INSERT INTO files (id, name, mime, size, data, entity, record_id, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [id, f.name, f.mime, f.data.length, f.data, f.entity ?? null, f.recordId ?? null, actorName(actor)]);
  return { id, url: `/api/files/${id}` };
}
export async function readFile(id: string): Promise<{ name: string; mime: string; data: Buffer } | null> {
  const r = await query<{ name: string; mime: string; data: Buffer }>('SELECT name, mime, data FROM files WHERE id = $1', [id]);
  return r[0] ?? null;
}
