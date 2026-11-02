'use client';
// AttendanceSheet — mark a whole batch for one date (R14). Present is the app's own insert (no workflow, no credits);
// Absent goes to ABSENCE.absent, which WhatsApps the parent on a first absence in 7 days and calls them on a repeat (R15).
// The repeat count is computed here from the marks already stored (rule zero: code counts, the flow only acts on it).
import { useMemo, useState } from 'react';
import { Button, Select } from 'antd';
import { toast } from 'sonner';
import { CalendarDays, CheckCheck, MessageCircle, PhoneCall } from 'lucide-react';
import { Avatar, Progress } from '../components/ui/primitives';
import StatusBadge from '../components/StatusBadge';
import { CARD, SECTION_TITLE } from '../module/Charts';
import { bizToday } from '../module/Fields';
import { selectProps } from '../config/popup';
import { runAction, whoAmI } from '../utils/api';

const BATCH_ORDER = ['Batch A — Morning', 'Batch B — Evening', 'Batch C — Weekend'];
const CALL_FROM = 2;   // os.yaml ABSENCE.constants.call_from_absence — the absence in 7 days that gets an AI call
const day = (v) => String(v ?? '').slice(0, 10);
const shift = (iso, n) => { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

export default function AttendanceSheet({ data }) {
  const students = useMemo(() => (data?.students ?? []).filter((s) => s.Status !== 'Inactive'), [data]);
  const marks = data?.attendance ?? [];
  const batches = useMemo(() => [...new Set(students.map((s) => s.Batch).filter(Boolean))].sort((a, b) => BATCH_ORDER.indexOf(a) - BATCH_ORDER.indexOf(b)), [students]);
  const today = bizToday();
  const [batch, setBatch] = useState(null);
  const [date, setDate] = useState(today);
  const [absent, setAbsent] = useState(() => new Set());
  const [saving, setSaving] = useState(null);   // { done, total } while the marks are written
  const current = batch ?? batches[0];

  const roster = useMemo(() => students.filter((s) => s.Batch === current).sort((a, b) => String(a.Name).localeCompare(String(b.Name))), [students, current]);
  const marked = useMemo(() => new Map(marks.filter((m) => day(m.Date) === date).map((m) => [m.Student_ID, m])), [marks, date]);
  const pending = roster.filter((s) => !marked.has(s.Student_ID));
  const absencesBefore = (sid, from) => marks.filter((m) => m.Student_ID === sid && m.Status === 'Absent' && day(m.Date) >= from && day(m.Date) < date).length;
  const weekCount = (sid) => absencesBefore(sid, shift(date, -6)) + 1;
  const monthCount = (sid) => absencesBefore(sid, `${date.slice(0, 8)}01`) + 1;

  const pick = (b) => { setBatch(b); setAbsent(new Set()); };
  const pickDate = (v) => { setDate(v || today); setAbsent(new Set()); };
  const toggle = (sid, a) => setAbsent((prev) => { const n = new Set(prev); if (a) n.add(sid); else n.delete(sid); return n; });

  async function save() {
    const who = whoAmI(); const todo = pending; let calls = 0, texts = 0, simulated = false; const failed = [];
    setSaving({ done: 0, total: todo.length });
    for (const [i, s] of todo.entries()) {
      const base = { Date: date, Batch: s.Batch, Student_ID: s.Student_ID, Name: s.Name, Course: s.Course, Parent_Name: s.Parent_Name, Parent_Phone: s.Parent_Phone, Marked_By: who };
      try {
        if (absent.has(s.Student_ID)) {
          const wk = weekCount(s.Student_ID);
          const res = await runAction({ flow: 'ABSENCE', action: 'absent' }, { ...base, Absences_This_Week: wk, Absences_This_Month: monthCount(s.Student_ID) });
          if (wk >= CALL_FROM) calls += 1; else texts += 1;
          if (res?.simulated) simulated = true;
        } else {
          await runAction({ direct: 'insert', entity: 'attendance' }, { ...base, Status: 'Present', Absences_This_Week: 0, Call_Status: 'Not Needed', Needs_Followup: 'No' });
        }
      } catch (e) { failed.push(`${s.Name}: ${e.message}`); }
      setSaving({ done: i + 1, total: todo.length });
    }
    setSaving(null); setAbsent(new Set());
    if (failed.length) toast.error(`${failed.length} mark(s) not saved`, { description: failed.slice(0, 3).join(' · ') });
    const parts = [`${todo.length - failed.length} marked`];
    if (texts) parts.push(`${texts} parent${texts > 1 ? 's' : ''} WhatsApped`);
    if (calls) parts.push(`${calls} AI call${calls > 1 ? 's' : ''} started`);
    if (todo.length - failed.length) toast.success(`${current} · ${parts.join(' · ')}`, { description: simulated ? 'Workflows are simulated — no WhatsApp or call left the app.' : undefined });
  }

  const nAbsent = pending.filter((s) => absent.has(s.Student_ID)).length;
  return (
    <section className={`${CARD} p-0`} data-os-attendance-sheet aria-label="Mark attendance">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[color:var(--hair-5)]">
        <div className="min-w-0 flex-1">
          <h3 className={SECTION_TITLE}>Mark attendance</h3>
          <p className="text-[13px] text-ink-3 mt-0.5">Everyone starts present — tap Absent for who is missing, then save once.</p>
        </div>
        <Select {...selectProps} aria-label="Batch" value={current} onChange={pick} options={batches.map((b) => ({ value: b, label: b }))} className="os-control w-full sm:w-[220px]" />
        <label className="flex items-center gap-2 w-full sm:w-auto">
          <CalendarDays className="w-4 h-4 text-ink-4 shrink-0" aria-hidden />
          <input type="date" aria-label="Date" value={date} max={today} onChange={(e) => pickDate(e.target.value)} className="os-control w-full sm:w-[170px] px-3" />
        </label>
      </div>

      {roster.length === 0 ? (
        <p className="p-6 text-[13px] text-ink-3">No active students in {current ?? 'this batch'} yet — enrol them on the Students page.</p>
      ) : (
        <ul className="divide-y divide-[color:var(--hair-5)]" data-os-roster>
          {roster.map((s) => {
            const done = marked.get(s.Student_ID); const isAbsent = absent.has(s.Student_ID); const wk = weekCount(s.Student_ID);
            return (
              <li key={s.Student_ID} className="flex flex-wrap items-center gap-3 px-4 py-3" data-os-roster-row={s.Student_ID}>
                <Avatar name={s.Name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-ink truncate">{s.Name}</p>
                  <p className="text-[12px] text-ink-3 truncate">{s.Course} · {s.Parent_Name} · {s.Attendance_Pct ?? '—'}% this month</p>
                </div>
                {done ? (
                  <div className="flex items-center gap-2"><StatusBadge status={done.Status} />{done.Call_Status && done.Call_Status !== 'Not Needed' && <StatusBadge status={done.Call_Status} size="small" />}</div>
                ) : (
                  <div className="flex items-center gap-2" role="group" aria-label={`${s.Name} present or absent`}>
                    {isAbsent && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[12px] text-ink-3" data-os-absent-hint>
                        {wk >= CALL_FROM ? <><PhoneCall className="w-3.5 h-3.5" aria-hidden /> absence {wk} in 7 days · AI call</> : <><MessageCircle className="w-3.5 h-3.5" aria-hidden /> WhatsApp to parent</>}
                      </span>
                    )}
                    <button type="button" className="chip h-8 px-3 text-[13px]" aria-pressed={!isAbsent ? 'true' : 'false'} onClick={() => toggle(s.Student_ID, false)} disabled={!!saving}>Present</button>
                    <button type="button" className="chip h-8 px-3 text-[13px]" aria-pressed={isAbsent ? 'true' : 'false'} onClick={() => toggle(s.Student_ID, true)} disabled={!!saving}>Absent</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {roster.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 border-t border-[color:var(--hair-5)]">
          {saving ? (
            <div className="flex-1 min-w-[200px]" aria-live="polite"><Progress value={saving.done} of={saving.total} label={`Saving ${saving.done} of ${saving.total}`} tone="brand" /></div>
          ) : pending.length === 0 ? (
            <p className="flex-1 flex items-center gap-2 text-[13px] text-ink-2" data-os-sheet-done><CheckCheck className="w-4 h-4 text-ok-text" aria-hidden /> {current} is marked for {date === today ? 'today' : date}.</p>
          ) : (
            <p className="flex-1 text-[13px] text-ink-2">{pending.length - nAbsent} present · <span className={nAbsent ? 'text-bad-text font-medium' : ''}>{nAbsent} absent</span>{marked.size > 0 && ` · ${roster.length - pending.length} already marked`}</p>
          )}
          {pending.length > 0 && (
            <>
              {nAbsent > 0 && <Button onClick={() => setAbsent(new Set())} disabled={!!saving}>All present</Button>}
              <Button type="primary" onClick={save} loading={!!saving} data-os-sheet-save>Save attendance</Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
