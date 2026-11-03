# Studio checklist — Pucho EduFlow - STUDENT_MANAGE

File: `STUDENT_MANAGE.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. Insert the student (Student_ID numbered by the app) (`step_enrol_insert`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/students`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Enrolled_At": "{{step_enrol_build['row']['Enrolled_At']}}", "Name": "{{step_enrol_build['row']['Name']}}", "Student_Phone": "{{step_enrol_build['row']['Student_Phone']}}", "Parent_Name": "{{step_enrol_build['row']['Parent_Name']}}", "Parent_Phone": "{{step_enrol_build['row']['Parent_Phone']}}", "Course": "{{step_enrol_build['row']['Course']}}", "Batch": "{{step_enrol_build['row']['Batch']}}", "Address": "{{step_enrol_build['row']['Address']}}", "Status": "{{step_enrol_build['row']['Status']}}", "Attendance_Pct": "{{step_enrol_build['row']['Attendance_Pct']}}", "Last_Score": "{{step_enrol_build['row']['Last_Score']}}", "Avg_Score": "{{step_enrol_build['row']['Avg_Score']}}", "Class_Rank": "{{step_enrol_build['row']['Class_Rank']}}", "Strong_Subjects": "{{step_enrol_build['row']['Strong_Subjects']}}", "Weak_Subjects": "{{step_enrol_build['row']['Weak_Subjects']}}", "Performance_Trend": "{{step_enrol_build['row']['Performance_Trend']}}", "Fee_Status": "{{step_enrol_build['row']['Fee_Status']}}", "Fee_Amount_INR": "{{step_enrol_build['row']['Fee_Amount_INR']}}", "Fee_Due_Date": "{{step_enrol_build['row']['Fee_Due_Date']}}", "Mentor": "{{step_enrol_build['row']['Mentor']}}", "Counsellor": "{{step_enrol_build['row']['Counsellor']}}", "Issue_Type": "{{step_enrol_build['row']['Issue_Type']}}", "Main_Issue": "{{step_enrol_build['row']['Main_Issue']}}", "Last_Counselled_At": "{{step_enrol_build['row']['Last_Counselled_At']}}", "Last_Report_At": "{{step_enrol_build['row']['Last_Report_At']}}", "Last_Parent_Call_At": "{{step_enrol_build['row']['Last_Parent_Call_At']}}", "Parent_Sentiment": "{{step_enrol_build['row']['Parent_Sentiment']}}", "Parent_Concern": "{{step_enrol_build['row']['Parent_Concern']}}"}}`

## 3. WhatsApp the welcome to the parent (`step_enrol_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_enrol_next['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['welcome']}}`
  - **template_variables**: `{"1": "{{step_enrol_next['variables']['1']}}", "2": "{{step_enrol_next['variables']['2']}}", "3": "{{step_enrol_next['variables']['3']}}", "4": "{{step_enrol_next['variables']['4']}}"}`

## 4. Insert the first fee (Upcoming) (`step_enrol_fee`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/fees`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{{step_enrol_after['fees']}}`

## 5. Log the welcome (Type Welcome) (`step_enrol_log`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/messages`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{{step_enrol_after['messages']}}`

## 6. Update the lead: Stage Enrolled (`step_enrol_lead_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/leads`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{step_enrol_lead['item']['Lead_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Stage": "{{step_enrol_lead['item']['Stage']}}"}}`

## 7. Constants (`step_constants`, code)
- [ ] Open the step's code and replace each placeholder with the real value, then save:
  - `SET_IN_STUDIO_TEMPLATE_ID_WELCOME` → the approved template's id: open the **Send Template Message** step, pick the template in the **Template** dropdown (the name is in `whatsapp_template_names`), copy the value and paste it here. The template must be approved on whatsapp.pucho.ai first; its {{1}}, {{2}}… must match the variables the step fills
  - `SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID` → the client's WhatsApp account on Pucho WhatsApp: open any pucho-whatsapp step, pick the account in its **WhatsApp Account** dropdown, copy the value (the account's id) and paste it here — every send step reads it from this constant

## 8. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Sent or Failed (code)**. Its code has **295 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 9. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**enrol**
```json
{
  "action": "enrol",
  "Lead_ID": "<string>",
  "Name": "<string>",
  "Phone": "<string>",
  "Student_Phone": "<string>",
  "Parent_Name": "<string>",
  "Parent_Phone": "<string>",
  "Course": "<string>",
  "Batch": "<string>",
  "Fee_Amount_INR": 0,
  "Fee_Due_Date": "<string>",
  "Address": "<string>",
  "Counsellor": "<string>"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 10. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
