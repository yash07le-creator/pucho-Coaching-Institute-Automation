# Studio checklist — Pucho EduFlow - FEE_REMINDER

File: `FEE_REMINDER.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. Extract the fields (Pucho CDM) (`step_remind_ai`, pucho-cdm)
- [ ] No connection needed — Pucho CDM runs on Pucho's own account.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **text**: `Parent Name: {{trigger['body']['Parent_Name']}}
Student Name: {{trigger['body']['Student_Name']}}
Course: {{trigger['body']['Course']}}
Due Date: {{trigger['body']['Due_Date']}}`
  - **fields**: `[{"name": "parent_response", "type": "string", "description": "what the parent said about paying, in their words"}, {"name": "promise_date", "type": "string", "description": "the date the parent promised to pay, if they named one"}]`

## 3. Update fees: Student_Name, Parent_Name, Parent_Phone, Course, Balance_INR, Due_Date +5 more (`step_remind_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/fees`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Fee_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Student_Name": "{{step_remind_build['patch']['Student_Name']}}", "Parent_Name": "{{step_remind_build['patch']['Parent_Name']}}", "Parent_Phone": "{{step_remind_build['patch']['Parent_Phone']}}", "Course": "{{step_remind_build['patch']['Course']}}", "Balance_INR": "{{step_remind_build['patch']['Balance_INR']}}", "Due_Date": "{{step_remind_build['patch']['Due_Date']}}", "Days_Overdue": "{{step_remind_build['patch']['Days_Overdue']}}", "Last_Reminder_At": "{{step_remind_build['patch']['Last_Reminder_At']}}", "Payment_Link": "{{step_remind_build['patch']['Payment_Link']}}", "Promise_Date": "{{step_remind_build['patch']['Promise_Date']}}", "Parent_Response": "{{step_remind_build['patch']['Parent_Response']}}"}}`

## 4. Send WhatsApp template "eduflow_fee_payment_link": 1, 2, 3, 4, 5 (`step_send_link_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_send_link_message['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['send_link']}}`
  - **template_variables**: `{"1": "{{step_send_link_message['variables']['1']}}", "2": "{{step_send_link_message['variables']['2']}}", "3": "{{step_send_link_message['variables']['3']}}", "4": "{{step_send_link_message['variables']['4']}}", "5": "{{step_send_link_message['variables']['5']}}"}`

## 5. Update fees: Student_Name, Parent_Name, Parent_Phone, Balance_INR, Due_Date, Last_Reminder_At +1 more (`step_send_link_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/fees`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Fee_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Student_Name": "{{step_send_link_build['patch']['Student_Name']}}", "Parent_Name": "{{step_send_link_build['patch']['Parent_Name']}}", "Parent_Phone": "{{step_send_link_build['patch']['Parent_Phone']}}", "Balance_INR": "{{step_send_link_build['patch']['Balance_INR']}}", "Due_Date": "{{step_send_link_build['patch']['Due_Date']}}", "Last_Reminder_At": "{{step_send_link_build['patch']['Last_Reminder_At']}}", "Payment_Link": "{{step_send_link_build['patch']['Payment_Link']}}"}}`

## 6. Constants (`step_constants`, code)
- [ ] Open the step's code and replace each placeholder with the real value, then save:
  - `SET_IN_STUDIO_TEMPLATE_ID_SEND_LINK` → the approved template's id: open the **Send Template Message** step, pick the template in the **Template** dropdown (the name is in `whatsapp_template_names`), copy the value and paste it here. The template must be approved on whatsapp.pucho.ai first; its {{1}}, {{2}}… must match the variables the step fills
  - `SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID` → the client's WhatsApp account on Pucho WhatsApp: open any pucho-whatsapp step, pick the account in its **WhatsApp Account** dropdown, copy the value (the account's id) and paste it here — every send step reads it from this constant

## 7. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Build the patch (rules in CODE)**. Its code has **10 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 8. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**remind**
```json
{
  "action": "remind",
  "Fee_ID": "FE-2026-0301",
  "Student_Name": "Rohan Mehra",
  "Parent_Name": "Mrs. P. Mehra",
  "Parent_Phone": "+919425000000",
  "Course": "JEE Mains",
  "Balance_INR": 0,
  "Due_Date": "2026-11-01",
  "Days_Overdue": 0,
  "Payment_Link": "<Payment_Link>"
}
```

**send_link**
```json
{
  "action": "send_link",
  "Fee_ID": "FE-2026-0301",
  "Student_Name": "Rohan Mehra",
  "Parent_Name": "Mrs. P. Mehra",
  "Parent_Phone": "+919425000000",
  "Balance_INR": 0,
  "Due_Date": "2026-11-01",
  "Payment_Link": "<Payment_Link>"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 9. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
