// navScroll — an adapter for a kernel defect (reported to the skill owner; the kernel is not edited here).
// The sidebar menu (components/Sidebar.jsx, `nav[data-os-nav]`) scrolls when the pages do not fit, but it is rendered again on
// every page change and starts at the top: after clicking a module near the bottom (Team, Users & roles…) the menu jumps back
// to Overview and the module just opened is out of sight — it looks as if the first module had opened.
// This keeps the menu's scroll across a page change that a click IN the menu started. A fresh page load is left alone
// (the kernel's own behaviour; ui_check N1 hovers the first items there). Loaded once, from src/custom/index.js.
const NAV = 'nav[data-os-nav]';
const HOLD_MS = 1500;   // the new page renders and settles within this; after it the menu is the person's again

let hold = null;        // { top, until } — the scroll to keep while the page the click opened is drawn

function keep() {
  if (!hold) return;
  if (Date.now() > hold.until) { hold = null; return; }
  for (const nav of document.querySelectorAll(NAV)) if (nav.offsetParent !== null && Math.abs(nav.scrollTop - hold.top) > 1) nav.scrollTop = hold.top;
}

if (typeof window !== 'undefined' && !window.__osNavScroll) {
  window.__osNavScroll = true;
  document.addEventListener('click', (e) => {
    const nav = e.target?.closest?.(NAV);
    if (nav && e.target.closest('a[href]')) hold = { top: nav.scrollTop, until: Date.now() + HOLD_MS };
  }, true);
  let queued = false;
  const later = () => { if (!hold || queued) return; queued = true; requestAnimationFrame(() => { queued = false; keep(); }); };
  const start = () => new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
}

export {};
