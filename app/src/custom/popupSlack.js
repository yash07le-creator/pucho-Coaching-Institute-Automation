// popupSlack — an adapter for a kernel defect (reported to the skill owner; the kernel is not edited here).
// config/popup.js `ensureRoomBelow` gives a modal extra bottom padding so a select / date picker near its foot can open
// downward, and never takes it back: after the picker closes, the modal keeps an empty band under its buttons.
// This removes that padding once no select or picker list is open any more. Loaded once, from src/custom/index.js.
const OPEN = '.ant-select-dropdown:not(.ant-select-dropdown-hidden), .ant-picker-dropdown:not(.ant-picker-dropdown-hidden)';

function release() {
  if (document.querySelector(OPEN)) return;                 // a list is still open: it still needs the room
  for (const panel of document.querySelectorAll('[data-os-slack]')) {
    panel.style.paddingBottom = '';
    delete panel.dataset.osSlack;
  }
}

if (typeof window !== 'undefined' && !window.__osPopupSlack) {
  window.__osPopupSlack = true;
  // antd closes its lists after a short animation, so look again a moment after the click / key / focus change
  const later = () => window.setTimeout(release, 350);
  document.addEventListener('mousedown', later, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'Tab') later(); }, true);
  document.addEventListener('focusout', later, true);
}

export {};
