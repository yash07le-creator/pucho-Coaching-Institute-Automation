# Product brief — Pucho EduFlow OS

`os.mode: product` · sold as **Pucho EduFlow OS** · "Built on Pucho" · one deployment and one database per institute.

## Segment
Private **coaching institutes** in Indian tier-2 cities that prepare students for JEE Mains, NEET, CA Foundation and UPSC. They run 3–6 batches (morning / evening / weekend) and have 100–1,000 students. One director owns the institute, an office admin runs fees and attendance, counsellors handle admissions and mentors handle teaching. Parents pay, so parents are the people who must be kept informed.

## First buyers
⚑ Not named yet (G10). The reference mockup's institute, Replora Coaching Institute, Bhopal, is the shape of a typical buyer: 342 students, four courses and three batches.

## Jobs the buyer hires EduFlow for (in the mockup's words)
1. Call every new enquiry before it goes cold: "Lead save hote hi automatic VAPI call trigger hogi" [html L1489].
2. Tell a parent the same day a child is absent, and find out why: "Absent mark karte hi Attendance Agent automatically parent ko VAPI call karega!" [html L1642].
3. Collect fees without the office chasing by phone: "Daily 10 AM auto-call + WhatsApp link" [html L932].
4. Catch a student who is slipping before the parent complains: "Weekly low-score students ko auto-call + mentor escalation" [html L995].
5. Keep every parent informed every week: "Weekly Friday 5PM auto performance update call" [html L1052].

## Problem card — Pucho EduFlow OS (typical buyer: coaching institute, Bhopal)
**Outcome in the buyer's words:** every lead, absence, overdue fee, at-risk student and parent gets an AI call or a WhatsApp on time, and the director sees "Action-required items from all AI agents" [html L1388] on one screen.
**Actors:** Director · Office admin · Counsellor · Mentor · Parent · Student · Lead
**Inputs:** leads (typed by the office or a counsellor, later from an ad form), enrolments, daily attendance per batch, test scores, fee schedule and payments, call transcripts from the AI voice agent.
**Outputs:** AI voice calls (lead qualification, absence reason, fee reminder, academic counselling, weekly parent update), WhatsApp templates (welcome, payment link, absence alert, weekly report, counsellor/mentor/management alerts), lead grades, absence reasons, parent sentiment, alerts, CSV exports.
**Volume:** ⚑ assumed — typical buyer from the mockup: 342 students, ~120 leads/month ("28 New Leads This Week" [html L486]), ~44 absences/day ("44 Absent Today" [html L849]), ~23 students overdue ("23 Overdue Students" [html L941]), ~34 at-risk calls/week ("34 AI Counseling Calls" [html L1005]). Smallest buyer ~120 students, largest ~1,000.
**Languages:** ⚑ assumed — the app's copy is Hinglish (Roman script), as in the mockup. Calls and WhatsApp to parents are in Hindi/Hinglish (G7).
**Systems:** Pucho Studio (`ai-voice-call`, `pucho-whatsapp`, Pucho CDM), Razorpay for payment links (G4). Today: none — the n8n flow's CRM is a placeholder, so EduFlow's own PostgreSQL is the system of record.
**Success:** the director's dashboard shows fees overdue going down and every absence with a reason collected ("93% Reason collected" [html L1328]), with no one in the office making these calls by hand.
**Constraints:** a parent must never get a call or WhatsApp the data does not justify (cost and goodwill). WhatsApp outside the 24-hour window needs an approved template. Each buyer has its own deployment and database.

## Requirement lines
R1  The office admin adds a lead with name, phone, email, course interest and source — "Add Lead & Trigger Call" [html L1494]
R2  A new lead gets an AI qualification call as soon as the lead is saved — "Lead save hote hi automatic VAPI call trigger hogi" [html L1489]
R3  A lead is graded HOT, WARM or COLD with a score and a qualification summary from the call — "AI Qualification Summary" [html L1551]
R4  A counsellor is alerted on WhatsApp when a lead is graded HOT — "WhatsApp - Alert Counsellor" [n8n node]
R5  A counsellor reads the call transcript and the next action on the lead — "AI CALL TRANSCRIPT" [html L1556]
R6  The director assigns a lead to a counsellor — "Lead assigned to Counsellor A — Rahul Sharma!" [html L1572]
R7  A counsellor starts a fresh AI call to a lead with one click — "AI call ab trigger ho rahi hai..." [html L726]
R8  A counsellor moves a COLD lead to nurture — "Cold lead ko nurture sequence mein add kiya" [html L715]
R9  The director sees HOT leads that no counsellor has followed up within 48 hours — "4 HOT Leads Pending 48hrs" [html L1429]
R10 The office admin enrols a student with parent name and phone, course, batch, fee amount and fee due date — "Enroll New Student" [html L1503]
R11 A parent of a newly enrolled student gets a welcome message on WhatsApp — "Welcome message WhatsApp par bheja gaya" [html L1531]
R12 The office admin filters students by course, batch and status — "342 enrolled students — August 2026" [html L750]
R13 The director opens a student profile with attendance, last test, rank, strong and weak subjects and parent info — "Student Profile — Rohan Mehra" [html L1581]
R14 The office admin marks each student of a batch present or absent for a date — "Attendance saved! 3 absent students ke parents ko AI call trigger ho rahi hai" [html L1647]
R15 A parent gets an AI call asking the reason when the student is marked absent — "Absent mark karte hi Attendance Agent automatically parent ko VAPI call karega!" [html L1642]
R16 The office admin sees the reason and category collected by the call against each absence — "Today's Absent List — AI Calls Auto-Triggered" [html L897]
R17 A counsellor is alerted on WhatsApp when an absence needs follow-up — "Needs Follow-up?" [n8n node]
R18 The director sees students below 75% attendance as critical — "Critical — Below 75% Attendance" [html L862]
R19 ⚑ The office admin records each student's test score per subject — inferred from "Last Score", "Weak Subjects" and "Class Rank" on the student screens
R20 A student below 75% attendance or 60% score joins the at-risk queue every Monday at 11 AM — "min_attendance 75, max_test_score 60" [n8n Get Low Performance Students]
R21 An at-risk student gets an AI counselling call that records the issue type and main issue — "Weekly low-score students ko auto-call + mentor escalation" [html L995]
R22 A mentor is alerted on WhatsApp when the call says the student needs a mentor — "WhatsApp - Escalate to Mentor" [n8n node]
R23 The director assigns a mentor or counsellor to an at-risk student — "Mentor session schedule kiya — Sneha Joshi" [html L1021]
R24 A parent with an overdue fee gets a reminder call and a WhatsApp payment link on the 10 AM run — "Daily 10 AM auto-call + WhatsApp link" [html L932]
R25 The office admin sends one parent a payment link with one click — "Razorpay link WhatsApp par bheja — Priya Gupta" [html L961]
R26 The office admin records a fee payment received — "Manual fee entry ho rahi hai..." [html L961]
R27 A parent gets a reminder 3 days before a fee falls due — "Auto reminder 3 days pehle jayega" [html L985]
R28 The director sees fees collected this month, total overdue and the overdue students — "Collected This Month" [html L939]
R29 A parent gets a weekly performance update call on Friday at 5 PM — "Weekly Friday 5PM auto performance update call" [html L1052]
R30 A parent gets the weekly performance summary on WhatsApp with attendance, score and trend — "Rahul ka weekly report: Attendance 92%..." [html L1255]
R31 The director gets a management alert when a parent raises a concern on the call — "Alert Management - Parent Concern" [n8n node]
R32 The director sees parent sentiment counts: happy, neutral and concerned — "Happy Parents" [html L1059]
R33 A parent who did not answer gets a retry call — "Retry call schedule ho rahi hai..." [html L1212]
R34 The office admin sends a WhatsApp template to one parent, a batch or all parents — "WhatsApp broadcast bheja gaya — 342 parents!" [html L1678]
R35 The director sees every AI call from all agents in one log, with outcome and transcript — "All 5 agents combined log" [html L1117]
R36 The director sees every WhatsApp message with its delivery status — "Auto-sent by all 5 AI Agents" [html L1239]
R37 The director sees action-required alerts with severity and marks them read — "Sab alerts mark as read ho gaye!" [html L1389]
R38 The director searches students, leads, phones and courses from anywhere — "Student, lead, phone ya course search karo…" [html L339]
R39 The director exports a list to CSV — "CSV export ho raha hai..." [html L666]
R40 The director sees the institute dashboard: students, new leads this week, fees overdue, average attendance — "Institute Dashboard" [html L455]
R41 The office admin adds the institute's own courses and batches, and the enrolment form offers them — "add manual cours and alos add bethch oprion" [owner, 2 Nov 2026]

## Not in v1
X1  A parent or student login portal — parents are reached by call and WhatsApp only, and nobody outside the staff logs in
X2  An online test engine — scores are entered or imported (R19)
X3  Timetable, faculty attendance and payroll — not in either source
X4  Handling inbound WhatsApp replies with AI — "Replies Received" [html L1246] is counted, but neither source handles a reply
X5  Multi-branch institutes in one deployment — a product is one deployment per institute
X6  The "AI Agents Status" page and n8n links — replaced by the kernel's flow health and Settings → Flow webhook URLs

## Gaps
G1  Can you export one Studio flow with an `ai-voice-call` voiceCall step (or attach the connection), so its connectionDetails shape is known?
G2  Should a parent get a call on every absence, or a WhatsApp on every absence and a call only from the 2nd absence in a week?
G3  Should the Friday update go to every parent as WhatsApp, with a call only to parents of at-risk students?
G4  Is the payment link a Razorpay link created per reminder, or one fixed link stored on the student?
G5  Which WhatsApp templates are already approved, and which should we submit (welcome, fee reminder, absence alert, weekly report, staff alert)?
G6  Are the thresholds right — attendance below 75%, score below 60%, fee overdue from day 1 with an alert at 15 days, HOT lead follow-up within 48 hours?
G7  Should calls to parents and students be in Hindi, Hinglish or English?
G8  May we keep "Replora Coaching Institute, Bhopal" as the invented demo institute, or should we invent a new name?
G9  Can you confirm both source files are Pucho's own, with no third-party licence?
G10 Which two or three institutes are the first buyers we should check this brief against?
