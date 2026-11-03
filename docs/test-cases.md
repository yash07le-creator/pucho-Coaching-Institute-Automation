# Test cases · EduFlow
| # | area | step | expected |
|---|---|---|---|
| T1 | ADMISSION_CALL.new_lead | call with the sample payload | result keys grade, score, summary, next_action; row in leads, calls, messages, audit_log |
| T2 | ADMISSION_CALL.call | call with the sample payload | result keys grade, score, summary, next_action; row in leads, calls, messages, audit_log |
| T3 | STUDENT_MANAGE.enrol | call with the sample payload | result keys ; row in students, fees, messages, audit_log |
| T4 | ATTENDANCE.save_batch | call with the sample payload | result keys ; row in attendance_sessions, attendance, audit_log |
| T5 | ABSENCE.absent | call with the sample payload | result keys ; row in attendance, messages, alerts, audit_log |
| T6 | ACADEMIC_CALL.counsel | call with the sample payload | result keys issue_type, main_issue, needs_mentor, needs_counsellor; row in students, calls, alerts, messages, audit_log |
| T7 | FEE_REMINDER.remind | call with the sample payload | result keys parent_response, promise_date; row in fees, calls, messages, alerts, audit_log |
| T8 | FEE_REMINDER.send_link | call with the sample payload | result keys ; row in fees, calls, messages, alerts, audit_log |
| T9 | PARENT_UPDATE.weekly_report | call with the sample payload | result keys ; row in students, calls, messages, alerts, audit_log |
| T10 | PARENT_UPDATE.update_call | call with the sample payload | result keys sentiment, feedback, concern, needs_escalation; row in students, calls, messages, alerts, audit_log |
| T11 | SEND_WHATSAPP.send_update | call with the sample payload | result keys ; row in messages, audit_log |
| T12 | FEE_RUN.run | call with the sample payload | result keys ; row in fees |
| T13 | ACADEMIC_RUN.run | call with the sample payload | result keys ; row in students |
| T14 | PARENT_RUN.run | call with the sample payload | result keys ; row in students |
| T15 | ROLLUP.run | call with the sample payload | result keys ; row in students, alerts |
| U1 | login | each persona signs in | sees only its pages; sign-out works |
| U2 | every page | demo data | KPIs, charts, table, search, export, each modal succeeds with a toast |
| U3 | detail routes | open from an id link | fields, related tables, custom sections |
| U4 | role guard | sales opens /masters | redirected |
| U5 | wired | every WEBHOOK_<FLOW> set, header shows no simulated chip | a create action runs the flow and the row appears within 30 s |
| U6 | sign-in | wrong password / unknown email | the same message; a deactivated person cannot sign in and their open session ends |
