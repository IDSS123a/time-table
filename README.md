# IDSS Timetable — paket za izgradnju web app (radi pod sistemom COMMANDER)

Predaj ovaj folder svom AI Coding Assistant-u (Gemini). **Prva poruka ACA je uvijek
COMMANDER `initial_instructions.md`**, pa tek onda ovaj paket. COMMANDER ima prvenstvo.

## Redoslijed čitanja (za ACA)
1. **USTAV_metodologija.md** — proces od ideje do rasporeda (okosnica). PRVO.
2. **config_schema.md** — model podataka (šta UI prikuplja).
3. **ACA_UPUTSTVO.md** — šta izgraditi (ima COMMANDER zaglavlje na vrhu).

## Šta je već GOTOVO i TESTIRANO (ne prepisivati)
- `backend/solver.py` — OR-Tools CP-SAT rješavač (sva pravila).
- `backend/validators.py` — provjere ispravnosti.
- `backend/exports.py` — Excel (po nastavniku + po razredu) + izvještaj (.docx).
- `backend/main.py` — FastAPI (endpointi: /health, /feasibility, /solve, /export/excel, /export/report). **Testiran.**
- `backend/Dockerfile` — za Cloud Run / Railway.
- `frontend/` — **minimalni React skelet koji se kompajlira**: učita primjer-config,
  klik „Generiši" → zove backend → prikaže obje mreže (po razredu / po nastavniku),
  izvoz Excel/izvještaj, paleta boja škole. ACA odavde gradi **wizard**.
- `idss_config.example.json` — kompletan, provjeren IDSS ulaz (test + šablon).

## Pokretanje lokalno (za provjeru)
Backend:
    cd backend
    pip install -r requirements.txt
    python -m uvicorn main:app --reload --port 8080
Frontend (drugi terminal):
    cd frontend
    cp .env.example .env        # VITE_API_URL=http://localhost:8080
    npm install
    npm run dev                 # otvori http://localhost:5173

Klik „Generiši raspored" → očekivano: obje mreže, svih 9 razreda po 35 časova, bez grešaka.

## Šta ACA još treba izgraditi (nije u skeletu)
- Wizard za unos/uređivanje `config`-a (nastavnici, predmeti, razredi, pravila, Nacharbeit)
  umjesto fiksnog primjera — prati faze iz USTAVA.
- Prikaz provjere izvodivosti (Faza 3) prije „Generiši".
- Sačuvaj/Učitaj `config` kao .json.

Paleta boja škole: #035EA1  #08ABE6  #FFCB29  #E8262C  #000000
