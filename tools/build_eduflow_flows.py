#!/usr/bin/env python3
"""tools/build_eduflow_flows.py — the EduFlow Studio flows that build_flows.py cannot express (method/ai-pipeline.md, the custom path).

Usage: python tools/build_eduflow_flows.py [<os_root>] [--kit C:/pucho/kit] [--company-name EduFlow] [--app-url https://…]

build_flows.py builds an action as validate → (one AI call) → write → answer, and a schedule as a Tally sync. EduFlow needs more:
  · four call agents — voiceCall → delay → getCallDetails → ONE Pucho CDM read → code → writes → Return
    (ADMISSION_CALL, ACADEMIC_CALL, FEE_REMINDER, PARENT_UPDATE)
  · three message flows whose rules write more than the effect (ABSENCE, STUDENT_MANAGE, SEND_WHATSAPP) and the attendance save
    that posts one ABSENCE call per absentee (ATTENDANCE)
  · four schedules that read the app's rows, decide in code and post one call per target to an action flow
    (FEE_RUN, ACADEMIC_RUN, PARENT_RUN, ROLLUP)
SCORES stays on build_flows.py (a pure write). Every rule is code in tools/eduflow/flowlib.mjs, copied verbatim into each CODE step
(with the app's renderMessage.js and flowkit's cdmFields) between `// lib:` and `// end lib`. A "send to 0 or 1 people" is a LOOP
over a list the code built — never a router inside the action's branch (the simplicity budget: ≤ 14 steps a path, ≤ 1 AI call).
Writes go through {{app_url}}/api/data with the inbound token (method/webhook-contract.md); a flow never holds a database credential.
"""
import argparse, json, os, re, sys

ap = argparse.ArgumentParser()
ap.add_argument("root", nargs="?", default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ap.add_argument("--kit", default=os.environ.get("PUCHO_KIT", "C:/pucho/kit"))
ap.add_argument("--company-name", default="EduFlow")
ap.add_argument("--app-url", default="")
args = ap.parse_args()
for s_ in (sys.stdout, sys.stderr):
    try: s_.reconfigure(encoding="utf-8")
    except Exception: pass
sys.path.insert(0, os.path.join(args.kit, "flow")); sys.path.insert(0, os.path.join(args.kit, "scripts"))
import yaml  # noqa: E402
from flowkit import step, code, router, chain, respond, cdm_extract, flow, TEXT_IS, CDM_FIELDS_JS  # noqa: E402
import oskit, studio_checklist  # noqa: E402

ROOT = os.path.abspath(args.root)
O = yaml.safe_load(open(os.path.join(ROOT, "os.yaml"), encoding="utf-8"))
FLOWS = {f["name"]: f for f in O["flows"]}
ENT = {e["name"]: e for e in O["entities"]}
COLS = lambda e: ENT[e]["columns"]
IDC = lambda e: ENT[e]["id"]["column"]
APP_CALLED = {"ADMISSION_CALL", "STUDENT_MANAGE", "ATTENDANCE", "ABSENCE", "ACADEMIC_CALL", "FEE_REMINDER", "PARENT_UPDATE", "SEND_WHATSAPP"}
CONST = "step_constants"
TOKEN = oskit.TOKEN_PLACEHOLDER

# ── the library every CODE step carries (rules in one place; tests/eduflow-flowlib.test.mjs + flow_sim run the same text) ──
def _read(p): return open(p, encoding="utf-8").read()
RENDER = _read(os.path.join(ROOT, "app", "src", "lib", "renderMessage.js"))
FLOWLIB = re.sub(r"^export function ", "function ", _read(os.path.join(ROOT, "tools", "eduflow", "flowlib.mjs")), flags=re.M)
LIB = ("// lib: app/src/lib/renderMessage.js + flowkit cdmFields + tools/eduflow/flowlib.mjs, copied verbatim — edit those files, rebuild\n"
       + RENDER.rstrip() + "\n" + CDM_FIELDS_JS + "\n" + FLOWLIB.rstrip() + "\n// end lib\n")

def lib(n, fn, inputs, disp):
    """A CODE step that runs ONE library function on its inputs."""
    return code(n, LIB + f"export const code = async (inputs) => {fn}(inputs);", inputs, disp)

def consts(fname, extra):
    """The constants step: app_url / inbound_token / company_name from the call (app-called) or written in (schedule)."""
    called = fname in APP_CALLED
    C = {"flow": fname, "app_url": "" if called else (args.app_url or "SET_IN_STUDIO_APP_URL"), "inbound_token": "" if called else TOKEN,
         "company_name": "" if called else (args.company_name or "SET_IN_STUDIO_COMPANY_NAME"), **extra}
    body = "  const C = " + json.dumps(C, ensure_ascii=False, indent=2).replace("\n", "\n  ") + ";\n"
    if called:
        body += ("  // v5.1: the app sends app_url, inbound_token and company_name with every call\n"
                 "  C.app_url = String(inputs.app_url || ''); C.inbound_token = String(inputs.inbound_token || ''); C.company_name = String(inputs.company_name || '');\n")
    body += "  C.app_url = String(C.app_url).replace(/\\/+$/, '');\n  return C;\n"
    inputs = {k: f"{{{{trigger['body']['{k}']}}}}" for k in ("app_url", "inbound_token", "company_name")} if called else {}
    return code(CONST, "export const code = async (inputs) => {\n" + body + "};", inputs, "Constants")

def wa_consts(*keys):
    return {"whatsapp_account_id": "SET_IN_STUDIO_WHATSAPP_ACCOUNT_ID",
            "whatsapp_templates": {k: f"SET_IN_STUDIO_TEMPLATE_ID_{k.upper()}" for k in keys},
            "whatsapp_template_names": {k: f"eduflow_{k}" for k in keys}}

# ── steps ──
def H(): return {"Content-Type": "application/json", "Authorization": f"Bearer {{{{{CONST}['inbound_token']}}}}", "X-Flow": f"{{{{{CONST}['flow']}}}}"}
def http(n, method, disp, entity=None, url=None, body=None, query=None, cont=False):
    inp = {"method": method, "url": url or f"{{{{{CONST}['app_url']}}}}/api/data/{entity}", "headers": H(), "queryParams": query or {}, "authType": "NONE"}
    if body is not None: inp["body_type"] = "json"; inp["body"] = {"data": body}
    return step(n, "http", "send_request", inp, disp, cont=cont)
def get(n, entity): return http(n, "GET", f"Read {entity}", entity=entity, query={"select": "*"})
def post_rows(n, entity, ref, disp): return http(n, "POST", disp, entity=entity, body=ref)
def named(base, cols): return {c: f"{{{{{base}['{c}']}}}}" for c in cols}
def post_row(n, entity, base, disp, over=None):
    """One row as NAMED fields (rule 9: a bare reference leaves Studio's JSON Body box empty); the app numbers the id."""
    f = named(base, [c for c in COLS(entity) if c != IDC(entity)]); f.update(over or {})
    return http(n, "POST", disp, entity=entity, body=f)
def patch(n, entity, id_ref, base, keys, disp):
    return http(n, "PATCH", disp, entity=entity, query={IDC(entity): f"eq.{id_ref}"}, body=named(base, keys))
def wa(n, to_ref, tkey, vars_base, nvars, disp, cont=True):
    """pucho-whatsapp template send. continueOnFailure: the next CODE step reads the answer and records Sent / Failed."""
    return step(n, "pucho-whatsapp", "send_template_message",
                {"account_id": f"{{{{{CONST}['whatsapp_account_id']}}}}", "to": to_ref, "template_id": f"{{{{{CONST}['whatsapp_templates']['{tkey}']}}}}",
                 "template_variables": {str(k): f"{{{{{vars_base}['{k}']}}}}" for k in range(1, nvars + 1)}}, disp, cont=cont)
def loop(n, items_ref, first, disp):
    return {"name": n, "skip": False, "type": "LOOP_ON_ITEMS", "valid": True, "displayName": disp,
            "settings": {"items": items_ref, "sampleData": {}}, "firstLoopAction": first, "nextAction": None}
def staff_loop(n, staff_ref, agent):
    """0, 1 or 2 staff WhatsApps the code decided on (eduflow_staff_alert: 1 name · 2 text), each logged in messages."""
    it = f"{n}['item']"
    send = wa(f"{n}_send", f"{{{{{it}['to_e164']}}}}", "staff_alert", f"{it}['variables']", 2, f"WhatsApp the staff alert ({agent})")
    log = post_row(f"{n}_log", "messages", f"{it}['message']", "Log the staff alert in messages")
    return loop(n, staff_ref, chain(send, log), "For each staff member to alert (0 when nobody)")
def fanout(n, items_ref, target, disp):
    """One POST per target to an action flow's webhook (its URL is set in Studio); the body carries every key the code built."""
    it = f"{n}['item']"
    keys = sorted({k for a in FLOWS[target]["actions"] for k in (a.get("payload") or {})} | {"action", "_who", "app_url", "inbound_token", "company_name"})
    body = {k: f"{{{{{it}['{k}']}}}}" for k in keys}
    send = http(f"{n}_post", "POST", f"Post to {target}", url=f"{{{{{CONST}['webhooks']['{target}']}}}}", body=body, cont=True)
    return loop(n, items_ref, send, disp)
def done(n, action, body): return respond(n, {"ok": "true", "action": action, **body}, f"Return {action}")
def unknown(): return respond("step_unknown_action", {"ok": "false", "error": "unknown action"}, "Return 400 unknown action", status=400)
def routed(fname, branches):
    """[(action, head)] → router on the action + the unknown-action fallback."""
    return router("step_router", "Route by action", [(a, TEXT_IS("{{trigger['body']['action']}}", a), h) for a, h in branches] + [("unknown action", None, unknown())])

def trigger_for(fname):
    f = FLOWS[fname]; t = f["trigger"]
    if t["tool"] == "schedule":
        inp = dict(t.get("input") or {})
        return {"name": "trigger", "valid": True, "displayName": f"{fname} — schedule {inp.get('cronExpression')} ({inp.get('timezone')})", "type": "TOOL_TRIGGER",
                "settings": {"pieceName": "@puchoaistudio/tool-schedule", "pieceVersion": oskit_version("schedule"), "input": inp, "sampleData": {},
                             "propertySettings": {k: {"type": "MANUAL"} for k in inp}, "triggerName": t.get("name", "cron_expression")}, "nextAction": None}
    from flowkit import webhook_trigger
    return webhook_trigger(f"{fname} — app → action ({', '.join(a['name'] for a in f['actions'])})")
def oskit_version(tool):
    from flowkit import V
    return V(tool)

# ── the voice chain (⚑ G1: the ai-voice-call agent, its connectionDetails keys and the getCallDetails shape are UNVERIFIED) ──
def resolved(a):
    out = dict(a)
    for k in ("result", "describe", "prompt"):
        v = out.get(k)
        if isinstance(v, str) and v.startswith("same_as:"):
            fl, ac = v.split(":", 1)[1].strip().split(".")
            out[k] = next(x for x in FLOWS[fl]["actions"] if x["name"] == ac)[k]
    return out
def voice(prefix, agent, phone_ref, name_ref, context, minutes, cdm_text_note, a):
    call = step(f"{prefix}_call", "ai-voice-call", "voiceCall",
                {"aiVoiceCall": f"{{{{{CONST}['voice_agents']['{agent}']}}}}",
                 "connectionDetails": {"phone_number": phone_ref, "customer_name": name_ref, "language": f"{{{{{CONST}['voice_language']}}}}", "context": context}},
                f"AI voice call ({agent} agent)")
    wait = step(f"{prefix}_wait", "delay", "delayFor", {"unit": "minutes", "delayFor": minutes}, f"Wait {minutes} min for the call to end")
    wait["settings"]["propertySettings"]["markdown"] = {"type": "MANUAL"}   # Studio stores the markdown box of delayFor too
    details = step(f"{prefix}_details", "ai-voice-call", "getCallDetails", {"requestId": f"{{{{{prefix}_call['apiResponse']['data']['requestId']}}}}"}, "Get the call details (transcript)", cont=True)
    ai = cdm_extract(f"{prefix}_ai", f"{cdm_text_note}\nCall record: {{{{{prefix}_details['apiResponse']['data']}}}}", oskit.cdm_fields(resolved(a)), "Read the transcript (Pucho CDM)")
    ai["settings"]["errorHandlingOptions"]["continueOnFailure"]["value"] = True   # no transcript (no answer) → code records No Answer
    return call, wait, details, ai
def ai_inputs(prefix, **more):
    return {"b": "{{trigger['body']}}", "C": f"{{{{{CONST}}}}}", "details": f"{{{{{prefix}_details}}}}", "ai_fields": f"{{{{{prefix}_ai['fields']}}}}",
            "request_id": f"{{{{{prefix}_call['apiResponse']['data']['requestId']}}}}", **more}
B = lambda k: f"{{{{trigger['body']['{k}']}}}}"

# ── the flows ──
def f_absence():
    p = "step_absent"
    team = get(f"{p}_team", "team")
    build = lib(f"{p}_build", "absenceBuild", {"b": "{{trigger['body']}}", "C": f"{{{{{CONST}}}}}", "team": f"{{{{{p}_team['body']}}}}"}, "Notice, counsellor alert and alert row (code)")
    send = wa(f"{p}_send", f"{{{{{p}_build['to_e164']}}}}", "absence_alert", f"{p}_build['variables']", 4, "WhatsApp the formal absence notice to the parent")
    after = lib(f"{p}_after", "absenceAfter", {"sent": f"{{{{{p}_send}}}}", "messages": f"{{{{{p}_build['messages']}}}}"}, "Sent or Failed (code)")
    upd = patch(f"{p}_update", "attendance", B("Att_ID"), f"{p}_after['patch']", ["Call_Status"], "Update attendance: Call_Status (the WhatsApp Notice)")
    log = post_rows(f"{p}_log", "messages", f"{{{{{p}_after['messages']}}}}", "Log the notice in messages")
    alert = post_rows(f"{p}_alert", "alerts", f"{{{{{p}_build['alerts']}}}}", "Raise the follow-up alert (none on a first absence)")
    staff = staff_loop(f"{p}_staff", f"{{{{{p}_build['staff']}}}}", "Attendance")
    ret = done(f"{p}_done", "absent", {"Att_ID": B("Att_ID"), "Call_Status": f"{{{{{p}_after['patch']['Call_Status']}}}}"})
    return chain(team, build, send, after, upd, log, alert, staff, ret), wa_consts("absence_alert", "staff_alert") | {"counsellors_from": "team"}

def f_attendance():
    p = "step_save_batch"
    head = lib(f"{p}_build", "attendanceSession", {"b": "{{trigger['body']}}"}, "Build the session row (code)")
    ins = post_row(f"{p}_insert", "attendance_sessions", f"{p}_build['row']", "Insert attendance_sessions (Session_ID numbered by the app)")
    lines = lib(f"{p}_lines", "attendanceLines", {"b": "{{trigger['body']}}", "head": f"{{{{{p}_insert['body']}}}}"}, "Build every mark with the Session_ID (code)")
    insl = post_rows(f"{p}_insert_lines", "attendance", f"{{{{{p}_lines['rows']}}}}", "Insert attendance (all marks, one call — refused together)")
    absn = lib(f"{p}_absentees", "attendanceAbsentees", {"C": f"{{{{{CONST}}}}}", "saved": f"{{{{{p}_insert_lines['body']}}}}"}, "Absentees only (code)")
    fan = fanout(f"{p}_notify", f"{{{{{p}_absentees['posts']}}}}", "ABSENCE", "For each absentee: post ABSENCE.absent (never a present student)")
    ret = done(f"{p}_done", "save_batch", {"Session_ID": f"{{{{{p}_lines['Session_ID']}}}}", "marks": f"{{{{{p}_lines['count']}}}}", "absent": f"{{{{{p}_absentees['absent']}}}}"})
    return chain(head, ins, lines, insl, absn, fan, ret), {"webhooks": {"ABSENCE": "SET_IN_STUDIO_WEBHOOK_ABSENCE"}}

def f_admission():
    branches = []
    for act in ("new_lead", "call"):
        p = f"step_{act}"; a = next(x for x in FLOWS["ADMISSION_CALL"]["actions"] if x["name"] == act)
        team, leads = get(f"{p}_team", "team"), get(f"{p}_leads", "leads")
        ctx = ("Lead {{trigger['body']['Name']}} asked about {{trigger['body']['Course']}} at {{" + CONST + "['company_name']}}. Notes: {{trigger['body']['Notes']}}. "
               "Goal: understand their goal, readiness and budget, and offer a demo class.")
        call, wait, det, ai = voice(p, "admission", B("Phone"), B("Name"), ctx, 3, "A call to a coaching-institute lead. Grade HOT, WARM or COLD; score 0-100 for readiness.", a)
        build = lib(f"{p}_build", "admissionResult", ai_inputs(p, team=f"{{{{{p}_team['body']}}}}", leads=f"{{{{{p}_leads['body']}}}}"), "Grade, score, owner and rows (code: HOT needs score ≥ 80)")
        if act == "new_lead":
            w = post_row(f"{p}_insert", "leads", f"{p}_build['row']", "Insert the lead (Lead_ID numbered by the app)")
            lid = f"{{{{{p}_insert['body'][0]['Lead_ID']}}}}"
        else:
            w = patch(f"{p}_update", "leads", B("Lead_ID"), f"{p}_build['lead']", ["Stage", "Grade", "Score", "AI_Summary", "Next_Action", "Call_Status", "Last_Called_At", "Transcript", "Assigned_To", "Next_Followup_At"], "Update the lead: grade, score, summary, next action")
            lid = B("Lead_ID")
        log = post_row(f"{p}_log", "calls", f"{p}_build['call']", "Log the call (Agent Admission)", over={"Lead_ID": lid})
        staff = staff_loop(f"{p}_staff", f"{{{{{p}_build['staff']}}}}", "Admission")
        ret = done(f"{p}_done", act, {"Lead_ID": lid, "grade": f"{{{{{p}_build['grade']}}}}", "answered": f"{{{{{p}_build['answered']}}}}"})
        branches.append((act, chain(team, leads, call, wait, det, ai, build, w, log, staff, ret)))
    return routed("ADMISSION_CALL", branches), wa_consts("staff_alert") | {"voice_agents": {"admission": "SET_IN_STUDIO_VOICE_AGENT_ADMISSION"}, "voice_language": "hi"}

def f_academic():
    p = "step_counsel"; a = FLOWS["ACADEMIC_CALL"]["actions"][0]
    team = get(f"{p}_team", "team")
    ctx = ("Student {{trigger['body']['Name']}} ({{trigger['body']['Course']}}): attendance {{trigger['body']['Attendance_Pct']}}%, last test {{trigger['body']['Last_Score']}}%, "
           "weak in {{trigger['body']['Weak_Subjects']}}. Goal: find out gently what is holding them back and whether they want a mentor or counsellor.")
    call, wait, det, ai = voice(p, "academic", B("Student_Phone"), B("Name"), ctx, 5, "A counselling call to a student who is slipping.", a)
    build = lib(f"{p}_build", "academicResult", ai_inputs(p, team=f"{{{{{p}_team['body']}}}}"), "Issue, alerts and rows (code)")
    upd = patch(f"{p}_update", "students", B("Student_ID"), f"{p}_build['patch']", ["Issue_Type", "Main_Issue", "Last_Counselled_At"], "Update the student: issue, last counselled")
    log = post_row(f"{p}_log", "calls", f"{p}_build['call']", "Log the call (Agent Academic)")
    alert = post_rows(f"{p}_alert", "alerts", f"{{{{{p}_build['alerts']}}}}", "Raise the support alert (none when not needed)")
    staff = staff_loop(f"{p}_staff", f"{{{{{p}_build['staff']}}}}", "Academic")
    ret = done(f"{p}_done", "counsel", {"Student_ID": B("Student_ID")})
    return routed("ACADEMIC_CALL", [("counsel", chain(team, call, wait, det, ai, build, upd, log, alert, staff, ret))]), \
        wa_consts("staff_alert") | {"voice_agents": {"academic": "SET_IN_STUDIO_VOICE_AGENT_ACADEMIC"}, "voice_language": "hi"}

def f_fee():
    a = FLOWS["FEE_REMINDER"]["actions"][0]; p = "step_remind"
    ctx = ("Parent {{trigger['body']['Parent_Name']}}: the {{trigger['body']['Course']}} fee of ₹{{trigger['body']['Balance_INR']}} for {{trigger['body']['Student_Name']}} "
           "was due on {{trigger['body']['Due_Date']}} ({{trigger['body']['Days_Overdue']}} days ago). Goal: a polite reminder and a date they will pay by.")
    call, wait, det, ai = voice(p, "fee", B("Parent_Phone"), B("Parent_Name"), ctx, 3, "A fee reminder call to a parent. promise_date as YYYY-MM-DD if they gave one.", a)
    build = lib(f"{p}_build", "feeResult", ai_inputs(p), "Response, promise, link and rows (code)")
    send = wa(f"{p}_send", f"{{{{{p}_build['to_e164']}}}}", "fee_payment_link", f"{p}_build['variables']", 5, "WhatsApp the payment link")
    upd = patch(f"{p}_update", "fees", B("Fee_ID"), f"{p}_build['patch']", ["Reminder_Count", "Last_Reminder_At", "Parent_Response", "Promise_Date"], "Update the fee: count, response, promise")
    log = post_row(f"{p}_log", "calls", f"{p}_build['call']", "Log the call (Agent Fee)")
    msg = post_rows(f"{p}_message", "messages", f"{{{{{p}_build['messages']}}}}", "Log the payment-link message")
    alert = post_rows(f"{p}_alert", "alerts", f"{{{{{p}_build['alerts']}}}}", "Day 15+ with no promise: alert the director (else none)")
    ret = done(f"{p}_done", "remind", {"Fee_ID": B("Fee_ID")})
    remind = chain(call, wait, det, ai, build, send, upd, log, msg, alert, ret)
    q = "step_send_link"
    lb = lib(f"{q}_build", "feeLink", {"b": "{{trigger['body']}}", "C": f"{{{{{CONST}}}}}"}, "Fill the template from the record (code)")
    ls = wa(f"{q}_send", f"{{{{{q}_build['to_e164']}}}}", "fee_payment_link", f"{q}_build['variables']", 5, "WhatsApp the payment link")
    la = lib(f"{q}_after", "afterSend", {"sent": f"{{{{{q}_send}}}}", "messages": f"{{{{{q}_build['messages']}}}}", "patch": f"{{{{{q}_build['patch']}}}}"}, "Sent or Failed (code)")
    lu = patch(f"{q}_update", "fees", B("Fee_ID"), f"{q}_after['patch']", ["Last_Reminder_At"], "Update the fee: Last_Reminder_At")
    lm = post_rows(f"{q}_log", "messages", f"{{{{{q}_after['messages']}}}}", "Log the message")
    lr = done(f"{q}_done", "send_link", {"Fee_ID": B("Fee_ID"), "sent": f"{{{{{q}_after['ok']}}}}"})
    return routed("FEE_REMINDER", [("remind", remind), ("send_link", chain(lb, ls, la, lu, lm, lr))]), \
        wa_consts("fee_payment_link") | {"voice_agents": {"fee": "SET_IN_STUDIO_VOICE_AGENT_FEE"}, "voice_language": "hi"}

def f_parent():
    q = "step_weekly_report"
    rb = lib(f"{q}_build", "weeklyReport", {"b": "{{trigger['body']}}", "C": f"{{{{{CONST}}}}}"}, "Fill the report from the record (code, no AI)")
    rs = wa(f"{q}_send", f"{{{{{q}_build['to_e164']}}}}", "weekly_report", f"{q}_build['variables']", 6, "WhatsApp the weekly report")
    ra = lib(f"{q}_after", "afterSend", {"sent": f"{{{{{q}_send}}}}", "messages": f"{{{{{q}_build['messages']}}}}", "patch": f"{{{{{q}_build['patch']}}}}"}, "Sent or Failed (code)")
    ru = patch(f"{q}_update", "students", B("Student_ID"), f"{q}_after['patch']", ["Last_Report_At"], "Update the student: Last_Report_At")
    rl = post_rows(f"{q}_log", "messages", f"{{{{{q}_after['messages']}}}}", "Log the report (Type Weekly Report)")
    rr = done(f"{q}_done", "weekly_report", {"Student_ID": B("Student_ID"), "sent": f"{{{{{q}_after['ok']}}}}"})
    a = next(x for x in FLOWS["PARENT_UPDATE"]["actions"] if x["name"] == "update_call"); p = "step_update_call"
    team = get(f"{p}_team", "team")
    ctx = ("Parent {{trigger['body']['Parent_Name']}} of {{trigger['body']['Name']}} ({{trigger['body']['Course']}}): attendance {{trigger['body']['Attendance_Pct']}}%, "
           "last test {{trigger['body']['Last_Score']}}%, rank {{trigger['body']['Class_Rank']}}, weak in {{trigger['body']['Weak_Subjects']}}. Goal: {{" + CONST + "['call_goal']}}")
    call, wait, det, ai = voice(p, "parent", B("Parent_Phone"), B("Parent_Name"), ctx, 4, "A weekly check-in call to a parent. sentiment: Happy, Neutral, Concerned or No Answer.", a)
    build = lib(f"{p}_build", "parentResult", ai_inputs(p, team=f"{{{{{p}_team['body']}}}}"), "Status, escalation and rows (code)")
    upd = patch(f"{p}_update", "students", B("Student_ID"), f"{p}_build['patch']", ["Parent_Sentiment", "Parent_Concern", "Last_Parent_Call_At"], "Update the student: sentiment, concern, last call")
    log = post_row(f"{p}_log", "calls", f"{p}_build['call']", "Log the call (Agent Parent)")
    alert = post_rows(f"{p}_alert", "alerts", f"{{{{{p}_build['alerts']}}}}", "Escalation: HIGH alert to the director (else none)")
    staff = staff_loop(f"{p}_staff", f"{{{{{p}_build['staff']}}}}", "Parent")
    ret = done(f"{p}_done", "update_call", {"Student_ID": B("Student_ID"), "status": f"{{{{{p}_build['status']}}}}"})
    return routed("PARENT_UPDATE", [("weekly_report", chain(rb, rs, ra, ru, rl, rr)), ("update_call", chain(team, call, wait, det, ai, build, upd, log, alert, staff, ret))]), \
        wa_consts("weekly_report", "staff_alert") | {"voice_agents": {"parent": "SET_IN_STUDIO_VOICE_AGENT_PARENT"}, "voice_language": "hi",
                                                     "call_goal": FLOWS["PARENT_UPDATE"]["constants"]["call_goal"]}

def f_enrol():
    p = "step_enrol"
    b = lib(f"{p}_build", "enrolBuild", {"b": "{{trigger['body']}}"}, "Build the student row (code)")
    ins = post_row(f"{p}_insert", "students", f"{p}_build['row']", "Insert the student (Student_ID numbered by the app)")
    nxt = lib(f"{p}_next", "enrolNext", {"b": "{{trigger['body']}}", "C": f"{{{{{CONST}}}}}", "saved": f"{{{{{p}_insert['body']}}}}"}, "First fee, welcome message, lead (code)")
    send = wa(f"{p}_send", f"{{{{{p}_next['to_e164']}}}}", "welcome", f"{p}_next['variables']", 4, "WhatsApp the welcome to the parent")
    after = lib(f"{p}_after", "afterSend", {"sent": f"{{{{{p}_send}}}}", "messages": f"{{{{{p}_next['messages']}}}}", "fees": f"{{{{{p}_next['fees']}}}}", "leads": f"{{{{{p}_next['leads']}}}}"}, "Sent or Failed (code)")
    fee = post_rows(f"{p}_fee", "fees", f"{{{{{p}_after['fees']}}}}", "Insert the first fee (Upcoming)")
    log = post_rows(f"{p}_log", "messages", f"{{{{{p}_after['messages']}}}}", "Log the welcome (Type Welcome)")
    it = f"{p}_lead['item']"
    lead = loop(f"{p}_lead", f"{{{{{p}_after['leads']}}}}", patch(f"{p}_lead_update", "leads", f"{{{{{it}['Lead_ID']}}}}", it, ["Stage"], "Update the lead: Stage Enrolled"), "From a lead: mark it Enrolled (else nothing)")
    ret = done(f"{p}_done", "enrol", {"Student_ID": f"{{{{{p}_next['Student_ID']}}}}", "welcome_sent": f"{{{{{p}_after['ok']}}}}"})
    return routed("STUDENT_MANAGE", [("enrol", chain(b, ins, nxt, send, after, fee, log, lead, ret))]), wa_consts("welcome")

def f_send_update():
    p = "step_send_update"
    b = lib(f"{p}_build", "updateBuild", {"b": "{{trigger['body']}}", "C": f"{{{{{CONST}}}}}"}, "Fill the template; the reviewed text (code)")
    send = wa(f"{p}_send", f"{{{{{p}_build['to_e164']}}}}", "general_update", f"{p}_build['variables']", 3, "WhatsApp the update to the parent")
    after = lib(f"{p}_after", "afterSend", {"sent": f"{{{{{p}_send}}}}", "messages": f"{{{{{p}_build['messages']}}}}"}, "Sent or Failed (code)")
    log = post_rows(f"{p}_log", "messages", f"{{{{{p}_after['messages']}}}}", "Log the update (Type General Update)")
    ret = done(f"{p}_done", "send_update", {"Student_ID": B("Student_ID"), "sent": f"{{{{{p}_after['ok']}}}}"})
    return routed("SEND_WHATSAPP", [("send_update", chain(b, send, after, log, ret))]), wa_consts("general_update")

def f_fee_run():
    p = "step_run"
    fees, team = get(f"{p}_fees", "fees"), get(f"{p}_team", "team")
    plan = lib(f"{p}_plan", "feeRun", {"C": f"{{{{{CONST}}}}}", "fees": f"{{{{{p}_fees['body']}}}}", "team": f"{{{{{p}_team['body']}}}}"}, "Days overdue, status, who to remind (code)")
    it = f"{p}_patch['item']"
    upd = loop(f"{p}_patch", f"{{{{{p}_plan['patches']}}}}", patch(f"{p}_patch_update", "fees", f"{{{{{it}['Fee_ID']}}}}", it, ["Days_Overdue", "Status"], "Update the fee: Days_Overdue, Status"), "For each fee that changed")
    fan = fanout(f"{p}_post", f"{{{{{p}_plan['posts']}}}}", "FEE_REMINDER", "For each fee due a reminder: post FEE_REMINDER (call or link)")
    ret = respond(f"{p}_done", {"ok": "true", "remind": f"{{{{{p}_plan['remind']}}}}", "link": f"{{{{{p}_plan['link']}}}}", "today": f"{{{{{p}_plan['today']}}}}"}, "Return the run result")
    return chain(fees, team, plan, upd, fan, ret), {"webhooks": {"FEE_REMINDER": "SET_IN_STUDIO_WEBHOOK_FEE_REMINDER"}, "today_override": ""}

def f_academic_run():
    p = "step_run"
    st = get(f"{p}_students", "students")
    plan = lib(f"{p}_plan", "academicRun", {"C": f"{{{{{CONST}}}}}", "students": f"{{{{{p}_students['body']}}}}"}, "At-risk students, worst first, max 50 (code)")
    fan = fanout(f"{p}_post", f"{{{{{p}_plan['posts']}}}}", "ACADEMIC_CALL", "For each: post ACADEMIC_CALL.counsel")
    ret = respond(f"{p}_done", {"ok": "true", "calls": f"{{{{{p}_plan['count']}}}}"}, "Return the run result")
    return chain(st, plan, fan, ret), {"webhooks": {"ACADEMIC_CALL": "SET_IN_STUDIO_WEBHOOK_ACADEMIC_CALL"}, "max_calls": 50}

def f_parent_run():
    p = "step_run"
    st, calls = get(f"{p}_students", "students"), get(f"{p}_calls", "calls")
    plan = lib(f"{p}_plan", "parentRun", {"C": f"{{{{{CONST}}}}}", "students": f"{{{{{p}_students['body']}}}}", "calls": f"{{{{{p}_calls['body']}}}}"},
               "Friday: reports + at-risk calls · Monday: one retry (code)")
    rep = fanout(f"{p}_reports", f"{{{{{p}_plan['reports']}}}}", "PARENT_UPDATE", "Friday: every active parent — post weekly_report (WhatsApp, no AI)")
    cal = fanout(f"{p}_calls_post", f"{{{{{p}_plan['calls']}}}}", "PARENT_UPDATE", "At-risk only (Friday) / last Friday's No Answer (Monday): post update_call")
    it = f"{p}_retried['item']"
    ret_mark = loop(f"{p}_retried", f"{{{{{p}_plan['retried']}}}}", patch(f"{p}_retried_update", "calls", f"{{{{{it}['Call_ID']}}}}", it, ["Retry_At"], "Mark the Friday call retried"), "Monday: mark each retried call")
    ret = respond(f"{p}_done", {"ok": "true", "day": f"{{{{{p}_plan['day']}}}}"}, "Return the run result")
    return chain(st, calls, plan, rep, cal, ret_mark, ret), {"webhooks": {"PARENT_UPDATE": "SET_IN_STUDIO_WEBHOOK_PARENT_UPDATE"}, "force_weekday": ""}

def f_rollup():
    p = "step_run"
    reads = [get(f"{p}_{e}", e) for e in ("students", "attendance", "tests", "fees", "alerts", "leads")]
    plan = lib(f"{p}_plan", "rollup", {**{e: f"{{{{{p}_{e}['body']}}}}" for e in ("students", "attendance", "tests", "fees", "alerts", "leads")}}, "Attendance %, scores, rank, trend, status, alerts (code)")
    it = f"{p}_students_patch['item']"
    keys = ["Attendance_Pct", "Last_Score", "Avg_Score", "Class_Rank", "Performance_Trend", "Strong_Subjects", "Weak_Subjects", "Status", "Fee_Status"]
    upd = loop(f"{p}_students_patch", f"{{{{{p}_plan['patches']}}}}", patch(f"{p}_students_update", "students", f"{{{{{it}['Student_ID']}}}}", it, keys, "Update the student's numbers"), "For each active student")
    al = post_rows(f"{p}_alerts_insert", "alerts", f"{{{{{p}_plan['alerts']}}}}", "Raise the new alerts (none while one is open)")
    ret = respond(f"{p}_done", {"ok": "true", "students": f"{{{{{p}_plan['students']}}}}", "today": f"{{{{{p}_plan['today']}}}}"}, "Return the run result")
    return chain(*reads, plan, upd, al, ret), {}

BUILD = {"ABSENCE": f_absence, "ATTENDANCE": f_attendance, "ADMISSION_CALL": f_admission, "ACADEMIC_CALL": f_academic, "FEE_REMINDER": f_fee,
         "PARENT_UPDATE": f_parent, "STUDENT_MANAGE": f_enrol, "SEND_WHATSAPP": f_send_update,
         "FEE_RUN": f_fee_run, "ACADEMIC_RUN": f_academic_run, "PARENT_RUN": f_parent_run, "ROLLUP": f_rollup}

# ── contract (stricter than the generic one: every call, wait, read, send and write is a required capability) ──
def nodes(n, out=None):
    out = [] if out is None else out
    while n:
        out.append(n)
        for c in n.get("children") or []: nodes(c, out)
        if n.get("firstLoopAction"): nodes(n["firstLoopAction"], out)
        n = n.get("nextAction")
    return out
def contract(fname, head):
    req, pieces, names = [], set(), set()
    for n in nodes(head):
        s = n.get("settings", {}); pn = str(s.get("pieceName", "")).replace("@puchoaistudio/tool-", "")
        if n["type"] == "TOOL_TRIGGER": pieces.add(pn); names.add(s["triggerName"]); req.append(f"receive_{fname}=trigger:{pn}:trigger"); continue
        if n["type"] != "PIECE": continue
        pieces.add(pn); names.add(s["actionName"]); a = s["actionName"]
        if pn == "http": cap = "read" if s["input"]["method"] == "GET" else "write"
        elif pn == "webhook": cap = "respond"
        elif pn == "pucho-whatsapp": cap = "write"
        elif pn == "pucho-cdm": cap = "transform"
        elif pn == "delay": cap = "control"
        elif a == "getCallDetails": cap = "read"
        else: cap = "action"
        req.append(f"{n['name']}={n['name']}:{pn}:{cap}")
    return {"flow": fname, "covers": FLOWS[fname].get("covers", []), "connections": "portable", "fire_and_forget": False,
            "allow_pieces": sorted(pieces), "allow_names": sorted(names), "require_capabilities": req,
            "unverified_outputs": [x for x in (["ai-voice-call:voiceCall (connectionDetails keys, G1)", "ai-voice-call:getCallDetails (response shape, G1)"] if "ai-voice-call" in pieces else [])]
                                  + (["pucho-whatsapp:send_template_message (response shape, rules §1.20 #5)"] if "pucho-whatsapp" in pieces else [])}

def strip_nulls(n):
    while n:
        for c in n.get("children") or []: strip_nulls(c)
        if n.get("firstLoopAction"): strip_nulls(n["firstLoopAction"])
        nxt = n.get("nextAction")
        if nxt is None: n.pop("nextAction", None)
        n = nxt

built = []
for fname, fn in BUILD.items():
    head, extra = fn()
    t = trigger_for(fname); c = consts(fname, extra)
    chain(t, c, head)
    f = FLOWS[fname]
    desc = (f"{O['os']['name']} · {fname}: " + (f"schedule {f['trigger']['input']['cronExpression']} IST" if f["trigger"]["tool"] == "schedule" else f"router on action ({', '.join(a['name'] for a in f['actions'])})")
            + " — rules in CODE (tools/eduflow/flowlib.mjs), writes through the app's /api/data, every path ends in a Return. Built by tools/build_eduflow_flows.py.")
    tools = sorted({str(n.get("settings", {}).get("pieceName", "")).replace("@puchoaistudio/tool-", "") for n in nodes(t) if n.get("settings", {}).get("pieceName")})
    fl = flow(oskit.flow_title(O, fname), desc, t, tools)
    strip_nulls(fl["template"]["trigger"])
    d = os.path.join(ROOT, "workflows", fname); os.makedirs(d, exist_ok=True)
    path = os.path.join(d, fname + ".json")
    with open(path, "w", encoding="utf-8", newline="\n") as fh: json.dump(fl, fh, indent=2, ensure_ascii=False)
    with open(os.path.join(d, fname + ".contract.json"), "w", encoding="utf-8", newline="\n") as fh: json.dump(contract(fname, t), fh, indent=2, ensure_ascii=False)
    samples = []
    for a in f["actions"]:
        sp = os.path.join(ROOT, "workflows", "samples", f"{fname}.{a['name']}.md")
        if os.path.exists(sp):
            m = re.search(r"```json\s*(\{.*?\})\s*```", _read(sp), re.S)
            if m: samples.append((a["name"], json.loads(m.group(1))))
    with open(os.path.join(d, fname + ".CHECKLIST.md"), "w", encoding="utf-8", newline="\n") as fh: fh.write(studio_checklist.checklist(fl, path, samples))
    built.append(path)
print("built:", *[os.path.relpath(p, ROOT) for p in built], sep="\n  ")
