# Studio checklist — Pucho EduFlow - PARENT_UPDATE

File: `PARENT_UPDATE.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. WhatsApp the weekly report (`step_weekly_report_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_weekly_report_build['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['weekly_report']}}`
  - **template_variables**: `{"1": "{{step_weekly_report_build['variables']['1']}}", "2": "{{step_weekly_report_build['variables']['2']}}", "3": "{{step_weekly_report_build['variables']['3']}}", "4": "{{step_weekly_report_build['variables']['4']}}", "5": "{{step_weekly_report_build['variables']['5']}}", "6": "{{step_weekly_report_build['variables']['6']}}"}`

## 3. Update the student: Last_Report_At (`step_weekly_report_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/students`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Student_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Last_Report_At": "{{step_weekly_report_after['patch']['Last_Report_At']}}"}}`

## 4. Log the report (Type Weekly Report) (`step_weekly_report_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/messages`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{{step_weekly_report_after['messages']}}`

## 5. Read team (`step_update_call_team`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `GET`
  - **url**: `{{step_constants['app_url']}}/api/data/team`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `*`
  - **authType**: `NONE`

## 6. AI voice call (parent agent) (`step_update_call_call`, ai-voice-call)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of ai-voice-call.voiceCall is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **aiVoiceCall**: `{{step_constants['voice_agents']['parent']}}`
  - **connectionDetails**: `{"phone_number": "{{trigger['body']['Parent_Phone']}}", "customer_name": "{{trigger['body']['Parent_Name']}}", "language": "{{step_constants['voice_language']}}", "context": "Parent {{trigger['body']['Parent_Name']}} of {{trigger['body']['Name']}} ({{trigger['body']['Course']}}): attendance {{trigger['body']['Attendance_Pct']}}%, last test {{trigger['body']['Last_Score']}}%, rank {{trigger['body']['Class_Rank']}}, weak in {{trigger['body']['Weak_Subjects']}}. Goal: {{step_constants['call_goal']}}"}`

## 7. Wait 4 min for the call to end (`step_update_call_wait`, delay)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of delay.delayFor is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **unit**: `minutes`
  - **delayFor**: `4`

## 8. Get the call details (transcript) (`step_update_call_details`, ai-voice-call)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of ai-voice-call.getCallDetails is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **requestId**: `{{step_update_call_call['apiResponse']['data']['requestId']}}`

## 9. Read the transcript (Pucho CDM) (`step_update_call_ai`, pucho-cdm)
- [ ] No connection needed — Pucho CDM runs on Pucho's own account.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **text**: `A weekly check-in call to a parent. sentiment: Happy, Neutral, Concerned or No Answer.
Call record: {{step_update_call_details['apiResponse']['data']}}`
  - **fields**: `[{"name": "sentiment", "type": "string", "description": "how the parent felt: Happy, Neutral, Concerned, or No Answer when nobody spoke (one of: Happy, Neutral, Concerned, No Answer)"}, {"name": "feedback", "type": "string", "description": "what the parent said, in one line"}, {"name": "concern", "type": "string", "description": "the parent's concern, if any"}, {"name": "needs_escalation", "type": "string", "description": "Yes when the parent is upset, threatens to withdraw or asks for the director (one of: Yes, No)"}]`

## 10. Update the student: sentiment, concern, last call (`step_update_call_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/students`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Student_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Parent_Sentiment": "{{step_update_call_build['patch']['Parent_Sentiment']}}", "Parent_Concern": "{{step_update_call_build['patch']['Parent_Concern']}}", "Last_Parent_Call_At": "{{step_update_call_build['patch']['Last_Parent_Call_At']}}"}}`

## 11. Log the call (Agent Parent) (`step_update_call_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/calls`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Called_At": "{{step_update_call_build['call']['Called_At']}}", "Agent": "{{step_update_call_build['call']['Agent']}}", "Person": "{{step_update_call_build['call']['Person']}}", "Relation": "{{step_update_call_build['call']['Relation']}}", "Phone": "{{step_update_call_build['call']['Phone']}}", "Lead_ID": "{{step_update_call_build['call']['Lead_ID']}}", "Student_ID": "{{step_update_call_build['call']['Student_ID']}}", "Course": "{{step_update_call_build['call']['Course']}}", "Status": "{{step_update_call_build['call']['Status']}}", "Duration_Sec": "{{step_update_call_build['call']['Duration_Sec']}}", "Request_ID": "{{step_update_call_build['call']['Request_ID']}}", "Outcome": "{{step_update_call_build['call']['Outcome']}}", "Summary": "{{step_update_call_build['call']['Summary']}}", "Transcript": "{{step_update_call_build['call']['Transcript']}}", "Grade": "{{step_update_call_build['call']['Grade']}}", "Score": "{{step_update_call_build['call']['Score']}}", "Sentiment": "{{step_update_call_build['call']['Sentiment']}}", "Concern": "{{step_update_call_build['call']['Concern']}}", "Issue_Type": "{{step_update_call_build['call']['Issue_Type']}}", "Reason": "{{step_update_call_build['call']['Reason']}}", "Category": "{{step_update_call_build['call']['Category']}}", "Needs_Followup": "{{step_update_call_build['call']['Needs_Followup']}}", "Retry_At": "{{step_update_call_build['call']['Retry_At']}}"}}`

## 12. Escalation: HIGH alert to the director (else none) (`step_update_call_alert`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/alerts`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{{step_update_call_build['alerts']}}`

## 13. WhatsApp the staff alert (Parent) (`step_update_call_staff_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_update_call_staff['item']['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['staff_alert']}}`
  - **template_variables**: `{"1": "{{step_update_call_staff['item']['variables']['1']}}", "2": "{{step_update_call_staff['item']['variables']['2']}}"}`

## 14. Log the staff alert in messages (`step_update_call_staff_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/messages`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Sent_At": "{{step_update_call_staff['item']['message']['Sent_At']}}", "To_Name": "{{step_update_call_staff['item']['message']['To_Name']}}", "To_Phone": "{{step_update_call_staff['item']['message']['To_Phone']}}", "Type": "{{step_update_call_staff['item']['message']['Type']}}", "Agent": "{{step_update_call_staff['item']['message']['Agent']}}", "Template": "{{step_update_call_staff['item']['message']['Template']}}", "Preview": "{{step_update_call_staff['item']['message']['Preview']}}", "Status": "{{step_update_call_staff['item']['message']['Status']}}", "Student_ID": "{{step_update_call_staff['item']['message']['Student_ID']}}", "Lead_ID": "{{step_update_call_staff['item']['message']['Lead_ID']}}"}}`

## 15. Constants (`step_constants`, code)
- [ ] Open the step's code and replace each placeholder with the real value, then save:
  - `SET_IN_STUDIO_TEMPLATE_ID_STAFF_ALERT` → the approved template's id: open the **Send Template Message** step, pick the template in the **Template** dropdown (the name is in `whatsapp_template_names`), copy the value and paste it here. The template must be approved on whatsapp.pucho.ai first; its {{1}}, {{2}}… must match the variables the step fills
  - `SET_IN_STUDIO_TEMPLATE_ID_WEEKLY_REPORT` → the approved template's id: open the **Send Template Message** step, pick the template in the **Template** dropdown (the name is in `whatsapp_template_names`), copy the value and paste it here. The template must be approved on whatsapp.pucho.ai first; its {{1}}, {{2}}… must match the variables the step fills
  - `SET_IN_STUDIO_VOICE_AGENT_PARENT` → the real value
  - `SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID` → the client's WhatsApp account on Pucho WhatsApp: open any pucho-whatsapp step, pick the account in its **WhatsApp Account** dropdown, copy the value (the account's id) and paste it here — every send step reads it from this constant

## 16. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Status, escalation and rows (code)**. Its code has **295 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 17. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**weekly_report**
```json
{
  "action": "weekly_report",
  "Student_ID": "<string>",
  "Name": "<string>",
  "Parent_Name": "<string>",
  "Parent_Phone": "<string>",
  "Attendance_Pct": 0,
  "Last_Score": 0,
  "Class_Rank": 0,
  "Performance_Trend": "<string>"
}
```

**update_call**
```json
{
  "action": "update_call",
  "Student_ID": "<string>",
  "Name": "<string>",
  "Parent_Name": "<string>",
  "Parent_Phone": "<string>",
  "Course": "<string>",
  "Attendance_Pct": 0,
  "Last_Score": 0,
  "Class_Rank": 0,
  "Performance_Trend": "<string>",
  "Strong_Subjects": "<string>",
  "Weak_Subjects": "<string>",
  "Is_Retry": "<string>"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 18. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
