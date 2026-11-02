# 01 — PRD · EduFlow
_Generated 2026-11-02 from os.yaml._

**Client:** Pucho EduFlow OS  
**Outcome:** Every lead, absence, overdue fee, slipping student and parent gets an AI call or a WhatsApp on time, and the director sees what needs action on one screen.  
**Languages:** en, hi · **Volume:** ~4200 events/month · **Operating cost:** see `docs/estimate.md` (credits/month, workflow-wise)

## Pages
- **overview** `/` — What needs action today, then the institute's numbers
- **alerts** `/alerts` — 
- **leads** `/leads` — 
- **calls** `/calls` — 
- **students** `/students` — 
- **attendance** `/attendance` — 
- **academic** `/academic` — 
- **scores** `/scores` — 
- **fees** `/fees` — 
- **parents** `/parents` — 
- **messages** `/messages` — 
- **team** `/team` — 
- **settings** `/settings` — Profile, password, flow webhook URLs
- **users** `/users` — Everyone who can sign in, and what each role may open

## Workflows
- **ADMISSION_CALL** — trigger `webhook.catch_webhook`; writes leads, calls, messages, audit_log
  - `new_lead` — model standard, ~240s, ~44 credits; payload Name, Phone, Email, Course, Source, Notes, Assigned_To → result grade, score, summary, next_action
  - `call` — model standard, ~240s, ~44 credits; payload Lead_ID, Name, Phone, Course, Notes → result grade, score, summary, next_action
- **STUDENT_MANAGE** — trigger `webhook.catch_webhook`; writes students, fees, messages, audit_log
  - `enrol` — model none, ~5s, ~7 credits; payload Name, Phone, Student_Phone, Parent_Name, Parent_Phone, Course, Batch, Fee_Amount_INR, Fee_Due_Date, Address, Counsellor → result 
- **ABSENCE** — trigger `webhook.catch_webhook`; writes attendance, calls, messages, alerts, audit_log
  - `absent` — model standard, ~300s, ~14 credits; payload Date, Batch, Student_ID, Student_Name, Course, Parent_Name, Parent_Phone, Absences_This_Week, Marked_By → result reason, category, needs_followup
  - `reason_call` — model standard, ~300s, ~29 credits; payload Att_ID, Date, Batch, Student_ID, Student_Name, Course, Parent_Name, Parent_Phone → result reason, category, needs_followup
- **ACADEMIC_CALL** — trigger `webhook.catch_webhook`; writes students, calls, alerts, messages, audit_log
  - `counsel` — model standard, ~360s, ~54 credits; payload Student_ID, Name, Student_Phone, Course, Attendance_Pct, Last_Score, Weak_Subjects, Mentor → result issue_type, main_issue, needs_mentor, needs_counsellor
- **FEE_REMINDER** — trigger `webhook.catch_webhook`; writes fees, calls, messages, alerts, audit_log
  - `remind` — model standard, ~240s, ~29 credits; payload Fee_ID, Student_Name, Parent_Name, Parent_Phone, Course, Balance_INR, Due_Date, Days_Overdue, Payment_Link → result parent_response, promise_date
  - `send_link` — model none, ~4s, ~7 credits; payload Fee_ID, Student_Name, Parent_Name, Parent_Phone, Balance_INR, Due_Date, Payment_Link → result 
- **PARENT_UPDATE** — trigger `webhook.catch_webhook`; writes students, calls, messages, alerts, audit_log
  - `weekly_report` — model none, ~4s, ~7 credits; payload Student_ID, Name, Parent_Name, Parent_Phone, Attendance_Pct, Last_Score, Class_Rank, Performance_Trend → result 
  - `update_call` — model standard, ~300s, ~49 credits; payload Student_ID, Name, Parent_Name, Parent_Phone, Course, Attendance_Pct, Last_Score, Class_Rank, Performance_Trend, Strong_Subjects, Weak_Subjects → result sentiment, feedback, concern, needs_escalation
- **SEND_WHATSAPP** — trigger `webhook.catch_webhook`; writes messages, audit_log
  - `send_update` — model none, ~4s, ~7 credits; payload Student_ID, Name, Parent_Name, Message, To → result 
- **FEE_RUN** — trigger `schedule.cron_expression`; writes fees
  - `run` — model none, ~20s, ~5 credits; payload  → result 
- **ACADEMIC_RUN** — trigger `schedule.cron_expression`; writes students
  - `run` — model none, ~20s, ~5 credits; payload  → result 
- **PARENT_RUN** — trigger `schedule.cron_expression`; writes students
  - `run` — model none, ~20s, ~5 credits; payload  → result 
- **ROLLUP** — trigger `schedule.cron_expression`; writes students, alerts
  - `run` — model none, ~25s, ~5 credits; payload  → result 

## Rules in code
- HOT needs grade HOT and score ≥ 80, else WARM; HOT sets Next_Followup_At = now + 48 h (ADMISSION_CALL code)
- HOT lead with no counsellor → the counsellor (team, Role Counsellor) with the fewest open HOT leads for that course
- Absence: Absences_This_Week counted in code; below call_from_absence (2) → WhatsApp only, else the AI call (ABSENCE.absent)
- Present marks are direct inserts (no flow, no credits); one mark per student per date (unique Date + Student_ID)
- Attendance_Pct over the last 30 days, Last_Score, Avg_Score, Class_Rank, Performance_Trend (last 3 tests), Strong/Weak subjects — nightly ROLLUP
- Student Status: Critical when Attendance_Pct < 60 or Avg_Score < 40; At Risk when < 75 or < 60; else Active (ROLLUP)
- Fee Balance_INR = Amount_INR − Paid_INR (computed on every write); Days_Overdue and Status Due → Overdue from the day after Due_Date (FEE_RUN)
- Fee reminder calls on day 1, 7 and 15 overdue; WhatsApp link 3 days before Due_Date (FEE_RUN)
- At-risk queue: Attendance_Pct < 75 or Last_Score < 60, worst first, at most 50 a week (ACADEMIC_RUN)
- Friday: report to every active parent, call only At Risk / Critical; Monday: one retry for last Friday's No Answer (PARENT_RUN)
- Alerts raised once while one is open for the same record and kind (ROLLUP and the agents)
- Every number in a WhatsApp template comes from the record, never from a model

## Not in v1
- A parent or student login portal — parents are reached by call and WhatsApp only (X1)
- An online test engine — scores are entered on the Test scores page (X2)
- Timetable, faculty attendance and payroll (X3)
- Handling inbound WhatsApp replies with AI (X4)
- Multi-branch institutes in one deployment (X5)
- The n8n AI Agents Status page — replaced by Settings → Flow webhook URLs and /api/health (X6)

## Success metric
Fees overdue going down month on month, and every absence with a reason collected
