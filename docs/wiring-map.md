# Wiring map · EduFlow
_Generated 2026-11-03._

## Screen → flow.action
- Overview `/` → direct patch (Acknowledge alert), direct patch (Assign counsellor), `FEE_REMINDER.send_link` (Send payment link)
- Alerts & escalations `/alerts` → direct patch (Mark read), direct patch (Resolve)
- Leads `/leads` → `ADMISSION_CALL.new_lead` (Add lead), `ADMISSION_CALL.call` (Call again with AI), direct patch (Assign counsellor), direct patch (Change stage), `STUDENT_MANAGE.enrol` (Enrol as student)
- AI call log `/calls` → no workflow
- Students `/students` → `STUDENT_MANAGE.enrol` (Enrol student), direct patch (Assign mentor / counsellor), `PARENT_UPDATE.update_call` (AI call to parent), `PARENT_UPDATE.weekly_report` (Send weekly report), `SEND_WHATSAPP.send_update` (WhatsApp the parent)
- Attendance `/attendance` → direct patch (Follow-up done), `ABSENCE.absent` (Send absence notice)
- Academic `/academic` → `ACADEMIC_CALL.counsel` (AI counselling call), direct patch (Assign mentor / counsellor)
- Test scores `/scores` → direct patch (Correct marks)
- Fees `/fees` → direct patch (Record payment), `FEE_REMINDER.send_link` (Send payment link), `FEE_REMINDER.remind` (AI reminder call)
- Parent updates `/parents` → no workflow
- WhatsApp `/messages` → no workflow
- Courses `/courses` → direct insert (Add course), direct patch (Edit course)
- Batches `/batches` → direct insert (Add batch), direct patch (Edit batch)
- Team `/team` → direct insert (Add team member), direct patch (Edit team member)
- Settings `/settings` → no workflow
- Users & roles `/users` → no workflow

## Flows
- **ADMISSION_CALL** — trigger `webhook.catch_webhook`; writes leads, calls, messages, audit_log
  - `new_lead` — model standard, ~240s, ~44 credits; payload Name, Phone, Email, Course, Source, Notes, Assigned_To → result grade, score, summary, next_action
  - `call` — model standard, ~240s, ~44 credits; payload Lead_ID, Name, Phone, Course, Notes → result grade, score, summary, next_action
- **STUDENT_MANAGE** — trigger `webhook.catch_webhook`; writes students, fees, messages, audit_log
  - `enrol` — model none, ~5s, ~7 credits; payload Lead_ID, Name, Phone, Student_Phone, Parent_Name, Parent_Phone, Course, Batch, Fee_Amount_INR, Fee_Due_Date, Address, Counsellor → result 
- **SCORES** — trigger `webhook.catch_webhook`; writes test_runs, tests, audit_log
  - `save_batch` — model none, ~2s, ~3 credits; payload Test_Date, Test_Name, Batch, Subject, Max_Marks, Total_Count, Scored_Count, Absent_Count, Avg_Pct, Marked_By, lines → result 
- **ATTENDANCE** — trigger `webhook.catch_webhook`; writes attendance_sessions, attendance, audit_log
  - `save_batch` — model none, ~6s, ~6 credits; payload Date, Batch, Total_Count, Present_Count, Absent_Count, Absentees, Marked_By, lines → result 
- **ABSENCE** — trigger `webhook.catch_webhook`; writes attendance, messages, alerts, audit_log
  - `absent` — model none, ~4s, ~7 credits; payload Att_ID, Date, Batch, Student_ID, Name, Course, Parent_Name, Parent_Phone, Absences_This_Week, Needs_Followup → result 
- **ACADEMIC_CALL** — trigger `webhook.catch_webhook`; writes students, calls, alerts, messages, audit_log
  - `counsel` — model standard, ~360s, ~54 credits; payload Student_ID, Name, Student_Phone, Course, Attendance_Pct, Last_Score, Weak_Subjects, Mentor → result issue_type, main_issue, needs_mentor, needs_counsellor
- **FEE_REMINDER** — trigger `webhook.catch_webhook`; writes fees, calls, messages, alerts, audit_log
  - `remind` — model standard, ~240s, ~29 credits; payload Fee_ID, Student_Name, Parent_Name, Parent_Phone, Course, Balance_INR, Due_Date, Days_Overdue, Payment_Link, Reminder_Count, Director → result parent_response, promise_date
  - `send_link` — model none, ~4s, ~7 credits; payload Fee_ID, Student_Name, Parent_Name, Parent_Phone, Balance_INR, Due_Date, Payment_Link → result 
- **PARENT_UPDATE** — trigger `webhook.catch_webhook`; writes students, calls, messages, alerts, audit_log
  - `weekly_report` — model none, ~4s, ~7 credits; payload Student_ID, Name, Parent_Name, Parent_Phone, Attendance_Pct, Last_Score, Class_Rank, Performance_Trend → result 
  - `update_call` — model standard, ~300s, ~49 credits; payload Student_ID, Name, Parent_Name, Parent_Phone, Course, Attendance_Pct, Last_Score, Class_Rank, Performance_Trend, Strong_Subjects, Weak_Subjects, Is_Retry → result sentiment, feedback, concern, needs_escalation
- **SEND_WHATSAPP** — trigger `webhook.catch_webhook`; writes messages, audit_log
  - `send_update` — model none, ~4s, ~7 credits; payload Student_ID, Name, Parent_Name, Message, To → result 
- **FEE_RUN** — trigger `schedule.cron_expression`; writes fees
  - `run` — model none, ~20s, ~5 credits; payload  → result 
- **ACADEMIC_RUN** — trigger `schedule.cron_expression`; writes students
  - `run` — model none, ~20s, ~5 credits; payload  → result 
- **PARENT_RUN** — trigger `schedule.cron_expression`; writes students, calls
  - `run` — model none, ~20s, ~5 credits; payload  → result 
- **ROLLUP** — trigger `schedule.cron_expression`; writes students, alerts
  - `run` — model none, ~25s, ~5 credits; payload  → result 

## Credit estimate
| action | model | runs/month | credits/run | credits/month |
|---|---|---|---|---|
| `ADMISSION_CALL.new_lead` | standard | 120 | 44 | 5,280 |
| `ADMISSION_CALL.call` | standard | 30 | 44 | 1,320 |
| `STUDENT_MANAGE.enrol` | none | 30 | 7 | 210 |
| `SCORES.save_batch` | none | 40 | 3 | 120 |
| `ATTENDANCE.save_batch` | none | 90 | 6 | 540 |
| `ABSENCE.absent` | none | 1144 | 7 | 8,008 |
| `ACADEMIC_CALL.counsel` | standard | 147 | 54 | 7,938 |
| `FEE_REMINDER.remind` | standard | 69 | 29 | 2,001 |
| `FEE_REMINDER.send_link` | none | 80 | 7 | 560 |
| `PARENT_UPDATE.weekly_report` | none | 1481 | 7 | 10,367 |
| `PARENT_UPDATE.update_call` | standard | 160 | 49 | 7,840 |
| `SEND_WHATSAPP.send_update` | none | 57 | 7 | 399 |
| `FEE_RUN.run` | none | 30 | 5 | 150 |
| `ACADEMIC_RUN.run` | none | 4 | 5 | 20 |
| `PARENT_RUN.run` | none | 9 | 5 | 45 |
| `ROLLUP.run` | none | 30 | 5 | 150 |
| **total** | | | | **44,948** credits ≈ ₹13,484 / month (declared; `docs/estimate.md` is the client page and is re-counted on the built flows at step 6) |

Credits are the only unit the client is quoted — no plan fit. Per-step base per `flow/credit-table.md`.
