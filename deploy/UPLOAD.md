# EduFlow — portal upload (03 Nov 2026)

> **Never paste the env file, or any value in it, into a chat, a ticket, an email or a screenshot.** It holds live secrets. If one
> leaked, rotate it (below) — and treat the old value as public.

| Portal field | File | Size |
|---|---|---|
| **App Zip File** | `deploy-ready.zip` — the ONLY zip to upload; it passed `--check-zip` (rule 13). Never `npm run package`, never a zip you made | 765 KB |
| **Env File** | `eduflow-os.env` | 1 KB |
| **Flow Files (JSON)** | all 13 files in `flows/` | 139 KB, 127 KB, 19 KB, 117 KB, 92 KB, 72 KB, 145 KB, 151 KB, 81 KB, 49 KB, 44 KB, 54 KB, 58 KB |
| **DB (SQL) File** | `eduflow-os-schema.sql` — **a real client** (no data) | 60 KB |
| | `eduflow-os-DEMO-ONLY-db.sql` — **demo / staging only** | 183 KB |

## First step after go-live — the temporary administrator
1. Wait until `https://<domain>/api/health` answers ok, then open the app and sign in with **`admin@pucho.ai`** / **`admin@123`**.
2. The app opens **Set up your admin account**: enter the client administrator's own name, email and a new password (10+ characters).
   Nothing else works until this is saved; afterwards `admin@123` never signs in again.
3. The temporary administrator exists only on a database that has never had an administrator (`eduflow-os-schema.sql` creates it once).

Fallback — no temporary administrator (an older database) or a second administrator, run inside the container (it prompts; nothing to edit):
- bash / sh: `printf 'Admin email: '; read EMAIL; printf 'Admin name: '; read NAME; node scripts/db.mjs user "$EMAIL" "$NAME" admin`
- PowerShell: `$Email = Read-Host 'Admin email'; $Name = Read-Host 'Admin name'; node scripts/db.mjs user $Email $Name admin`

It prints a one-time temporary password the person changes at the first sign-in. Creating an administrator this way also retires
the temporary administrator (`admin@pucho.ai` is deactivated while its setup is still pending), so `admin@123` can no longer be claimed.

## Environment variables
The env file holds `KEY=value` lines only (checked before this folder was written: no comment, no duplicate key, `PORT=80`, every
required key set). What each key is:

| Key | Comes from | Required | What it is |
|---|---|---|---|
| `NODE_ENV` | fixed | yes | production mode |
| `PORT` | fixed | yes | the port the app listens on — the Dockerfile's `EXPOSE 80`; the portal maps its own port to it |
| `HOSTNAME` | fixed | yes | listen on every interface inside the container |
| `APP_ORIGIN` | **set by you** | yes | the app's public https address, no path, no trailing slash — secure cookies and the CSRF origin check. A domain move = change it here AND the App URL in Settings |
| `TRUST_PROXY_HOPS` | fixed | yes | one reverse proxy (the portal) in front: sign-in rate limits key on the real client address |
| `DATABASE_URL` | optional | no | leave empty when the portal injects `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` (they win); otherwise `postgres://<app_login>:<password>@<host>:5432/<db>` for a login IN ROLE app |
| `DB_TIMEZONE` | optional | no | the zone timestamps are reported in; empty = Asia/Kolkata |
| `AUTH_PEPPER` | generated | yes | keys the one-time sign-in codes (HMAC); fresh on every build |
| `INBOUND_TOKEN` | generated | yes | the token the flows present on `/api/data`: written into the flows the app does NOT call (the app sends the current one to every flow it calls). Rotate it in Settings |
| `COMPANY_NAME` | from os.yaml (`os.client`) | yes | the client's company name everywhere in the app (login, header, letterheads, AI prompts); the administrator can change it in Settings |
| `APP_NAME` | from os.yaml (`os.name`) | yes | the product title (browser title, home-screen name); editable in Settings |
| `DEMO_LOGINS` | optional | no | empty for a client. `portal-demo` only on a demo deployment holding demo data (lists the demo logins) |
| `WEBHOOK_ADMISSION_CALL` | from Studio after import | no | the Studio webhook URL of flow ADMISSION_CALL; empty = the app simulates it. The Flow webhook URLs in Settings override it |
| `WEBHOOK_STUDENT_MANAGE` | from Studio after import | no | the Studio webhook URL of flow STUDENT_MANAGE; empty = the app simulates it. The Flow webhook URLs in Settings override it |
| `WEBHOOK_SCORES` | from Studio after import | no | the Studio webhook URL of flow SCORES; empty = the app simulates it. The Flow webhook URLs in Settings override it |
| `WEBHOOK_ATTENDANCE` | from Studio after import | no | the Studio webhook URL of flow ATTENDANCE; empty = the app simulates it. The Flow webhook URLs in Settings override it |
| `WEBHOOK_ABSENCE` | from Studio after import | no | the Studio webhook URL of flow ABSENCE; empty = the app simulates it. The Flow webhook URLs in Settings override it |
| `WEBHOOK_ACADEMIC_CALL` | from Studio after import | no | the Studio webhook URL of flow ACADEMIC_CALL; empty = the app simulates it. The Flow webhook URLs in Settings override it |
| `WEBHOOK_FEE_REMINDER` | from Studio after import | no | the Studio webhook URL of flow FEE_REMINDER; empty = the app simulates it. The Flow webhook URLs in Settings override it |
| `WEBHOOK_PARENT_UPDATE` | from Studio after import | no | the Studio webhook URL of flow PARENT_UPDATE; empty = the app simulates it. The Flow webhook URLs in Settings override it |
| `WEBHOOK_SEND_WHATSAPP` | from Studio after import | no | the Studio webhook URL of flow SEND_WHATSAPP; empty = the app simulates it. The Flow webhook URLs in Settings override it |
| `WEBHOOK_AUTH_OTP` | from Studio (optional) | no | the flow that emails one-time sign-in codes; empty = password sign-in only |
| `DB_HOST` | from the panel (injected — not in this file) | yes | the database host; when it is set the DB_* block is used and DATABASE_URL is ignored |
| `DB_PORT` | from the panel (injected — not in this file) | yes | the database port (5432) |
| `DB_NAME` | from the panel (injected — not in this file) | yes | the database name |
| `DB_USER` | from the panel (injected — not in this file) | yes | a least-privilege login IN ROLE app (docs/db-setup.md) |
| `DB_PASSWORD` | from the panel (injected — not in this file) | yes | that login's password |
| `DB_SSL_CA` | set by you when needed | only when the database is not Amazon RDS (ap-south-1) | the PEM of the database's CA. Empty = the image verifies TLS against Amazon RDS's ap-south-1 bundle (`/app/db-ca.pem`); any other database needs its own CA here |

## What each file is

**App zip.** Source plus a `Dockerfile`; the platform builds the image (deploy-ready pattern).
- Listens on **port 80** (`EXPOSE 80`, `PORT=80` in the Dockerfile and the env file), runs as the non-root `node` user.
- Health check: configure the platform's own check on `/api/ping` (expects `{"ok":true}`). The image has no HEALTHCHECK on purpose (Docker Swarm 502).
- The start-up guards run before the server (`node scripts/db.mjs preflight`): a refused configuration stops with a message in the runtime log before "Ready".
- Contains no `node_modules`, `.next`, `dist`, `.env`, key or `.npmrc` file; type-checked before it was zipped (pass); `docker build`: not run (docker is not on PATH).
- The image deletes any `.env*` file (but `.env.example`) and `db/seed/users.json` again, whatever the zip carried. This was a `--demo` build: the zip carries `db/seed/users.json`, but the image removes it, so no persona picker.

**Env file.** Fresh production secrets, not the development ones: AUTH_PEPPER, INBOUND_TOKEN.
- **Set `APP_ORIGIN`** to the app's public https address (it is a placeholder now).
- The database comes from the portal's injected `DB_*` variables; if it does not inject them, set `DATABASE_URL`.
- Upload it **together with the flow files**: the flows that carry the token share `INBOUND_TOKEN` with it.

**DB files.**
- `eduflow-os-schema.sql` — every table, index, role, grant and row-level-security policy, the built-in roles and the temporary administrator,
  **no data**. Idempotent, one transaction; a loader that cannot create roles gets notices, not errors — **read them**: without the
  `app` role the per-person row-level policies are not created; ask the database owner to create `app` and `studio_reader` and load it again.
- `eduflow-os-DEMO-ONLY-db.sql` — the same schema plus 231 demo rows, **rows only — no demo logins**. **Demo or staging only — never a client's
  production database.** Sign in with the temporary administrator (first step above).

**Flow files.** The 13 Studio workflows (schemaVersion 7), named `Pucho EduFlow - <FLOW>` in Studio.
- Called by the app (9): `Pucho EduFlow - ADMISSION_CALL.json`, `Pucho EduFlow - STUDENT_MANAGE.json`, `Pucho EduFlow - SCORES.json`, `Pucho EduFlow - ATTENDANCE.json`, `Pucho EduFlow - ABSENCE.json`, `Pucho EduFlow - ACADEMIC_CALL.json`, `Pucho EduFlow - FEE_REMINDER.json`, `Pucho EduFlow - PARENT_UPDATE.json`, `Pucho EduFlow - SEND_WHATSAPP.json` — they read `app_url`, `inbound_token` and `company_name` from every call, so a change in Settings reaches them at once.
- With the values written in (4): `Pucho EduFlow - FEE_RUN.json`, `Pucho EduFlow - ACADEMIC_RUN.json`, `Pucho EduFlow - PARENT_RUN.json`, `Pucho EduFlow - ROLLUP.json` — `inbound_token` = the env file's, `company_name` = `COMPANY_NAME`. After a change in Settings, rebuild and re-import these (Settings lists them).
- Still to set in Studio: `SET_IN_STUDIO_APP_URL`, `SET_IN_STUDIO_TEMPLATE_ID_ABSENCE_ALERT`, `SET_IN_STUDIO_TEMPLATE_ID_FEE_PAYMENT_LINK`, `SET_IN_STUDIO_TEMPLATE_ID_GENERAL_UPDATE`, `SET_IN_STUDIO_TEMPLATE_ID_STAFF_ALERT`, `SET_IN_STUDIO_TEMPLATE_ID_WEEKLY_REPORT`, `SET_IN_STUDIO_TEMPLATE_ID_WELCOME`, `SET_IN_STUDIO_VOICE_AGENT_ACADEMIC`, `SET_IN_STUDIO_VOICE_AGENT_ADMISSION`, `SET_IN_STUDIO_VOICE_AGENT_FEE`, `SET_IN_STUDIO_VOICE_AGENT_PARENT`, `SET_IN_STUDIO_WEBHOOK_ABSENCE`, `SET_IN_STUDIO_WEBHOOK_ACADEMIC_CALL`, `SET_IN_STUDIO_WEBHOOK_FEE_REMINDER`, `SET_IN_STUDIO_WEBHOOK_PARENT_UPDATE`, `SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID` (each flow's CHECKLIST says where), and attach the connections.

## After it is live
1. Wait for `https://<domain>/api/health` — the database reachable and `inbound: true` — then **hard-reload** the browser (Ctrl+Shift+R):
   right after a redeploy the old page asks for files the new build no longer has, which looks like broken images.
2. Sign in with the temporary administrator and set up the client's admin account (first step above).
3. Import the flows; paste each flow's webhook URL into Settings → Flow webhook URLs (or the env file as `WEBHOOK_<FLOW>`) — the header chip turns from "Workflows simulated" to "wired".

**If something is wrong**
- **502 — even on `/api/ping`**: the app process is not running. Read the platform's **runtime log** first (a refused start says
  why in its first lines: `REFUSING TO START: …`), not the build log.
- Studio says *Succeeded* but nothing changed: a write-back answered 4xx — check the row in the database / the audit log.
- A database that is not Amazon RDS and uses TLS needs `DB_SSL_CA` (its CA's PEM): the image verifies against the RDS bundle only, so without it the connection is refused.

## Rotating a secret
- `INBOUND_TOKEN` — Settings → Inbound token → *Generate new*, **or** a new value in the env file and a redeploy: the latest change
  wins (a newer env value replaces the one saved in Settings) and the old token keeps working for 24 hours either way. Rebuild and
  re-import the flows that have it written in before then (Settings lists them) with `--inbound-token <the new token>` — a rebuild
  without it generates a different token. The app sends the new one to every flow it calls at once.
- `APP_ORIGIN` (the address flows write back to) — Settings → App URL, **or** the env file and a redeploy: the latest change wins.
  The env value is also the app's own sign-in origin, so change it there when the domain moves. Every instance that uses the same
  database must run with the same `APP_ORIGIN` and `INBOUND_TOKEN` (a copy started with other values counts as a newer change),
  and a token replaced twice within 24 hours ends the oldest one's overlap at once.
- `AUTH_PEPPER` — a new value in the env file and a restart; one-time codes already sent stop working, passwords and sessions do not.
- `FIELD_ENC_KEYS` / `BLIND_INDEX_KEY` — never replace them on a live database (the encrypted columns become unreadable); every
  rebuild keeps them (`--rotate-keys` only before the first go-live).
- A webhook URL (`WEBHOOK_<FLOW>`) — republish the flow in Studio and paste its new URL into Settings.
- The database password — in the portal; the app reads it at the next start.

Rebuild after any change: `py scripts/build_deploy.py eduflow-os` (or `python3` / `python`; a new AUTH_PEPPER every run, a new
INBOUND_TOKEN unless you pass the current one — the one the flows were set up with, or the token shown once in Settings after a
rotation — as `--inbound-token <token>`; upload env and flows together; encryption keys are kept unless `--rotate-keys`);
`--zip-only` rebuilds just the app zip. A token typed on the command line lands in the shell history: read it into a variable
first (bash `read -rs TOKEN` then `--inbound-token "$TOKEN"`; PowerShell `$Token = Read-Host 'Inbound token'` then
`--inbound-token $Token`), or clear the history entry afterwards.
