# ABSENCE
trigger: `webhook.catch_webhook` {}
constants: `{"counsellors_from": "team", "call_from_absence": 2, "voice_language": "hi"}`
writes: attendance, calls, messages, alerts, audit_log

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `ABSENCE.json`; the CHECKLIST carries a test payload per action.

### `absent`  (model: standard, ~300s, ~14 credits, 1144 runs/month)
payload: `{"Date": "string", "Batch": "string", "Student_ID": "string", "Name": "string", "Course": "string", "Parent_Name": "string", "Parent_Phone": "string", "Absences_This_Week": "number", "Absences_This_Month": "number", "Marked_By": "string"}`
result: `{"reason": "string", "category": "SICK|FAMILY|TRAVEL|PERSONAL|OTHER", "needs_followup": "Yes|No"}`
rules: Called by the attendance sheet for every Absent mark (Present is a direct insert, no credits); Code first: Absences_This_Week < call_from_absence → WhatsApp template eduflow_absence_alert only (Call_Status WhatsApp Sent) and Return — no call, no AI; Otherwise voiceCall the parent → delay ~4 min → getCallDetails → CDM extract → write Reason / Category / Needs_Followup / Call_Status; Needs_Followup Yes → WhatsApp eduflow_staff_alert to the student's counsellor and an alerts row (Kind Attendance, HIGH)

prompt:
```
You read the transcript of a call to the parent of {{payload.Name}} ({{payload.Course}}, {{payload.Batch}}), who was absent on {{payload.Date}}.
Extract the reason in the parent's words, its category (SICK, FAMILY, TRAVEL, PERSONAL, OTHER) and whether a counsellor should follow up (repeated absence, distress, dropping out, a complaint).
Reply ONLY with JSON: {"reason": "", "category": "SICK|FAMILY|TRAVEL|PERSONAL|OTHER", "needs_followup": "Yes|No"}
```

### `reason_call`  (model: standard, ~300s, ~29 credits, 60 runs/month)
payload: `{"Att_ID": "string", "Date": "string", "Batch": "string", "Student_ID": "string", "Name": "string", "Course": "string", "Parent_Name": "string", "Parent_Phone": "string"}`
result: `{"reason": "string", "category": "SICK|FAMILY|TRAVEL|PERSONAL|OTHER", "needs_followup": "Yes|No"}`
rules: A call on an absence already marked (row action) — same call → CDM → write → alert as absent

prompt:
```
You read the transcript of a call to the parent of {{payload.Name}} ({{payload.Course}}, {{payload.Batch}}), who was absent on {{payload.Date}}.
Extract the reason in the parent's words, its category (SICK, FAMILY, TRAVEL, PERSONAL, OTHER) and whether a counsellor should follow up (repeated absence, distress, dropping out, a complaint).
Reply ONLY with JSON: {"reason": "", "category": "SICK|FAMILY|TRAVEL|PERSONAL|OTHER", "needs_followup": "Yes|No"}
```
