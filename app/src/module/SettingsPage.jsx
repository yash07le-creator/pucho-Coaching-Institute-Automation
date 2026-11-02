'use client';
// SettingsPage — "Profile & settings": the signed-in person's own things — photo, display name, password. One page, reached
// from the account menu at the bottom-left of the shell (Haresh review Oct 2026, UI 3: Profile and Settings were two menu
// items opening one page). People and roles are administered on the Users & roles page (kind: users, UI 4). The data
// source (database, wired flows, inbound token) is not shown to anyone here (UI 5 / S2): an administrator reads it from
// /api/health, which answers in full only to an admin session.
// v5.1 (G4 / G7): an administrator also sees "Connections & identity" below — the app URL and inbound token the Studio workflows use,
// the company and app names every screen shows, and the Studio webhook URL of each flow. The token is only ever shown masked.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button, Input } from 'antd';
import { KeyRound, RefreshCw, ClipboardPaste, Copy } from 'lucide-react';
import { useAuth, accessOf } from '../context/AuthContext';
import { ROLE_LABELS, ROLE_COLORS, ROLE_DESC } from '../config/roles';
import { FLOW_ACTIONS } from '../config/os.config';
import * as actions from '../app/actions';
import ProfileAvatar from '../components/ProfileAvatar';
import Modal from '../components/Modal';
import { CARD, SECTION_TITLE } from './Charts';
import { pageVariants } from './Kpis';
import { cn } from '../utils/cn';

export const FIELD_LABEL = 'block text-[13px] font-semibold text-gray-700 mb-1.5';

const flowsOfActions = () => [...new Set(Object.keys(FLOW_ACTIONS ?? {}).map((k) => k.split('.')[0]))];
const stripSlash = (v) => String(v ?? '').trim().replace(/\/+$/, '');   // https://os.example.com/ is the same address as https://os.example.com
const normUrl = (v) => stripSlash(v).toLowerCase();   // an origin is case-insensitive: HTTPS://OS.Example.com is saved as https://os.example.com
const okUrl = (v) => { v = stripSlash(v); return !v || /^https:\/\/[^\s/?#]+$/i.test(v) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(v); };
const when = (iso) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };

/** Administrator only: the values the Studio workflows and every screen run on. Each save is audited by the server (the token masked). */
function AdminSettings() {
  const router = useRouter();
  const [s, setS] = useState(null);                       // what the server holds (token masked)
  const [f, setF] = useState({ appUrl: '', companyName: '', appName: '', webhooks: {} });
  const [saving, setSaving] = useState(false); const [rotating, setRotating] = useState(false);   // separate flags: saving the form never greys the token buttons, and vice versa
  const [newToken, setNewToken] = useState(null);         // a generated token, shown in full ONCE (until dismissed); null otherwise
  const [rot, setRot] = useState(null);                   // null | 'generate' | 'paste'
  const [pasted, setPasted] = useState('');
  const load = async () => {
    const r = await actions.getAdminSettings(); if (r?.ok === false) return toast.error(r.message);
    const v = r?.settings ?? r; setS(v);
    setF({ appUrl: v.appUrl ?? '', companyName: v.companyName ?? '', appName: v.appName ?? '', webhooks: { ...(v.webhooks ?? {}) } });
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return null;
  const flows = [...new Set([...flowsOfActions(), ...Object.keys(f.webhooks ?? {})])];
  const written = s.flowsWithValuesWrittenIn ?? [];
  const prevUntil = when(s.inboundTokenPrevUntil); const prevLive = prevUntil && prevUntil.getTime() > Date.now();
  const save = async () => {
    if (!okUrl(f.appUrl)) return toast.error('App URL must be an https address such as https://os.example.com (no path)');
    // Send only what the administrator changed: saving one field never copies an env / default value into the settings store.
    const patch = {};
    if (normUrl(f.appUrl) !== normUrl(s.appUrl)) patch.appUrl = normUrl(f.appUrl);
    if (f.companyName.trim() !== String(s.companyName ?? '').trim()) { if (!f.companyName.trim()) return toast.error('Company name cannot be empty'); patch.companyName = f.companyName.trim(); }
    if (f.appName.trim() !== String(s.appName ?? '').trim()) { if (!f.appName.trim()) return toast.error('App name cannot be empty'); patch.appName = f.appName.trim(); }
    const hooks = Object.fromEntries(Object.entries(f.webhooks).map(([k, v]) => [k, String(v ?? '').trim()]).filter(([k, v]) => v !== String(s.webhooks?.[k] ?? '').trim()));
    if (Object.keys(hooks).length) patch.webhooks = hooks;
    if (!Object.keys(patch).length) return toast.info('Nothing to save — no value was changed');
    setSaving(true);
    try {
      const r = await actions.saveAdminSettings(patch);
      if (r?.ok === false) return toast.error(r.message);
      toast.success('Saved — screens and workflow calls use the new values now'); await load(); router.refresh();
    } catch { toast.error('Could not save — try again'); } finally { setSaving(false); }
  };
  const rotate = async () => {
    if (rot === 'paste' && pasted.trim().length < 24) return toast.error('A pasted token needs at least 24 characters');
    setRotating(true);
    try {
      const r = await actions.rotateInboundToken(rot === 'paste' ? { token: pasted.trim() } : {});
      if (r?.ok === false) return toast.error(r.message);
      setRot(null); setPasted(''); setNewToken(r?.token ?? null);   // `token` comes back only for a generated one
      toast.success(`New inbound token set${r?.last4 ? ` (ends ${r.last4})` : ''} — the old one keeps working for 24 hours`); await load();
    } catch { toast.error('Could not change the token — try again'); } finally { setRotating(false); }
  };
  const copyToken = async () => { try { await navigator.clipboard.writeText(newToken); toast.success('Token copied'); } catch { toast.error('Could not copy — select the token and copy it by hand'); } };
  return (
    <div className={`${CARD} p-6 space-y-5`} data-os-admin-settings>
      <div><h3 className={SECTION_TITLE}>Connections &amp; identity</h3><p className="text-xs text-ink-3 mt-1">Administrators only. Workflows called by this app receive these values in every call, so a change reaches them at once.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className={FIELD_LABEL}>Company name</label><Input value={f.companyName} maxLength={120} onChange={(e) => setF({ ...f, companyName: e.target.value })} className="rounded-xl" aria-label="Company name" /></div>
        <div><label className={FIELD_LABEL}>App name</label><Input value={f.appName} maxLength={80} onChange={(e) => setF({ ...f, appName: e.target.value })} className="rounded-xl" aria-label="App name" /></div>
      </div>
      <div><label className={FIELD_LABEL}>App URL <span className="font-normal text-ink-3">(the address workflows write back to{s.sources?.appUrl === 'env' ? ' · from the environment' : ''})</span></label><Input value={f.appUrl} placeholder="https://your-os.example.com" status={okUrl(f.appUrl) ? undefined : 'error'} onChange={(e) => setF({ ...f, appUrl: e.target.value })} className="rounded-xl" aria-label="App URL" />
        <p className="text-xs text-ink-3 mt-1">Only the address workflows use. Sign-in and cookies keep using the deployment&apos;s own origin, so a typing mistake here cannot lock anyone out. If <code>APP_ORIGIN</code> is later changed in the deployment&apos;s environment, that newer value takes over.</p></div>
      <div data-os-token>
        <label className={FIELD_LABEL}>Inbound token{s.inboundTokenSource === 'env' && <span className="font-normal text-ink-3"> (from the environment)</span>}</label>
        <div className="flex flex-wrap items-center gap-2">
          <code className="px-3 py-1.5 rounded-xl bg-surface-2 text-[13px] text-ink tabular" data-os-token-masked>{s.inboundToken || '••••'}</code>
          <Button icon={<RefreshCw className="w-4 h-4" />} className="rounded-xl" onClick={() => setRot('generate')}>Generate new</Button>
          <Button icon={<ClipboardPaste className="w-4 h-4" />} className="rounded-xl" onClick={() => setRot('paste')}>Paste a token</Button>
        </div>
        <p className="text-xs text-ink-3 mt-1.5">The token is shown masked; a newly generated one is shown in full once. {prevLive ? <>The previous token still works until <strong>{prevUntil.toLocaleString()}</strong>.</> : prevUntil ? 'The previous token has expired.' : 'When you change it, the previous token keeps working for 24 hours.'} A newer <code>INBOUND_TOKEN</code> set in the deployment&apos;s environment also takes over, with the same 24 hours for the old one.</p>
        {newToken && (
          <div className="mt-3 rounded-[var(--r-8)] border border-surface-border bg-surface-2 p-3 space-y-2" data-os-new-token role="status">
            <p className="text-[13px] font-semibold text-ink">Your new inbound token</p>
            <div className="flex flex-wrap items-center gap-2"><code className="px-3 py-1.5 rounded-xl bg-surface text-[13px] text-ink break-all select-all" data-os-token-once>{newToken}</code><Button icon={<Copy className="w-4 h-4" />} className="rounded-xl" onClick={copyToken}>Copy</Button><Button className="rounded-xl" onClick={() => setNewToken(null)}>Done</Button></div>
            <p className="text-xs text-ink-3">Copy it now — it will be shown masked from now on; flows started by a schedule or email need it written in.</p>
          </div>
        )}
        {rot && (
          <div className="mt-3 rounded-[var(--r-8)] border border-surface-border p-3 space-y-3" data-os-token-change>
            {rot === 'paste'
              ? <div><label className={FIELD_LABEL}>New token</label><Input.Password value={pasted} onChange={(e) => setPasted(e.target.value)} autoComplete="off" className="rounded-xl" aria-label="New inbound token" /><p className="text-xs text-ink-3 mt-1">Use this to keep a token you also store elsewhere, for workflows that are not called by this app.</p></div>
              : <p className="text-sm text-ink-2">The app creates a new random token. Workflows this app calls pick it up from the next call; the old token keeps working for 24 hours.</p>}
            <div className="flex gap-2"><Button type="primary" loading={rotating} className="rounded-full bg-primary-500 border-0" onClick={rotate}>{rot === 'paste' ? 'Use this token' : 'Generate and use'}</Button><Button className="rounded-full" onClick={() => { setRot(null); setPasted(''); }}>Cancel</Button></div>
          </div>
        )}
      </div>
      {flows.length > 0 && (
        <div data-os-flow-urls>
          <label className={FIELD_LABEL}>Flow webhook URLs</label>
          <p className="text-xs text-ink-3 mb-2">The Studio webhook address of each workflow this app calls. A value here replaces the one set at deployment; leave empty to use the deployment's <code>WEBHOOK_&lt;FLOW&gt;</code> value.</p>
          <div className="space-y-2">
            {flows.map((fl) => (
              <div key={fl}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"><span className="sm:w-48 shrink-0 text-[13px] font-medium text-ink-2 truncate" title={fl}>{fl.replace(/_/g, ' ')}</span>
                  <Input value={f.webhooks[fl] ?? ''} placeholder="https://…" onChange={(e) => setF({ ...f, webhooks: { ...f.webhooks, [fl]: e.target.value } })} className="rounded-xl" aria-label={`Webhook URL for ${fl}`} /></div>
                {s.studioFlowIds?.[fl] && <p className="text-xs text-ink-3 sm:pl-[12.75rem] mt-0.5">Studio flow id the platform gave this deployment: <code>{s.studioFlowIds[fl]}</code></p>}
              </div>
            ))}
          </div>
          {s.studioFlowIds && Object.keys(s.studioFlowIds).length > 0 && !flows.some((fl) => s.studioFlowIds[fl]) && <p className="text-xs text-ink-3 mt-2">Studio flow ids on this deployment: {Object.entries(s.studioFlowIds).map(([k, v]) => `${k} ${v}`).join(' · ')}</p>}
        </div>
      )}
      <div><Button type="primary" loading={saving} className="rounded-full bg-primary-500 border-0" data-os-save-admin-settings onClick={save}>Save changes</Button></div>
      {written.length > 0 && (
        <div className="rounded-[var(--r-8)] bg-warn-soft text-warn-text p-3 text-[13px]" data-os-written-flows role="note">
          <p className="font-semibold mb-1">Flows with these values written in</p>
          <p className="mb-1.5">{written.join(', ')}</p>
          <p className="text-xs">These start from a schedule, an email or a website form, so the app cannot hand them the new values. After you change the app URL or the token, rebuild them with <code>--inbound-token &lt;the token shown once&gt;</code> and re-import them in Studio.</p>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateProfile, changePassword } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [pwOpen, setPwOpen] = useState(false); const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  useEffect(() => setName(user?.name || ''), [user]);
  const stock = !user?.roleLabel || user.roleLabel === ROLE_LABELS[user?.role];   // the yaml's own wording only while the role keeps its stock name

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6 max-w-3xl">
      <div className={`${CARD} p-6 space-y-4`}>
        <h3 className={SECTION_TITLE}>Profile</h3>
        <div className="flex items-center gap-4"><ProfileAvatar size={56} /><div><p className="font-semibold text-gray-900">{user?.name}</p><p className="text-xs text-gray-500">{user?.email}</p><span className="badge badge-neutral mt-1" data-os-role-chip><span data-dot className={cn('w-2 h-2 rounded-full shrink-0', ROLE_COLORS[user?.role])} style={ROLE_COLORS[user?.role] ? undefined : { background: 'var(--ink-3)' }} aria-hidden />{user?.roleLabel ?? ROLE_LABELS[user?.role] ?? user?.role}</span></div></div>
        <p className="text-xs text-ink-3" data-os-role-desc>{stock && ROLE_DESC[user?.role] ? ROLE_DESC[user.role] : accessOf(user).all ? 'This role opens every page.' : `This role opens ${Object.keys(user?.pages ?? {}).length} pages.`}</p>
        <div><label className={FIELD_LABEL}>Display name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" /></div>
        <div className="flex gap-2"><Button type="primary" className="rounded-full bg-primary-500 border-0" onClick={async () => { const r = await updateProfile({ name: name.trim() }); if (r?.ok === false) return toast.error(r.message); toast.success('Profile updated'); }}>Save</Button><Button icon={<KeyRound className="w-4 h-4" />} className="rounded-xl" onClick={() => setPwOpen(true)}>Change password</Button></div>
      </div>

      {user?.role === 'admin' && <AdminSettings />}

      <Modal isOpen={pwOpen} onClose={() => setPwOpen(false)} title="Change password" size="sm">
        <div className="space-y-3">
          {['current', 'next', 'confirm'].map((k) => <div key={k}><label className={FIELD_LABEL}>{k === 'current' ? 'Current password' : k === 'next' ? 'New password' : 'Confirm new password'}</label><Input.Password value={pw[k]} onChange={(e) => setPw({ ...pw, [k]: e.target.value })} className="rounded-xl" /></div>)}
          <Button type="primary" block className="rounded-full bg-primary-500 border-0" onClick={async () => { if (pw.next !== pw.confirm) return toast.error('Passwords do not match'); const r = await changePassword(user?.email, pw.current, pw.next); if (!r.success) return toast.error(r.message); setPwOpen(false); setPw({ current: '', next: '', confirm: '' }); toast.success('Password changed'); }}>Save</Button>
        </div>
      </Modal>
    </motion.div>
  );
}
