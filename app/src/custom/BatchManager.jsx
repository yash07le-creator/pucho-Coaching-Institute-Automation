'use client';
// BatchManager — the Batches page (R41). Add / edit a batch with a real time-range picker, day chips (Mon–Sun, with Mon–Fri ·
// Mon–Sat · Weekend shortcuts) and course chips from the institute's own Courses list — nothing typed that a picker can choose.
// Writes are the app's own (direct:insert / direct:patch on batches, declared by the page's modals in os.yaml); no workflow.
import { useMemo, useState } from 'react';
import { Button, Input, Switch, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Clock, Pencil, Plus } from 'lucide-react';
import { Chip, TagList } from '../components/ui/primitives';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { CARD, SECTION_TITLE } from '../module/Charts';
import { pickerProps } from '../config/popup';
import { runAction } from '../utils/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PRESETS = [
  { label: 'Mon–Fri', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { label: 'Mon–Sat', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  { label: 'Weekend', days: ['Sat', 'Sun'] },
  { label: 'Every day', days: DAYS },
];
const list = (v) => String(v ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const ordered = (days) => DAYS.filter((d) => days.includes(d));
const t12 = (hhmm) => (hhmm ? dayjs(`2000-01-01T${hhmm}`).format('h:mm A') : '');
const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const EMPTY = { Batch_ID: '', Name: '', Start_Time: '', End_Time: '', Days: [], Courses: [], Active: true };

export default function BatchManager({ data }) {
  const batches = useMemo(() => [...(data?.batches ?? [])].sort((a, b) => String(a.Name).localeCompare(String(b.Name))), [data]);
  const courses = useMemo(() => (data?.courses ?? []).filter((c) => String(c.Active) !== 'false').map((c) => c.Name).filter(Boolean), [data]);
  const [form, setForm] = useState(null);   // null = closed; else the batch being added / edited
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);   // the time panel takes Escape for itself — it must not also close the form

  const open = (b) => {
    setErrors({});
    setForm(b ? { Batch_ID: b.Batch_ID, Name: b.Name ?? '', Start_Time: b.Start_Time ?? '', End_Time: b.End_Time ?? '', Days: ordered(list(b.Days)), Courses: list(b.Courses), Active: String(b.Active) !== 'false' } : { ...EMPTY });
  };
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const flip = (k, v) => set(k, form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v]);

  function check(f) {
    const e = {};
    if (!f.Name.trim()) e.Name = 'Give the batch a name';
    else if (batches.some((b) => b.Batch_ID !== f.Batch_ID && String(b.Name).trim().toLowerCase() === f.Name.trim().toLowerCase())) e.Name = 'Another batch already has this name';
    if (!f.Start_Time || !f.End_Time) e.Time = 'Pick the start and end time';
    else if (f.End_Time <= f.Start_Time) e.Time = 'The batch must end after it starts';
    if (!f.Days.length) e.Days = 'Pick at least one day';
    return e;
  }

  async function save() {
    const e = check(form); setErrors(e); if (Object.keys(e).length) return;
    const row = { Name: form.Name.trim(), Start_Time: form.Start_Time, End_Time: form.End_Time, Days: ordered(form.Days).join(', '), Courses: form.Courses.join(', '), Active: form.Active ? 'true' : 'false' };
    setSaving(true);
    try {
      if (form.Batch_ID) await runAction({ direct: 'patch', entity: 'batches' }, { Batch_ID: form.Batch_ID, ...row });
      else await runAction({ direct: 'insert', entity: 'batches' }, row);
      toast.success(form.Batch_ID ? `${row.Name} updated` : `${row.Name} added — it is now in the enrolment form`);
      setForm(null);
    } catch (err) {
      if (err.errors) setErrors({ ...err.errors, Time: err.errors.Start_Time ?? err.errors.End_Time });
      toast.error('Batch not saved', { description: err.errors ? Object.values(err.errors).join(' · ') : err.message });
    } finally { setSaving(false); }
  }

  const range = form?.Start_Time && form?.End_Time ? [dayjs(`2000-01-01T${form.Start_Time}`), dayjs(`2000-01-01T${form.End_Time}`)] : null;
  return (
    <section className={`${CARD} p-0`} data-os-batch-manager aria-label="Batches">
      <div className="flex items-center gap-3 p-4 border-b border-[color:var(--hair-5)]">
        <h3 className={`${SECTION_TITLE} flex-1`}>All batches · {batches.length}</h3>
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => open(null)} data-os-batch-add>Add batch</Button>
      </div>

      {batches.length === 0 ? (
        <div className="p-8"><EmptyState icon={Clock} title="No batches yet" description="Add the institute's first batch — its time, days and the courses it teaches." action={{ label: 'Add batch', onClick: () => open(null) }} /></div>
      ) : (
        <ul className="divide-y divide-[color:var(--hair-5)]">
          {batches.map((b) => {
            const days = list(b.Days);
            return (
              <li key={b.Batch_ID} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" data-os-batch={b.Batch_ID}>
                <div className="min-w-[180px] flex-1">
                  <p className="text-[14px] font-medium text-ink">{b.Name}</p>
                  <p className="text-[12px] text-ink-3 flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden />{b.Start_Time ? `${t12(b.Start_Time)} – ${t12(b.End_Time)}` : 'No time set'}</p>
                </div>
                <div className="flex gap-1" aria-label={`Days: ${days.join(', ') || 'none'}`}>
                  {DAYS.map((d) => <span key={d} className={`w-9 h-7 inline-flex items-center justify-center rounded-[var(--r-8)] text-[12px] ${days.includes(d) ? 'bg-primary-50 text-primary-600 font-medium' : 'text-ink-4'}`}>{d}</span>)}
                </div>
                <div className="min-w-[140px]"><TagList value={b.Courses} /></div>
                <StatusBadge status={String(b.Active) === 'false' ? 'Inactive' : 'Active'} size="small" />
                <Button size="small" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => open(b)} aria-label={`Edit ${b.Name}`}>Edit</Button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={!!form} onClose={() => !saving && setForm(null)} title={form?.Batch_ID ? `Edit ${form.Name || 'batch'}` : 'Add batch'} size="lg">
        {form && (
          <div className="os-form space-y-5" data-os-batch-form>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="b-name">Batch name<span className="text-bad-text"> *</span></label>
                <Input id="b-name" value={form.Name} onChange={(e) => set('Name', e.target.value)} placeholder="e.g. Batch D — Night" maxLength={120} status={errors.Name ? 'error' : undefined} className="os-control w-full" />
                {errors.Name && <p className="text-[12px] text-bad-text mt-1">{errors.Name}</p>}
              </div>
              <div className="min-w-0">
                <label htmlFor="b-time">Time<span className="text-bad-text"> *</span></label>
                <TimePicker.RangePicker {...pickerProps} id="b-time" format="h:mm A" use12Hours minuteStep={15} order={false} value={range} status={errors.Time ? 'error' : undefined}
                  placeholder={['Starts', 'Ends']} onOpenChange={setTimeOpen} onKeyDown={(e) => { if (e.key === 'Escape' && timeOpen) e.stopPropagation(); }} onChange={(v) => { set('Start_Time', v?.[0]?.format('HH:mm') ?? ''); set('End_Time', v?.[1]?.format('HH:mm') ?? ''); set('Time', undefined); }} className="os-control w-full" />
                {errors.Time && <p className="text-[12px] text-bad-text mt-1">{errors.Time}</p>}
              </div>
            </div>

            <fieldset>
              <legend className="text-[13px] font-medium text-ink-2 mb-2">Days<span className="text-bad-text"> *</span></legend>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days the batch meets">
                {DAYS.map((d) => <Chip key={d} label={d} pressed={form.Days.includes(d)} onClick={() => flip('Days', d)} className="h-9 min-w-[48px] justify-center" />)}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[12px] text-ink-3 mr-1">Quick:</span>
                {PRESETS.map((p) => <Chip key={p.label} label={p.label} pressed={same(form.Days, p.days)} onClick={() => set('Days', [...p.days])} className="h-8 text-[12px]" />)}
              </div>
              {errors.Days && <p className="text-[12px] text-bad-text mt-1">{errors.Days}</p>}
            </fieldset>

            <fieldset>
              <legend className="text-[13px] font-medium text-ink-2 mb-2">Courses taught</legend>
              {courses.length ? (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Courses taught in this batch">
                  {courses.map((c) => <Chip key={c} label={c} pressed={form.Courses.includes(c)} onClick={() => flip('Courses', c)} className="h-9" />)}
                </div>
              ) : <p className="text-[13px] text-ink-3">Add the institute's courses on the Courses page first.</p>}
            </fieldset>

            <label className="flex items-center gap-3 text-[13px] text-ink-2"><Switch checked={form.Active} onChange={(v) => set('Active', v)} /> Active — shown in the enrolment and attendance forms</label>

            <div className="flex justify-end gap-2 pt-4 border-t border-[color:var(--hair-5)]">
              <Button onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
              <Button type="primary" onClick={save} loading={saving} data-os-batch-save>{form.Batch_ID ? 'Save changes' : 'Add batch'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
