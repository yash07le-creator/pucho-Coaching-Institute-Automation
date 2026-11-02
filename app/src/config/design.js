// src/config/design.js — GENERATED from os.yaml `brand:` + `design:` + `portals[].shell`. Do not edit; edit os.yaml.
// The shell (how navigation is laid out) and the look (tone, radius, density) are declared per client here;
// the token values themselves live in tokens.css. Components read DESIGN, never a literal.
export const DESIGN = {
  "shell": "sidebar",
  "shells": {
    "admin": "sidebar"
  },
  "sidebar": {
    "action": {
      "label": "Add lead",
      "page": "leads",
      "modal": "add_lead"
    },
    "style": "light",
    "width": 260,
    "footer": "profile"
  },
  "sidebar_styles": {},
  "header": {
    "style": "blur",
    "show_name": true
  },
  "powered_by": true,
  "tone": "pucho",
  "radius": "pucho",
  "density": "comfortable",
  "brand": {
    "name": "EduFlow",
    "color": "#4F46E5",
    "logo": null,
    "icon": null
  }
};

// The shell for a portal: `sidebar` (a full-width nav rail) or `rail` (an icon rail with a section panel).
export function shellFor(portalId) { return DESIGN.shells?.[portalId] ?? DESIGN.shell ?? 'sidebar'; }
