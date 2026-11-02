# SEND_WHATSAPP
trigger: `webhook.catch_webhook` {}
constants: `{}`
writes: messages, audit_log

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `SEND_WHATSAPP.json`; the CHECKLIST carries a test payload per action.

### `send_update`  (model: none, ~4s, ~7 credits, 57 runs/month)
payload: `{"Student_ID": "string", "Name": "string", "Parent_Name": "string", "Message": "string", "To": "string"}`
result: `{}`
rules: One parent from the row, a batch or everyone through the Students page's bulk select — the modal runs once per row; One messages row per send (Type General Update, Agent Office)
sends: pucho-whatsapp.send_template_message
