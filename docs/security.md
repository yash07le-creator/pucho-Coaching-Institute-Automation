# Security · EduFlow (standards/fullstack-build-standard.md §19 — seven controls, every build)

| control | in this build | proof |
|---|---|---|
| 19.1 transport | HTTPS at CP Portal's proxy; `APP_ORIGIN` https:// turns on HSTS + `__Host-` cookie; DB TLS derived from the host and **verified** only when `DB_SSL_CA` is set; DB port never public; `app` / `studio_reader` roles (`db/roles.sql`) | startup log line; `curl -I`; `db:migrate` output |
| 19.2 passwords & sessions | argon2id (`$argon2id$`, 19 MiB / 2 / 1); opaque 32-byte token, SHA-256 in `sessions`, HttpOnly/Secure/Lax cookie, 30-day cap, revoked on deactivation / password change / role change; sign-in rate-limited per account and address; one-time codes HMAC-peppered, 10 min, 5 attempts; nothing in localStorage | `npm run check:db` A1, A4; devtools |
| 19.3 authorization | every page: `requireUser` + role → page map in the Server Component; every Server Action: role → action map (`src/config/access.js`); self-service roles pinned server-side (SCOPES); DTOs only; cross-scope row = 404 | `ui_check` R1; `check:db` A2–A3 |
| 19.4 input | `$n` placeholders everywhere (`npm run check` S2); Zod `.strict()` on every action, route and env; uploads by magic bytes into PostgreSQL, served through an authorised route | `npm run check` |
| 19.5 secrets | `import 'server-only'` on db/dal/auth/crypto/flows; no secret-shaped `NEXT_PUBLIC_`; `.next/static` searched for every `.env` value and every persona password; webhook URLs only in `WEBHOOK_<FLOW>` | `npm run check` S1, S4, S5; `security_scan.py` |
| 19.6 headers & patching | CSP, nosniff, DENY, referrer, permissions in `next.config.js`; `poweredByHeader: false`; `npm audit --audit-level=high` in the gate | `curl -I`; `npm run check` S6 |
| 19.7 PII encryption | no column declared `encrypted:` — if this OS stores Aadhaar / PAN / bank / health data, declare it on the entity before go-live | `psql` shows `v1:…` ciphertext |

## Workflows
Flows never hold a database credential. They write through `POST/PATCH /api/data/<entity>` with `INBOUND_TOKEN` (unset = 403), under the same DAL rules and audit as a person's request; they read reports with the read-only `studio_reader` role (D4). The app calls a flow through `WEBHOOK_<FLOW>` from the server; until a URL is set the app applies the action's declared effect itself and says **simulated** in the header — a demo is usable before any import, and nothing pretends an AI step ran.
Declared flows: ADMISSION_CALL, STUDENT_MANAGE, ABSENCE, ACADEMIC_CALL, FEE_REMINDER, PARENT_UPDATE, SEND_WHATSAPP.

## Known-broken until step 7 proves otherwise (write the date when each is closed)
- [ ] `DB_SSL_CA` set and the startup line reads *ssl verified* (a Pucho DB CA bundle — ask the portal team).
- [ ] `app` and `studio_reader` roles created on the client database (needs a user that may create roles; else record the gap).
- [ ] The one shared `INBOUND_TOKEN` set (`deploy/<slug>.env`, or Settings → Inbound token): the flows the app calls receive it with every call; the others carry it written in by `build_deploy.py` (`INBOUND_TOKEN_<FLOW>` is an optional per-flow override).
- [ ] `WEBHOOK_AUTH_OTP` wired (until then the login page offers no one-time code; codes are never logged).

## Inbound tokens — one shared INBOUND_TOKEN (INBOUND_TOKEN_<FLOW> optional override), rotated without downtime (S8)
The app accepts ONE shared token — the one saved in Settings → Inbound token, or, while none is saved, the env `INBOUND_TOKEN`
(the latest change wins; every instance on one database shares it) — plus, after a rotation, the token it replaced for 24 hours
(`INBOUND_TOKEN_PREV`). Optional, env only: `INBOUND_TOKEN_<FLOW>` (one flow gets its own token — the app sends it to that flow, the
audit row names it, unsetting it cuts that flow off) and `INBOUND_TOKEN_NEXT` (an incoming token during an env rotation).
**Rotation:** Settings → Inbound token → *Generate new* (or a new `INBOUND_TOKEN` in the env file and a redeploy). The flows the app
calls get the new token with their next call; rebuild and re-import the flows that have it written in (Settings lists them) with
`build_deploy.py --inbound-token <the new token>` within the 24-hour overlap. Every Studio webhook URL is itself a secret: it is held
in Settings → Flow webhook URLs or the server environment (`WEBHOOK_<FLOW>`), never in the bundle or a flow file; rotate it by
re-publishing the flow and pasting the new URL. Audit trail: `audit_log` rows from a flow carry `flow` as the actor, with
`[INBOUND_TOKEN_<FLOW>]` / `[INBOUND_TOKEN_PREV]` / `[INBOUND_TOKEN_NEXT]` when a token other than the shared one let the write in.
- [ ] First real deploy on CP Portal with `deploy/deploy-ready.zip` from `build_deploy.py` (Build Type Dockerfile; `deploy/UPLOAD.md`). `npm run package` is not a portal route.
