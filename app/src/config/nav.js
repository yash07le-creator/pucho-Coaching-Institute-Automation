// src/config/nav.js — generated from os.yaml portals[] + pages[]. ONE place: sidebar (with groups/children), header title/description, quick links, guards.
export const PORTALS = [{"id": "admin", "label": "Admin", "base": "/", "roles": ["admin", "office", "counsellor", "mentor"]}];
export const NAV = [
  {
    "id": "overview",
    "portal": "admin",
    "path": "/",
    "label": "Overview",
    "icon": "LayoutDashboard",
    "desc": "What needs action today, then the institute's numbers",
    "kind": "overview"
  },
  {
    "id": "alerts",
    "portal": "admin",
    "path": "/alerts",
    "label": "Alerts & escalations",
    "icon": "BellRing",
    "desc": "",
    "group": "Overview",
    "kind": "page",
    "badge": {
      "entity": "alerts",
      "where": "Status=Open"
    },
    "subtitle": "Everything the agents and the rules flagged for a person to act on"
  },
  {
    "id": "leads",
    "portal": "admin",
    "path": "/leads",
    "label": "Leads",
    "icon": "Users",
    "desc": "",
    "group": "Admissions",
    "subtitle": "Every enquiry — called by the AI, graded HOT, WARM or COLD, followed up by a counsellor"
  },
  {
    "id": "calls",
    "portal": "admin",
    "path": "/calls",
    "label": "AI call log",
    "icon": "PhoneCall",
    "desc": "",
    "group": "Admissions",
    "kind": "page",
    "subtitle": "Every call the five agents made — outcome, sentiment and transcript"
  },
  {
    "id": "students",
    "portal": "admin",
    "path": "/students",
    "label": "Students",
    "icon": "GraduationCap",
    "desc": "",
    "group": "Students",
    "kind": "page",
    "subtitle": "Every enrolled student — attendance, scores, fees and how the parents feel"
  },
  {
    "id": "attendance",
    "portal": "admin",
    "path": "/attendance",
    "label": "Attendance",
    "icon": "CalendarCheck",
    "desc": "",
    "group": "Students",
    "badge": {
      "entity": "attendance",
      "where": "Needs_Followup=Yes and Followup_Done!=Yes"
    },
    "subtitle": "Mark a batch; parents of absent students get a formal WhatsApp notice"
  },
  {
    "id": "academic",
    "portal": "admin",
    "path": "/academic",
    "label": "Academic",
    "icon": "Activity",
    "desc": "",
    "group": "Students",
    "kind": "page",
    "subtitle": "Students below 75% attendance or 60% score — counselled every Monday, escalated to a mentor"
  },
  {
    "id": "scores",
    "portal": "admin",
    "path": "/scores",
    "label": "Test scores",
    "icon": "ClipboardList",
    "desc": "",
    "group": "Students",
    "kind": "page",
    "subtitle": "Marks per test and subject — they feed attendance-and-score risk every night"
  },
  {
    "id": "fees",
    "portal": "admin",
    "path": "/fees",
    "label": "Fees",
    "icon": "IndianRupee",
    "desc": "",
    "group": "Finance",
    "kind": "page",
    "badge": {
      "entity": "fees",
      "where": "Status=Overdue"
    },
    "subtitle": "Overdue fees get a call on day 1, 7 and 15 and a WhatsApp link; record payments as they come in"
  },
  {
    "id": "parents",
    "portal": "admin",
    "path": "/parents",
    "label": "Parent updates",
    "icon": "HeartHandshake",
    "desc": "",
    "group": "Communication",
    "kind": "page",
    "subtitle": "Friday reports and calls — how each parent feels, and who raised a concern"
  },
  {
    "id": "messages",
    "portal": "admin",
    "path": "/messages",
    "label": "WhatsApp",
    "icon": "MessageCircle",
    "desc": "",
    "group": "Communication",
    "kind": "page",
    "subtitle": "Every template the agents and the office sent, with delivery status"
  },
  {
    "id": "courses",
    "portal": "admin",
    "path": "/courses",
    "label": "Courses",
    "icon": "BookOpen",
    "desc": "",
    "group": "Setup",
    "kind": "page",
    "subtitle": "The courses this institute teaches — the enrolment, lead and score forms list them"
  },
  {
    "id": "batches",
    "portal": "admin",
    "path": "/batches",
    "label": "Batches",
    "icon": "Clock",
    "desc": "",
    "group": "Setup",
    "subtitle": "Morning, evening and weekend batches — time, days and the courses each one teaches"
  },
  {
    "id": "team",
    "portal": "admin",
    "path": "/team",
    "label": "Team",
    "icon": "Contact",
    "desc": "",
    "group": "Setup",
    "kind": "page",
    "subtitle": "Counsellors, mentors and office staff — their WhatsApp numbers receive the agents' alerts"
  },
  {
    "id": "users",
    "portal": "admin",
    "path": "/users",
    "label": "Users & roles",
    "icon": "Users",
    "desc": "Everyone who can sign in, and what each role may open",
    "group": "Setup",
    "kind": "users",
    "subtitle": "Add people, reset passwords, change roles"
  },
  {
    "id": "settings",
    "portal": "admin",
    "path": "/settings",
    "label": "Settings",
    "icon": "Settings",
    "desc": "Profile, password, flow webhook URLs",
    "kind": "settings"
  }
];
export function portalFor(pathname) {
  return [...PORTALS].sort((a, b) => b.base.length - a.base.length).find((p) => pathname === p.base || pathname.startsWith(p.base === '/' ? '/' : p.base + '/')) ?? PORTALS[0];
}
export function navFor(portalId) { return NAV.filter((n) => n.portal === portalId); }
export function metaForPath(pathname) {
  const hit = [...NAV].sort((a, b) => b.path.length - a.path.length).find((n) => pathname === n.path || (n.path !== '/' && pathname.startsWith(n.path + '/')));
  return hit ?? { label: 'EduFlow', desc: '' };
}
