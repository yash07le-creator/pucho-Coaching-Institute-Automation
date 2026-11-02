// src/lib/roles.ts — Level-2 roles (v5.1, G6). A role = a name, a description and the pages it opens, each page "view"
// (its records, no action) or "edit" (its records and its actions). Stored in `app_roles`; the os.yaml roles are seeded there
// as built-in (db/schema.sql). ONE function answers what a role allows, cached, cleared on every role write:
//   pages     the keys of `pages` (Administrator: '*')
//   entities  ∪ PAGE_ENTITIES[page] over every ticked page          (dal.canRead)
//   actions   ∪ PAGE_ACTIONS[page] over the pages ticked EDIT        (actions.runAction)
//   base      the built-in role it started from: record scope (SCOPES[base]) and the RLS context
// Administrator (`admin`) is everything, always — never stored-editable, never deletable, never a "Start from".
// An unknown role key opens nothing. The static os.yaml map (ROLE_PERMISSIONS / ENTITY_ACCESS / ACTIONS) decides nothing
// on the server any more: a database without `app_roles` (not migrated to v5.1) opens no page to any role but Administrator.
import 'server-only';
import { pool, query } from './db';
import { PAGES } from '@/config/pages';
import { PAGE_ENTITIES, PAGE_ACTIONS } from '@/config/access';
import { ROLE_LABELS } from '@/config/roles';

export type Mode = 'view' | 'edit';
export type RoleAccess = { key: string; label: string; base: string; pages: Record<string, Mode> | '*'; entities: string[] | '*'; actions: string[] | '*' };
export type RoleRow = { key: string; label: string; description: string; baseRole: string; pages: Record<string, Mode>; builtIn: boolean; updatedAt: string; updatedBy: string | null };
export class RoleInUse extends Error { constructor(public n: number) { super(`${n} ${n === 1 ? 'person holds' : 'people hold'} this role`); } }
export class RoleError extends Error {}

export const ADMIN = 'admin';
const TTL_MS = 30_000;
const PE = PAGE_ENTITIES as unknown as Record<string, string[]>;
const PA = PAGE_ACTIONS as unknown as Record<string, string[]>;
/** The pages a role may be given: every signed-in page of the OS (a public page needs no role). */
export const ROLE_PAGE_IDS: string[] = (PAGES as unknown as { id: string; public?: boolean }[]).filter((p) => !p.public).map((p) => p.id);
const PAGE_SET = new Set(ROLE_PAGE_IDS);
/** Every action declared on any signed-in page — what Administrator's '*' means for a Server Action (never an undeclared key). */
export const ALL_PAGE_ACTIONS: Set<string> = new Set(ROLE_PAGE_IDS.flatMap((p) => PA[p] ?? []));

type Cache = { at: number; rows: Map<string, RoleRow> | null; missing: boolean };
declare global { var __puchoRoles: Cache | undefined }   // eslint-disable-line no-var
const cache = (): Cache => (globalThis.__puchoRoles ??= { at: 0, rows: null, missing: false });
export function clearRoleCache() { const c = cache(); c.at = 0; c.rows = null; }

const cleanPages = (raw: unknown): Record<string, Mode> => {
  const out: Record<string, Mode> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [p, m] of Object.entries(raw as Record<string, unknown>)) {
    if (m !== 'view' && m !== 'edit') continue;
    if (p === '*') { for (const id of ROLE_PAGE_IDS) out[id] = m; continue; }   // a seeded "every page" row
    if (PAGE_SET.has(p)) out[p] = m;                                              // a page that no longer exists opens nothing
  }
  return out;
};

async function loadRoles(): Promise<Cache> {
  const c = cache();
  if (c.rows && Date.now() - c.at < TTL_MS) return c;
  try {
    const rows = await query<{ key: string; label: string; description: string; base_role: string; pages: unknown; built_in: boolean; updated_at: string; updated_by: string | null }>(
      'SELECT key, label, description, base_role, pages, built_in, updated_at::text, updated_by FROM app_roles');
    c.rows = new Map(rows.map((r) => [r.key, { key: r.key, label: r.label, description: r.description, baseRole: r.base_role, pages: cleanPages(r.pages), builtIn: r.built_in, updatedAt: r.updated_at, updatedBy: r.updated_by }]));
    c.missing = false;
  } catch (e) {
    // a database migrated before v5.1 has no app_roles: fail closed (only Administrator opens anything) until `db:migrate`
    if ((e as { code?: string })?.code !== '42P01') throw e;
    if (!c.missing) console.warn('app_roles is missing: only Administrator can open pages until `npm run db:migrate` runs');
    c.rows = new Map(); c.missing = true;
  }
  c.at = Date.now();
  return c;
}

const union = (lists: (string[] | undefined)[]) => [...new Set(lists.flatMap((l) => l ?? []))].sort();
const adminAccess = (label?: string): RoleAccess => ({ key: ADMIN, label: label || (ROLE_LABELS as Record<string, string>)[ADMIN] || 'Administrator', base: ADMIN, pages: '*', entities: '*', actions: '*' });

/** What the role allows, resolved for the request (cached; cleared on any role write). */
export async function roleAccess(roleKey: string): Promise<RoleAccess> {
  const c = await loadRoles();
  if (roleKey === ADMIN) return adminAccess(c.rows?.get(ADMIN)?.label);
  const r = c.rows!.get(roleKey);
  const none = (label = roleKey): RoleAccess => ({ key: roleKey, label, base: '', pages: {}, entities: [], actions: [] });
  if (!r) return none();                                                    // unknown role → nothing
  // the record scope comes from the base: a built-in role is its own base; a custom role's base must be a stored built-in
  // role other than Administrator — an empty / admin / unknown base fails CLOSED (never "its own key", which is unscoped)
  let base: string;
  if (r.builtIn) base = r.key;
  else {
    const b = r.baseRole ? c.rows!.get(r.baseRole) : undefined;
    if (!b || !b.builtIn || b.key === ADMIN) return none(r.label);
    base = b.key;
  }
  const ticked = Object.keys(r.pages);
  return {
    key: r.key, label: r.label, base, pages: r.pages,
    entities: union(ticked.map((p) => PE[p])),
    actions: union(ticked.filter((p) => r.pages[p] === 'edit').map((p) => PA[p])),
  };
}

/** May a role with this access run the action key? Administrator: any action declared on a page. */
export function mayAct(a: Pick<RoleAccess, 'actions'>, key: string): boolean {
  return a.actions === '*' ? ALL_PAGE_ACTIONS.has(key) : a.actions.includes(key);
}

export type RoleDTO = RoleRow & { locked: boolean; users: number };
/** Every role, Administrator first (locked), with how many people hold it. */
export async function listRoles(): Promise<RoleDTO[]> {
  const c = await loadRoles();
  const counts = new Map((await query<{ role: string; n: number }>('SELECT role, count(*)::int AS n FROM users GROUP BY role')).map((r) => [r.role, r.n]));
  const rows = [...(c.rows?.values() ?? [])].filter((r) => r.key !== ADMIN);
  const admin = c.rows?.get(ADMIN);
  const adminRow: RoleDTO = { key: ADMIN, label: admin?.label || adminAccess().label, description: admin?.description ?? '', baseRole: ADMIN,
    pages: Object.fromEntries(ROLE_PAGE_IDS.map((p) => [p, 'edit' as Mode])), builtIn: true, updatedAt: admin?.updatedAt ?? '', updatedBy: admin?.updatedBy ?? null, locked: true, users: counts.get(ADMIN) ?? 0 };
  rows.sort((a, b) => Number(b.builtIn) - Number(a.builtIn) || a.label.localeCompare(b.label));
  return [adminRow, ...rows.map((r) => ({ ...r, locked: false, users: counts.get(r.key) ?? 0 }))];
}

/** Does this key name a role a person may be given (Administrator or any stored role)? */
export async function roleExists(key: string): Promise<boolean> {
  if (key === ADMIN) return true;
  const c = await loadRoles();
  return c.rows!.has(key);
}

export const slugOf = (label: string) =>
  label.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '') || 'role';

export type RoleInput = { key?: string; label: string; description: string; baseRole: string; pages: Record<string, string> };
/** Create (no key) or edit (key) a role. Administrator is refused, as is a base of Administrator, an unknown page id or a mode
 *  other than view / edit. A new role's key is the slug of its name, made unique (-2, -3 …); renaming never changes the key.
 *  Takes effect for everyone at their next request. The caller (a Server Action) has checked the admin. */
export async function saveRole(input: RoleInput, who: string): Promise<{ key: string }> {
  const label = input.label.trim(); const description = (input.description ?? '').trim();
  if (!label) throw new RoleError('Give the role a name');
  if (input.key === ADMIN) throw new RoleError('Administrator cannot be edited');
  const pages: Record<string, Mode> = {};
  for (const [p, m] of Object.entries(input.pages ?? {})) {
    if (!PAGE_SET.has(p)) throw new RoleError(`Unknown page: ${p}`);
    if (m !== 'view' && m !== 'edit') throw new RoleError(`Page ${p}: choose view or edit`);
    pages[p] = m;
  }
  const c = await loadRoles();
  if (c.missing) throw new RoleError('Run `npm run db:migrate` first — this database has no roles table yet');
  return withRoleLock(async (client) => {
    const all =(await client.query<{ key: string; base_role: string; built_in: boolean }>('SELECT key, base_role, built_in FROM app_roles')).rows;
    const byKey = new Map(all.map((r) => [r.key, r]));
    // the base (record scope + RLS context) is always a built-in role other than Administrator; a custom "Start from" passes its own base on
    const baseOf = (k: string): string => {
      if (!k || k === ADMIN) throw new RoleError('Start from a role other than Administrator');
      const b = byKey.get(k); if (!b) throw new RoleError(`Unknown role to start from: ${k}`);
      const base = b.built_in ? b.key : b.base_role;
      if (!base || base === ADMIN || !byKey.get(base)?.built_in) throw new RoleError('Start from a role other than Administrator');
      return base;
    };
    let key: string;
    if (input.key) {
      const cur = byKey.get(input.key); if (!cur) throw new RoleError('No such role');
      key = input.key;
      const base = cur.built_in ? cur.key : (input.baseRole ? baseOf(input.baseRole) : cur.base_role);   // a built-in role keeps its own base
      await client.query('UPDATE app_roles SET label = $2, description = $3, base_role = $4, pages = $5::jsonb, updated_at = now(), updated_by = $6 WHERE key = $1',
        [key, label.slice(0, 60), description.slice(0, 300), base, JSON.stringify(pages), who]);
    } else {
      const base = baseOf(input.baseRole);
      const stem = slugOf(label); key = stem;
      for (let n = 2; key === ADMIN || byKey.has(key); n++) key = `${stem}-${n}`;
      await client.query('INSERT INTO app_roles (key, label, description, base_role, pages, built_in, updated_by) VALUES ($1, $2, $3, $4, $5::jsonb, false, $6)',
        [key, label.slice(0, 60), description.slice(0, 300), base, JSON.stringify(pages), who]);
    }
    return { key };
  });
}

/** Delete a role nobody holds (active or not) and no other role starts from. Administrator never. Built-in roles may go (the
 *  admin's choice): an app_settings record `deleted_role:<key>` keeps db/schema.sql from seeding it again on the next migrate. */
export async function deleteRole(key: string, who: string): Promise<void> {
  if (key === ADMIN) throw new RoleError('Administrator cannot be deleted');
  const c = await loadRoles();
  if (c.missing) throw new RoleError('Run `npm run db:migrate` first — this database has no roles table yet');
  await withRoleLock(async (client) => {
    // under the roles lock (setUserRole / createUser take it too): nobody can be given the role between the count and the delete
    const n = (await client.query<{ n: number }>('SELECT count(*)::int AS n FROM users WHERE role = $1', [key])).rows[0]?.n ?? 0;
    if (n > 0) throw new RoleInUse(n);
    // a custom role takes its record scope from its base: deleting the base would leave it opening nothing (fail closed)
    const d = (await client.query<{ n: number }>('SELECT count(*)::int AS n FROM app_roles WHERE base_role = $1 AND key <> $1', [key])).rows[0]?.n ?? 0;
    if (d > 0) throw new RoleError(`${d} ${d === 1 ? 'role starts' : 'roles start'} from this one — change or delete ${d === 1 ? 'it' : 'them'} first`);
    const r = await client.query<{ built_in: boolean }>('DELETE FROM app_roles WHERE key = $1 RETURNING built_in', [key]);
    if (!r.rowCount) throw new RoleError('No such role');
    if (r.rows[0].built_in) await client.query(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES ($1, now()::text, now(), $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by`, [`deleted_role:${key}`, who]);
  });
}

/** One transaction under the roles lock — every write that must see a consistent set of roles and role holders (a role
 *  write, a person's role change, the last-administrator rule). */
export async function withRoleLock<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('pucho:app_roles'))");
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; }
  finally { client.release(); clearRoleCache(); }
}
