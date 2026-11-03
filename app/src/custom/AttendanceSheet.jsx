'use client';
// AttendanceSheet — mark a whole batch for one date (R14), or correct it after it was saved. Every student starts Present; the
// office picks Absent for who is missing and saves ONCE: ATTENDANCE.save_batch writes one attendance_sessions row and every
// student's mark as its lines in a single transaction (a refused mark rolls the whole save back). Only the absentees are then
// notified (ABSENCE, by the flow): a formal WhatsApp notice to the parent — never a call (owner, 3 Nov 2026). Present students
// cost nothing — no workflow (R15).
// A saved batch keeps the same Present / Absent choices (owner, 3 Nov 2026): a change is patched onto that student's stored mark
// (direct:patch), and a Present corrected to Absent also posts ABSENCE.absent so the parent still gets the notice. A notice
// already sent cannot be recalled — Absent corrected to Present keeps the notice's status. The session row keeps the counts of
// the first save. The repeat counts and the follow-up flag are computed here from the stored marks (rule zero: code counts).
import { useMemo, useState } from 'react';
import { Button, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { CalendarDays, CheckCheck, MessageCircle, Search, Zap } from 'lucide-react';
import { Avatar } from '../components/ui/primitives';
import Modal from '../components/Modal';
import { CARD, SECTION_TITLE } from '../module/Charts';
import { bizToday } from '../module/Fields';
import { pickerProps, selectProps } from '../config/popup';
import { runAction, whoAmI } from '../utils/api';

const FOLLOWUP_FROM = 2;   // os.yaml ABSENCE.constants.followup_from_absence — from this absence in 7 days the counsellor follows up
const SENT = ['WhatsApp Sent', 'Delivered', 'Failed'];   // a notice that left (or tried to): its status is kept on a correction
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
  const [picked, setPicked] = useState(() => new Map());   // Student_ID → 'Present' | 'Absent' — only what differs from the baseline
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = batch ?? batches[0];

  const roster = useMemo(() => students.filter((s) => s.Batch === current).sort((a, b) => String(a.Name).localeCompare(String(b.Name))), [students, current]);
  const saved = useMemo(() => new Map(marks.filter((m) => day(m.Date) === date).map((m) => [m.Student_ID, m])), [marks, date]);
  const baseline = (sid) => saved.get(sid)?.Status ?? 'Present';   // a saved mark, else the default: Present
  const choice = (sid) => picked.get(sid) ?? baseline(sid);
  const pending = roster.filter((s) => !saved.has(s.Student_ID));                                     // never saved for this date
  const changed = roster.filter((s) => saved.has(s.Student_ID) && choice(s.Student_ID) !== baseline(s.Student_ID));   // corrections
  const needle = q.trim().toLowerCase();
  const visible = needle ? roster.filter((s) => `${s.Name} ${s.Student_ID}`.toLowerCase().includes(needle)) : roster;
  const nAbsent = roster.filter((s) => choice(s.Student_ID) === 'Absent').length;
  const nPresent = roster.length - nAbsent;
  const toNotify = [...pending, ...changed].filter((s) => choice(s.Student_ID) === 'Absent');   // new absences → a WhatsApp each
  const unAbsent = changed.filter((s) => choice(s.Student_ID) === 'Present');                    // Absent corrected to Present
  const dirty = pending.length > 0 || changed.length > 0;

  const absencesBefore = (sid, from) => marks.filter((m) => m.Student_ID === sid && m.Status === 'Absent' && day(m.Date) >= from && day(m.Date) < date).length;
  const weekCount = (sid) => absencesBefore(sid, shift(date, -6)) + 1;
  const monthCount = (sid) => absencesBefore(sid, `${date.slice(0, 8)}01`) + 1;
  const absenceFields = (sid) => { const wk = weekCount(sid); const f = wk >= FOLLOWUP_FROM;
    return { Status: 'Absent', Absences_This_Week: wk, Absences_This_Month: monthCount(sid), Needs_Followup: f ? 'Yes' : 'No', Followup_Done: f ? 'No' : '' }; };

  const reset = () => { setPicked(new Map()); setQ(''); };
  const setOne = (sid, isAbsent) => setPicked((prev) => { const n = new Map(prev); const v = isAbsent ? 'Absent' : 'Present'; if (v === baseline(sid)) n.delete(sid); else n.set(sid, v); return n; });
  const allPresent = () => setPicked((prev) => { const n = new Map(prev); for (const s of visible) { if (baseline(s.Student_ID) === 'Present') n.delete(s.Student_ID); else n.set(s.Student_ID, 'Present'); } return n; });
  const anyAbsentVisible = visible.some((s) => choice(s.Student_ID) === 'Absent');

  async function save() {
    setConfirming(false); setSaving(true);
    const who = whoAmI(); const failed = []; let simulated = false;
    try {
      // 1) students never saved for this date: ONE save_batch (session + every mark, one transaction)
      if (pending.length) {
        const lines = pending.map((s) => {
          const isAbsent = choice(s.Student_ID) === 'Absent';
          return { Date: date, Batch: s.Batch, Student_ID: s.Student_ID, Name: s.Name, Course: s.Course, Parent_Name: s.Parent_Name, Parent_Phone: s.Parent_Phone,
            ...(isAbsent ? absenceFields(s.Student_ID) : { Status: 'Present', Absences_This_Week: 0, Absences_This_Month: 0, Needs_Followup: 'No', Followup_Done: '' }),
            Call_Status: isAbsent ? 'Queued' : 'Present', Marked_By: who };
        });
        const absentIds = lines.filter((l) => l.Status === 'Absent').map((l) => l.Student_ID);
        const res = await runAction({ flow: 'ATTENDANCE', action: 'save_batch' }, {
          Date: date, Batch: current, Total_Count: lines.length, Present_Count: lines.length - absentIds.length, Absent_Count: absentIds.length,
          Absentees: absentIds.join(', '), Marked_By: who, lines,
        });
        simulated ||= !!res?.simulated;
      }
      // 2) corrections to saved marks, one student at a time (a refusal names that student; the others still save)
      for (const s of changed) {
        const m = saved.get(s.Student_ID); const toAbsent = choice(s.Student_ID) === 'Absent';
        try {
          if (toAbsent) {
            const f = absenceFields(s.Student_ID);
            await runAction({ direct: 'patch', entity: 'attendance' }, { Att_ID: m.Att_ID, ...f, Call_Status: 'Queued', Marked_By: who });
            const res = await runAction({ flow: 'ABSENCE', action: 'absent' }, { Att_ID: m.Att_ID, Date: date, Batch: s.Batch, Student_ID: s.Student_ID, Name: s.Name, Course: s.Course,
              Parent_Name: s.Parent_Name, Parent_Phone: s.Parent_Phone, Absences_This_Week: f.Absences_This_Week, Needs_Followup: f.Needs_Followup });
            simulated ||= !!res?.simulated;
          } else {
            await runAction({ direct: 'patch', entity: 'attendance' }, { Att_ID: m.Att_ID, Status: 'Present', Absences_This_Week: 0, Absences_This_Month: 0, Needs_Followup: 'No', Followup_Done: '',
              Call_Status: SENT.includes(m.Call_Status) ? m.Call_Status : 'Present', Marked_By: who });
          }
        } catch (e) { failed.push(`${s.Name}: ${e.errors ? Object.values(e.errors).join(' · ') : e.message}`); }
      }
      const z = toNotify.length - failed.length;
      setPicked(new Map());
      if (failed.length) toast.error(`${plural(failed.length, 'correction')} not saved — the rest were`, { description: failed.join('\n'), duration: 12000 });
      if (!z || z < 0) toast.success(changed.length && !pending.length ? 'Attendance updated — no new WhatsApp notice.' : 'Attendance saved! Everyone is present — no parent was notified.');
      else if (simulated) toast.success(`Attendance saved! Formal WhatsApp notice queued for ${plural(z, 'absent parent')}.`, { description: 'Workflows are simulated — the marks are saved, but no WhatsApp left the app.' });
      else toast.success(`Attendance saved! Formal WhatsApp notice sent to ${plural(z, 'absent parent')}.`);
    } catch (e) {
      const detail = e.errors ? Object.values(e.errors).join(' · ') : e.message;
      toast.error('Attendance not saved — nothing was written, the sheet is as you left it', { description: detail, duration: 12000 });
    } finally {
      setSaving(false);
    }
  }

  const label = toNotify.length ? `Save & Send WhatsApp (${toNotify.length})` : pending.length ? 'Save Attendance' : 'Save changes';
  return (
    <section className={`${CARD} p-0`} data-os-attendance-sheet aria-label="Mark attendance">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[color:var(--hair-5)]">
        <div className="min-w-0 flex-1">
          <h3 className={SECTION_TITLE}>Mark attendance</h3>
          <p className="text-[13px] text-ink-3 mt-0.5">Everyone starts present. Pick Absent for who is missing, then save once. A saved batch can be corrected here.</p>
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
            <Button onClick={allPresent} disabled={saving || !anyAbsentVisible}>Mark all present</Button>
            <p className="ml-auto text-[13px] text-ink-2 tabular" aria-live="polite" data-os-sheet-counter>
              Total: <b className="text-ink">{roster.length}</b> <span className="text-ink-3">|</span> Present: <b className="text-ok-text">{nPresent}</b> <span className="text-ink-3">|</span> Absent: <b className={nAbsent ? 'text-bad-text' : 'text-ink'}>{nAbsent}</b>
              {saved.size > 0 && pending.length < roster.length && <span className="text-ink-3"> · saved{changed.length ? `, ${plural(changed.length, 'change')}` : ''}</span>}
            </p>
          </div>

          <p role="note" className="flex items-start gap-2 mx-4 mt-3 px-3 py-2 rounded-[var(--r-8)] bg-info-soft text-info-text text-[13px]" data-os-sheet-notice>
            <Zap className="w-4 h-4 mt-px shrink-0" aria-hidden /> Saving attendance will automatically send a formal WhatsApp intimation to parents of absent students.
          </p>

          <ul className="grid grid-cols-1 lg:grid-cols-2 divide-y divide-[color:var(--hair-5)] lg:divide-y-0" data-os-roster>
            {visible.map((s) => {
              const sid = s.Student_ID; const m = saved.get(sid); const isAbsent = choice(sid) === 'Absent'; const edited = picked.has(sid) && !!m;
              const hint = isAbsent && (!m || m.Status !== 'Absent') ? `WhatsApp notice to parent on save${weekCount(sid) >= FOLLOWUP_FROM ? ` · absence ${weekCount(sid)} in 7 days, counsellor follows up` : ''}`
                : isAbsent && m ? `Saved absent · notice: ${m.Call_Status || 'Queued'}`
                : edited ? 'Corrected to Present — a notice already sent stays sent' : '';
              return (
                <li key={sid} className="flex items-center gap-3 px-4 py-2.5 lg:border-b lg:border-[color:var(--hair-5)]" data-os-roster-row={sid} data-os-saved={m ? '' : undefined}>
                  <Avatar name={s.Name} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink truncate">{s.Name}{edited && <span className="ml-2 text-[12px] font-normal text-warn-text">changed</span>}</p>
                    <p className="text-[12px] text-ink-3 truncate"><span className="font-mono">{sid}</span> · {s.Course}</p>
                    {hint && <p className="text-[12px] text-ink-3 flex items-center gap-1 mt-0.5" data-os-absent-hint>{isAbsent && <MessageCircle className="w-3.5 h-3.5" aria-hidden />}{hint}</p>}
                  </div>
                  {/* Two choices, not a flip: clicking Present marks present, clicking Absent marks absent — saved or not (owner, 3 Nov 2026).
                      ONE tab stop per student (the chosen option); Space flips Present ↔ Absent, arrows move, P and A set it directly. */}
                  <div role="radiogroup" aria-label={`${s.Name} — attendance`} className="inline-flex shrink-0 gap-0.5 rounded-[var(--r-8)] border border-[color:var(--hair-5)] p-0.5 text-[13px] font-medium" data-os-pa-toggle
                    onKeyDown={(e) => {
                      const k = e.key; let to = null;
                      if (k === ' ' || k.startsWith('Arrow')) to = !isAbsent; else if (k === 'a' || k === 'A') to = true; else if (k === 'p' || k === 'P') to = false;
                      if (to === null) return;
                      e.preventDefault(); setOne(sid, to);
                      // focus follows the choice, so the row keeps ONE tab stop (setTimeout, not rAF: rAF waits in a hidden tab)
                      const group = e.currentTarget; setTimeout(() => group.querySelector(`[data-os-pa="${to ? 'Absent' : 'Present'}"]`)?.focus(), 0);
                    }}>
                    {['Present', 'Absent'].map((v) => {
                      const on = (v === 'Absent') === isAbsent;
                      const tint = v === 'Absent' ? 'bg-bad-soft text-bad-text' : 'bg-ok-soft text-ok-text';
                      return (
                        <button key={v} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} disabled={saving} data-os-pa={v}
                          onClick={() => setOne(sid, v === 'Absent')}
                          className={`px-3 h-7 inline-flex items-center rounded-[calc(var(--r-8)-2px)] transition-colors duration-150 ${on ? tint : 'text-ink-3 hover:bg-black/[0.04]'}`}>
                          {v[0]}<span className="hidden sm:inline">{v.slice(1)}</span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
            {visible.length === 0 && <li className="px-4 py-6 text-[13px] text-ink-3">No student in {current} matches “{q}”.</li>}
          </ul>

          <div className="flex flex-wrap items-center gap-3 p-4 border-t border-[color:var(--hair-5)]">
            {!dirty ? (
              <p className="flex-1 flex items-center gap-2 text-[13px] text-ink-2" data-os-sheet-done><CheckCheck className="w-4 h-4 text-ok-text" aria-hidden /> {current} is marked for {date === today ? 'today' : dayjs(date).format('D MMM YYYY')}. Change a student above to correct it.</p>
            ) : (
              <>
                <p className="flex-1 text-[13px] text-ink-3">Present marks notify nobody. {toNotify.length ? `${plural(toNotify.length, 'parent')} will get the WhatsApp notice.` : ''}</p>
                {/* no new absentee → nothing is sent, so no confirmation is needed */}
                <Button type="primary" onClick={() => (toNotify.length || unAbsent.length ? setConfirming(true) : save())} loading={saving} data-os-sheet-save>{label}</Button>
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
          {toNotify.length > 0 && <p className="text-[13px] text-ink-2">{plural(toNotify.length, 'parent')} will receive the official absence WhatsApp notice immediately.</p>}
          {unAbsent.length > 0 && <p className="text-[13px] text-ink-2">{plural(unAbsent.length, 'student')} corrected to Present — a WhatsApp notice already sent cannot be recalled.</p>}
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirming(false)}>Cancel</Button>
            <Button type="primary" onClick={save} data-os-sheet-confirm-save>{toNotify.length ? 'Confirm & Send' : 'Confirm'}</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
