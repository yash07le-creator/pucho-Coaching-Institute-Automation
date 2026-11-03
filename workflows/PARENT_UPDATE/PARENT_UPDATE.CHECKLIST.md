# Studio checklist — Pucho EduFlow - PARENT_UPDATE

File: `PARENT_UPDATE.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. Send WhatsApp template "eduflow_weekly_report": 1, 2, 3, 4, 5, 6 (`step_weekly_report_send`, pucho-whatsapp)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **account_id**: `{{step_constants['whatsapp_account_id']}}`
  - **to**: `{{step_weekly_report_message['to_e164']}}`
  - **template_id**: `{{step_constants['whatsapp_templates']['weekly_report']}}`
  - **template_variables**: `{"1": "{{step_weekly_report_message['variables']['1']}}", "2": "{{step_weekly_report_message['variables']['2']}}", "3": "{{step_weekly_report_message['variables']['3']}}", "4": "{{step_weekly_report_message['variables']['4']}}", "5": "{{step_weekly_report_message['variables']['5']}}", "6": "{{step_weekly_report_message['variables']['6']}}"}`

## 3. Update students: Name, Parent_Name, Parent_Phone, Attendance_Pct, Last_Score, Class_Rank +2 more (`step_weekly_report_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/students`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Student_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Name": "{{step_weekly_report_build['patch']['Name']}}", "Parent_Name": "{{step_weekly_report_build['patch']['Parent_Name']}}", "Parent_Phone": "{{step_weekly_report_build['patch']['Parent_Phone']}}", "Attendance_Pct": "{{step_weekly_report_build['patch']['Attendance_Pct']}}", "Last_Score": "{{step_weekly_report_build['patch']['Last_Score']}}", "Class_Rank": "{{step_weekly_report_build['patch']['Class_Rank']}}", "Performance_Trend": "{{step_weekly_report_build['patch']['Performance_Trend']}}", "Last_Report_At": "{{step_weekly_report_build['patch']['Last_Report_At']}}"}}`

## 4. Extract the fields (Pucho CDM) (`step_update_call_ai`, pucho-cdm)
- [ ] No connection needed — Pucho CDM runs on Pucho's own account.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **text**: `Parent Name: {{trigger['body']['Parent_Name']}}
Name: {{trigger['body']['Name']}}
Course: {{trigger['body']['Course']}}
Performance Trend: {{trigger['body']['Performance_Trend']}}`
  - **fields**: `[{"name": "sentiment", "type": "string", "description": "how the parent felt: Happy, Neutral, Concerned, or No Answer when nobody spoke (one of: Happy, Neutral, Concerned, No Answer)"}, {"name": "feedback", "type": "string", "description": "what the parent said, in one line"}, {"name": "concern", "type": "string", "description": "the parent's concern, if any"}, {"name": "needs_escalation", "type": "string", "description": "Yes when the parent is upset, threatens to withdraw or asks for the director (one of: Yes, No)"}]`

## 5. Insert calls: Called_At, Agent, Person, Relation, Phone, Lead_ID +17 more (Call_ID numbered by the app) (`step_update_call_insert`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/calls`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Call_ID": "{{step_update_call_build['row']['Call_ID']}}", "Called_At": "{{step_update_call_build['row']['Called_At']}}", "Agent": "{{step_update_call_build['row']['Agent']}}", "Person": "{{step_update_call_build['row']['Person']}}", "Relation": "{{step_update_call_build['row']['Relation']}}", "Phone": "{{step_update_call_build['row']['Phone']}}", "Lead_ID": "{{step_update_call_build['row']['Lead_ID']}}", "Student_ID": "{{step_update_call_build['row']['Student_ID']}}", "Course": "{{step_update_call_build['row']['Course']}}", "Status": "{{step_update_call_build['row']['Status']}}", "Duration_Sec": "{{step_update_call_build['row']['Duration_Sec']}}", "Request_ID": "{{step_update_call_build['row']['Request_ID']}}", "Outcome": "{{step_update_call_build['row']['Outcome']}}", "Summary": "{{step_update_call_build['row']['Summary']}}", "Transcript": "{{step_update_call_build['row']['Transcript']}}", "Grade": "{{step_update_call_build['row']['Grade']}}", "Score": "{{step_update_call_build['row']['Score']}}", "Sentiment": "{{step_update_call_build['row']['Sentiment']}}", "Concern": "{{step_update_call_build['row']['Concern']}}", "Issue_Type": "{{step_update_call_build['row']['Issue_Type']}}", "Reason": "{{step_update_call_build['row']['Reason']}}", "Category": "{{step_update_call_build['row']['Category']}}", "Needs_Followup": "{{step_update_call_build['row']['Needs_Followup']}}", "Retry_At": "{{step_update_call_build['row']['Retry_At']}}"}}`

## 6. Update students (same call): Student_ID, Name, Parent_Name, Parent_Phone, Course, Attendance_Pct +7 more (`step_update_call_also_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/students`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{step_update_call_also_build['id']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Name": "{{step_update_call_also_build['patch']['Name']}}", "Parent_Name": "{{step_update_call_also_build['patch']['Parent_Name']}}", "Parent_Phone": "{{step_update_call_also_build['patch']['Parent_Phone']}}", "Course": "{{step_update_call_also_build['patch']['Course']}}", "Attendance_Pct": "{{step_update_call_also_build['patch']['Attendance_Pct']}}", "Last_Score": "{{step_update_call_also_build['patch']['Last_Score']}}", "Class_Rank": "{{step_update_call_also_build['patch']['Class_Rank']}}", "Strong_Subjects": "{{step_update_call_also_build['patch']['Strong_Subjects']}}", "Weak_Subjects": "{{step_update_call_also_build['patch']['Weak_Subjects']}}", "Performance_Trend": "{{step_update_call_also_build['patch']['Performance_Trend']}}", "Last_Parent_Call_At": "{{step_update_call_also_build['patch']['Last_Parent_Call_At']}}", "Parent_Sentiment": "{{step_update_call_also_build['patch']['Parent_Sentiment']}}"}}`

## 7. Constants (`step_constants`, code)
- [ ] Open the step's code and replace each placeholder with the real value, then save:
  - `SET_IN_STUDIO_TEMPLATE_ID_WEEKLY_REPORT` → the approved template's id: open the **Send Template Message** step, pick the template in the **Template** dropdown (the name is in `whatsapp_template_names`), copy the value and paste it here. The template must be approved on whatsapp.pucho.ai first; its {{1}}, {{2}}… must match the variables the step fills
  - `SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID` → the client's WhatsApp account on Pucho WhatsApp: open any pucho-whatsapp step, pick the account in its **WhatsApp Account** dropdown, copy the value (the account's id) and paste it here — every send step reads it from this constant

## 8. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Build the students patch (CODE — same call)**. Its code has **9 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 9. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**weekly_report**
```json
{
  "action": "weekly_report",
  "Student_ID": "ST-2026-0101",
  "Name": "Rahul Sharma",
  "Parent_Name": "Mrs. P. Mehra",
  "Parent_Phone": "+919425000000",
  "Attendance_Pct": 96,
  "Last_Score": 89,
  "Class_Rank": 1,
  "Performance_Trend": "Improving"
}
```

**update_call**
```json
{
  "action": "update_call",
  "Student_ID": "ST-2026-0101",
  "Name": "Rahul Sharma",
  "Parent_Name": "Mrs. P. Mehra",
  "Parent_Phone": "+919425000000",
  "Course": "JEE Mains",
  "Attendance_Pct": 96,
  "Last_Score": 89,
  "Class_Rank": 1,
  "Performance_Trend": "Improving",
  "Strong_Subjects": "Maths, Physics",
  "Weak_Subjects": "Chemistry",
  "Is_Retry": "<Is_Retry>"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 10. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
