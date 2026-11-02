# Import sheet (step 6 gate)
| flow | trigger | actions | webhook URL (paste) | test run ✔ |
|---|---|---|---|---|
| ADMISSION_CALL | webhook.catch_webhook | new_lead, call | | |
| STUDENT_MANAGE | webhook.catch_webhook | enrol | | |
| ATTENDANCE | webhook.catch_webhook | save_batch | | |
| ABSENCE | webhook.catch_webhook | absent, reason_call | | |
| ACADEMIC_CALL | webhook.catch_webhook | counsel | | |
| FEE_REMINDER | webhook.catch_webhook | remind, send_link | | |
| PARENT_UPDATE | webhook.catch_webhook | weekly_report, update_call | | |
| SEND_WHATSAPP | webhook.catch_webhook | send_update | | |
| FEE_RUN | schedule.cron_expression | run | | |
| ACADEMIC_RUN | schedule.cron_expression | run | | |
| PARENT_RUN | schedule.cron_expression | run | | |
| ROLLUP | schedule.cron_expression | run | | |

After import: confirm the model id in each askLlm node; select connections; run one action from the test panel. A flow the app calls reads `app_url`, `inbound_token` and `company_name` from each call (nothing to set); every other flow has them written in (`build_flows.py --app-url --company-name`; the inbound token only in deploy/ through `build_deploy.py --inbound-token <token>` — never in workflows/, which is committed) — after a change in Settings rebuild and re-import those.

## Where the URLs go (step 7)
Never into the bundle. One environment variable per flow, on the server (`app/.env` locally, the portal's environment fields in production):

| flow | variable |
|---|---|
| ADMISSION_CALL | `WEBHOOK_ADMISSION_CALL` |
| STUDENT_MANAGE | `WEBHOOK_STUDENT_MANAGE` |
| ATTENDANCE | `WEBHOOK_ATTENDANCE` |
| ABSENCE | `WEBHOOK_ABSENCE` |
| ACADEMIC_CALL | `WEBHOOK_ACADEMIC_CALL` |
| FEE_REMINDER | `WEBHOOK_FEE_REMINDER` |
| PARENT_UPDATE | `WEBHOOK_PARENT_UPDATE` |
| SEND_WHATSAPP | `WEBHOOK_SEND_WHATSAPP` |
| codes by email | `WEBHOOK_AUTH_OTP` |
| flows → this app | `INBOUND_TOKEN` (shared secret; unset = closed) |
