// tools/eduflow/flowlib.mjs — every rule the EduFlow Studio flows run in their CODE steps (method/ai-pipeline.md, the custom path).
// Rule zero: a model only reads a call transcript (Pucho CDM); grades, statuses, counts, dates, owners and every row are code here.
// tools/build_eduflow_flows.py copies this file VERBATIM into each CODE step (inside the lib / end-lib markers), so the flow runs
// exactly what tests/eduflow-flowlib.test.mjs and flow_sim test. Plain JS, no imports — it must run inside Studio as is.
// Each CODE step calls ONE function with the node's inputs: b = the trigger body, C = the constants step, the rest named per step.
// Uses renderMessage (app/src/lib/renderMessage.js) and cdmFields (flowkit) — the builder puts both above this file.

const S = (v) => (v === undefined || v === null ? '' : String(v)).trim();
const N = (v) => { if (v === '' || v === null || v === undefined) return null; const x = Number(String(v).replace(/[,%₹\s]/g, '')); return Number.isFinite(x) ? x : null; };
const list = (v) => { if (Array.isArray(v)) return v; if (v && Array.isArray(v.body)) return v.body; if (typeof v === 'string') { try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch (e) { return []; } } return []; };
const nowIso = () => new Date().toISOString();
const istDate = (ms = Date.now()) => new Date(ms + 330 * 60000).toISOString().slice(0, 10);   // IST calendar day, no Intl
const istWeekday = (ms = Date.now()) => new Date(ms + 330 * 60000).getUTCDay();               // 0 Sun … 5 Fri
const dayDiff = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5);   // a − b in days
const yes = (v) => /^(yes|true|1|haan)$/i.test(S(v));
const e164 = (v) => { const d = S(v).replace(/\D/g, ''); return d ? '+' + (d.length === 10 ? '91' + d : d) : ''; };
const active = (r) => S(r.Status) !== 'Inactive';
const teamOf = (team, role, course) => list(team).filter((m) => S(m.Role) === role && String(m.Active) !== 'false' && (!course || /^all$/i.test(S(m.Courses)) || S(m.Courses).split(',').map((x) => x.trim()).includes(course)));

// A send step runs with continueOnFailure: it answers either the provider's reply or an error (⚑ UNVERIFIED shape, rules §1.20 #5).
export function sendOk(r) { return !!r && typeof r === 'object' && !r.error && !r.errorMessage && r.success !== false && !(Number(r.statusCode) >= 400) && !(Number(r.status) >= 400); }

// getCallDetails (⚑ UNVERIFIED shape, G1): the transcript, duration and outcome, read defensively from whichever keys the agent returns.
export function callFacts(d) {
  const x = (d && typeof d === 'object' && (d.apiResponse?.data || d.data || d)) || {};
  const msgs = Array.isArray(x.messages) ? x.messages.map((m) => `${m.role || m.speaker || ''}: ${m.message || m.content || m.text || ''}`).join('\n') : '';
  const transcript = S(x.transcript ?? x.transcription ?? x.call_transcript ?? msgs);
  const duration = Math.max(0, Math.round(N(x.duration ?? x.durationSec ?? x.call_duration ?? x.duration_seconds) ?? 0));
  const status = S(x.status ?? x.call_status ?? x.endedReason ?? x.ended_reason).toLowerCase();
  const answered = transcript.length > 20 && !/no.?answer|busy|fail|not.?answered|voicemail|unreachable/.test(status);
  return { transcript: transcript.slice(0, 20000), duration, answered, status };
}

// One WhatsApp template to a staff member: the row the loop sends + the messages row it logs (eduflow_staff_alert: 1 name · 2 text).
function staffAlert(member, text, agent, b) {
  const to = e164(member && member.Phone); if (!to) return [];
  return [{ to_e164: to, variables: { 1: S(member.Name), 2: text.slice(0, 900) },
    message: { Sent_At: nowIso(), To_Name: S(member.Name), To_Phone: to, Type: 'Staff Alert', Agent: agent, Template: 'eduflow_staff_alert', Preview: text.slice(0, 300), Status: 'Sent', Student_ID: S(b.Student_ID), Lead_ID: S(b.Lead_ID) } }];
}
function messageRow(b, m, type, agent, to_name, extra = {}) {
  const preview = Object.values(m.variables || {}).filter(Boolean).join(' · ');
  return { Sent_At: nowIso(), To_Name: S(to_name), To_Phone: m.to_e164, Type: type, Agent: agent, Template: m.template, Preview: preview.slice(0, 300), Status: 'Queued', Student_ID: S(b.Student_ID), Lead_ID: S(b.Lead_ID), ...extra };
}
// After the send: the message row's Status is what the provider answered (Sent / Failed).
export function afterSend(i) {
  const ok = sendOk(i.sent); const st = ok ? 'Sent' : 'Failed';
  return { ok: ok ? 'true' : 'false', status: st, messages: list(i.messages).map((m) => ({ ...m, Status: st })), patch: i.patch || {}, fees: list(i.fees), leads: list(i.leads) };
}

// ── ABSENCE.absent — the formal notice; a repeat absence also alerts the counsellor (no call, owner 3 Nov 2026) ──
const SEND_ABSENCE = { to: 'Parent_Phone', template: { name: 'eduflow_absence_alert', variables: { 1: '{{Parent_Name}}', 2: '{{Name}}', 3: '{{Batch}}', 4: '{{Date}}' } } };
export function absenceBuild(i) {
  const b = i.b || {}; const m = renderMessage(SEND_ABSENCE, b, i.C || {});
  const follow = yes(b.Needs_Followup); const counsellor = teamOf(i.team, 'Counsellor', S(b.Course))[0];
  const text = `${S(b.Name)} (${S(b.Course)}, ${S(b.Batch)}) is absent ${N(b.Absences_This_Week) || 2} times this week — please call the parent.`;
  const alerts = follow ? [{ Raised_At: nowIso(), Title: `Absent ${N(b.Absences_This_Week) || 2} times this week — ${S(b.Name)}`, Detail: text, Kind: 'Attendance', Severity: 'HIGH', Student_ID: S(b.Student_ID), Lead_ID: '', Raised_By: 'flow:ABSENCE', Owner: S(counsellor && counsellor.Name), Status: 'Open' }] : [];
  return { to_e164: m.to_e164, variables: m.variables, messages: [messageRow(b, m, 'Absence Alert', 'Attendance', b.Parent_Name)], alerts, staff: follow ? staffAlert(counsellor, text, 'Attendance', b) : [] };
}
export function absenceAfter(i) {
  const a = afterSend(i); return { ...a, patch: { Call_Status: a.ok === 'true' ? 'WhatsApp Sent' : 'Failed' } };   // Delivered comes from the delivery callback (G5)
}

// ── ATTENDANCE.save_batch — the session head, its lines, then one ABSENCE.absent per absentee (never a present student) ──
export function attendanceSession(i) {
  const b = i.b || {};
  return { row: { Session_ID: '', Date: S(b.Date), Batch: S(b.Batch), Total_Count: N(b.Total_Count) ?? 0, Present_Count: N(b.Present_Count) ?? 0, Absent_Count: N(b.Absent_Count) ?? 0, Absentees: S(b.Absentees), Marked_By: S(b.Marked_By || b._who), Saved_At: nowIso() } };
}
export function attendanceLines(i) {
  const sid = S((list(i.head)[0] || {}).Session_ID); const cols = ['Date', 'Batch', 'Student_ID', 'Name', 'Course', 'Parent_Name', 'Parent_Phone', 'Status', 'Absences_This_Week', 'Absences_This_Month', 'Call_Status', 'Needs_Followup', 'Followup_Done', 'Marked_By'];
  const rows = list((i.b || {}).lines).map((l) => { const r = { Att_ID: '', Session_ID: sid }; for (const c of cols) r[c] = l[c] === undefined ? '' : l[c]; return r; });
  return { rows, count: rows.length, Session_ID: sid };
}
export function attendanceAbsentees(i) {
  const C = i.C || {}; const saved = list(i.saved).filter((r) => S(r.Status) === 'Absent');
  const posts = saved.map((r) => ({ action: 'absent', _who: 'flow:ATTENDANCE', app_url: C.app_url, inbound_token: C.inbound_token, company_name: C.company_name,
    Att_ID: S(r.Att_ID), Date: S(r.Date), Batch: S(r.Batch), Student_ID: S(r.Student_ID), Name: S(r.Name), Course: S(r.Course), Parent_Name: S(r.Parent_Name), Parent_Phone: S(r.Parent_Phone),
    Absences_This_Week: N(r.Absences_This_Week) ?? 1, Needs_Followup: S(r.Needs_Followup) || 'No' }));
  return { posts, absent: posts.length };
}

// ── the four call agents: one CDM read of the transcript → code decides everything else ──
function cdm(i, decl, choices) { return cdmFields(i.ai_fields, decl, null, choices || {}); }
function callRow(b, f, extra) {
  return { Call_ID: '', Called_At: nowIso(), Lead_ID: S(b.Lead_ID), Student_ID: S(b.Student_ID), Course: S(b.Course), Status: f.answered ? 'Completed' : 'No Answer', Duration_Sec: f.duration, Request_ID: S(b._request_id),
    Transcript: f.transcript, Outcome: '', Summary: '', Grade: '', Score: '', Sentiment: '', Concern: '', Issue_Type: '', Reason: '', Category: '', Needs_Followup: 'No', Retry_At: '', ...extra };
}

// ADMISSION_CALL.new_lead / call — HOT needs grade HOT and score ≥ 80 (else WARM); HOT → follow-up in 48 h and the counsellor alerted.
export function admissionResult(i) {
  const b = { ...(i.b || {}), _request_id: i.request_id }; const f = callFacts(i.details);
  const r = cdm(i, { grade: 'string', score: 'number', summary: 'string', next_action: 'string' }, { grade: ['HOT', 'WARM', 'COLD'] });
  const score = Math.max(0, Math.min(100, Math.round(N(r.score) ?? 0)));
  const grade = !f.answered ? 'Not graded' : r.grade === 'HOT' && score >= 80 ? 'HOT' : r.grade === 'COLD' ? 'COLD' : 'WARM';
  const hot = grade === 'HOT'; const course = S(b.Course);
  const open = (n) => list(i.leads).filter((l) => S(l.Assigned_To) === n && S(l.Grade) === 'HOT' && !['Enrolled', 'Lost'].includes(S(l.Stage))).length;
  const pool = teamOf(i.team, 'Counsellor', course).sort((x, y) => open(x.Name) - open(y.Name));
  const counsellor = list(i.team).find((m) => S(m.Name) === S(b.Assigned_To)) || (hot ? pool[0] : null);
  const lead = { Stage: f.answered ? 'Called' : 'New', Grade: grade, Score: f.answered ? score : '', AI_Summary: S(r.summary), Next_Action: S(r.next_action), Call_Status: f.answered ? 'Completed' : 'No Answer',
    Last_Called_At: nowIso(), Transcript: f.transcript, Assigned_To: S(b.Assigned_To) || (hot && counsellor ? S(counsellor.Name) : ''), Next_Followup_At: hot ? new Date(Date.now() + 48 * 3600e3).toISOString() : '' };
  const row = { Lead_ID: S(b.Lead_ID), Created_At: nowIso(), Name: S(b.Name), Phone: S(b.Phone), Email: S(b.Email), Course: course, Source: S(b.Source), Notes: S(b.Notes), Lost_Reason: '', ...lead };
  const call = callRow(b, f, { Agent: 'Admission', Relation: 'Lead', Person: S(b.Name), Phone: S(b.Phone), Grade: f.answered ? grade : '', Score: f.answered ? score : '', Summary: S(r.summary),
    Outcome: !f.answered ? 'No answer — call again in 2 hours' : hot ? `Graded HOT — ${counsellor ? S(counsellor.Name) : 'counsellor'} alerted` : `Graded ${grade}` });
  const staff = hot ? staffAlert(counsellor, `HOT lead: ${S(b.Name)} (${course}, ${S(b.Phone)}) — score ${score}. ${S(r.next_action)}`, 'Admission', b) : [];
  return { lead, row, call, staff, grade, answered: f.answered ? 'true' : 'false' };
}

// ACADEMIC_CALL.counsel — the student's issue; a mentor / counsellor is alerted only when the call says so.
export function academicResult(i) {
  const b = { ...(i.b || {}), _request_id: i.request_id }; const f = callFacts(i.details);
  const r = cdm(i, { issue_type: 'string', main_issue: 'string', needs_mentor: 'string', needs_counsellor: 'string' }, { issue_type: ['ACADEMIC', 'PERSONAL', 'ATTENDANCE', 'FINANCIAL', 'OTHER'], needs_mentor: ['Yes', 'No'], needs_counsellor: ['Yes', 'No'] });
  const mentor = list(i.team).find((m) => S(m.Name) === S(b.Mentor)) || teamOf(i.team, 'Mentor', S(b.Course))[0]; const counsellor = teamOf(i.team, 'Counsellor', S(b.Course))[0];
  const wantM = f.answered && r.needs_mentor === 'Yes'; const wantC = f.answered && r.needs_counsellor === 'Yes';
  const text = `${S(b.Name)} (${S(b.Course)}; attendance ${N(b.Attendance_Pct) ?? '—'}%, last test ${N(b.Last_Score) ?? '—'}%): ${S(r.main_issue) || 'needs a session'}.`;
  const patch = f.answered ? { Issue_Type: r.issue_type || 'OTHER', Main_Issue: S(r.main_issue), Last_Counselled_At: nowIso() } : { Last_Counselled_At: nowIso() };
  const call = callRow(b, f, { Agent: 'Academic', Relation: 'Student', Person: S(b.Name), Phone: S(b.Student_Phone), Issue_Type: f.answered ? (r.issue_type || 'OTHER') : '', Summary: S(r.main_issue),
    Needs_Followup: wantM || wantC ? 'Yes' : 'No', Outcome: !f.answered ? 'No answer' : wantM || wantC ? `Alerted ${[wantM && 'mentor', wantC && 'counsellor'].filter(Boolean).join(' and ')}` : 'Counselled' });
  const alerts = wantM || wantC ? [{ Raised_At: nowIso(), Title: `Academic support — ${S(b.Name)} — ${S(b.Course)}`, Detail: text, Kind: 'Academic', Severity: wantM && wantC ? 'HIGH' : 'MEDIUM', Student_ID: S(b.Student_ID), Lead_ID: '', Raised_By: 'flow:ACADEMIC_CALL', Owner: S((wantM ? mentor : counsellor)?.Name), Status: 'Open' }] : [];
  return { patch, call, alerts, staff: [...(wantM ? staffAlert(mentor, text, 'Academic', b) : []), ...(wantC ? staffAlert(counsellor, text, 'Academic', b) : [])] };
}

// FEE_REMINDER.remind — the call, then always the payment-link WhatsApp; day 15+ with no promise → a CRITICAL alert to the director.
const SEND_LINK = { to: 'Parent_Phone', template: { name: 'eduflow_fee_payment_link', variables: { 1: '{{Parent_Name}}', 2: '{{Student_Name}}', 3: '{{Balance_INR}}', 4: '{{Due_Date}}', 5: '{{Payment_Link}}' } } };
export function feeLink(i) {
  const b = i.b || {}; const m = renderMessage(SEND_LINK, b, i.C || {});
  return { to_e164: m.to_e164, variables: m.variables, messages: [messageRow(b, m, 'Payment Link', 'Fee', b.Parent_Name)], patch: { Last_Reminder_At: nowIso() } };
}
export function feeResult(i) {
  const b = { ...(i.b || {}), _request_id: i.request_id }; const f = callFacts(i.details); const link = feeLink(i);
  const r = cdm(i, { parent_response: 'string', promise_date: 'string' });
  const promise = /^\d{4}-\d{2}-\d{2}$/.test(S(r.promise_date)) ? S(r.promise_date) : '';
  const patch = { Reminder_Count: (N(b.Reminder_Count) ?? 0) + 1, Last_Reminder_At: nowIso(), Parent_Response: f.answered ? S(r.parent_response) : 'No answer — payment link sent on WhatsApp', ...(promise ? { Promise_Date: promise } : {}) };
  const late = (N(b.Days_Overdue) ?? 0) >= 15 && !promise;
  const call = callRow(b, f, { Agent: 'Fee', Relation: 'Parent', Person: S(b.Parent_Name), Phone: S(b.Parent_Phone), Summary: S(r.parent_response), Needs_Followup: late ? 'Yes' : 'No',
    Outcome: !f.answered ? 'No answer — link sent' : promise ? `Promised to pay by ${promise}` : 'No promise — link sent' });
  const alerts = late ? [{ Raised_At: nowIso(), Title: `Fee overdue ${N(b.Days_Overdue)} days — ${S(b.Student_Name)} — ₹${N(b.Balance_INR) ?? ''}`, Detail: `${S(b.Parent_Name)}: ${f.answered ? S(r.parent_response) || 'no promise to pay' : 'did not answer the reminder call'}.`, Kind: 'Fee', Severity: 'CRITICAL', Student_ID: '', Lead_ID: '', Raised_By: 'flow:FEE_REMINDER', Owner: S(b.Director), Status: 'Open' }] : [];
  return { ...link, patch, call, alerts };
}

// PARENT_UPDATE.weekly_report — 100 % of active parents, numbers from the record, no AI.
const SEND_REPORT = { to: 'Parent_Phone', template: { name: 'eduflow_weekly_report', variables: { 1: '{{Parent_Name}}', 2: '{{Name}}', 3: '{{Attendance_Pct}}', 4: '{{Last_Score}}', 5: '{{Class_Rank}}', 6: '{{Performance_Trend}}' } } };
export function weeklyReport(i) {
  const b = i.b || {}; const m = renderMessage(SEND_REPORT, b, i.C || {});
  return { to_e164: m.to_e164, variables: m.variables, messages: [messageRow(b, m, 'Weekly Report', 'Parent', b.Parent_Name)], patch: { Last_Report_At: nowIso() } };
}
// PARENT_UPDATE.update_call — status and escalation in code (owner, 3 Nov 2026).
export function parentResult(i) {
  const b = { ...(i.b || {}), _request_id: i.request_id }; const f = callFacts(i.details);
  const r = cdm(i, { sentiment: 'string', feedback: 'string', concern: 'string', needs_escalation: 'string' }, { sentiment: ['Happy', 'Neutral', 'Concerned', 'No Answer'], needs_escalation: ['Yes', 'No'] });
  const sentiment = !f.answered ? 'No Answer' : r.sentiment || 'Neutral'; const esc = f.answered && r.needs_escalation === 'Yes'; const flag = sentiment === 'Concerned' || esc;
  const status = sentiment === 'No Answer' ? 'No Answer' : esc ? 'Escalated' : 'Completed';
  const director = teamOf(i.team, 'Director')[0]; const retry = yes(b.Is_Retry);
  const call = callRow(b, f, { Agent: 'Parent', Relation: 'Parent', Person: S(b.Parent_Name), Phone: S(b.Parent_Phone), Status: status, Sentiment: sentiment, Summary: S(r.feedback), Concern: S(r.concern), Needs_Followup: flag ? 'Yes' : 'No',
    Outcome: status === 'No Answer' ? (retry ? 'No answer twice — closed' : 'No answer — retry on Monday 5 PM') : flag ? 'Escalated to the director' : 'Update shared' });
  const patch = { Parent_Sentiment: sentiment, Parent_Concern: S(r.concern), Last_Parent_Call_At: nowIso() };
  const detail = `${S(b.Parent_Name)}: ${S(r.concern) || S(r.feedback) || 'concerned about progress'}`;
  const alerts = flag ? [{ Raised_At: nowIso(), Title: `Parent Concern - ${S(b.Name)} - ${S(b.Course)}`, Detail: detail, Kind: 'Parent', Severity: 'HIGH', Student_ID: S(b.Student_ID), Lead_ID: '', Raised_By: 'flow:PARENT_UPDATE', Owner: S(director && director.Name), Status: 'Open' }] : [];
  return { patch, call, alerts, staff: flag ? staffAlert(director, `Parent concern — ${S(b.Name)} (${S(b.Course)}). ${detail}`, 'Parent', b) : [], status };
}

// ── STUDENT_MANAGE.enrol — student, first fee, welcome WhatsApp; from a lead, the lead becomes Enrolled ──
const SEND_WELCOME = { to: 'Parent_Phone', template: { name: 'eduflow_welcome', variables: { 1: '{{Parent_Name}}', 2: '{{Name}}', 3: '{{Course}}', 4: '{{Batch}}' } } };
export function enrolBuild(i) {
  const b = i.b || {};
  return { row: { Student_ID: '', Enrolled_At: nowIso(), Name: S(b.Name), Student_Phone: S(b.Student_Phone || b.Phone), Parent_Name: S(b.Parent_Name), Parent_Phone: S(b.Parent_Phone), Course: S(b.Course), Batch: S(b.Batch),
    Address: S(b.Address), Status: 'Active', Fee_Status: 'Due', Fee_Amount_INR: N(b.Fee_Amount_INR) ?? '', Fee_Due_Date: S(b.Fee_Due_Date), Counsellor: S(b.Counsellor) } };
}
export function enrolNext(i) {
  const b = i.b || {}; const st = list(i.saved)[0] || {}; const sid = S(st.Student_ID); const m = renderMessage(SEND_WELCOME, b, i.C || {});
  const fees = N(b.Fee_Amount_INR) ? [{ Fee_ID: '', Created_At: nowIso(), Student_ID: sid, Student_Name: S(b.Name), Parent_Name: S(b.Parent_Name), Parent_Phone: S(b.Parent_Phone), Course: S(b.Course), Instalment: 1,
    Amount_INR: N(b.Fee_Amount_INR), Paid_INR: 0, Due_Date: S(b.Fee_Due_Date), Days_Overdue: 0, Status: 'Upcoming', Reminder_Count: 0 }] : [];
  return { Student_ID: sid, to_e164: m.to_e164, variables: m.variables, messages: [messageRow({ ...b, Student_ID: sid }, m, 'Welcome', 'Office', b.Parent_Name)], fees, leads: S(b.Lead_ID) ? [{ Lead_ID: S(b.Lead_ID), Stage: 'Enrolled' }] : [] };
}

// ── SEND_WHATSAPP.send_update — the reviewed text to one parent (the app filled `To` from the student record, D6) ──
const SEND_UPDATE = { to: 'To', template: { name: 'eduflow_general_update', variables: { 1: '{{Parent_Name}}', 2: '{{Name}}', 3: '{{Message}}' } } };
export function updateBuild(i) {
  const b = i.b || {}; const m = renderMessage(SEND_UPDATE, b, i.C || {});
  return { to_e164: m.to_e164, variables: m.variables, messages: [messageRow(b, m, 'General Update', 'Office', b.Parent_Name)] };
}

// ── schedules: read the app's rows, decide in code, post one call per target to the action flow ──
function post(C, action, who, row) { return { action, _who: `flow:${who}`, app_url: C.app_url, inbound_token: C.inbound_token, company_name: C.company_name, ...row }; }
const pick = (r, keys) => Object.fromEntries(keys.map((k) => [k, r[k] === undefined || r[k] === null ? '' : r[k]]));

// FEE_RUN (daily 10:00) — Days_Overdue and Due → Overdue; a call on day 1, 7 and 15 overdue; the link 3 days before Due_Date.
export function feeRun(i) {
  const C = i.C || {}; const today = S(C.today_override) || istDate(); const director = S((teamOf(i.team, 'Director')[0] || {}).Name);
  const patches = [], remind = [], link = [];
  for (const f of list(i.fees)) {
    const bal = N(f.Balance_INR) ?? ((N(f.Amount_INR) ?? 0) - (N(f.Paid_INR) ?? 0)); if (S(f.Status) === 'Paid' || bal <= 0 || !S(f.Due_Date)) continue;
    const late = Math.max(0, dayDiff(today, S(f.Due_Date).slice(0, 10)));
    const status = late > 0 ? 'Overdue' : S(f.Status) === 'Partial' ? 'Partial' : dayDiff(S(f.Due_Date).slice(0, 10), today) <= 7 ? 'Due' : S(f.Status) || 'Upcoming';
    if ((N(f.Days_Overdue) ?? 0) !== late || S(f.Status) !== status) patches.push({ Fee_ID: S(f.Fee_ID), Days_Overdue: late, Status: status });
    const row = { ...pick(f, ['Fee_ID', 'Student_Name', 'Parent_Name', 'Parent_Phone', 'Course', 'Due_Date', 'Payment_Link', 'Reminder_Count']), Balance_INR: bal, Days_Overdue: late, Director: director };
    if ([1, 7, 15].includes(late)) remind.push(post(C, 'remind', 'FEE_RUN', row));
    else if (dayDiff(S(f.Due_Date).slice(0, 10), today) === 3) link.push(post(C, 'send_link', 'FEE_RUN', row));
  }
  return { patches, posts: [...remind, ...link], remind: remind.length, link: link.length, today };
}

// ACADEMIC_RUN (Monday 11:00) — attendance < 75 or last score < 60, worst first, at most 50.
export function academicRun(i) {
  const C = i.C || {}; const worst = (s) => Math.min(N(s.Attendance_Pct) ?? 100, N(s.Last_Score) ?? 100);
  const due = list(i.students).filter((s) => active(s) && ((N(s.Attendance_Pct) ?? 100) < 75 || (N(s.Last_Score) ?? 100) < 60)).sort((a, b) => worst(a) - worst(b)).slice(0, N(C.max_calls) ?? 50);
  return { posts: due.map((s) => post(C, 'counsel', 'ACADEMIC_RUN', pick(s, ['Student_ID', 'Name', 'Student_Phone', 'Course', 'Attendance_Pct', 'Last_Score', 'Weak_Subjects', 'Mentor']))), count: due.length };
}

// PARENT_RUN (Friday and Monday 17:00 IST) — Friday: report to every active parent, a call only for at-risk students; Monday: one retry.
export function parentRun(i) {
  const C = i.C || {}; const day = C.force_weekday !== undefined && C.force_weekday !== '' ? Number(C.force_weekday) : istWeekday(); const today = istDate();
  const keys = ['Student_ID', 'Name', 'Parent_Name', 'Parent_Phone', 'Course', 'Attendance_Pct', 'Last_Score', 'Class_Rank', 'Performance_Trend', 'Strong_Subjects', 'Weak_Subjects'];
  const students = list(i.students).filter(active); const byId = new Map(students.map((s) => [S(s.Student_ID), s]));
  const risky = (s) => ['At Risk', 'Critical'].includes(S(s.Status)) || (N(s.Attendance_Pct) ?? 100) < 75 || (N(s.Last_Score) ?? 100) < 60;
  if (day === 5) return { reports: students.map((s) => post(C, 'weekly_report', 'PARENT_RUN', { ...pick(s, keys), Is_Retry: 'No' })), calls: students.filter(risky).map((s) => post(C, 'update_call', 'PARENT_RUN', { ...pick(s, keys), Is_Retry: 'No' })), retried: [], day: 'Friday' };
  if (day !== 1) return { reports: [], calls: [], retried: [], day: 'not a run day' };
  const friday = istDate(Date.now() - 3 * 864e5);
  const missed = list(i.calls).filter((c) => S(c.Agent) === 'Parent' && S(c.Status) === 'No Answer' && !S(c.Retry_At) && istDate(Date.parse(S(c.Called_At)) || 0) === friday && byId.has(S(c.Student_ID)));
  return { reports: [], calls: missed.map((c) => post(C, 'update_call', 'PARENT_RUN', { ...pick(byId.get(S(c.Student_ID)), keys), Is_Retry: 'Yes' })), retried: missed.map((c) => ({ Call_ID: S(c.Call_ID), Retry_At: nowIso() })), day: `Monday (${today})` };
}

// ROLLUP (01:30 daily) — per student from attendance + tests; Status; Fee_Status; alerts without duplicates while one is open.
export function rollup(i) {
  const today = istDate(); const from = istDate(Date.now() - 29 * 864e5); const att = list(i.attendance), tests = list(i.tests), fees = list(i.fees);
  const open = new Set(list(i.alerts).filter((a) => S(a.Status) !== 'Resolved').map((a) => `${S(a.Kind)}|${S(a.Student_ID) || S(a.Lead_ID)}`));
  const stats = list(i.students).filter(active).map((s) => {
    const id = S(s.Student_ID); const a = att.filter((r) => S(r.Student_ID) === id && S(r.Date).slice(0, 10) >= from);
    const ts = tests.filter((t) => S(t.Student_ID) === id && S(t.Status) !== 'Absent' && N(t.Score_Pct) !== null).sort((x, y) => S(x.Test_Date).localeCompare(S(y.Test_Date)));
    const pct = ts.map((t) => N(t.Score_Pct)); const avg = pct.length ? Math.round(pct.reduce((x, y) => x + y, 0) / pct.length) : null;
    const last3 = pct.slice(-3); const trend = last3.length < 2 ? 'Stable' : last3[last3.length - 1] - last3[0] >= 5 ? 'Improving' : last3[0] - last3[last3.length - 1] >= 5 ? 'Declining' : 'Stable';
    const subj = {}; for (const t of ts) (subj[S(t.Subject)] ||= []).push(N(t.Score_Pct)); const ranked = Object.entries(subj).map(([k, v]) => [k, v.reduce((x, y) => x + y, 0) / v.length]).sort((x, y) => y[1] - x[1]);
    const attPct = a.length ? Math.round(a.filter((r) => S(r.Status) === 'Present').length * 100 / a.length) : (N(s.Attendance_Pct) ?? null);
    const due = fees.filter((f) => S(f.Student_ID) === id && S(f.Status) !== 'Paid'); const worstLate = Math.max(0, ...due.map((f) => N(f.Days_Overdue) ?? 0));
    const status = (attPct ?? 100) < 60 || (avg ?? 100) < 40 ? 'Critical' : (attPct ?? 100) < 75 || (avg ?? 100) < 60 ? 'At Risk' : 'Active';
    return { s, id, patch: { Student_ID: id, Attendance_Pct: attPct ?? '', Last_Score: pct.length ? pct[pct.length - 1] : '', Avg_Score: avg ?? '', Performance_Trend: trend, Strong_Subjects: ranked.filter((x) => x[1] >= 75).map((x) => x[0]).join(', '),
      Weak_Subjects: ranked.filter((x) => x[1] < 60).map((x) => x[0]).join(', '), Status: status, Fee_Status: !due.length ? 'Paid' : due.some((f) => S(f.Status) === 'Overdue') ? 'Overdue' : 'Due' }, worstLate };
  });
  for (const x of stats) { const peers = stats.filter((y) => S(y.s.Course) === S(x.s.Course) && S(y.s.Batch) === S(x.s.Batch) && y.patch.Avg_Score !== '').sort((p, q) => q.patch.Avg_Score - p.patch.Avg_Score); x.patch.Class_Rank = x.patch.Avg_Score === '' ? '' : peers.indexOf(x) + 1; }
  const alerts = []; const add = (kind, id, row) => { if (!open.has(`${kind}|${id}`)) { open.add(`${kind}|${id}`); alerts.push({ Raised_At: nowIso(), Lead_ID: '', Student_ID: '', Raised_By: 'flow:ROLLUP', Owner: '', Status: 'Open', Kind: kind, ...row }); } };
  for (const x of stats) {
    if (x.patch.Attendance_Pct !== '' && x.patch.Attendance_Pct < 75) add('Attendance', x.id, { Student_ID: x.id, Severity: 'HIGH', Title: `Attendance ${x.patch.Attendance_Pct}% — ${S(x.s.Name)}`, Detail: `Last 30 days, ${S(x.s.Course)} · ${S(x.s.Batch)}.`, Owner: S(x.s.Mentor) });
    if (x.worstLate >= 15) add('Fee', x.id, { Student_ID: x.id, Severity: 'CRITICAL', Title: `Fee overdue ${x.worstLate} days — ${S(x.s.Name)}`, Detail: 'Reminder calls have not cleared it.' });
  }
  for (const l of list(i.leads)) if (S(l.Grade) === 'HOT' && !['Enrolled', 'Lost'].includes(S(l.Stage)) && S(l.Next_Followup_At) && S(l.Next_Followup_At).slice(0, 10) < today)
    add('Lead', S(l.Lead_ID), { Lead_ID: S(l.Lead_ID), Severity: 'MEDIUM', Title: `HOT lead past 48 h — ${S(l.Name)}`, Detail: `${S(l.Course)} · follow-up was due ${S(l.Next_Followup_At).slice(0, 10)}.`, Owner: S(l.Assigned_To) });
  return { patches: stats.map((x) => x.patch), alerts, students: stats.length, today };
}
