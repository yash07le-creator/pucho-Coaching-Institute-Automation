# ACADEMIC_RUN
trigger: `schedule.cron_expression` {"cronExpression": "0 11 * * 1", "timezone": "Asia/Kolkata"}
constants: `{}`
writes: students

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `ACADEMIC_RUN.json`; the CHECKLIST carries a test payload per action.

### `run`  (model: none, ~20s, ~5 credits, 4 runs/month)
payload: `{}`
result: `{}`
rules: Students with Attendance_Pct < 75 or Last_Score < 60 (max 50, worst first) → POST ACADEMIC_CALL.counsel
