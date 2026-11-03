# Studio checklist — Pucho EduFlow - ADMISSION_CALL

File: `ADMISSION_CALL.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. Extract the fields (Pucho CDM) (`step_new_lead_ai`, pucho-cdm)
- [ ] No connection needed — Pucho CDM runs on Pucho's own account.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **text**: `Name: {{trigger['body']['Name']}}
Course: {{trigger['body']['Course']}}
Notes: {{trigger['body']['Notes']}}`
  - **fields**: `[{"name": "grade", "type": "string", "description": "how ready the lead is: HOT (joining or booking a demo now), WARM (interested, needs a follow-up), COLD (not joining this year) (one of: HOT, WARM, COLD)"}, {"name": "score", "type": "number", "description": "readiness from 0 to 100"}, {"name": "summary", "type": "string", "description": "two lines on what the lead said: goal, current preparation, concerns"}, {"name": "next_action", "type": "string", "description": "the one next step for the counsellor"}]`

## 3. Insert leads: Created_At, Name, Phone, Email, Course, Source +12 more (Lead_ID numbered by the app) (`step_new_lead_insert`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/leads`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Lead_ID": "{{step_new_lead_build['row']['Lead_ID']}}", "Created_At": "{{step_new_lead_build['row']['Created_At']}}", "Name": "{{step_new_lead_build['row']['Name']}}", "Phone": "{{step_new_lead_build['row']['Phone']}}", "Email": "{{step_new_lead_build['row']['Email']}}", "Course": "{{step_new_lead_build['row']['Course']}}", "Source": "{{step_new_lead_build['row']['Source']}}", "Notes": "{{step_new_lead_build['row']['Notes']}}", "Stage": "{{step_new_lead_build['row']['Stage']}}", "Grade": "{{step_new_lead_build['row']['Grade']}}", "Score": "{{step_new_lead_build['row']['Score']}}", "AI_Summary": "{{step_new_lead_build['row']['AI_Summary']}}", "Next_Action": "{{step_new_lead_build['row']['Next_Action']}}", "Call_Status": "{{step_new_lead_build['row']['Call_Status']}}", "Last_Called_At": "{{step_new_lead_build['row']['Last_Called_At']}}", "Transcript": "{{step_new_lead_build['row']['Transcript']}}", "Assigned_To": "{{step_new_lead_build['row']['Assigned_To']}}", "Next_Followup_At": "{{step_new_lead_build['row']['Next_Followup_At']}}", "Lost_Reason": "{{step_new_lead_build['row']['Lost_Reason']}}"}}`

## 4. Extract the fields (Pucho CDM) (`step_call_ai`, pucho-cdm)
- [ ] No connection needed — Pucho CDM runs on Pucho's own account.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **text**: `Name: {{trigger['body']['Name']}}
Course: {{trigger['body']['Course']}}
Notes: {{trigger['body']['Notes']}}`
  - **fields**: `[{"name": "grade", "type": "string", "description": "how ready the lead is: HOT (joining or booking a demo now), WARM (interested, needs a follow-up), COLD (not joining this year) (one of: HOT, WARM, COLD)"}, {"name": "score", "type": "number", "description": "readiness from 0 to 100"}, {"name": "summary", "type": "string", "description": "two lines on what the lead said: goal, current preparation, concerns"}, {"name": "next_action", "type": "string", "description": "the one next step for the counsellor"}]`

## 5. Update leads: Name, Phone, Course, Notes, Grade, Score +4 more (`step_call_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/leads`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Lead_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Name": "{{step_call_build['patch']['Name']}}", "Phone": "{{step_call_build['patch']['Phone']}}", "Course": "{{step_call_build['patch']['Course']}}", "Notes": "{{step_call_build['patch']['Notes']}}", "Grade": "{{step_call_build['patch']['Grade']}}", "Score": "{{step_call_build['patch']['Score']}}", "AI_Summary": "{{step_call_build['patch']['AI_Summary']}}", "Next_Action": "{{step_call_build['patch']['Next_Action']}}", "Call_Status": "{{step_call_build['patch']['Call_Status']}}", "Last_Called_At": "{{step_call_build['patch']['Last_Called_At']}}"}}`

## 6. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Read the CDM output · build the patch (CODE)**. Its code has **22 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 7. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**new_lead**
```json
{
  "action": "new_lead",
  "Name": "Rahul Sharma",
  "Phone": "+919876543210",
  "Email": "<Email>",
  "Course": "JEE Mains",
  "Source": "Instagram",
  "Notes": "<Notes>",
  "Assigned_To": "Priya Saxena"
}
```

**call**
```json
{
  "action": "call",
  "Lead_ID": "LD-2026-0141",
  "Name": "Rahul Sharma",
  "Phone": "+919876543210",
  "Course": "JEE Mains",
  "Notes": "<Notes>"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 8. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
