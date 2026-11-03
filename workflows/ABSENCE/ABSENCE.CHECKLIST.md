# Studio checklist — Pucho EduFlow - ABSENCE

File: `ABSENCE.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. Read team (`step_absent_team`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `GET`
  - **url**: `{{step_constants['app_url']}}/api/data/team`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `*`
  - **authType**: `NONE`

## 3. WhatsApp the formal absence notice to the parent (`step_absent_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_absent_build['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['absence_alert']}}`
  - **template_variables**: `{"1": "{{step_absent_build['variables']['1']}}", "2": "{{step_absent_build['variables']['2']}}", "3": "{{step_absent_build['variables']['3']}}", "4": "{{step_absent_build['variables']['4']}}"}`

## 4. Update attendance: Call_Status (the WhatsApp Notice) (`step_absent_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/attendance`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Att_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Call_Status": "{{step_absent_after['patch']['Call_Status']}}"}}`

## 5. Log the notice in messages (`step_absent_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/messages`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{{step_absent_after['messages']}}`

## 6. Raise the follow-up alert (none on a first absence) (`step_absent_alert`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/alerts`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{{step_absent_build['alerts']}}`

## 7. WhatsApp the staff alert (Attendance) (`step_absent_staff_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_absent_staff['item']['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['staff_alert']}}`
  - **template_variables**: `{"1": "{{step_absent_staff['item']['variables']['1']}}", "2": "{{step_absent_staff['item']['variables']['2']}}"}`

## 8. Log the staff alert in messages (`step_absent_staff_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/messages`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Sent_At": "{{step_absent_staff['item']['message']['Sent_At']}}", "To_Name": "{{step_absent_staff['item']['message']['To_Name']}}", "To_Phone": "{{step_absent_staff['item']['message']['To_Phone']}}", "Type": "{{step_absent_staff['item']['message']['Type']}}", "Agent": "{{step_absent_staff['item']['message']['Agent']}}", "Template": "{{step_absent_staff['item']['message']['Template']}}", "Preview": "{{step_absent_staff['item']['message']['Preview']}}", "Status": "{{step_absent_staff['item']['message']['Status']}}", "Student_ID": "{{step_absent_staff['item']['message']['Student_ID']}}", "Lead_ID": "{{step_absent_staff['item']['message']['Lead_ID']}}"}}`

## 9. Constants (`step_constants`, code)
- [ ] Open the step's code and replace each placeholder with the real value, then save:
  - `SET_IN_STUDIO_TEMPLATE_ID_ABSENCE_ALERT` → the approved template's id: open the **Send Template Message** step, pick the template in the **Template** dropdown (the name is in `whatsapp_template_names`), copy the value and paste it here. The template must be approved on whatsapp.pucho.ai first; its {{1}}, {{2}}… must match the variables the step fills
  - `SET_IN_STUDIO_TEMPLATE_ID_STAFF_ALERT` → the approved template's id: open the **Send Template Message** step, pick the template in the **Template** dropdown (the name is in `whatsapp_template_names`), copy the value and paste it here. The template must be approved on whatsapp.pucho.ai first; its {{1}}, {{2}}… must match the variables the step fills
  - `SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID` → the client's WhatsApp account on Pucho WhatsApp: open any pucho-whatsapp step, pick the account in its **WhatsApp Account** dropdown, copy the value (the account's id) and paste it here — every send step reads it from this constant

## 10. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Sent or Failed (code)**. Its code has **295 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 11. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**absent**
```json
{
  "action": "absent",
  "Att_ID": "<string>",
  "Date": "<string>",
  "Batch": "<string>",
  "Student_ID": "<string>",
  "Name": "<string>",
  "Course": "<string>",
  "Parent_Name": "<string>",
  "Parent_Phone": "<string>",
  "Absences_This_Week": 0,
  "Needs_Followup": "<string>"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 12. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
