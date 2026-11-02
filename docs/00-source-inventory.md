# Source inventory — Pucho EduFlow OS

Step 0 / Part B. Two sources, both read as requirements, not as code to port.

| Source | What it is | Licence |
|---|---|---|
| `coaching_crm.html` (1,746 lines) | A static mockup titled "EduFlow CRM". Every button only fires a toast. Copy is in Hinglish. Demo institute: "Replora Coaching Institute, Bhopal". | Supplied by the Pucho team for this build, so no third-party licence applies (confirm, see G9). |
| `5._Parent_Communication_Agent.json` | n8n export, 48 nodes, 5 lanes, `active: false`. Every request body is empty and every CRM URL is a placeholder (`YOUR_CRM_API`). | Supplied by the Pucho team. It is rebuilt as Studio flows, not imported. |

**Parity choice:** a **subset plus fixes**. Every screen job is kept, apart from the n8n status page. The n8n defects are fixed, not carried over (see `IMPLEMENTATION-PLAN.md` §2).

## Screens and jobs → R-lines

| Screen / job | What a person sees and does | Source | R-line |
|---|---|---|---|
| Add Lead modal | name, phone, email, course interest, source, assigned to, notes; "Add Lead & Trigger Call" | html L1459–1497 | R1, R2 |
| Lane A, admission | webhook → script → call → wait → qualify → HOT? → WhatsApp counsellor → CRM | n8n "New Lead Webhook" … "Webhook Response" | R2, R3, R4 |
| Leads Pipeline | HOT/WARM/COLD counts, status and course filters, Assign / Follow-up / Nurture / Call Now / View | html L635–745 | R6, R7, R8 |
| Lead detail modal | course, status, AI score, source, AI qualification summary, next action, transcript, assign counsellor | html L1537–1575 | R3, R5, R6 |
| Alert "HOT leads pending 48 hrs" | HOT leads with no counsellor follow-up | html L1429 | R9 |
| Enroll Student modal | student + parent name and phone, course, batch, fee amount, due date, address; welcome WhatsApp | html L1500–1534 | R10, R11 |
| All Students | course / batch / status filters; attendance %, last score, fee status, risk status | html L748–831 | R12 |
| Student detail modal | attendance, last test, rank, strong/weak subjects, parent info, last call sentiment; Call Parent / Send Report | html L1578–1617 | R13 |
| Mark Attendance modal | batch, date, P/A per student | html L1620–1650 | R14 |
| Lane C, absence | webhook → script → call parent → wait → transcript → reason → attendance → follow-up? → WhatsApp counsellor | n8n "Absence Marked Webhook" … | R15, R16, R17 |
| Attendance page | present/absent today, below-75 % list, today's absent list with reason and category | html L834–927 | R16, R18 |
| Academic page | avg score, below 60 %, mentor sessions, at-risk queue with issue type and weak subjects | html L993–1047 | R19, R20, R23 |
| Lane D, academic | Monday 11:00 → at-risk (attendance < 75, score < 60, limit 50) → call → analyse → mentor/counsellor? → WhatsApp mentor → CRM | n8n "Weekly Academic Check" … | R20, R21, R22 |
| Fee page | collected, overdue, overdue students, reminders; tabs Overdue / Due this week / Paid; Send Link / Record | html L930–990 | R25, R26, R27, R28 |
| Lane B, fees | daily 10:00 → overdue (≥ 1 day, unpaid) → script → call → WhatsApp payment link → CRM | n8n "Daily Schedule - Fee Check" … | R24 |
| Parent Updates | sentiment counts, last week's parent call log | html L1050–1112 | R32 |
| Lane E, parent update | Friday 17:00 → all active → script → call → feedback → WhatsApp summary → escalate? → management alert → CRM | n8n "Weekly Parent Update" … | R29, R30, R31 |
| AI Call Log | call cards: agent, duration, time, outcome, transcript, follow-up/retry | html L1115–1234 | R33, R35 |
| WhatsApp Messages | sent/delivered/read/replies; message log; Send Message modal (individual / batch / broadcast) | html L1237–1264, L1653–1681 | R34, R36 |
| Alerts & Escalations | 7 alerts with severity, "Mark All Read" | html L1386–1452 | R37 |
| Top bar | global search, notifications bell, settings | html L331–356 | R38 |
| Export buttons | dashboard export, leads CSV, call log CSV | html L459, L666, L1118 | R39 |
| Dashboard | 6 KPIs, recent activity, urgent alerts, lead conversion | html L452–632 | R40 |
| AI Agents Status | 5 n8n agent cards, "Open n8n", Manual Run, View Logs | html L1267–1383 | dropped: kernel `/api/health` and Settings → Flow webhook URLs; Manual Run becomes the bulk actions in R24, R29 and R20 (X6) |
| Sidebar "n8n Automation" card | 5 green dots | html L433–445 | dropped (X6) |
