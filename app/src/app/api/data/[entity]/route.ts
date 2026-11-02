// /api/data/<entity> — the door a Studio flow writes through (standards §8.1, §15.4; decision D4: Studio reads the
// database with its read-only `studio_reader` role, but every write goes through here, under the same DAL rules as a
// person's request). INBOUND_TOKEN must be presented; unset means closed. The query shape is PostgREST's, so the
// emitter's http nodes did not have to change: GET ?select=* · POST [rows] (no duplicate on a retry) · PATCH ?<Id>=eq.<v>
// · POST ?mode=replace (a scheduled sync owning its whole table). v4.9: a row whose id already exists is a 409 (never a
// 201 with []), so a retried POST learns the row is there. Bodies are read through lib/auth.ts readJson: ≤ 256 KB, JSON only (v4.7).
import { z } from 'zod';
import { inboundAllowed, inboundToken, readJson, JSON_MAX } from '@/lib/auth';
import { listRows, insertRows, patchRow, replaceRows, getRow, NotFound, Conflict, Invalid, Forbidden, conflictMessage, type Actor } from '@/lib/dal';
import { validateEntity, applyComputed, stripComputed, validateStage, needsCurrentRow } from '@/lib/validate';
import { ENTITIES } from '@/config/os.config';

export const dynamic = 'force-dynamic';
const Params = z.object({ entity: z.string().regex(/^[a-z][a-z0-9_]*$/) });
const closed = () => Response.json({ error: 'closed' }, { status: 403 });
// the actor names the flow (X-Flow header) and the token variable that let it in (S8: a leaked token is traceable to one flow)
const actorOf = (req: Request): Actor => ({ kind: 'flow', name: `${(req.headers.get('x-flow') || 'studio').slice(0, 60)}${inboundToken(req) && inboundToken(req) !== 'INBOUND_TOKEN' ? ` [${inboundToken(req)}]` : ''}`.slice(0, 80) });

function rowSchema(entity: string) {
  const e = (ENTITIES as any)[entity];
  return z.object(Object.fromEntries(e.columns.map((c: string) => [c, z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.unknown()), z.record(z.string(), z.unknown())]).optional()]))).strict();
}

export async function GET(req: Request, ctx: { params: Promise<{ entity: string }> }) {
  if (!inboundAllowed(req)) return closed();
  const p = Params.safeParse(await ctx.params); if (!p.success || !(p.data.entity in (ENTITIES as any))) return Response.json({ error: 'not found' }, { status: 404 });
  try { return Response.json(await listRows(actorOf(req), p.data.entity)); } catch (e) { return e instanceof NotFound ? Response.json({ error: 'not found' }, { status: 404 }) : Response.json({ error: 'failed' }, { status: 500 }); }
}

export async function POST(req: Request, ctx: { params: Promise<{ entity: string }> }) {
  if (!inboundAllowed(req)) return closed();
  const p = Params.safeParse(await ctx.params); if (!p.success || !(p.data.entity in (ENTITIES as any))) return Response.json({ error: 'not found' }, { status: 404 });
  const rd = await readJson(req, JSON_MAX); if (!rd.ok) return rd.res; const body = rd.body;   // size-capped, JSON only (v4.7)
  const rows = z.array(rowSchema(p.data.entity)).max(5000).safeParse(Array.isArray(body) ? body : [body]);
  if (!rows.success) return Response.json({ error: 'invalid rows', detail: rows.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`) }, { status: 400 });
  // v4.9: a flow writes through the same generated guards as a person — computed recomputed, impossible value / illegal
  // stage a 400, duplicate a 409. Never a 201 for a value the UI would have refused.
  const prepared = rows.data.map((r) => applyComputed(p.data.entity, stripComputed(p.data.entity, r as Record<string, unknown>)));   // computed columns are server-owned
  // v5.0 review: EVERY bad row is reported in one answer (`rows: [{ row, id, errors }]`, the first 50), so a sync is fixed in one pass.
  // Default: nothing is written while any row is bad (a sync owns its table; half a table is worse than yesterday's). With
  // `?skip_invalid=1` the good rows are written and each bad one is listed under `skipped` — on replace, a bad row whose id
  // is already stored keeps its last good version (never deleted by the replace), and a bad new row is left out.
  const sp = new URL(req.url).searchParams; const mode = sp.get('mode'); const skip = sp.get('skip_invalid') === '1';
  const ent = (ENTITIES as any)[p.data.entity]; const idc = ent.id.column as string;
  const bad: { row: number; id: string; errors: Record<string, string> }[] = [];
  prepared.forEach((r, i) => {
    const errors = validateEntity(p.data.entity, r, null, { person: false }) ?? validateStage(p.data.entity, '', r);
    if (errors) bad.push({ row: i + 1, id: String((r as Record<string, unknown>)[idc] ?? ''), errors });
  });
  if (bad.length && !skip) return Response.json({ ok: false, errors: bad[0].errors, rows: bad.slice(0, 50), bad_rows: bad.length }, { status: 400 });
  const badIdx = new Set(bad.map((b) => b.row - 1));
  let good = prepared.filter((_, i) => !badIdx.has(i));
  const actor = actorOf(req); const flow = actor.kind === 'flow' ? actor.name : 'studio';
  try {
    const skipped = bad.slice(0, 50);
    if (mode === 'replace') {
      if (bad.length) {   // a bad row that is already stored keeps its last good version
        const stored = new Map((await listRows(actor, p.data.entity)).map((r) => [String(r[idc] ?? ''), r]));
        for (const b of bad) { const keep = b.id && stored.get(b.id); if (keep) good = [...good, keep]; }
      }
      const n = await replaceRows(actor, p.data.entity, good as any, { flow });
      return Response.json({ ok: true, rows: n, ...(bad.length ? { skipped, bad_rows: bad.length } : {}) });
    }
    const out = good.length ? await insertRows(actor, p.data.entity, good as any, { flow, action: 'insert' }) : [];
    return Response.json(bad.length ? { ok: true, rows: out, skipped, bad_rows: bad.length } : out, { status: 201 });
  } catch (e) {
    if (e instanceof Conflict) return Response.json({ ok: false, errors: { [e.field]: conflictMessage(e) } }, { status: 409 });
    if (e instanceof Invalid) return Response.json({ ok: false, errors: { [e.field]: 'is not an allowed value' } }, { status: 400 });
    if (e instanceof Forbidden || (e as { code?: string })?.code === '42501') return Response.json({ ok: false, error: 'not allowed' }, { status: 403 });
    console.error('api/data POST', (e as Error).message); return Response.json({ error: 'failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ entity: string }> }) {
  if (!inboundAllowed(req)) return closed();
  const p = Params.safeParse(await ctx.params); if (!p.success || !(p.data.entity in (ENTITIES as any))) return Response.json({ error: 'not found' }, { status: 404 });
  const e = (ENTITIES as any)[p.data.entity]; const q = new URL(req.url).searchParams.get(e.id.column) || '';
  const id = q.startsWith('eq.') ? q.slice(3) : q;
  if (!id) return Response.json({ error: `?${e.id.column}=eq.<id> is required` }, { status: 400 });
  const rd = await readJson(req, JSON_MAX); if (!rd.ok) return rd.res; const body = rd.body;   // size-capped, JSON only (v4.7)
  const patch = rowSchema(p.data.entity).safeParse(body);
  if (!patch.success) return Response.json({ error: 'invalid patch' }, { status: 400 });
  const actor = actorOf(req);
  const patchData = stripComputed(p.data.entity, patch.data as Record<string, unknown>);   // computed columns are server-owned
  let cur: Record<string, unknown> | null = null;
  if (needsCurrentRow(p.data.entity)) {                                           // stage move / recompute / no_past need the stored row
    cur = await getRow(actor, p.data.entity, id);
    if (!cur) return Response.json({ error: 'not found' }, { status: 404 });          // v4.9 review E: never judged (or applied) blind
    {
      const merged = { ...cur, ...patchData }; const recomputed = applyComputed(p.data.entity, merged);
      for (const k of Object.keys(recomputed)) if (recomputed[k] !== merged[k]) patchData[k] = recomputed[k];   // write only changed computed columns
      const from = String(cur[(e.status?.column ?? '') as string] ?? '');
      const stageErr = validateStage(p.data.entity, from, recomputed);
      if (stageErr) return Response.json({ ok: false, errors: stageErr }, { status: 400 });
    }
  }
  const perrs = validateEntity(p.data.entity, patchData, cur, { person: false });   // v4.9: guard the patched values too (an unchanged stored no_past date is not re-judged)
  if (perrs) return Response.json({ ok: false, errors: perrs }, { status: 400 });
  try {
    const row = await patchRow(actor, p.data.entity, id, patchData as any, { flow: actor.kind === 'flow' ? actor.name : 'studio', action: 'patch' });
    return row ? Response.json([row]) : Response.json({ error: 'not found' }, { status: 404 });
  } catch (e2) {
    if (e2 instanceof Conflict) return Response.json({ ok: false, errors: { [e2.field]: conflictMessage(e2) } }, { status: 409 });
    if (e2 instanceof Invalid) return Response.json({ ok: false, errors: { [e2.field]: 'is not an allowed value' } }, { status: 400 });
    if (e2 instanceof Forbidden || (e2 as { code?: string })?.code === '42501') return Response.json({ ok: false, error: 'not allowed' }, { status: 403 });
    console.error('api/data PATCH', (e2 as Error).message); return Response.json({ error: 'failed' }, { status: 500 });
  }
}
