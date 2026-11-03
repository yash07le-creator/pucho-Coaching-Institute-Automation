// noticeBadges — an adapter for a kernel gap (reported to the skill owner; the kernel is not edited here).
// A table badge column cannot declare a colour per value (the kanban's `colors:` has no table twin): components/StatusBadge.jsx
// colours a badge from its word, so "WhatsApp Sent" comes out grey and "Present" takes the steel stage ramp.
// Owner, 3 Nov 2026 — the WhatsApp Notice states read Present (soft green) · WhatsApp Sent (indigo) · Delivered (green) ·
// Failed (red). Delivered and Failed already get theirs from the word; this paints the other two wherever a badge shows them.
// Loaded once, from src/custom/index.js.
const PAINT = { Present: 'badge-success', 'WhatsApp Sent': 'badge-brand' };
const OTHERS = ['badge-success', 'badge-brand', 'badge-info', 'badge-warning', 'badge-danger', 'badge-neutral'];

function paint(root) {
  for (const el of root.querySelectorAll('span.badge')) {
    const cls = PAINT[el.textContent.trim()];
    if (!cls || el.classList.contains(cls)) continue;
    el.classList.remove(...OTHERS); el.classList.add(cls);
    el.removeAttribute('style');   // a stage-ramp badge carries its colour inline
  }
}

if (typeof window !== 'undefined' && !window.__osNoticeBadges) {
  window.__osNoticeBadges = true;
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; paint(document); }); };
  const start = () => { paint(document); new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
}

export {};
