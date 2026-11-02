# PARENT_RUN
trigger: `schedule.cron_expression` {"cronExpression": "0 17 * * 1,5", "timezone": "Asia/Kolkata"}
constants: `{}`
writes: students

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `PARENT_RUN.json`; the CHECKLIST carries a test payload per action.

### `run`  (model: none, ~20s, ~5 credits, 9 runs/month)
payload: `{}`
result: `{}`
rules: Friday: every active student → POST PARENT_UPDATE.weekly_report; Status At Risk / Critical → also POST PARENT_UPDATE.update_call; Monday: last Friday's No Answer calls → POST PARENT_UPDATE.update_call once (R33)
