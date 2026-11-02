// navScroll — an adapter for a kernel defect (reported to the skill owner; the kernel is not edited here).
// The sidebar menu (components/Sidebar.jsx, `nav[data-os-nav]`) scrolls when the pages do not fit, but it is rendered again on
// every page change and starts at the top: after clicking a module near the bottom (Team, Users & roles…) the menu jumps back
// to Overview and the module just opened is out of sight — it looks as if the first module had opened.
// This keeps the menu where the person left it and, when the open page changes, brings its item into view.
// Loaded once, from src/custom/index.js.
const KEY = 'os:nav-scroll';
const NAV = 'nav[data-os-nav]';
const MARGIN = 8;

const read = () => { try { return Number(sessionStorage.getItem(KEY)) || 0; } catch { return 0; } };
const write = (y) => { try { sessionStorage.setItem(KEY, String(Math.round(y))); } catch { /* private mode: keep working without memory */ } };

const seen = new WeakSet();
let lastActive = null;

function reveal(nav, item) {
  const r = item.getBoundingClientRect(); const box = nav.getBoundingClientRect();
  if (r.top < box.top + MARGIN) nav.scrollTop -= box.top + MARGIN - r.top;
  else if (r.bottom > box.bottom - MARGIN) nav.scrollTop += r.bottom - (box.bottom - MARGIN);
}

function settle() {
  for (const nav of document.querySelectorAll(NAV)) {
    if (nav.scrollHeight <= nav.clientHeight) continue;               // the menu fits: nothing to keep
    const fresh = !seen.has(nav);
    if (fresh) { seen.add(nav); const y = read(); if (y) nav.scrollTop = y; }
    const item = nav.querySelector('[aria-current="page"]');
    const key = item?.getAttribute('href') ?? null;
    // only when the open page changed (or the menu was just drawn) — never fight someone scrolling the menu by hand
    if (item && (fresh || key !== lastActive)) reveal(nav, item);
    if (key) lastActive = key;
  }
}

if (typeof window !== 'undefined' && !window.__osNavScroll) {
  window.__osNavScroll = true;
  document.addEventListener('scroll', (e) => { const t = e.target; if (t instanceof Element && t.matches(NAV)) write(t.scrollTop); }, true);
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; settle(); }); };
  const start = () => { new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current'] }); later(); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
}

export {};
