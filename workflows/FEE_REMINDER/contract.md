# FEE_REMINDER
trigger: `webhook.catch_webhook` {}
constants: `{"voice_language": "hi"}`
writes: fees, calls, messages, alerts, audit_log

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `FEE_REMINDER.json`; the CHECKLIST carries a test payload per action.

### `remind`  (model: standard, ~240s, ~29 credits, 69 runs/month)
payload: `{"Fee_ID": "string", "Student_Name": "string", "Parent_Name": "string", "Parent_Phone": "string", "Course": "string", "Balance_INR": "number", "Due_Date": "string", "Days_Overdue": "number", "Payment_Link": "string"}`
result: `{"parent_response": "string", "promise_date": "string"}`
rules: The daily 10:00 FEE_RUN posts each fee on day 1, 7 and 15 of being overdue (recommended policy); voiceCall the parent → delay ~3 min → getCallDetails → CDM extract → WhatsApp template eduflow_fee_payment_link → write; Reminder_Count + 1, Last_Reminder_At now, Promise_Date, Parent_Response (code); Day 15 or later with no promise → alerts row (Kind Fee, CRITICAL) for the director

prompt:
```
You read the transcript of a polite fee-reminder call to {{payload.Parent_Name}}, parent of {{payload.Student_Name}} ({{payload.Course}}), about ₹{{payload.Balance_INR}} due on {{payload.Due_Date}}.
Extract what the parent said and the date they promised to pay, if any.
Reply ONLY with JSON: {"parent_response": "", "promise_date": ""}
```

### `send_link`  (model: none, ~4s, ~7 credits, 80 runs/month)
payload: `{"Fee_ID": "string", "Student_Name": "string", "Parent_Name": "string", "Parent_Phone": "string", "Balance_INR": "number", "Due_Date": "string", "Payment_Link": "string"}`
result: `{}`
rules: Also posted by FEE_RUN 3 days before Due_Date (R27) — WhatsApp only, no call; Payment_Link from the fee row (⚑ G4: Razorpay per reminder or a fixed link); Last_Reminder_At now; one messages row (Type Payment Link)
sends: pucho-whatsapp.send_template_message
