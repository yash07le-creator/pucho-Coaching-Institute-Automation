# EduFlow — how to work in this repo

Built by **pucho-os 5.1.1** from `C:\pucho\kit` (recorded in `docs/.pucho-os.json`). On another machine, point `PUCHO_OS` at the same
version of the skill: `export PUCHO_OS=/path/to/pucho-os` — every script below refuses a repository scaffolded by a different version.

- Python: the commands below use `$PY` — whichever of `py`, `python3`, `python` this machine has (Windows often has only `py`). Set it once per
  shell — bash: `PY=$(command -v py || command -v python3 || command -v python)` · PowerShell: `$PY = (Get-Command py, python3, python -ErrorAction SilentlyContinue | Select-Object -First 1).Source`, then `& $PY …`.
- `os.yaml` is the source of truth. Never edit a generated file (`docs/.generated.json` lists them; the scaffold refuses to overwrite one that was hand-edited); change the yaml and run `$PY C:\pucho\kit/scripts/scaffold_os.py os.yaml .` (then `build_flows.py` for the flows). Custom UI lives in `app/src/custom/**` only; a kernel fix goes to the skill's `templates/app`.
- Gates: `cd app && npm run check` · `npm run build` · `$PY C:\pucho\kit/scripts/ui_check.py . [--mobile]` · `$PY C:\pucho\kit/scripts/security_scan.py . --stage <stage>` · `$PY C:\pucho\kit/scripts/handover_check.py .` before delivery. A gate that did not run is not a pass. Gate output lives in `evidence/` and is committed with the code.
- Every scaffold, flow build and gate run commits ONLY the files it wrote (`pucho-os <version> <tool>: …`; your git identity, or `pucho-os <pucho-os@localhost>` when git has none — no config is written). Your own changes are left as they are and named: commit them yourself. A dirty tree at handover means nobody knows which version is real.
- Data: PostgreSQL only (`docs/db-setup.md`). Flows write through `/api/data` with `INBOUND_TOKEN`; the app calls flows through `WEBHOOK_<FLOW>`; unset = simulated (header says so).
- Standard: `docs/fullstack-build-standard.md` §19 is the release gate; `docs/security.md` lists what is still Known-broken.
- Process: `docs/06-plan.md` (eleven steps); decisions in `docs/00-decisions.md`.
