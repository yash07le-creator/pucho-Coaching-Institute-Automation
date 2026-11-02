'use client';
// Providers — the client root: antd (every dropdown opens downward — config/popup.js; the gate's M4 asserts it), the
// signed-in person, the UI language, toasts, the error boundary, and the PWA service worker in production.
// v4.9: the light / dark theme lives here. <ThemeProvider> owns `html[data-theme]`, persists the choice (localStorage `pucho-theme`:
// 'light' | 'dark' | 'system', default 'system' = prefers-color-scheme) and mirrors it to a cookie so the server renders the same antd
// algorithm; antd switches between THEME and DARK (+ darkAlgorithm) with it, so tables, modals, inputs, selects, date pickers and
// dropdowns are dark too. The inline script in app/layout.tsx sets data-theme before first paint (no flash).
import { StrictMode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { Toaster } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from '../context/AuthContext';
import { LangProvider } from '../i18n';
import ErrorFallback from './ErrorFallback';
import { THEME, DARK } from '../config/theme';
import { getPopupContainer } from '../config/popupContainer';
import { OS } from '../config/os.config';

// ── runtime branding (v5.1, G7) ───────────────────────────────────────────────────────────────────────────────
// The client's company name and the product title are read on the SERVER at request time (settings → env → os.yaml) and handed
// down by app/layout.tsx — never NEXT_PUBLIC_* (that is inlined at build time; one image must serve any client). The fallback
// is only what a component outside the provider would see: the os.yaml names.
const BrandingCtx = createContext({ companyName: (OS.client || OS.name || '').split(',')[0].trim(), appName: OS.name });
/** { companyName, appName } — the names this deployment runs under. */
export const useBranding = () => useContext(BrandingCtx);

// ── theme controller ──────────────────────────────────────────────────────────────────────────────────────────
// v5.1.1 (owner report 31 Oct): <ServerOnly> renders its children in the server HTML only. The no-flash theme <script> in app/layout.tsx
// sits inside it: the browser runs it while <head> is parsed (before first paint), and React never creates it on the client — React 19
// warns "Encountered a script tag while rendering React component" whenever it has to (a not-found page or an error recovery
// re-renders the root in the browser), and a script React creates never runs anyway. Hydration skips the extra <head> node (React 19).
export function ServerOnly({ children }) { return typeof window === 'undefined' ? children : null; }
export const THEME_KEY = 'pucho-theme';
const COOKIE = 'pucho-theme', COOKIE_R = 'pucho-theme-r';
const prefersDark = () => { try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } };
const clean = (m) => (m === 'light' || m === 'dark' ? m : 'system');
function readMode() { try { return clean(localStorage.getItem(THEME_KEY)); } catch { return 'system'; } }
function paint(mode, resolved) {
  const el = document.documentElement;
  if (el.getAttribute('data-theme') !== resolved) el.setAttribute('data-theme', resolved);
  el.setAttribute('data-theme-mode', mode);
  try { document.cookie = `${COOKIE}=${mode};path=/;max-age=31536000;samesite=lax`; document.cookie = `${COOKIE_R}=${resolved};path=/;max-age=31536000;samesite=lax`; } catch { /* cookies blocked: the inline script still covers first paint */ }
}

const ThemeCtx = createContext({ mode: 'system', theme: 'light', setMode: () => {}, toggle: () => {} });
/** { mode: 'light'|'dark'|'system', theme: 'light'|'dark' (what is shown), setMode(m), toggle(followSystem?) } */
export const useThemeMode = () => useContext(ThemeCtx);

/** `initial` = { mode, theme } as the server rendered it (from the cookie) so antd's SSR style matches the first client render. */
export function ThemeProvider({ initial, children }) {
  const [mode, setModeState] = useState(initial?.mode ?? 'system');
  const [theme, setTheme] = useState(initial?.theme ?? 'light');
  const apply = useCallback((m) => { const r = m === 'system' ? (prefersDark() ? 'dark' : 'light') : m; setModeState(m); setTheme(r); paint(m, r); return r; }, []);
  useEffect(() => { apply(readMode()); }, [apply]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => { if (readMode() === 'system') apply('system'); };
    const onStorage = (e) => { if (e.key === THEME_KEY) apply(readMode()); };
    mq.addEventListener?.('change', onMq); window.addEventListener('storage', onStorage);
    return () => { mq.removeEventListener?.('change', onMq); window.removeEventListener('storage', onStorage); };
  }, [apply]);
  const setMode = useCallback((m) => { const v = clean(m); try { localStorage.setItem(THEME_KEY, v); } catch { /* private mode: lives for this page only */ } apply(v); }, [apply]);
  // One click always flips what you SEE (light <-> dark); Shift-click returns to "follow the system".
  const toggle = useCallback((follow) => setMode(follow ? 'system' : theme === 'dark' ? 'light' : 'dark'), [setMode, theme]);
  const value = useMemo(() => ({ mode, theme, setMode, toggle }), [mode, theme, setMode, toggle]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

const DARK_THEME = { algorithm: antdTheme.darkAlgorithm, ...DARK };

function Themed({ user, children }) {
  const { theme } = useThemeMode();
  return (
    <ConfigProvider getPopupContainer={getPopupContainer} theme={theme === 'dark' ? DARK_THEME : THEME}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AuthProvider user={user}>
          <LangProvider>
            {children}
            <Toaster position="bottom-right" richColors theme={theme} />
          </LangProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default function Providers({ user, theme, branding, children }) {
  const brand = useMemo(() => ({ companyName: branding?.companyName || (OS.client || OS.name || '').split(',')[0].trim(), appName: branding?.appName || OS.name }), [branding?.companyName, branding?.appName]);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return (
    <StrictMode>
      <BrandingCtx.Provider value={brand}>
        <ThemeProvider initial={theme}>
          <Themed user={user}>{children}</Themed>
        </ThemeProvider>
      </BrandingCtx.Provider>
    </StrictMode>
  );
}
