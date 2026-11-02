'use client';
// UsersPage — "Users & roles", its own page in the Setup group, administrators only (Haresh review Oct 2026, UI 4; it used to
// sit inside Settings). Compulsory per standards §6: create, deactivate, reactivate, reset password, change role — every rule
// is enforced by the Server Actions (nobody edits their own role, the last administrator is protected); the UI only offers
// what is allowed. The scaffold adds this page (`kind: users`) to every OS and to the admin role when the yaml does not.
// v5.1 (G6, roles level 2): the roles are rows the administrator manages here — a role = a name, a description and the pages it
// opens, each page None · View · Edit. Cards list every role (built-in ones too) with Edit / Delete; Administrator's card is locked.
// The server checks admin on every role write, refuses a delete while people hold the role, and re-reads access on the next request.
import { selectProps } from '../config/popup';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button, Input, Segmented, Select, Tooltip } from 'antd';
import { KeyRound, Lock, Pencil, Plus, Trash2, UserPlus, UserX, UserCheck } from 'lucide-react';
import { useAuth, accessOf } from '../context/AuthContext';
import { ROLE_LABELS, ROLE_COLORS, ROLE_DESC } from '../config/roles';
import { NAV } from '../config/nav';
import * as actions from '../app/actions';
import Modal from '../components/Modal';
import { CARD } from './Charts';
import { pageVariants } from './Kpis';
import { FIELD_LABEL } from './SettingsPage';
import { cn } from '../utils/cn';

const MODES = [{ label: 'None', value: 'none' }, { label: 'View', value: 'view' }, { label: 'Edit', value: 'edit' }];
// The pages a role can be given. Users & roles is the administrator's own; Profile & settings is every person's (always included on save).
const ROLE_PAGES = NAV.filter((n) => n.kind !== 'users' && n.kind !== 'settings');
const SELF_PAGES = NAV.filter((n) => n.kind === 'settings').map((n) => n.id);
const PAGE_GROUPS = (() => { const g = new Map(); for (const n of ROLE_PAGES) { const k = n.group || 'Pages'; if (!g.has(k)) g.set(k, []); g.get(k).push(n); } return [...g.entries()]; })();

/** One role as the cards and the editor use it, whatever spelling the server returned it in. */
const normRole = (x) => ({
  key: x.key, label: x.label ?? ROLE_LABELS[x.key] ?? x.key, description: x.description ?? '', baseRole: x.baseRole ?? x.base_role ?? x.key,
  pages: x.pages === '*' ? '*' : (x.pages && typeof x.pages === 'object' ? x.pages : {}), builtIn: !!(x.builtIn ?? x.built_in), locked: x.key === 'admin',
});
const pageCount = (r) => (r.pages === '*' ? 'All pages' : `${Object.keys(r.pages).filter((k) => r.pages[k] === 'view' || r.pages[k] === 'edit').length} pages`);
const clean = (s) => String(s ?? '').trim();

/** The coloured dot of a role pill. `data-dot` tells the Pucho tone to skip its own ::before dot, so the pill shows exactly one. */
function RoleDot({ roleKey, baseRole }) {
  const cls = ROLE_COLORS[roleKey] ?? ROLE_COLORS[baseRole];
  return <span data-dot className={cn('w-2 h-2 rounded-full shrink-0', cls)} style={cls ? undefined : { background: 'var(--ink-3)' }} aria-hidden />;
}

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const refreshUsers = useCallback(async () => { if (!isAdmin) return; const r = await actions.listUsers(); if (r.ok) setUsers(r.users); else toast.error(r.message); }, [isAdmin]);
  const refreshRoles = useCallback(async () => {
    if (!isAdmin) return;
    const r = await actions.listRoles(); if (r?.ok === false) return toast.error(r.message);
    setRoles((Array.isArray(r) ? r : r.roles ?? []).map(normRole));
  }, [isAdmin]);
  const refreshWarnings = useCallback(async () => {
    if (!isAdmin) return;
    try { const r = await actions.scopeWarnings(); setWarnings(Array.isArray(r) ? r : r?.ok === false ? [] : r?.warnings ?? []); } catch { setWarnings([]); }
  }, [isAdmin]);
  const refresh = useCallback(async () => { await Promise.all([refreshUsers(), refreshRoles(), refreshWarnings()]); }, [refreshUsers, refreshRoles, refreshWarnings]);
  useEffect(() => { refresh(); }, [refresh]);

  const roleMap = useMemo(() => Object.fromEntries(roles.map((r) => [r.key, r])), [roles]);
  const roleOptions = useMemo(() => (roles.length ? roles : Object.entries(ROLE_LABELS).map(([key, label]) => normRole({ key, label }))).map((r) => ({ value: r.key, label: r.label })), [roles]);
  const labelOf = (key) => roleMap[key]?.label ?? ROLE_LABELS[key] ?? key;
  const countOf = (key) => users.filter((u) => u.role === key).length;
  // custom roles that start from this one (they take its record scope): it cannot be deleted while they do
  const derivedOf = (key) => roles.filter((r) => !r.locked && r.key !== key && r.baseRole === key).length;
  const derivedMsg = (d) => `${d} ${d === 1 ? 'role starts' : 'roles start'} from this one — change or delete ${d === 1 ? 'it' : 'them'} first.`;
  const descOf = (key) => { const r = roleMap[key]; return r ? (r.description || pageCount(r)) : ''; };

  const [addOpen, setAddOpen] = useState(false); const [nu, setNu] = useState({ name: '', email: '', password: '', role: '' });
  const newRole = nu.role || roleOptions.find((r) => r.value !== 'admin')?.value || 'admin';
  const [resetFor, setResetFor] = useState(null); const [resetPw, setResetPw] = useState('');
  const act = async (fn, okMsg) => { const r = await fn(); if (!r.ok) return toast.error(r.message); toast.success(okMsg); refresh(); };
  const active = users.filter((u) => u.is_active).length;

  // ── the role editor ──
  const [editor, setEditor] = useState(null);   // { key?, label, description, baseRole, from, pages: { pageId: 'view'|'edit' } }
  const [saving, setSaving] = useState(false);
  const [delFor, setDelFor] = useState(null);
  const startOptions = roleOptions.filter((o) => o.value !== 'admin');   // Administrator is never a "Start from": it would hand out unscoped access
  const copyOf = (r) => (r && r.pages !== '*' ? { ...r.pages } : {});
  const openNew = () => { const from = startOptions[0]?.value; const r = roleMap[from]; setEditor({ label: '', description: '', baseRole: r?.baseRole ?? from ?? '', from, pages: copyOf(r) }); };
  const openEdit = (r) => setEditor({ key: r.key, label: r.label, description: r.description, baseRole: r.baseRole, from: r.baseRole, pages: copyOf(r) });
  const startFrom = (key) => { const r = roleMap[key]; setEditor((e) => ({ ...e, from: key, baseRole: r?.baseRole ?? key, pages: copyOf(r) })); };
  const setMode = (id, mode) => setEditor((e) => { const pages = { ...e.pages }; if (mode === 'none') delete pages[id]; else pages[id] = mode; return { ...e, pages }; });
  const setAll = (mode) => setEditor((e) => ({ ...e, pages: mode === 'none' ? {} : Object.fromEntries(ROLE_PAGES.map((n) => [n.id, mode])) }));
  const saveRole = async () => {
    if (!clean(editor.label)) return toast.error('Give the role a name');
    if (!editor.baseRole) return toast.error('Choose a role to start from');
    const pages = Object.fromEntries(Object.entries(editor.pages).filter(([id, m]) => (m === 'view' || m === 'edit') && ROLE_PAGES.some((n) => n.id === id)));
    if (!Object.keys(pages).length) return toast.error('Tick at least one page');
    for (const id of SELF_PAGES) pages[id] = 'edit';   // Profile & settings is every person's own page
    setSaving(true);
    const r = await actions.saveRole({ ...(editor.key ? { key: editor.key } : {}), label: clean(editor.label), description: clean(editor.description), baseRole: editor.baseRole, pages });
    setSaving(false);
    if (r?.ok === false) return toast.error(r.message);
    setEditor(null); toast.success(editor.key ? 'Role saved — it applies at everyone\'s next click' : 'Role created');
    await refresh(); router.refresh();   // the editor's own session is re-read (they may hold the role they just changed)
  };
  const deleteRole = async () => {
    const r = delFor; const n = countOf(r.key);
    if (n > 0) return toast.error(`${n} ${n === 1 ? 'person holds' : 'people hold'} this role. Move ${n === 1 ? 'them' : `these ${n} people`} to another role first.`);
    if (derivedOf(r.key) > 0) return toast.error(derivedMsg(derivedOf(r.key)));
    const res = await actions.deleteRole({ key: r.key });
    if (res?.ok === false) return toast.error(res.message);
    setDelFor(null); toast.success('Role deleted'); refresh();
  };

  const mine = accessOf(user);
  const warnedUsers = useMemo(() => [...warnings.reduce((m, w) => m.set(w.userId, [...(m.get(w.userId) ?? []), w.entity]), new Map())], [warnings]);   // distinct people, not (person, entity) pairs
  const cards = isAdmin && roles.length ? roles : Object.entries(ROLE_LABELS).map(([key, label]) => normRole({ key, label }));
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6 max-w-5xl">
      <div className={CARD}>
        <div className="p-4 border-b border-gray-100/50 flex items-center justify-between gap-3">
          <div className="min-w-0"><p className="text-[13px] font-semibold text-ink">People</p><p className="text-[12px] text-ink-3">{users.length ? `${active} active · ${users.length - active} inactive` : 'Everyone who can sign in, and what each role may open.'}</p></div>
          {isAdmin && <Button type="primary" icon={<UserPlus className="w-4 h-4" />} className="rounded-lg bg-primary-500 border-0 h-9" data-os-action="add-user" onClick={() => setAddOpen(true)}>Add user</Button>}
        </div>
        {isAdmin && warnedUsers.length > 0 && (
          <div className="px-4 py-3 text-[12px] bg-warn-soft text-warn-text border-b border-surface-border" role="status" data-os-scope-warning>
            <strong>{warnedUsers.length} {warnedUsers.length === 1 ? 'person sees' : 'people see'} no records.</strong> Their name or email matches none of the records their role is limited to:{' '}
            {warnedUsers.slice(0, 6).map(([id, ents], i) => <span key={id}>{i ? ', ' : ''}{users.find((x) => x.id === id)?.name ?? id} ({ents.map((e) => String(e).replace(/_/g, ' ')).join(', ')})</span>)}{warnedUsers.length > 6 ? ` and ${warnedUsers.length - 6} more` : ''}. Match the name or email to the record, or change the record.
          </div>
        )}
        <div className="divide-y divide-surface-border" data-os-users>
          {!isAdmin && <div className="px-4 py-3 text-sm text-ink-3">Only an administrator manages people. Your role: <strong>{user?.roleLabel ?? ROLE_LABELS[user?.role] ?? user?.role}</strong> — {mine.all ? 'all pages' : `${Object.keys(user?.pages ?? {}).length} pages`}.</div>}
          {users.map((u) => (
            <div key={u.id} className={cn('px-4 py-3 flex items-center gap-4', !u.is_active && 'opacity-60')}>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900">{u.name}</p><p className="text-xs text-gray-500">{u.email}</p></div>
              {u.id === user?.id || !isAdmin ? <span className="badge badge-neutral"><RoleDot roleKey={u.role} baseRole={roleMap[u.role]?.baseRole} />{labelOf(u.role)}</span>
                : <Select {...selectProps} size="small" className="w-36" value={u.role} options={roleOptions} aria-label={`Role of ${u.name}`} onChange={(role) => act(() => actions.setUserRole({ id: u.id, role }), 'Role changed — they sign in again')} />}
              <span className="text-[12px] text-ink-3 hidden md:block w-72 truncate" title={descOf(u.role)}>{descOf(u.role)}</span>
              {!u.is_active && <span className="badge badge-neutral">Inactive</span>}
              {u.must_change_password && u.is_active && <span className="badge badge-neutral" title="Must set a new password at next sign-in">Temporary password</span>}
              {isAdmin && u.id !== user?.id && <Tooltip title="Reset password"><Button size="small" icon={<KeyRound className="w-3.5 h-3.5" />} className="rounded-lg" aria-label={`Reset password of ${u.name}`} onClick={() => { setResetFor(u); setResetPw(''); }} /></Tooltip>}
              {isAdmin && u.id !== user?.id && (u.is_active
                ? <Tooltip title="Deactivate"><Button size="small" danger icon={<UserX className="w-3.5 h-3.5" />} className="rounded-lg" aria-label={`Deactivate ${u.name}`} onClick={() => act(() => actions.setUserActive({ id: u.id, active: false }), 'User deactivated — their sessions ended')} /></Tooltip>
                : <Tooltip title="Reactivate"><Button size="small" icon={<UserCheck className="w-3.5 h-3.5" />} className="rounded-lg" aria-label={`Reactivate ${u.name}`} onClick={() => act(() => actions.setUserActive({ id: u.id, active: true }), 'User reactivated')} /></Tooltip>)}
            </div>
          ))}
        </div>
      </div>

      <div className={`${CARD} p-4`} data-os-roles>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0"><p className="text-[13px] font-semibold text-ink">Roles</p><p className="text-[12px] text-ink-3">A role is a name and the pages it opens — each one View or Edit. Administrator always has everything.</p></div>
          {isAdmin && <Button type="primary" icon={<Plus className="w-4 h-4" />} className="rounded-lg bg-primary-500 border-0 h-9" data-os-action="new-role" onClick={openNew}>New role</Button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {cards.map((r) => (
            <div key={r.key} className="flex items-start gap-3 rounded-[var(--r-8)] border border-surface-border px-3 py-2" data-os-role-card={r.key}>
              <span className="badge badge-neutral shrink-0 mt-0.5"><RoleDot roleKey={r.key} baseRole={r.baseRole} />{r.label}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-ink-3 break-words">{r.description || (isAdmin ? '' : ROLE_DESC[r.key] ?? '')}</p>
                {isAdmin && <p className="text-[12px] text-ink-3 mt-0.5">{r.locked ? 'Everything · cannot be changed' : `${pageCount(r)} · ${countOf(r.key)} ${countOf(r.key) === 1 ? 'person' : 'people'}`}</p>}
              </div>
              {isAdmin && (r.locked
                ? <Tooltip title="Administrator cannot be edited or deleted"><span className="inline-flex items-center justify-center w-8 h-8 text-ink-3" data-os-role-locked><Lock className="w-3.5 h-3.5" aria-label="Locked" role="img" /></span></Tooltip>
                : <div className="flex gap-1 shrink-0">
                    <Tooltip title="Edit role"><Button size="small" icon={<Pencil className="w-3.5 h-3.5" />} className="rounded-lg" aria-label={`Edit role ${r.label}`} data-os-role-edit={r.key} onClick={() => openEdit(r)} /></Tooltip>
                    <Tooltip title="Delete role"><Button size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} className="rounded-lg" aria-label={`Delete role ${r.label}`} data-os-role-delete={r.key} onClick={() => setDelFor(r)} /></Tooltip>
                  </div>)}
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add user" size="sm">
        <div className="space-y-3">
          <div><label className={FIELD_LABEL}>Name</label><Input value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} className="rounded-xl" /></div>
          <div><label className={FIELD_LABEL}>Email</label><Input value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} className="rounded-xl" /></div>
          <div><label className={FIELD_LABEL}>Temporary password <span className="font-normal text-ink-3">(they set their own at first sign-in; leave empty to sign in by one-time code)</span></label><Input.Password value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} className="rounded-xl" /></div>
          <div><label className={FIELD_LABEL}>Role</label><Select {...selectProps} className="w-full" value={newRole} options={roleOptions} onChange={(v) => setNu({ ...nu, role: v })} /></div>
          <Button type="primary" block className="rounded-full bg-primary-500 border-0" onClick={async () => {
            if (!nu.name || !nu.email) return toast.error('Name and email are required');
            const r = await actions.createUser({ name: nu.name, email: nu.email, role: newRole, ...(nu.password ? { password: nu.password } : {}) });
            if (!r.ok) return toast.error(r.message);
            setAddOpen(false); setNu({ name: '', email: '', password: '', role: newRole }); toast.success('User added'); refresh(); }}>Add</Button>
        </div>
      </Modal>
      <Modal isOpen={!!resetFor} onClose={() => setResetFor(null)} title={`Reset password — ${resetFor?.name ?? ''}`} size="sm">
        <div className="space-y-3">
          <div><label className={FIELD_LABEL}>Temporary password</label><Input.Password value={resetPw} onChange={(e) => setResetPw(e.target.value)} className="rounded-xl" /></div>
          <Button type="primary" block className="rounded-full bg-primary-500 border-0" onClick={async () => { const r = await actions.resetUserPassword({ id: resetFor.id, password: resetPw }); if (!r.ok) return toast.error(r.message); setResetFor(null); toast.success('Password reset — their sessions ended; they must choose a new one'); refresh(); }}>Reset</Button>
        </div>
      </Modal>

      <Modal isOpen={!!editor} onClose={() => setEditor(null)} title={editor?.key ? `Edit role — ${editor.label || ''}` : 'New role'} size="lg">
        {editor && (
          <div className="space-y-4" data-os-role-editor>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={FIELD_LABEL}>Name</label><Input value={editor.label} maxLength={60} onChange={(e) => setEditor({ ...editor, label: e.target.value })} className="rounded-xl" aria-label="Role name" /></div>
              <div><label className={FIELD_LABEL}>Start from</label><Select {...selectProps} className="w-full" value={editor.from || undefined} options={startOptions} onChange={startFrom} aria-label="Start from" /></div>
            </div>
            <div><label className={FIELD_LABEL}>Description <span className="font-normal text-ink-3">(shown on the role card)</span></label><Input value={editor.description} maxLength={160} onChange={(e) => setEditor({ ...editor, description: e.target.value })} className="rounded-xl" aria-label="Role description" /></div>
            <p className="text-[12px] text-ink-3">Choosing a role in <em>Start from</em> copies its pages and decides which records this role sees. Then change any page below: <strong>None</strong> hides it, <strong>View</strong> shows the records without action buttons, <strong>Edit</strong> also allows the page's actions. A page whose records the starting role does not limit is visible in full to this role.</p>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[12px] font-medium text-ink-2">Set every page to</span>
              {MODES.map((m) => <Button key={m.value} size="small" className="rounded-lg" onClick={() => setAll(m.value)}>{m.label}</Button>)}
            </div>
            <div className="max-h-[32vh] overflow-y-auto custom-scrollbar rounded-[var(--r-8)] border border-surface-border divide-y divide-surface-border" data-os-role-pages>
              {PAGE_GROUPS.map(([group, items]) => (
                <div key={group}>
                  <p className="px-3 pt-2 pb-1 text-[12px] font-medium text-ink-3 bg-surface-2">{group}</p>
                  {items.map((n) => (
                    <div key={n.id} className="px-3 py-2 flex items-center gap-3 justify-between" data-os-role-page={n.id}>
                      <span className="text-[13px] text-ink min-w-0 truncate">{n.label}{n.hidden && <span className="text-ink-3"> · reached from other pages</span>}</span>
                      <Segmented size="small" options={MODES} value={editor.pages[n.id] ?? 'none'} onChange={(v) => setMode(n.id, v)} aria-label={`Access to ${n.label}`} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button className="rounded-full" onClick={() => setEditor(null)}>Cancel</Button>
              <Button type="primary" loading={saving} className="rounded-full bg-primary-500 border-0" data-os-role-save onClick={saveRole}>{editor.key ? 'Save role' : 'Create role'}</Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal isOpen={!!delFor} onClose={() => setDelFor(null)} title={`Delete role — ${delFor?.label ?? ''}`} size="sm">
        {delFor && (
          <div className="space-y-3">
            {countOf(delFor.key) > 0
              ? <p className="text-sm text-bad-text" role="alert">{countOf(delFor.key)} {countOf(delFor.key) === 1 ? 'person holds' : 'people hold'} this role. Move {countOf(delFor.key) === 1 ? 'them' : `these ${countOf(delFor.key)} people`} to another role first.</p>
              : derivedOf(delFor.key) > 0
                ? <p className="text-sm text-bad-text" role="alert">{derivedMsg(derivedOf(delFor.key))}</p>
                : <p className="text-sm text-ink-2">This removes the role. Nobody holds it, so nobody loses access.</p>}
            <div className="flex gap-2 justify-end">
              <Button className="rounded-full" onClick={() => setDelFor(null)}>Cancel</Button>
              <Button danger type="primary" disabled={countOf(delFor.key) > 0 || derivedOf(delFor.key) > 0} className="rounded-full" data-os-role-confirm-delete onClick={deleteRole}>Delete role</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
