# Studio checklist — Pucho EduFlow - ABSENCE

File: `ABSENCE.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. Send WhatsApp template "eduflow_absence_alert": 1, 2, 3, 4 (`step_absent_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_absent_message['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['absent']}}`
  - **template_variables**: `{"1": "{{step_absent_message['variables']['1']}}", "2": "{{step_absent_message['variables']['2']}}", "3": "{{step_absent_message['variables']['3']}}", "4": "{{step_absent_message['variables']['4']}}"}`

## 3. Update attendance: Date, Batch, Student_ID, Name, Course, Parent_Name +4 more (`step_absent_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/attendance`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Att_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Date": "{{step_absent_build['patch']['Date']}}", "Batch": "{{step_absent_build['patch']['Batch']}}", "Student_ID": "{{step_absent_build['patch']['Student_ID']}}", "Name": "{{step_absent_build['patch']['Name']}}", "Course": "{{step_absent_build['patch']['Course']}}", "Parent_Name": "{{step_absent_build['patch']['Parent_Name']}}", "Parent_Phone": "{{step_absent_build['patch']['Parent_Phone']}}", "Absences_This_Week": "{{step_absent_build['patch']['Absences_This_Week']}}", "Call_Status": "{{step_absent_build['patch']['Call_Status']}}", "Needs_Followup": "{{step_absent_build['patch']['Needs_Followup']}}"}}`

## 4. Constants (`step_constants`, code)
- [ ] Open the step's code and replace each placeholder with the real value, then save:
  - `SET_IN_STUDIO_TEMPLATE_ID_ABSENT` → the approved template's id: open the **Send Template Message** step, pick the template in the **Template** dropdown (the name is in `whatsapp_template_names`), copy the value and paste it here. The template must be approved on whatsapp.pucho.ai first; its {{1}}, {{2}}… must match the variables the step fills
  - `SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID` → the client's WhatsApp account on Pucho WhatsApp: open any pucho-whatsapp step, pick the account in its **WhatsApp Account** dropdown, copy the value (the account's id) and paste it here — every send step reads it from this constant

## 5. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Build the patch (rules in CODE)**. Its code has **10 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 6. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**absent**
```json
{
  "action": "absent",
  "Att_ID": "AT-2026-5101",
  "Date": "2026-10-30",
  "Batch": "Batch A — Morning",
  "Student_ID": "ST-2026-0101",
  "Name": "Rahul Sharma",
  "Course": "JEE Mains",
  "Parent_Name": "Mrs. P. Mehra",
  "Parent_Phone": "+919425000000",
  "Absences_This_Week": 1,
  "Needs_Followup": "No"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 7. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
