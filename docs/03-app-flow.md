# 03 — App Flow · EduFlow
## Pages
- **overview** `/` — What needs action today, then the institute's numbers
- **alerts** `/alerts` — 
- **leads** `/leads` — 
- **calls** `/calls` — 
- **students** `/students` — 
- **attendance** `/attendance` — 
- **academic** `/academic` — 
- **scores** `/scores` — 
- **fees** `/fees` — 
- **parents** `/parents` — 
- **messages** `/messages` — 
- **courses** `/courses` — 
- **batches** `/batches` — 
- **team** `/team` — 
- **settings** `/settings` — Profile, password, flow webhook URLs
- **users** `/users` — Everyone who can sign in, and what each role may open
## Navigation and look
Shell per portal: admin=sidebar (`src/config/design.js`); nav from `src/config/nav.js`; tone pucho, radius pucho, density comfortable, sidebar light (`src/config/tokens.css`); header title = active page label. Login → first permitted page. Roles: admin (*), office (attendance, students, scores, fees, messages, alerts, courses, batches, settings), counsellor (leads, calls, students, parents, alerts, messages, settings), mentor (academic, scores, students, attendance, calls, settings).
## Workflow wiring (screen → flow.action)
- Overview `/` → direct patch (Acknowledge alert), direct patch (Assign counsellor), `FEE_REMINDER.send_link` (Send payment link)
- Alerts & escalations `/alerts` → direct patch (Mark read), direct patch (Resolve)
- Leads `/leads` → `ADMISSION_CALL.new_lead` (Add lead), `ADMISSION_CALL.call` (Call again with AI), direct patch (Assign counsellor), direct patch (Change stage), `STUDENT_MANAGE.enrol` (Enrol as student)
- AI call log `/calls` → no workflow
- Students `/students` → `STUDENT_MANAGE.enrol` (Enrol student), direct patch (Assign mentor / counsellor), `PARENT_UPDATE.update_call` (AI call to parent), `PARENT_UPDATE.weekly_report` (Send weekly report), `SEND_WHATSAPP.send_update` (WhatsApp the parent)
- Attendance `/attendance` → direct patch (Follow-up done), `ABSENCE.absent` (Send absence notice)
- Academic `/academic` → `ACADEMIC_CALL.counsel` (AI counselling call), direct patch (Assign mentor / counsellor)
- Test scores `/scores` → direct patch (Correct marks)
- Fees `/fees` → direct patch (Record payment), `FEE_REMINDER.send_link` (Send payment link), `FEE_REMINDER.remind` (AI reminder call)
- Parent updates `/parents` → no workflow
- WhatsApp `/messages` → no workflow
- Courses `/courses` → direct insert (Add course), direct patch (Edit course)
- Batches `/batches` → direct insert (Add batch), direct patch (Edit batch)
- Team `/team` → direct insert (Add team member), direct patch (Edit team member)
- Settings `/settings` → no workflow
- Users & roles `/users` → no workflow
## States
Every table: loading skeleton, empty state with CTA, search, filters, segments/period chips where declared, table/cards/kanban views where declared, export. Every modal: validation, pending label, toast, refresh.
