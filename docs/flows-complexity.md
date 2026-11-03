# Workflow complexity

Budget per action path: ≤ 14 steps · ≤ 1 AI call (2 with a code check between) · no nested router · no CODE node > 40 lines · no two CODE nodes in a row. Per flow: ≤ 12 actions.

## Pucho EduFlow - ABSENCE — 0 action(s), longest path 11 steps, within budget

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| (single path) | 11 | 0 | 0 | — |

## Pucho EduFlow - ACADEMIC_CALL — 2 action(s), longest path 14 steps, 1 breach(es)

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| counsel | 14 | 3 | 1 | — |
| unknown action | 4 | 0 | 1 | — |

- ⚠ counsel: 3 AI calls (budget 1; 2 with a check — method/ai-pipeline.md)

## Pucho EduFlow - ACADEMIC_RUN — 0 action(s), longest path 6 steps, within budget

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| (single path) | 6 | 0 | 0 | — |

## Pucho EduFlow - ADMISSION_CALL — 3 action(s), longest path 14 steps, 2 breach(es)

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| new_lead | 14 | 3 | 1 | — |
| call | 14 | 3 | 1 | — |
| unknown action | 4 | 0 | 1 | — |

- ⚠ call: 3 AI calls (budget 1; 2 with a check — method/ai-pipeline.md)
- ⚠ new_lead: 3 AI calls (budget 1; 2 with a check — method/ai-pipeline.md)

## Pucho EduFlow - ATTENDANCE — 0 action(s), longest path 9 steps, within budget

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| (single path) | 9 | 0 | 0 | — |

## Pucho EduFlow - FEE_REMINDER — 3 action(s), longest path 14 steps, 1 breach(es)

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| remind | 14 | 3 | 1 | — |
| send_link | 9 | 0 | 1 | — |
| unknown action | 4 | 0 | 1 | — |

- ⚠ remind: 3 AI calls (budget 1; 2 with a check — method/ai-pipeline.md)

## Pucho EduFlow - FEE_RUN — 0 action(s), longest path 8 steps, within budget

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| (single path) | 8 | 0 | 0 | — |

## Pucho EduFlow - PARENT_RUN — 0 action(s), longest path 9 steps, within budget

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| (single path) | 9 | 0 | 0 | — |

## Pucho EduFlow - PARENT_UPDATE — 3 action(s), longest path 14 steps, 1 breach(es)

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| weekly_report | 9 | 0 | 1 | — |
| update_call | 14 | 3 | 1 | — |
| unknown action | 4 | 0 | 1 | — |

- ⚠ update_call: 3 AI calls (budget 1; 2 with a check — method/ai-pipeline.md)

## Pucho EduFlow - ROLLUP — 0 action(s), longest path 12 steps, within budget

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| (single path) | 12 | 0 | 0 | — |

## Pucho EduFlow - SCORES — 2 action(s), longest path 8 steps, within budget

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| save_batch | 8 | 0 | 1 | — |
| unknown action | 4 | 0 | 1 | — |

## Pucho EduFlow - SEND_WHATSAPP — 2 action(s), longest path 8 steps, within budget

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| send_update | 8 | 0 | 1 | — |
| unknown action | 4 | 0 | 1 | — |

## Pucho EduFlow - STUDENT_MANAGE — 2 action(s), longest path 12 steps, within budget

| action path | steps | AI calls | router depth | longest CODE |
|---|---:|---:|---:|---:|
| enrol | 12 | 0 | 1 | — |
| unknown action | 4 | 0 | 1 | — |

