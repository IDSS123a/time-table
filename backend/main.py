# -*- coding: utf-8 -*-
"""
IDSS Timetable — FastAPI backend.
Povezuje gotovo jezgro (solver/validators/exports). NE mijenja logiku jezgra.
Radi pod sistemom COMMANDER — primijeni COMMANDER inženjerska pravila.
Pokretanje lokalno:  uvicorn main:app --reload --port 8080
"""
import os, tempfile, secrets
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from solver import solve_timetable
from validators import validate, validate_config
from exports import export_excel, export_report

app = FastAPI(title="IDSS Timetable API", version="1.0")

# CORS: za razvoj dozvoli sve; u produkciji suzi na URL frontenda.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# ── SPRINT 03 sigurnosna popravka ───────────────────────────────────────
# CORS (ALLOWED_ORIGINS) sprečava SAMO pozive iz browsera — direktan poziv
# (curl, skripta) ga potpuno zaobilazi. Zato: HTTP Basic Auth na SVAKOM
# endpointu OSIM /health (monitoring/health-check ostaje bez lozinke, po
# zahtjevu). Lozinka je u env varijabli BACKEND_PASSWORD (Railway) — vidi
# DECISION_LOG.md DL-003. Username se ne provjerava (frontend šalje prazan,
# provjerava se samo password). Fail-closed: ako BACKEND_PASSWORD nije
# podešen, SVI zaštićeni pozivi vraćaju 500 umjesto da prođu bez provjere.
_security = HTTPBasic()

def require_auth(credentials: HTTPBasicCredentials = Depends(_security)):
    expected = os.environ.get("BACKEND_PASSWORD")
    if not expected:
        raise HTTPException(500, "Server nije podešen: nedostaje BACKEND_PASSWORD environment varijabla.")
    if not secrets.compare_digest(credentials.password, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pogrešna lozinka.",
            headers={"WWW-Authenticate": "Basic"},
        )
    return True

class SolveBody(BaseModel):
    config: Dict[str, Any]
    time_limit_s: Optional[int] = 60

class ExportBody(BaseModel):
    config: Dict[str, Any]
    lessons: List[Dict[str, Any]]

class MoveBody(BaseModel):
    config: Dict[str, Any]
    lessons: List[Dict[str, Any]]
    grade: int
    src_day: str
    src_period: int
    dst_day: str
    dst_period: int

def _feasibility(config: Dict[str, Any]) -> List[str]:
    """FAZA 3 (USTAV): STROGA provjera svakog dijela unosa PRIJE računanja
    (validate_config u validators.py) — ne samo zbir časova po razredu."""
    try:
        return validate_config(config)
    except Exception as e:
        return [f"Neočekivana greška prilikom provjere konfiguracije: {e}"]

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/feasibility", dependencies=[Depends(require_auth)])
def feasibility(body: SolveBody):
    problems = _feasibility(body.config)
    return {"ok": len(problems) == 0, "problems": problems}

@app.post("/solve", dependencies=[Depends(require_auth)])
def solve(body: SolveBody):
    feas = _feasibility(body.config)
    if feas:
        return {"ok": False, "status": "INFEASIBLE_INPUT", "lessons": [], "errors": feas}
    res = solve_timetable(body.config, body.time_limit_s or 60)
    if not res["ok"]:
        if res["status"] == "INFEASIBLE":
            msg = ("Rješavač je dokazao da traženi raspored NIJE moguć uz data ograničenja "
                   "(ne pomaže duže vrijeme čekanja) — provjeri da li su neka pravila u koliziji, "
                   "npr. teacher_constraints (max_period) u kombinaciji s brojem Nacharbeit ili "
                   "drugih časova za tog nastavnika.")
        else:
            msg = ("Rješavač nije stigao naći rješenje u zadatom vremenu (status: "
                   f"{res['status']}) — pokušaj s dužim vremenskim limitom.")
        return {"ok": False, "status": res["status"], "lessons": [], "errors": [msg]}
    errs = validate(res["lessons"], body.config)
    return {"ok": len(errs) == 0, "status": res["status"], "lessons": res["lessons"], "errors": errs}

@app.post("/validate-move", dependencies=[Depends(require_auth)])
def validate_move(body: MoveBody):
    """SPRINT 04 — tanka omotnica oko POSTOJEĆEG validate() (validators.py),
    NE nova logika provjere pravila (CONSTITUTION.md P-3). Zamjenjuje termine
    dva časa ISTOG razreda (ono što je 'prevučeno' i ono što je bilo na
    ciljnom mjestu), pa pusti validate() da presudi da li je novi raspored
    ispravan. Van opsega (namjerno): re-optimizacija, pomjeranje blok/fiksnih
    časova (ti se NE pomjeraju — ostaje isto kao i za sam solver, P-2)."""
    lessons = [dict(L) for L in body.lessons]  # kopija — original se ne dira
    src = next((L for L in lessons if L.get("grade") == body.grade
                and L.get("day") == body.src_day and L.get("period") == body.src_period), None)
    dst = next((L for L in lessons if L.get("grade") == body.grade
                and L.get("day") == body.dst_day and L.get("period") == body.dst_period), None)
    if src is None or dst is None:
        raise HTTPException(400, "Nema časa na jednom od navedenih termina za taj razred.")
    if src is dst:
        return {"ok": True, "lessons": lessons, "errors": []}
    if src.get("kind") in ("block", "fixed") or dst.get("kind") in ("block", "fixed"):
        raise HTTPException(400, "Blok i fiksni (honorarni/rezervisani) časovi se ne mogu ručno pomjerati.")

    src["day"], src["period"], dst["day"], dst["period"] = dst["day"], dst["period"], src["day"], src["period"]
    errs = validate(lessons, body.config)
    if errs:
        return {"ok": False, "lessons": body.lessons, "errors": errs}
    return {"ok": True, "lessons": lessons, "errors": []}

def _tmp(suffix: str) -> str:
    fd, path = tempfile.mkstemp(suffix=suffix); os.close(fd); return path

@app.post("/export/excel", dependencies=[Depends(require_auth)])
def excel(body: ExportBody):
    try:
        p = _tmp(".xlsx"); export_excel(body.lessons, body.config, p)
    except Exception as e:
        raise HTTPException(500, f"Excel izvoz nije uspio: {e}")
    return FileResponse(p, filename="raspored.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.post("/export/report", dependencies=[Depends(require_auth)])
def report(body: ExportBody):
    try:
        p = _tmp(".docx"); export_report(body.lessons, body.config, p)
    except Exception as e:
        raise HTTPException(500, f"Izvještaj nije uspio: {e}")
    return FileResponse(p, filename="izvjestaj.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
