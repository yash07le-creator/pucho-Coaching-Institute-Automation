# Studio checklist — Pucho EduFlow - ATTENDANCE

File: `ATTENDANCE.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. Insert attendance_sessions: Date, Batch, Total_Count, Present_Count, Absent_Count, Absentees +2 more (Session_ID numbered by the app) (`step_save_batch_insert`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/attendance_sessions`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Session_ID": "{{step_save_batch_build['row']['Session_ID']}}", "Date": "{{step_save_batch_build['row']['Date']}}", "Batch": "{{step_save_batch_build['row']['Batch']}}", "Total_Count": "{{step_save_batch_build['row']['Total_Count']}}", "Present_Count": "{{step_save_batch_build['row']['Present_Count']}}", "Absent_Count": "{{step_save_batch_build['row']['Absent_Count']}}", "Absentees": "{{step_save_batch_build['row']['Absentees']}}", "Marked_By": "{{step_save_batch_build['row']['Marked_By']}}", "Saved_At": "{{step_save_batch_build['row']['Saved_At']}}"}}`

## 3. Insert attendance (all lines, one call) (`step_save_batch_insert_lines`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['app_url']}}/api/data/attendance`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{{step_save_batch_lines['rows']}}`

## 4. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Build attendance rows from the lines (CODE)**. Its code has **7 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 5. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**save_batch**
```json
{
  "action": "save_batch",
  "Date": "2026-10-30",
  "Batch": "Batch A — Morning",
  "Total_Count": 1,
  "Present_Count": 0,
  "Absent_Count": 1,
  "Absentees": "ST-2026-0108",
  "Marked_By": "Sunita Rao",
  "lines": []
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 6. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
