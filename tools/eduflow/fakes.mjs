// tools/eduflow/fakes.mjs — fakes for flow_sim (node C:/pucho/kit/flow/flow_sim.mjs workflows --fakes tools/eduflow/fakes.mjs).
// They answer like the real services and refuse like them: /api/data GET reads the demo seed (app/db/seed/*.csv), a POST numbers
// the rows and refuses a column the entity does not have (the app's 400), a voice call answers a requestId and a transcript, and
// pucho-whatsapp answers a message id. Set FAKE_NO_ANSWER=1 for a call nobody picked up, FAKE_WA_FAIL=1 for a refused WhatsApp.
// Every voice / WhatsApp shape here is ASSUMED (G1, rules §1.20 #5) — the flows read them defensively; one Studio run confirms.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

class ServiceError extends Error { constructor(status, msg) { super(`HTTP ${status}: ${msg}`); this.status = status; } }   // as flow_sim's own

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED = path.join(ROOT, 'app', 'db', 'seed');
function csv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; continue; }
    if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return { head, rows: body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']))) };
}
const table = (e) => { const f = path.join(SEED, `${e}.csv`); return fs.existsSync(f) ? csv(fs.readFileSync(f, 'utf8')) : null; };
let n = 9000;

export default async function fake(piece, inputs) {
  if (piece === 'http:send_request') {
    const url = String(inputs.url || ''); const m = url.match(/\/api\/(?:data|seed)\/([a-z_]+)/);   // /api/seed/: a test read (tests/eduflow-flows.test.mjs)
    if (!m) return { status: 200, body: { ok: 'true', queued: true } };                      // a POST to another flow's webhook
    const t = table(m[1]); if (!t) throw new ServiceError(404, `unknown entity ${m[1]}`);
    const body = inputs.body?.data;
    if (inputs.method === 'GET') return { status: 200, body: t.rows };
    const rows = Array.isArray(body) ? body : [body];
    for (const r of rows) for (const k of Object.keys(r || {})) if (!t.head.includes(k)) throw new ServiceError(400, `${m[1]}: column ${k} does not exist`);
    if (inputs.method === 'PATCH') return { status: 200, body: [{ ...rows[0] }] };
    const id = t.head[0];
    return { status: 201, body: rows.map((r) => ({ ...r, [id]: r[id] || `${id.split('_')[0].slice(0, 2).toUpperCase()}-SIM-${++n}` })) };
  }
  if (piece === 'ai-voice-call:voiceCall') return { apiResponse: { data: { requestId: `REQ-SIM-${++n}` } } };
  if (piece === 'ai-voice-call:getCallDetails') return process.env.FAKE_NO_ANSWER
    ? { apiResponse: { data: { status: 'no-answer', duration: 0, transcript: '' } } }
    : { apiResponse: { data: { status: 'completed', duration: 142, transcript: 'AI: Namaste, I am calling from the institute about this week. Parent: Thank you. I am worried about the falling marks in Physics and I want to meet the director.' } } };
  if (piece === 'pucho-whatsapp:send_template_message') {
    if (process.env.FAKE_WA_FAIL) return { error: { message: 'SIM: template not approved' }, success: false };
    return { success: true, messageId: `wamid.SIM${++n}` };
  }
  if (piece === 'delay:delayFor') return { ok: true };
  return undefined;   // pucho-cdm → flow_sim's live-shaped fake (out of order, strings, one field missing)
}
