# Step 6 — the Pucho Studio workflows (3 Nov 2026)

13 importable Studio flows in `workflows/<FLOW>/<FLOW>.json`, each with its `.contract.json` and `.CHECKLIST.md`.
Flow names in Studio: `Pucho EduFlow - <FLOW>`. Company name written into the scheduled flows: **EduFlow**; app URL: **not
deployed yet** (`SET_IN_STUDIO_APP_URL` — rebuild with `--app-url https://…` or set it in Studio once the domain is known).

## How they were built
| built by | flows | why |
|---|---|---|
| the kit's `scripts/build_flows.py` (from a copy of `os.yaml` filtered to this flow) | SCORES | a pure write (head + lines); left **unwired** the app writes it itself in one transaction |
| `tools/build_eduflow_flows.py` (the custom path, `method/ai-pipeline.md`) | the other 12 | call agents (voiceCall → wait → getCallDetails → ONE Pucho CDM read), rules that write more than the action's `effect` (messages / alerts / fees / lead rows), a fan-out per absentee, and four schedules that read the app's rows — `build_flows.py` treats every schedule as a Tally sync |

Every rule is code in `tools/eduflow/flowlib.mjs`, copied verbatim into each CODE step (with the app's `renderMessage.js` and
flowkit's `cdmFields`) — the flow, the tests and the simulator run the same text. Rebuild after any change:

```
python tools/build_eduflow_flows.py .            # then the gates below
```

## The flows
| flow | trigger | what one run does |
|---|---|---|
| ADMISSION_CALL (`new_lead`, `call`) | app (async) | team + leads read → AI call to the lead → 3 min → call details → CDM: grade, score, summary, next action → code: HOT needs grade HOT and score ≥ 80 (else WARM), HOT → follow-up +48 h and the counsellor with the fewest open HOT leads for the course → write the lead → log the call → WhatsApp the counsellor (HOT only) |
| STUDENT_MANAGE (`enrol`) | app | insert the student → first fee (Upcoming) → welcome WhatsApp → log it → from a lead, the lead's Stage → Enrolled |
| ATTENDANCE (`save_batch`) | app | session row → every mark (one call) → **one ABSENCE post per absentee, none for a present student** |
| ABSENCE (`absent`) | ATTENDANCE / app | formal WhatsApp notice to the parent (**never a call**) → Call_Status WhatsApp Sent / Failed → log → a repeat absence (Needs_Followup Yes): HIGH alert + WhatsApp to the course's counsellor |
| ACADEMIC_CALL (`counsel`) | ACADEMIC_RUN / app | AI call to the student → 5 min → CDM: issue, main issue, needs mentor / counsellor → student patch, call log → alert + WhatsApp to the mentor / counsellor only when needed |
| FEE_REMINDER (`remind`, `send_link`) | FEE_RUN / app | remind: AI call to the parent → 3 min → CDM: response, promise date → payment-link WhatsApp → fee patch (count + 1, response, promise) → call + message log → day 15+ with no promise: CRITICAL alert to the director · send_link: WhatsApp only |
| PARENT_UPDATE (`weekly_report`, `update_call`) | PARENT_RUN / app | weekly_report: template from the record, **no AI** · update_call: AI call → 4 min → CDM: sentiment, feedback, concern, needs_escalation → code: status No Answer / Escalated / Completed, Needs_Followup Yes when Concerned or escalated → student patch, call log → escalation: HIGH alert "Parent Concern - {Name} - {Course}" owned by the Director + WhatsApp to the Director · a Monday retry that is No Answer again → "No answer twice — closed" |
| SEND_WHATSAPP (`send_update`) | app | the reviewed text to one parent → log |
| FEE_RUN | daily 10:00 IST | fees → Days_Overdue / Status for every unpaid fee → a call on day 1, 7 and 15 overdue, the link 3 days before Due_Date |
| ACADEMIC_RUN | Monday 11:00 IST | attendance < 75 or last score < 60, active only, worst first, max 50 → ACADEMIC_CALL |
| PARENT_RUN | Friday + Monday 17:00 IST (`0 17 * * 1,5`, the code branches on the weekday) | **Friday:** every active parent → weekly_report (100 %, WhatsApp, no AI); At Risk / Critical or attendance < 75 or last score < 60 → update_call · **Monday:** last Friday's Parent calls with No Answer and no Retry_At → Retry_At now + one update_call (Is_Retry Yes) |
| ROLLUP | daily 01:30 IST | attendance % (30 days), last / average score, rank in course + batch, trend (last 3 tests), strong / weak subjects, Status, Fee_Status per student → alerts without duplicates while one is open (attendance < 75, fee 15+ days, HOT lead past 48 h) |
| SCORES (`save_batch`) | app | the test run + every student's score — leave unwired (the app writes it itself) |

## What to set in Studio after import (the CHECKLIST per flow lists every box)
- **WhatsApp:** `SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID` and one `SET_IN_STUDIO_TEMPLATE_ID_*` per template — absence_alert, staff_alert,
  fee_payment_link, weekly_report, welcome, general_update — from whatsapp.pucho.ai (⚑ G5: the templates must be approved first;
  `eduflow_staff_alert` takes 1 = staff name, 2 = alert text).
- **Voice agents:** `SET_IN_STUDIO_VOICE_AGENT_ADMISSION / _ACADEMIC / _FEE / _PARENT` — the ai-voice-call agent each call uses (⚑ G1).
- **Fan-out webhooks:** `SET_IN_STUDIO_WEBHOOK_ABSENCE` (in ATTENDANCE), `_FEE_REMINDER` (FEE_RUN), `_ACADEMIC_CALL` (ACADEMIC_RUN),
  `_PARENT_UPDATE` (PARENT_RUN) — the webhook URL of the imported target flow.
- **Scheduled flows:** `SET_IN_STUDIO_APP_URL` (or rebuild with `--app-url`) and `SET_IN_STUDIO_INBOUND_TOKEN` — filled only in the
  git-ignored `deploy/flows/` by `build_deploy.py --inbound-token …`, never in `workflows/`.
- **The app:** `WEBHOOK_<FLOW>` per flow in Settings → Flow webhook URLs (leave SCORES empty).

## UNVERIFIED until one Studio run shows them
- **ai-voice-call** (G1): the `connectionDetails` keys the flows send (`phone_number`, `customer_name`, `language`, `context`) and the
  `getCallDetails` answer — read defensively (`callFacts`: transcript / duration / status from whichever keys come back); the CDM step
  reads the whole call record, so an unexpected key name still reaches it.
- **pucho-whatsapp** answer shape (rules §1.20 #5) — `sendOk` treats an error / success:false / status ≥ 400 as Failed.
- **LOOP_ON_ITEMS** (14 loops: the 0/1 staff alerts, the fan-outs, the per-row patches) — the kit still marks the node type
  PENDING-VERIFY although the tech team settled it on 7 Oct 2026.
- Delivered / Failed on the WhatsApp Notice needs the WhatsApp delivery callback (G5) — the flow sets Sent / Failed only.
- ATTENDANCE writes the session, then the marks — two calls through /api/data (the app's own save, unwired, is one transaction).

## Gates (3 Nov 2026)
- `validate_flow.py --contract`: **13/13 PASS** (0 errors). Warnings: LOOP pending-verify (14); "no AI tool" on the 9 message /
  schedule / write flows (the kit allows a channel job or a schedule).
- One mutation (the escalation alert write removed from PARENT_UPDATE) → **FAIL**, as it must.
- `flow_sim` with `tools/eduflow/fakes.mjs`: **16 action runs, 0 failures** (also with no answer + refused WhatsApp).
- `node --test tests/eduflow-flowlib.test.mjs tests/eduflow-flows.test.mjs`: **17/17 pass** — escalation, Concerns, happy parent, Friday
  no-answer → Monday retry → closed, weekly report without AI, absence sent / failed / repeat alert, absentees only, HOT ≥ 80,
  day-15 fee alert, Friday / Monday / other-day selection, fee days 1 / 7 / 15 and the link 3 days before, academic worst-first.
- `complexity.py`: every path ≤ 14 steps and ends in a Return; no router inside a router; no two CODE steps in a row. **Exception:**
  the four call agents count 3 "AI" steps (voiceCall, getCallDetails, CDM) against a budget of 1 — getCallDetails only reads the call
  record and each path makes ONE AI judgement (the CDM read); this is why the plan put them on the custom path. Kernel note for the
  skill owner: complexity.py counts every ai-voice-call step, so no call agent can meet the budget.
- `import_flows.py --dry-run`: 13 flows planned; no piece needs a Studio connection.

## Cost — counted on these flows (`docs/estimate.md`)
**59,682 credits ≈ ₹17,905 / month** (±30 %: ₹12,533 – ₹23,276), against 44,948 ≈ ₹13,484 declared at step 2. 7 actions count
more than 1.5× their declared figure (the call agents: 61 credits a run counted vs 29–49 declared; the AI step's per-tier multiplier is
the unconfirmed part). Loops are counted once per run: ROLLUP patches every active student every night and PARENT_RUN posts one
call per parent, so the real figure grows with the institute's size. Kit rule: the client hears this before a real import —
`python C:/pucho/kit/scripts/estimate_os.py . --acknowledge "<who, date>"`; `import_flows.py` refuses until then.

## Not done here
- The real import (`import_flows.py --api-key … --project … --publish --test`) needs the Studio API key — run by the owner.
- ADMISSION_CALL's "no answer → one retry after 2 hours" is not built (the Leads row action "Call again with AI" covers it).
