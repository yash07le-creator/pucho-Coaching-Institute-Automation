# PARENT_UPDATE
trigger: `webhook.catch_webhook` {}
constants: `{"voice_language": "hi"}`
writes: students, calls, messages, alerts, audit_log

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `PARENT_UPDATE.json`; the CHECKLIST carries a test payload per action.

### `weekly_report`  (model: none, ~4s, ~7 credits, 1481 runs/month)
payload: `{"Student_ID": "string", "Name": "string", "Parent_Name": "string", "Parent_Phone": "string", "Attendance_Pct": "number", "Last_Score": "number", "Class_Rank": "number", "Performance_Trend": "string"}`
result: `{}`
rules: Every Friday 17:00 PARENT_RUN posts every active student (recommended policy) — numbers from the record, never from a model; Last_Report_At now; one messages row (Type Weekly Report)
sends: pucho-whatsapp.send_template_message

### `update_call`  (model: standard, ~300s, ~49 credits, 160 runs/month)
payload: `{"Student_ID": "string", "Name": "string", "Parent_Name": "string", "Parent_Phone": "string", "Course": "string", "Attendance_Pct": "number", "Last_Score": "number", "Class_Rank": "number", "Performance_Trend": "string", "Strong_Subjects": "string", "Weak_Subjects": "string"}`
result: `{"sentiment": "Happy|Neutral|Concerned|No Answer", "feedback": "string", "concern": "string", "needs_escalation": "Yes|No"}`
rules: Friday 17:00 PARENT_RUN calls only parents of at-risk students (recommended policy); the row action calls any parent; a No Answer gets one retry on Monday 17:00 (R33); voiceCall → delay ~4 min → getCallDetails → CDM extract → write Parent_Sentiment, Parent_Concern, Last_Parent_Call_At and one calls row (Agent Parent); needs_escalation Yes → WhatsApp eduflow_staff_alert to the director and an alerts row (Kind Parent, HIGH)

prompt:
```
You read the transcript of a weekly update call to {{payload.Parent_Name}}, parent of {{payload.Name}} ({{payload.Course}}; attendance {{payload.Attendance_Pct}}%, last test {{payload.Last_Score}}%, rank {{payload.Class_Rank}}, trend {{payload.Performance_Trend}}).
Extract the parent's sentiment, their feedback and any concern, and whether management should be alerted.
Reply ONLY with JSON: {"sentiment": "Happy|Neutral|Concerned|No Answer", "feedback": "", "concern": "", "needs_escalation": "Yes|No"}
```
