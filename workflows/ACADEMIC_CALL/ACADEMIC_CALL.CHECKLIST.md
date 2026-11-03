# Studio checklist — Pucho EduFlow - ACADEMIC_CALL

File: `ACADEMIC_CALL.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. Read team (`step_counsel_team`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `GET`
  - **url**: `{{step_constants['app_url']}}/api/data/team`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `*`
  - **authType**: `NONE`

## 3. AI voice call (academic agent) (`step_counsel_call`, ai-voice-call)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of ai-voice-call.voiceCall is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **aiVoiceCall**: `{{step_constants['voice_agents']['academic']}}`
  - **connectionDetails**: `{"phone_number": "{{trigger['body']['Student_Phone']}}", "customer_name": "{{trigger['body']['Name']}}", "language": "{{step_constants['voice_language']}}", "context": "Student {{trigger['body']['Name']}} ({{trigger['body']['Course']}}): attendance {{trigger['body']['Attendance_Pct']}}%, last test {{trigger['body']['Last_Score']}}%, weak in {{trigger['body']['Weak_Subjects']}}. Goal: find out gently what is holding them back and whether they want a mentor or counsellor."}`

## 4. Wait 5 min for the call to end (`step_counsel_wait`, delay)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of delay.delayFor is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **unit**: `minutes`
  - **delayFor**: `5`

## 5. Get the call details (transcript) (`step_counsel_details`, ai-voice-call)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of ai-voice-call.getCallDetails is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **requestId**: `{{step_counsel_call['apiResponse']['data']['requestId']}}`

## 6. Read the transcript (Pucho CDM) (`step_counsel_ai`, pucho-cdm)
- [ ] No connection needed — Pucho CDM runs on Pucho's own account.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **text**: `A counselling call to a student who is slipping.
Call record: {{step_counsel_details['apiResponse']['data']}}`
  - **fields**: `[{"name": "issue_type", "type": "string", "description": "the kind of problem: ACADEMIC, PERSONAL, ATTENDANCE, FINANCIAL or OTHER (one of: ACADEMIC, PERSONAL, ATTENDANCE, FINANCIAL, OTHER)"}, {"name": "main_issue", "type": "string", "description": "the student's main problem in one line"}, {"name": "needs_mentor", "type": "string", "description": "Yes when the student needs a subject mentor session (one of: Yes, No)"}, {"name": "needs_counsellor", "type": "string", "description": "Yes when the student needs a counsellor (stress, family, motivation) (one of: Yes, No)"}]`

## 7. Update the student: issue, last counselled (`step_counsel_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/students`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Student_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Issue_Type": "{{step_counsel_build['patch']['Issue_Type']}}", "Main_Issue": "{{step_counsel_build['patch']['Main_Issue']}}", "Last_Counselled_At": "{{step_counsel_build['patch']['Last_Counselled_At']}}"}}`

## 8. Log the call (Agent Academic) (`step_counsel_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/calls`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Called_At": "{{step_counsel_build['call']['Called_At']}}", "Agent": "{{step_counsel_build['call']['Agent']}}", "Person": "{{step_counsel_build['call']['Person']}}", "Relation": "{{step_counsel_build['call']['Relation']}}", "Phone": "{{step_counsel_build['call']['Phone']}}", "Lead_ID": "{{step_counsel_build['call']['Lead_ID']}}", "Student_ID": "{{step_counsel_build['call']['Student_ID']}}", "Course": "{{step_counsel_build['call']['Course']}}", "Status": "{{step_counsel_build['call']['Status']}}", "Duration_Sec": "{{step_counsel_build['call']['Duration_Sec']}}", "Request_ID": "{{step_counsel_build['call']['Request_ID']}}", "Outcome": "{{step_counsel_build['call']['Outcome']}}", "Summary": "{{step_counsel_build['call']['Summary']}}", "Transcript": "{{step_counsel_build['call']['Transcript']}}", "Grade": "{{step_counsel_build['call']['Grade']}}", "Score": "{{step_counsel_build['call']['Score']}}", "Sentiment": "{{step_counsel_build['call']['Sentiment']}}", "Concern": "{{step_counsel_build['call']['Concern']}}", "Issue_Type": "{{step_counsel_build['call']['Issue_Type']}}", "Reason": "{{step_counsel_build['call']['Reason']}}", "Category": "{{step_counsel_build['call']['Category']}}", "Needs_Followup": "{{step_counsel_build['call']['Needs_Followup']}}", "Retry_At": "{{step_counsel_build['call']['Retry_At']}}"}}`

## 9. Raise the support alert (none when not needed) (`step_counsel_alert`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/alerts`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{{step_counsel_build['alerts']}}`

## 10. WhatsApp the staff alert (Academic) (`step_counsel_staff_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_counsel_staff['item']['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['staff_alert']}}`
  - **template_variables**: `{"1": "{{step_counsel_staff['item']['variables']['1']}}", "2": "{{step_counsel_staff['item']['variables']['2']}}"}`

## 11. Log the staff alert in messages (`step_counsel_staff_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/messages`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Sent_At": "{{step_counsel_staff['item']['message']['Sent_At']}}", "To_Name": "{{step_counsel_staff['item']['message']['To_Name']}}", "To_Phone": "{{step_counsel_staff['item']['message']['To_Phone']}}", "Type": "{{step_counsel_staff['item']['message']['Type']}}", "Agent": "{{step_counsel_staff['item']['message']['Agent']}}", "Template": "{{step_counsel_staff['item']['message']['Template']}}", "Preview": "{{step_counsel_staff['item']['message']['Preview']}}", "Status": "{{step_counsel_staff['item']['message']['Status']}}", "Student_ID": "{{step_counsel_staff['item']['message']['Student_ID']}}", "Lead_ID": "{{step_counsel_staff['item']['message']['Lead_ID']}}"}}`

## 12. Constants (`step_constants`, code)
- [ ] Open the step's code and replace each placeholder with the real value, then save:
  - `SET_IN_STUDIO_TEMPLATE_ID_STAFF_ALERT` → the approved template's id: open the **Send Template Message** step, pick the template in the **Template** dropdown (the name is in `whatsapp_template_names`), copy the value and paste it here. The template must be approved on whatsapp.pucho.ai first; its {{1}}, {{2}}… must match the variables the step fills
  - `SET_IN_STUDIO_VOICE_AGENT_ACADEMIC` → the real value
  - `SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID` → the client's WhatsApp account on Pucho WhatsApp: open any pucho-whatsapp step, pick the account in its **WhatsApp Account** dropdown, copy the value (the account's id) and paste it here — every send step reads it from this constant

## 13. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Issue, alerts and rows (code)**. Its code has **295 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 14. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**counsel**
```json
{
  "action": "counsel",
  "Student_ID": "<string>",
  "Name": "<string>",
  "Student_Phone": "<string>",
  "Course": "<string>",
  "Attendance_Pct": 0,
  "Last_Score": 0,
  "Weak_Subjects": "<string>",
  "Mentor": "<string>"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 15. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
