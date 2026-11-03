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

## Batches: time and day pickers (owner request, 2 Nov 2026 — "add time picker and days picker")
Kernel form fields have no time-only or multi-pick type, so the Batches page is the `BatchManager` custom section (the page's two
modals in os.yaml only declare the writes the server allows). Add / Edit opens one form: batch name, a **time-range picker**
(antd TimePicker, 12-hour, 15-minute steps; stored `Start_Time` / `End_Time` as HH:mm), **day chips** Mon–Sun with Mon–Fri ·
Mon–Sat · Weekend · Every day shortcuts (a shortcut lights when the chosen days match it), **course chips** from the Courses
list, and an Active switch. Checked in the form: a name, no other batch with the same name (any case), both times with the end
after the start, at least one day. Escape on the open time panel closes only the panel (the kernel modal would otherwise take
the same Escape and close the form — found by test, fixed by keeping Escape inside the picker while its panel is open).
Verified: "Batch D — Night", 7:00–9:00 PM typed into the picker, Mon–Fri + Sat, NEET → stored 19:00 / 21:00 /
"Mon, Tue, Wed, Thu, Fri, Sat" / NEET and offered in the enrolment form; a duplicate name, no time and no days were refused.

## Attendance: WhatsApp notice only, no AI call (owner, 3 Nov 2026)
- R15 / R16 changed in `os.yaml` and `intake/00-product-brief.md`: an absence gets a formal WhatsApp notice (`eduflow_absence_alert`)
  and never a call; the office sees whether each notice was sent, delivered or failed. `ABSENCE.reason_call` and the
  "Call the parent" row action are gone; `ABSENCE.absent` is `model: none` + `sends:` (7 credits, was a 14-credit blend).
  The run estimate fell from 54,576 to 44,828 credits a month.
- No schema break: the column stays `Call_Status`, shown as **WhatsApp Notice**; its values are Present · Queued · WhatsApp Sent ·
  Delivered · Failed (the migrate replaced the CHECK; the demo data was reset). The three attendance AI calls in the call log
  and the call-derived reasons in the seed were removed.
- Repeat absence (2nd in 7 days) is computed by the sheet → `Needs_Followup: Yes` → the counsellor is alerted (R17), no call.
- AttendanceSheet: info banner, "Mark all present" + search (Mark all absent removed), "Save Attendance" /
  "Save & Send WhatsApp (Z)", confirmation only when someone is absent ("Ready to save attendance for …?" · Cancel / Confirm & Send),
  toast "Attendance saved! Formal WhatsApp notice sent to Z absent parents." (live) / "… queued for …" + the SIMULATED line (demo).
- Observed in the browser (dev server, office persona): Batch C marked with 2 absent (one by click, one by Space), counter,
  banner, button label, confirmation text, one save, the simulated toast; badges Present green, WhatsApp Sent indigo.
- Queued stays Queued in the demo — nothing moves it to WhatsApp Sent until ABSENCE is wired (SIMULATED).
- Delivered / Failed need the WhatsApp delivery status back from Studio — UNVERIFIED (G5).
- Kernel gap, adapter `custom/noticeBadges.js`: a table badge column cannot declare a colour per value (the kanban has
  `colors:`, the table has no twin), so "WhatsApp Sent" came out grey and "Present" steel. To report to the skill owner.
- ui_check NOT re-run after this change (needs a production build while the owner's dev server holds `.next`).
