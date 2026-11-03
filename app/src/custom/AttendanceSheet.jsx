'use client';
// AttendanceSheet — mark a whole batch for one date (R14). Every student starts Present; the office taps Absent for who is
// missing and saves ONCE: ATTENDANCE.save_batch writes one attendance_sessions row and every student's mark as its lines in a
// single transaction (a refused mark rolls the whole save back). Only the absentees are then notified (ABSENCE, by the flow):
// a formal WhatsApp notice to the parent — never a call (owner, 3 Nov 2026). Present students cost nothing — no workflow (R15).
// The repeat counts and the follow-up flag are computed here from the stored marks (rule zero: code counts, the flow only acts).
import { useMemo, useState } from 'react';
import { Button, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { CalendarDays, CheckCheck, MessageCircle, Search, Zap } from 'lucide-react';
import { Avatar } from '../components/ui/primitives';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { CARD, SECTION_TITLE } from '../module/Charts';
import { bizToday } from '../module/Fields';
import { pickerProps, selectProps } from '../config/popup';
import { runAction, whoAmI } from '../utils/api';

const FOLLOWUP_FROM = 2;   // os.yaml ABSENCE.constants.followup_from_absence — from this absence in 7 days the counsellor follows up
const day = (v) => String(v ?? '').slice(0, 10);
const shift = (iso, n) => { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function AttendanceSheet({ data }) {
  const students = useMemo(() => (data?.students ?? []).filter((s) => s.Status !== 'Inactive'), [data]);
  const marks = data?.attendance ?? [];
  const batches = useMemo(() => [...new Set(students.map((s) => s.Batch).filter(Boolean))].sort(), [students]);
  const today = bizToday();
  const [batch, setBatch] = useState(null);
  const [date, setDate] = useState(today);
  const [q, setQ] = useState('');
  const [absent, setAbsent] = useState(() => new Set());       // the default is Present: only the exceptions are kept
  const [optimistic, setOptimistic] = useState(() => new Map()); // Student_ID → status, shown while the save is in flight
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = batch ?? batches[0];

  const roster = useMemo(() => students.filter((s) => s.Batch === current).sort((a, b) => String(a.Name).localeCompare(String(b.Name))), [students, current]);
  const stored = useMemo(() => new Map(marks.filter((m) => day(m.Date) === date).map((m) => [m.Student_ID, m.Status])), [marks, date]);
  const markOf = (sid) => stored.get(sid) ?? optimistic.get(sid);
  const pending = roster.filter((s) => !markOf(s.Student_ID));
  const needle = q.trim().toLowerCase();
  const visible = needle ? roster.filter((s) => `${s.Name} ${s.Student_ID}`.toLowerCase().includes(needle)) : roster;
  const nAbsent = pending.filter((s) => absent.has(s.Student_ID)).length;
  const nPresent = pending.length - nAbsent;

  const absencesBefore = (sid, from) => marks.filter((m) => m.Student_ID === sid && m.Status === 'Absent' && day(m.Date) >= from && day(m.Date) < date).length;
  const weekCount = (sid) => absencesBefore(sid, shift(date, -6)) + 1;
  const monthCount = (sid) => absencesBefore(sid, `${date.slice(0, 8)}01`) + 1;

  const reset = () => { setAbsent(new Set()); setQ(''); };
  const setOne = (sid, isAbsent) => setAbsent((prev) => { const n = new Set(prev); if (isAbsent) n.add(sid); else n.delete(sid); return n; });
  const allPresent = () => setAbsent((prev) => { const n = new Set(prev); for (const s of visible) n.delete(s.Student_ID); return n; });

  async function save() {
    setConfirming(false);
    const who = whoAmI(); const todo = pending; const ab = new Set(absent);
    const lines = todo.map((s) => {
      const isAbsent = ab.has(s.Student_ID); const wk = isAbsent ? weekCount(s.Student_ID) : 0; const followUp = wk >= FOLLOWUP_FROM;
      return { Date: date, Batch: s.Batch, Student_ID: s.Student_ID, Name: s.Name, Course: s.Course, Parent_Name: s.Parent_Name, Parent_Phone: s.Parent_Phone,
        Status: isAbsent ? 'Absent' : 'Present', Absences_This_Week: wk, Absences_This_Month: isAbsent ? monthCount(s.Student_ID) : 0,
        Call_Status: isAbsent ? 'Queued' : 'Present', Needs_Followup: followUp ? 'Yes' : 'No', Followup_Done: followUp ? 'No' : '', Marked_By: who };
    });
    const absentIds = lines.filter((l) => l.Status === 'Absent').map((l) => l.Student_ID);
    // optimistic: the rows show their new mark at once; on a refusal they go back to the sheet exactly as they were
    setOptimistic(new Map(lines.map((l) => [l.Student_ID, l.Status]))); setSaving(true);
    try {
      const res = await runAction({ flow: 'ATTENDANCE', action: 'save_batch' }, {
        Date: date, Batch: current, Total_Count: lines.length, Present_Count: lines.length - absentIds.length, Absent_Count: absentIds.length,
        Absentees: absentIds.join(', '), Marked_By: who, lines,
      });
      setAbsent(new Set());
      const z = absentIds.length;
      if (!z) toast.success('Attendance saved! Everyone is present — no parent was notified.');
      else if (res?.simulated) toast.success(`Attendance saved! Formal WhatsApp notice queued for ${plural(z, 'absent parent')}.`, { description: 'Workflows are simulated — the marks are saved, but no WhatsApp left the app.' });
      else toast.success(`Attendance saved! Formal WhatsApp notice sent to ${plural(z, 'absent parent')}.`);
    } catch (e) {
      const detail = e.errors ? Object.values(e.errors).join(' · ') : e.message;
      toast.error('Attendance not saved — nothing was written, the sheet is as you left it', { description: detail, duration: 12000 });
    } finally {
      setOptimistic(new Map()); setSaving(false);
    }
  }

  return (
    <section className={`${CARD} p-0`} data-os-attendance-sheet aria-label="Mark attendance">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[color:var(--hair-5)]">
        <div className="min-w-0 flex-1">
          <h3 className={SECTION_TITLE}>Mark attendance</h3>
          <p className="text-[13px] text-ink-3 mt-0.5">Everyone starts present. Tap Absent for who is missing, then save once.</p>
        </div>
        {/* .os-control fills its box, so each control's width lives on its wrapper */}
        <div className="w-full sm:w-[230px]"><Select {...selectProps} aria-label="Batch" value={current} onChange={(b) => { setBatch(b); reset(); }} options={batches.map((b) => ({ value: b, label: b }))} className="os-control" /></div>
        <div className="w-full sm:w-[170px]">
          <DatePicker {...pickerProps} aria-label="Date" value={dayjs(date)} format="D MMM YYYY" allowClear={false} suffixIcon={<CalendarDays className="w-4 h-4 text-ink-4" aria-hidden />}
            disabledDate={(v) => v && v.format('YYYY-MM-DD') > today} onChange={(v) => { setDate(v ? v.format('YYYY-MM-DD') : today); reset(); }} className="os-control" />
        </div>
      </div>

      {roster.length === 0 ? (
        <p className="p-6 text-[13px] text-ink-3">No active students in {current ?? 'this batch'} yet — enrol them on the Students page.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[color:var(--hair-5)]" data-os-sheet-tools>
            <div className="w-full sm:w-[240px]">
              <Input aria-label="Search students" value={q} onChange={(e) => setQ(e.target.value)} allowClear placeholder="Search name or roll number" prefix={<Search className="w-4 h-4 text-ink-4" aria-hidden />} className="os-control" />
            </div>
            <Button onClick={allPresent} disabled={saving || !nAbsent}>Mark all present</Button>
            <p className="ml-auto text-[13px] text-ink-2 tabular" aria-live="polite" data-os-sheet-counter>
              Total: <b className="text-ink">{pending.length}</b> <span className="text-ink-3">|</span> Present: <b className="text-ok-text">{nPresent}</b> <span className="text-ink-3">|</span> Absent: <b className={nAbsent ? 'text-bad-text' : 'text-ink'}>{nAbsent}</b>
              {roster.length > pending.length && <span className="text-ink-3"> · {roster.length - pending.length} already marked</span>}
            </p>
          </div>

          {pending.length > 0 && (
            <p role="note" className="flex items-start gap-2 mx-4 mt-3 px-3 py-2 rounded-[var(--r-8)] bg-info-soft text-info-text text-[13px]" data-os-sheet-notice>
              <Zap className="w-4 h-4 mt-px shrink-0" aria-hidden /> Saving attendance will automatically send a formal WhatsApp intimation to parents of absent students.
            </p>
          )}

          <ul className="grid grid-cols-1 lg:grid-cols-2 divide-y divide-[color:var(--hair-5)] lg:divide-y-0" data-os-roster>
            {visible.map((s) => {
              const done = markOf(s.Student_ID); const isAbsent = absent.has(s.Student_ID); const wk = weekCount(s.Student_ID);
              return (
                <li key={s.Student_ID} className="flex items-center gap-3 px-4 py-2.5 lg:border-b lg:border-[color:var(--hair-5)]" data-os-roster-row={s.Student_ID}>
                  <Avatar name={s.Name} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink truncate">{s.Name}</p>
                    <p className="text-[12px] text-ink-3 truncate"><span className="font-mono">{s.Student_ID}</span> · {s.Course}</p>
                    {isAbsent && !done && (
                      <p className="text-[12px] text-ink-3 flex items-center gap-1 mt-0.5" data-os-absent-hint>
                        <MessageCircle className="w-3.5 h-3.5" aria-hidden /> WhatsApp notice to parent{wk >= FOLLOWUP_FROM ? ` · absence ${wk} in 7 days, counsellor follows up` : ''}
                      </p>
                    )}
                  </div>
                  {done ? (
                    <StatusBadge status={optimistic.has(s.Student_ID) && !stored.has(s.Student_ID) ? `${done} · saving` : done} size="small" />
                  ) : (
                    // Two choices, not a flip: clicking Present marks present, clicking Absent marks absent (owner, 3 Nov 2026).
                    // ONE tab stop per student (the chosen option); Space flips Present ↔ Absent, arrows move, P and A set it directly.
                    <div role="radiogroup" aria-label={`${s.Name} — attendance`} className="inline-flex shrink-0 gap-0.5 rounded-[var(--r-8)] border border-[color:var(--hair-5)] p-0.5 text-[13px] font-medium" data-os-pa-toggle
                      onKeyDown={(e) => {
                        const k = e.key; let to = null;
                        if (k === ' ' || k.startsWith('Arrow')) to = !isAbsent; else if (k === 'a' || k === 'A') to = true; else if (k === 'p' || k === 'P') to = false;
                        if (to === null) return;
                        e.preventDefault(); setOne(s.Student_ID, to);
                        // focus follows the choice, so the row keeps ONE tab stop (setTimeout, not rAF: rAF waits in a hidden tab)
                        const group = e.currentTarget; setTimeout(() => group.querySelector(`[data-os-pa="${to ? 'Absent' : 'Present'}"]`)?.focus(), 0);
                      }}>
                      {['Present', 'Absent'].map((v) => {
                        const on = (v === 'Absent') === isAbsent;
                        const tint = v === 'Absent' ? 'bg-bad-soft text-bad-text' : 'bg-ok-soft text-ok-text';
                        return (
                          <button key={v} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} disabled={saving} data-os-pa={v}
                            onClick={() => setOne(s.Student_ID, v === 'Absent')}
                            className={`px-3 h-7 inline-flex items-center rounded-[calc(var(--r-8)-2px)] transition-colors duration-150 ${on ? tint : 'text-ink-3 hover:bg-black/[0.04]'}`}>
                            {v[0]}<span className="hidden sm:inline">{v.slice(1)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
            {visible.length === 0 && <li className="px-4 py-6 text-[13px] text-ink-3">No student in {current} matches “{q}”.</li>}
          </ul>

          <div className="flex flex-wrap items-center gap-3 p-4 border-t border-[color:var(--hair-5)]">
            {pending.length === 0 ? (
              <p className="flex-1 flex items-center gap-2 text-[13px] text-ink-2" data-os-sheet-done><CheckCheck className="w-4 h-4 text-ok-text" aria-hidden /> {current} is marked for {date === today ? 'today' : dayjs(date).format('D MMM YYYY')}.</p>
            ) : (
              <>
                <p className="flex-1 text-[13px] text-ink-3">Present marks notify nobody. {nAbsent ? `${plural(nAbsent, 'parent')} will get the WhatsApp notice.` : ''}</p>
                {/* no absentee → nothing is sent, so no confirmation is needed */}
                <Button type="primary" onClick={() => (nAbsent ? setConfirming(true) : save())} loading={saving} data-os-sheet-save>
                  {nAbsent ? `Save & Send WhatsApp (${nAbsent})` : 'Save Attendance'}
                </Button>
              </>
            )}
          </div>
        </>
      )}

      <Modal isOpen={confirming} onClose={() => setConfirming(false)} title={`Ready to save attendance for ${current}?`} size="sm">
        <div className="space-y-4" data-os-sheet-confirm>
          <ul className="text-[14px] text-ink space-y-1 list-disc pl-5">
            <li>Present: <b className="text-ok-text">{nPresent}</b></li>
            <li>Absent: <b className="text-bad-text">{nAbsent}</b></li>
          </ul>
          <p className="text-[13px] text-ink-2">{plural(nAbsent, 'parent')} will receive the official absence WhatsApp notice immediately.</p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirming(false)}>Cancel</Button>
            <Button type="primary" onClick={save} data-os-sheet-confirm-save>Confirm &amp; Send</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
