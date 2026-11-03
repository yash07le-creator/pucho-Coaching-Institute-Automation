# 00 — Decisions · EduFlow
_Generated from os.yaml. The step-2 summary: roles and homes, journeys, entities, metrics, sections, actions, flows, overview, theme, tier, not in v1 (`method/os-decisions.md`)._

## D1 · Roles and homes
| role | lands on | pages | in their words |
|---|---|---|---|
| Director | `/` | * | Runs the institute: what needs action, leads, students, fees, parents and every AI call |
| Office admin | `/attendance` | attendance, students, scores, fees, messages, alerts, courses, batches, settings | Marks attendance, enrols students, records fees and sends WhatsApp templates |
| Counsellor | `/leads` | leads, calls, students, parents, alerts, messages, settings | Works the leads the AI qualified, follows up absences and parent concerns |
| Mentor | `/academic` | academic, scores, students, attendance, calls, settings | Looks after at-risk students: counselling calls, scores and mentor sessions |

## D2 · Journeys
- **admin** · Clear today's escalations — lands on `overview` · 2 steps: Overview opens on Needs action → Open alerts row → Acknowledge
- **admin** · Give a HOT lead to a counsellor — lands on `overview` · 2 steps: HOT leads past 48 h on Needs action → Assign → pick the counsellor
- **office** · Mark today's attendance for a batch — lands on `attendance` · 3 steps: Attendance opens with the batch sheet → Tap P or A per student → Save — parents of absent students get a formal WhatsApp notice
- **office** · Record a fee payment — lands on `fees` · 3 steps: Fees, Overdue tab → Record payment on the row → Amount + mode → Save
- **counsellor** · Follow up a HOT lead the AI qualified — lands on `leads` · 3 steps: Leads, HOT chip → Open the lead — summary and transcript → Enrol, or Call again
- **mentor** · Counsel an at-risk student — lands on `academic` · 2 steps: Academic opens on the at-risk tab → Start AI call, or Assign mentor on the row

## D3 · Entities
| entity | title | subtitle | owner | due | contact | stages |
|---|---|---|---|---|---|---|
| leads | Name | Course | Assigned_To | Next_Followup_At | phone=Phone, whatsapp=Phone, email=Email | New → Called → Counselling → Demo Booked → Nurture → Enrolled → Lost |
| students | Name | Course, Batch | Mentor |  | phone=Parent_Phone, whatsapp=Parent_Phone | Active → At Risk → Critical → Inactive |
| fees | Student_Name | Course, Parent_Name |  | Due_Date | phone=Parent_Phone, whatsapp=Parent_Phone | Upcoming → Due → Overdue → Partial → Paid |
| attendance | Name | Batch, Course |  |  | phone=Parent_Phone, whatsapp=Parent_Phone | Present → Absent |
| tests | Name | Test_Name, Subject |  |  |  |  |
| calls | Person | Agent, Course |  |  | phone=Phone, whatsapp=Phone | Queued → Calling → Completed → No Answer → Failed → Escalated |
| messages | To_Name | Type |  |  |  | Queued → Sent → Delivered → Read → Failed → Simulated |
| alerts | Title | Kind, Severity | Owner |  |  | Open → Acknowledged → Resolved |
| team | Name | Role |  |  | phone=Phone, whatsapp=Phone, email=Email |  |
| attendance_sessions | Batch | Date |  |  |  |  |
| courses | Name | Exam |  |  |  |  |
| batches | Name | Days |  |  |  |  |
| audit_log |  |  |  |  |  |  |

Data: **PostgreSQL** (one database per client, single-tenant) · security: **§19 baseline** (`docs/security.md`)

## D4 · Metrics
| metric | label | entity | where | tone |
|---|---|---|---|---|
| `students_active` | Active students | students | `Status!=Inactive` | info |
| `at_risk` | At risk | students | `Status in [At Risk, Critical]` | warn |
| `low_attendance` | Below 75% attendance | students | `Attendance_Pct<75 and Status!=Inactive` | bad |
| `new_leads_7d` | New leads this week | leads | `Created_At in last 7 days` | info |
| `hot_leads` | HOT leads | leads | `Grade=HOT and Stage not in [Enrolled, Lost]` | info |
| `hot_overdue` | HOT leads past 48 h | leads | `Grade=HOT and Next_Followup_At<today and Stage not in [Enrolled, Lost]` | bad |
| `fees_overdue` | Fees overdue | fees | `Status=Overdue` · sum Balance_INR | bad |
| `overdue_count` | Overdue students | fees | `Status=Overdue` | bad |
| `overdue_15` | Overdue 15+ days | fees | `Status=Overdue and Days_Overdue>=15` | bad |
| `collected_month` | Collected this month | fees | `Paid_At in month` · sum Paid_INR | ok |
| `alerts_open` | Open alerts | alerts | `Status=Open` | bad |
| `absent_today` | Absent today | attendance | `Date=today and Status=Absent` | warn |
| `present_today` | Present today | attendance | `Date=today and Status=Present` | ok |
| `followup_needed` | Needs follow-up | attendance | `Needs_Followup=Yes and Date>=today-7` | bad |
| `calls_week` | AI calls this week | calls | `Called_At in last 7 days` | info |
| `parents_happy` | Happy parents | calls | `Agent=Parent and Sentiment=Happy and Called_At in last 7 days` | ok |
| `parents_neutral` | Neutral | calls | `Agent=Parent and Sentiment=Neutral and Called_At in last 7 days` | warn |
| `parents_concerned` | Concerned parents | calls | `Agent=Parent and Sentiment=Concerned and Called_At in last 7 days` | bad |
| `messages_today` | WhatsApp sent today | messages | `Sent_At=today` | info |
| `messages_failed` | Failed | messages | `Status=Failed` | bad |

## D5 · Sections — the shape of each
| page | section | shape |
|---|---|---|
| Overview | Needs action | needs_action: alerts_open · hot_overdue · overdue_15 |
| Alerts & escalations | kpis | kpis (strip) |
| Alerts & escalations | alerts | table; bulk acknowledge; drawer per row |
| Leads | kpis | kpis (strip) |
| Leads | leads | table / kanban; bulk assign; drawer per row |
| AI call log | kpis | kpis (strip) |
| AI call log | calls | cards / table; drawer per row |
| Students | kpis | kpis (strip) |
| Students | students | table; bulk send_update, weekly_report; drawer per row |
| Students | record | detail (rail) |
| Attendance | kpis | kpis (strip) |
| Attendance | custom | custom |
| Attendance | attendance | table; drawer per row |
| Academic | kpis | kpis (strip) |
| Academic | tabs | tabs: At-risk queue, All students |
| Academic | students | table; bulk counsel; drawer per row |
| Academic | students | table; bulk counsel; drawer per row |
| Test scores | tests | table; drawer per row |
| Fees | kpis | kpis (strip) |
| Fees | tabs | tabs: Overdue, Due this week, Paid this month, All |
| Fees | fees | table; bulk remind, send_link; drawer per row |
| Fees | fees | table; bulk remind, send_link; drawer per row |
| Fees | fees | table; bulk remind, send_link; drawer per row |
| Fees | fees | table; bulk remind, send_link; drawer per row |
| Parent updates | kpis | kpis (strip) |
| Parent updates | tabs | tabs: Parent calls, Concerns |
| Parent updates | calls | table; drawer per row |
| Parent updates | calls | table; drawer per row |
| WhatsApp | kpis | kpis (strip) |
| WhatsApp | messages | table; drawer per row |
| Courses | courses | table; drawer per row |
| Batches | custom | custom |
| Team | team | table; drawer per row |

## D6 · Actions
| page | action | shape |
|---|---|---|
| Overview | Acknowledge alert | status: 1 field · direct |
| Overview | Assign counsellor | edit: 1 field · direct |
| Overview | Send payment link | status: 0 fields · FEE_REMINDER |
| Alerts & escalations | Mark read | status: 1 field · direct |
| Alerts & escalations | Resolve | status: 1 field · direct |
| Leads | Add lead | create: 7 fields · ADMISSION_CALL |
| Leads | Call again with AI | status: 0 fields · ADMISSION_CALL |
| Leads | Assign counsellor | edit: 2 fields · date presets · direct |
| Leads | Change stage | status: 3 fields · date presets · direct |
| Leads | Enrol as student | custom: 5 fields · STUDENT_MANAGE |
| Students | Enrol student | create: 8 fields · STUDENT_MANAGE |
| Students | Assign mentor / counsellor | edit: 2 fields · direct |
| Students | AI call to parent | status: 0 fields · PARENT_UPDATE |
| Students | Send weekly report | status: 0 fields · PARENT_UPDATE |
| Students | WhatsApp the parent | custom: 1 field · SEND_WHATSAPP |
| Attendance | Follow-up done | status: 0 fields · direct |
| Attendance | Send absence notice | status: 0 fields · ABSENCE |
| Academic | AI counselling call | status: 0 fields · ACADEMIC_CALL |
| Academic | Assign mentor / counsellor | edit: 2 fields · direct |
| Test scores | Add score | create: 7 fields · panel · direct |
| Test scores | Correct marks | edit: 2 fields · direct |
| Fees | Record payment | status: 4 fields · direct |
| Fees | Send payment link | status: 0 fields · FEE_REMINDER |
| Fees | AI reminder call | status: 0 fields · FEE_REMINDER |
| Courses | Add course | create: 6 fields · direct |
| Courses | Edit course | edit: 5 fields · direct |
| Batches | Add batch | create: 2 fields · direct |
| Batches | Edit batch | edit: 1 field · direct |
| Team | Add team member | create: 6 fields · direct |
| Team | Edit team member | edit: 3 fields · direct |

## D7 · Flows and AI
- **ADMISSION_CALL** — `webhook.catch_webhook`; actions new_lead, call; AI in new_lead, call
- **STUDENT_MANAGE** — `webhook.catch_webhook`; actions enrol; no model call
- **ATTENDANCE** — `webhook.catch_webhook`; actions save_batch; no model call
- **ABSENCE** — `webhook.catch_webhook`; actions absent; no model call
- **ACADEMIC_CALL** — `webhook.catch_webhook`; actions counsel; AI in counsel
- **FEE_REMINDER** — `webhook.catch_webhook`; actions remind, send_link; AI in remind
- **PARENT_UPDATE** — `webhook.catch_webhook`; actions weekly_report, update_call; AI in update_call
- **SEND_WHATSAPP** — `webhook.catch_webhook`; actions send_update; no model call
- **FEE_RUN** — `schedule.cron_expression`; actions run; no model call
- **ACADEMIC_RUN** — `schedule.cron_expression`; actions run; no model call
- **PARENT_RUN** — `schedule.cron_expression`; actions run; no model call
- **ROLLUP** — `schedule.cron_expression`; actions run; no model call
- Rules in code: HOT needs grade HOT and score ≥ 80, else WARM; HOT sets Next_Followup_At = now + 48 h (ADMISSION_CALL code); HOT lead with no counsellor → the counsellor (team, Role Counsellor) with the fewest open HOT leads for that course; Absence: every absentee's parent gets the formal WhatsApp notice (ABSENCE.absent), never a call; Absences_This_Week counted in code — from the 2nd in 7 days Needs_Followup Yes and the counsellor is alerted; Present marks are direct inserts (no flow, no credits); one mark per student per date (unique Date + Student_ID); Attendance_Pct over the last 30 days, Last_Score, Avg_Score, Class_Rank, Performance_Trend (last 3 tests), Strong/Weak subjects — nightly ROLLUP; Student Status: Critical when Attendance_Pct < 60 or Avg_Score < 40; At Risk when < 75 or < 60; else Active (ROLLUP); Fee Balance_INR = Amount_INR − Paid_INR (computed on every write); Days_Overdue and Status Due → Overdue from the day after Due_Date (FEE_RUN); Fee reminder calls on day 1, 7 and 15 overdue; WhatsApp link 3 days before Due_Date (FEE_RUN); At-risk queue: Attendance_Pct < 75 or Last_Score < 60, worst first, at most 50 a week (ACADEMIC_RUN); Friday: report to every active parent, call only At Risk / Critical; Monday: one retry for last Friday's No Answer (PARENT_RUN); Alerts raised once while one is open for the same record and kind (ROLLUP and the agents); Every number in a WhatsApp template comes from the record, never from a model

## D8 · Overview order
- Needs action (alerts_open · hot_overdue · overdue_15) → KPI strip → charts: funnel, trend

## D9 · Shell & look
- Brand `#4F46E5` → primary **brand** (red is overdue / lost / destructive only); mark: monogram
- Shell: admin → sidebar
- Look: tone pucho · face geist (login stays IBM Plex) · edges pucho · canvas paper · radius pucho · density comfortable · labels mono · sidebar light
- Direction: A coaching office on laptops and phones: one indigo accent, status colour only where a fee, an absence or a parent needs attention

## D11 · Not in v1
- A parent or student login portal — parents are reached by call and WhatsApp only (X1)
- An online test engine — scores are entered on the Test scores page (X2)
- Timetable, faculty attendance and payroll (X3)
- Handling inbound WhatsApp replies with AI (X4)
- Multi-branch institutes in one deployment (X5)
- The n8n AI Agents Status page — replaced by Settings → Flow webhook URLs and /api/health (X6)

## Footprint (lean frontend, v4.3)
- footprint: 14 pages in the nav (0 hidden) · 37 KPIs · 2 charts · 30 modals · 3 drawer tabs · for 41 requirements
- Budget: overview ≤ 4 KPIs · ≤ 2 charts · ≤ 3 queues; a page ≤ 4 KPIs · ≤ 6 modals · drawer ≤ 3 tabs; nav pages ≤ requirements. Pages marked `badge: Preview` stay off the nav until `os.show_preview: true`.
- Within budget.

## Definition of done
Tick against this page before step 3, and against the screenshots before step 4 (`method/os-decisions.md`).
