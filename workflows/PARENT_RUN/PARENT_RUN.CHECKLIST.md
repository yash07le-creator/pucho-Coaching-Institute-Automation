# Studio checklist — Pucho EduFlow - PARENT_RUN

File: `PARENT_RUN.json`. Do the steps in order. Tick each box.

## 1. Import
- [ ] Studio → Flows → Import → pick the file above.

## 2. Trigger — PARENT_RUN — schedule 0 17 * * 1,5 (Asia/Kolkata)
- [ ] Pick the connection for **schedule**.

## 3. Read students (`step_run_students`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `GET`
  - **url**: `{{step_constants['app_url']}}/api/data/students`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `*`
  - **authType**: `NONE`

## 4. Read calls (`step_run_calls`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `GET`
  - **url**: `{{step_constants['app_url']}}/api/data/calls`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `*`
  - **authType**: `NONE`

## 5. Post to PARENT_UPDATE (`step_run_reports_post`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['webhooks']['PARENT_UPDATE']}}`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Attendance_Pct": "{{step_run_reports['item']['Attendance_Pct']}}", "Class_Rank": "{{step_run_reports['item']['Class_Rank']}}", "Course": "{{step_run_reports['item']['Course']}}", "Is_Retry": "{{step_run_reports['item']['Is_Retry']}}", "Last_Score": "{{step_run_reports['item']['Last_Score']}}", "Name": "{{step_run_reports['item']['Name']}}", "Parent_Name": "{{step_run_reports['item']['Parent_Name']}}", "Parent_Phone": "{{step_run_reports['item']['Parent_Phone']}}", "Performance_Trend": "{{step_run_reports['item']['Performance_Trend']}}", "Strong_Subjects": "{{step_run_reports['item']['Strong_Subjects']}}", "Student_ID": "{{step_run_reports['item']['Student_ID']}}", "Weak_Subjects": "{{step_run_reports['item']['Weak_Subjects']}}", "_who": "{{step_run_reports['item']['_who']}}", "action": "{{step_run_reports['item']['action']}}", "app_url": "{{step_run_reports['item']['app_url']}}", "company_name": "{{step_run_reports['item']['company_name']}}", "inbound_token": "{{step_run_reports['item']['inbound_token']}}"}}`

## 6. Post to PARENT_UPDATE (`step_run_calls_post_post`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `POST`
  - **url**: `{{step_constants['webhooks']['PARENT_UPDATE']}}`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Attendance_Pct": "{{step_run_calls_post['item']['Attendance_Pct']}}", "Class_Rank": "{{step_run_calls_post['item']['Class_Rank']}}", "Course": "{{step_run_calls_post['item']['Course']}}", "Is_Retry": "{{step_run_calls_post['item']['Is_Retry']}}", "Last_Score": "{{step_run_calls_post['item']['Last_Score']}}", "Name": "{{step_run_calls_post['item']['Name']}}", "Parent_Name": "{{step_run_calls_post['item']['Parent_Name']}}", "Parent_Phone": "{{step_run_calls_post['item']['Parent_Phone']}}", "Performance_Trend": "{{step_run_calls_post['item']['Performance_Trend']}}", "Strong_Subjects": "{{step_run_calls_post['item']['Strong_Subjects']}}", "Student_ID": "{{step_run_calls_post['item']['Student_ID']}}", "Weak_Subjects": "{{step_run_calls_post['item']['Weak_Subjects']}}", "_who": "{{step_run_calls_post['item']['_who']}}", "action": "{{step_run_calls_post['item']['action']}}", "app_url": "{{step_run_calls_post['item']['app_url']}}", "company_name": "{{step_run_calls_post['item']['company_name']}}", "inbound_token": "{{step_run_calls_post['item']['inbound_token']}}"}}`

## 7. Mark the Friday call retried (`step_run_retried_update`, http)
- [ ] No connection to pick. Check each box below; paste the value if it is empty or different.
- [ ] A box that is a dropdown takes a `{{…}}` value only after you press its **ƒ** button. Press ƒ, then paste.
  - **method**: `PATCH`
  - **url**: `{{step_constants['app_url']}}/api/data/calls`
  - **headers**: `{"Content-Type": "application/json", "Authorization": "Bearer {{step_constants['inbound_token']}}", "X-Flow": "{{step_constants['flow']}}"}`
  - **queryParams**: `eq.{{step_run_retried['item']['Call_ID']}}`
  - **authType**: `NONE`
  - **body_type**: `json`
  - **body**: `{"data": {"Retry_At": "{{step_run_retried['item']['Retry_At']}}"}}`

## 8. Constants (`step_constants`, code)
- [ ] Open the step's code and replace each placeholder with the real value, then save:
  - `SET_IN_STUDIO_APP_URL` → the app's public origin, e.g. `https://<client>-os.pucho.app` (no trailing slash)
  - `SET_IN_STUDIO_INBOUND_TOKEN` → this flow's own token: set `INBOUND_TOKEN_<FLOW>` in the app's environment and paste the same value here (one token per flow — a leak points at one flow and one flow can be cut off); the shared `INBOUND_TOKEN` also works (docs/security.md § Inbound tokens)
  - `SET_IN_STUDIO_WEBHOOK_PARENT_UPDATE` → the real value

## 9. Publish
- [ ] Press **Publish**. Edits do nothing until Studio says the flow is published.
- [ ] Self-check: open **Friday: reports + at-risk calls · Monday: one retry (code)**. Its code has **295 lines** and line 1 is `// @ts-nocheck`. If not, paste it again and publish.
## 10. Test the trigger — one payload per action
- [ ] Open the trigger step → **Test** → paste a payload below → send. Studio then shows every later step's input filled in, and `{{trigger['body'][…]}}` picks resolve in the UI.
- [ ] After the test, open each **http** step: the **JSON Body** box lists the fields it writes (named, one per column). If a box is empty, the import did not take `body.data` — tell Claude.
- [ ] Test one update with an optional field left blank (e.g. no Close_Reason): the row's column must stay as it was. If it was blanked, tell Claude (the app would then need a skip-empty rule).
- [ ] Each test must end at a **Return** step with `ok: true` and the row it wrote; a run that stops earlier is a failed path.
- [ ] A WhatsApp **text** send reaches a number only inside Meta's 24-hour window after the customer last wrote; a reminder or a win-back must be a **template** send (`sends.template`) approved on whatsapp.pucho.ai.

**run**
```json
{
  "action": "run"
}
```

From a terminal (the app sends the same): `curl -X POST <webhook URL>/sync -H 'Content-Type: application/json' -d @payload.json`


## 11. Hand back
- [ ] Copy the webhook URL from the trigger step and send it to Claude.
- Claude adds `/sync` at the end when the app waits for the flow's answer. Do not add it yourself.
