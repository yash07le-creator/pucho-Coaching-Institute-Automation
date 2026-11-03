'use client';
// ScoreBook — the Test scores page (R19), owner request 3 Nov 2026. One section owns the list, its filters, the Export and the
// "+ Add score" grid, so the export is exactly the filtered view on screen (the kernel table keeps its filters to itself).
// + Add score opens a batch grid: pick the batch, test, subject, out-of and date; every active student of the batch is listed;
// type each mark (Enter / ↓ next, ↑ previous) or tick Absent; ONE SCORES.save_batch writes the test_runs row and every student's
// tests row in a single transaction. Marks between 0 and Out of, and a mark or Absent for everyone, are checked here (code);
// Score_Pct is computed by the server. A student who already has this test + subject is shown, not sent again (unique rule).
// One mark is corrected with the kernel's Correct marks modal (edit_score), opened from a row.
import { useMemo, useRef, useState } from 'react';
import { AutoComplete, Button, Checkbox, DatePicker, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { CalendarDays, ClipboardList, Download, Pencil, Plus, Search } from 'lucide-react';
import { Avatar } from '../components/ui/primitives';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { CARD } from '../module/Charts';
import { bizToday } from '../module/Fields';
import { pickerProps, selectProps } from '../config/popup';
import { runAction, whoAmI } from '../utils/api';

const PERIODS = [ { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: 'month', label: 'This month' }, { value: 'all', label: 'All time' } ];
const PAGE = 20;
const day = (v) => String(v ?? '').slice(0, 10);
const key = (v) => String(v ?? '').trim().toLowerCase();
const uniq = (xs) => [...new Set(xs.filter(Boolean))].sort();
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const isAbsent = (r) => r.Status === 'Absent';
const slug = (v, all) => (v ? String(v).replace(/[—–]/g, ' ').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') : all);
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function since(period, today) {
  if (period === 'all') return '';
  if (period === 'month') return `${today.slice(0, 8)}01`;
  return dayjs(today).subtract(period === '7d' ? 6 : 29, 'day').format('YYYY-MM-DD');
}

export default function ScoreBook({ data, rows, openModal }) {
  const today = bizToday();
  const scores = rows ?? data?.tests ?? [];
  const students = useMemo(() => (data?.students ?? []).filter((s) => s.Status !== 'Inactive'), [data]);
  const [q, setQ] = useState(''); const [fBatch, setFBatch] = useState(); const [fCourse, setFCourse] = useState(); const [fSubject, setFSubject] = useState();
  const [period, setPeriod] = useState('30d'); const [page, setPage] = useState(0); const [entering, setEntering] = useState(false);

  const opts = useMemo(() => ({ batch: uniq([...scores.map((r) => r.Batch), ...students.map((s) => s.Batch)]), course: uniq(scores.map((r) => r.Course)), subject: uniq(scores.map((r) => r.Subject)) }), [scores, students]);
  const filtered = useMemo(() => {
    const from = since(period, today); const n = key(q);
    return scores.filter((r) => (!fBatch || r.Batch === fBatch) && (!fCourse || r.Course === fCourse) && (!fSubject || r.Subject === fSubject)
      && (!from || day(r.Test_Date) >= from) && (!n || key(`${r.Name} ${r.Student_ID} ${r.Test_Name} ${r.Subject}`).includes(n)))
      .sort((a, b) => day(b.Test_Date).localeCompare(day(a.Test_Date)) || String(a.Name).localeCompare(String(b.Name)));
  }, [scores, fBatch, fCourse, fSubject, period, q, today]);
  const scored = filtered.filter((r) => !isAbsent(r) && r.Score_Pct !== '' && r.Score_Pct != null);
  const avg = scored.length ? Math.round(scored.reduce((t, r) => t + Number(r.Score_Pct), 0) / scored.length) : null;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE)); const pg = Math.min(page, pages - 1);
  const shown = filtered.slice(pg * PAGE, pg * PAGE + PAGE);
  const narrow = (set) => (v) => { set(v); setPage(0); };

  function exportCSV() {
    if (!filtered.length) { toast.error('Nothing to export — no score matches these filters'); return; }
    const head = ['Student ID', 'Student Name', 'Course', 'Batch', 'Test Name', 'Subject', 'Test Date', 'Marks Obtained', 'Max Marks', 'Score Percentage (%)', 'Status'];
    const body = filtered.map((r) => [r.Student_ID, r.Name, r.Course, r.Batch, r.Test_Name, r.Subject, day(r.Test_Date), isAbsent(r) ? '' : r.Marks, r.Max_Marks, isAbsent(r) ? '' : r.Score_Pct, isAbsent(r) ? 'Absent' : 'Scored']);
    // BOM first, so Excel reads the file as UTF-8 (the — in batch names)
    const csv = '﻿' + [head, ...body].map((line) => line.map(csvCell).join(',')).join('\r\n');
    const name = `Test_Scores_${slug(fBatch, 'All-Batches')}_${slug(fSubject, 'All-Subjects')}_${today}.csv`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast.success(`Exported ${plural(filtered.length, 'score')}`, { description: name });
  }

  const sel = (label, value, set, options) => (
    <div className="w-full sm:w-[170px]"><Select {...selectProps} aria-label={label} placeholder={label} allowClear value={value} onChange={narrow(set)} options={options.map((v) => ({ value: v, label: v }))} className="os-control" /></div>
  );
  return (
    <section className={`${CARD} p-0`} data-os-scorebook aria-label="Test scores">
      <div className="flex flex-wrap items-center gap-2 p-4 border-b border-[color:var(--hair-5)]" data-os-scorebook-tools>
        {/* .os-control fills its box, so each control's width lives on its wrapper */}
        <div className="w-full sm:w-[220px]"><Input aria-label="Search scores" value={q} onChange={(e) => narrow(setQ)(e.target.value)} allowClear placeholder="Search student or test" prefix={<Search className="w-4 h-4 text-ink-4" aria-hidden />} className="os-control" /></div>
        {sel('Batch', fBatch, setFBatch, opts.batch)}
        {sel('Course', fCourse, setFCourse, opts.course)}
        {sel('Subject', fSubject, setFSubject, opts.subject)}
        <div className="w-full sm:w-[150px]"><Select {...selectProps} aria-label="Period" value={period} onChange={narrow(setPeriod)} options={PERIODS} className="os-control" /></div>
        <div className="flex gap-2 sm:ml-auto">
          <Button icon={<Download className="w-4 h-4" />} onClick={exportCSV} data-os-scores-export>Export Excel / CSV</Button>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setEntering(true)} data-os-scores-add>Add score</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8"><EmptyState icon={ClipboardList} title={scores.length ? 'No score matches these filters' : 'No scores yet'} description={scores.length ? 'Widen the period or clear a filter.' : 'Enter a whole batch at once with Add score.'} action={scores.length ? undefined : { label: 'Add score', onClick: () => setEntering(true) }} /></div>
      ) : (
        <>
          <p className="px-4 pt-3 text-[13px] text-ink-2 tabular" data-os-scorebook-summary>{plural(filtered.length, 'score')}{avg != null && <> · average <b className="text-ink">{avg}%</b></>}{filtered.length > scored.length && <> · {filtered.length - scored.length} absent</>}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" data-os-scorebook-table>
              <thead><tr className="text-left text-[12px] text-ink-3 border-b border-[color:var(--hair-5)]">
                <th className="px-4 py-2.5 font-medium">Student</th><th className="px-4 py-2.5 font-medium">Test</th><th className="px-4 py-2.5 font-medium">Subject</th>
                <th className="px-4 py-2.5 font-medium text-right">Marks</th><th className="px-4 py-2.5 font-medium text-right">Out of</th><th className="px-4 py-2.5 font-medium text-right">Score</th>
                <th className="px-4 py-2.5 font-medium">Date</th><th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody className="divide-y divide-[color:var(--hair-5)]">
                {shown.map((r) => (
                  <tr key={r.Score_ID} data-os-score={r.Score_ID}>
                    <td className="px-4 py-2.5"><p className="font-medium text-ink">{r.Name}</p><p className="text-[12px] text-ink-3">{r.Course} · {r.Batch}</p></td>
                    <td className="px-4 py-2.5 text-ink-2">{r.Test_Name}</td>
                    <td className="px-4 py-2.5"><span className="inline-flex px-2 py-0.5 rounded-[var(--r-6)] bg-black/[0.05] text-[12px] text-ink-2">{r.Subject}</span></td>
                    <td className="px-4 py-2.5 text-right tabular text-ink">{isAbsent(r) ? <StatusBadge status="Absent" size="small" /> : r.Marks}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-2">{r.Max_Marks}</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-ink">{isAbsent(r) || r.Score_Pct === '' || r.Score_Pct == null ? '—' : `${r.Score_Pct}%`}</td>
                    <td className="px-4 py-2.5 text-ink-2 whitespace-nowrap tabular">{r.Test_Date ? dayjs(day(r.Test_Date)).format('DD MMM YYYY') : '—'}</td>
                    <td className="px-2 py-2.5 text-right"><Button type="text" size="small" icon={<Pencil className="w-3.5 h-3.5" />} aria-label={`Correct marks — ${r.Name}, ${r.Test_Name}`} onClick={() => openModal?.('edit_score', r)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[color:var(--hair-5)] text-[13px] text-ink-2">
              <span className="tabular">{pg * PAGE + 1}–{Math.min(filtered.length, pg * PAGE + PAGE)} of {filtered.length}</span>
              <Button size="small" disabled={pg === 0} onClick={() => setPage(pg - 1)}>Previous</Button>
              <Button size="small" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      {entering && <ScoreGrid students={students} scores={scores} batches={uniq(students.map((s) => s.Batch))} subjects={opts.subject} today={today} onClose={() => setEntering(false)} />}
    </section>
  );
}

function ScoreGrid({ students, scores, batches, subjects, today, onClose }) {
  const [batch, setBatch] = useState(); const [test, setTest] = useState(''); const [subject, setSubject] = useState('');
  const [max, setMax] = useState(100); const [date, setDate] = useState(today);
  const [marks, setMarks] = useState({}); const [absent, setAbsent] = useState(() => new Set());
  const [errors, setErrors] = useState({}); const [saving, setSaving] = useState(false);
  const listRef = useRef(null);

  const roster = useMemo(() => students.filter((s) => s.Batch === batch).sort((a, b) => String(a.Name).localeCompare(String(b.Name))), [students, batch]);
  // a student who already has this test + subject is shown, never sent again (tests: unique Test_Name + Student_ID + Subject)
  const done = useMemo(() => new Map(test.trim() && subject.trim() ? scores.filter((r) => key(r.Test_Name) === key(test) && key(r.Subject) === key(subject)).map((r) => [r.Student_ID, r]) : []), [scores, test, subject]);
  const todo = roster.filter((s) => !done.has(s.Student_ID));
  const num = (sid) => { const v = String(marks[sid] ?? '').trim(); return v === '' ? null : Number(v); };
  const bad = (sid) => { const n = num(sid); return n != null && (!Number.isFinite(n) || n < 0 || n > max); };
  const nAbsent = todo.filter((s) => absent.has(s.Student_ID)).length;
  const scoredRows = todo.filter((s) => !absent.has(s.Student_ID) && num(s.Student_ID) != null && !bad(s.Student_ID));
  const batchAvg = scoredRows.length && max > 0 ? Math.round(scoredRows.reduce((t, s) => t + num(s.Student_ID), 0) * 100 / (scoredRows.length * max)) : null;

  const move = (from, step) => {
    const inputs = [...(listRef.current?.querySelectorAll('input[data-os-mark]:not([disabled])') ?? [])];
    const i = inputs.indexOf(from); const next = inputs[i + step]; if (next) { next.focus(); next.select(); }
  };
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); move(e.currentTarget, 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(e.currentTarget, -1); }
  };
  const toggleAbsent = (sid, on) => setAbsent((prev) => { const n = new Set(prev); if (on) n.add(sid); else n.delete(sid); return n; });

  async function save() {
    const e = {};
    if (!batch) e.batch = 'Pick the batch';
    if (!test.trim()) e.test = 'Name the test';
    if (!subject.trim()) e.subject = 'Name the subject';
    if (!(max > 0)) e.max = 'Out of must be more than 0';
    setErrors(e); if (Object.keys(e).length) return;
    const wrong = todo.filter((s) => !absent.has(s.Student_ID) && bad(s.Student_ID));
    const missing = todo.filter((s) => !absent.has(s.Student_ID) && num(s.Student_ID) == null);
    if (wrong.length || missing.length) {
      const first = wrong[0] ?? missing[0];
      const names = (xs) => xs.slice(0, 4).map((s) => s.Name).join(', ') + (xs.length > 4 ? ` +${xs.length - 4}` : '');
      toast.error([wrong.length && `${plural(wrong.length, 'mark')} outside 0–${max}`, missing.length && `${plural(missing.length, 'student')} without marks`].filter(Boolean).join(' · '), {
        description: [wrong.length && `Over the limit: ${names(wrong)}`, missing.length && `No marks — enter them or tick Absent: ${names(missing)}`].filter(Boolean).join('\n') });
      listRef.current?.querySelector(`input[data-os-mark="${first.Student_ID}"]`)?.focus();
      return;
    }
    const lines = todo.map((s) => {
      const off = absent.has(s.Student_ID);
      return { Test_Date: date, Test_Name: test.trim(), Student_ID: s.Student_ID, Name: s.Name, Course: s.Course, Batch: s.Batch, Subject: subject.trim(),
        Marks: off ? '' : num(s.Student_ID), Max_Marks: max, Status: off ? 'Absent' : 'Scored' };
    });
    setSaving(true);
    try {
      await runAction({ flow: 'SCORES', action: 'save_batch' }, {
        Test_Date: date, Test_Name: test.trim(), Batch: batch, Subject: subject.trim(), Max_Marks: max,
        Total_Count: lines.length, Scored_Count: lines.length - nAbsent, Absent_Count: nAbsent, Avg_Pct: batchAvg ?? 0, Marked_By: whoAmI(), lines,
      });
      toast.success(`Successfully recorded scores for ${plural(lines.length, 'student')}!`, { description: `${test.trim()} · ${subject.trim()} · ${batch}` });
      onClose();
    } catch (err) {
      toast.error('Scores not saved — nothing was written, the grid is as you left it', { description: err.errors ? Object.values(err.errors).join(' · ') : err.message, duration: 12000 });
    } finally { setSaving(false); }
  }

  const field = (label, k, control, w = '') => (
    <div className={`min-w-0 ${w}`}>
      <label className="block">{label}<span className="text-bad-text"> *</span></label>
      {control}
      {errors[k] && <p className="text-[12px] text-bad-text mt-1">{errors[k]}</p>}
    </div>
  );
  return (
    <Modal isOpen onClose={() => !saving && onClose()} title="Add scores — whole batch" size="xl">
      <div className="os-form space-y-4" data-os-score-grid>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {field('Batch', 'batch', <Select {...selectProps} aria-label="Batch" placeholder="Pick a batch" value={batch} status={errors.batch ? 'error' : undefined}
            onChange={(v) => { setBatch(v); setMarks({}); setAbsent(new Set()); setErrors((x) => ({ ...x, batch: undefined })); }} options={batches.map((b) => ({ value: b, label: b }))} className="os-control" />, 'lg:col-span-2')}
          {field('Test name', 'test', <Input aria-label="Test name" value={test} onChange={(e) => { setTest(e.target.value); setErrors((x) => ({ ...x, test: undefined })); }} placeholder="Weekly Test 15" maxLength={80} status={errors.test ? 'error' : undefined} className="os-control" />)}
          {field('Subject', 'subject', <AutoComplete {...selectProps} aria-label="Subject" value={subject} onChange={(v) => { setSubject(v); setErrors((x) => ({ ...x, subject: undefined })); }} placeholder="Physics"
            options={subjects.filter((x) => key(x).includes(key(subject))).map((x) => ({ value: x }))} status={errors.subject ? 'error' : undefined} className="os-control" />)}
          {field('Out of', 'max', <InputNumber aria-label="Out of" min={1} max={1000} value={max} onChange={(v) => setMax(Number(v) || 0)} status={errors.max ? 'error' : undefined} className="os-control w-full" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {field('Date', 'date', <DatePicker {...pickerProps} aria-label="Test date" value={dayjs(date)} format="D MMM YYYY" allowClear={false} disabledDate={(v) => v && v.format('YYYY-MM-DD') > today}
            suffixIcon={<CalendarDays className="w-4 h-4 text-ink-4" aria-hidden />} onChange={(v) => setDate(v ? v.format('YYYY-MM-DD') : today)} className="os-control" />)}
        </div>

        {!batch ? (
          <p className="rounded-[var(--r-8)] border border-dashed border-[color:var(--hair-5)] px-4 py-6 text-center text-[13px] text-ink-3">Pick a batch — its active students are listed here.</p>
        ) : roster.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-ink-3">No active students in {batch}.</p>
        ) : (
          <>
            <p className="text-[13px] text-ink-2 tabular" aria-live="polite" data-os-grid-summary>
              Total: <b className="text-ink">{todo.length}</b> <span className="text-ink-3">|</span> Scored: <b className="text-ink">{scoredRows.length}</b> <span className="text-ink-3">|</span> Absent: <b className={nAbsent ? 'text-bad-text' : 'text-ink'}>{nAbsent}</b> <span className="text-ink-3">|</span> Batch Avg: <b className="text-ink">{batchAvg == null ? '—' : `${batchAvg}%`}</b>
              {done.size > 0 && <span className="text-ink-3"> · {done.size} already saved for this test</span>}
            </p>
            {/* the roster scrolls under a sticky header; Enter / ↓ next mark, ↑ previous */}
            <div ref={listRef} className="max-h-[48vh] overflow-auto rounded-[var(--r-8)] border border-[color:var(--hair-5)]" data-os-grid-roster>
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-[color:var(--surface)]"><tr className="text-left text-[12px] text-ink-3 border-b border-[color:var(--hair-5)]">
                  <th className="px-3 py-2 font-medium w-10">#</th><th className="px-3 py-2 font-medium">Student</th><th className="px-3 py-2 font-medium">Roll no</th>
                  <th className="px-3 py-2 font-medium w-[130px]">Marks / {max || '—'}</th><th className="px-3 py-2 font-medium w-[90px]">Absent</th>
                </tr></thead>
                <tbody className="divide-y divide-[color:var(--hair-5)]">
                  {roster.map((s, i) => {
                    const sid = s.Student_ID; const prev = done.get(sid); const off = absent.has(sid); const wrong = bad(sid);
                    return (
                      <tr key={sid} data-os-grid-row={sid} className={prev ? 'opacity-70' : ''}>
                        <td className="px-3 py-2 text-ink-3 tabular">{i + 1}</td>
                        <td className="px-3 py-2"><div className="flex items-center gap-2 min-w-0"><Avatar name={s.Name} size={26} /><div className="min-w-0"><p className="font-medium text-ink truncate">{s.Name}</p><p className="text-[12px] text-ink-3 truncate">{s.Course}</p></div></div></td>
                        <td className="px-3 py-2 font-mono text-[12px] text-ink-2">{sid}</td>
                        <td className="px-3 py-2">
                          {prev ? <span className="text-[12px] text-ink-3">Saved: {isAbsent(prev) ? 'Absent' : `${prev.Marks}/${prev.Max_Marks}`}</span> : (
                            <>
                              <Input aria-label={`Marks — ${s.Name}`} inputMode="decimal" value={off ? '' : (marks[sid] ?? '')} disabled={off || saving} placeholder={off ? 'Absent' : `0–${max}`}
                                data-os-mark={sid} status={wrong ? 'error' : undefined} onKeyDown={onKey} onFocus={(e) => e.target.select()}
                                onChange={(e) => setMarks((m) => ({ ...m, [sid]: e.target.value.replace(/[^0-9.]/g, '') }))} className="os-control tabular" />
                              {wrong && <p className="text-[12px] text-bad-text mt-0.5">0 to {max}</p>}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2">{!prev && <Checkbox checked={off} disabled={saving} onChange={(e) => toggleAbsent(sid, e.target.checked)} aria-label={`${s.Name} absent`}>Absent</Checkbox>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-[color:var(--hair-5)]">
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="primary" onClick={save} loading={saving} disabled={!batch || todo.length === 0} data-os-grid-save>Save All Scores ({todo.length})</Button>
        </div>
      </div>
    </Modal>
  );
}
