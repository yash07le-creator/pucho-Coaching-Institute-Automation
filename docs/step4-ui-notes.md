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

## Owner changes, 2 Nov 2026 (after the first click-through)
| Request | What was built | Where |
|---|---|---|
| "add manual cours and alos add bethch oprion" | **Courses** and **Batches** lists under Setup (add / edit, admin and office). The enrolment, lead and score forms pick from them; the hard-coded JEE / NEET / CA / UPSC and Batch A / B / C lists are gone (R41). Kernel selects cannot take a typed-in value, and free text would split one course into spelling variants, so a new course or batch is added on its page first. | `os.yaml` entities `courses`, `batches`; pages `courses`, `batches` |
| "remove extra space … after cancel button" | Cause: `config/popup.js ensureRoomBelow` (kernel) pads a modal so a select near its foot can open downward and never removes the padding. `src/custom/popupSlack.js` removes it once no list is open. Verified by applying the kernel's exact padding (242 px) and seeing it return to 28 px after the next click; the geometry that triggers it naturally was not reproduced in the browser pane. | `app/src/custom/popupSlack.js` |
| "Default All Present" batch attendance | Batch + date, everyone starts Present, one switch per student (Tab to it, Space flips, P / A set it), search, Mark all present / absent (on the filtered list), live counter "Total · Present · Absent", confirm dialog ("Confirm saving: 4 Present, 2 Absent … 2 absent parents will be notified — 1 by WhatsApp, 1 by an AI call"), optimistic rows that roll back on a refusal. **One** call, `ATTENDANCE.save_batch` `{ Date, Batch, Total_Count, Present_Count, Absent_Count, Absentees, lines }`: its effect writes one `attendance_sessions` row and every mark as its lines in ONE transaction (kernel `effect.lines`). Absentees' lines are `Call_Status: Queued`; once wired, the flow posts `ABSENCE.absent` for them only — nothing for present students. | `app/src/custom/AttendanceSheet.jsx`; `os.yaml` flow `ATTENDANCE`, entity `attendance_sessions`, `attendance.Session_ID` |

Observed (local server, Office admin): Batch C — Weekend, Arjun and Sneha absent → database shows one `AS-2026-0007` row (6 total, 4 present, 2 absent, absentee ids) and six attendance rows carrying that session id, under one audit row `ATTENDANCE.save_batch`. Not exercised live: a refused save (the rollback path follows the kernel's transaction; the sheet restores the toggles on any error).

**Kernel defect found (for the skill owner):** removing a validation rule from os.yaml (the old `one_of` course / batch lists) leaves its Postgres CHECK constraint in the database — `db:migrate` drops a constraint only when its expression changes. On a live institute this would reject every new course after a change request. The demo database was recreated to clear it.

## Sidebar jumps back to the first module (owner report, 2 Nov 2026)
"when i go to last module then click on the last module it is render automentically first module". Reproduced at 1366×768 as
Director: the menu (`nav[data-os-nav]`, 786 px of items in a 555 px box) was scrolled to the bottom, Users & roles clicked → the
page opened correctly (`/users`) but the menu was drawn again from the top (scroll 231 → 0), so Overview showed and the open
module was out of sight. Cause: kernel `components/Sidebar.jsx` renders the menu again on every page change and does not keep
its scroll — reported to the skill owner. Fix: `app/src/custom/navScroll.js` remembers the menu's scroll (sessionStorage) and,
when the open page changes, brings its item into view (never while someone scrolls the menu by hand). Verified: Users & roles,
Team, and a full reload of `/batches` all keep the menu at 231 px with the open module visible.
