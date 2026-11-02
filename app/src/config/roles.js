// src/config/roles.js — generated from os.yaml roles[].
export const ROLES = {"ADMIN": "admin", "OFFICE": "office", "COUNSELLOR": "counsellor", "MENTOR": "mentor"};
export const ROLE_PERMISSIONS = {"admin": ["*"], "office": ["attendance", "students", "scores", "fees", "messages", "alerts", "courses", "batches", "settings"], "counsellor": ["leads", "calls", "students", "parents", "alerts", "messages", "settings"], "mentor": ["academic", "scores", "students", "attendance", "calls", "settings"]};
export const ROLE_LABELS = {"admin": "Director", "office": "Office admin", "counsellor": "Counsellor", "mentor": "Mentor"};
export const ROLE_COLORS = {"admin": "bg-primary-500", "office": "bg-stage-4", "counsellor": "bg-stage-3", "mentor": "bg-stage-2"};
export const ROLE_HOME = {"admin": "/", "office": "/attendance", "counsellor": "/leads", "mentor": "/academic"};
export const ROLE_DESC = {"admin": "Runs the institute: what needs action, leads, students, fees, parents and every AI call", "office": "Marks attendance, enrols students, records fees and sends WhatsApp templates", "counsellor": "Works the leads the AI qualified, follows up absences and parent concerns", "mentor": "Looks after at-risk students: counselling calls, scores and mentor sessions"};   // plain-language access description shown in Settings (audit M12)
// v5.1: the pages Administrator's menu lists (os.yaml roles[admin].pages); null = every page. Access stays unrestricted.
export const ADMIN_MENU = null;
export function homeFor(role) { return ROLE_HOME[role] ?? '/'; }
