// noticeBadges — an adapter for a kernel gap (reported to the skill owner; the kernel is not edited here).
// A table badge column cannot declare a colour per value (the kanban's `colors:` has no table twin): components/StatusBadge.jsx
// colours a badge from its word, so "WhatsApp Sent" comes out grey and "Present" takes the steel stage ramp.
// Owner, 3 Nov 2026 — the WhatsApp Notice states read Present (soft green) · WhatsApp Sent (indigo) · Delivered (green) ·
// Failed (red). Delivered and Failed get theirs from the word; Present is repainted in CSS (noticeBadges.css, via its
// data-os-stage). "WhatsApp Sent" has no attribute to select on, so it is painted here — but ONLY on a badge React already
// owns: touching the server HTML before hydration makes React report a mismatch. Loaded once, from src/custom/index.js.
import './noticeBadges.css';

const PAINT = { 'WhatsApp Sent': 'os-notice-sent' };   // the indigo tint, in noticeBadges.css
const hydrated = (el) => Object.keys(el).some((k) => k.startsWith('__reactFiber$'));   // React has claimed this node

let retry = null;
function paint() {
  let waiting = false;
  for (const el of document.querySelectorAll('span.badge')) {
    const cls = PAINT[el.textContent.trim()];
    if (!cls || el.classList.contains(cls)) continue;
    if (!hydrated(el)) { waiting = true; continue; }
    el.classList.add(cls);
  }
  // hydration changes no DOM, so nothing wakes the observer after it: look again until React has claimed every badge
  clearTimeout(retry); if (waiting) retry = setTimeout(paint, 200);
}

if (typeof window !== 'undefined' && !window.__osNoticeBadges) {
  window.__osNoticeBadges = true;
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; paint(); }); };
  const start = () => { new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true }); later(); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
}

export {};
