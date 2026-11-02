// src/lib/settings.ts — the runtime settings store (v5.1, G4 / G7 / B4 of the LEAP log). One table, `app_settings`
// (key → value), read through ONE cached function, cleared on every save. A missing key falls back to the environment, then
// to the os.yaml defaults the generator wrote (DEFAULTS), so one image serves any client and the admin changes the values
// from the app:
//   app_url                  → APP_ORIGIN     the address the FLOWS use (sent in every webhook call). The app's own security
//                                             origin (CSRF, secure cookies) stays the env APP_ORIGIN (decision 3).
//   inbound_token            → INBOUND_TOKEN  the token flows present to /api/data. A token stored by a rotation in the app
//   inbound_token_prev                        replaces the env one, which becomes the "previous" token and works only until
//   inbound_token_prev_until                  inbound_token_prev_until (24 h overlap, decision 1) — until a NEWER env value
//                                             is deployed (latest change wins, below).
//   company_name / app_name  → COMPANY_NAME / APP_NAME → DEFAULTS
//   webhook:<FLOW>           → WEBHOOK_<FLOW>
// Latest change wins for app_url and the inbound token (owner, 27 Oct 2026): every save of one of them also records what the
// env held at that moment (`env_seen:<key>` — the URL itself, a SHA-256 fingerprint for the token, 'none' when unset). When a
// redeploy brings a different, non-empty env value, the env takes over: the stored app_url is dropped, and the stored token
// becomes the previous token for 24 hours (the same overlap as a rotation in the app). An unchanged or unset env changes nothing
// and writes nothing. The env can only change with a restart, so the comparison runs once, at start-up (preloadSettings).
// `env_seen` is shared by every process on the database: every process of one deployment must run with the same APP_ORIGIN
// and INBOUND_TOKEN — a process started with different values counts as a newer change (review, 27 Oct).
// Nothing here logs a token. Values are cached on globalThis (one copy per process, whichever bundle imported this module),
// so the synchronous readers (the inbound check on a Route Handler, the wiring count) see the same snapshot the Server
// Actions write. register() (instrumentation-node.ts) loads it before the server takes its first request.
import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { pool, query } from './db';
import type { PoolClient } from 'pg';
import { DEFAULTS, FLOW_ACTIONS, AUTH } from '@/config/os.config';

export const TOKEN_OVERLAP_HOURS = 24;
const TTL_MS = 30_000;            // another process (a second instance, db.mjs) is picked up within this; this process at once

export type Settings = {
  appUrl: string; companyName: string; appName: string;
  /** the CURRENT token: the settings token, else the env INBOUND_TOKEN ('' = none) */
  inboundToken: string;
  inboundTokenPrev: string;
  /** ISO time the previous token stops working ('' = no previous token) */
  inboundTokenPrevUntil: string;
  /** flow → webhook URL ('' = not wired): settings `webhook:<FLOW>`, else env WEBHOOK_<FLOW> */
  webhooks: Record<string, string>;
  /** where each value came from — for the admin screen, never the value itself */
  sources: { appUrl: Source; companyName: Source; appName: Source; inboundToken: Source; webhooks: Record<string, Source> };
};
export type Source = 'settings' | 'env' | 'default' | 'none';
export type SettingsPatch = { appUrl?: string; companyName?: string; appName?: string; webhooks?: Record<string, string> };

type Snap = { at: number; raw: Record<string, string>; s: Settings };
type Store = { snap: Snap | null; loading: Promise<Snap> | null; loadingGen: number; gen: number };
declare global { var __puchoSettings: Store | undefined }   // eslint-disable-line no-var
const store = (): Store => (globalThis.__puchoSettings ??= { snap: null, loading: null, loadingGen: -1, gen: 0 });

const envOf = (k: string) => (process.env[k] ?? '').trim();
export const webhookEnvName = (flow: string) => `WEBHOOK_${flow.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
/** what the env held when a value was last saved in the app — compared on every load (latest change wins) */
const ENV_TRACKED = [
  { key: 'app_url', env: 'APP_ORIGIN', mark: (v: string) => v.replace(/\/+$/, '').toLowerCase() || 'none' },
  { key: 'inbound_token', env: 'INBOUND_TOKEN', mark: (v: string) => (v ? createHash('sha256').update(v).digest('hex') : 'none') },
] as const;
const envSeen = (key: string): [string, string] => {
  const t = ENV_TRACKED.find((x) => x.key === key)!; return [`env_seen:${key}`, t.mark(envOf(t.env))];
};
/** a value that is still a placeholder ("REPLACE_ME", "SET_IN_STUDIO", "<url>") is not a webhook */
const realUrl = (v: string) => (v && !/REPLACE|SET_|<.*>/i.test(v) ? v : '');
/** every flow the app calls (FLOW_ACTIONS), plus the sign-in code sender when codes are on */
export function appFlows(): string[] {
  const flows = [...new Set(Object.keys(FLOW_ACTIONS as unknown as Record<string, unknown>).map((k) => k.split('.')[0]))];
  if ((AUTH as unknown as { otp?: boolean })?.otp && !flows.includes('AUTH_OTP')) flows.push('AUTH_OTP');
  return flows;
}

function compose(raw: Record<string, string>): Settings {
  const D = (DEFAULTS ?? {}) as unknown as { company_name?: string; app_name?: string };
  const pick = (key: string, env: string, def?: string): [string, Source] => {
    if (raw[key]) return [raw[key], 'settings'];
    if (envOf(env)) return [envOf(env), 'env'];
    if (def) return [def, 'default'];
    return ['', 'none'];
  };
  const [appUrl, sAppUrl] = pick('app_url', 'APP_ORIGIN');
  const [companyName, sCompany] = pick('company_name', 'COMPANY_NAME', D.company_name);
  const [appName, sApp] = pick('app_name', 'APP_NAME', D.app_name);
  const [inboundToken, sTok] = pick('inbound_token', 'INBOUND_TOKEN');
  const until = raw.inbound_token_prev_until || '';
  const prevLive = !!raw.inbound_token_prev && !!until && Date.parse(until) > Date.now();
  const webhooks: Record<string, string> = {}; const wsrc: Record<string, Source> = {};
  for (const f of appFlows()) {
    const fromSettings = realUrl((raw[`webhook:${f}`] ?? '').trim()); const fromEnv = realUrl(envOf(webhookEnvName(f)));
    webhooks[f] = fromSettings || fromEnv; wsrc[f] = fromSettings ? 'settings' : fromEnv ? 'env' : 'none';
  }
  return {
    appUrl: appUrl.replace(/\/+$/, ''), companyName, appName, inboundToken,
    inboundTokenPrev: prevLive ? raw.inbound_token_prev : '', inboundTokenPrevUntil: prevLive ? until : '',
    webhooks, sources: { appUrl: sAppUrl, companyName: sCompany, appName: sApp, inboundToken: sTok, webhooks: wsrc },
  };
}

async function load(): Promise<Snap> {
  const st = store();
  if (st.loading && st.loadingGen === st.gen) return st.loading;   // a read started before a save is never reused after it
  const gen = st.gen; st.loadingGen = gen;
  const p = (async () => {
    let raw: Record<string, string> = {};
    try {
      const rows = await query<{ key: string; value: string }>('SELECT key, value FROM app_settings');
      raw = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
    } catch (e) {
      // a database migrated before v5.1 has no app_settings yet: the environment answers alone (and the settings screen says so)
      if ((e as { code?: string })?.code !== '42P01') throw e;
    }
    const snap = { at: Date.now(), raw, s: compose(raw) };
    if (st.gen === gen) st.snap = snap;            // a save that landed while this read was in flight wins
    return snap;
  })();
  st.loading = p;
  try { return await p; } finally { if (st.loading === p) st.loading = null; }
}

/** A stored app_url / token whose env changed since it was saved: under the settings lock, re-read and decide once (another
 *  process may have done it already). A different, non-empty env value takes over; the old stored token stays accepted for
 *  24 hours. A save that predates the record (or an emptied env) only records what the env holds now. No value is logged. */
async function adoptEnv(raw: Record<string, string>): Promise<Record<string, string>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); await client.query(LOCK);
    const cur: Record<string, string> = Object.fromEntries((await client.query<{ key: string; value: string }>('SELECT key, value FROM app_settings')).rows.map((r) => [r.key, r.value ?? '']));
    for (const t of ENV_TRACKED) {
      const env = envOf(t.env); const now = t.mark(env); const seen = cur[`env_seen:${t.key}`];
      if (!env || !cur[t.key] || seen === now) continue;   // an unset env is not a change, and writes nothing
      if (seen === undefined) { await putTx(client, [[`env_seen:${t.key}`, now]], 'env'); continue; }
      if (t.key === 'inbound_token') {
        const until = new Date(Date.now() + TOKEN_OVERLAP_HOURS * 3600_000).toISOString();
        await putTx(client, [['inbound_token_prev', cur.inbound_token], ['inbound_token_prev_until', until], ['inbound_token', null], ['env_seen:inbound_token', null]], 'env');
      } else await putTx(client, [[t.key, null], [`env_seen:${t.key}`, null]], 'env');
      console.info(`settings: ${t.env} changed in the environment since ${t.key} was saved in the app — the environment value is used now`);
    }
    await client.query('COMMIT');
    return Object.fromEntries((await client.query<{ key: string; value: string }>('SELECT key, value FROM app_settings')).rows.map((r) => [r.key, r.value ?? '']));
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); console.error('settings: could not compare with the environment'); return raw; }
  finally { client.release(); }
}

/** settings → env → DEFAULTS, cached; a save clears it. */
export async function getSettings(): Promise<Settings> {
  const st = store();
  if (st.snap && Date.now() - st.snap.at < TTL_MS) return { ...st.snap.s, inboundTokenPrev: liveOrEmpty(st.snap).prev, inboundTokenPrevUntil: liveOrEmpty(st.snap).until };
  return (await load()).s;
}
const liveOrEmpty = (snap: Snap) => {
  const until = snap.raw.inbound_token_prev_until || '';
  return snap.raw.inbound_token_prev && until && Date.parse(until) > Date.now() ? { prev: snap.raw.inbound_token_prev, until } : { prev: '', until: '' };
};

/** The last loaded snapshot for synchronous readers (null before the first load). A stale snapshot is refreshed in the
 *  background; this process's own saves replace it at once. */
export function settingsSnapshot(): Snap | null {
  const st = store();
  if (!st.snap || Date.now() - st.snap.at >= TTL_MS) load().catch(() => {});
  return st.snap;
}
/** Mark the cache stale: the next getSettings() reads the table again. The old snapshot stays readable for the synchronous
 *  readers until the new one lands (milliseconds), so a save never closes the inbound door for a moment. */
export function clearSettingsCache() { const st = store(); st.gen++; if (st.snap) st.snap = { ...st.snap, at: 0 }; }
/** Load once at start-up (instrumentation-node.ts), so the first flow call is judged against the stored token. */
export async function preloadSettings(): Promise<boolean> {
  try {
    const { raw } = await load();
    const changed = ENV_TRACKED.some((t) => envOf(t.env) && raw[t.key] && raw[`env_seen:${t.key}`] !== t.mark(envOf(t.env)));
    if (changed) { await adoptEnv(raw); clearSettingsCache(); await load(); }
    return true;
  } catch { return false; }
}

const LOCK = "SELECT pg_advisory_xact_lock(hashtext('pucho:app_settings'))";
/** One transaction under the settings lock: every value of a save lands together or not at all, and two saves (two
 *  rotations) never interleave. The cache is reloaded after the commit. */
async function inSettingsTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); await client.query(LOCK);
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; }
  finally { client.release(); clearSettingsCache(); await load().catch(() => {}); }
}
async function putTx(c: PoolClient, entries: [string, string | null][], who: string) {
  for (const [key, value] of entries) {
    if (value == null || value === '') await c.query('DELETE FROM app_settings WHERE key = $1', [key]);
    else await c.query(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES ($1, $2, now(), $3)
                        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by`, [key, value, who]);
  }
}
const put = (entries: [string, string | null][], who: string) => inSettingsTx((c) => putTx(c, entries, who));

/** Store the admin's values. An empty string removes the stored value (the environment answers again). The caller (a Server
 *  Action, admin only) has validated them. Webhook keys must be flows the app calls. */
export async function saveSettings(patch: SettingsPatch, who: string): Promise<void> {
  const entries: [string, string | null][] = [];
  if (patch.appUrl !== undefined) entries.push(['app_url', patch.appUrl.trim().replace(/\/+$/, '')], envSeen('app_url'));
  if (patch.companyName !== undefined) entries.push(['company_name', patch.companyName.trim()]);
  if (patch.appName !== undefined) entries.push(['app_name', patch.appName.trim()]);
  const flows = new Set(appFlows());
  for (const [f, url] of Object.entries(patch.webhooks ?? {})) {
    if (!flows.has(f)) throw new Error(`unknown flow ${f}`);
    entries.push([`webhook:${f}`, url.trim()]);
  }
  if (entries.length) await put(entries, who);
}

/** A new inbound token (the one given, else a fresh random one). The current token becomes the previous one for 24 hours —
 *  on the first rotation that is the env INBOUND_TOKEN, which then retires (decision 1). The current value is read and all
 *  three keys are written in ONE transaction under the settings lock: a failure keeps the old token (no retirement without
 *  an overlap), and two rotations at once cannot lose one. Returns the last four characters, and — only for a generated
 *  token — the full value, so the caller can show it ONCE (controller ruling: flows with the token written in need it). */
export async function rotateInboundToken(token: string | null, who: string): Promise<{ last4: string; prevUntil: string; generated?: string }> {
  const next = token ?? randomBytes(32).toString('base64url');
  const until = new Date(Date.now() + TOKEN_OVERLAP_HOURS * 3600_000).toISOString();
  const hadCurrent = await inSettingsTx(async (c) => {
    const stored = (await c.query<{ value: string }>("SELECT value FROM app_settings WHERE key = 'inbound_token'")).rows[0]?.value ?? '';
    const cur = stored || envOf('INBOUND_TOKEN');
    if (cur && next === cur) throw new Error('That is the current token');
    await putTx(c, [['inbound_token', next], ['inbound_token_prev', cur || null], ['inbound_token_prev_until', cur ? until : null], envSeen('inbound_token')], who);
    return !!cur;
  });
  return { last4: next.slice(-4), prevUntil: hadCurrent ? until : '', ...(token ? {} : { generated: next }) };
}

type Accepted = { name: string; value: string };
/** The tokens /api/data accepts right now, with the name the audit row carries. `snap` null (settings never loaded — the
 *  database was unreachable at start) → only the env-managed per-flow / NEXT tokens: whether a settings token retired the
 *  env INBOUND_TOKEN is unknown, so it is not accepted (closed, not open). */
export function acceptedFrom(snap: Snap | null): Accepted[] {
  const out: Accepted[] = [];
  for (const [name, value] of Object.entries(process.env)) {
    if (!value || name === 'INBOUND_TOKEN' || !name.startsWith('INBOUND_TOKEN_')) continue;
    out.push({ name, value });                                                     // INBOUND_TOKEN_<FLOW>, INBOUND_TOKEN_NEXT — unchanged
  }
  if (!snap) return out;
  if (snap.raw.inbound_token) out.push({ name: 'INBOUND_TOKEN', value: snap.raw.inbound_token });     // the settings token
  else if (envOf('INBOUND_TOKEN')) out.push({ name: 'INBOUND_TOKEN', value: envOf('INBOUND_TOKEN') }); // no settings token yet: the env one
  const live = liveOrEmpty(snap);
  if (live.prev) out.push({ name: 'INBOUND_TOKEN_PREV', value: live.prev });       // the overlap (env token after the first rotation)
  return out;
}
export async function acceptedInboundTokens(): Promise<string[]> {
  await getSettings();
  return acceptedFrom(store().snap).map((a) => a.value);
}

/** The flow's own token when one is set (INBOUND_TOKEN_<FLOW>), else the current shared token — what a webhook call carries. */
export function tokenForFlow(s: Settings, flow: string): string {
  return envOf(`INBOUND_TOKEN_${flow.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`) || s.inboundToken;
}

/** The names shown everywhere (G7): settings → env → os.yaml. Never throws — a page renders with the env value. */
export async function branding(): Promise<{ companyName: string; appName: string }> {
  try { const s = await getSettings(); return { companyName: s.companyName, appName: s.appName }; }
  catch {
    const D = (DEFAULTS ?? {}) as unknown as { company_name?: string; app_name?: string };
    return { companyName: envOf('COMPANY_NAME') || D.company_name || '', appName: envOf('APP_NAME') || D.app_name || '' };
  }
}

export const mask = (v: string) => (v ? `••••${v.slice(-4)}` : '');
