# PARENT_RUN
trigger: `schedule.cron_expression` {"cronExpression": "0 17 * * 1,5", "timezone": "Asia/Kolkata"}
constants: `{}`
writes: students, calls

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `PARENT_RUN.json`; the CHECKLIST carries a test payload per action.

### `run`  (model: none, ~20s, ~5 credits, 9 runs/month)
payload: `{}`
result: `{}`
rules: Friday 17:00, step 1: every student with Status != Inactive → POST PARENT_UPDATE.weekly_report (100 %, WhatsApp template only — no AI); Friday, step 2: only students with Status in [At Risk, Critical] OR Attendance_Pct < 75 OR Last_Score < 60 (code; ~15–20 % of the institute) → POST PARENT_UPDATE.update_call; Monday 17:00: calls with Agent Parent, Status No Answer, Called_At on the preceding Friday and Retry_At empty → Retry_At now on that call, then POST PARENT_UPDATE.update_call once with Is_Retry Yes; Nothing else is retried: a Monday call that is No Answer again is closed by PARENT_UPDATE
