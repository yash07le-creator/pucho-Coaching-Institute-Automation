# Requirement traceability
Every client requirement and where the OS covers it. `scaffold_os.py` refuses to build while any row is empty.

| id | requirement | covered by |
|---|---|---|
| R1 | The office admin adds a lead with name, phone, email, course interest and source | page leads; page leads › modal add_lead; flow ADMISSION_CALL.new_lead |
| R2 | A new lead gets an AI qualification call as soon as the lead is saved | page leads › modal add_lead; flow ADMISSION_CALL; flow ADMISSION_CALL.new_lead |
| R3 | A lead is graded HOT, WARM or COLD with a score and a qualification summary from the call | page leads; flow ADMISSION_CALL; flow ADMISSION_CALL.new_lead |
| R4 | A counsellor is alerted on WhatsApp when a lead is graded HOT | page team; flow ADMISSION_CALL; flow ADMISSION_CALL.new_lead |
| R5 | A counsellor reads the call transcript and the next action on the lead | page leads; page calls; flow ADMISSION_CALL |
| R6 | The director assigns a lead to a counsellor | page overview › modal assign; page leads; page leads › modal assign; page team |
| R7 | A counsellor starts a fresh AI call to a lead with one click | page leads; page leads › modal call; flow ADMISSION_CALL; flow ADMISSION_CALL.call |
| R8 | A counsellor moves a COLD lead to nurture | page leads; page leads › modal stage |
| R9 | The director sees HOT leads that no counsellor has followed up within 48 hours | page overview; page overview › modal assign; page leads; flow ROLLUP; header |
| R10 | The office admin enrols a student with parent name and phone, course, batch, fee amount and fee due date | page leads › modal enrol; page students; page students › modal add_student; flow STUDENT_MANAGE |
| R11 | A parent of a newly enrolled student gets a welcome message on WhatsApp | page leads › modal enrol; page students › modal add_student; flow STUDENT_MANAGE |
| R12 | The office admin filters students by course, batch and status | page students |
| R13 | The director opens a student profile with attendance, last test, rank, strong and weak subjects and parent info | page students; flow ROLLUP |
| R14 | The office admin marks each student of a batch present or absent for a date | page attendance; flow ATTENDANCE; flow ATTENDANCE.save_batch; flow ABSENCE; flow ABSENCE.absent |
| R15 | A parent gets a formal WhatsApp notice when the student is marked absent — no call (owner, 3 Nov 2026) | page attendance; page attendance › modal absence_notice; flow ATTENDANCE; flow ATTENDANCE.save_batch; flow ABSENCE; flow ABSENCE.absent |
| R16 | The office admin sees whether each absence notice was sent, delivered or failed | page attendance; flow ABSENCE; flow ABSENCE.absent |
| R17 | A counsellor is alerted on WhatsApp when an absence needs follow-up | page attendance; page attendance › modal followup_done; page team; flow ABSENCE; flow ABSENCE.absent |
| R18 | The director sees students below 75% attendance as critical | page students; page attendance; flow ROLLUP |
| R19 | The office admin records each student's test score per subject | page scores; page scores › modal edit_score; flow SCORES; flow SCORES.save_batch |
| R20 | A student below 75% attendance or 60% score joins the at-risk queue every Monday at 11 AM | page academic; flow ACADEMIC_CALL; flow ACADEMIC_RUN; flow ROLLUP |
| R21 | An at-risk student gets an AI counselling call that records the issue type and main issue | page academic; page academic › modal counsel; flow ACADEMIC_CALL |
| R22 | A mentor is alerted on WhatsApp when the call says the student needs a mentor | page academic; page academic › modal counsel; page team; flow ACADEMIC_CALL |
| R23 | The director assigns a mentor or counsellor to an at-risk student | page students; page students › modal assign_mentor; page academic; page academic › modal assign_mentor |
| R24 | A parent with an overdue fee gets a reminder call and a WhatsApp payment link on the 10 AM run | page fees; page fees › modal remind; flow FEE_REMINDER; flow FEE_REMINDER.remind; flow FEE_RUN |
| R25 | The office admin sends one parent a payment link with one click | page overview › modal send_link; page fees; page fees › modal send_link; flow FEE_REMINDER; flow FEE_REMINDER.send_link |
| R26 | The office admin records a fee payment received | page fees; page fees › modal record_payment |
| R27 | A parent gets a reminder 3 days before a fee falls due | page fees; flow FEE_REMINDER; flow FEE_REMINDER.send_link; flow FEE_RUN |
| R28 | The director sees fees collected this month, total overdue and the overdue students | page overview; page fees; flow ROLLUP |
| R29 | A parent gets a weekly performance update call on Friday at 5 PM | page students › modal call_parent; page parents; flow PARENT_UPDATE; flow PARENT_UPDATE.update_call; flow PARENT_RUN |
| R30 | A parent gets the weekly performance summary on WhatsApp with attendance, score and trend | page students › modal weekly_report; flow PARENT_UPDATE; flow PARENT_UPDATE.weekly_report; flow PARENT_RUN |
| R31 | The director gets a management alert when a parent raises a concern on the call | page parents; flow PARENT_UPDATE; flow PARENT_UPDATE.update_call |
| R32 | The director sees parent sentiment counts: happy, neutral and concerned | page parents |
| R33 | A parent who did not answer gets a retry call | page students › modal call_parent; page parents; flow PARENT_UPDATE; flow PARENT_UPDATE.update_call; flow PARENT_RUN |
| R34 | The office admin sends a WhatsApp template to one parent, a batch or all parents | page students; page students › modal send_update; page messages; flow SEND_WHATSAPP |
| R35 | The director sees every AI call from all agents in one log, with outcome and transcript | page calls |
| R36 | The director sees every WhatsApp message with its delivery status | page messages |
| R37 | The director sees action-required alerts with severity and marks them read | page overview; page overview › modal acknowledge; page alerts; page alerts › modal acknowledge; page alerts › modal resolve; header |
| R38 | The director searches students, leads, phones and courses from anywhere | header |
| R39 | The director exports a list to CSV | page leads; page calls; page students; page fees |
| R40 | The director sees the institute dashboard: students, new leads this week, fees overdue, average attendance | page overview |
| R41 | The office admin adds the institute's own courses and batches, and the enrolment form offers them | page courses; page courses › modal add_course; page courses › modal edit_course; page batches; page batches › modal add_batch; page batches › modal edit_batch |
