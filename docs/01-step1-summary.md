# Step 1 — Requirement collection and the first cost estimate

| Artefact | File | Status |
|---|---|---|
| Source inventory | `intake/00-source-inventory.md` | written |
| Product brief + problem card | `intake/00-product-brief.md` | written |
| R-lines | R1–R40 (39 quoted from the mockup or n8n, 1 inferred ⚑ R19) | `intake_check` **PASS** (`intake/intake-check.txt`) |
| Not in v1 | X1–X6 | written |
| Gaps | G1–G10 | open, see the brief |
| `requirements:` block for os.yaml | `intake/requirements.yaml` | ready for step 2 (`covers:` filled there) |
| Cost estimate | `intake/estimate/<scenario>/estimate.md` (+ .csv, .json) | **estimate**, table defaults |

## Operating cost — credits per month (₹0.30 per credit, table defaults)

| Scenario | Credits / month | ₹ / month | Range ±30 % volume |
|---|---|---|---|
| Typical buyer (342 students), **n8n policy as designed** | 139,768 | ≈ ₹41,931 | ₹29,351 – ₹54,510 |
| Typical buyer, **recommended policy** (G2/G3) | 51,915 | ≈ ₹15,575 | ₹10,902 – ₹20,247 |
| Small buyer (120 students), recommended | 18,102 | ≈ ₹5,430 | ₹3,801 – ₹7,060 |
| Large buyer (1,000 students), recommended | 152,507 | ≈ ₹45,752 | ₹32,027 – ₹59,478 |

Where the money goes for the typical buyer under the n8n policy:
- **Weekly parent calls to everyone:** 1,481 calls, 72,562 credits (52 %).
- **A call on every absence:** 1,144 calls, 33,176 credits.
- **Daily fee calls:** 690 calls, 20,010 credits.

The recommended policy cuts the total by **63 %**:
- **Absences:** a WhatsApp on every absence, and a call only from the 2nd absence in a week.
- **Weekly update:** a WhatsApp report to every parent, and a call only to parents of at-risk students.
- **Fees:** a call on day 1, 7 and 15 of being overdue, plus a WhatsApp 3 days before the due date.

Read these numbers as follows:
- Voice is priced at **10 credits per minute**. The minutes per call (2–4.5) come from the mockup's call durations, so voice cost is **UNVERIFIED** until a real `ai-voice-call` run.
- A WhatsApp-only run still costs about 7 credits (trigger, constants, build, send, write, Return). At 1,144 absences, the absence alert alone is 8,008 credits. One daily digest per parent would be cheaper; this can be decided at step 2.
- Meta bills WhatsApp conversations separately, outside these credits: about 3,600 messages a month for the typical buyer.
- These are step-1 figures. Step 2 declares credits per action in `os.yaml`, and step 6 counts them from the built flow JSON. Counted figures ran 3–5× declared on earlier builds (SKILL.md, Known gaps).

**Gate (step 1):** brief + R-lines + gaps + estimate written, and `intake_check` PASS. What remains is to **send the estimate** to the product owner and get answers to G2, G3 and G6–G8, which change step 2.

**Next:** step 2, decide the OS (`os.yaml`): roles, journeys, entities, metrics, sections, actions, flows, overview, look, copy, and what is not in v1.
