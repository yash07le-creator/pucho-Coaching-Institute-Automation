# Studio checklist — Pucho EduFlow - ADMISSION_CALL

File: `ADMISSION_CALL.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. Read team (`step_new_lead_team`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `GET`
  - **url**: `{{step_constants['app_url']}}/api/data/team`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `*`
  - **authType**: `NONE`

## 3. Read leads (`step_new_lead_leads`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `GET`
  - **url**: `{{step_constants['app_url']}}/api/data/leads`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `*`
  - **authType**: `NONE`

## 4. AI voice call (admission agent) (`step_new_lead_call`, ai-voice-call)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of ai-voice-call.voiceCall is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **aiVoiceCall**: `{{step_constants['voice_agents']['admission']}}`
  - **connectionDetails**: `{"phone_number": "{{trigger['body']['Phone']}}", "customer_name": "{{trigger['body']['Name']}}", "language": "{{step_constants['voice_language']}}", "context": "Lead {{trigger['body']['Name']}} asked about {{trigger['body']['Course']}} at {{step_constants['company_name']}}. Notes: {{trigger['body']['Notes']}}. Goal: understand their goal, readiness and budget, and offer a demo class."}`

## 5. Wait 3 min for the call to end (`step_new_lead_wait`, delay)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of delay.delayFor is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **unit**: `minutes`
  - **delayFor**: `3`

## 6. Get the call details (transcript) (`step_new_lead_details`, ai-voice-call)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of ai-voice-call.getCallDetails is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **requestId**: `{{step_new_lead_call['apiResponse']['data']['requestId']}}`

## 7. Read the transcript (Pucho CDM) (`step_new_lead_ai`, pucho-cdm)
- [ ] No connection needed — Pucho CDM runs on Pucho's own account.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **text**: `A call to a coaching-institute lead. Grade HOT, WARM or COLD; score 0-100 for readiness.
Call record: {{step_new_lead_details['apiResponse']['data']}}`
  - **fields**: `[{"name": "grade", "type": "string", "description": "how ready the lead is: HOT (joining or booking a demo now), WARM (interested, needs a follow-up), COLD (not joining this year) (one of: HOT, WARM, COLD)"}, {"name": "score", "type": "number", "description": "readiness from 0 to 100"}, {"name": "summary", "type": "string", "description": "two lines on what the lead said: goal, current preparation, concerns"}, {"name": "next_action", "type": "string", "description": "the one next step for the counsellor"}]`

## 8. Insert the lead (Lead_ID numbered by the app) (`step_new_lead_insert`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/leads`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Created_At": "{{step_new_lead_build['row']['Created_At']}}", "Name": "{{step_new_lead_build['row']['Name']}}", "Phone": "{{step_new_lead_build['row']['Phone']}}", "Email": "{{step_new_lead_build['row']['Email']}}", "Course": "{{step_new_lead_build['row']['Course']}}", "Source": "{{step_new_lead_build['row']['Source']}}", "Notes": "{{step_new_lead_build['row']['Notes']}}", "Stage": "{{step_new_lead_build['row']['Stage']}}", "Grade": "{{step_new_lead_build['row']['Grade']}}", "Score": "{{step_new_lead_build['row']['Score']}}", "AI_Summary": "{{step_new_lead_build['row']['AI_Summary']}}", "Next_Action": "{{step_new_lead_build['row']['Next_Action']}}", "Call_Status": "{{step_new_lead_build['row']['Call_Status']}}", "Last_Called_At": "{{step_new_lead_build['row']['Last_Called_At']}}", "Transcript": "{{step_new_lead_build['row']['Transcript']}}", "Assigned_To": "{{step_new_lead_build['row']['Assigned_To']}}", "Next_Followup_At": "{{step_new_lead_build['row']['Next_Followup_At']}}", "Lost_Reason": "{{step_new_lead_build['row']['Lost_Reason']}}"}}`

## 9. Log the call (Agent Admission) (`step_new_lead_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/calls`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Called_At": "{{step_new_lead_build['call']['Called_At']}}", "Agent": "{{step_new_lead_build['call']['Agent']}}", "Person": "{{step_new_lead_build['call']['Person']}}", "Relation": "{{step_new_lead_build['call']['Relation']}}", "Phone": "{{step_new_lead_build['call']['Phone']}}", "Lead_ID": "{{step_new_lead_insert['body'][0]['Lead_ID']}}", "Student_ID": "{{step_new_lead_build['call']['Student_ID']}}", "Course": "{{step_new_lead_build['call']['Course']}}", "Status": "{{step_new_lead_build['call']['Status']}}", "Duration_Sec": "{{step_new_lead_build['call']['Duration_Sec']}}", "Request_ID": "{{step_new_lead_build['call']['Request_ID']}}", "Outcome": "{{step_new_lead_build['call']['Outcome']}}", "Summary": "{{step_new_lead_build['call']['Summary']}}", "Transcript": "{{step_new_lead_build['call']['Transcript']}}", "Grade": "{{step_new_lead_build['call']['Grade']}}", "Score": "{{step_new_lead_build['call']['Score']}}", "Sentiment": "{{step_new_lead_build['call']['Sentiment']}}", "Concern": "{{step_new_lead_build['call']['Concern']}}", "Issue_Type": "{{step_new_lead_build['call']['Issue_Type']}}", "Reason": "{{step_new_lead_build['call']['Reason']}}", "Category": "{{step_new_lead_build['call']['Category']}}", "Needs_Followup": "{{step_new_lead_build['call']['Needs_Followup']}}", "Retry_At": "{{step_new_lead_build['call']['Retry_At']}}"}}`

## 10. WhatsApp the staff alert (Admission) (`step_new_lead_staff_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_new_lead_staff['item']['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['staff_alert']}}`
  - **template_variables**: `{"1": "{{step_new_lead_staff['item']['variables']['1']}}", "2": "{{step_new_lead_staff['item']['variables']['2']}}"}`

## 11. Log the staff alert in messages (`step_new_lead_staff_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/messages`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Sent_At": "{{step_new_lead_staff['item']['message']['Sent_At']}}", "To_Name": "{{step_new_lead_staff['item']['message']['To_Name']}}", "To_Phone": "{{step_new_lead_staff['item']['message']['To_Phone']}}", "Type": "{{step_new_lead_staff['item']['message']['Type']}}", "Agent": "{{step_new_lead_staff['item']['message']['Agent']}}", "Template": "{{step_new_lead_staff['item']['message']['Template']}}", "Preview": "{{step_new_lead_staff['item']['message']['Preview']}}", "Status": "{{step_new_lead_staff['item']['message']['Status']}}", "Student_ID": "{{step_new_lead_staff['item']['message']['Student_ID']}}", "Lead_ID": "{{step_new_lead_staff['item']['message']['Lead_ID']}}"}}`

## 12. Read team (`step_call_team`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `GET`
  - **url**: `{{step_constants['app_url']}}/api/data/team`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `*`
  - **authType**: `NONE`

## 13. Read leads (`step_call_leads`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `GET`
  - **url**: `{{step_constants['app_url']}}/api/data/leads`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `*`
  - **authType**: `NONE`

## 14. AI voice call (admission agent) (`step_call_call`, ai-voice-call)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of ai-voice-call.voiceCall is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **aiVoiceCall**: `{{step_constants['voice_agents']['admission']}}`
  - **connectionDetails**: `{"phone_number": "{{trigger['body']['Phone']}}", "customer_name": "{{trigger['body']['Name']}}", "language": "{{step_constants['voice_language']}}", "context": "Lead {{trigger['body']['Name']}} asked about {{trigger['body']['Course']}} at {{step_constants['company_name']}}. Notes: {{trigger['body']['Notes']}}. Goal: understand their goal, readiness and budget, and offer a demo class."}`

## 15. Wait 3 min for the call to end (`step_call_wait`, delay)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of delay.delayFor is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **unit**: `minutes`
  - **delayFor**: `3`

## 16. Get the call details (transcript) (`step_call_details`, ai-voice-call)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of ai-voice-call.getCallDetails is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **requestId**: `{{step_call_call['apiResponse']['data']['requestId']}}`

## 17. Read the transcript (Pucho CDM) (`step_call_ai`, pucho-cdm)
- [ ] No connection needed — Pucho CDM runs on Pucho's own account.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **text**: `A call to a coaching-institute lead. Grade HOT, WARM or COLD; score 0-100 for readiness.
Call record: {{step_call_details['apiResponse']['data']}}`
  - **fields**: `[{"name": "grade", "type": "string", "description": "how ready the lead is: HOT (joining or booking a demo now), WARM (interested, needs a follow-up), COLD (not joining this year) (one of: HOT, WARM, COLD)"}, {"name": "score", "type": "number", "description": "readiness from 0 to 100"}, {"name": "summary", "type": "string", "description": "two lines on what the lead said: goal, current preparation, concerns"}, {"name": "next_action", "type": "string", "description": "the one next step for the counsellor"}]`

## 18. Update the lead: grade, score, summary, next action (`step_call_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/leads`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Lead_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Stage": "{{step_call_build['lead']['Stage']}}", "Grade": "{{step_call_build['lead']['Grade']}}", "Score": "{{step_call_build['lead']['Score']}}", "AI_Summary": "{{step_call_build['lead']['AI_Summary']}}", "Next_Action": "{{step_call_build['lead']['Next_Action']}}", "Call_Status": "{{step_call_build['lead']['Call_Status']}}", "Last_Called_At": "{{step_call_build['lead']['Last_Called_At']}}", "Transcript": "{{step_call_build['lead']['Transcript']}}", "Assigned_To": "{{step_call_build['lead']['Assigned_To']}}", "Next_Followup_At": "{{step_call_build['lead']['Next_Followup_At']}}"}}`

## 19. Log the call (Agent Admission) (`step_call_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/calls`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Called_At": "{{step_call_build['call']['Called_At']}}", "Agent": "{{step_call_build['call']['Agent']}}", "Person": "{{step_call_build['call']['Person']}}", "Relation": "{{step_call_build['call']['Relation']}}", "Phone": "{{step_call_build['call']['Phone']}}", "Lead_ID": "{{trigger['body']['Lead_ID']}}", "Student_ID": "{{step_call_build['call']['Student_ID']}}", "Course": "{{step_call_build['call']['Course']}}", "Status": "{{step_call_build['call']['Status']}}", "Duration_Sec": "{{step_call_build['call']['Duration_Sec']}}", "Request_ID": "{{step_call_build['call']['Request_ID']}}", "Outcome": "{{step_call_build['call']['Outcome']}}", "Summary": "{{step_call_build['call']['Summary']}}", "Transcript": "{{step_call_build['call']['Transcript']}}", "Grade": "{{step_call_build['call']['Grade']}}", "Score": "{{step_call_build['call']['Score']}}", "Sentiment": "{{step_call_build['call']['Sentiment']}}", "Concern": "{{step_call_build['call']['Concern']}}", "Issue_Type": "{{step_call_build['call']['Issue_Type']}}", "Reason": "{{step_call_build['call']['Reason']}}", "Category": "{{step_call_build['call']['Category']}}", "Needs_Followup": "{{step_call_build['call']['Needs_Followup']}}", "Retry_At": "{{step_call_build['call']['Retry_At']}}"}}`

## 20. WhatsApp the staff alert (Admission) (`step_call_staff_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_call_staff['item']['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['staff_alert']}}`
  - **template_variables**: `{"1": "{{step_call_staff['item']['variables']['1']}}", "2": "{{step_call_staff['item']['variables']['2']}}"}`

## 21. Log the staff alert in messages (`step_call_staff_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/messages`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Sent_At": "{{step_call_staff['item']['message']['Sent_At']}}", "To_Name": "{{step_call_staff['item']['message']['To_Name']}}", "To_Phone": "{{step_call_staff['item']['message']['To_Phone']}}", "Type": "{{step_call_staff['item']['message']['Type']}}", "Agent": "{{step_call_staff['item']['message']['Agent']}}", "Template": "{{step_call_staff['item']['message']['Template']}}", "Preview": "{{step_call_staff['item']['message']['Preview']}}", "Status": "{{step_call_staff['item']['message']['Status']}}", "Student_ID": "{{step_call_staff['item']['message']['Student_ID']}}", "Lead_ID": "{{step_call_staff['item']['message']['Lead_ID']}}"}}`

## 22. Constants (`step_constants`, code)
- [ ] Open the step's code and replace each placeholder with the real value, then save:
  - `SET_IN_STUDIO_TEMPLATE_ID_STAFF_ALERT` → the approved template's id: open the **Send Template Message** step, pick the template in the **Template** dropdown (the name is in `whatsapp_template_names`), copy the value and paste it here. The template must be approved on whatsapp.pucho.ai first; its {{1}}, {{2}}… must match the variables the step fills
  - `SET_IN_STUDIO_VOICE_AGENT_ADMISSION` → the real value
  - `SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID` → the client's WhatsApp account on Pucho WhatsApp: open any pucho-whatsapp step, pick the account in its **WhatsApp Account** dropdown, copy the value (the account's id) and paste it here — every send step reads it from this constant

## 23. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Grade, score, owner and rows (code: HOT needs score ≥ 80)**. Its code has **295 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 24. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**new_lead**
```json
{
  "action": "new_lead",
  "Name": "<string>",
  "Phone": "<string>",
  "Email": "<string>",
  "Course": "<string>",
  "Source": "<string>",
  "Notes": "<string>",
  "Assigned_To": "<string>"
}
```

**call**
```json
{
  "action": "call",
  "Lead_ID": "<string>",
  "Name": "<string>",
  "Phone": "<string>",
  "Course": "<string>",
  "Notes": "<string>"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 25. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
