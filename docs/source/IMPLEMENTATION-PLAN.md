# Pucho EduFlow OS — analysis and phased implementation plan

Kit: **pucho-os v5.1.1** · Date: 2 Nov 2026 · Step: **0 (intake), done** → next is step 1.

## Intake answers (step 0)

| Question | Answer |
|---|---|
| For whom | **Pucho product: EduFlow**, for coaching institutes (`os.mode: product`). Studio flows are named `Pucho EduFlow - <FLOW>`. Each institute gets its own deployment and database. |
| Stage | **Clickable demo on sample data.** The app runs locally on PostgreSQL with seeded data. Flows are built and importable, and any flow that is not wired is **SIMULATED** by the app (the header chip says so). |
| Voice calls | **Pucho `ai-voice-call`** (`voiceCall` + `getCallDetails`). This replaces VAPI. |
| Look | **Pucho default** (white, Geist, shadcn) with EduFlow **indigo** as the one accent. The page structure and Hinglish copy come from the HTML. The emoji and coloured stat icons are dropped. |

Settled by the documents, so not asked:
- **Data home:** the OS's own database. In the n8n flow, every CRM call goes to `YOUR_CRM_API`, which is a placeholder. The OS becomes that CRM.
- **Automation:** fully automatic, with an exception queue (Alerts & Escalations).

---

## 1 · What the HTML reference contains (source inventory → R-lines in step 1)

`coaching_crm.html` is a static mockup. Every button fires a toast and nothing is wired. It reads as a requirement, not as code to port.

| Screen / modal | What a person sees and does | Becomes |
|---|---|---|
| Dashboard | 6 KPIs (students, new leads/week, fees overdue, avg attendance, AI calls/week, avg score), recent agent activity, urgent alerts, lead conversion bars | Overview, trimmed to **4 KPIs** (lean-frontend budget). Every KPI opens the list behind it. |
| Alerts & Escalations | 7 alerts from all agents with severity (CRITICAL/HIGH/MEDIUM/LOW), "Mark all read" | `alerts` entity + queue page. Alerts are raised by flows (escalations) **and** by code rules (attendance < 75%, fee 15+ days overdue, HOT lead untouched for 48 h). |
| Leads Pipeline | HOT/WARM/COLD counts, filters (status, course), table with AI call status and score; Assign / Follow-up / Nurture / Call Now / View | `leads` entity with a board and table view. Actions: add lead (starts the AI call), call now, assign counsellor, mark nurture. |
| Lead detail modal | course, status, AI score, source, AI qualification summary, next action, call transcript, assign counsellor | Lead record page or drawer with tabs (Details · Call & transcript · Activity) |
| AI Call Log | call cards from all 5 agents: duration, time, outcome, transcript, follow-up/retry | `calls` entity shown as a cards view. Filters: agent, status. |
| All Students | filters (course, batch, status), table: attendance %, last score, fee status, risk status; View / Call / Alert / Escalate | `students` entity. Attendance %, last score and risk are **computed in code** (rule zero). |
| Enroll Student modal | student + parent name and phone, course, batch, fee amount, due date, address | Insert action that also creates the first `fees` row and sends a welcome WhatsApp |
| Student detail modal | attendance, last test, rank, strong/weak subjects, parent info, last call sentiment; Call Parent / Send Report | Student record page with tabs (Profile · Fees · Calls & messages) |
| Attendance | present/absent today, below-75 % list, today's absent list with AI reason and category | `attendance` entity. The **Mark attendance** sheet is a per-batch P/A grid, which needs a `custom` section. Each absence starts the absence call. |
| Academic Performance | avg score, below 60 %, mentor sessions, at-risk follow-up queue (issue type, weak subjects); Assign Mentor / Counsellor / Escalate | `tests` (scores) entity plus the at-risk queue, selected by code |
| Fee Management | collected, overdue, overdue students, reminders today; tabs Overdue / Due this week / Paid; Send Link / Record payment | `fees` entity with segments. Actions: send payment link (WhatsApp), record payment (`direct`), trigger all reminders. |
| Parent Updates | sentiment counts (happy/neutral/concerned), last week's parent call log | A view over `calls` where agent = Parent, plus sentiment segments |
| WhatsApp Messages | sent/delivered/read/replies, message log; **Send Message** modal (individual / batch / broadcast, type) | `messages` entity. The send modal uses **templates** (rule 10: recipients and text come from the record, never typed from scratch). |
| AI Agents Status | 5 agent cards with trigger, stack, counts, Manual Run / View Logs | Replaced by the kernel's flow health (`/api/health`, Settings → Flow webhook URLs). The "Manual Run" buttons become bulk actions on their own pages. Not a separate page. |

Personas in the mockup: Admin/Director (Dev Dabi), Counsellor A/B, Mentor, Management. Parents and students never log in. They are reached only by call and WhatsApp.

---

## 2 · What the n8n workflow does, and what is wrong with it

`5._Parent_Communication_Agent.json` has 48 nodes in **5 independent lanes**:

| Lane | Trigger | n8n path |
|---|---|---|
| A. Admission lead | `POST /new-lead` | extract → **GPT** script → VAPI call → wait 3 min → get call → **GPT** qualify → parse → HOT? → WhatsApp counsellor → CRM update → respond |
| B. Fee reminder | cron `0 10 * * *` | GET overdue → split → **GPT** script → VAPI call → WhatsApp payment link → CRM "reminder sent" |
| C. Absence | `POST /student-absent` | extract → **GPT** script → VAPI call parent → wait 4 min → transcript → **GPT** reason → parse → update attendance → follow-up? → WhatsApp counsellor → respond |
| D. Academic at-risk | cron `0 11 * * 1` | GET at-risk (attendance < 75, score < 60) → split → **GPT** script → VAPI call → wait 5 min → transcript → **GPT** analyse → parse → mentor/counsellor? → WhatsApp mentor → CRM |
| E. Weekly parent update | cron `0 17 * * 5` | GET all active → split → **GPT** script → VAPI call → wait 6 min → transcript → **GPT** feedback → parse → WhatsApp summary → escalate? → alert management → CRM save |

Defects to fix in the rebuild, not carry over:
1. **Every request body is empty** (`bodyParameters: [{}]`). No prompt, VAPI payload or WhatsApp message was ever written, so prompts and templates must be written from scratch.
2. **All CRM endpoints are placeholders** (`YOUR_CRM_API`), and so are the API keys (`Bearer YOUR_…` in headers). Nothing reads or writes real data.
3. **Split-in-batches has no loop-back** in lanes B, D and E, so only the first batch is processed.
4. **Two GPT calls per path.** The Pucho budget is ≤ 1 AI call per path. The "generate a call script" call is not needed, because the voice agent receives its context directly.
5. **Lane B sends the WhatsApp before the call has finished** and never reads the call outcome ("will pay by Friday" is lost).
6. **Lane E calls every active student's parent every Friday** (342 calls a week). That is the largest cost line, and no policy limits it.
7. No dedupe, retry or error path, and no log of what was sent. The "Webhook Response" is reached on only some branches.

---

## 3 · The Pucho redesign (rule zero applied)

**Code does** (app + CODE nodes): every list selection (overdue fees, at-risk students, below-75 % attendance, active students), attendance % and averages, ranks, days overdue, the HOT-lead 48 h SLA, alert rules, IDs, and the numbers in every WhatsApp message.
**AI does:** the call itself (`ai-voice-call`, with a prompt built from the record) and **one** read of the transcript per path (Pucho CDM `ai_task:` extract/classify → typed fields).
**WhatsApp:** `pucho-whatsapp` approved **templates** (`sends.template`). The recipient and the variables come from the record.

### Proposed Studio flows (draft for step 2 — final shape set by `build_flows.py`)

Each per-record flow is a webhook flow, `async: true`. It answers "queued" at once, then calls, waits, reads the result and writes back through `/api/data`. The same flow serves the page button ("Call now") and the scheduled run.

| Flow | Path (≤ 14 steps, ≤ 1 AI call, ends in Return) | Writes |
|---|---|---|
| `ADMISSION_CALL` | trigger → constants → voiceCall (lead context) → delay → getCallDetails → **CDM classify** (HOT/WARM/COLD, score, summary, next action) → parse → router HOT? → WhatsApp template to counsellor → update lead + insert call → return | leads, calls, messages |
| `FEE_REMINDER` | trigger → constants → (Razorpay `create-payment-link` ⚑) → voiceCall → delay → getCallDetails → **CDM extract** (promise date, response) → WhatsApp payment-link template → update fee + insert call → return | fees, calls, messages |
| `ABSENCE_CALL` | trigger → constants → voiceCall parent → delay → getCallDetails → **CDM extract** (reason, category SICK/FAMILY/…, needs_followup) → parse → router → WhatsApp counsellor → update attendance + insert call (+ alert) → return | attendance, calls, alerts |
| `ACADEMIC_CALL` | trigger → constants → voiceCall student → delay → getCallDetails → **CDM extract** (issue_type, main_issue, needs_mentor, needs_counsellor) → parse → router → WhatsApp mentor → insert call (+ alert) → return | calls, alerts, messages |
| `PARENT_UPDATE` | trigger → constants → voiceCall parent → delay → getCallDetails → **CDM extract** (sentiment, feedback, concerns, needs_escalation) → WhatsApp weekly-report template (numbers from the record) → router → alert management → insert call → return | calls, messages, alerts |
| `SEND_WHATSAPP` | channel job: trigger → template send → insert message → return (welcome on enrol, manual and batch sends) | messages |
| 3 schedule dispatchers | Daily 10:00 fees · Mon 11:00 academic · Fri 17:00 parents (Asia/Kolkata): fetch the code-selected list → loop → POST each record to its per-record flow → return | — |

UNVERIFIED until a live Studio run: the `ai-voice-call` props (`connectionDetails` is DYNAMIC and no reference export exists), the longest wait the `delay` step allows, and the dispatcher fan-out pattern (no worked example yet). Until then, all three are labelled SIMULATED or UNVERIFIED in every report.

---

## 4 · Database (local PostgreSQL 18 — checked)

- Server: `localhost:5432`, PostgreSQL 18.6, reachable. It already holds `brand_dna_os_dev` and `ghasitaram_wastage_os_dev` from earlier OS builds, so the same pattern is used here.
- `psql` is installed at `C:\Program Files\PostgreSQL\18\bin` but is **not on PATH**. Add it to PATH before step 3 (`check_env.py` reports MISS).
- **Do not run the app as `postgres`.** Create a dedicated owner (in pgAdmin → Query Tool, or psql):
  ```sql
  CREATE ROLE eduflow_dev LOGIN PASSWORD '<new password, not the postgres one>';
  CREATE DATABASE eduflow_os_dev OWNER eduflow_dev;
  ```
  The name must end in `_dev` or the seed refuses it. Credentials go only in `app/.env`, which is never committed.
- Tables are **generated from `os.yaml`** by the scaffold (`db/schema.sql`, idempotent, with CHECK/UNIQUE and `db/rls.sql`). Do not create them by hand. Expected entities: `courses`, `batches`, `leads`, `students` (with parent fields), `fees`, `payments`, `attendance`, `tests`, `calls`, `messages`, `alerts`, plus the kernel's users, roles, sessions, audit and jobs.
- Load order: `npm run db:migrate` (twice, to prove idempotence) → `npm run db:seed` (demo data for the invented institute).

---

## 5 · Phased plan

| Phase | Kit step(s) | Work | Gate (evidence in `evidence/`) |
|---|---|---|---|
| **0 · Intake** ✅ | 0 | Read sources, check environment, intake answers | This document + "yes" on the brief |
| **1 · Product brief & cost** | 1 | `docs/00-product-brief.md` (segment, first buyers, jobs), `docs/00-source-inventory.md`, R-lines R1…Rn from §1 and §2, gaps, `volumes.yaml` → `estimate_os.py` (credits/month, **estimate**) | Brief + R-lines + gaps + `estimate.md` sent |
| **2 · Decide the OS** | 2 | `os.yaml`: D1 roles (Director/Admin · Counsellor · Faculty-Mentor · Accounts) · D2 journeys · D3 entities + validation · D4 metrics · D5 sections · D6 actions/sends/templates · D7 flows (§3) · D8 overview (4 KPIs) · D9 look (Pucho + indigo, dark mode) · D10 Hinglish copy · D11 not in v1 | Analysis summary confirmed · `fidelity_check --mode product` PASS · no empty row in `traceability.md` |
| **3 · Scaffold + DB** | 3 | Create the role and DB (§4) · `scaffold_os.py os.yaml eduflow-os` · `npm i` · migrate ×2 · seed · build | build clean · `npm run check` · `ui_check` desktop + `--mobile` + `--dark` at 0 failures |
| **4 · UI** | 4 | `src/custom/**` only: attendance P/A sheet, call cards with transcript, sentiment strip, fee tabs. Kernel blocks for everything else. | `ui_check` 0 failures, no stub left, screenshots looked at |
| **5 · Demo sign-off** | 5 | Click-through with `DEMO_LOGINS=true`, every persona | Written sign-off |
| **6 · Studio workflows** | 6 | `build_flows.py` → flow JSON + contracts · `flow_sim` · `complexity.py` · CHECKLIST per flow · counted estimate, acknowledged · `import_flows.py --dry-run` | Every flow PASS against its contract, `flow_sim` 0 failures |
| **7 · Wire & test** | 7, 8, 8b | Bind connections (ai-voice-call, pucho-whatsapp, Razorpay) · one real record round trip · `validate_inputs.py` · security scan + auditor/fixer (demo depth) | 0 Critical · Known-broken list written |
| **8 · QA & handover** | 9, 10 | `qa_os.py` (asks first) · `build_deploy.py` → `--check-zip` OK · `handover_check.py` READY | `docs/qa-report.md`, `docs/handover.md` |

Phases 3–8 run only after the step-2 summary gets a "yes" (contract rule 7).

---

## 6 · Open questions for step 1 (gaps — each changes the design)

- **G1** Can you export one Studio flow containing an `ai-voice-call` `voiceCall` step (or attach the connection), so its `connectionDetails` shape is known?
- **G2** Call policy, which drives cost: should a parent get a call on **every** absence, or only from the 2nd absence in a week (WhatsApp first)?
- **G3** Weekly parent update: a WhatsApp report to **all** parents, and a call only to parents of at-risk students? (Calling all parents is about 1,470 calls a month at 342 students.)
- **G4** Payment link: a Razorpay link per reminder, or one fixed link per student?
- **G5** Which WhatsApp templates are approved, or should be submitted? Fee reminder · absence alert · weekly report · counsellor/mentor alert · welcome.
- **G6** Thresholds: attendance < 75 %, score < 60 %, fee overdue ≥ 1 day (alert at 15), HOT lead SLA 48 h. Are these right?
- **G7** Call language: Hindi/Hinglish for parents, the same for students?
- **G8** Demo business: keep "Replora Coaching Institute, Bhopal" as the invented demo institute, or invent a new one?

## Not in v1 (proposed)
Parent/student login portal · online test engine (scores are entered or imported) · timetable and faculty payroll · inbound WhatsApp replies auto-handled · multi-branch institutes.

## Risks (skill known gaps this build touches)
`ai-voice-call` and `delay` have no Studio reference export. `body.data` on the http write-back is unproven until the first import. Studio webhooks accept unauthenticated calls, so keep webhook URLs server-side only. Voice-minute credits are not in the credit table, so the voice cost stays **UNVERIFIED** until a real run.

## Environment notes
- **Path length:** this folder is long and contains spaces and `+`, and Windows long paths are **off**. Put the OS repository at a short path such as `C:\pucho\eduflow-os`, or enable long paths. Otherwise `node_modules` and `.next` will hit the 260-character limit.
- Node 24, Python 3.12, PyYAML and Playwright Chromium are all OK. `psql` is not on PATH.
