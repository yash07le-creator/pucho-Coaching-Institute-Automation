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
  The first version repainted badges in the server HTML before React hydrated → a hydration-mismatch console error (owner
  report, 3 Nov 2026). Now: Present is repainted in CSS only (`noticeBadges.css`, via its `data-os-stage`), and "WhatsApp Sent"
  gets a class only on a node React already owns. A fresh tab shows no console error. Under the Pucho tone Delivered is
  the DS pill with a green dot and Failed reads red.
- ui_check NOT re-run after this change (needs a production build while the owner's dev server holds `.next`).

## Attendance: Present / Absent on every row, saved batches can be corrected (owner, 3 Nov 2026)
- Each student has two choices (a radiogroup): clicking Present marks present, clicking Absent marks absent — before, the whole
  control flipped, so clicking "Present" on a present student made them absent. One tab stop per row; Space flips, arrows move,
  P / A set it; focus follows the choice.
- A batch already saved for the date shows the same choices, pre-set to the saved marks (it showed read-only badges before).
  A change is a `direct: patch` on that student's mark; Present → Absent also posts `ABSENCE.absent` (declared by the hidden
  `absence_notice` modal on the page, as Batches declares its writes), so the parent still gets the notice. Absent → Present
  keeps a notice status that already left (WhatsApp Sent / Delivered / Failed) — a sent WhatsApp cannot be recalled, and the
  confirmation says so. Corrections are saved one student at a time (a refusal names the student); a first save of a batch is
  still ONE transaction. The attendance_sessions row keeps the counts of the first save.
- Observed (dev server, office persona, Batch A today): Present click on a saved Present → no change; Absent → "changed",
  "Save & Send WhatsApp (1)", confirm, toast (SIMULATED), table Absent / WhatsApp Sent; back to Present → "Save changes",
  the cannot-be-recalled line, toast "Attendance updated — no new WhatsApp notice.", table Present / WhatsApp Sent. No console errors.

## Test scores: batch score entry grid + filtered CSV export (owner, 3 Nov 2026)
- The page is the `ScoreBook` custom section (the kernel table keeps its filters to itself, so an export of "what is filtered"
  needs one section that owns the filters): search, Batch / Course / Subject / period filters, 20 per page, Export, Add score;
  a row's pencil opens the kernel's Correct marks (`edit_score`, now with a Student panel and Status). The kernel's page Export
  is off (`export: false`); the single-student Add score form is gone.
- Add score = a batch grid: Batch, Test name, Subject (suggests known subjects), Out of (default 100), Date (default today, no
  future); every active student of the batch with #, name + course, roll no, Marks, Absent. Enter / ↓ next mark, ↑ previous
  (absent rows skipped). Live "Total | Scored | Absent | Batch Avg". Marks outside 0–Out of and blanks are refused before
  anything is sent (named in the toast; focus goes to the first). A student who already has this test + subject is shown
  "Saved: x/y" and not sent (unique Test_Name + Student_ID + Subject; matched without case).
- One `SCORES.save_batch`: a `test_runs` row (new entity: the head) and every student's `tests` row (its lines) in ONE
  transaction. `tests` gained `Status` (Scored / Absent) and `Run_ID` — additive; an Absent row has no Marks, so Score_Pct stays
  empty and stays out of every average (ROLLUP rule updated). The demo's four Weekly Test 14 entries became runs TR-2026-0001…4.
- SCORES is a pure write (no AI, no message): it needs no Studio workflow — left unwired, the app writes it itself.
- Marks ≤ Out of is checked by the grid only: the v4.9 validation grammar has no cross-field rule (server: Marks ≥ 0).
- Export: the filtered rows → `Test_Scores_<Batch>_<Subject>_<date>.csv` (All-Batches / All-Subjects when unfiltered), UTF-8 with
  BOM for Excel; columns Student ID, Student Name, Course, Batch, Test Name, Subject, Test Date, Marks Obtained, Max Marks,
  Score Percentage (%), Status.
- Observed (dev server, office persona): 29 scores, filter Batch A + Physics → 9; export name, header, 9 rows, BOM bytes EF BB BF;
  grid for Weekly Test 15 / Physics / out of 50 with real keystrokes (Enter skipped the absent row, ↑ back, 60 flagged), the
  refusal toast, save → toast "Successfully recorded scores for 10 students!", 10 rows (49.5/50 → 99 %, Dev Absent "—"), DB:
  TR-2026-0005 10/9/1 avg 78 and 10 tests rows on that run; re-opening the same test → "10 already saved", Save disabled;
  Correct marks opens. The browser's actual file save was not exercised (the click was intercepted to read the file).

## Hybrid parent updates — Friday 5 PM (owner, 3 Nov 2026)
- `PARENT_RUN` (cron `0 17 * * 1,5`, Asia/Kolkata — Friday and Monday 17:00 in one schedule, the code branches on the weekday):
  Friday step 1 — every student with Status ≠ Inactive → `PARENT_UPDATE.weekly_report` (WhatsApp template
  `eduflow_weekly_report`, numbers from the record, no AI; a messages row, Type Weekly Report). Friday step 2 — only Status
  At Risk / Critical OR Attendance_Pct < 75 OR Last_Score < 60 (code) → `PARENT_UPDATE.update_call`. Monday — Friday's Parent
  calls with Status No Answer and no Retry_At → Retry_At now, one `update_call` with Is_Retry Yes; a second No Answer is closed
  ("No answer twice — closed"), never retried.
- `update_call`: voice context Parent_Name, Name, Course, Attendance_Pct, Last_Score, Class_Rank, Weak_Subjects + constants.call_goal;
  voiceCall → delay → getCallDetails → ONE CDM extract (sentiment, feedback, concern, needs_escalation). Code: call Status
  No Answer / Escalated / Completed; Needs_Followup Yes when Concerned or needs_escalation. Writes students Parent_Sentiment /
  Parent_Concern / Last_Parent_Call_At and one calls row; escalation → alerts (Kind Parent, HIGH, "Parent Concern - {Name} -
  {Course}", "{Parent_Name}: {concern}", Owner = the team member with Role Director) + staff WhatsApp to that director.
- No schema change — every column already existed. Simulated effect now inserts the calls row (labelled SIMULATED) and patches
  the student (Neutral), so the demo shows a call land.
- Parents page: Concerns tab = `Agent=Parent and Needs_Followup=Yes` (the filter grammar has no "or"; the flow sets
  Needs_Followup for both triggers); a Feedback column (Summary). Escalated and Concerned badges read red
  (`custom/badgeTones.*`, renamed from noticeBadges — same hydration-safe approach).
- Observed (dev server, Director): Parent calls tab with Feedback; Concerns tab → only Mrs. M. Patel (Escalated, Concerned, red);
  "AI call to parent" on Mohit Yadav → calls CL-2026-2235 (Parent, Completed, Neutral, "SIMULATED — no call was placed") and
  students.Parent_Sentiment Neutral, Last_Parent_Call_At now. Fresh tab: no console errors.
- NOT built yet: the Studio workflow JSON (cron, voiceCall, CDM, alerts) — step 6. The estimate still assumes 160 parent calls a
  month; the wider at-risk rule (attendance < 75 or score < 60) may call more — re-count at step 6.
