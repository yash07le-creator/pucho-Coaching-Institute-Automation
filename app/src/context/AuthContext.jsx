'use client';
// AuthContext — the signed-in person, as the server read them from the session cookie (a DTO: id, email, name, role, and since v5.1
// the role's resolved access — `pages` ('*' = all, else { pageId: 'view' | 'edit' }), `editPages` ('*' | pageId[]), `roleLabel` — plus
// `mustChangePassword` / `mustChangeEmail`; never a password hash, never a token). login / logout / codes / profile / password call Server Actions; nothing about
// the session lives in the browser beyond the HttpOnly cookie the server set.
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import * as actions from '../app/actions';
import { rememberWho } from '../utils/api';
import { matchRoute } from '../lib/routes';
import { ADMIN_MENU } from '../config/roles';
import { NAV } from '../config/nav';

const AuthContext = createContext(null);

export function AuthProvider({ user: initial, children }) {
  const router = useRouter();
  const [user, setUser] = useState(initial ?? null);
  useEffect(() => { setUser(initial ?? null); }, [initial]);
  useEffect(() => { rememberWho(user?.name); }, [user]);

  const login = useCallback(async (email, password) => {
    if (!email || !password) return { success: false, message: 'Please enter email and password' };
    const r = await actions.signIn({ email, password });
    if (r.ok) { setUser(r.user); router.refresh(); return { success: true, user: r.user }; }
    return { success: false, message: r.message };
  }, [router]);

  const loginAsPersona = useCallback(async (role) => {
    const r = await actions.signInAsPersona({ role });
    if (r.ok) { setUser(r.user); router.refresh(); return { success: true, user: r.user }; }
    return { success: false, message: r.message };
  }, [router]);

  const sendOtp = useCallback(async (email) => { const r = await actions.requestCode({ email }); return r.ok ? { success: true, delivery: r.delivery } : { success: false, message: r.message }; }, []);
  const verifyOtp = useCallback(async (email, code) => {
    const r = await actions.verifyCode({ email, code });
    if (r.ok) { setUser(r.user); router.refresh(); return { success: true, user: r.user }; }
    return { success: false, message: r.message };
  }, [router]);

  const updateProfile = useCallback(async (patch) => {
    if (patch.name) { const r = await actions.updateProfile({ name: patch.name }); if (!r.ok) return r; }
    setUser((prev) => ({ ...(prev || {}), ...patch })); router.refresh(); return { ok: true };
  }, [router]);

  const changePassword = useCallback(async (_email, currentPassword, newPassword) => {
    const r = await actions.changePassword({ current: currentPassword || '', next: newPassword || '' });
    return r.ok ? { success: true } : { success: false, message: r.message };
  }, []);

  const logout = useCallback(async () => { await actions.signOut(); setUser(null); router.push('/login'); router.refresh(); }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, loading: false, mode: 'db', login, loginAsPersona, logout, updateProfile, changePassword, sendOtp, verifyOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

// Administrator's MENU (v5.1, as in v5.0): the pages os.yaml lists for admin, plus Settings and Users & roles; null = every page.
// Only what is LISTED — sidebar, overview links, KPI targets, header search — never what the page gate, DAL or actions allow.
const ADMIN_MENU_SET = ADMIN_MENU ? new Set([...ADMIN_MENU, ...NAV.filter((n) => n.kind === 'settings' || n.kind === 'users').map((n) => n.id)]) : null;

/** What the signed-in person may open and edit, from their resolved role (v5.1) — never the static ROLE_PERMISSIONS.
 *  `pages`: '*' | { pageId: 'view' | 'edit' } | pageId[]  ·  `editPages`: '*' | pageId[]. Returns { has(pageId), canEdit(pageId), all,
 *  shows(pageId), showsAll }: `has` is access (Administrator: every page); `shows` is what menus list (Administrator: ADMIN_MENU). */
export function accessOf(user) {
  const p = user?.pages;
  const keys = p === '*' ? null : Array.isArray(p) ? p : Object.keys(p ?? {});
  const ep = user?.editPages ?? (p === '*' ? '*' : undefined);   // pages '*' without editPages = edit everywhere (administrator)
  const edits = ep === '*' ? null : Array.isArray(ep) ? new Set(ep) : (p && p !== '*' && !Array.isArray(p) ? new Set(Object.keys(p).filter((k) => p[k] === 'edit')) : new Set());
  const has = (id) => p === '*' || (!!id && keys.includes(id));
  const menu = p === '*' && user?.role === 'admin' ? ADMIN_MENU_SET : null;
  return { all: p === '*', has, canEdit: (id) => ep === '*' || (!!id && edits !== null && edits.has(id)),
           shows: (id) => (menu ? !!id && menu.has(id) : has(id)), showsAll: p === '*' && !menu };
}

/** Whether the signed-in person may EDIT the page the current route belongs to (false on a view-only page). Use it to leave action
 *  buttons out of a view-only page; the server refuses the write anyway (v5.1 roles, level 2). Routes outside any page → true. */
export function useCanEditPage() {
  const { user } = useAuth(); const pathname = usePathname();
  const pg = matchRoute(pathname || '/')?.page;
  return !pg || pg.public || !user || accessOf(user).canEdit(pg.id);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
