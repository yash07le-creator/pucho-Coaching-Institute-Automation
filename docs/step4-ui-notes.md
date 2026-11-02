# Step 4 — UI development: plan, what changed, what was observed

Authored (not generated). `docs/04-ui-ux.md` is a generated file, so these notes live here.

## What step 4 changed
| Where | Change | Why |
|---|---|---|
| `app/src/custom/AttendanceSheet.jsx` (new) | Per-batch, per-date sheet: everyone starts Present, tap Absent, one Save. Present → `direct:insert:attendance` (no workflow, no credits). Absent → `ABSENCE.absent` with `Absences_This_Week` / `Absences_This_Month` counted from stored marks. The row shows what will happen ("WhatsApp to parent" or "absence 2 in 7 days · AI call"); a progress bar shows "Saving n of m"; the toast says what was sent and says **simulated** when no workflow is wired. Already-marked students show their badge instead of the toggle. | R14, R15; rule zero (code counts, the flow acts); UX laws (one primary action, show progress) |
| `app/src/custom/index.js` | Registers `AttendanceSheet`. | — |
| `os.yaml` | The custom block declares `flow: ABSENCE, action: absent`, so the server authorises the sheet's absence writes (`PAGE_ACTIONS.attendance`). | Without it the server refused every absence (found by a manual test, below) |
| `os.yaml` | Demo data: one hand-made institute (Replora Coaching Institute, Bhopal — invented, G8), `seed: 0` on every entity. 24 students, 18 leads, 29 fees, 31 attendance marks, 29 scores, 34 calls, 29 messages, 8 alerts, 6 team members. Every number agrees: fee status ↔ fee rows, risk status ↔ attendance/score rule, rank ↔ batch averages, calls / messages / alerts ↔ the people they are about. | The kit's generator invented staff from other demos (Rakesh Joshi, Anita Rao) and contradictory fee rows (Overdue with ₹0 balance) |
| `os.yaml` | Overview queues lose `sub:`, which repeated the subtitle ("CRITICAL · CRITICAL"). | Copy |

## Gates (fresh, after the last os.yaml change)
- `npm run build` clean · `npm run check` 7/7 · `npm run check:db` 8/8
- `ui_check` desktop 943 passed / 0 failed · mobile 888 / 0 · dark: see `evidence/ui-check-dark/report.json`
- No `custom` stub left (the attendance page no longer shows "pending (step 4)").

## Observed by hand (local server, Office admin persona, dark theme)
1. Batch C — Weekend, today, Arjun Thakur and Sneha Joshi marked Absent, others Present → toast "6 marked · 1 parent WhatsApped · 1 AI call started · Workflows are simulated — no WhatsApp or call left the app." The rows switched to their badges; the table below listed the new marks; Sneha's `This week` = 2.
2. **First attempt failed** (before the os.yaml fix): the 4 Present marks saved, both absences were refused because `ABSENCE.absent` was not an allowed page action. It also showed a sheet bug: after a failure the absentees reverted to Present, so a second Save marked Sneha present. Fixed — a failed absence now stays Absent on the sheet, and the error toast stays 12 s.
3. While a workflow is simulated the app applies the action's fixed `effect`, so a repeat absence shows `Call_Status: WhatsApp Sent` rather than `Calling`. Correct once `WEBHOOK_ABSENCE` is set; the "Workflows simulated" chip and the toast say so meanwhile.

## Not verified / open
- Reduced-motion and keyboard-only use of the sheet: the toggles are native buttons with `aria-pressed` and a group label, but not walked through with a screen reader.
- **Kernel (for the skill owner, rule 11):** the floating "Powered by pucho.ai" badge can cover the bottom-right button of a card (Overview's last "Send link", the sheet's Save at some scroll positions). `ui_check` W1 compares the PWA `short_name` with `brand.name` while `manifest.ts` uses `COMPANY_NAME`, so a buyer who sets their institute's name in Settings fails W1 (worked around locally with `COMPANY_NAME=EduFlow` in `app/.env`).
- Warnings, not failures: Enrol student has 8 fields (U6 asks for ≤ 7 — student, parent, course, batch and first fee are all needed); "Unassigned · Assign" cells are 18 px tall on a phone (U1b, kernel cell).
