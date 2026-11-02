# Intake — Pucho EduFlow OS (step 0)

Answered 2 Nov 2026 by suraj@pucho.ai.

| Question | Answer |
|---|---|
| For whom | Pucho product **EduFlow** for coaching institutes (`os.mode: product`). Flows are named `Pucho EduFlow - <FLOW>`. |
| Stage | Clickable demo on sample data. A flow that is not wired is SIMULATED by the app. |
| Voice | Pucho `ai-voice-call`, replacing VAPI. UNVERIFIED until the first live call (G1). |
| Look | Pucho default (white, Geist, shadcn) with indigo as the one accent. Hinglish copy and the page structure come from the mockup. |
| Data home | The OS's own PostgreSQL. The n8n CRM endpoints are placeholders. |
| Automation | Fully automatic, with an exception queue (Alerts & Escalations). |
| Parity | A subset plus fixes. The n8n status page is dropped, and the n8n defects are fixed. |

**Simulated or unverified at this stage:** voice calls, WhatsApp sends, Razorpay links and the scheduled runs. The app simulates each one until its flow is wired.
**Risks:** no Studio reference export exists for `ai-voice-call` or `delay`. The http write-back `body.data` is unproven. Studio webhooks accept calls without auth.

Folder note: step-1 files live in `intake/` and move into `<os>/docs/` at scaffold (step 3). The OS repository is planned at a short path (`C:\pucho\eduflow-os`).
