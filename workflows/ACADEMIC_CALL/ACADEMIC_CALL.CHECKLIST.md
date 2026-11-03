# Studio checklist — Pucho EduFlow - ACADEMIC_CALL

File: `ACADEMIC_CALL.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. Extract the fields (Pucho CDM) (`step_counsel_ai`, pucho-cdm)
- [ ] No connection needed — Pucho CDM runs on Pucho's own account.
- [ ] Check each box below; paste the value if it is empty or different. A dropdown takes a `{{…}}` value only after its **ƒ** button.
  - **text**: `Name: {{trigger['body']['Name']}}
Course: {{trigger['body']['Course']}}
Weak Subjects: {{trigger['body']['Weak_Subjects']}}`
  - **fields**: `[{"name": "issue_type", "type": "string", "description": "the kind of problem: ACADEMIC, PERSONAL, ATTENDANCE, FINANCIAL or OTHER (one of: ACADEMIC, PERSONAL, ATTENDANCE, FINANCIAL, OTHER)"}, {"name": "main_issue", "type": "string", "description": "the student's main problem in one line"}, {"name": "needs_mentor", "type": "string", "description": "Yes when the student needs a subject mentor session (one of: Yes, No)"}, {"name": "needs_counsellor", "type": "string", "description": "Yes when the student needs a counsellor (stress, family, motivation) (one of: Yes, No)"}]`

## 3. Update students: Name, Student_Phone, Course, Attendance_Pct, Last_Score, Weak_Subjects +4 more (`step_counsel_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/students`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{trigger['body']['Student_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Name": "{{step_counsel_build['patch']['Name']}}", "Student_Phone": "{{step_counsel_build['patch']['Student_Phone']}}", "Course": "{{step_counsel_build['patch']['Course']}}", "Attendance_Pct": "{{step_counsel_build['patch']['Attendance_Pct']}}", "Last_Score": "{{step_counsel_build['patch']['Last_Score']}}", "Weak_Subjects": "{{step_counsel_build['patch']['Weak_Subjects']}}", "Mentor": "{{step_counsel_build['patch']['Mentor']}}", "Issue_Type": "{{step_counsel_build['patch']['Issue_Type']}}", "Main_Issue": "{{step_counsel_build['patch']['Main_Issue']}}", "Last_Counselled_At": "{{step_counsel_build['patch']['Last_Counselled_At']}}"}}`

## 4. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Read the CDM output · build the patch (CODE)**. Its code has **22 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 5. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**counsel**
```json
{
  "action": "counsel",
  "Student_ID": "ST-2026-0101",
  "Name": "Rahul Sharma",
  "Student_Phone": "+919131000000",
  "Course": "JEE Mains",
  "Attendance_Pct": 96,
  "Last_Score": 89,
  "Weak_Subjects": "Chemistry",
  "Mentor": "Arvind Mishra"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 6. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
