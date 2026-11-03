// tests/eduflow-flows.test.mjs — the EduFlow Studio flows, run as Studio would (the kit's flow_sim `simulate`) with fakes that
// answer like the real services. What a model or a provider says is fixed here per case, so every rule the owner asked for is
// checked on the flow JSON that gets imported — not on a copy of the logic.
//   node --test tests/eduflow-flows.test.mjs        (PUCHO_KIT=C:/pucho/kit by default)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = process.env.PUCHO_KIT || 'C:/pucho/kit';
const { simulate } = await import(pathToFileURL(path.join(KIT, 'flow', 'flow_sim.mjs')).href);
const base = (await import(pathToFileURL(path.join(ROOT, 'tools', 'eduflow', 'fakes.mjs')).href)).default;
// flow_sim answers every /api/data GET with [] itself (it plays the app's door); a read here goes to the demo seed instead, so the
// staff lookups and the schedules run on real rows. Writes still go through flow_sim's door (it numbers ids and checks the body).
function seedReads(node) {
  for (let n = node; n; n = n.nextAction) {
    const i = n.settings?.input; if (n.type === 'PIECE' && i?.method === 'GET') i.url = String(i.url).replace('/api/data/', '/api/seed/');
    for (const c of n.children || []) seedReads(c); if (n.firstLoopAction) seedReads(n.firstLoopAction);
  }
}
const flowOf = (n) => { const f = JSON.parse(fs.readFileSync(path.join(ROOT, 'workflows', n, `${n}.json`), 'utf8')); seedReads(f.template.trigger); return f; };
const sample = (k) => JSON.parse(fs.readFileSync(path.join(ROOT, 'workflows', 'samples', `${k}.md`), 'utf8').match(/```json\s*([\s\S]*?)```/)[1]);

// fakes: a CDM answer and a call / WhatsApp outcome chosen per case
function fakes({ cdm = {}, answered = true, waOk = true } = {}) {
  return async (piece, inputs, step) => {
    if (piece === 'pucho-cdm:extract') return { fields: { entities: Object.entries(cdm).map(([type, text], i) => ({ type, text: String(text), confidence: 0.97 - i / 100 })) } };
    if (piece === 'ai-voice-call:getCallDetails' && !answered) return { apiResponse: { data: { status: 'no-answer', duration: 0, transcript: '' } } };
    if (piece === 'pucho-whatsapp:send_template_message' && !waOk) return { error: { message: 'template not approved' }, success: false };
    return base(piece, inputs, step);
  };
}
async function run(flow, body, f) {
  const r = await simulate(flowOf(flow), body, f);
  assert.deepEqual(r.failures, [], `${flow}: ${r.failures.join(' | ')}`);
  return r;
}

test('PARENT_UPDATE.update_call — a concerned parent who wants the director → Escalated, HIGH alert, the director WhatsApped', async () => {
  const r = await run('PARENT_UPDATE', sample('PARENT_UPDATE.update_call'), fakes({ cdm: { sentiment: 'Concerned', feedback: 'Worried about Physics marks', concern: 'Falling marks in Physics', needs_escalation: 'Yes' } }));
  const b = r.codeOut.step_update_call_build;
  assert.equal(b.status, 'Escalated'); assert.equal(b.call.Status, 'Escalated'); assert.equal(b.call.Needs_Followup, 'Yes'); assert.equal(b.call.Agent, 'Parent');
  assert.equal(b.patch.Parent_Sentiment, 'Concerned'); assert.equal(b.patch.Parent_Concern, 'Falling marks in Physics');
  assert.equal(b.alerts.length, 1); assert.equal(b.alerts[0].Title, 'Parent Concern - Kavya Patel - NEET'); assert.equal(b.alerts[0].Detail, 'Mrs. M. Patel: Falling marks in Physics');
  assert.equal(b.alerts[0].Severity, 'HIGH'); assert.equal(b.alerts[0].Kind, 'Parent'); assert.equal(b.alerts[0].Owner, 'Dev Dabi');
  assert.equal(b.staff.length, 1); assert.equal(b.staff[0].to_e164, '+919826000001');
});
test('PARENT_UPDATE.update_call — Concerned without an escalation still goes to the Concerns tab (Needs_Followup Yes), status Completed', async () => {
  const r = await run('PARENT_UPDATE', sample('PARENT_UPDATE.update_call'), fakes({ cdm: { sentiment: 'Concerned', feedback: 'Wants more tests', concern: 'More practice', needs_escalation: 'No' } }));
  const b = r.codeOut.step_update_call_build;
  assert.equal(b.status, 'Completed'); assert.equal(b.call.Needs_Followup, 'Yes'); assert.equal(b.alerts.length, 1);
});
test('PARENT_UPDATE.update_call — a happy parent: Completed, no alert, nobody WhatsApped', async () => {
  const r = await run('PARENT_UPDATE', sample('PARENT_UPDATE.update_call'), fakes({ cdm: { sentiment: 'Happy', feedback: 'Happy with the batch', concern: '', needs_escalation: 'No' } }));
  const b = r.codeOut.step_update_call_build;
  assert.equal(b.status, 'Completed'); assert.equal(b.call.Needs_Followup, 'No'); assert.deepEqual(b.alerts, []); assert.deepEqual(b.staff, []);
});
test('PARENT_UPDATE.update_call — no answer on Friday → retry Monday; no answer on the Monday retry → closed', async () => {
  const fri = (await run('PARENT_UPDATE', sample('PARENT_UPDATE.update_call'), fakes({ answered: false }))).codeOut.step_update_call_build;
  assert.equal(fri.status, 'No Answer'); assert.equal(fri.patch.Parent_Sentiment, 'No Answer'); assert.match(fri.call.Outcome, /retry on Monday/); assert.deepEqual(fri.alerts, []);
  const mon = (await run('PARENT_UPDATE', { ...sample('PARENT_UPDATE.update_call'), Is_Retry: 'Yes' }, fakes({ answered: false }))).codeOut.step_update_call_build;
  assert.equal(mon.call.Outcome, 'No answer twice — closed');
});
test('PARENT_UPDATE.weekly_report — the template from the record, no AI step on the path', async () => {
  const r = await run('PARENT_UPDATE', sample('PARENT_UPDATE.weekly_report'), fakes());
  assert.ok(!r.trace.some((t) => /_ai$|_call$/.test(t)), 'no AI or call step');
  const b = r.codeOut.step_weekly_report_build;
  assert.deepEqual(b.variables, { 1: 'Mrs. P. Mehra', 2: 'Rohan Mehra', 3: '96', 4: '89', 5: '1', 6: 'Improving' });
  assert.equal(r.codeOut.step_weekly_report_after.messages[0].Type, 'Weekly Report');
});
test('ABSENCE.absent — the notice sent → WhatsApp Sent; a repeat absence alerts the NEET counsellor', async () => {
  const r = await run('ABSENCE', sample('ABSENCE.absent'), fakes());
  assert.equal(r.codeOut.step_absent_after.patch.Call_Status, 'WhatsApp Sent');
  const b = r.codeOut.step_absent_build; assert.equal(b.alerts.length, 1); assert.equal(b.alerts[0].Owner, 'Priya Saxena'); assert.equal(b.staff[0].to_e164, '+919826000002');
  assert.ok(!r.trace.some((t) => /voice|_call$/.test(t)), 'never a call');
});
test('ABSENCE.absent — a refused WhatsApp → Failed; a first absence raises nothing', async () => {
  const r = await run('ABSENCE', { ...sample('ABSENCE.absent'), Needs_Followup: 'No', Absences_This_Week: 1 }, fakes({ waOk: false }));
  assert.equal(r.codeOut.step_absent_after.patch.Call_Status, 'Failed');
  assert.deepEqual(r.codeOut.step_absent_build.alerts, []); assert.deepEqual(r.codeOut.step_absent_build.staff, []);
});
test('ATTENDANCE.save_batch — one ABSENCE post per absentee, none for a present student', async () => {
  const r = await run('ATTENDANCE', sample('ATTENDANCE.save_batch'), fakes());
  const a = r.codeOut.step_save_batch_absentees; assert.equal(a.absent, 1); assert.equal(a.posts[0].Student_ID, 'ST-2026-0122'); assert.equal(a.posts[0].action, 'absent');
  assert.equal(r.codeOut.step_save_batch_lines.count, 3);
});
test('ADMISSION_CALL — HOT needs score ≥ 80: HOT 92 → HOT, 48 h follow-up, a counsellor; HOT 70 → WARM', async () => {
  const hot = (await run('ADMISSION_CALL', sample('ADMISSION_CALL.new_lead'), fakes({ cdm: { grade: 'HOT', score: '92', summary: 'Ready to join', next_action: 'Book a demo' } }))).codeOut.step_new_lead_build;
  assert.equal(hot.grade, 'HOT'); assert.ok(hot.lead.Next_Followup_At); assert.ok(hot.lead.Assigned_To); assert.equal(hot.staff.length, 1);
  const warm = (await run('ADMISSION_CALL', sample('ADMISSION_CALL.new_lead'), fakes({ cdm: { grade: 'HOT', score: '70', summary: 'Interested', next_action: 'Call back' } }))).codeOut.step_new_lead_build;
  assert.equal(warm.grade, 'WARM'); assert.equal(warm.lead.Next_Followup_At, ''); assert.deepEqual(warm.staff, []);
});
test('FEE_REMINDER.remind — day 15 with no promise → CRITICAL alert to the director; a promise → none', async () => {
  const none = (await run('FEE_REMINDER', sample('FEE_REMINDER.remind'), fakes({ cdm: { parent_response: 'Cannot pay this month', promise_date: '' } }))).codeOut.step_remind_build;
  assert.equal(none.alerts.length, 1); assert.equal(none.alerts[0].Severity, 'CRITICAL'); assert.equal(none.alerts[0].Owner, 'Dev Dabi'); assert.equal(none.patch.Reminder_Count, 3);
  const prom = (await run('FEE_REMINDER', sample('FEE_REMINDER.remind'), fakes({ cdm: { parent_response: 'Will pay Friday', promise_date: '2026-11-07' } }))).codeOut.step_remind_build;
  assert.deepEqual(prom.alerts, []); assert.equal(prom.patch.Promise_Date, '2026-11-07');
});
test('every schedule and action flow runs end to end on the demo data', async () => {
  for (const [f, a] of [['FEE_RUN', 'run'], ['ACADEMIC_RUN', 'run'], ['PARENT_RUN', 'run'], ['ROLLUP', 'run'], ['STUDENT_MANAGE', 'enrol'], ['SEND_WHATSAPP', 'send_update'], ['ACADEMIC_CALL', 'counsel'], ['FEE_REMINDER', 'send_link']])
    await run(f, sample(`${f}.${a}`), fakes({ cdm: { issue_type: 'ACADEMIC', main_issue: 'Weak in Biology', needs_mentor: 'Yes', needs_counsellor: 'No' } }));
});
