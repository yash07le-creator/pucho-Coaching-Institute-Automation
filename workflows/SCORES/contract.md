# SCORES
trigger: `webhook.catch_webhook` {}
constants: `{}`
writes: test_runs, tests, audit_log

Shape: trigger → `step_constants` → [`step_router` on action →] `step_<action>_ai` → `step_<action>_build` (parse + row, CODE) → `step_<action>_insert|update` (http → the app's /api/data, named fields under body.data) → `step_<action>_done` (Return: ok, id, row).
Built by `scripts/build_flows.py` (flow/flowkit.py); the JSON lands beside this file as `SCORES.json`; the CHECKLIST carries a test payload per action.

### `save_batch`  (model: none, ~2s, ~3 credits, 40 runs/month)
payload: `{"Test_Date": "string", "Test_Name": "string", "Batch": "string", "Subject": "string", "Max_Marks": "number", "Total_Count": "number", "Scored_Count": "number", "Absent_Count": "number", "Avg_Pct": "number", "Marked_By": "string", "lines": "array"}`
result: `{}`
rules: One call per batch test: the test_runs row and every student's tests row (its lines: Marks, or Status Absent with no Marks) are written in ONE transaction — a refused row rolls the whole save back; No AI, no message: a pure write — it needs no Studio workflow; left unwired (no WEBHOOK_SCORES) the app writes it itself; Marks between 0 and Max_Marks and a mark or Absent for every student are checked by the grid (code); Score_Pct is computed by the server
