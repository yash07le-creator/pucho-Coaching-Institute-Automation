# ADMISSION_CALL
trigger: `webhook.catch_webhook` {}
constants: `{"counsellors_from": "team", "voice_language": "hi"}`
writes: leads, calls, messages, audit_log

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `ADMISSION_CALL.json`; the CHECKLIST carries a test payload per action.

### `new_lead`  (model: standard, ~240s, ~44 credits, 120 runs/month)
payload: `{"Name": "string", "Phone": "string", "Email": "string", "Course": "string", "Source": "string", "Notes": "string", "Assigned_To": "string"}`
result: `{"grade": "HOT|WARM|COLD", "score": "number", "summary": "string", "next_action": "string"}`
rules: Custom path: voiceCall with the lead's name, course and notes as call context → delay ~3 min → getCallDetails → CDM extract on the transcript; Score is the model's readiness; HOT also needs score ≥ 80, else WARM (code); HOT → Next_Followup_At = now + 48 h and a WhatsApp template eduflow_hot_lead_alert to the assigned counsellor (team.Phone), else the counsellor with the fewest open HOT leads for the course; Writes the lead (Stage Called, Grade, Score, AI_Summary, Next_Action, Transcript, Call_Status), one calls row (Agent Admission) and one messages row; No answer → Call_Status No Answer, one retry after 2 hours

prompt:
```
You read the transcript of an AI admission call to a coaching-institute lead ({{payload.Name}}, interested in {{payload.Course}}; notes: {{payload.Notes}}).
Grade the lead: HOT (ready to join or book a demo now), WARM (interested, comparing or needs a follow-up), COLD (not joining this year).
Write a two-line qualification summary and the next action for the counsellor, in the language the lead used (Hinglish allowed).
Reply ONLY with JSON: {"grade": "HOT|WARM|COLD", "score": 0, "summary": "", "next_action": ""}
```

### `call`  (model: standard, ~240s, ~44 credits, 30 runs/month)
payload: `{"Lead_ID": "string", "Name": "string", "Phone": "string", "Course": "string", "Notes": "string"}`
result: `{"grade": "HOT|WARM|COLD", "score": "number", "summary": "string", "next_action": "string"}`
rules: Same pipeline as new_lead on an existing lead; patches the lead instead of inserting

prompt:
```
You read the transcript of an AI admission call to a coaching-institute lead ({{payload.Name}}, interested in {{payload.Course}}; notes: {{payload.Notes}}).
Grade the lead: HOT (ready to join or book a demo now), WARM (interested, comparing or needs a follow-up), COLD (not joining this year).
Write a two-line qualification summary and the next action for the counsellor, in the language the lead used (Hinglish allowed).
Reply ONLY with JSON: {"grade": "HOT|WARM|COLD", "score": 0, "summary": "", "next_action": ""}
```
