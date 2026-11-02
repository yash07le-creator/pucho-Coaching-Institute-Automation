# ROLLUP
trigger: `schedule.cron_expression` {"cronExpression": "30 1 * * *", "timezone": "Asia/Kolkata"}
constants: `{}`
writes: students, alerts

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `ROLLUP.json`; the CHECKLIST carries a test payload per action.

### `run`  (model: none, ~25s, ~5 credits, 30 runs/month)
payload: `{}`
result: `{}`
rules: Per student, from attendance and tests: Attendance_Pct (last 30 days), Last_Score, Avg_Score, Class_Rank within course + batch, Performance_Trend (last 3 tests), Strong/Weak_Subjects; Status: Critical when Attendance_Pct < 60 or Avg_Score < 40; At Risk when < 75 / < 60; else Active; Fee_Status from the student's open fees rows; Raises alerts (no duplicates while one is open): attendance < 75 (HIGH), fee overdue 15+ days (CRITICAL), HOT lead past 48 h (MEDIUM)
