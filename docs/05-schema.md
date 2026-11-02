# 05 — Data schema · EduFlow
PostgreSQL, one table per entity (`app/db/schema.sql`, idempotent — apply, then apply again). Column names are the declared names in lower case; the kernel reads every value as a string. The app writes through its DAL; a flow writes through `/api/data/<entity>` with `INBOUND_TOKEN`; Studio reads with `studio_reader` (SELECT on these tables only).

## leads
| column | type |
|---|---|
| Lead_ID | text |
| Created_At | timestamptz |
| Name | text |
| Phone | text |
| Email | text |
| Course | text |
| Source | text |
| Notes | text |
| Stage | text |
| Grade | text |
| Score | numeric |
| AI_Summary | text |
| Next_Action | text |
| Call_Status | text |
| Last_Called_At | timestamptz |
| Transcript | text |
| Assigned_To | text |
| Next_Followup_At | timestamptz |
| Lost_Reason | text |

id: Lead_ID (LD-…) · status: Stage ['New', 'Called', 'Counselling', 'Demo Booked', 'Nurture', 'Enrolled', 'Lost']

## students
| column | type |
|---|---|
| Student_ID | text |
| Enrolled_At | timestamptz |
| Name | text |
| Student_Phone | text |
| Parent_Name | text |
| Parent_Phone | text |
| Course | text |
| Batch | text |
| Address | text |
| Status | text |
| Attendance_Pct | numeric |
| Last_Score | numeric |
| Avg_Score | numeric |
| Class_Rank | numeric |
| Strong_Subjects | text |
| Weak_Subjects | text |
| Performance_Trend | text |
| Fee_Status | text |
| Fee_Amount_INR | numeric |
| Fee_Due_Date | date |
| Mentor | text |
| Counsellor | text |
| Issue_Type | text |
| Main_Issue | text |
| Last_Counselled_At | timestamptz |
| Last_Report_At | timestamptz |
| Last_Parent_Call_At | timestamptz |
| Parent_Sentiment | text |
| Parent_Concern | text |

id: Student_ID (ST-…) · status: Status ['Active', 'At Risk', 'Critical', 'Inactive']

## fees
| column | type |
|---|---|
| Fee_ID | text |
| Created_At | timestamptz |
| Student_ID | text |
| Student_Name | text |
| Parent_Name | text |
| Parent_Phone | text |
| Course | text |
| Instalment | text |
| Amount_INR | numeric |
| Paid_INR | numeric |
| Balance_INR | numeric |
| Due_Date | date |
| Days_Overdue | numeric |
| Status | text |
| Reminder_Count | numeric |
| Last_Reminder_At | timestamptz |
| Payment_Link | text |
| Promise_Date | date |
| Parent_Response | text |
| Paid_At | timestamptz |
| Payment_Mode | text |
| Receipt_No | text |

id: Fee_ID (FE-…) · status: Status ['Upcoming', 'Due', 'Overdue', 'Partial', 'Paid']

## attendance
| column | type |
|---|---|
| Att_ID | text |
| Date | timestamptz |
| Batch | text |
| Student_ID | text |
| Name | text |
| Course | text |
| Parent_Name | text |
| Parent_Phone | text |
| Status | text |
| Absences_This_Week | numeric |
| Absences_This_Month | numeric |
| Call_Status | text |
| Reason | text |
| Category | text |
| Needs_Followup | text |
| Followup_Done | text |
| Marked_By | text |

id: Att_ID (AT-…) · status: Status ['Present', 'Absent']

## tests
| column | type |
|---|---|
| Score_ID | text |
| Test_Date | timestamptz |
| Test_Name | text |
| Student_ID | text |
| Name | text |
| Course | text |
| Batch | text |
| Subject | text |
| Marks | numeric |
| Max_Marks | numeric |
| Score_Pct | numeric |

id: Score_ID (TS-…) · status: — 

## calls
| column | type |
|---|---|
| Call_ID | text |
| Called_At | timestamptz |
| Agent | text |
| Person | text |
| Relation | text |
| Phone | text |
| Lead_ID | text |
| Student_ID | text |
| Course | text |
| Status | text |
| Duration_Sec | numeric |
| Request_ID | text |
| Outcome | text |
| Summary | text |
| Transcript | text |
| Grade | text |
| Score | numeric |
| Sentiment | text |
| Concern | text |
| Issue_Type | text |
| Reason | text |
| Category | text |
| Needs_Followup | text |
| Retry_At | timestamptz |

id: Call_ID (CL-…) · status: Status ['Queued', 'Calling', 'Completed', 'No Answer', 'Failed', 'Escalated']

## messages
| column | type |
|---|---|
| Msg_ID | text |
| Sent_At | timestamptz |
| To_Name | text |
| To_Phone | text |
| Type | text |
| Agent | text |
| Template | text |
| Preview | text |
| Status | text |
| Student_ID | text |
| Lead_ID | text |

id: Msg_ID (WA-…) · status: Status ['Queued', 'Sent', 'Delivered', 'Read', 'Failed', 'Simulated']

## alerts
| column | type |
|---|---|
| Alert_ID | text |
| Raised_At | timestamptz |
| Title | text |
| Detail | text |
| Kind | text |
| Severity | text |
| Student_ID | text |
| Lead_ID | text |
| Raised_By | text |
| Owner | text |
| Status | text |
| Resolution | text |
| Resolved_At | timestamptz |

id: Alert_ID (AL-…) · status: Status ['Open', 'Acknowledged', 'Resolved']

## team
| column | type |
|---|---|
| Member_ID | text |
| Name | text |
| Role | text |
| Phone | text |
| Email | text |
| Courses | text |
| Active | boolean |

id: Member_ID (TM-…) · status: — 

## audit_log
| column | type |
|---|---|
| Audit_ID | text |
| At | timestamptz |
| Who | text |
| Flow | text |
| Action | text |
| Entity | text |
| Record_ID | text |
| Summary | text |

id: Audit_ID (AUD-…) · status: — 
