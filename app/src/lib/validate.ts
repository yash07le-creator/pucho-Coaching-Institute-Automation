// src/lib/validate.ts — v4.9 input validation (reference/os-schema.md § v4.9 validation grammar). What an author declared on an
// entity's `fields:` block becomes a generated per-entity Zod object here, built from ENTITIES[entity].constraints (numeric
// guards: positive / min / max / integer) and ENTITIES[entity].field_rules (type email / phone / gstin / date, step, one_of,
// no_past — both emitted by scaffold_os.py). This is the schema EVERY write path uses instead of a permissive
// `z.record(z.string(), z.unknown())`: a Server Action write (actions.ts runAction), the flow door (/api/data/[entity]) and the signed
// webhook door (/api/hooks/[provider]) all validate through it, so an impossible value is rejected the same way wherever it
// enters. The Postgres CHECK generated alongside (positive / min / max / step / one_of) is the last line; no_past and the
// typed formats are app-layer only ("today" moves; a CHECK cannot). A failure is a field-keyed error map the UI renders inline.
import { z } from 'zod';
import { ENTITIES } from '@/config/os.config';

type Constraint = { positive?: boolean; min?: number; max?: number; integer?: boolean };
/** The frozen os.config contract (v4.9): ENTITIES[entity].field_rules = { Column: { type?, no_past?, one_of?, step?, default? } }.
 *  `default` (today | tomorrow | a literal) is a frontend prefill only and is never enforced here. */
export type FieldRule = { type?: string; no_past?: boolean; one_of?: (string | number)[]; step?: number; default?: unknown;
  min?: number; max?: number; integer?: boolean; max_length?: number; required?: boolean; soft?: boolean; from?: string };
// v4.9 baseline (manual QA, 15 Oct 2026): scaffold_os.py now gives EVERY column a rule from what the OS already knows — its type
// (number / date / datetime / boolean), the status list, a form's fixed dropdown, its name (Email / Phone / GSTIN, ≥ 0 for
// money and quantities, ≤ 100 for a percent) and a length cap — with the author's declaration laid over it. Before, a column
// with no declared rule passed through unchecked and the DAL quietly stored letters in a number column as empty.
const constraintsOf = (entity: string): Record<string, Constraint> =>
  ((ENTITIES as any)[entity]?.constraints ?? {}) as Record<string, Constraint>;
const rulesOf = (entity: string): Record<string, FieldRule> =>
  ((ENTITIES as any)[entity]?.field_rules ?? {}) as Record<string, FieldRule>;

// ── typed formats ──
const PHONE_RE = /^\+?\d{8,15}$/;   // 8 (a local landline) to 15 (E.164) digits, optional leading +
/** A phone number without the separators people type (spaces, dashes, brackets, dots): "(0265) 234-5678" → "02652345678". */
export const normalisePhone = (v: unknown) => String(v ?? '').replace(/[\s\-().]/g, '');
/** The stored form of a typed value (v4.9 review D): what a person means, so uniqueness and lookups compare like with like —
 *  email trimmed and lower-cased, phone without spaces / dashes (digits with an optional leading +), GSTIN trimmed and
 *  upper-cased. lib/dal.ts stores every write through this; scripts/db.mjs seeds through the same rule. */
// v5.0 review: what people and AI flows legitimately write is understood BEFORE it is judged, and stored in that canonical form —
// "₹1,25,000" is 125000, "(0265) 2345678" a phone, "15/10/2026" a date, "High" the list's "high", "Y" yes, and "N/A" / "-" /
// "not mentioned" in a typed or listed column means "not given" (empty), never a refusal that loses an AI-captured lead.
const PLACEHOLDERS = new Set(['n/a', 'na', '-', '--', 'none', 'nil', 'null', 'not provided', 'not mentioned', 'not available', 'not applicable', 'unknown', 'nill']);
const MONEY_NOISE = /₹|\brs\.?|\binr\b|,|\s/gi;
/** The canonical form of a value for its column (lib/dal.ts stores exactly this; validateEntity judges exactly this). */
export function canonicalValue(rule: FieldRule | undefined, type: string | undefined, v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const s = v.trim(); const ft = rule?.type; const t = type ?? 'text';
  const typed = !!ft || t !== 'text' || !!rule?.one_of?.length;
  if (typed && PLACEHOLDERS.has(s.toLowerCase())) return '';
  // only a value the clean-up makes valid is rewritten; anything else stays as written (judged as written, never mangled)
  if (ft === 'number' || t === 'numeric') { const n = s.replace(MONEY_NOISE, ''); return n !== '' && Number.isFinite(Number(n)) ? n : s; }
  if (ft === 'email') return s.toLowerCase();
  if (ft === 'phone') { const p = normalisePhone(s); return PHONE_RE.test(p) ? p : s; }
  if (ft === 'gstin') return s.toUpperCase();
  if (ft === 'date' || ft === 'datetime' || t === 'date' || t === 'timestamptz') {
    const dm = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:[ T](.*))?$/);   // Indian day-first: 15/10/2026, 15-10-2026 10:30
    let out = dm ? `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}${dm[4] ? 'T' + dm[4] : ''}` : s;
    out = out.replace(/^(\d{4}-\d{2}-\d{2}) (\d{1,2}:\d{2})/, '$1T$2');                 // "2026-10-15 10:30:00" (Postgres / IndiaMART shape)
    return (ft === 'date' || t === 'date') && /^\d{4}-\d{2}-\d{2}T/.test(out) ? out.slice(0, 10) : out;
  }
  if (ft === 'boolean' || t === 'boolean') { const l = s.toLowerCase(); return l === 'y' || l === 't' ? 'true' : l === 'n' || l === 'f' ? 'false' : s; }
  if (rule?.one_of?.length) { const hit = rule.one_of.map(String).find((x) => x.trim().toLowerCase() === s.toLowerCase()); return hit ?? s; }
  return v;
}
export function normaliseFormat(type: string | undefined, v: unknown): unknown {
  if (v == null || typeof v !== 'string' && typeof v !== 'number') return v;
  const s = String(v);
  if (type === 'email') return s.trim().toLowerCase();
  if (type === 'phone') return normalisePhone(s.trim());   // (kept for callers outside the DAL; the DAL uses canonicalValue)
  if (type === 'gstin') return s.trim().toUpperCase();
  return v;
}
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** The official GSTIN check character (mod-36): over the first 14 characters, value × (1, 2, 1, 2 …); add the quotient and
 *  the remainder of each product by 36; the check is (36 − sum mod 36) mod 36. e.g. 27AAPFU0939F1ZV is valid. */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) { const p = GSTIN_CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2); sum += Math.floor(p / 36) + (p % 36); }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36];
}
export function isGstin(v: unknown): boolean {
  const g = String(v ?? '').trim().toUpperCase();
  if (g === 'URP') return true;   // "unregistered person" — the GST portal's own word for a B2C party
  return GSTIN_RE.test(g) && gstinCheckChar(g.slice(0, 14)) === g[14];
}
// ── dates: "today" is the business's day (DB_TIMEZONE, default Asia/Kolkata — the zone lib/db.ts gives the database) ──
const TZ = () => (process.env.DB_TIMEZONE || 'Asia/Kolkata').replace(/[^A-Za-z0-9_\/+-]/g, '');
const ymd = (d: Date) => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ() }).format(d); } catch { return d.toISOString().slice(0, 10); } };
export const todayYmd = () => ymd(new Date());
/** A value as a calendar day (YYYY-MM-DD, business time zone for a timestamp), or null when it is not a real date. */
export function dayOf(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const d = new Date(`${s}T00:00:00Z`); return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : s; }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s)) return null;
  const d = new Date(s); return Number.isNaN(d.getTime()) ? null : ymd(d);
}

/** The generated per-entity Zod object: one guard per constrained / ruled column (every other column passes through).
 *  `coerce` so a string "-5" from JSON or a form is still checked; every field optional so a patch may send a subset.
 *  no_past is judged in validateEntity (it needs the stored value: an unchanged past date is not re-judged). */
export function entitySchema(entity: string, person = true) {
  const shape: Record<string, z.ZodTypeAny> = {};
  const cons = constraintsOf(entity); const rules = rulesOf(entity);
  for (const col of new Set([...Object.keys(cons), ...Object.keys(rules)])) {
    const r = rules[col] ?? {};
    // the numeric guards: the declared `constraints` win over the baseline's min / max / integer kept in field_rules
    const k: Constraint = { ...(typeof r.min === 'number' ? { min: r.min } : {}), ...(typeof r.max === 'number' ? { max: r.max } : {}), ...(r.integer ? { integer: true } : {}), ...(cons[col] ?? {}) };
    let s: z.ZodTypeAny;
    if (r.one_of?.length && !(r.soft && !person)) {   // an inferred list (a form's dropdown, an AI enum) binds people; flows may write other values
      const allowed = r.one_of.map(String);
      s = z.coerce.string().refine((v) => allowed.includes(v), { message: `must be one of: ${allowed.join(', ')}` });
    } else if (Object.keys(k).length || typeof r.step === 'number' || r.type === 'number') {
      let n = z.coerce.number({ error: 'must be a number' });   // zod 4: a number is finite by default (NaN / Infinity → this message)
      if (k.integer) n = n.int('must be a whole number');
      if (k.positive) n = n.positive('must be greater than 0');
      if (typeof k.min === 'number') n = n.min(k.min, `must be at least ${k.min}`);
      if (typeof k.max === 'number') n = n.max(k.max, `must be at most ${k.max}`);
      if (typeof r.step === 'number' && r.step > 0) n = n.multipleOf(r.step, `must be a multiple of ${r.step}`);
      s = n;
    } else if (r.type === 'email') {
      s = z.coerce.string().trim().max(254, 'is too long').pipe(z.email('must be a valid email address'));   // zod 4: a coerced string has no .email(); the format is z.email()
    } else if (r.type === 'phone') {
      s = z.coerce.string().refine((v) => PHONE_RE.test(normalisePhone(v)), { message: 'must be a phone number: 8–15 digits, optional leading +' });
    } else if (r.type === 'gstin') {
      s = z.coerce.string().refine(isGstin, { message: 'must be a valid 15-character GSTIN (format or check character is wrong), or URP' });
    } else if (r.type === 'date' || r.no_past) {
      s = z.coerce.string().refine((v) => dayOf(v) !== null, { message: 'must be a date (YYYY-MM-DD)' });
    } else if (r.type === 'datetime') {
      s = z.coerce.string().refine((v) => v.trim() === 'now' || dayOf(v) !== null, { message: 'must be a date and time' });
    } else if (r.type === 'boolean') {
      s = z.union([z.boolean(), z.number(), z.string()]).refine((v) => BOOL_WORDS.has(String(v).trim().toLowerCase()), { message: 'must be yes or no' });
    } else continue;
    shape[col] = s.optional();
  }
  return z.object(shape).passthrough();
}

const BOOL_WORDS = new Set(['true', 'false', 'yes', 'no', '1', '0', 'on', 'off', 'y', 'n', 't', 'f']);
const same = (a: unknown, b: unknown) => {
  if (String(a ?? '') === String(b ?? '')) return true;
  const x = Number(a), y = Number(b); return String(a ?? '').trim() !== '' && String(b ?? '').trim() !== '' && Number.isFinite(x) && x === y;
};
/** Validate a write (insert body or patch) against the entity's declared guards. Only columns actually present and
 *  non-empty are checked, so a patch of unrelated columns is unaffected. `current` is the stored row on a patch: a value
 *  equal to the stored one is not re-judged — only what the write CHANGES is (a record whose visit date was last week, or
 *  that a pre-v4.9 import left with an odd value, can still be edited; the new value it is given must be valid).
 *  Returns a field-keyed error map (`{ Amount: "must be greater than 0" }`) or null when the values are acceptable. */
export function validateEntity(entity: string, row: Record<string, unknown>, current?: Record<string, unknown> | null, opts: { person?: boolean } = {}): Record<string, string> | null {
  const cons = constraintsOf(entity); const rules = rulesOf(entity); const types = ((ENTITIES as any)[entity]?.types ?? {}) as Record<string, string>;
  const person = opts.person ?? true;   // false on the flow / webhook doors: an inferred (soft) list does not bind a flow
  // unchanged = the stored value re-sent, in its raw or its canonical form (an old "call office" is not re-judged on an Owner edit)
  const unchanged = (k: string, v: unknown) => !!current && (same(v, current[k]) || same(row[k], current[k]) || same(v, canonicalValue(rules[k], types[k], current[k])));
  const canon = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, k in rules ? canonicalValue(rules[k], types[k], v) : v]));
  const present = Object.fromEntries(
    Object.entries(canon).filter(([k, v]) => (k in cons || k in rules) && v !== '' && v != null && !(current && unchanged(k, v))));
  const errors: Record<string, string> = {};
  // one value per typed / listed column: an array or object there would be stored as JSON text and slip past the format checks
  for (const [col, v] of Object.entries(present)) {
    const rr = rules[col] ?? {};
    if (typeof v === 'object' && (rr.type || rr.one_of?.length || (types[col] ?? 'text') !== 'text')) errors[col] = 'must be a single value';
  }
  const r = Object.keys(present).length ? entitySchema(entity, person).safeParse(present) : { success: true as const };
  if (!r.success) for (const issue of r.error.issues) {
    const f = String(issue.path[0] ?? '');
    if (f && !(f in errors)) errors[f] = issue.message;
  }
  // a required column cannot be emptied by an edit (an insert may leave it for a flow to fill later)
  if (current) for (const [col, rule] of Object.entries(rules)) {
    if (rule.required && col in canon && (canon[col] === '' || canon[col] == null) && String(current[col] ?? '').trim() !== '' && !(col in errors)) errors[col] = 'cannot be blank';
  }
  // length caps (baseline: 1 000 characters for a name / code, 20 000 for a description box) — on the trimmed text
  for (const [col, v] of Object.entries(present)) {
    const max = rules[col]?.max_length;
    const len = typeof v === 'string' ? v.trim().length : v && typeof v === 'object' ? JSON.stringify(v).length : 0;
    if (typeof max === 'number' && len > max && !(col in errors)) errors[col] = `is too long (at most ${max.toLocaleString('en-IN')} characters)`;
  }
  // a column every form requires: spaces alone are not a value (the form already refuses them; this is every other door)
  // judged on what was SENT (the canonical form of "   " is already empty, so it would never reach `present`)
  for (const [col, v] of Object.entries(row)) if (rules[col]?.required && typeof v === 'string' && v !== '' && v.trim() === '' && !(col in errors)) errors[col] = 'cannot be blank';
  for (const [col, msg] of Object.entries(computedErrors(entity, row, current))) if (!(col in errors)) errors[col] = msg;
  const today = todayYmd();
  for (const [col, rule] of Object.entries(rules)) {
    if (!rule.no_past || !(col in present) || col in errors) continue;
    const d = dayOf(present[col]); if (!d) { errors[col] = 'must be a date (YYYY-MM-DD)'; continue; }
    if (current && dayOf(current[col]) === d) continue;            // the stored day, re-sent in another format — not a new past date
    if (d < today) errors[col] = `cannot be in the past (today is ${today})`;
  }
  return Object.keys(errors).length ? errors : null;
}

// ── v4.9 computed fields (rule zero: a declared formula is recomputed on the server; the client value is ignored) ──
// A `computed: "<expr>"` column (os.yaml fields) is never trusted from the form or a flow — the server recomputes it from
// its sibling columns. The expression is a small arithmetic language (+ - * / %, parentheses, unary minus, numbers,
// sibling column names, and the functions round/floor/ceil/abs/min/max) computed with no dynamic code by a recursive-descent
// parser, so a malformed or injected string can only produce a number or be ignored — never run code.
type Computed = Record<string, string>;
const computedOf = (entity: string): Computed => ((ENTITIES as any)[entity]?.computed ?? {}) as Computed;
const FUNCS: Record<string, (...a: number[]) => number> = {
  round: (x) => Math.round(x), floor: (x) => Math.floor(x), ceil: (x) => Math.ceil(x),
  abs: (x) => Math.abs(x), min: (...a) => Math.min(...a), max: (...a) => Math.max(...a),
};
/** The sibling column names an expression references (anything that is not one of the known functions). */
function identifiers(expr: string): string[] {
  const out = new Set<string>();
  for (const m of expr.matchAll(/[A-Za-z_]\w*/g)) if (!(m[0] in FUNCS)) out.add(m[0]);
  return [...out];
}
/** Evaluate `expr` with `vars`. Returns a finite number, or null when the expression is malformed / references an
 *  unknown name. No dynamic code: a hand-written recursive-descent parser over the fixed grammar above. */
function evalExpr(expr: string, vars: Record<string, number>): number | null {
  const s = expr; let i = 0;
  const skip = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  function expr_(): number { let v = term(); skip(); while (s[i] === '+' || s[i] === '-') { const op = s[i++]; const r = term(); v = op === '+' ? v + r : v - r; skip(); } return v; }
  function term(): number { let v = factor(); skip(); while (s[i] === '*' || s[i] === '/' || s[i] === '%') { const op = s[i++]; const r = factor(); v = op === '*' ? v * r : op === '/' ? v / r : v % r; skip(); } return v; }
  function factor(): number {
    skip();
    if (s[i] === '+') { i++; return factor(); }
    if (s[i] === '-') { i++; return -factor(); }
    if (s[i] === '(') { i++; const v = expr_(); skip(); if (s[i] !== ')') throw new Error('parse'); i++; return v; }
    const num = /^\d+(\.\d+)?/.exec(s.slice(i)); if (num) { i += num[0].length; return Number(num[0]); }
    const idm = /^[A-Za-z_]\w*/.exec(s.slice(i));
    if (idm) {
      const name = idm[0]; i += name.length; skip();
      if (s[i] === '(') { i++; const args: number[] = []; skip();
        if (s[i] !== ')') { args.push(expr_()); skip(); while (s[i] === ',') { i++; args.push(expr_()); skip(); } }
        if (s[i] !== ')') throw new Error('parse'); i++; const fn = FUNCS[name]; return fn ? fn(...args) : NaN; }
      return name in vars ? vars[name] : NaN;
    }
    throw new Error('parse');
  }
  // the WHOLE expression must parse: "Qty Rate" or "Qty*Rate)" is malformed, never a silent "Qty" (v4.9 review G)
  try { const v = expr_(); skip(); if (i !== s.length) return null; return Number.isFinite(v) ? v : null; } catch { return null; }
}
/** v4.9 · a computed column whose formula the server cannot turn into a finite number — an input that is not a finite
 *  number (1e400, "abc"), or a result that is not (a division by zero) — is a field error on that column (400), never a
 *  silent keep of the value the client sent. Judged only when the write touches the column or one of its inputs (a stored
 *  legacy row is not re-judged by an unrelated edit) and every input is present (a partial patch waits for a full save). */
export function computedErrors(entity: string, row: Record<string, unknown>, current?: Record<string, unknown> | null): Record<string, string> {
  const formulas = computedOf(entity); const out: Record<string, string> = {};
  const src = { ...(current ?? {}), ...row };
  for (const [colName, expr] of Object.entries(formulas)) {
    const names = identifiers(expr);
    if (![colName, ...names].some((n) => n in row && !(current && same(row[n], current[n])))) continue;
    if (!names.every((n) => src[n] !== '' && src[n] != null)) continue;
    const bad = names.find((n) => !Number.isFinite(Number(src[n])));
    if (bad) { out[colName] = `cannot be computed: ${bad} is not a finite number`; continue; }
    const vars = Object.fromEntries(names.map((n) => [n, Number(src[n])]));
    if (evalExpr(expr, vars) == null) out[colName] = `cannot be computed from ${names.join(', ')} (the formula gives no finite number)`;
  }
  return out;
}
/** A computed column is never client-writable (v4.9 review 7). Every door drops it from what the caller sent BEFORE the
 *  merge, so when the server cannot recompute it (an input left out) the column is stored empty on an insert and left as
 *  stored on a patch — the value the client sent is never kept. */
export function stripComputed<T extends Record<string, unknown>>(entity: string, row: T): T {
  const f = computedOf(entity); if (!Object.keys(f).length) return row;
  const out = { ...row }; for (const c of Object.keys(f)) delete (out as Record<string, unknown>)[c]; return out;
}
/** Overwrite every `computed:` column with the server-evaluated formula, when all the columns it references are present
 *  and numeric in `row` (an insert carries them all; a partial patch missing a dependency is left for a later full save).
 *  Returns a new row; the client's value for a computed column is discarded whenever the server can recompute it. */
export function applyComputed(entity: string, row: Record<string, unknown>): Record<string, unknown> {
  const formulas = computedOf(entity); if (!Object.keys(formulas).length) return row;
  const out = { ...row };
  for (const [colName, expr] of Object.entries(formulas)) {
    const names = identifiers(expr); const vars: Record<string, number> = {}; let ok = true;
    for (const n of names) { const v = Number(out[n]); if (out[n] === '' || out[n] == null || !Number.isFinite(v)) { ok = false; break; } vars[n] = v; }
    if (!ok) continue;                                   // cannot recompute without every input — leave the stored value
    const val = evalExpr(expr, vars);
    if (val != null) out[colName] = val;
  }
  return out;
}

// ── v4.9 stage machine (os.yaml entity-level transitions / requires_on) ──
// A status column move is legal only if `transitions[from]` lists the target, and a stage with `requires_on` fields may
// be entered only when those fields are present. Enforced server-side on every write path (not just the Kanban `locked`
// UI). On an insert `from` is '' so only requires_on applies (you may create a record directly into a stage, but it must
// carry that stage's required fields).
type StageSpec = { statusColumn?: string; transitions?: Record<string, string[]>; requires_on?: Record<string, string[]> };
const stageOf = (entity: string): StageSpec => {
  const e = (ENTITIES as any)[entity] ?? {};
  return { statusColumn: e.status?.column, transitions: e.transitions, requires_on: e.requires_on };
};
/** True when a patch needs the current stored row to be validated (to know the from-stage, to recompute a formula from
 *  siblings the patch did not send, or to tell an unchanged no_past date from a new one). The write paths fetch the row only when this is true. */
export function needsCurrentRow(entity: string): boolean {
  const e = (ENTITIES as any)[entity] ?? {};
  const noPast = Object.values((e.field_rules ?? {}) as Record<string, FieldRule>).some((r) => r?.no_past);
  // v5.0 review: every ruled entity reads the stored row on a patch, so an UNCHANGED old value (a pre-v5.0 "High", a landline
  // stored with spaces) is never re-judged — an edit of Owner is not refused for a field the person did not touch
  const ruled = Object.keys((e.field_rules ?? {}) as Record<string, FieldRule>).length > 0;
  return !!(e.transitions || e.requires_on || (e.computed && Object.keys(e.computed).length) || noPast || ruled);
}
/** Validate a stage change. `from` is the current stored stage ('' on insert); `merged` is the row as it will be after
 *  the write (so requires_on sees the final values). Returns a field-keyed error (on the status column for an illegal
 *  move, or on the first missing required field) or null. No status column / no transitions = nothing to enforce. */
export function validateStage(entity: string, from: string, merged: Record<string, unknown>): Record<string, string> | null {
  const sp = stageOf(entity); const sc = sp.statusColumn; if (!sc) return null;
  const to = String(merged[sc] ?? '').trim(); if (!to) return null;
  if (sp.transitions && from && to !== from) {
    const allowed = sp.transitions[from] ?? [];
    if (!allowed.includes(to)) return { [sc]: `cannot move from ${from} to ${to}` };
  }
  // requires_on judges ENTERING a stage (an insert, or a move): an edit of a record that stays in its stage is not re-judged,
  // so a seeded / imported `Lost` row with no Lost_Reason can still be edited (v4.9 review A)
  if (sp.requires_on && sp.requires_on[to] && (!from || to !== from)) {
    for (const f of sp.requires_on[to]) { const v = merged[f]; if (v === '' || v == null) return { [f]: `required to move to ${to}` }; }
  }
  return null;
}

// ── v4.9 one guard for a write the app applies itself (lib/flows.ts applyEffect: every page action whose flow is not
// wired yet — modals, Kanban moves — and the effect's `also.patch`). The same three steps as the doors: recompute the
// computed columns, the field guards, the stage machine. ──
const statusColOf = (entity: string): string | undefined => (ENTITIES as any)[entity]?.status?.column;
/** An insert: returns the row with computed columns recomputed, and the first field-keyed error map (or null). */
export function guardInsert(entity: string, row: Record<string, unknown>): { row: Record<string, unknown>; errors: Record<string, string> | null } {
  const r = applyComputed(entity, stripComputed(entity, row));
  return { row: r, errors: validateEntity(entity, r) ?? validateStage(entity, '', r) };
}
/** A patch of a stored row (`current` = that row, or null when it could not be read): returns the patch plus any computed
 *  column the merge changes, and the first field-keyed error map (or null). Only changed values are judged. */
export function guardPatch(entity: string, patch: Record<string, unknown>, current: Record<string, unknown> | null): { patch: Record<string, unknown>; errors: Record<string, string> | null } {
  patch = stripComputed(entity, patch);
  const merged = { ...(current ?? {}), ...patch }; const re = applyComputed(entity, merged); const out = { ...patch };
  for (const k of Object.keys(re)) if (re[k] !== merged[k]) out[k] = re[k];
  const sc = statusColOf(entity); const from = current && sc ? String(current[sc] ?? '') : '';
  const errors = validateEntity(entity, current ? re : out, current) ?? (current ? validateStage(entity, from, re) : null);
  return { patch: out, errors };
}
