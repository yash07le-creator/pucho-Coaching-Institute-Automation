# Step 2 — Decide the OS · analysis summary (for a "yes" before scaffold)

`os.yaml` · Pucho EduFlow OS (product) · recommended call policy · 2 Nov 2026

```
Product            EduFlow, sold as "Pucho EduFlow OS" · os.mode product · demo institute (invented ⚑ G8): Replora Coaching Institute, Bhopal
Roles & homes      Director (admin) → Overview · Office admin → Attendance · Counsellor → Leads · Mentor → Academic
Personas           Dev Dabi (director) · Sunita Rao (office) · Priya Saxena, Rahul Tiwari (counsellors) · Arvind Mishra (mentor)
Journeys           Director: Overview → Needs action → Acknowledge / Assign (2)
                   Office:   Attendance → tap P/A per student → Save (3) · Fees → Overdue → Record payment (3)
                   Counsellor: Leads → HOT chip → open lead (summary + transcript) → Enrol / Call again (3)
                   Mentor:   Academic → at-risk tab → Start AI call / Assign mentor (2)
Entities           leads (title Name, owner Assigned_To, due Next_Followup_At, contact) · students (title Name, owner Mentor,
                   contact Parent_Phone) · fees (due Due_Date, Balance = Amount − Paid computed) · attendance (one mark per
                   student per date) · tests (Score_Pct computed) · calls · messages · alerts (owner) · team (WhatsApp numbers)
Metrics            students_active · at_risk · low_attendance · new_leads_7d · hot_leads · hot_overdue (HOT past 48 h) ·
                   fees_overdue (₹) · overdue_count · overdue_15 · collected_month · alerts_open · absent/present_today ·
                   followup_needed · calls_week · parents happy/neutral/concerned · messages_today · messages_failed
Sections           Overview — decides → Needs action queues, 4 KPIs, admissions funnel, calls per week by agent
                   Alerts — acts on what agents flagged → table, severity, bulk "mark read", resolve with a note
                   Leads — pushes enquiries to enrolment → table + HOT/WARM/COLD board, drawer: summary · transcript · calls
                   AI call log — reads outcomes → cards (agent, outcome, sentiment, summary), transcript in the drawer (view only)
                   Students — finds and acts on a student → table, segments by status, bulk WhatsApp / weekly report, profile page
                   Attendance — marks a batch → custom P/A sheet + today's marks with the reason the call collected
                   Academic — counsels the at-risk → at-risk tab, bulk "start AI call", assign mentor · Test scores (child page)
                   Fees — collects → Overdue / Due this week / Paid tabs, record payment, send link, reminder call
                   Parent updates — reads sentiment → parent calls + concerns tab (view only)
                   WhatsApp — reads delivery → message log (view only) · Team (Setup) — the numbers alerts go to
Actions            add_lead (→ AI call) · call again · assign · change stage · enrol (from a lead or new; welcome WhatsApp) ·
                   mark attendance (Present = direct, Absent = ABSENCE flow) · reason call · follow-up done · add / correct score ·
                   counsel · assign mentor · record payment (direct) · send link · reminder call · weekly report · call parent ·
                   WhatsApp the parent (template, pre-filled, one / batch / all via bulk) · acknowledge / resolve alert · team CRUD
Flows & AI         ADMISSION_CALL · ABSENCE · ACADEMIC_CALL · FEE_REMINDER · PARENT_UPDATE — voiceCall → wait → call details →
                   ONE Pucho CDM extract → code → WhatsApp → write (custom builder at step 6) · STUDENT_MANAGE, SEND_WHATSAPP —
                   templates, no AI · FEE_RUN (daily 10:00), ACADEMIC_RUN (Mon 11:00), PARENT_RUN (Fri 17:00 + Mon retry),
                   ROLLUP (nightly 01:30: attendance %, scores, rank, risk status, fee status, rule alerts)
Overview           Needs action (Open alerts → Acknowledge · HOT leads past 48 h → Assign · Fees overdue 15+ days → Send link)
                   → KPIs (active students, new leads this week, fees overdue ₹, avg attendance) → funnel · calls per week
Operating cost     ≈ 54,036 credits ≈ ₹16,211 / month for a 342-student institute (declared, estimate) — range ₹11,348–₹21,074;
                   step-1 figures: small buyer ≈ ₹5,430, large ≈ ₹45,752. Voice minutes UNVERIFIED until a real call.
Shell & look       one sidebar portal (4 roles, 12 pages, grouped Overview · Admissions · Students · Finance · Communication · Setup)
                   — "an office team on laptops and phones" · Pucho tone, indigo #4F46E5 as the one accent, ink primary
                   buttons, dark mode generated · sidebar action "Add lead" · live badges on Alerts, Attendance, Fees
Fidelity           F1 199/218 strings traced · F2 9/9 entities seeded from the brief · F3 closest reference energy-mission 13 % → PASS
Sign-in / audit    password (+ email code when the OTP flow exists) · demo personas · audit on (every write logged) · UI English
Data               PostgreSQL eduflow_os_dev (local) · one database per institute
Not in v1          parent/student login · test engine · timetable & payroll · AI replies to inbound WhatsApp · multi-branch ·
                   the n8n status page
```

## Decisions that need your eye (each changes the build)

1. **The five call agents are built on the skill's custom path at step 6**, not by the generic `build_flows.py`: each path needs three tool steps (start call, wait, fetch details) before its one AI read. The yaml declares what the app calls and simulates; a `tools/build_eduflow_flows.py` writes the Studio JSON with a stricter contract.
2. **Rollups are a nightly flow (ROLLUP)**, because the kernel has no cross-table rollups: attendance %, average/last score, rank, risk status and fee status are recomputed at 01:30. Until it runs, the demo shows the seeded values; a mark or score entered today changes the percentages the next morning.
3. **Absent marks go through the ABSENCE flow and Present marks are direct inserts**, so 300 present marks a day cost nothing. The first absence in a week is a WhatsApp, the second gets the call (`call_from_absence: 2`).
4. **While a flow is not wired (the demo), the app simulates it**: the lead or fee row shows a "simulated" outcome, but no `calls` or `messages` row is added — those pages show the seeded history until the flows are live.
5. **Counsellors see all leads** (not only their own), because a small institute shares leads. Say if each counsellor should see only their own.
6. **Copy is English**, using the mockup's page names. Hindi labels (`translations: hi`) can be added later without a rebuild of the logic.

## Footprint (lean-frontend budget)
12 pages in the nav for 40 requirements · ≤ 4 KPIs on every page (37 in all) · 2 charts on the overview · 27 modals (≤ 6 per page) · drawers ≤ 3 tabs. The scaffold printed no warning.

## Definition of done — ticked against this summary
- [x] Every role has a home that matches what they do most; no empty "My" page.
- [x] Every journey ≤ 4 steps; the counsellor's lead has tap-to-call / WhatsApp from `contact:` and one verb per decision.
- [x] Every entity people act on declares title, owner / due / contact where it has one.
- [x] "Due" is one reading: leads `Next_Followup_At`, fees `Due_Date`.
- [x] Every repeated number is a `metric:` (21 metrics) and the bell reads the same metrics.
- [x] Every section's shape has a written reason (the Sections block above).
- [x] Lists lead with the person (name with phone or parent under it); ids are not first; low-priority columns hide.
- [x] Every verb is one modal with the fewest fields; sends never ask for a recipient (validator D6 passed).
- [x] Overview opens with decisions, then numbers, then two one-question charts; no quick links.
- [x] Brand indigo is not a red → primary stays ink under the Pucho tone; red only for overdue / critical.
- [ ] 12px floor, faint text, button names, mobile menu — proven at step 3 by `ui_check` (not yet run).
- [x] Empty states say why and offer the next step on Leads and Students.
- [x] Every R-line covered (R1–R40) or deferred (X1–X6) — the scaffold's coverage check passed.
- [x] Operating cost in credits is in hand and marked estimate until step 6.
- [x] `fidelity_check.py --mode product` PASS.
- [x] Shell and tone have a written reason; the product mark (EduFlow monogram) in the shell, Pucho only in "Powered by".

**Gate (step 2):** this summary confirmed by the product owner (a "yes"), fidelity PASS (✓), no uncovered requirement (✓). **No scaffold before the yes.**
**Next:** step 3 — create the `eduflow_dev` role and `eduflow_os_dev` database, scaffold to `C:\pucho\eduflow-os`, migrate twice, seed, build, `ui_check`.
