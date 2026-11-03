# sample payload — ATTENDANCE.save_batch
```json
{
  "action": "save_batch",
  "_who": "Sunita Rao",
  "Date": "2026-11-04",
  "Batch": "Batch C — Weekend",
  "Total_Count": 3,
  "Present_Count": 2,
  "Absent_Count": 1,
  "Absentees": "ST-2026-0122",
  "Marked_By": "Sunita Rao",
  "lines": [
    {
      "Date": "2026-11-04",
      "Batch": "Batch C — Weekend",
      "Student_ID": "ST-2026-0119",
      "Name": "Sneha Joshi",
      "Course": "UPSC",
      "Parent_Name": "Mr. A. Joshi",
      "Parent_Phone": "+919425024714",
      "Status": "Present",
      "Absences_This_Week": 0,
      "Absences_This_Month": 0,
      "Call_Status": "Present",
      "Needs_Followup": "No",
      "Followup_Done": "",
      "Marked_By": "Sunita Rao"
    },
    {
      "Date": "2026-11-04",
      "Batch": "Batch C — Weekend",
      "Student_ID": "ST-2026-0120",
      "Name": "Vikram Pal",
      "Course": "UPSC",
      "Parent_Name": "Mr. R. Pal",
      "Parent_Phone": "+919425026087",
      "Status": "Present",
      "Absences_This_Week": 0,
      "Absences_This_Month": 0,
      "Call_Status": "Present",
      "Needs_Followup": "No",
      "Followup_Done": "",
      "Marked_By": "Sunita Rao"
    },
    {
      "Date": "2026-11-04",
      "Batch": "Batch C — Weekend",
      "Student_ID": "ST-2026-0122",
      "Name": "Saurabh Tiwari",
      "Course": "UPSC",
      "Parent_Name": "Mr. L. Tiwari",
      "Parent_Phone": "+919425028833",
      "Status": "Absent",
      "Absences_This_Week": 3,
      "Absences_This_Month": 5,
      "Call_Status": "Queued",
      "Needs_Followup": "Yes",
      "Followup_Done": "No",
      "Marked_By": "Sunita Rao"
    }
  ]
}
```
(samples are .md on purpose — never .json in a workflows folder)
