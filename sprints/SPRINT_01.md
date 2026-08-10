# SPRINT_01 — Pokreni i poveži postojeće, testirano jezgro

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)

---

## OPSEG (striktno — ništa van ovoga u ovom sprintu)

**U OPSEGU:**
1. Pokreni backend lokalno (`main.py` + `solver.py` + `validators.py` +
   `exports.py`) i potvrdi da `/health`, `/feasibility`, `/solve`,
   `/export/excel`, `/export/report` rade s `idss_config.example.json`.
2. Pokreni frontend skelet (`App.jsx` + `package.json` + `vite.config.js`
   + `index.html`) lokalno i poveži ga na backend (`.env` → `VITE_API_URL`).
3. Klik "Generiši raspored" u browseru mora prikazati obje mreže (po
   razredu i po nastavniku) BEZ grešaka, koristeći `idss_config.example.json`.
4. Napiši `Dockerfile` provjeru (build lokalno, ako je moguće) — ne mora
   biti deployovan na cloud u ovom sprintu, samo mora da se builda bez greške.

**VAN OPSEGA (NE dirati u ovom sprintu):**
- Wizard za unos/uređivanje config-a (dolazi u Sprint 02).
- Deployment na Cloud Run/Railway (dolazi u Sprint 03).
- Bilo kakva izmjena logike u `solver.py`, `validators.py`, `exports.py`.

## PLAN (FEATURE_LIFECYCLE Korak 2)

```
/**
 * SPRINT: 01
 * SVRHA: Dokazati da je gotovo jezgro (solver/validators/exports) ispravno
 *        povezano s backend API-jem i minimalnim frontendom, end-to-end,
 *        prije nego se gradi wizard.
 * DOTIČE: main.py (FastAPI rute), App.jsx (poziv API-ja)
 * VAN OPSEGA: wizard, deployment, izmjena solver logike
 * USTAV REF: CONSTITUTION.md P-3 (jezgro se ne prepisuje)
 */
```

## KRITERIJI PRIHVATANJA (Faza 5 — TESTIRANJE)

Sprint NIJE završen dok sve ovo nije tačno:

```
□ `uvicorn main:app --port 8080` pokreće se bez greške
□ GET /health → {"ok": true}
□ POST /feasibility s idss_config.example.json → {"ok": true, "problems": []}
□ POST /solve s idss_config.example.json → "ok": true, "errors": [], 9 razreda × 35 časova
□ npm run dev (frontend) pokreće se bez greške
□ Klik "Generiši raspored" u browseru → obje mreže se prikazuju, bez crvenih grešaka
□ Izvoz Excel i izvoz izvještaja rade (fajl se preuzima)
□ Dockerfile build bez greške — ODLOŽENO na Sprint 03 (Direktor nema Docker
  lokalno instaliran; deploy sprint će ionako zahtijevati Docker Desktop ili
  cloud build, pa se ne testira ranije bez razloga — M-10 odluka, potvrđeno
  od Direktora 2026-08).
```

## STATUS: ZAVRŠENO (2026-08)

Svih 7 obaveznih kriterija potvrđeno lično od Direktora u browseru
(http://localhost:5173/, obje mreže rade, bez grešaka). Docker build
formalno odložen na Sprint 03 — vidi napomenu iznad, ne blokira Sprint 02.

## HANDOFF NAPOMENA (piše ACA na kraju sprinta)

```
HANDOFF NOTE — Sprint 01
Completed: [šta je urađeno]
Not completed: [šta eventualno nije]
Open risks: [rizici za Sprint 02]
Technical debt: [prečice, ako ih ima]
Next sprint: Sprint 02 — Wizard za unos config-a
```
