# PARENT_UPDATE
trigger: `webhook.catch_webhook` {}
constants: `{"voice_language": "hi", "director_from": "team", "call_goal": "Share the child's academic standing gently, ask whether the parent has any concern, and collect their feedback"}`
writes: students, calls, messages, alerts, audit_log

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `PARENT_UPDATE.json`; the CHECKLIST carries a test payload per action.

### `weekly_report`  (model: none, ~4s, ~7 credits, 1481 runs/month)
payload: `{"Student_ID": "string", "Name": "string", "Parent_Name": "string", "Parent_Phone": "string", "Attendance_Pct": "number", "Last_Score": "number", "Class_Rank": "number", "Performance_Trend": "string"}`
result: `{}`
rules: Every Friday 17:00 PARENT_RUN posts every student whose Status is not Inactive (100 %) — a template send with numbers from the record: no AI, no tokens; Last_Report_At now; one messages row (Type Weekly Report, Template eduflow_weekly_report)
sends: pucho-whatsapp.send_template_message

### `update_call`  (model: standard, ~300s, ~49 credits, 160 runs/month)
payload: `{"Student_ID": "string", "Name": "string", "Parent_Name": "string", "Parent_Phone": "string", "Course": "string", "Attendance_Pct": "number", "Last_Score": "number", "Class_Rank": "number", "Performance_Trend": "string", "Strong_Subjects": "string", "Weak_Subjects": "string", "Is_Retry": "string"}`
result: `{"sentiment": "Happy|Neutral|Concerned|No Answer", "feedback": "string", "concern": "string", "needs_escalation": "Yes|No"}`
rules: Called by PARENT_RUN only for at-risk students (Status At Risk / Critical, or Attendance_Pct < 75, or Last_Score < 60) on Friday 17:00, once more on Monday 17:00 for a Friday No Answer (R33); the Students row action calls any one parent; The voice agent gets Parent_Name, Name, Course, Attendance_Pct, Last_Score, Class_Rank and Weak_Subjects; goal = constants.call_goal (⚑ G1: the ai-voice-call agent script); voiceCall → delay ~4 min → getCallDetails → ONE CDM extract: sentiment, feedback, concern, needs_escalation; Code: call Status = No Answer when sentiment is No Answer, else Escalated when needs_escalation is Yes, else Completed; Needs_Followup Yes when sentiment is Concerned or needs_escalation is Yes; Write students: Parent_Sentiment = sentiment, Parent_Concern = concern, Last_Parent_Call_At now; insert one calls row: Agent Parent, Relation Parent, Person Parent_Name, Phone, Student_ID, Course, Status, Sentiment, Summary = feedback, Concern, Transcript, Needs_Followup; Escalation (sentiment Concerned or needs_escalation Yes): alerts row Kind Parent, Severity HIGH, Title 'Parent Concern - {Name} - {Course}', Detail '{Parent_Name}: {concern}', Owner = the team member with Role Director, Raised_By flow:PARENT_UPDATE; WhatsApp eduflow_staff_alert to that director; Is_Retry Yes and No Answer again → Outcome 'No answer twice — closed'; it is never retried (the Monday query reads Friday calls only)

prompt:
```
You read the transcript of a weekly update call to {{payload.Parent_Name}}, parent of {{payload.Name}} ({{payload.Course}}; attendance {{payload.Attendance_Pct}}%, last test {{payload.Last_Score}}%, rank {{payload.Class_Rank}}, trend {{payload.Performance_Trend}}).
Extract the parent's sentiment, their feedback and any concern, and whether management should be alerted.
Reply ONLY with JSON: {"sentiment": "Happy|Neutral|Concerned|No Answer", "feedback": "", "concern": "", "needs_escalation": "Yes|No"}
```
