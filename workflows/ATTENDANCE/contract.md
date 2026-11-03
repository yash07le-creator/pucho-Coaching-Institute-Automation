# ATTENDANCE
trigger: `webhook.catch_webhook` {}
constants: `{}`
writes: attendance_sessions, attendance, audit_log

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `ATTENDANCE.json`; the CHECKLIST carries a test payload per action.

### `save_batch`  (model: none, ~6s, ~6 credits, 90 runs/month)
payload: `{"Date": "string", "Batch": "string", "Total_Count": "number", "Present_Count": "number", "Absent_Count": "number", "Absentees": "string", "Marked_By": "string", "lines": "array"}`
result: `{}`
rules: One call per batch per date: the session row and every student's mark (its lines) are written in ONE transaction — a refused mark rolls the whole save back; Present marks need nothing else: no workflow, no AI, no WhatsApp; Then, for each Student_ID in Absentees only, the flow posts ABSENCE.absent — the formal WhatsApp notice to the parent, never a call; Absences_This_Week, Absences_This_Month and Needs_Followup (Yes from the 2nd absence in 7 days) on each line are computed by the sheet from the stored marks (code)
