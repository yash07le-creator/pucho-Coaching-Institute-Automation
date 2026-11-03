# ABSENCE
trigger: `webhook.catch_webhook` {}
constants: `{"counsellors_from": "team", "followup_from_absence": 2}`
writes: attendance, messages, alerts, audit_log

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `ABSENCE.json`; the CHECKLIST carries a test payload per action.

### `absent`  (model: none, ~4s, ~7 credits, 1144 runs/month)
payload: `{"Att_ID": "string", "Date": "string", "Batch": "string", "Student_ID": "string", "Name": "string", "Course": "string", "Parent_Name": "string", "Parent_Phone": "string", "Absences_This_Week": "number", "Needs_Followup": "string"}`
result: `{}`
rules: Never for a present student, and never a call — the formal WhatsApp notice eduflow_absence_alert is the only contact (owner, 3 Nov 2026); Call_Status WhatsApp Sent when the send is accepted, Failed when it is refused; Delivered from the WhatsApp delivery status (⚑ UNVERIFIED until the Studio WhatsApp status callback is confirmed, G5); One messages row (Type Absence Alert); Needs_Followup Yes (set by the sheet from the 2nd absence in 7 days) → WhatsApp eduflow_staff_alert to the student's counsellor and an alerts row (Kind Attendance, HIGH)
sends: pucho-whatsapp.send_template_message
