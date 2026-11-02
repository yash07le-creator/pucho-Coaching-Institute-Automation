#!/usr/bin/env node
// scripts/db.mjs — apply the schema, seed demo data, reset, or create a person. ONE resolver: the same rules as
// src/lib/db.ts (DB_HOST wins outright, else DATABASE_URL), so a seed never lands in a database the server does not read.
//   node scripts/db.mjs migrate            apply db/schema.sql (idempotent) and create the app / studio_reader roles when allowed
//   node scripts/db.mjs seed [--no-personas] load db/seed/*.csv (demo rows) and the persona accounts from db/seed/users.json
//   node scripts/db.mjs reset              drop every entity table's rows and re-seed
//   node scripts/db.mjs user <email> <name> <role> [password]   the first administrator (standards §6.4)
//   node scripts/db.mjs preflight          the guards that must stop a start, run BEFORE `node server.js` (the Dockerfile CMD):
//                                          exits non-zero before Next prints Ready; opens no database connection
//                                          and loads neither pg nor argon2 (v5.1.1) — it can never hang the start
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['.env.local', '.env']) {        // the same files Next.js reads, in the same order of precedence
  const p = path.join(ROOT, f); if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').trim(); }
}
const env = (k) => { const v = process.env[k]; return v == null || v.trim() === '' ? undefined : v.trim(); };
const LOCAL = /^(localhost|127\.0\.0\.1|::1|host\.docker\.internal|db|postgres)$/i;
const say = (s) => console.log(s);

/** v5.1 (LEAP B2) the guards that must stop a start — the same refusals as src/instrumentation-node.ts, run by the Dockerfile
 *  CMD before `node server.js`, so a refused configuration exits non-zero BEFORE Next prints "Ready" (the portal showed Ready,
 *  then a dead app). Warnings stay in the server's start-up log, and a bad database configuration is NOT a refusal (§13.3: the
 *  server starts and /api/health says why). Reads the environment only: no database connection, no value printed. */
function preflight() {
  const refusals = [];
  if (process.env.DEMO_LOGINS === 'true' && process.env.DB_HOST) refusals.push('DEMO_LOGINS=true with a DB_HOST (portal) database. Unset DEMO_LOGINS for a client deployment, or set DEMO_LOGINS=portal-demo for a demo deployment that holds demo data only.');
  return refusals;
}
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'preflight') {
  // v5.1.1 (owner report 31 Oct 2026): the preflight must never keep port 80 from answering. It reads the environment only — no
  // database, no pg — and a watchdog lets the server start anyway (exit 0, reason logged) if anything ever stalls it.
  setTimeout(() => { console.error('preflight: did not finish within 10 s — starting the server anyway (the in-process guards still run)'); process.exit(0); }, 10_000).unref();
  const refusals = preflight();
  for (const r of refusals) console.error(`REFUSING TO START: ${r}`);
  if (!refusals.length) say('preflight: start-up guards passed');
  process.exit(refusals.length ? 3 : 0);
}

// everything below talks to the database: pg and argon2 load only now (the preflight above needs neither)
const { default: pg } = await import('pg');
const { hash } = await import('@node-rs/argon2');

function wantsSsl(host) {   // the same rule as src/lib/db.ts: DB_SSL decides when set, else a remote host is encrypted, a local one plain
  const explicit = env('DB_SSL');
  if (explicit != null) return ['1', 'true', 'require', 'yes', 'on'].includes(explicit.toLowerCase());
  return !LOCAL.test(host);
}
function config() {
  const host = env('DB_HOST'); const schema = env('DB_SCHEMA') ?? 'public';
  if (host) return { host, port: Number(env('DB_PORT') ?? 5432), database: env('DB_NAME'), user: env('DB_USER'), password: env('DB_PASSWORD') ?? '', schema, ssl: wantsSsl(host) };
  const url = new URL(env('DATABASE_URL') ?? ''); return { host: url.hostname, port: Number(url.port || 5432), database: decodeURIComponent(url.pathname.slice(1)), user: decodeURIComponent(url.username || 'postgres'), password: decodeURIComponent(url.password), schema, ssl: wantsSsl(url.hostname) };
}
/** v5.1 (LEAP B1 / D3) the CA the database certificate is verified against, in the same order as src/lib/db.ts: DB_SSL_CA (an
 *  override; PEM, `\n` escapes allowed) → the Amazon RDS bundle the Dockerfile adds as /app/db-ca.pem → db/db-ca.pem. None
 *  found = encrypted but NOT verified, and the line below says so. */
const CA_FILES = ['/app/db-ca.pem', path.join(ROOT, 'db', 'db-ca.pem')];
function caBundle() {
  const v = env('DB_SSL_CA'); if (v) return { ca: v.replace(/\\n/g, '\n'), from: 'DB_SSL_CA' };
  for (const p of CA_FILES) {
    try { if (fs.existsSync(p)) { const ca = fs.readFileSync(p, 'utf8'); if (ca.includes('BEGIN CERTIFICATE')) return { ca, from: p }; } } catch { /* unreadable: try the next one */ }
  }
  return null;
}
const cfg = config();
const ca = cfg.ssl ? caBundle() : null;
// connectionTimeoutMillis (v5.1.1): an unreachable database fails migrate / seed in 15 s instead of hanging the terminal
const pool = new pg.Pool({ host: cfg.host, port: cfg.port, database: cfg.database, user: cfg.user, password: cfg.password, connectionTimeoutMillis: 15_000, ...(cfg.schema === 'public' ? {} : { options: `-c search_path=${cfg.schema},public` }), ...(cfg.ssl ? { ssl: ca ? { ca: ca.ca, rejectUnauthorized: true } : { rejectUnauthorized: false } } : {}) });
say(`Database: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database} (schema ${cfg.schema}${cfg.ssl ? (ca ? `, ssl verified against ${ca.from === 'DB_SSL_CA' ? 'DB_SSL_CA' : 'the bundled CA ' + ca.from}` : ', ssl NOT VERIFIED — no DB_SSL_CA and no bundled CA') : ''})`);

function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (q && text[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { row.push(cur); cur = ''; }
    else if ((ch === '\n' || ch === '\r') && !q) { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  const [h, ...rest] = rows.filter((r) => r.some((x) => x !== ''));
  return rest.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}

async function migrate() {
  const sql = fs.readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8');
  const c = await pool.connect();
  try { await c.query('BEGIN'); await c.query(sql); await c.query('COMMIT'); say('schema applied (idempotent)'); }
  catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  // least privilege (§19.1 / D4): an `app` role with DML only and a `studio_reader` with SELECT on entity tables only.
  // Pucho DB may hand over a single user that cannot create roles — then this is recorded, not pretended.
  const rolesSql = path.join(ROOT, 'db', 'roles.sql');
  if (fs.existsSync(rolesSql)) {
    try { await pool.query(fs.readFileSync(rolesSql, 'utf8')); say('roles app / studio_reader ensured'); }
    catch (e) { say(`roles NOT created (${e.message.split('\n')[0]}) — the connected user cannot create roles; record it in docs/security.md Known-broken (§19.1)`); }
  }
  // v4.9 (§19): row-level security for the `app` role — defense in depth over the DAL's scope. Needs the roles above; the
  // schema owner (dev superuser) bypasses RLS, so this changes nothing locally but bites when the app logs in as `app`.
  // Who the policies will bind decides whether FORCE is safe (v4.9 security round): a superuser / BYPASSRLS login is never
  // filtered; a login IN ROLE app is filtered by the `app` policy (what we want); any OTHER login is not named by any policy,
  // so under FORCE it — even as the table owner — would see ZERO rows and every write would fail. For that login FORCE is
  // skipped (ENABLE alone exempts the owner) and the operator is told, loudly, to create the app login IN ROLE app.
  // APP_DB_USER names the login the running app will use when it is not the one running this migration.
  const rlsSql = path.join(ROOT, 'db', 'rls.sql');
  if (fs.existsSync(rlsSql)) {
    let sql = fs.readFileSync(rlsSql, 'utf8');
    if (/ENABLE ROW LEVEL SECURITY/.test(sql)) {
      const who = env('APP_DB_USER') ?? cfg.user;
      let st = null;
      try { st = (await pool.query(`SELECT r.rolsuper OR r.rolbypassrls AS bypass, EXISTS (SELECT 1 FROM pg_roles a WHERE a.rolname = 'app') AND pg_has_role(r.oid, 'app', 'MEMBER') AS in_app FROM pg_roles r WHERE r.rolname = $1`, [who])).rows[0] ?? null; }
      catch (e) { say(`  could not inspect login ${who} (${e.message.split('\n')[0]})`); }
      const safe = st && (st.bypass || st.in_app);
      if (!safe) {
        sql = sql.replace(/ FORCE ROW LEVEL SECURITY;/g, ' NO FORCE ROW LEVEL SECURITY;');   // also lifts a FORCE an earlier migrate left on
        say(`!! WARNING: login "${who}" is neither a superuser / BYPASSRLS nor a member of role app.` +
            `\n!!   Row-level security is ENABLED without FORCE, so the table owner is not filtered and the app keeps working — but the` +
            `\n!!   per-person scope is then enforced by the app's DAL only. To have Postgres enforce it as well, run the app as a login` +
            `\n!!   IN ROLE app (CREATE USER <app_login> WITH PASSWORD '…' IN ROLE app;) and re-run migrate. Record it in docs/security.md Known-broken (§19.1).`);
      }
      try { await pool.query(sql); say(`row-level security policies applied${safe ? ` (FORCE on; "${who}" is ${st.bypass ? 'a superuser / BYPASSRLS — not filtered' : 'IN ROLE app — filtered by the scope policy'})` : ' (FORCE skipped — see the warning above)'}`); }
      catch (e) { say(`RLS NOT applied (${e.message.split('\n')[0]}) — the connected user cannot alter RLS; record it in docs/security.md Known-broken (§19.1)`); }
    } else { await pool.query(sql); say('row-level security: nothing to restrict (no per-person scope in os.yaml)'); }
  }
}

async function seed(personas = true) {
  const dir = path.join(ROOT, 'db', 'seed'); const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    for (const e of manifest.entities) {
      const file = path.join(dir, `${e.name}.csv`); if (!fs.existsSync(file)) continue;
      const rows = parseCSV(fs.readFileSync(file, 'utf8')); let n = 0;
      // the file's order is the display order (the DAL reads _seq DESC): row i gets _seq = rows - i, and the sequence continues above it
      for (const [i, r] of rows.entries()) {
        const cols = ['_seq'], vals = [rows.length - i];
        for (const col of e.columns) {
          const t = e.types[col] ?? 'text'; let v = r[col] ?? '';
          // the DAL's stored form (lib/dal.ts storedValue): typed formats normalised, a blank declared-unique value NULL —
          // a second blank row is not a duplicate, so ON CONFLICT DO NOTHING no longer drops it silently
          const fmt = e.formats?.[col]; if (fmt === 'email') v = String(v).trim().toLowerCase(); else if (fmt === 'phone') v = String(v).trim().replace(/[\s\-().]/g, ''); else if (fmt === 'gstin') v = String(v).trim().toUpperCase();
          if ((e.unique ?? []).includes(col) && String(v).trim() === '') { cols.push(`"${col.toLowerCase()}"`); vals.push(null); continue; }
          if (v === '' && t !== 'text') v = null; else if (t === 'boolean') v = ['true', '1', 'yes'].includes(String(v).toLowerCase()); else if (t === 'numeric') { const x = Number(v); v = Number.isFinite(x) ? x : null; }
          cols.push(`"${col.toLowerCase()}"`); vals.push(v);
        }
        const q = await c.query(`INSERT INTO "${e.name}" (${cols.join(', ')}) VALUES (${vals.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT DO NOTHING`, vals); n += q.rowCount;
      }
      if (n < rows.length) say(`  ${e.name}: ${rows.length - n} of ${rows.length} seed rows NOT inserted (an id or a declared-unique value already present)`);
      await c.query(`SELECT setval(pg_get_serial_sequence('"${e.name}"', '_seq'), GREATEST((SELECT coalesce(max(_seq), 0) FROM "${e.name}"), 1))`);
      say(`  ${e.name}: ${n} rows`);
    }
    if (personas) {
      const users = JSON.parse(fs.readFileSync(path.join(dir, 'users.json'), 'utf8'));
      for (const u of users) {
        await c.query(`INSERT INTO users (id, email, name, role, password_hash, must_change_password) VALUES ($1, $2, $3, $4, $5, false)
                       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, is_active = true`,
          [u.id, u.email.toLowerCase(), u.name, u.role, await hash(u.password, { memoryCost: 19456, timeCost: 2, parallelism: 1 })]);
      }
      say(`  users: ${users.length} demo personas (demo build only — never seed personas on a client's production database)`);
    }
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}

async function reset() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'seed', 'manifest.json'), 'utf8'));
  for (const e of manifest.entities) await pool.query(`DELETE FROM "${e.name}"`);
  await pool.query('DELETE FROM sessions'); await pool.query('DELETE FROM users');
  say('rows cleared'); await seed(true);
}

async function user([email, name, role, password]) {
  if (!email || !name || !role) { say('usage: node scripts/db.mjs user <email> <name> <role> [password]'); process.exit(2); }
  const pw = password || Buffer.from(Array.from({ length: 12 }, () => Math.floor(Math.random() * 256))).toString('base64url').slice(0, 14);
  const id = `USR-${Date.now().toString(36).toUpperCase()}`;
  const w = await pool.query('INSERT INTO users (id, email, name, role, password_hash, must_change_password) VALUES ($1, $2, $3, $4, $5, true) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, must_change_password = true, is_active = true RETURNING role',
    [id, email.toLowerCase(), name, role, await hash(pw, { memoryCost: 19456, timeCost: 2, parallelism: 1 })]);
  const written = w.rows[0]?.role ?? role;   // an existing person keeps their role: this command resets the password only
  say(`user ${email} (${written}) ready — temporary password: ${pw}  (they must change it at first sign-in)`);
  if (written !== role) say(`  note: ${email} already existed as "${written}" — the role was NOT changed (change it in Users & roles)`);
  // v5.1 (G8) a real administrator now exists: the temporary admin@pucho.ai that never finished its setup is retired, so
  // admin@123 cannot be claimed later by whoever finds the deployment first. Only when the row written IS an active admin.
  if (written === 'admin') {
    const r = await pool.query("UPDATE users SET is_active = false, deactivated_at = now(), deactivated_by = $1, updated_at = now() WHERE email = 'admin@pucho.ai' AND must_change_email AND is_active AND email <> $1 AND EXISTS (SELECT 1 FROM users WHERE email = $1 AND role = 'admin' AND is_active)", [email.toLowerCase()]);
    if (r.rowCount) say('temporary administrator admin@pucho.ai deactivated (a real administrator exists now)');
  }
}

/** The demo seed (rows + persona accounts with known passwords) belongs on a demo database only. It refuses a database that
 *  does not look like one — a DB_HOST target (the portal's injected block) or a name that does not end in _dev / _demo /
 *  _gate — unless `--demo-db` says the person knows what they are doing (audit S4 / S10, Oct 2026). */
function demoGuard(args) {
  const name = String(cfg.database || ''); const looksDemo = /_(dev|demo|gate\w*|test)$/i.test(name) || /^gate_/i.test(name);
  if (args.includes('--demo-db')) return;
  if (env('DB_HOST') || !LOCAL.test(cfg.host) || !looksDemo) {
    console.error(`db seed refused: ${cfg.user}@${cfg.host}/${name} does not look like a demo database (name not *_dev / *_demo, or a DB_HOST / remote target).` +
      `\n  Personas with known passwords must never land on a client's database. For a real demo deployment run: node scripts/db.mjs seed --demo-db`);
    process.exit(3);
  }
}

try {
  if (cmd === 'migrate') await migrate();
  else if (cmd === 'seed') { demoGuard(rest); await seed(!rest.includes('--no-personas')); }
  else if (cmd === 'reset') await reset();
  else if (cmd === 'user') await user(rest);
  else { say('usage: node scripts/db.mjs migrate | seed [--no-personas] [--demo-db] | reset | user <email> <name> <role> [password] | preflight'); process.exit(2); }
} catch (e) { console.error(`db ${cmd} failed: ${e.message}`); process.exit(1); } finally { await pool.end(); }
