import { dbConfig, dbConfigError, describeDb, resolveCa } from '@/lib/db';
import { wiring } from '@/lib/flows';
import { inboundOpen, demoMode } from '@/lib/auth';
import { preloadSettings } from '@/lib/settings';

// v5.1 (LEAP log B2): the refusals that must stop a start run FIRST in `node scripts/db.mjs preflight` (the Dockerfile CMD),
// before Next prints "Ready". They stay here too, IDENTICAL, as the second line for a start that skips the preflight
// (`npm start`, a hand-run server.js). Change one, change both.
export async function startupLog() {
  // S4 — demo logins (listed personas, password-less persona sign-in) must never meet a live database. `true` is for a local
  // or demo database; with the portal's DB_* block present the server refuses to start. `portal-demo` is the deliberate,
  // logged exception for a demo deployment on CP Portal (step 5), demo data only.
  const demo = demoMode();
  if (demo === 'true' && process.env.DB_HOST) {
    console.error('REFUSING TO START: DEMO_LOGINS=true with a DB_HOST (portal) database. Unset DEMO_LOGINS for a client deployment, or set DEMO_LOGINS=portal-demo for a demo deployment that holds demo data only.');
    process.exit(3);
  }
  if (demo) console.warn(`DEMO LOGINS ON (${demo}): the login page lists the seeded personas and signs them in without a password. Never on a client's deployment.`);
  // v5.1: the admin's settings (inbound token, webhook URLs, names) are read before the first request, so the first flow call is
  // judged against the stored token (lib/settings.ts) — but never for longer than PRELOAD_MS: a slow or unreachable database
  // must not hold readiness. Not loaded in time: the shared inbound token is refused until they load (closed, never open);
  // the load carries on and a later request picks it up.
  const PRELOAD_MS = 3000;
  const loaded = dbConfigError ? false : await Promise.race([preloadSettings(), new Promise<false>((r) => setTimeout(() => r(false), PRELOAD_MS).unref?.())]);
  if (!loaded) console.warn(`Settings not loaded within ${PRELOAD_MS / 1000} s (database not reachable yet?): the shared inbound token is refused until they load`);
  const w = wiring();
  console.log(`Database: ${dbConfigError ? 'INVALID — ' + dbConfigError : describeDb(dbConfig)}`);
  console.log(`Workflows wired: ${w.wired}/${w.total}${w.unwired.length ? ' — SIMULATED: ' + w.unwired.join(', ') : ''} · inbound: ${inboundOpen() ? 'open to flows with an inbound token' : 'closed (no inbound token set)'}`);
  if (dbConfig.ssl && !resolveCa()) console.warn('DB TLS NOT VERIFIED — no CA (DB_SSL_CA, /app/db-ca.pem or db/db-ca.pem; standards §19.1); release blocker in production');
  if (!process.env.AUTH_PEPPER) console.warn('AUTH_PEPPER unset — one-time codes are hashed with an empty pepper; set it before go-live');
}
