# Studio checklist — Pucho EduFlow - FEE_REMINDER

File: `FEE_REMINDER.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. AI voice call (fee agent) (`step_remind_call`, ai-voice-call)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of ai-voice-call.voiceCall is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **aiVoiceCall**: `{{step_constants['voice_agents']['fee']}}`
  - **connectionDetails**: `{"phone_number": "{{trigger['body']['Parent_Phone']}}", "customer_name": "{{trigger['body']['Parent_Name']}}", "language": "{{step_constants['voice_language']}}", "context": "Parent {{trigger['body']['Parent_Name']}}: the {{trigger['body']['Course']}} fee of ₹{{trigger['body']['Balance_INR']}} for {{trigger['body']['Student_Name']}} was due on {{trigger['body']['Due_Date']}} ({{trigger['body']['Days_Overdue']}} days ago). Goal: a polite reminder and a date they will pay by."}`

## 3. Wait 3 min for the call to end (`step_remind_wait`, delay)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of delay.delayFor is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **unit**: `minutes`
  - **delayFor**: `3`

## 4. Get the call details (transcript) (`step_remind_details`, ai-voice-call)
- [ ] No connection to pick (the registry lists none for this tool).
- [ ] Run this step once in Studio's test panel and confirm the output field names before go-live — the output of ai-voice-call.getCallDetails is UNVERIFIED (no live run on record); the flow stores it whole where the OS says `save_raw`.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **requestId**: `{{step_remind_call['apiResponse']['data']['requestId']}}`

## 5. Read the transcript (Pucho CDM) (`step_remind_ai`, pucho-cdm)
- [ ] No connection needed — Pucho CDM runs on Pucho's own account.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **text**: `A fee reminder call to a parent. promise_date as YYYY-MM-DD if they gave one.
Call record: {{step_remind_details['apiResponse']['data']}}`
  - **fields**: `[{"name": "parent_response", "type": "string", "description": "what the parent said about paying, in their words"}, {"name": "promise_date", "type": "string", "description": "the date the parent promised to pay, if they named one"}]`

## 6. WhatsApp the payment link (`step_remind_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_remind_build['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['fee_payment_link']}}`
  - **template_variables**: `{"1": "{{step_remind_build['variables']['1']}}", "2": "{{step_remind_build['variables']['2']}}", "3": "{{step_remind_build['variables']['3']}}", "4": "{{step_remind_build['variables']['4']}}", "5": "{{step_remind_build['variables']['5']}}"}`

## 7. Update the fee: count, response, promise (`step_remind_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/fees`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Fee_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Reminder_Count": "{{step_remind_build['patch']['Reminder_Count']}}", "Last_Reminder_At": "{{step_remind_build['patch']['Last_Reminder_At']}}", "Parent_Response": "{{step_remind_build['patch']['Parent_Response']}}", "Promise_Date": "{{step_remind_build['patch']['Promise_Date']}}"}}`

## 8. Log the call (Agent Fee) (`step_remind_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/calls`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Called_At": "{{step_remind_build['call']['Called_At']}}", "Agent": "{{step_remind_build['call']['Agent']}}", "Person": "{{step_remind_build['call']['Person']}}", "Relation": "{{step_remind_build['call']['Relation']}}", "Phone": "{{step_remind_build['call']['Phone']}}", "Lead_ID": "{{step_remind_build['call']['Lead_ID']}}", "Student_ID": "{{step_remind_build['call']['Student_ID']}}", "Course": "{{step_remind_build['call']['Course']}}", "Status": "{{step_remind_build['call']['Status']}}", "Duration_Sec": "{{step_remind_build['call']['Duration_Sec']}}", "Request_ID": "{{step_remind_build['call']['Request_ID']}}", "Outcome": "{{step_remind_build['call']['Outcome']}}", "Summary": "{{step_remind_build['call']['Summary']}}", "Transcript": "{{step_remind_build['call']['Transcript']}}", "Grade": "{{step_remind_build['call']['Grade']}}", "Score": "{{step_remind_build['call']['Score']}}", "Sentiment": "{{step_remind_build['call']['Sentiment']}}", "Concern": "{{step_remind_build['call']['Concern']}}", "Issue_Type": "{{step_remind_build['call']['Issue_Type']}}", "Reason": "{{step_remind_build['call']['Reason']}}", "Category": "{{step_remind_build['call']['Category']}}", "Needs_Followup": "{{step_remind_build['call']['Needs_Followup']}}", "Retry_At": "{{step_remind_build['call']['Retry_At']}}"}}`

## 9. Log the payment-link message (`step_remind_message`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/messages`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{{step_remind_build['messages']}}`

## 10. Day 15+ with no promise: alert the director (else none) (`step_remind_alert`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/alerts`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{{step_remind_build['alerts']}}`

## 11. WhatsApp the payment link (`step_send_link_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_send_link_build['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['fee_payment_link']}}`
  - **template_variables**: `{"1": "{{step_send_link_build['variables']['1']}}", "2": "{{step_send_link_build['variables']['2']}}", "3": "{{step_send_link_build['variables']['3']}}", "4": "{{step_send_link_build['variables']['4']}}", "5": "{{step_send_link_build['variables']['5']}}"}`

## 12. Update the fee: Last_Reminder_At (`step_send_link_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/fees`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Fee_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Last_Reminder_At": "{{step_send_link_after['patch']['Last_Reminder_At']}}"}}`

## 13. Log the message (`step_send_link_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/messages`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{{step_send_link_after['messages']}}`

## 14. Constants (`step_constants`, code)
- [ ] Open the step's code and replace each placeholder with the real value, then save:
  - `SET_IN_STUDIO_TEMPLATE_ID_FEE_PAYMENT_LINK` → the approved template's id: open the **Send Template Message** step, pick the template in the **Template** dropdown (the name is in `whatsapp_template_names`), copy the value and paste it here. The template must be approved on whatsapp.pucho.ai first; its {{1}}, {{2}}… must match the variables the step fills
  - `SET_IN_STUDIO_VOICE_AGENT_FEE` → the real value
  - `SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID` → the client's WhatsApp account on Pucho WhatsApp: open any pucho-whatsapp step, pick the account in its **WhatsApp Account** dropdown, copy the value (the account's id) and paste it here — every send step reads it from this constant

## 15. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Sent or Failed (code)**. Its code has **295 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 16. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**remind**
```json
{
  "action": "remind",
  "Fee_ID": "<string>",
  "Student_Name": "<string>",
  "Parent_Name": "<string>",
  "Parent_Phone": "<string>",
  "Course": "<string>",
  "Balance_INR": 0,
  "Due_Date": "<string>",
  "Days_Overdue": 0,
  "Payment_Link": "<string>",
  "Reminder_Count": 0,
  "Director": "<string>"
}
```

**send_link**
```json
{
  "action": "send_link",
  "Fee_ID": "<string>",
  "Student_Name": "<string>",
  "Parent_Name": "<string>",
  "Parent_Phone": "<string>",
  "Balance_INR": 0,
  "Due_Date": "<string>",
  "Payment_Link": "<string>"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 17. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
