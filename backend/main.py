# -*- coding: utf-8 -*-
"""
IDSS Timetable — FastAPI backend.
Povezuje gotovo jezgro (solver/validators/exports). NE mijenja logiku jezgra.
Radi pod sistemom COMMANDER — primijeni COMMANDER inženjerska pravila.
Pokretanje lokalno:  uvicorn main:app --reload --port 8080
"""
import os, tempfile, secrets, time
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from solver import solve_timetable_best_of, _dashboard_gap_score
from validators import validate, validate_config, validate_warnings
from exports import export_excel, export_report
from storage import save_schedule, list_schedules, get_schedule, StorageNotConfigured, StorageError

# ── SPRINT 08 sigurnosni audit ──────────────────────────────────────────
# FastAPI automatski pravi /docs (Swagger UI), /redoc, /openapi.json — bez
# ikakve lozinke (nisu bili obuhvaćeni require_auth dependency-jem, koji se
# dodaje PO RUTI, ne globalno). Nalaz: bili javno dostupni, izlagali punu
# API šemu. Frontend ne treba interaktivnu dokumentaciju (zove poznate JSON
# rute direktno) — najjednostavnija i najsigurnija popravka je potpuno
# isključiti generisanje, ne dodavati auth na framework-generisane rute.
app = FastAPI(title="IDSS Timetable API", version="1.0", docs_url=None, redoc_url=None, openapi_url=None)

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

# ── SPRINT 08 sigurnosni audit: zaštita od pogađanja lozinke (brute-force) ──
# Prije ovoga: NIJE postojalo nikakvo ograničenje broja pokušaja — neko je
# mogao probati neograničen broj lozinki. In-memory brojač po IP adresi
# (baza nije potrebna za ovaj obim; Railway restart čisti brojač, prihvatljivo
# — to je RIJETKO i samo privremeno olakšava napadaču, ne otvara trajnu rupu).
# Namjerno se NE broje uspješni pokušaji (samo neuspjeli) — legitiman
# korisnik koji stalno kuca tačnu lozinku se nikad ne blokira.
_RATE_LIMIT_WINDOW_S = 300   # 5 minuta
_RATE_LIMIT_MAX_FAILS = 10   # max neuspjelih pokušaja po IP u tom prozoru
_failed_auth_attempts: Dict[str, list] = {}

def _client_ip(request: Request) -> str:
    # Railway je iza reverse proxy-ja — stvarna IP adresa klijenta je u
    # X-Forwarded-For (prvi unos), ne u request.client.host (koji bi bio
    # proxy-jeva interna adresa).
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def require_auth(request: Request, credentials: HTTPBasicCredentials = Depends(_security)):
    ip = _client_ip(request)
    now = time.time()
    recent_fails = [t for t in _failed_auth_attempts.get(ip, []) if now - t < _RATE_LIMIT_WINDOW_S]
    if len(recent_fails) >= _RATE_LIMIT_MAX_FAILS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Previše neuspjelih pokušaja prijave. Pokušaj ponovo za nekoliko minuta.",
        )
    expected = os.environ.get("BACKEND_PASSWORD")
    if not expected:
        raise HTTPException(500, "Server nije podešen: nedostaje BACKEND_PASSWORD environment varijabla.")
    if not secrets.compare_digest(credentials.password, expected):
        recent_fails.append(now)
        _failed_auth_attempts[ip] = recent_fails
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pogrešna lozinka.",
            headers={"WWW-Authenticate": "Basic"},
        )
    _failed_auth_attempts.pop(ip, None)  # uspjeh — očisti brojač za taj IP
    return True

class SolveBody(BaseModel):
    config: Dict[str, Any]
    time_limit_s: Optional[int] = 60
    # SPRINT 11: "koliko truda" izbor sa frontenda (Standardno=1/Pojačano=3/
    # Maksimalno=4). Zadano 1 = identično ponašanje kao prije ovog sprinta.
    attempts: Optional[int] = 1

class ExportBody(BaseModel):
    config: Dict[str, Any]
    lessons: List[Dict[str, Any]]

# SPRINT 12: isto tijelo kao ExportBody (config+lessons) + opciona oznaka.
class SaveScheduleBody(BaseModel):
    config: Dict[str, Any]
    lessons: List[Dict[str, Any]]
    label: Optional[str] = None

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

@app.get("/verify-auth", dependencies=[Depends(require_auth)])
def verify_auth():
    """SPRINT 09 — tanka omotnica oko POSTOJEĆEG require_auth (nema nove
    sigurnosne logike, isti standard kao /validate-move oko validate()).
    Frontend ovo zove PRIJE prikazivanja aplikacije (in-app neumorfni login
    ekran umjesto browser Basic Auth prozorčića/Vercel middleware-a) da
    provjeri da li je unesena/sačuvana lozinka tačna."""
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
    # SPRINT 11: klampuj na [1,4] bez obzira šta klijent pošalje — odbrambena
    # mjera (isti duh kao ostala validacija u main.py), sprečava da neko
    # slučajno/namjerno zatraži npr. attempts=1000 i blokira backend predugo.
    # Gornja granica NAMJERNO 4, ne 6: Railway zatvara vezu bez prenosa
    # podataka nakon 5 min (public networking specs), izmjereno 6 pokušaja =
    # 4.67 min (opasno blizu), 4 pokušaja = 3.11 min (sigurna margina) —
    # ovo NIJE samo frontend labela, mora vrijediti i za direktan API poziv.
    attempts = max(1, min(4, body.attempts or 1))
    res = solve_timetable_best_of(body.config, attempts=attempts, time_limit_s=body.time_limit_s or 60)
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
    # SPRINT 14: upozorenja su ODVOJENA od grešaka — "ok" zavisi ISKLJUČIVO
    # od errs (Direktorov zahtjev: "upozorava ali ne sprječava"). Namjerno
    # NEMA try/except ovdje — validate_warnings je čista, jednostavna funkcija
    # (isti standard poziva kao validate() iznad, koja takođe nema).
    warns = validate_warnings(res["lessons"], body.config)
    return {"ok": len(errs) == 0, "status": res["status"], "lessons": res["lessons"], "errors": errs, "warnings": warns}

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

# ── SPRINT 12: čuvanje rasporeda (Supabase, ručno, s istorijom) ─────────
# Tanka omotnica, isti standard kao /validate-move oko validate() — NE dira
# solver.py/validators.py/exports.py. Supabase veza ide ISKLJUČIVO kroz
# storage.py (server-side, service_role ključ iz Railway env varijabli),
# NIKAD direktno iz frontenda. Ako Supabase nije podešen/dostupan, ovi
# endpointi vraćaju jasnu grešku (503/502) — SVI ostali endpointi rade dalje
# potpuno nezavisno (require_auth, solve, export... ništa od toga ne zavisi
# o storage.py).
@app.post("/schedule/save", dependencies=[Depends(require_auth)])
def schedule_save(body: SaveScheduleBody):
    # gap_score se računa OVDJE, na serveru — ista formula koju best-of-N
    # (Sprint 11) već koristi za biranje najboljeg pokušaja, NE nova metrika,
    # i NE vjerujemo klijentu da sam izračuna/pošalje tačnu vrijednost.
    label = (body.label or "").strip() or datetime.now().strftime("%d.%m.%Y %H:%M")
    gap_score = _dashboard_gap_score(body.lessons)
    try:
        row = save_schedule(body.config, body.lessons, label, gap_score)
    except StorageNotConfigured as e:
        raise HTTPException(503, str(e))
    except StorageError as e:
        raise HTTPException(502, str(e))
    return {"ok": True, "id": row["id"], "label": label, "gap_score": gap_score}

@app.get("/schedule/list", dependencies=[Depends(require_auth)])
def schedule_list():
    try:
        rows = list_schedules(limit=10)
    except StorageNotConfigured as e:
        raise HTTPException(503, str(e))
    except StorageError as e:
        raise HTTPException(502, str(e))
    return {"ok": True, "items": rows}

@app.get("/schedule/{schedule_id}", dependencies=[Depends(require_auth)])
def schedule_get(schedule_id: int):
    try:
        row = get_schedule(schedule_id)
    except StorageNotConfigured as e:
        raise HTTPException(503, str(e))
    except StorageError as e:
        raise HTTPException(502, str(e))
    if row is None:
        raise HTTPException(404, "Sačuvani raspored nije pronađen.")
    return {"ok": True, "config": row["config"], "lessons": row["lessons"],
            "label": row.get("label"), "gap_score": row.get("gap_score")}
