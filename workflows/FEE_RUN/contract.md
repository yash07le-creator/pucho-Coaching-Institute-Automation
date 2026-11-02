# FEE_RUN
trigger: `schedule.cron_expression` {"cronExpression": "0 10 * * *", "timezone": "Asia/Kolkata"}
constants: `{}`
writes: fees

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `FEE_RUN.json`; the CHECKLIST carries a test payload per action.

### `run`  (model: none, ~20s, ~5 credits, 30 runs/month)
payload: `{}`
result: `{}`
rules: Recompute Days_Overdue and Status (Due → Overdue the day after Due_Date) for every unpaid fee; Overdue on day 1, 7 or 15 → POST FEE_REMINDER.remind; Due_Date = today + 3 → POST FEE_REMINDER.send_link
