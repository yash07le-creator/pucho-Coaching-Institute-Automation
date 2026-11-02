// src/lib/flows.ts — the seam between the app and Pucho AI Studio (method/webhook-contract.md). Server-side only:
// the webhook URL for a flow is the admin's setting `webhook:<FLOW>` (v5.1, LEAP log B4), else WEBHOOK_<FLOW> in the
// environment (a door, never in the bundle). Every call's body carries `app_url`, `inbound_token` and `company_name` (G4), so
// a flow the app calls writes back to the right app with the current token even after the admin changed them. When a URL is set the
// flow owns the action — the app posts the payload and the flow writes through /api/data with INBOUND_TOKEN. When it is
// NOT set the app applies the action's declared data effect itself (os.yaml `effect:`, formerly `demo:`) and marks the
// result SIMULATED, so a build is usable and gateable before any workflow exists and never pretends an AI step ran.
import 'server-only';
import { randomBytes } from 'node:crypto';
import { query } from './db';
import { ENTITIES, FLOW_ACTIONS } from '@/config/os.config';
import { insertRows, patchRow, listRows, getRow, nextId, inTransaction, NotFound, lookupErrors, type Actor } from './dal';
import { guardInsert, guardPatch, needsCurrentRow, validateEntity } from './validate';
import { signPayloadFiles } from './fileLinks';
import { renderMessage } from './renderMessage';
import { getSettings, settingsSnapshot, tokenForFlow, branding, webhookEnvName } from './settings';

const SYNC_TIMEOUT_MS = 25_000;    // Studio answers a /sync webhook within ~25 s; anything longer is queued (async: true)

export const envName = webhookEnvName;
const envUrl = (flow: string): string | null => { const v = process.env[envName(flow)]; return v && v.trim() && !/REPLACE|SET_|<.*>/i.test(v) ? v.trim() : null; };
/** The flow's webhook: settings `webhook:<FLOW>`, else WEBHOOK_<FLOW>. Synchronous (the wiring count, the code option) from the
 *  settings snapshot; runFlowAction reads the settings fresh. */
export const webhookUrl = (flow: string): string | null => settingsSnapshot()?.s.webhooks[flow] || envUrl(flow);
export function wiring(): { wired: number; total: number; unwired: string[] } {
  const flows = [...new Set(Object.keys(FLOW_ACTIONS as unknown as Record<string, unknown>).map((k) => k.split('.')[0]))];
  const unwired = flows.filter((f) => !webhookUrl(f));
  return { wired: flows.length - unwired.length, total: flows.length, unwired };
}

type Effect = { insert?: string; patch?: string; fill?: Record<string, unknown>; map?: Record<string, string>; only?: string[]; result?: Record<string, unknown>; also?: Effect; lines?: { entity: string; by: string } };
// `send` (v4.1 + v4.2, D6): to — a payload/row key · 'contact' (the entity's contact block) · { entity, match, by, column } (a lookup) ·
// { role } (every active user of that role); the app resolves it into payload.To (actions.ts resolveSend). message — per language, or one
// string (= en), rendered by lib/renderMessage.js; from — a drafted column the app copies into payload.Message; review — the person may edit
// a pre-filled text before it leaves.
type Send = { tool?: string; provider?: string; to?: string | { entity: string; match: string; by: string; column: string } | { role: string }; lang?: string; message?: Record<string, string>; words?: Record<string, Record<string, string>>; from?: string; review?: boolean; template?: { name?: string; variables?: Record<string, string> } };
type Meta = { effect?: Effect; async?: boolean; sends?: boolean; send?: Send; constants?: Record<string, unknown> };
/** The action's declared data effect, applied by the app (rule zero: CRUD is code). Returns the result the flow would have. */
export async function applyEffect(actor: Actor, flow: string, action: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const meta = ((FLOW_ACTIONS as unknown as Record<string, Meta>)[`${flow}.${action}`] ?? {}) as Meta; const spec = meta.effect ?? {};
  const result: Record<string, unknown> = { ...(spec.result ?? { ok: true }) };
  const now = new Date().toISOString();
  const fillOf = (f?: Record<string, unknown>) => Object.fromEntries(Object.entries(f ?? {}).map(([k, v]) => [k, v === 'now' ? now : v]));
  const mapped = (m?: Record<string, string>) => Object.fromEntries(Object.entries(m ?? {}).filter(([k]) => payload[k] !== undefined).map(([k, c]) => [c, payload[k]]));
  // v4.9: every write is guarded BEFORE any is made (computed recomputed, field rules, stage machine — lib/validate.ts), so a
  // modal or a Kanban move through a not-yet-wired flow is refused exactly as the /api/data door refuses it, and an effect
  // that inserts and then patches never half-applies. A refusal is the field-keyed error map the form renders inline.
  const refuse = (errors: Record<string, string>) => ({ ok: false, error: 'Please check the values', errors });
  let insRow: Record<string, unknown> | null = null;
  if (spec.insert) {
    const e = (ENTITIES as any)[spec.insert]; const row: Record<string, unknown> = { ...payload, ...mapped(spec.map), ...fillOf(spec.fill) };
    for (const [k, v] of Object.entries(result)) if (e.columns.includes(k)) row[k] = v;
    const g = guardInsert(spec.insert, Object.fromEntries(Object.entries(row).filter(([k]) => e.columns.includes(k))));
    if (g.errors) return refuse(g.errors);
    insRow = { ...row, ...g.row };
  }
  // v4.9 (security round): the builder's new lines are guarded like any insert — computed recomputed, field rules, stage
  // machine — BEFORE the head or any line is written; one bad line refuses the whole action with its field errors.
  const lines = prepareLines(spec, payload);
  if (lines.errors) return refuse(lines.errors);
  const plans: { sp: Effect; id: string; patch: Record<string, unknown> }[] = [];
  for (const sp of [spec.patch ? spec : null, spec.also?.patch ? spec.also : null]) {
    if (!sp) continue;
    const e = (ENTITIES as any)[sp.patch!]; const id = String(payload[e.id.column] ?? '');
    if (!id) continue;
    let patch = Object.fromEntries(Object.entries({ ...payload, ...mapped(sp.map) }).filter(([k, v]) => e.columns.includes(k) && k !== e.id.column && v !== undefined && v !== null && (sp.only ? String(v) !== '' : true)));
    if (sp.only) patch = Object.fromEntries(Object.entries(patch).filter(([k]) => sp.only!.includes(k)));
    let cur: Record<string, unknown> | null = null;
    if (needsCurrentRow(sp.patch!)) {                       // read as the caller: scope applies
      cur = await getRow(actor, sp.patch!, id);
      if (!cur) return { ok: false, error: 'Not found' };  // v4.9 review E: a stage move / recompute is never applied blind to a row the caller cannot read
    }
    const g = guardPatch(sp.patch!, { ...patch, ...fillOf(sp.fill) }, cur);
    if (g.errors) return refuse(g.errors);
    plans.push({ sp, id, patch: g.patch });
  }
  // v4.9 review F: every write of one effect — the head, its lines, the patches — in ONE transaction, so a Conflict / Invalid /
  // Forbidden on a later write rolls back the earlier ones (no head without its lines, no half-applied insert-then-patch).
  await inTransaction(async () => {
    if (spec.insert && insRow) {
      const e = (ENTITIES as any)[spec.insert];
      const [ins] = await insertRows(actor, spec.insert, [insRow], { flow, action });
      result[e.id.column] = ins[e.id.column]; await insertLines(actor, flow, action, spec, lines.rows, ins[e.id.column]);
    }
    for (const pl of plans) {
      const e = (ENTITIES as any)[pl.sp.patch!];
      const row = await patchRow(actor, pl.sp.patch!, pl.id, pl.patch, { flow, action });
      if (!row) throw new NotFound();                      // outside the caller's scope (or gone): nothing of this effect is kept
      result[e.id.column] = pl.id;
      if (pl.sp === spec) await insertLines(actor, flow, action, spec, lines.rows, pl.id);
    }
  });
  // A templated send is rendered by the same code the flow runs (lib/renderMessage.js) and returned, NOT sent:
  // the person sees the exact words, the language and the number, labelled simulated (contract rule 8).
  if (meta.send?.message || meta.send?.template) { const spec = typeof meta.send.to === 'string' && meta.send.to !== 'contact' ? meta.send : { ...meta.send, to: 'To' };   // a structured recipient was resolved into payload.To by the app (D6)
    // the signature a drafted message ends with defaults to "For <company>" (G7) when the flow's constants do not set one
    const m = renderMessage(spec as Parameters<typeof renderMessage>[0], { ...payload, ...result }, { brand_signature: `For ${(await branding()).companyName}`, ...(meta.constants ?? {}) });
    // a template send (v4.4): the approved words live on whatsapp.pucho.ai — the simulation shows the template's name and the variables it would fill
    result.would_send = { channel: meta.send.tool === 'whatsapp' ? 'WhatsApp' : 'Email', ...m, text: m.text || (m.template ? `template "${m.template}" · ${Object.entries(m.variables || {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}` : '') }; }
  return { ok: true, simulated: true, ...result };
}

/** A builder's `lines` array lands in the items entity carrying the head entity's id (the emitter's lines_steps, in code).
 *  Only NEW lines are inserted: Builder.jsx sends each line's id as `_id` (`new-…` for a line added in this edit) and updates
 *  existing lines through its own item_action, so a line whose `_id` (or items id column) names a stored line is skipped —
 *  a revise never duplicates the lines it already has (v4.9 review C). Each new line is guarded here, before any write. */
function prepareLines(spec: Effect, payload: Record<string, unknown>): { rows: Record<string, unknown>[]; errors: Record<string, string> | null } {
  const L = spec.lines; if (!L) return { rows: [], errors: null };
  const raw = payload.lines; let lines: Record<string, unknown>[] = [];
  try { lines = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw || '[]') : []; } catch { return { rows: [], errors: { lines: 'must be a list of lines' } }; }
  if (!Array.isArray(lines)) return { rows: [], errors: { lines: 'must be a list of lines' } };
  const it = (ENTITIES as any)[L.entity]; const iid = it.id.column; const rows: Record<string, unknown>[] = [];
  for (const [n, l] of lines.entries()) {
    if (!l || typeof l !== 'object') return { rows: [], errors: { lines: `line ${n + 1} is not a line` } };
    const lid = String(l._id ?? l[iid] ?? '').trim();
    if (lid && !lid.startsWith('new-')) continue;          // an existing line: updated by item_action, never re-inserted
    const r: Record<string, unknown> = {}; for (const c of it.columns) if (c in l && c !== iid && c !== L.by) r[c] = l[c];
    const g = guardInsert(L.entity, r);
    // keyed `lines` (one message per line), never by the line's column — a head field of the same name must not show a line's error
    if (g.errors) return { rows: [], errors: { lines: Object.entries(g.errors).map(([k, v]) => `line ${n + 1} · ${k.replace(/_/g, ' ')}: ${v}`).join(' · ') } };
    rows.push(g.row);
  }
  return { rows, errors: null };
}
async function insertLines(actor: Actor, flow: string, action: string, spec: Effect, rows: Record<string, unknown>[], headId: string) {
  const L = spec.lines; if (!L || !rows.length) return;
  await insertRows(actor, L.entity, rows.map((r) => ({ ...r, [L.by]: headId })), { flow, action, audit: false });
}

/** Run one action: through the wired flow, or through the app's own effect when the flow is not wired yet. */
/** The values a person typed, judged by the target entity's rules (column names through the effect's `map`, back to the
 *  form's keys in the error map). A patch compares with the stored row, so an untouched old value is not re-judged. */
async function preflight(actor: Actor, meta: Meta, payload: Record<string, unknown>): Promise<Record<string, string> | null> {
  const errors: Record<string, string> = {};
  for (const sp of [meta.effect, meta.effect?.also]) {
    const ent = sp?.insert ?? sp?.patch; const e = ent ? (ENTITIES as any)[ent] : null; if (!sp || !e) continue;
    const m = sp.map ?? {}; const back: Record<string, string> = {}; const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) { const c = m[k] ?? k; if (e.columns.includes(c) && c !== e.id.column) { row[c] = v; back[c] = k; } }
    let cur: Record<string, unknown> | null = null;
    if (sp.patch) { const id = String(payload[e.id.column] ?? ''); if (id) cur = await getRow(actor, ent!, id).catch(() => null); }
    for (const [c, msg] of Object.entries(validateEntity(ent!, row, cur) ?? {})) errors[back[c] ?? c] ??= msg;
    for (const [c, msg] of Object.entries((await lookupErrors(ent!, row, cur)) ?? {})) errors[back[c] ?? c] ??= msg;   // a picked name must exist
  }
  // the builder's new lines too — judged before any credit is spent, not when the flow writes them (v5.0 review)
  const L = meta.effect ? prepareLines(meta.effect, payload) : { errors: null };
  if (L.errors) for (const [k, v] of Object.entries(L.errors)) errors[k] ??= v;
  return Object.keys(errors).length ? errors : null;
}
export async function runFlowAction(actor: Actor, flow: string, action: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const settings = await getSettings();
  const url = settings.webhooks[flow] || envUrl(flow); const meta = ((FLOW_ACTIONS as unknown as Record<string, Meta>)[`${flow}.${action}`] ?? {}) as Meta;
  const who = actor.kind === 'user' ? actor.user.name : actor.kind === 'flow' ? `flow:${actor.name}` : actor.kind;
  // v5.0: a person's action is judged before it runs, wired or simulated — the field rules, a name picked from another table
  // (lookupErrors) and a builder's new lines; for a wired flow that is before any credit is spent. Errors name the form's fields.
  const pre = await preflight(actor, meta, payload);
  if (pre) return { ok: false, error: 'Please check the values', errors: pre };
  if (!url) return applyEffect(actor, flow, action, payload);
  // An upload is served to signed-in people only; the flow gets a 15-minute link to that one file (lib/fileLinks.ts).
  const signed = signPayloadFiles(payload);
  if (signed.unsigned.length) return { ok: false, error: `Set APP_ORIGIN and AUTH_PEPPER so the workflow can read the uploaded file (${signed.unsigned.join(', ')})`, code: 'FILE_LINK' };
  payload = signed.payload;
  // G4: where to write back and with which token — set by the server LAST, so a payload key of the same name never wins
  // (the same for action / _who / _job: a form field called `action` cannot change which action the flow runs).
  // The token is the flow's own INBOUND_TOKEN_<FLOW> when set, else the current shared token (decision 1). Never logged.
  const back = { app_url: settings.appUrl, inbound_token: tokenForFlow(settings, flow), company_name: settings.companyName };
  const body = JSON.stringify({ ...payload, action, _who: who, _job: undefined, ...back });   // a sync call has no job: drop a payload `_job`
  if (meta.async) {
    const id = `JOB-${randomBytes(6).toString('hex').toUpperCase()}`;
    await query('INSERT INTO jobs (id, flow, action, payload, requested_by) VALUES ($1, $2, $3, $4, $5)', [id, flow, action, JSON.stringify(payload), who]);
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, action, _who: who, _job: id, ...back }) })
      .catch((e) => query('UPDATE jobs SET status = $2, result = $3, finished_at = now() WHERE id = $1', [id, 'failed', JSON.stringify({ error: String(e) })]));
    return { ok: true, queued: true, job: id };
  }
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), SYNC_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctl.signal });
    const text = await res.text();
    if (res.status === 429) return { ok: false, error: 'Too many requests — try again in a minute', code: 'RATE_LIMITED' };
    if (res.status === 402) return { ok: false, error: 'This account has used its AI credit budget', code: 'BUDGET' };
    if (!res.ok) return { ok: false, error: `Workflow ${flow}/${action} failed (${res.status})` };
    try { return JSON.parse(text); } catch { return { ok: true, raw: text }; }
  } catch (e) {
    return { ok: false, error: (e as Error).name === 'AbortError' ? `Workflow ${flow}/${action} did not answer within ${SYNC_TIMEOUT_MS / 1000}s` : `Workflow ${flow}/${action} unreachable` };
  } finally { clearTimeout(t); }
}

/** One-time codes are offered only when something can deliver them (audit S6). Unset WEBHOOK_AUTH_OTP = the login page shows
 *  no code option and requestCode refuses; a code is never written to a log, where anyone who reads logs could sign in as anyone. */
export const otpAvailable = () => !!webhookUrl('AUTH_OTP');

/** One-time sign-in code delivery: the app renders the message, the flow sends it (standards §7). v5.1: in the client's
 *  name (G7), the runtime company name. */
export async function deliverCode(email: string, code: string, companyName: string): Promise<'sent' | 'simulated'> {
  const url = (await getSettings().catch(() => null))?.webhooks.AUTH_OTP || envUrl('AUTH_OTP');
  const subject = `${companyName}: your sign-in code`; const text = `Your one-time sign-in code for ${companyName} is ${code}. It expires in 10 minutes. If you did not request it, ignore this email.`;
  if (!url) return 'simulated';   // unreachable from requestCode (it checks otpAvailable first); kept so a caller can never log a code by accident
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send_code', to: email, subject, text }) }).catch(() => {});
  return 'sent';
}

export { listRows, nextId };
