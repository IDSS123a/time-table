# Uputstvo za AI Coding Assistant (Gemini) — izgradnja IDSS Timetable web app

> ## ⚑ POD SISTEMOM COMMANDER — pročitaj prije svega
> Ovaj paket se izvršava **pod sistemom COMMANDER** (github.com/IDSS123a/commander).
> Kao PRVU poruku dobio si COMMANDER `initial_instructions.md` — **COMMANDER je glavni**.
> Ovo uputstvo daje **projektna** pravila (ŠTA gradimo); COMMANDER daje
> **inženjerska/operativna** pravila (KAKO gradimo).
> - Ako COMMANDER pravilo i ovo uputstvo ikad budu u koliziji → **COMMANDER ima prednost**.
> - Primijeni COMMANDER inženjerska pravila (E-/M-rules) na sav kod koji pišeš:
>   validacija na granicama, bez tihih grešaka, koristi postojeće klijente/config,
>   potvrda za destruktivne radnje, konvencionalni commitovi, itd.
> - Gotovo, testirano jezgro (`solver.py`, `validators.py`, `exports.py`) se **NE prepisuje** —
>   samo se povezuje.

> Čitaj **prvo** `USTAV_metodologija.md` (proces) i `config_schema.md` (podaci).
> Ovaj fajl kaže **šta izgraditi oko gotovog jezgra**.

## 0. Najvažnije pravilo za tebe (ACA)
Rješavač je **već napisan i testiran**: `solver.py`, `validators.py`, `exports.py`.
**NE PIŠI ponovo logiku rješavača ili validacije.** Tvoj posao je da:
1. napraviš **backend** (Python/FastAPI) koji uvozi ova tri fajla i izlaže ih kao API;
2. napraviš **frontend** (React) koji vodi korisnika kroz proces iz USTAVA, gradi
   `config`, zove API i prikazuje/izvozi rezultat.

Ako nešto u jezgru treba promijeniti — **nemoj nagađati**, ostavi TODO i javi.

## 1. Arhitektura
- **Frontend**: React (Vite). Nema baze. Konfiguracija se čuva kao JSON u browseru
  (localStorage) i preko dugmadi **Izvezi/Uvezi config (.json)**.
- **Backend**: Python 3.11 + FastAPI + `ortools`, `openpyxl`, `python-docx`.
  Vrti `solver.py`. (OR-Tools NE radi u browseru → zato zaseban backend.)
- **Hosting**: backend na **Google Cloud Run** ili **Railway** (Docker); frontend na
  Vercel/Netlify. Backend URL ide u frontend `.env` (`VITE_API_URL`).

Struktura repozitorija:
```
/backend
  solver.py         # DATO — ne mijenjati logiku
  validators.py     # DATO
  exports.py        # DATO
  main.py           # TI PIŠEŠ — FastAPI
  requirements.txt  # DATO
  Dockerfile        # TI PIŠEŠ
/frontend
  (React app — TI PIŠEŠ)
config_schema.md, USTAV_metodologija.md, idss_config.example.json  # DATO
```

## 2. Backend (`backend/main.py`) — FastAPI
Napravi ove endpointe (svi primaju/vrаćaju JSON; uključi CORS za frontend):

- `POST /solve`  → body: `{config, time_limit_s?}` →
  pozovi `solve_timetable(config, time_limit_s)`, pa `validate(res["lessons"], config)`.
  Vrati `{ok, status, lessons, errors}`. **Ako `errors` nije prazan, `ok=false`.**
- `POST /export/excel` → body `{config, lessons}` → `export_excel(...)` u privremeni
  fajl → vrati fajl (StreamingResponse, `.xlsx`).
- `POST /export/report` → isto, `export_report(...)` → `.docx`.
- `GET /health` → `{ "ok": true }`.

Primjer skeleta (dopuni po potrebi):
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import tempfile, io
from solver import solve_timetable
from validators import validate
from exports import export_excel, export_report

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/solve")
def solve(body: dict):
    cfg = body["config"]; t = body.get("time_limit_s", 60)
    res = solve_timetable(cfg, t)
    errs = validate(res["lessons"], cfg) if res["ok"] else ["Rješavač nije našao rješenje"]
    return {"ok": res["ok"] and not errs, "status": res["status"], "lessons": res["lessons"], "errors": errs}

@app.post("/export/excel")
def xlsx(body: dict):
    import os
    p = tempfile.mktemp(suffix=".xlsx")
    export_excel(body["lessons"], body["config"], p)
    return StreamingResponse(open(p,"rb"),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition":"attachment; filename=raspored.xlsx"})
# /export/report analogno, .docx
```
`Dockerfile`: `python:3.11-slim`, `pip install -r requirements.txt`, `uvicorn main:app --host 0.0.0.0 --port 8080`.

## 3. Frontend (React) — vodi korisnika kroz USTAV
Napravi **wizard** koji tačno prati faze iz `USTAV_metodologija.md`:

1. **Struktura dana** (Faza 0): dani, periodi + vremena, jutarnji periodi,
   Nacharbeit periodi, broj časova po razredu.
2. **Nastavnici i predmeti**: tabela — dodaj/uredi/obriši. Za svaki predmet:
   je li „glavni-jutarnji", „blok" ili „obični". Za nastavnika: je li **honorarni
   (fiksan)** i, ako jeste, njegovi fiksni termini (dan/period/razred).
3. **Razredi i razredništva**: za koje razrede vrijedi „razrednik svaki dan".
4. **Nacharbeit plan**: po razredu — broj, nosilac(i), (info: jezik).
5. **Provjera izvodivosti (Faza 3)**: prije „Generiši" prikaži rezultat provjera
   (suma=35, jutarnji kapacitet, itd.). Dugme „Generiši" je **onemogućeno** dok
   provjere ne prođu. (Provjere možeš raditi na frontendu ili dodati backend
   endpoint `POST /feasibility`.)
6. **Generiši** → `POST /solve`. Ako `errors` → prikaži ih crveno, ne raspored.
7. **Prikaz**: dvije mreže — **po nastavniku** i **po razredu** (7×5), Nacharbeit
   istaknut. Dugmad: **Izvezi Excel**, **Izvezi izvještaj**, **Sačuvaj config**,
   **Učitaj config**.

**Zvanična paleta boja škole (koristi je dosljedno):**
- primarna/plava: `#035EA1`
- svijetloplava (akcenti): `#08ABE6`
- žuta (naglašavanje): `#FFCB29`
- crvena (greške/upozorenja): `#E8262C`
- crna (tekst): `#000000`
Pozadine mreža svijetle, zaglavlja u `#035EA1` s bijelim tekstom, Nacharbeit ćelije
blago žute/zelene, greške u `#E8262C`.

## 4. Redoslijed izgradnje (preporuka)
1. Backend: `main.py` + `Dockerfile`, lokalno testiraj `POST /solve` s
   `idss_config.example.json` → očekuj `ok: true`, prazan `errors`.
2. Frontend skelet + učitavanje `idss_config.example.json` + dugme „Generiši" koje
   zove backend i prikazuje dvije mreže.
3. Tek onda gradi wizard (unos/uređivanje umjesto fiksnog primjera).
4. Izvoz (Excel/izvještaj) i Sačuvaj/Učitaj config.
5. Paleta boja i dizajn na kraju.

## 5. Test prihvatljivosti (mora proći)
Učitaj `idss_config.example.json`, klikni „Generiši":
- backend vrati `ok: true`, `errors: []`;
- svaki razred ima 35 časova; matematika/njemački samo 1.–4.; Nacharbeit 6./7. na
  kraju; blokovi vezani; razrednici 1–4/6/7 svaki dan.
Ako bilo šta od ovoga padne — problem je u `config`-u ili wiringu, **ne** u jezgru.
