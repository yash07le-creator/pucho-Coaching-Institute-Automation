// src/config/pages.js — generated from os.yaml pages[]. Do not edit; edit os.yaml.
export const PAGES = [
  {
    "id": "overview",
    "covers": [
      "R9",
      "R28",
      "R37",
      "R40"
    ],
    "kind": "overview",
    "route": "/",
    "label": "Overview",
    "icon": "LayoutDashboard",
    "desc": "What needs action today, then the institute's numbers",
    "greeting": "Here is what needs you today.",
    "quick_links": false,
    "kpis": [
      {
        "metric": "students_active",
        "entity": "students",
        "label": "Active students",
        "tone": "auto",
        "icon": "GraduationCap",
        "formula": "count where Status!=Inactive",
        "filter": "Status!=Inactive",
        "alert": false
      },
      {
        "metric": "new_leads_7d",
        "entity": "leads",
        "label": "New leads this week",
        "tone": "auto",
        "icon": "UserPlus",
        "formula": "count where Created_At in last 7 days",
        "filter": "Created_At in last 7 days",
        "alert": false
      },
      {
        "metric": "fees_overdue",
        "filter": false,
        "entity": "fees",
        "label": "Fees overdue",
        "tone": "bad",
        "icon": "IndianRupee",
        "formula": "sum Balance_INR where Status=Overdue",
        "format": "money_l",
        "alert": true
      },
      {
        "label": "Avg attendance",
        "entity": "students",
        "formula": "avg Attendance_Pct where Status!=Inactive",
        "format": "pct",
        "icon": "CalendarCheck"
      }
    ],
    "queues": [
      {
        "metric": "alerts_open",
        "action": "acknowledge",
        "action_label": "Acknowledge",
        "sub": "Severity",
        "link": "/alerts",
        "entity": "alerts",
        "label": "Open alerts",
        "tone": "bad",
        "icon": "BellRing",
        "where": "Status=Open"
      },
      {
        "metric": "hot_overdue",
        "action": "assign",
        "action_label": "Assign",
        "sub": "Course",
        "link": "/leads",
        "entity": "leads",
        "label": "HOT leads past 48 h",
        "tone": "bad",
        "icon": "Flame",
        "where": "Grade=HOT and Next_Followup_At<today and Stage not in [Enrolled, Lost]"
      },
      {
        "metric": "overdue_15",
        "action": "send_link",
        "action_label": "Send link",
        "sub": "Course",
        "link": "/fees",
        "entity": "fees",
        "label": "Overdue 15+ days",
        "tone": "bad",
        "icon": "AlertOctagon",
        "where": "Status=Overdue and Days_Overdue>=15"
      }
    ],
    "charts": [
      {
        "id": "lead-funnel",
        "type": "funnel",
        "entity": "leads",
        "title": "Admissions funnel",
        "where": "Stage!=Lost",
        "span": 3,
        "footer": "Leads by stage, with conversion from the previous stage. Lost leads are excluded."
      },
      {
        "id": "calls-week",
        "type": "trend",
        "entity": "calls",
        "title": "AI calls per week by agent",
        "date": "Called_At",
        "series": [
          "Agent"
        ],
        "days": 56,
        "bucket": "week",
        "span": 3
      }
    ],
    "modals": [
      {
        "id": "acknowledge",
        "covers": [
          "R37"
        ],
        "kind": "status",
        "title": "Acknowledge alert",
        "direct": "patch",
        "entity": "alerts",
        "summary": [
          "Title",
          "Severity"
        ],
        "fill": {
          "Status": "Acknowledged"
        },
        "fields": [
          {
            "key": "Owner",
            "label": "Owner",
            "type": "select",
            "options_from": "team.Name",
            "required": true
          }
        ]
      },
      {
        "id": "assign",
        "covers": [
          "R6",
          "R9"
        ],
        "kind": "edit",
        "title": "Assign counsellor",
        "direct": "patch",
        "entity": "leads",
        "summary": [
          "Name",
          "Course",
          "Grade"
        ],
        "fields": [
          {
            "key": "Assigned_To",
            "label": "Counsellor",
            "type": "select",
            "options_from": "team.Name",
            "options_where": "Role=Counsellor",
            "required": true
          }
        ]
      },
      {
        "id": "send_link",
        "covers": [
          "R25"
        ],
        "kind": "status",
        "title": "Send payment link",
        "flow": "FEE_REMINDER",
        "action": "send_link",
        "entity": "fees",
        "summary": [
          "Student_Name",
          "Balance_INR",
          "Due_Date"
        ],
        "pass": [
          "Fee_ID",
          "Student_Name",
          "Parent_Name",
          "Parent_Phone",
          "Balance_INR",
          "Due_Date",
          "Payment_Link"
        ],
        "submit": "Send on WhatsApp",
        "success": "Payment link sent to the parent",
        "fields": []
      }
    ],
    "portal": "admin"
  },
  {
    "id": "alerts",
    "covers": [
      "R37"
    ],
    "route": "/alerts",
    "label": "Alerts & escalations",
    "subtitle": "Everything the agents and the rules flagged for a person to act on",
    "icon": "BellRing",
    "group": "Overview",
    "entity": "alerts",
    "badge": {
      "entity": "alerts",
      "where": "Status=Open"
    },
    "modals": [
      {
        "id": "acknowledge",
        "covers": [
          "R37"
        ],
        "kind": "status",
        "title": "Mark read",
        "direct": "patch",
        "summary": [
          "Title",
          "Severity"
        ],
        "fill": {
          "Status": "Acknowledged"
        },
        "fields": [
          {
            "key": "Owner",
            "label": "Owner",
            "type": "select",
            "options_from": "team.Name",
            "required": true
          }
        ]
      },
      {
        "id": "resolve",
        "covers": [
          "R37"
        ],
        "kind": "status",
        "title": "Resolve",
        "direct": "patch",
        "summary": [
          "Title"
        ],
        "fill": {
          "Status": "Resolved",
          "Resolved_At": "now"
        },
        "fields": [
          {
            "key": "Resolution",
            "label": "What was done",
            "type": "textarea",
            "rows": 3,
            "required": true
          }
        ]
      }
    ],
    "actions": {
      "header": [],
      "row": [
        "acknowledge",
        "resolve"
      ]
    },
    "portal": "admin",
    "blocks": [
      {
        "type": "kpis",
        "kpis": [
          {
            "metric": "alerts_open",
            "entity": "alerts",
            "label": "Open alerts",
            "tone": "bad",
            "icon": "BellRing",
            "formula": "count where Status=Open",
            "filter": "Status=Open",
            "alert": true
          },
          {
            "label": "Critical",
            "formula": "count where Severity=CRITICAL and Status=Open",
            "icon": "AlertOctagon",
            "alert": true,
            "entity": "alerts"
          },
          {
            "label": "Resolved this week",
            "formula": "count where Status=Resolved and Resolved_At in last 7 days",
            "icon": "CheckCircle2",
            "entity": "alerts"
          }
        ],
        "id": "alerts-kpis"
      },
      {
        "type": "table",
        "segments": {
          "column": "Status",
          "all": "All alerts"
        },
        "columns": [
          {
            "key": "Title",
            "type": "text",
            "sub": "Detail"
          },
          {
            "key": "Severity",
            "type": "badge"
          },
          {
            "key": "Kind",
            "type": "tag"
          },
          {
            "key": "Owner",
            "type": "owner"
          },
          {
            "key": "Status",
            "type": "badge"
          },
          {
            "key": "Raised_At",
            "header": "Raised",
            "type": "date",
            "time": true
          }
        ],
        "search": [
          "Title",
          "Detail",
          "Owner"
        ],
        "filters": [
          "Kind",
          "Severity"
        ],
        "bulk": [
          "acknowledge"
        ],
        "id": "alerts-table"
      }
    ],
    "kind": "page"
  },
  {
    "id": "leads",
    "covers": [
      "R1",
      "R3",
      "R5",
      "R6",
      "R7",
      "R8",
      "R9",
      "R39"
    ],
    "route": "/leads",
    "label": "Leads",
    "subtitle": "Every enquiry — called by the AI, graded HOT, WARM or COLD, followed up by a counsellor",
    "icon": "Users",
    "group": "Admissions",
    "entity": "leads",
    "blocks": [
      {
        "type": "kpis",
        "kpis": [
          {
            "metric": "hot_leads",
            "filter": "Grade=HOT",
            "entity": "leads",
            "label": "HOT leads",
            "tone": "info",
            "icon": "Flame",
            "formula": "count where Grade=HOT and Stage not in [Enrolled, Lost]",
            "alert": false
          },
          {
            "label": "WARM",
            "formula": "count where Grade=WARM and Stage not in [Enrolled, Lost]",
            "icon": "Thermometer",
            "filter": "Grade=WARM",
            "entity": "leads"
          },
          {
            "label": "COLD",
            "formula": "count where Grade=COLD and Stage not in [Enrolled, Lost]",
            "icon": "Snowflake",
            "filter": "Grade=COLD",
            "entity": "leads"
          },
          {
            "metric": "hot_overdue",
            "entity": "leads",
            "label": "HOT leads past 48 h",
            "tone": "bad",
            "icon": "Flame",
            "formula": "count where Grade=HOT and Next_Followup_At<today and Stage not in [Enrolled, Lost]",
            "filter": "Grade=HOT and Next_Followup_At<today and Stage not in [Enrolled, Lost]",
            "alert": true
          }
        ],
        "id": "leads-kpis"
      },
      {
        "type": "table",
        "segments": {
          "column": "Stage",
          "all": "All leads"
        },
        "period": {
          "column": "Created_At",
          "presets": [
            "today",
            "7d",
            "30d",
            "month",
            "all"
          ],
          "default": "all"
        },
        "views": [
          "table",
          "kanban"
        ],
        "columns": [
          {
            "key": "Name",
            "type": "text",
            "sub": "Phone"
          },
          {
            "key": "Grade",
            "type": "badge"
          },
          {
            "key": "Score",
            "type": "number"
          },
          {
            "key": "Stage",
            "type": "badge"
          },
          {
            "key": "Next_Followup_At",
            "header": "Follow-up",
            "type": "due"
          },
          {
            "key": "Assigned_To",
            "header": "Counsellor",
            "type": "owner"
          },
          {
            "key": "Course",
            "type": "tag"
          },
          {
            "key": "Source",
            "type": "tag",
            "priority": "low"
          },
          {
            "key": "Call_Status",
            "header": "AI call",
            "type": "badge",
            "priority": "low"
          }
        ],
        "search": [
          "Name",
          "Phone",
          "Email",
          "Lead_ID",
          "Course"
        ],
        "filters": [
          "Course",
          "Source",
          "Grade"
        ],
        "bulk": [
          "assign"
        ],
        "kanban": {
          "column": "Grade",
          "stages": [
            "HOT",
            "WARM",
            "COLD"
          ],
          "title": "Name",
          "subtitle": "Course",
          "meta": [
            "Next_Followup_At"
          ],
          "badge": "Score",
          "badge_label": "Score",
          "avatar": "Assigned_To",
          "move": {
            "direct": "patch"
          }
        },
        "drawer": {
          "score": "Score",
          "tabs": [
            {
              "label": "Summary",
              "sections": [
                {
                  "type": "callout",
                  "column": "AI_Summary",
                  "title": "AI qualification summary",
                  "tone": "neutral"
                },
                {
                  "type": "callout",
                  "column": "Next_Action",
                  "title": "Next action",
                  "tone": "info"
                },
                {
                  "type": "fields",
                  "columns": [
                    "Phone",
                    "Email",
                    "Course",
                    "Source",
                    "Notes",
                    "Call_Status",
                    "Last_Called_At"
                  ],
                  "hide_empty": true
                }
              ]
            },
            {
              "label": "Transcript",
              "sections": [
                {
                  "type": "callout",
                  "column": "Transcript",
                  "title": "AI call transcript",
                  "tone": "neutral"
                }
              ]
            },
            {
              "label": "Calls",
              "sections": [
                {
                  "type": "related",
                  "entity": "calls",
                  "by": "Lead_ID",
                  "columns": [
                    "Called_At",
                    "Status",
                    "Outcome",
                    "Duration_Sec"
                  ]
                }
              ]
            }
          ]
        },
        "empty": {
          "title": "No leads yet",
          "reason": "Add an enquiry and the AI calls it within minutes, grades it and tells the counsellor.",
          "action": "add_lead"
        },
        "actions": {
          "header": [
            "add_lead"
          ],
          "row": [
            "call",
            "assign",
            "stage",
            "enrol"
          ]
        },
        "id": "leads-table"
      }
    ],
    "modals": [
      {
        "id": "add_lead",
        "covers": [
          "R1",
          "R2"
        ],
        "kind": "create",
        "primary": true,
        "title": "Add lead",
        "intro": "The AI calls this lead as soon as you save, grades it and writes the summary here.",
        "flow": "ADMISSION_CALL",
        "action": "new_lead",
        "columns": 2,
        "submit": "Add lead & call",
        "pending": "Saving and starting the AI call…",
        "success": "Lead added — the AI call has started",
        "fields": [
          {
            "key": "Name",
            "label": "Full name",
            "type": "text",
            "required": true,
            "placeholder": "e.g. Rahul Sharma"
          },
          {
            "key": "Phone",
            "label": "Phone",
            "type": "text",
            "required": true,
            "placeholder": "+91 98765 43210"
          },
          {
            "key": "Course",
            "label": "Course interest",
            "type": "select",
            "options": [
              "JEE Mains",
              "NEET",
              "CA Foundation",
              "UPSC"
            ],
            "required": true
          },
          {
            "key": "Source",
            "label": "Lead source",
            "type": "select",
            "options": [
              "Instagram",
              "WhatsApp",
              "Google Ads",
              "Referral",
              "Website",
              "Walk-in"
            ],
            "default": "Website",
            "required": true
          },
          {
            "key": "Email",
            "label": "Email",
            "type": "text"
          },
          {
            "key": "Assigned_To",
            "label": "Counsellor",
            "type": "select",
            "options_from": "team.Name",
            "options_where": "Role=Counsellor",
            "help": "Leave blank — a HOT lead goes to the counsellor with the fewest open HOT leads"
          },
          {
            "key": "Notes",
            "label": "Notes",
            "type": "textarea",
            "rows": 2,
            "placeholder": "Anything the caller should know"
          }
        ]
      },
      {
        "id": "call",
        "covers": [
          "R7"
        ],
        "kind": "status",
        "title": "Call again with AI",
        "flow": "ADMISSION_CALL",
        "action": "call",
        "summary": [
          "Name",
          "Grade",
          "Last_Called_At"
        ],
        "pass": [
          "Lead_ID",
          "Name",
          "Phone",
          "Course",
          "Notes"
        ],
        "submit": "Start AI call",
        "pending": "Starting the call…",
        "success": "AI call started — the grade updates in a few minutes",
        "fields": []
      },
      {
        "id": "assign",
        "covers": [
          "R6"
        ],
        "kind": "edit",
        "title": "Assign counsellor",
        "direct": "patch",
        "summary": [
          "Name",
          "Course",
          "Grade"
        ],
        "fields": [
          {
            "key": "Assigned_To",
            "label": "Counsellor",
            "type": "select",
            "options_from": "team.Name",
            "options_where": "Role=Counsellor",
            "required": true
          },
          {
            "key": "Next_Followup_At",
            "label": "Follow up by",
            "type": "date",
            "presets": [
              "tomorrow",
              "+2d",
              "+1w"
            ]
          }
        ]
      },
      {
        "id": "stage",
        "covers": [
          "R8"
        ],
        "kind": "status",
        "title": "Change stage",
        "direct": "patch",
        "summary": [
          "Name",
          "Stage"
        ],
        "fields": [
          {
            "key": "Stage",
            "label": "Stage",
            "type": "select",
            "options_status": true,
            "required": true
          },
          {
            "key": "Next_Followup_At",
            "label": "Next follow-up",
            "type": "date",
            "presets": [
              "tomorrow",
              "+2d",
              "+1w"
            ],
            "show_when": "Stage not in [Enrolled, Lost]"
          },
          {
            "key": "Lost_Reason",
            "label": "Reason",
            "type": "textarea",
            "rows": 2,
            "required_when": "Stage=Lost",
            "show_when": "Stage=Lost"
          }
        ]
      },
      {
        "id": "enrol",
        "covers": [
          "R10",
          "R11"
        ],
        "kind": "custom",
        "title": "Enrol as student",
        "flow": "STUDENT_MANAGE",
        "action": "enrol",
        "summary": [
          "Name",
          "Course",
          "Grade"
        ],
        "pass": [
          "Name",
          "Phone",
          "Course"
        ],
        "columns": 2,
        "submit": "Enrol & send welcome",
        "success": "Student enrolled — welcome sent to the parent on WhatsApp",
        "fields": [
          {
            "key": "Parent_Name",
            "label": "Parent name",
            "type": "text",
            "required": true
          },
          {
            "key": "Parent_Phone",
            "label": "Parent phone",
            "type": "text",
            "required": true
          },
          {
            "key": "Batch",
            "label": "Batch",
            "type": "select",
            "options": [
              "Batch A — Morning",
              "Batch B — Evening",
              "Batch C — Weekend"
            ],
            "required": true
          },
          {
            "key": "Fee_Amount_INR",
            "label": "First instalment (₹)",
            "type": "number",
            "required": true
          },
          {
            "key": "Fee_Due_Date",
            "label": "Fee due date",
            "type": "date",
            "required": true
          },
          {
            "key": "Counsellor",
            "label": "Counsellor",
            "type": "select",
            "options_from": "team.Name",
            "options_where": "Role=Counsellor",
            "default": "{{user}}"
          },
          {
            "key": "Address",
            "label": "Address",
            "type": "text"
          }
        ]
      }
    ],
    "portal": "admin"
  },
  {
    "id": "calls",
    "covers": [
      "R35",
      "R5",
      "R39"
    ],
    "route": "/calls",
    "label": "AI call log",
    "subtitle": "Every call the five agents made — outcome, sentiment and transcript",
    "icon": "PhoneCall",
    "group": "Admissions",
    "entity": "calls",
    "read_only": "Calls are written by the agents; a person reads the outcome and the transcript and acts on the lead or student page",
    "portal": "admin",
    "blocks": [
      {
        "type": "kpis",
        "kpis": [
          {
            "metric": "calls_week",
            "entity": "calls",
            "label": "AI calls this week",
            "tone": "auto",
            "icon": "PhoneCall",
            "formula": "count where Called_At in last 7 days",
            "filter": "Called_At in last 7 days",
            "alert": false
          },
          {
            "label": "Completed",
            "formula": "count where Status=Completed and Called_At in last 7 days",
            "icon": "PhoneIncoming",
            "entity": "calls"
          },
          {
            "label": "No answer",
            "formula": "count where Status=No Answer and Called_At in last 7 days",
            "icon": "PhoneMissed",
            "alert": true,
            "entity": "calls"
          },
          {
            "label": "Escalated",
            "formula": "count where Status=Escalated and Called_At in last 7 days",
            "icon": "Siren",
            "alert": true,
            "entity": "calls"
          }
        ],
        "id": "calls-kpis"
      },
      {
        "type": "table",
        "segments": {
          "column": "Agent",
          "all": "All agents",
          "values": [
            "Admission",
            "Fee",
            "Attendance",
            "Academic",
            "Parent"
          ]
        },
        "period": {
          "column": "Called_At",
          "presets": [
            "today",
            "7d",
            "30d",
            "all"
          ],
          "default": "7d"
        },
        "views": [
          "cards",
          "table"
        ],
        "view": "cards",
        "card": {
          "title": "Person",
          "subtitle": [
            "Agent",
            "Course"
          ],
          "badge": "Status",
          "id": false,
          "columns": 3,
          "fields": [
            {
              "key": "Called_At",
              "label": "Time",
              "icon": "Clock"
            },
            {
              "key": "Outcome",
              "label": "Outcome",
              "icon": "CheckCircle2"
            },
            {
              "key": "Sentiment",
              "label": "Sentiment",
              "icon": "Smile"
            },
            {
              "key": "Reason",
              "label": "Reason",
              "icon": "MessageSquare"
            }
          ],
          "callout": {
            "column": "Summary",
            "label": "Summary",
            "tone": "neutral"
          }
        },
        "columns": [
          {
            "key": "Person",
            "type": "text",
            "sub": "Phone"
          },
          {
            "key": "Agent",
            "type": "tag"
          },
          {
            "key": "Status",
            "type": "badge"
          },
          {
            "key": "Outcome",
            "type": "truncate"
          },
          {
            "key": "Sentiment",
            "type": "badge"
          },
          {
            "key": "Duration_Sec",
            "header": "Duration (s)",
            "type": "number"
          },
          {
            "key": "Called_At",
            "header": "Time",
            "type": "date",
            "time": true
          }
        ],
        "search": [
          "Person",
          "Phone",
          "Summary",
          "Outcome"
        ],
        "filters": [
          "Status",
          "Sentiment"
        ],
        "drawer": {
          "sections": [
            {
              "type": "fields",
              "columns": [
                "Agent",
                "Relation",
                "Phone",
                "Course",
                "Status",
                "Outcome",
                "Grade",
                "Score",
                "Sentiment",
                "Concern",
                "Issue_Type",
                "Reason",
                "Category",
                "Needs_Followup",
                "Retry_At"
              ],
              "hide_empty": true
            },
            {
              "type": "callout",
              "column": "Summary",
              "title": "Summary",
              "tone": "neutral"
            },
            {
              "type": "callout",
              "column": "Transcript",
              "title": "Transcript",
              "tone": "neutral"
            }
          ]
        },
        "id": "calls-table"
      }
    ],
    "kind": "page"
  },
  {
    "id": "students",
    "covers": [
      "R10",
      "R12",
      "R13",
      "R18",
      "R23",
      "R34",
      "R39"
    ],
    "route": "/students",
    "label": "Students",
    "subtitle": "Every enrolled student — attendance, scores, fees and how the parents feel",
    "icon": "GraduationCap",
    "group": "Students",
    "entity": "students",
    "modals": [
      {
        "id": "add_student",
        "covers": [
          "R10",
          "R11"
        ],
        "kind": "create",
        "primary": true,
        "title": "Enrol student",
        "flow": "STUDENT_MANAGE",
        "action": "enrol",
        "columns": 2,
        "submit": "Enrol & send welcome",
        "success": "Student enrolled — welcome sent to the parent on WhatsApp",
        "fields": [
          {
            "key": "Name",
            "label": "Student name",
            "type": "text",
            "required": true
          },
          {
            "key": "Student_Phone",
            "label": "Student phone",
            "type": "text",
            "required": true
          },
          {
            "key": "Parent_Name",
            "label": "Parent name",
            "type": "text",
            "required": true
          },
          {
            "key": "Parent_Phone",
            "label": "Parent phone",
            "type": "text",
            "required": true
          },
          {
            "key": "Course",
            "label": "Course",
            "type": "select",
            "options": [
              "JEE Mains",
              "NEET",
              "CA Foundation",
              "UPSC"
            ],
            "required": true
          },
          {
            "key": "Batch",
            "label": "Batch",
            "type": "select",
            "options": [
              "Batch A — Morning",
              "Batch B — Evening",
              "Batch C — Weekend"
            ],
            "required": true
          },
          {
            "key": "Fee_Amount_INR",
            "label": "First instalment (₹)",
            "type": "number",
            "required": true
          },
          {
            "key": "Fee_Due_Date",
            "label": "Fee due date",
            "type": "date",
            "required": true
          },
          {
            "key": "Counsellor",
            "label": "Counsellor",
            "type": "select",
            "options_from": "team.Name",
            "options_where": "Role=Counsellor"
          },
          {
            "key": "Address",
            "label": "Address",
            "type": "text"
          }
        ]
      },
      {
        "id": "assign_mentor",
        "covers": [
          "R23"
        ],
        "kind": "edit",
        "title": "Assign mentor / counsellor",
        "direct": "patch",
        "summary": [
          "Name",
          "Status",
          "Main_Issue"
        ],
        "fields": [
          {
            "key": "Mentor",
            "label": "Mentor",
            "type": "select",
            "options_from": "team.Name",
            "options_where": "Role=Mentor"
          },
          {
            "key": "Counsellor",
            "label": "Counsellor",
            "type": "select",
            "options_from": "team.Name",
            "options_where": "Role=Counsellor"
          }
        ]
      },
      {
        "id": "call_parent",
        "covers": [
          "R29",
          "R33"
        ],
        "kind": "status",
        "title": "AI call to parent",
        "flow": "PARENT_UPDATE",
        "action": "update_call",
        "summary": [
          "Name",
          "Parent_Name",
          "Parent_Sentiment"
        ],
        "pass": [
          "Student_ID",
          "Name",
          "Parent_Name",
          "Parent_Phone",
          "Course",
          "Attendance_Pct",
          "Last_Score",
          "Class_Rank",
          "Performance_Trend",
          "Strong_Subjects",
          "Weak_Subjects"
        ],
        "submit": "Start AI call",
        "success": "AI call to the parent started",
        "fields": []
      },
      {
        "id": "weekly_report",
        "covers": [
          "R30"
        ],
        "kind": "status",
        "title": "Send weekly report",
        "flow": "PARENT_UPDATE",
        "action": "weekly_report",
        "summary": [
          "Name",
          "Attendance_Pct",
          "Last_Score"
        ],
        "pass": [
          "Student_ID",
          "Name",
          "Parent_Name",
          "Parent_Phone",
          "Attendance_Pct",
          "Last_Score",
          "Class_Rank",
          "Performance_Trend"
        ],
        "submit": "Send on WhatsApp",
        "success": "Weekly report sent to the parent",
        "fields": []
      },
      {
        "id": "send_update",
        "covers": [
          "R34"
        ],
        "kind": "custom",
        "title": "WhatsApp the parent",
        "flow": "SEND_WHATSAPP",
        "action": "send_update",
        "summary": [
          "Name",
          "Parent_Name"
        ],
        "pass": [
          "Student_ID",
          "Name",
          "Parent_Name"
        ],
        "submit": "Send",
        "success": "Message sent",
        "intro": "Goes to the parent's WhatsApp on the student's record, as the approved General update template.",
        "fields": [
          {
            "key": "Message",
            "label": "Message",
            "type": "textarea",
            "rows": 4,
            "required": true,
            "default": "Kal (Saturday) institute band rahega. Monday se classes normal samay par chalengi."
          }
        ]
      }
    ],
    "actions": {
      "header": [
        "add_student"
      ],
      "row": [
        "call_parent",
        "weekly_report",
        "send_update",
        "assign_mentor"
      ]
    },
    "detail": {
      "route": "/students/:id",
      "layout": "rail",
      "title_column": "Name",
      "subtitle": [
        "Course",
        "Batch"
      ],
      "meta": [
        {
          "icon": "Phone",
          "column": "Student_Phone"
        },
        {
          "icon": "User",
          "label": "Parent",
          "column": "Parent_Name"
        },
        {
          "icon": "PhoneCall",
          "label": "Parent phone",
          "column": "Parent_Phone"
        },
        {
          "icon": "MapPin",
          "column": "Address"
        }
      ],
      "sections": [
        {
          "type": "tiles",
          "title": "This month",
          "columns": [
            "Attendance_Pct",
            "Last_Score",
            "Avg_Score",
            "Class_Rank"
          ]
        },
        {
          "type": "fields",
          "title": "Subjects",
          "columns": [
            "Strong_Subjects",
            "Weak_Subjects",
            "Performance_Trend",
            "Issue_Type",
            "Main_Issue"
          ],
          "hide_empty": true
        },
        {
          "type": "related",
          "entity": "fees",
          "by": "Student_ID",
          "title": "Fees",
          "columns": [
            "Instalment",
            "Amount_INR",
            "Balance_INR",
            "Due_Date",
            "Status"
          ]
        },
        {
          "type": "related",
          "entity": "attendance",
          "by": "Student_ID",
          "title": "Attendance",
          "columns": [
            "Date",
            "Status",
            "Reason",
            "Category"
          ]
        },
        {
          "type": "timeline",
          "title": "Calls",
          "entity": "calls",
          "by": "Student_ID",
          "date": "Called_At",
          "status": "Status",
          "title_column": "Agent",
          "body": "Summary",
          "limit": 10
        }
      ],
      "rail": [
        {
          "type": "card",
          "title": "Mentor",
          "column": "Mentor",
          "columns": [
            "Mentor",
            "Counsellor"
          ],
          "action": "assign_mentor"
        },
        {
          "type": "card",
          "title": "Parent",
          "column": "Parent_Name",
          "columns": [
            "Parent_Phone",
            "Parent_Sentiment",
            "Parent_Concern",
            "Last_Parent_Call_At"
          ],
          "action": "call_parent"
        }
      ]
    },
    "portal": "admin",
    "blocks": [
      {
        "type": "kpis",
        "kpis": [
          {
            "metric": "students_active",
            "entity": "students",
            "label": "Active students",
            "tone": "auto",
            "icon": "GraduationCap",
            "formula": "count where Status!=Inactive",
            "filter": "Status!=Inactive",
            "alert": false
          },
          {
            "metric": "at_risk",
            "filter": "Status in [At Risk, Critical]",
            "entity": "students",
            "label": "At risk",
            "tone": "warn",
            "icon": "AlertTriangle",
            "formula": "count where Status in [At Risk, Critical]",
            "alert": true
          },
          {
            "metric": "low_attendance",
            "filter": "Attendance_Pct<75",
            "entity": "students",
            "label": "Below 75% attendance",
            "tone": "bad",
            "icon": "CalendarX",
            "formula": "count where Attendance_Pct<75 and Status!=Inactive",
            "alert": true
          }
        ],
        "id": "students-kpis"
      },
      {
        "type": "table",
        "segments": {
          "column": "Status",
          "all": "All students"
        },
        "columns": [
          {
            "key": "Name",
            "type": "text",
            "sub": "Student_Phone"
          },
          {
            "key": "Course",
            "type": "tag"
          },
          {
            "key": "Batch",
            "type": "tag"
          },
          {
            "key": "Attendance_Pct",
            "header": "Attendance",
            "type": "number",
            "suffix": "%"
          },
          {
            "key": "Last_Score",
            "header": "Last score",
            "type": "number",
            "suffix": "%"
          },
          {
            "key": "Fee_Status",
            "header": "Fee",
            "type": "badge"
          },
          {
            "key": "Status",
            "type": "badge"
          },
          {
            "key": "Mentor",
            "type": "owner",
            "priority": "low"
          }
        ],
        "search": [
          "Name",
          "Student_Phone",
          "Parent_Name",
          "Parent_Phone",
          "Student_ID"
        ],
        "filters": [
          "Course",
          "Batch",
          "Fee_Status"
        ],
        "bulk": [
          "send_update",
          "weekly_report"
        ],
        "empty": {
          "title": "No students yet",
          "reason": "Enrol the first student — or enrol a lead from the Leads page.",
          "action": "add_student"
        },
        "id": "students-table"
      }
    ],
    "kind": "page"
  },
  {
    "id": "attendance",
    "covers": [
      "R14",
      "R15",
      "R16",
      "R17",
      "R18"
    ],
    "route": "/attendance",
    "label": "Attendance",
    "subtitle": "Mark a batch; absent parents get a WhatsApp, a repeat absence gets an AI call",
    "icon": "CalendarCheck",
    "group": "Students",
    "entity": "attendance",
    "badge": {
      "entity": "attendance",
      "where": "Needs_Followup=Yes and Followup_Done!=Yes"
    },
    "blocks": [
      {
        "type": "kpis",
        "kpis": [
          {
            "metric": "present_today",
            "entity": "attendance",
            "label": "Present today",
            "tone": "ok",
            "icon": "UserCheck",
            "formula": "count where Date=today and Status=Present",
            "filter": "Date=today and Status=Present",
            "alert": false
          },
          {
            "metric": "absent_today",
            "filter": "Status=Absent",
            "entity": "attendance",
            "label": "Absent today",
            "tone": "warn",
            "icon": "UserMinus",
            "formula": "count where Date=today and Status=Absent",
            "alert": true
          },
          {
            "metric": "followup_needed",
            "filter": "Needs_Followup=Yes",
            "entity": "attendance",
            "label": "Needs follow-up",
            "tone": "bad",
            "icon": "PhoneForwarded",
            "formula": "count where Needs_Followup=Yes and Date>=today-7",
            "alert": true
          },
          {
            "metric": "low_attendance",
            "entity": "students",
            "label": "Below 75% attendance",
            "tone": "bad",
            "icon": "CalendarX",
            "formula": "count where Attendance_Pct<75 and Status!=Inactive",
            "filter": "Attendance_Pct<75 and Status!=Inactive",
            "alert": true
          }
        ],
        "id": "attendance-kpis"
      },
      {
        "type": "custom",
        "name": "AttendanceSheet",
        "id": "attendance-custom"
      },
      {
        "type": "table",
        "segments": {
          "column": "Status",
          "all": "All marks"
        },
        "period": {
          "column": "Date",
          "presets": [
            "today",
            "yesterday",
            "7d",
            "30d"
          ],
          "default": "today"
        },
        "columns": [
          {
            "key": "Student_Name",
            "header": "Student",
            "type": "text",
            "sub": "Parent_Name"
          },
          {
            "key": "Batch",
            "type": "tag"
          },
          {
            "key": "Status",
            "type": "badge"
          },
          {
            "key": "Absences_This_Week",
            "header": "This week",
            "type": "number"
          },
          {
            "key": "Call_Status",
            "header": "Parent reached",
            "type": "badge"
          },
          {
            "key": "Reason",
            "type": "truncate"
          },
          {
            "key": "Category",
            "type": "tag"
          },
          {
            "key": "Needs_Followup",
            "header": "Follow-up",
            "type": "badge"
          }
        ],
        "search": [
          "Student_Name",
          "Parent_Name",
          "Student_ID"
        ],
        "filters": [
          "Batch",
          "Category",
          "Needs_Followup"
        ],
        "actions": {
          "header": [
            "mark_one"
          ],
          "row": [
            "reason_call",
            "followup_done"
          ]
        },
        "id": "attendance-table"
      }
    ],
    "modals": [
      {
        "id": "mark_one",
        "covers": [
          "R14"
        ],
        "kind": "create",
        "title": "Mark one student",
        "direct": "insert",
        "columns": 2,
        "fields": [
          {
            "key": "Date",
            "label": "Date",
            "type": "date",
            "default": "today",
            "required": true
          },
          {
            "key": "Batch",
            "label": "Batch",
            "type": "select",
            "options": [
              "Batch A — Morning",
              "Batch B — Evening",
              "Batch C — Weekend"
            ],
            "required": true
          },
          {
            "key": "Student_ID",
            "label": "Student",
            "type": "select",
            "options_from": "students.Student_ID",
            "required": true
          },
          {
            "key": "Student_Name",
            "label": "Student name",
            "type": "text",
            "required": true
          },
          {
            "key": "Status",
            "label": "Status",
            "type": "select",
            "options": [
              "Present"
            ],
            "default": "Present",
            "required": true,
            "help": "Absences are marked on the sheet above so the parent is told"
          },
          {
            "key": "Marked_By",
            "label": "Marked by",
            "type": "text",
            "default": "{{user}}"
          }
        ]
      },
      {
        "id": "reason_call",
        "covers": [
          "R15",
          "R16"
        ],
        "kind": "status",
        "title": "Call the parent",
        "flow": "ABSENCE",
        "action": "reason_call",
        "summary": [
          "Student_Name",
          "Date",
          "Call_Status"
        ],
        "pass": [
          "Att_ID",
          "Date",
          "Batch",
          "Student_ID",
          "Student_Name",
          "Course",
          "Parent_Name",
          "Parent_Phone"
        ],
        "submit": "Start AI call",
        "success": "AI call started — the reason appears here in a few minutes",
        "fields": []
      },
      {
        "id": "followup_done",
        "covers": [
          "R17"
        ],
        "kind": "status",
        "title": "Follow-up done",
        "direct": "patch",
        "summary": [
          "Student_Name",
          "Reason"
        ],
        "fill": {
          "Followup_Done": "Yes"
        },
        "fields": []
      }
    ],
    "portal": "admin"
  },
  {
    "id": "academic",
    "covers": [
      "R20",
      "R21",
      "R22",
      "R23"
    ],
    "route": "/academic",
    "label": "Academic",
    "subtitle": "Students below 75% attendance or 60% score — counselled every Monday, escalated to a mentor",
    "icon": "Activity",
    "group": "Students",
    "entity": "students",
    "modals": [
      {
        "id": "counsel",
        "covers": [
          "R21",
          "R22"
        ],
        "kind": "status",
        "primary": true,
        "title": "AI counselling call",
        "flow": "ACADEMIC_CALL",
        "action": "counsel",
        "summary": [
          "Name",
          "Attendance_Pct",
          "Last_Score",
          "Weak_Subjects"
        ],
        "pass": [
          "Student_ID",
          "Name",
          "Student_Phone",
          "Course",
          "Attendance_Pct",
          "Last_Score",
          "Weak_Subjects",
          "Mentor"
        ],
        "submit": "Start AI call",
        "success": "Counselling call started — the issue appears here in a few minutes",
        "fields": []
      },
      {
        "id": "assign_mentor",
        "covers": [
          "R23"
        ],
        "kind": "edit",
        "title": "Assign mentor / counsellor",
        "direct": "patch",
        "summary": [
          "Name",
          "Main_Issue"
        ],
        "fields": [
          {
            "key": "Mentor",
            "label": "Mentor",
            "type": "select",
            "options_from": "team.Name",
            "options_where": "Role=Mentor"
          },
          {
            "key": "Counsellor",
            "label": "Counsellor",
            "type": "select",
            "options_from": "team.Name",
            "options_where": "Role=Counsellor"
          }
        ]
      }
    ],
    "actions": {
      "header": [],
      "row": [
        "counsel",
        "assign_mentor"
      ]
    },
    "portal": "admin",
    "blocks": [
      {
        "type": "kpis",
        "kpis": [
          {
            "label": "Avg score",
            "formula": "avg Avg_Score where Status!=Inactive",
            "format": "pct",
            "icon": "Star",
            "entity": "students"
          },
          {
            "label": "Below 60% score",
            "formula": "count where Last_Score<60 and Status!=Inactive",
            "icon": "TrendingDown",
            "alert": true,
            "entity": "students"
          },
          {
            "metric": "at_risk",
            "entity": "students",
            "label": "At risk",
            "tone": "warn",
            "icon": "AlertTriangle",
            "formula": "count where Status in [At Risk, Critical]",
            "filter": "Status in [At Risk, Critical]",
            "alert": true
          },
          {
            "label": "Counselled this week",
            "formula": "count where Last_Counselled_At in last 7 days",
            "icon": "PhoneCall",
            "entity": "students"
          }
        ],
        "id": "academic-kpis"
      },
      {
        "type": "tabs",
        "tabs": [
          {
            "label": "At-risk queue",
            "where": "Status in [At Risk, Critical]",
            "blocks": [
              {
                "type": "table",
                "columns": [
                  {
                    "key": "Name",
                    "type": "text",
                    "sub": "Course"
                  },
                  {
                    "key": "Attendance_Pct",
                    "header": "Attendance",
                    "type": "number",
                    "suffix": "%"
                  },
                  {
                    "key": "Last_Score",
                    "header": "Last score",
                    "type": "number",
                    "suffix": "%"
                  },
                  {
                    "key": "Weak_Subjects",
                    "header": "Weak in",
                    "type": "truncate"
                  },
                  {
                    "key": "Issue_Type",
                    "header": "Issue",
                    "type": "badge"
                  },
                  {
                    "key": "Last_Counselled_At",
                    "header": "Counselled",
                    "type": "date"
                  },
                  {
                    "key": "Mentor",
                    "type": "owner"
                  },
                  {
                    "key": "Status",
                    "type": "badge"
                  }
                ],
                "search": [
                  "Name",
                  "Weak_Subjects",
                  "Main_Issue"
                ],
                "filters": [
                  "Course",
                  "Batch",
                  "Issue_Type"
                ],
                "bulk": [
                  "counsel"
                ],
                "actions": {
                  "header": [],
                  "row": [
                    "counsel",
                    "assign_mentor"
                  ]
                }
              }
            ]
          },
          {
            "label": "All students",
            "where": null,
            "blocks": [
              {
                "type": "table",
                "columns": [
                  {
                    "key": "Name",
                    "type": "text",
                    "sub": "Course"
                  },
                  {
                    "key": "Attendance_Pct",
                    "header": "Attendance",
                    "type": "number",
                    "suffix": "%"
                  },
                  {
                    "key": "Last_Score",
                    "header": "Last score",
                    "type": "number",
                    "suffix": "%"
                  },
                  {
                    "key": "Weak_Subjects",
                    "header": "Weak in",
                    "type": "truncate"
                  },
                  {
                    "key": "Issue_Type",
                    "header": "Issue",
                    "type": "badge"
                  },
                  {
                    "key": "Last_Counselled_At",
                    "header": "Counselled",
                    "type": "date"
                  },
                  {
                    "key": "Mentor",
                    "type": "owner"
                  },
                  {
                    "key": "Status",
                    "type": "badge"
                  }
                ],
                "search": [
                  "Name",
                  "Weak_Subjects",
                  "Main_Issue"
                ],
                "filters": [
                  "Course",
                  "Batch",
                  "Issue_Type"
                ],
                "bulk": [
                  "counsel"
                ],
                "actions": {
                  "header": [],
                  "row": [
                    "counsel",
                    "assign_mentor"
                  ]
                }
              }
            ]
          }
        ],
        "id": "academic-tabs"
      }
    ],
    "kind": "page"
  },
  {
    "id": "scores",
    "covers": [
      "R19"
    ],
    "route": "/scores",
    "label": "Test scores",
    "subtitle": "Marks per test and subject — they feed attendance-and-score risk every night",
    "icon": "ClipboardList",
    "group": "Students",
    "parent": "academic",
    "entity": "tests",
    "modals": [
      {
        "id": "add_score",
        "covers": [
          "R19"
        ],
        "kind": "create",
        "primary": true,
        "title": "Add score",
        "direct": "insert",
        "columns": 2,
        "fields": [
          {
            "key": "Test_Name",
            "label": "Test",
            "type": "text",
            "required": true,
            "placeholder": "Weekly Test 15"
          },
          {
            "key": "Test_Date",
            "label": "Date",
            "type": "date",
            "default": "today",
            "required": true
          },
          {
            "key": "Student_ID",
            "label": "Student",
            "type": "select",
            "options_from": "students.Student_ID",
            "required": true
          },
          {
            "key": "Student_Name",
            "label": "Student name",
            "type": "text",
            "required": true
          },
          {
            "key": "Course",
            "label": "Course",
            "type": "select",
            "options": [
              "JEE Mains",
              "NEET",
              "CA Foundation",
              "UPSC"
            ],
            "required": true
          },
          {
            "key": "Batch",
            "label": "Batch",
            "type": "select",
            "options": [
              "Batch A — Morning",
              "Batch B — Evening",
              "Batch C — Weekend"
            ],
            "required": true
          },
          {
            "key": "Subject",
            "label": "Subject",
            "type": "text",
            "required": true
          },
          {
            "key": "Marks",
            "label": "Marks",
            "type": "number",
            "required": true
          },
          {
            "key": "Max_Marks",
            "label": "Out of",
            "type": "number",
            "default": 100,
            "required": true
          },
          {
            "key": "Entered_By",
            "label": "Entered by",
            "type": "text",
            "default": "{{user}}"
          }
        ]
      },
      {
        "id": "edit_score",
        "covers": [
          "R19"
        ],
        "kind": "edit",
        "title": "Correct marks",
        "direct": "patch",
        "summary": [
          "Student_Name",
          "Test_Name",
          "Subject"
        ],
        "fields": [
          {
            "key": "Marks",
            "label": "Marks",
            "type": "number",
            "required": true
          },
          {
            "key": "Max_Marks",
            "label": "Out of",
            "type": "number",
            "required": true
          }
        ]
      }
    ],
    "actions": {
      "header": [
        "add_score"
      ],
      "row": [
        "edit_score"
      ]
    },
    "portal": "admin",
    "blocks": [
      {
        "type": "table",
        "period": {
          "column": "Test_Date",
          "presets": [
            "7d",
            "30d",
            "month",
            "all"
          ],
          "default": "30d"
        },
        "columns": [
          {
            "key": "Student_Name",
            "header": "Student",
            "type": "text",
            "sub": "Course"
          },
          {
            "key": "Test_Name",
            "header": "Test",
            "type": "text"
          },
          {
            "key": "Subject",
            "type": "tag"
          },
          {
            "key": "Marks",
            "type": "number"
          },
          {
            "key": "Max_Marks",
            "header": "Out of",
            "type": "number"
          },
          {
            "key": "Score_Pct",
            "header": "Score",
            "type": "number",
            "suffix": "%"
          },
          {
            "key": "Test_Date",
            "header": "Date",
            "type": "date"
          }
        ],
        "search": [
          "Student_Name",
          "Test_Name",
          "Subject"
        ],
        "filters": [
          "Course",
          "Batch",
          "Subject"
        ],
        "id": "scores-table"
      }
    ],
    "kind": "page"
  },
  {
    "id": "fees",
    "covers": [
      "R24",
      "R25",
      "R26",
      "R27",
      "R28",
      "R39"
    ],
    "route": "/fees",
    "label": "Fees",
    "subtitle": "Overdue fees get a call on day 1, 7 and 15 and a WhatsApp link; record payments as they come in",
    "icon": "IndianRupee",
    "group": "Finance",
    "entity": "fees",
    "badge": {
      "entity": "fees",
      "where": "Status=Overdue"
    },
    "modals": [
      {
        "id": "record_payment",
        "covers": [
          "R26"
        ],
        "kind": "status",
        "primary": true,
        "title": "Record payment",
        "direct": "patch",
        "summary": [
          "Student_Name",
          "Amount_INR",
          "Balance_INR"
        ],
        "fill": {
          "Paid_At": "now"
        },
        "columns": 2,
        "fields": [
          {
            "key": "Paid_INR",
            "label": "Total paid (₹)",
            "type": "number",
            "required": true
          },
          {
            "key": "Payment_Mode",
            "label": "Mode",
            "type": "select",
            "options": [
              "UPI",
              "Cash",
              "Card",
              "Bank Transfer",
              "Cheque"
            ],
            "required": true
          },
          {
            "key": "Receipt_No",
            "label": "Receipt no.",
            "type": "text"
          },
          {
            "key": "Status",
            "label": "Status",
            "type": "select",
            "options": [
              "Paid",
              "Partial"
            ],
            "required": true
          }
        ]
      },
      {
        "id": "send_link",
        "covers": [
          "R25"
        ],
        "kind": "status",
        "title": "Send payment link",
        "flow": "FEE_REMINDER",
        "action": "send_link",
        "summary": [
          "Student_Name",
          "Balance_INR",
          "Due_Date"
        ],
        "pass": [
          "Fee_ID",
          "Student_Name",
          "Parent_Name",
          "Parent_Phone",
          "Balance_INR",
          "Due_Date",
          "Payment_Link"
        ],
        "submit": "Send on WhatsApp",
        "success": "Payment link sent to the parent",
        "fields": []
      },
      {
        "id": "remind",
        "covers": [
          "R24"
        ],
        "kind": "status",
        "title": "AI reminder call",
        "flow": "FEE_REMINDER",
        "action": "remind",
        "summary": [
          "Student_Name",
          "Balance_INR",
          "Days_Overdue"
        ],
        "pass": [
          "Fee_ID",
          "Student_Name",
          "Parent_Name",
          "Parent_Phone",
          "Course",
          "Balance_INR",
          "Due_Date",
          "Days_Overdue",
          "Payment_Link"
        ],
        "submit": "Call & send link",
        "success": "Reminder call started — the parent's answer appears here",
        "fields": []
      }
    ],
    "actions": {
      "header": [],
      "row": [
        "record_payment",
        "send_link",
        "remind"
      ]
    },
    "portal": "admin",
    "blocks": [
      {
        "type": "kpis",
        "kpis": [
          {
            "metric": "collected_month",
            "entity": "fees",
            "label": "Collected this month",
            "tone": "ok",
            "icon": "Wallet",
            "formula": "sum Paid_INR where Paid_At in month",
            "filter": "Paid_At in month",
            "format": "money_l",
            "alert": false
          },
          {
            "metric": "fees_overdue",
            "filter": "Status=Overdue",
            "entity": "fees",
            "label": "Fees overdue",
            "tone": "bad",
            "icon": "IndianRupee",
            "formula": "sum Balance_INR where Status=Overdue",
            "format": "money_l",
            "alert": true
          },
          {
            "metric": "overdue_count",
            "filter": "Status=Overdue",
            "entity": "fees",
            "label": "Overdue students",
            "tone": "bad",
            "icon": "UserX",
            "formula": "count where Status=Overdue",
            "alert": true
          },
          {
            "label": "Reminders today",
            "formula": "count where Last_Reminder_At=today",
            "icon": "Send",
            "entity": "fees"
          }
        ],
        "id": "fees-kpis"
      },
      {
        "type": "tabs",
        "tabs": [
          {
            "label": "Overdue",
            "where": "Status=Overdue",
            "blocks": [
              {
                "type": "table",
                "columns": [
                  {
                    "key": "Student_Name",
                    "header": "Student",
                    "type": "text",
                    "sub": "Parent_Name"
                  },
                  {
                    "key": "Course",
                    "type": "tag"
                  },
                  {
                    "key": "Balance_INR",
                    "header": "Balance",
                    "type": "money"
                  },
                  {
                    "key": "Due_Date",
                    "header": "Due",
                    "type": "due"
                  },
                  {
                    "key": "Days_Overdue",
                    "header": "Days overdue",
                    "type": "number"
                  },
                  {
                    "key": "Reminder_Count",
                    "header": "Reminders",
                    "type": "number"
                  },
                  {
                    "key": "Parent_Response",
                    "header": "Parent said",
                    "type": "truncate"
                  },
                  {
                    "key": "Status",
                    "type": "badge"
                  }
                ],
                "search": [
                  "Student_Name",
                  "Parent_Name",
                  "Parent_Phone",
                  "Fee_ID",
                  "Receipt_No"
                ],
                "filters": [
                  "Course"
                ],
                "bulk": [
                  "remind",
                  "send_link"
                ],
                "actions": {
                  "header": [],
                  "row": [
                    "record_payment",
                    "send_link",
                    "remind"
                  ]
                }
              }
            ]
          },
          {
            "label": "Due this week",
            "where": "Status in [Due, Upcoming, Partial] and Due_Date<=today+7",
            "blocks": [
              {
                "type": "table",
                "columns": [
                  {
                    "key": "Student_Name",
                    "header": "Student",
                    "type": "text",
                    "sub": "Parent_Name"
                  },
                  {
                    "key": "Course",
                    "type": "tag"
                  },
                  {
                    "key": "Balance_INR",
                    "header": "Balance",
                    "type": "money"
                  },
                  {
                    "key": "Due_Date",
                    "header": "Due",
                    "type": "due"
                  },
                  {
                    "key": "Days_Overdue",
                    "header": "Days overdue",
                    "type": "number"
                  },
                  {
                    "key": "Reminder_Count",
                    "header": "Reminders",
                    "type": "number"
                  },
                  {
                    "key": "Parent_Response",
                    "header": "Parent said",
                    "type": "truncate"
                  },
                  {
                    "key": "Status",
                    "type": "badge"
                  }
                ],
                "search": [
                  "Student_Name",
                  "Parent_Name",
                  "Parent_Phone",
                  "Fee_ID",
                  "Receipt_No"
                ],
                "filters": [
                  "Course"
                ],
                "bulk": [
                  "remind",
                  "send_link"
                ],
                "actions": {
                  "header": [],
                  "row": [
                    "record_payment",
                    "send_link",
                    "remind"
                  ]
                }
              }
            ]
          },
          {
            "label": "Paid this month",
            "where": "Status=Paid and Paid_At in month",
            "blocks": [
              {
                "type": "table",
                "columns": [
                  {
                    "key": "Student_Name",
                    "header": "Student",
                    "type": "text",
                    "sub": "Parent_Name"
                  },
                  {
                    "key": "Course",
                    "type": "tag"
                  },
                  {
                    "key": "Balance_INR",
                    "header": "Balance",
                    "type": "money"
                  },
                  {
                    "key": "Due_Date",
                    "header": "Due",
                    "type": "due"
                  },
                  {
                    "key": "Days_Overdue",
                    "header": "Days overdue",
                    "type": "number"
                  },
                  {
                    "key": "Reminder_Count",
                    "header": "Reminders",
                    "type": "number"
                  },
                  {
                    "key": "Parent_Response",
                    "header": "Parent said",
                    "type": "truncate"
                  },
                  {
                    "key": "Status",
                    "type": "badge"
                  }
                ],
                "search": [
                  "Student_Name",
                  "Parent_Name",
                  "Parent_Phone",
                  "Fee_ID",
                  "Receipt_No"
                ],
                "filters": [
                  "Course"
                ],
                "bulk": [
                  "remind",
                  "send_link"
                ],
                "actions": {
                  "header": [],
                  "row": [
                    "record_payment",
                    "send_link",
                    "remind"
                  ]
                }
              }
            ]
          },
          {
            "label": "All",
            "where": null,
            "blocks": [
              {
                "type": "table",
                "columns": [
                  {
                    "key": "Student_Name",
                    "header": "Student",
                    "type": "text",
                    "sub": "Parent_Name"
                  },
                  {
                    "key": "Course",
                    "type": "tag"
                  },
                  {
                    "key": "Balance_INR",
                    "header": "Balance",
                    "type": "money"
                  },
                  {
                    "key": "Due_Date",
                    "header": "Due",
                    "type": "due"
                  },
                  {
                    "key": "Days_Overdue",
                    "header": "Days overdue",
                    "type": "number"
                  },
                  {
                    "key": "Reminder_Count",
                    "header": "Reminders",
                    "type": "number"
                  },
                  {
                    "key": "Parent_Response",
                    "header": "Parent said",
                    "type": "truncate"
                  },
                  {
                    "key": "Status",
                    "type": "badge"
                  }
                ],
                "search": [
                  "Student_Name",
                  "Parent_Name",
                  "Parent_Phone",
                  "Fee_ID",
                  "Receipt_No"
                ],
                "filters": [
                  "Course"
                ],
                "bulk": [
                  "remind",
                  "send_link"
                ],
                "actions": {
                  "header": [],
                  "row": [
                    "record_payment",
                    "send_link",
                    "remind"
                  ]
                }
              }
            ]
          }
        ],
        "id": "fees-tabs"
      }
    ],
    "kind": "page"
  },
  {
    "id": "parents",
    "covers": [
      "R29",
      "R31",
      "R32",
      "R33"
    ],
    "route": "/parents",
    "label": "Parent updates",
    "subtitle": "Friday reports and calls — how each parent feels, and who raised a concern",
    "icon": "HeartHandshake",
    "group": "Communication",
    "entity": "calls",
    "read_only": "Parent calls are written by the Parent agent; a call or report to one parent starts from the Students page",
    "portal": "admin",
    "blocks": [
      {
        "type": "kpis",
        "kpis": [
          {
            "metric": "parents_happy",
            "filter": "Sentiment=Happy",
            "entity": "calls",
            "label": "Happy parents",
            "tone": "ok",
            "icon": "Smile",
            "formula": "count where Agent=Parent and Sentiment=Happy and Called_At in last 7 days",
            "alert": false
          },
          {
            "metric": "parents_neutral",
            "filter": "Sentiment=Neutral",
            "entity": "calls",
            "label": "Neutral",
            "tone": "warn",
            "icon": "Meh",
            "formula": "count where Agent=Parent and Sentiment=Neutral and Called_At in last 7 days",
            "alert": true
          },
          {
            "metric": "parents_concerned",
            "filter": "Sentiment=Concerned",
            "entity": "calls",
            "label": "Concerned parents",
            "tone": "bad",
            "icon": "Frown",
            "formula": "count where Agent=Parent and Sentiment=Concerned and Called_At in last 7 days",
            "alert": true
          }
        ],
        "id": "parents-kpis"
      },
      {
        "type": "tabs",
        "tabs": [
          {
            "label": "Parent calls",
            "where": "Agent=Parent",
            "blocks": [
              {
                "type": "table",
                "period": {
                  "column": "Called_At",
                  "presets": [
                    "7d",
                    "30d",
                    "all"
                  ],
                  "default": "7d"
                },
                "columns": [
                  {
                    "key": "Person",
                    "header": "Parent",
                    "type": "text",
                    "sub": "Phone"
                  },
                  {
                    "key": "Course",
                    "type": "tag"
                  },
                  {
                    "key": "Status",
                    "header": "Call",
                    "type": "badge"
                  },
                  {
                    "key": "Sentiment",
                    "type": "badge"
                  },
                  {
                    "key": "Concern",
                    "type": "truncate"
                  },
                  {
                    "key": "Retry_At",
                    "header": "Retry",
                    "type": "date",
                    "priority": "low"
                  },
                  {
                    "key": "Called_At",
                    "header": "Time",
                    "type": "date",
                    "time": true
                  }
                ],
                "search": [
                  "Person",
                  "Concern",
                  "Summary"
                ],
                "filters": [
                  "Sentiment",
                  "Status"
                ],
                "actions": null
              }
            ]
          },
          {
            "label": "Concerns",
            "where": "Agent=Parent and Sentiment=Concerned",
            "blocks": [
              {
                "type": "table",
                "period": {
                  "column": "Called_At",
                  "presets": [
                    "7d",
                    "30d",
                    "all"
                  ],
                  "default": "7d"
                },
                "columns": [
                  {
                    "key": "Person",
                    "header": "Parent",
                    "type": "text",
                    "sub": "Phone"
                  },
                  {
                    "key": "Course",
                    "type": "tag"
                  },
                  {
                    "key": "Status",
                    "header": "Call",
                    "type": "badge"
                  },
                  {
                    "key": "Sentiment",
                    "type": "badge"
                  },
                  {
                    "key": "Concern",
                    "type": "truncate"
                  },
                  {
                    "key": "Retry_At",
                    "header": "Retry",
                    "type": "date",
                    "priority": "low"
                  },
                  {
                    "key": "Called_At",
                    "header": "Time",
                    "type": "date",
                    "time": true
                  }
                ],
                "search": [
                  "Person",
                  "Concern",
                  "Summary"
                ],
                "filters": [
                  "Sentiment",
                  "Status"
                ],
                "actions": null
              }
            ]
          }
        ],
        "id": "parents-tabs"
      }
    ],
    "kind": "page"
  },
  {
    "id": "messages",
    "covers": [
      "R36",
      "R34"
    ],
    "route": "/messages",
    "label": "WhatsApp",
    "subtitle": "Every template the agents and the office sent, with delivery status",
    "icon": "MessageCircle",
    "group": "Communication",
    "entity": "messages",
    "read_only": "Messages are logged by the flows; a new message to a parent starts from the Students page (one, a batch or everyone)",
    "portal": "admin",
    "blocks": [
      {
        "type": "kpis",
        "kpis": [
          {
            "metric": "messages_today",
            "entity": "messages",
            "label": "WhatsApp sent today",
            "tone": "auto",
            "icon": "MessageCircle",
            "formula": "count where Sent_At=today",
            "filter": "Sent_At=today",
            "alert": false
          },
          {
            "label": "Delivered",
            "formula": "count where Status in [Delivered, Read] and Sent_At in last 7 days",
            "icon": "CheckCheck",
            "entity": "messages"
          },
          {
            "label": "Read",
            "formula": "count where Status=Read and Sent_At in last 7 days",
            "icon": "Eye",
            "entity": "messages"
          },
          {
            "metric": "messages_failed",
            "filter": "Status=Failed",
            "entity": "messages",
            "label": "Failed",
            "tone": "bad",
            "icon": "MessageSquareX",
            "formula": "count where Status=Failed",
            "alert": true
          }
        ],
        "id": "messages-kpis"
      },
      {
        "type": "table",
        "segments": {
          "column": "Type",
          "all": "All messages"
        },
        "period": {
          "column": "Sent_At",
          "presets": [
            "today",
            "7d",
            "30d",
            "all"
          ],
          "default": "7d"
        },
        "columns": [
          {
            "key": "To_Name",
            "header": "To",
            "type": "text",
            "sub": "To_Phone"
          },
          {
            "key": "Type",
            "type": "tag"
          },
          {
            "key": "Agent",
            "type": "tag"
          },
          {
            "key": "Preview",
            "type": "truncate"
          },
          {
            "key": "Status",
            "type": "badge"
          },
          {
            "key": "Sent_At",
            "header": "Sent",
            "type": "date",
            "time": true
          }
        ],
        "search": [
          "To_Name",
          "To_Phone",
          "Preview"
        ],
        "filters": [
          "Agent",
          "Status"
        ],
        "id": "messages-table"
      }
    ],
    "kind": "page"
  },
  {
    "id": "team",
    "covers": [
      "R4",
      "R6",
      "R17",
      "R22"
    ],
    "route": "/team",
    "label": "Team",
    "subtitle": "Counsellors, mentors and office staff — their WhatsApp numbers receive the agents' alerts",
    "icon": "Contact",
    "group": "Setup",
    "entity": "team",
    "modals": [
      {
        "id": "add_member",
        "kind": "create",
        "title": "Add team member",
        "direct": "insert",
        "columns": 2,
        "fields": [
          {
            "key": "Name",
            "label": "Name",
            "type": "text",
            "required": true
          },
          {
            "key": "Role",
            "label": "Role",
            "type": "select",
            "options": [
              "Director",
              "Office Admin",
              "Counsellor",
              "Mentor"
            ],
            "required": true
          },
          {
            "key": "Phone",
            "label": "WhatsApp number",
            "type": "text",
            "required": true
          },
          {
            "key": "Email",
            "label": "Email",
            "type": "text"
          },
          {
            "key": "Courses",
            "label": "Courses",
            "type": "text",
            "placeholder": "JEE Mains, NEET"
          },
          {
            "key": "Active",
            "label": "Active",
            "type": "select",
            "options": [
              "true",
              "false"
            ],
            "default": "true"
          }
        ]
      },
      {
        "id": "edit_member",
        "kind": "edit",
        "title": "Edit team member",
        "direct": "patch",
        "summary": [
          "Name",
          "Role"
        ],
        "fields": [
          {
            "key": "Phone",
            "label": "WhatsApp number",
            "type": "text"
          },
          {
            "key": "Courses",
            "label": "Courses",
            "type": "text"
          },
          {
            "key": "Active",
            "label": "Active",
            "type": "select",
            "options": [
              "true",
              "false"
            ]
          }
        ]
      }
    ],
    "actions": {
      "header": [
        "add_member"
      ],
      "row": [
        "edit_member"
      ]
    },
    "portal": "admin",
    "blocks": [
      {
        "type": "table",
        "columns": [
          {
            "key": "Name",
            "type": "text",
            "sub": "Email"
          },
          {
            "key": "Role",
            "type": "tag"
          },
          {
            "key": "Phone",
            "type": "text"
          },
          {
            "key": "Courses",
            "type": "text"
          },
          {
            "key": "Active",
            "type": "badge"
          }
        ],
        "search": [
          "Name",
          "Phone",
          "Email"
        ],
        "filters": [
          "Role"
        ],
        "id": "team-table"
      }
    ],
    "kind": "page"
  },
  {
    "id": "settings",
    "kind": "settings",
    "route": "/settings",
    "label": "Settings",
    "icon": "Settings",
    "desc": "Profile, password, flow webhook URLs",
    "portal": "admin"
  },
  {
    "id": "users",
    "kind": "users",
    "route": "/users",
    "label": "Users & roles",
    "icon": "Users",
    "group": "Setup",
    "desc": "Everyone who can sign in, and what each role may open",
    "subtitle": "Add people, reset passwords, change roles",
    "portal": "admin",
    "kernel": true
  }
];
