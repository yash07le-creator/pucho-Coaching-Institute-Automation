// tests/eduflow-flowlib.test.mjs — the schedule rules in tools/eduflow/flowlib.mjs on a fixed day (the flows themselves are tested
// end to end in tests/eduflow-flows.test.mjs).   node --test tests/eduflow-flowlib.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parentRun, feeRun, academicRun, callFacts, sendOk } from '../tools/eduflow/flowlib.mjs';

const C = { app_url: 'https://app.test', inbound_token: 't', company_name: 'EduFlow' };
const st = (id, o) => ({ Student_ID: id, Name: id, Parent_Name: 'P', Parent_Phone: '+919000000000', Course: 'NEET', Status: 'Active', Attendance_Pct: 90, Last_Score: 80, ...o });
const students = [st('A'), st('B', { Status: 'At Risk' }), st('C', { Status: 'Critical' }), st('D', { Attendance_Pct: 70 }), st('E', { Last_Score: 55 }), st('F', { Status: 'Inactive', Attendance_Pct: 10 })];

test('PARENT_RUN Friday — a report to every active parent (5), a call only to the at-risk ones (B, C, D, E)', () => {
  const r = parentRun({ C: { ...C, force_weekday: 5 }, students, calls: [] });
  assert.equal(r.reports.length, 5); assert.ok(r.reports.every((x) => x.action === 'weekly_report'));
  assert.deepEqual(r.calls.map((x) => x.Student_ID), ['B', 'C', 'D', 'E']); assert.ok(r.calls.every((x) => x.action === 'update_call' && x.Is_Retry === 'No'));
  assert.equal(r.calls[0].app_url, 'https://app.test');
});
test('PARENT_RUN Monday — only last Friday\'s unanswered parent calls not yet retried, once', () => {
  const friday = new Date(Date.now() - 3 * 864e5).toISOString();
  const calls = [
    { Call_ID: 'c1', Agent: 'Parent', Status: 'No Answer', Called_At: friday, Student_ID: 'B', Retry_At: '' },
    { Call_ID: 'c2', Agent: 'Parent', Status: 'No Answer', Called_At: friday, Student_ID: 'C', Retry_At: friday },   // already retried
    { Call_ID: 'c3', Agent: 'Parent', Status: 'Completed', Called_At: friday, Student_ID: 'D', Retry_At: '' },
    { Call_ID: 'c4', Agent: 'Fee', Status: 'No Answer', Called_At: friday, Student_ID: 'E', Retry_At: '' },
  ];
  const r = parentRun({ C: { ...C, force_weekday: 1 }, students, calls });
  assert.deepEqual(r.calls.map((x) => [x.Student_ID, x.Is_Retry]), [['B', 'Yes']]); assert.deepEqual(r.retried.map((x) => x.Call_ID), ['c1']); assert.equal(r.reports.length, 0);
});
test('PARENT_RUN on any other day does nothing', () => {
  const r = parentRun({ C: { ...C, force_weekday: 3 }, students, calls: [] });
  assert.equal(r.reports.length + r.calls.length + r.retried.length, 0);
});
test('FEE_RUN — Overdue from the day after Due_Date; a call on day 1, 7 and 15; the link 3 days before', () => {
  const fee = (id, due, o) => ({ Fee_ID: id, Due_Date: due, Status: 'Due', Amount_INR: 1000, Paid_INR: 0, Balance_INR: 1000, Days_Overdue: 0, Parent_Phone: '+919000000000', ...o });
  const r = feeRun({ C: { ...C, today_override: '2026-11-20' }, team: [{ Name: 'Dev Dabi', Role: 'Director', Active: 'true' }],
    fees: [fee('d1', '2026-11-19'), fee('d7', '2026-11-13'), fee('d15', '2026-11-05'), fee('d2', '2026-11-18'), fee('soon', '2026-11-23'), fee('paid', '2026-11-19', { Status: 'Paid' })] });
  assert.deepEqual(r.posts.filter((p) => p.action === 'remind').map((p) => p.Fee_ID).sort(), ['d1', 'd15', 'd7']);
  assert.deepEqual(r.posts.filter((p) => p.action === 'send_link').map((p) => p.Fee_ID), ['soon']);
  assert.equal(r.patches.find((p) => p.Fee_ID === 'd2').Status, 'Overdue'); assert.equal(r.patches.find((p) => p.Fee_ID === 'd2').Days_Overdue, 2);
  assert.ok(!r.patches.some((p) => p.Fee_ID === 'paid')); assert.equal(r.posts[0].Director, 'Dev Dabi');
});
test('ACADEMIC_RUN — attendance < 75 or last score < 60, active only, worst first, at most max_calls', () => {
  const r = academicRun({ C: { ...C, max_calls: 2 }, students });
  assert.deepEqual(r.posts.map((p) => p.Student_ID), ['E', 'D']);
});
test('callFacts / sendOk read the provider answers defensively', () => {
  assert.equal(callFacts({ apiResponse: { data: { status: 'completed', duration: 90, transcript: 'AI: hello there, parent: yes we are fine thank you' } } }).answered, true);
  assert.equal(callFacts({ apiResponse: { data: { status: 'no-answer', transcript: '' } } }).answered, false);
  assert.equal(callFacts(undefined).answered, false);
  assert.equal(sendOk({ success: true }), true); assert.equal(sendOk({ error: { message: 'x' } }), false); assert.equal(sendOk(undefined), false);
});
