# ACADEMIC_CALL
trigger: `webhook.catch_webhook` {}
constants: `{"mentors_from": "team", "voice_language": "hi"}`
writes: students, calls, alerts, messages, audit_log

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `ACADEMIC_CALL.json`; the CHECKLIST carries a test payload per action.

### `counsel`  (model: standard, ~360s, ~54 credits, 147 runs/month)
payload: `{"Student_ID": "string", "Name": "string", "Student_Phone": "string", "Course": "string", "Attendance_Pct": "number", "Last_Score": "number", "Weak_Subjects": "string", "Mentor": "string"}`
result: `{"issue_type": "ACADEMIC|PERSONAL|ATTENDANCE|FINANCIAL|OTHER", "main_issue": "string", "needs_mentor": "Yes|No", "needs_counsellor": "Yes|No"}`
rules: The Monday 11:00 ACADEMIC_RUN selects students with Attendance_Pct < 75 or Last_Score < 60 (max 50) and posts each here; voiceCall the student → delay ~5 min → getCallDetails → CDM extract; needs_mentor or needs_counsellor Yes → WhatsApp eduflow_staff_alert to the mentor / counsellor and an alerts row (Kind Academic); Writes Issue_Type, Main_Issue, Last_Counselled_At on the student and one calls row (Agent Academic)

prompt:
```
You read the transcript of an AI counselling call to {{payload.Name}} ({{payload.Course}}; attendance {{payload.Attendance_Pct}}%, last test {{payload.Last_Score}}%, weak in {{payload.Weak_Subjects}}).
Extract the main issue in one line, its type, and whether the student needs a mentor session or a counsellor.
Reply ONLY with JSON: {"issue_type": "ACADEMIC|PERSONAL|ATTENDANCE|FINANCIAL|OTHER", "main_issue": "", "needs_mentor": "Yes|No", "needs_counsellor": "Yes|No"}
```
