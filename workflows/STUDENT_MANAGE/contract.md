# STUDENT_MANAGE
trigger: `webhook.catch_webhook` {}
constants: `{}`
writes: students, fees, messages, audit_log

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `STUDENT_MANAGE.json`; the CHECKLIST carries a test payload per action.

### `enrol`  (model: none, ~5s, ~7 credits, 30 runs/month)
payload: `{"Name": "string", "Phone": "string", "Student_Phone": "string", "Parent_Name": "string", "Parent_Phone": "string", "Course": "string", "Batch": "string", "Fee_Amount_INR": "number", "Fee_Due_Date": "string", "Address": "string", "Counsellor": "string"}`
result: `{}`
rules: Inserts the student (Status Active) and the first fees row (Amount_INR = Fee_Amount_INR, Due_Date = Fee_Due_Date, Status Upcoming) in code; Welcome template to the parent after the write; one messages row (Type Welcome); From a lead: the lead's Stage → Enrolled; the lead's Phone becomes Student_Phone
sends: pucho-whatsapp.send_template_message
