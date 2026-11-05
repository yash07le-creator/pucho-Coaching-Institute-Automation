# EduFlow OS — full project context (hand-over for a new Claude session)

Written 5 Nov 2026, at the end of the first Claude session (2–5 Nov 2026). **A new Claude session: read this file first, then
`C:\pucho\eduflow-os\CLAUDE.md`, then the docs it points to.** Nothing in this file is a password or a secret.

---

## 1. What this project is

**EduFlow** is a Pucho OS **product** (`os.mode: product`) for coaching institutes: admissions, attendance, academics, fees and
parent communication, with AI voice calls and WhatsApp done by Pucho Studio workflows. The demo institute is **Replora Coaching
Institute, Bhopal** (invented — gap G8).

It was built from two inputs (in this folder):
- `coaching_crm.html` — the UI mockup "EduFlow CRM";
- `5._Parent_Communication_Agent.json` — an n8n flow with 5 lanes (lead call, fee reminder, absence call, academic at-risk, weekly
  parent update). It used VAPI; we use **Pucho `ai-voice-call`** instead.

Built with the **Pucho OS skill v5.1.1** (`anthropic-skills:pucho-os-v511`). Intake answers (2 Nov): product name EduFlow ·
clickable demo on sample data · Pucho ai-voice-call · Pucho default look + indigo accent `#4F46E5` · the "recommended" call policy
(later changed by the owner — see §6).

## 2. Where everything is

| What | Path |
|---|---|
| **This working folder** (inputs, plan, intake, master os.yaml) | `C:\Pucho claude project\NOV-2026\Coaching Institute Automation + Dashboard\` |
| **The repository = the deliverable** (the app, workflows, docs, deploy) | `C:\pucho\eduflow-os\` |
| **GitHub** | https://github.com/yash07le-creator/pucho-Coaching-Institute-Automation (branch `main`; local branch is `master`) |
| **Kit copy** (the skill's scripts — the installed skill path is too long for Windows) | `C:\pucho\kit\` |
| Workflow guide (report) | `eduflow-workflow-guide.html` here · `C:\pucho\eduflow-os\docs\workflow-guide.html` · https://claude.ai/artifact/NvsgU735WPFQi4LF1L15mh (old account — may not open from the new one) |
| Deploy package | `C:\pucho\eduflow-os\deploy\` |

Files in this working folder: `os.yaml` (**master copy** — edit here, then scaffold), `IMPLEMENTATION-PLAN.md` (the phased plan),
`intake/` (product brief with requirements R1–R41, decisions, requirements.yaml, estimate inputs), the two source files.

### The repository `C:\pucho\eduflow-os\`
```
os.yaml                ← copied from the working folder by the scaffold (keep both identical)
CLAUDE.md, README.md   ← generated: how to work in this repo
app/                   ← Next.js 16 (App Router) + PostgreSQL
  src/app/[[...path]]/ ← ONE route renders every module (there are no per-module page files)
  src/module/          ← the kit's generic renderer (Page, blocks/Table, Kanban, ActionModal…) — GENERATED, never edit
  src/config/          ← GENERATED from os.yaml: pages.js, nav.js, roles.js, access.js, os.config.js, tokens.css
  src/components, src/lib ← kit — GENERATED, never edit
  src/custom/          ← ★ OUR hand-written code (the only app code we may edit):
       AttendanceSheet.jsx  batch attendance (Present/Absent per student, save once, WhatsApp to absentees, corrections)
       BatchManager.jsx     Batches page (time-range picker, day chips, course chips)
       ScoreBook.jsx        Test scores page (filters, table, CSV export, whole-batch score entry grid)
       badgeTones.js/.css   badge colours (Present green, WhatsApp Sent indigo, Escalated/Concerned red) — hydration-safe
       navScroll.js         keeps the sidebar scroll after a click (kit bug workaround)
       popupSlack.js        clears leftover modal padding after a dropdown closes (kit bug workaround)
       index.js             registers the above
  db/                  ← schema.sql, roles.sql, rls.sql, seed/*.csv (GENERATED)
  scripts/             ← db.mjs (migrate / seed / reset), check.mjs, start.mjs
  .env                 ← local secrets (git-ignored) — DATABASE_URL, AUTH_PEPPER, DEMO_LOGINS=true, COMPANY_NAME=EduFlow
workflows/<FLOW>/      ← <FLOW>.json (Studio import file), .contract.json, .CHECKLIST.md; workflows/samples/*.md test payloads
tools/build_eduflow_flows.py ← OUR builder for 12 of the 13 workflows (custom path)
tools/eduflow/flowlib.mjs    ← every workflow rule in code (copied into each CODE step); fakes.mjs for the simulator
tests/eduflow-flowlib.test.mjs, tests/eduflow-flows.test.mjs ← node --test (17 tests)
docs/                  ← step4-ui-notes.md (every UI change + kit defects), step6-workflows.md, workflow-guide.html,
                         estimate.md, flows-complexity.md, security.md, db-setup.md, PRD/TRD/schema…
evidence/              ← gate outputs (check, ui-check screenshots)
deploy/                ← deploy-ready.zip, eduflow-os.env*, eduflow-os-schema.sql, eduflow-os-DEMO-ONLY-db.sql*, flows/*, UPLOAD.md
                         (* git-ignored: secrets / demo data)
```

## 3. The golden rules (from the Pucho OS skill — follow them)
1. **`os.yaml` is the single source of truth.** Change a module, field, flow or page in `os.yaml` (working-folder copy), then
   re-run the scaffold. **Never hand-edit generated files** (`app/src/config`, `module`, `components`, `lib`, `db/`) — the scaffold
   refuses or overwrites them. Bespoke UI goes only in `app/src/custom/**`.
2. **The skill / kit is read-only.** Never edit `C:\pucho\kit` or the installed skill. A kit bug is noted for the skill owner.
3. **Rule zero:** a workflow does the AI; every number, status, date and rule is code.
4. **Simulated is said out loud** — until a workflow's webhook URL is set, the app applies its effect itself and shows "Workflows simulated".
5. **Evidence, not intention** — a step is done when its gate printed a result.
6. **Never write a password or token into a file, a chat or git.**

## 4. Commands (Windows; Git Bash or PowerShell — PowerShell 5.1 has no `&&`, use `;`)

```
# scaffold after editing os.yaml (from the working folder)
cd "C:\Pucho claude project\NOV-2026\Coaching Institute Automation + Dashboard"
python C:/pucho/kit/scripts/scaffold_os.py os.yaml C:/pucho/eduflow-os

# database (PostgreSQL 18, local) — from C:\pucho\eduflow-os\app
npm run db:migrate          # run twice after a schema change (idempotent)
npm run db:seed             # demo data; refuses a database not named *_dev / *_demo
npm run db:reset            # wipe + reload demo data (signs everyone out)
npm run check ; npm run check:db

# run the app (dev, hot reload) — port 3000 is used by the owner's other app ("Brand DNA OS"); use 3200
cd C:\pucho\eduflow-os\app
$env:PORT = '3200'; $env:APP_ORIGIN = 'http://127.0.0.1:3200'; npm run dev      # PowerShell
# production-style: npm run build ; then PORT=3100 APP_ORIGIN=http://127.0.0.1:3100 node scripts/start.mjs

# workflows (from C:\pucho\eduflow-os)
python tools/build_eduflow_flows.py .                       # rebuild the 12 custom workflows
node --test tests/eduflow-flowlib.test.mjs tests/eduflow-flows.test.mjs
node C:/pucho/kit/flow/flow_sim.mjs workflows --fakes tools/eduflow/fakes.mjs
python C:/pucho/kit/flow/validate_flow.py workflows/<F>/<F>.json --contract workflows/<F>/<F>.contract.json
python C:/pucho/kit/flow/complexity.py workflows --require-output --out docs/flows-complexity.md
python C:/pucho/kit/scripts/estimate_os.py . --from-flows

# UI gate (needs a production build; stop the dev server first — it shares .next)
python C:/pucho/kit/scripts/ui_check.py .            (+ --mobile, --dark)

# deploy package (rule 13: only this zip, always check it)
python C:/pucho/kit/scripts/build_deploy.py . --demo [--app-origin https://<domain>] [--inbound-token <token>]
python C:/pucho/kit/scripts/build_deploy.py --check-zip deploy/deploy-ready.zip
```

**Database:** local PostgreSQL 18.6 (`psql` in `C:\Program Files\PostgreSQL\18\bin`); database **`eduflow_os_dev`**, app login
**`eduflow_dev`** (IN ROLE app). Its password is only in `app/.env`. The `postgres` superuser password is the owner's — ask them.

**Demo sign-in (local, DEMO_LOGINS=true):** pick a persona on the login page — Dev Dabi (Director/admin), Sunita Rao (Office admin),
Priya Saxena (Counsellor), Arvind Mishra (Mentor). **Deployed:** `admin@pucho.ai` / `admin@123` once, then set a real admin.

## 5. The app — modules and roles
14 modules in the nav: Overview, Alerts & escalations, Leads, AI call log, Students, Attendance, Academic, Test scores, Fees,
Parent updates, WhatsApp, Courses, Batches, Team (+ Settings, Users & roles). Roles: **admin** (Director), **office**, **counsellor**,
**mentor**. 14 entities incl. leads, students, attendance, attendance_sessions, tests, test_runs, fees, calls, messages, alerts,
team, courses, batches.

## 6. Owner change requests — all done (2–4 Nov)
1. Enrol form: course + batch options; Courses and Batches pages (R41).
2. Removed empty space under modal buttons (kit bug → `popupSlack.js`).
3. **Attendance "Default All Present":** batch + date → everyone Present; Present / Absent buttons per student (two real choices,
   Space/arrows/P/A keys); search; live "Total | Present | Absent"; one save per batch (session + all marks in one transaction);
   confirm "Ready to save attendance for {Batch}?"; old one-student form removed; a saved batch can be corrected.
4. **Absences = formal WhatsApp only, never an AI call** (owner, 3 Nov). R15/R16 reworded. Column "WhatsApp Notice":
   Present · Queued · WhatsApp Sent · Delivered · Failed. 2nd absence in 7 days → counsellor alert (no call).
5. Sidebar "last module opens the first one" fixed (`navScroll.js`).
6. Batches: time-range picker + day chips.
7. **Test scores:** whole-batch score grid (Enter/↓ next, ↑ previous, Absent tick, marks ≤ Out of, live batch average), one save
   (`SCORES.save_batch` → test_runs + tests), Export Excel/CSV of the filtered view (`Test_Scores_<Batch>_<Subject>_<date>.csv`).
   `tests` gained Status (Scored/Absent) and Run_ID.
8. **Hybrid Parent Updates (Friday 17:00 IST):** WhatsApp weekly report to every active parent (no AI); AI check-in call only for
   At Risk / Critical or attendance < 75 % or last score < 60 %; CDM reads sentiment/feedback/concern/needs_escalation; status
   No Answer / Escalated / Completed; escalation → HIGH alert "Parent Concern - {Name} - {Course}" owned by the Director + WhatsApp;
   Concerns tab = Needs_Followup Yes (red badges); Monday 17:00 one retry, then "No answer twice — closed".
9. Fixed a hydration console error (badge colours now CSS / post-hydration only).

## 7. The 13 Pucho Studio workflows (step 6, built 3 Nov, imported into Studio by the owner)
| Workflow | Trigger | Job |
|---|---|---|
| ADMISSION_CALL | app (Leads) | AI call to a lead → grade/score (HOT needs score ≥ 80) → counsellor alert |
| ACADEMIC_CALL | app / ACADEMIC_RUN | AI counselling call → mentor/counsellor alert when needed |
| FEE_REMINDER | app / FEE_RUN | AI reminder call + payment-link WhatsApp; day 15 no promise → CRITICAL alert |
| PARENT_UPDATE | app / PARENT_RUN | weekly report (no AI) + at-risk check-in call + escalation |
| ATTENDANCE | app | save batch → one ABSENCE post per absentee |
| ABSENCE | ATTENDANCE / app | formal WhatsApp notice; repeat → counsellor alert |
| STUDENT_MANAGE | app | enrol: student + first fee + welcome; lead → Enrolled |
| SEND_WHATSAPP | app | reviewed message to one parent |
| SCORES | app | **leave unwired** — the app saves scores itself |
| FEE_RUN | daily 10:00 | overdue days; calls on day 1/7/15; link 3 days before due |
| ACADEMIC_RUN | Monday 11:00 | attendance < 75 or score < 60, worst first, max 50 |
| PARENT_RUN | Fri + Mon 17:00 | the hybrid Friday run + Monday retry |
| ROLLUP | daily 01:30 | attendance %, scores, rank, trend, status, alerts |

Studio names: `Pucho EduFlow - <FLOW>`. 12 built by `tools/build_eduflow_flows.py`, SCORES by the kit's `build_flows.py`.
Gates: contracts 13/13 PASS · flow_sim 16 runs 0 failures · node tests 17/17 · import dry-run OK.
**Budget exception:** the 4 call agents count 3 "AI" steps (voiceCall, getCallDetails, CDM) vs a budget of 1 — getCallDetails only
reads the record; noted for the skill owner. Full detail: `docs/step6-workflows.md`.

## 8. Deploy package (built 3 Nov, demo)
`C:\pucho\eduflow-os\deploy\`: `deploy-ready.zip` (check-zip OK — upload as App Zip File, Build Type Dockerfile, port 80),
`eduflow-os.env` (fresh secrets), `eduflow-os-schema.sql` (empty, real client), `eduflow-os-DEMO-ONLY-db.sql` (demo rows),
`flows/` (13, token written into the 4 schedules), `UPLOAD.md` (field-by-field guide). Docker is not installed on this PC, so
`docker build` was NOT run locally — the portal builds it.

## 9. Cost
Counted on the built workflows: **59,682 credits ≈ ₹17,905 / month** (±30 %: ₹12,533–₹23,276); declared at step 2: ₹13,484.
7 actions count > 1.5× declared. The kit wants the client to acknowledge it:
`python C:/pucho/kit/scripts/estimate_os.py . --acknowledge "<who, date>"` (not done yet).

## 10. What is NOT done / open (pick up here)
1. **Push to GitHub** — the repo is **18 commits ahead** of `origin/main` (last push 2 Nov): `git push origin master:main`.
2. `deploy/eduflow-os.env`: set **APP_ORIGIN** to the real domain (now `https://SET-YOUR-APP-DOMAIN`); maybe COMPANY_NAME → EduFlow.
3. Studio setup for each workflow (its CHECKLIST.md): WhatsApp account + 6 approved templates (absence_alert, staff_alert,
   fee_payment_link, weekly_report, welcome, general_update — G5), 4 voice agents (G1), hand-off webhook URLs (ATTENDANCE→ABSENCE,
   FEE_RUN→FEE_REMINDER, ACADEMIC_RUN→ACADEMIC_CALL, PARENT_RUN→PARENT_UPDATE, plain URLs), app URL + inbound token in the 4
   schedules (the owner imported from `workflows/` — re-import those 4 from `deploy/flows/` or paste the env's INBOUND_TOKEN).
4. App Settings → Flow webhook URLs: `/sync` URL for STUDENT_MANAGE, ATTENDANCE, FEE_REMINDER, PARENT_UPDATE, SEND_WHATSAPP;
   plain URL for ADMISSION_CALL, ABSENCE, ACADEMIC_CALL; SCORES empty.
5. **Unverified until a live run:** ai-voice-call `connectionDetails` keys and getCallDetails shape (G1), pucho-whatsapp reply,
   WhatsApp "Delivered" callback (G5), LOOP_ON_ITEMS node type, the Docker image build.
6. The full **UI check** (`ui_check.py` desktop/mobile/dark) was not re-run after the 3 Nov changes (last: 1007/0, 950/0, 1004/0
   on 2 Nov). Needs the dev server stopped.
7. Cost acknowledgement (§9). Step 5 written sign-off of the demo was never formally given.
8. Not built: ADMISSION_CALL automatic retry 2 h after no answer ("Call again with AI" covers it).
9. Kit defects to report to the skill owner (all worked around in `custom/`, see `docs/step4-ui-notes.md`): stale CHECK
   constraints after removing `one_of`; modal padding never released; sidebar scroll reset; "Powered by" badge overlaps buttons;
   no per-value colour on table badges; complexity counts getCallDetails as AI; the "SKILL MODIFIED" warning on SKILL.md.
10. Open gaps from intake: G1 voice export, G4 Razorpay link, G5 WhatsApp templates, G7 call language, G8 demo name, G10 first buyers.

## 11. Things that tripped us (so they don't again)
- The installed skill path is too long for Windows → always run scripts from `C:\pucho\kit`.
- Windows console cp1252 crashes on "₹" / "→" → set `PYTHONIOENCODING=utf-8`.
- `npm run build` while the server runs → EPERM on `.next/standalone`; stop the node process first. A dev server and a build
  share `.next` — never build while `npm run dev` is running.
- `db:reset` signs every browser out (users are re-seeded).
- `flow_sim` answers every `/api/data` GET with `[]`; the tests route reads to the seed (`/api/seed/`) — see the test file.
- The validator splits CODE on the first `// end lib` text — never write that phrase in a library comment.
- Run the kit's `build_flows.py` only on a filtered copy of os.yaml (SCORES only) — on the full file it stops at the schedules
  (it treats every schedule as a Tally sync) and writes generic flows over ours.

## 12. How to start the new Claude session
1. Open Claude Code (desktop app → Code tab) with the folder `C:\Pucho claude project\NOV-2026\Coaching Institute Automation + Dashboard`
   and add `C:\pucho\eduflow-os` as a second folder.
2. Make sure the **Pucho OS skill v5.1.1** is available in the new account (skills are per account — upload/enable it again;
   the kit copy at `C:\pucho\kit` still works for the scripts either way).
3. First message, for example: *"Read PROJECT-CONTEXT.md in this folder and C:\pucho\eduflow-os\CLAUDE.md, then continue the
   EduFlow OS project — next: <what you want>."*
