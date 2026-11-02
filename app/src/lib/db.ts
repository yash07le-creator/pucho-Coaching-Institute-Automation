// src/lib/db.ts — the ONE connection resolver and the ONE pool (standards/fullstack-build-standard.md §13).
// Server Components, Server Actions, Route Handlers and the db scripts all import this; two resolvers is how a seed
// lands in one database while the server reads another.
import 'server-only';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Pool, type PoolConfig } from 'pg';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|::1|host\.docker\.internal|db|postgres)$/i;
const env = (k: string) => { const v = process.env[k]; return v == null || v.trim() === '' ? undefined : v.trim(); };

export type DbConfig = { host: string; port: number; database: string; user: string; password: string; schema: string; ssl: boolean; source: 'DB_* variables' | 'DATABASE_URL' };

function wantsSsl(host: string): boolean {
  const explicit = env('DB_SSL');
  if (explicit != null) return ['1', 'true', 'require', 'yes', 'on'].includes(explicit.toLowerCase());
  return !LOCAL_HOST.test(host);
}

export function resolveDbConfig(): DbConfig {
  const schema = env('DB_SCHEMA') ?? 'public';
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(schema)) throw new Error(`DB_SCHEMA "${schema}" is not a valid identifier`);
  const host = env('DB_HOST');
  if (host) {                                   // the discrete form wins OUTRIGHT (§13.1)
    const database = env('DB_NAME'); const user = env('DB_USER');
    if (!database) throw new Error('DB_HOST is set, so DB_NAME is required too.');
    if (!user) throw new Error('DB_HOST is set, so DB_USER is required too.');
    const port = Number(env('DB_PORT') ?? 5432);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error(`DB_PORT "${env('DB_PORT')}" is not a port`);
    return { host, port, database, user, password: env('DB_PASSWORD') ?? '', schema, ssl: wantsSsl(host), source: 'DB_* variables' };
  }
  const raw = env('DATABASE_URL');
  if (!raw) throw new Error('Set DATABASE_URL (development) or DB_HOST + DB_NAME + DB_USER (deployment).');
  const url = new URL(raw);
  return { host: url.hostname, port: Number(url.port || 5432), database: decodeURIComponent(url.pathname.slice(1)), user: decodeURIComponent(url.username || 'postgres'),
           password: decodeURIComponent(url.password), schema, ssl: wantsSsl(url.hostname), source: 'DATABASE_URL' };
}

/** The CA that verifies the database's TLS certificate (LEAP log B1 / D3): DB_SSL_CA when set (an override), else the bundle
 *  the Dockerfile adds (/app/db-ca.pem, Amazon RDS ap-south-1), else db/db-ca.pem beside the app. scripts/db.mjs resolves it
 *  the same way, so the app and the db scripts agree. None: TLS without verification, said out loud at start-up. */
// (each path is read with a literal argument: a computed path makes Next's file tracer pull the whole project into the bundle)
const pemAt = (read: () => string): string | null => { try { const pem = read(); return pem.includes('BEGIN CERTIFICATE') ? pem : null; } catch { return null; } };
export function resolveCa(): { ca: string; source: string } | null {
  const v = env('DB_SSL_CA');
  if (v) return { ca: v.replace(/\\n/g, '\n'), source: 'DB_SSL_CA' };
  const bundled = existsSync('/app/db-ca.pem') ? pemAt(() => readFileSync('/app/db-ca.pem', 'utf8')) : null;
  if (bundled) return { ca: bundled, source: '/app/db-ca.pem' };
  const local = existsSync(join(process.cwd(), 'db', 'db-ca.pem')) ? pemAt(() => readFileSync(join(process.cwd(), 'db', 'db-ca.pem'), 'utf8')) : null;
  if (local) return { ca: local, source: 'db/db-ca.pem' };
  return null;
}
function statementMs(): number { const n = Number(env('DB_STATEMENT_TIMEOUT_MS') ?? 30_000); return Number.isFinite(n) && n >= 1000 ? Math.floor(n) : 30_000; }
export function poolOptions(cfg: DbConfig): PoolConfig {
  const ca = cfg.ssl ? resolveCa()?.ca : undefined;
  return {
    host: cfg.host, port: cfg.port, database: cfg.database, user: cfg.user, password: cfg.password, max: 8,
    connectionTimeoutMillis: 5000,   // v5.1: an unreachable database fails a request in 5 s, never hangs it (or the start-up preload)
    // v5.1.1 (owner report 31 Oct 2026): a database that accepts the connection but never answers must not hang a request either —
    // the server cancels a statement after DB_STATEMENT_TIMEOUT_MS (default 30 s) and the client gives up 5 s later. /api/ping
    // touches no database at all, so port 80 answers whatever the database does.
    statement_timeout: statementMs(), query_timeout: statementMs() + 5000,
    // every connection, replacements included: the search_path, and the client's time zone so timestamps read as IST in
    // Studio reports and API answers (the browser formats in its own zone anyway)
    options: [cfg.schema === 'public' ? '' : `-c search_path=${cfg.schema},public`, `-c TimeZone=${(env('DB_TIMEZONE') ?? 'Asia/Kolkata').replace(/[^A-Za-z0-9_\/+-]/g, '')}`].filter(Boolean).join(' '),
    ...(cfg.ssl ? { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false } } : {}),
  };
}

// §13.3 — a bad configuration logs and starts; it never kills the process before it listens (the operator would only see 502).
export let dbConfigError: string | null = null;
function safeResolve(): DbConfig {
  try { return resolveDbConfig(); }
  catch (err) {
    dbConfigError = err instanceof Error ? err.message : String(err);
    console.error(`DATABASE CONFIGURATION INVALID — data requests will fail: ${dbConfigError}`);
    return { host: '0.0.0.0', port: 1, database: 'unconfigured', user: 'unconfigured', password: '', schema: 'public', ssl: false, source: 'DB_* variables' };
  }
}
export const dbConfig = safeResolve();
export const describeDb = (c: DbConfig) => {
  const ca = c.ssl ? resolveCa() : null;
  const tls = !c.ssl ? '' : ca ? `, ssl verified (${ca.source === 'DB_SSL_CA' ? 'DB_SSL_CA' : 'bundled CA'})` : ', ssl NOT VERIFIED (no CA: DB_SSL_CA, /app/db-ca.pem or db/db-ca.pem)';
  return `${c.user}@${c.host}:${c.port}/${c.database} (schema ${c.schema}${tls}) via ${c.source}`;
};

// §13.2 — one pool, cached on globalThis so `next dev`'s hot reload does not open a new set of connections per save.
declare global { var __pgPool: Pool | undefined }   // eslint-disable-line no-var
export const pool: Pool = process.env.NODE_ENV === 'production' ? new Pool(poolOptions(dbConfig)) : (globalThis.__pgPool ??= new Pool(poolOptions(dbConfig)));
pool.on('error', (e) => console.error('pg pool error:', e.message));

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query(text, params);
  return r.rows as T[];
}
