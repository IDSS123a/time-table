# DECISION_LOG.md — Project: IDSS Timetable

## DL-001 — Backend stack: Python/FastAPI umjesto Next.js Server Actions

**Datum:** 2026-08
**Odlučio:** Direktor (Davor Mulalić), na preporuku Claude
**Kontekst:** Commander default stack je Next.js + Server Actions + Vercel
(M-16 pretpostavka). Ovaj projekat treba rješavač ograničenja
(constraint solver) za raspoređivanje časova.

**Odluka:** Koristiti Google OR-Tools CP-SAT (Python biblioteka) kao
motor za raspoređivanje, hostovan u zasebnom Python/FastAPI backendu
(Docker, Cloud Run ili Railway), umjesto pokušaja da se logika napiše
u TypeScript/Next.js.

**Razlog:**
1. OR-Tools nema podržan/pouzdan JavaScript/TypeScript ekvivalent za
   CP-SAT (constraint programming) kvalitete potrebne za ovaj problem.
2. Vercel Serverless/Edge funkcije i Supabase Edge Functions imaju
   vremenska/memorijska ograničenja neprikladna za CP-SAT pretragu.
3. Rješavač je već napisan, testiran i provjeren na stvarnim IDSS
   podacima (vidi README.md, "SVE RADI" test) — prepisivanje na drugi
   jezik bi ponovo uvelo rizik grešaka bez ikakve koristi.

**Posljedice:**
- Frontend je React + Vite (ne Next.js), jer nema potrebe za Next.js
  Server Components/Actions kad backend ionako nije u Next.js procesu.
- Deployment zahtijeva DVA hostinga (frontend + backend), ne jedan
  Vercel deployment.
- Svi budući ACA na ovom projektu MORAJU poštovati ovu odluku (M-16) —
  ne predlagati migraciju na Next.js/Server Actions bez nove odluke
  Direktora zapisane ovdje.

**Status:** Aktivno, potvrđeno.

## DL-002 — Vercel Password Protection na frontendu (produkcija)

**Datum:** 2026-08-10
**Odlučio:** Direktor (Davor Mulalić)
**Kontekst:** Sprint 03 (deployment) — app sadrži stvarne IDSS podatke o
nastavnicima (imena, raspored, opterećenje). Frontend (Vercel) i backend
(Railway) postaju dostupni s javnog interneta.

**Odluka:** Frontend MORA imati lozinku. Prvobitni plan (ugrađena Vercel
Password Protection, Project Settings → Deployment Protection) je odbačen
prilikom izvršenja — ta opcija zahtijeva Pro plan + Advanced Deployment
Protection ($150/mjesečno), što Direktor NIJE odobrio ("Rekli smo da idemo
besplatno"). Umjesto toga implementirana je **HTTP Basic Auth kroz Vercel
Edge Middleware** (`frontend/middleware.js`) — besplatna na svim planovima,
provjera se dešava na serveru prije slanja bilo kojeg fajla, lozinka je u
Vercel environment varijabli `SITE_PASSWORD` (ne u kodu/git-u). Backend
(Railway) ostaje bez lozinke — nije praktično koristan bez wizarda ispred
njega, a `ALLOWED_ORIGINS` je sužen na tačan Vercel URL (ne `*`).

**Posljedice:**
- Lozinka se unosi kroz nativni browser prozorčić (HTTP Basic Auth), ne
  kroz prilagođenu formu — jednostavnije za implementirati, jednako
  sigurno (server-side provjera), samo drugačiji izgled od Vercel-ove
  ugrađene opcije.
- Direktor mora unijeti lozinku prilikom svakog otvaranja frontend URL-a
  (i podijeliti je samo s ovlaštenim licima — ne stavljati je u README.md
  ili commit history).
- NAPOMENA (otkriveno prilikom izvršenja Sprinta 03): GitHub repo
  `IDSS123a/time-table` je JAVAN (public). `idss_config.example.json`
  (u oba `backend/` i `frontend/src/`) sadrži stvarna imena nastavnika —
  ta imena su već javno vidljiva preko GitHub-a, NEZAVISNO od Vercel
  Password Protection na frontendu. Password Protection štiti pristup
  wizardu/rasporedu, ali NE štiti podatke koji su već u javnom repou.
  Ovo je zapisano ovdje radi transparentnosti (M-4/M-10); odluka o tome
  da li repo treba postati privatan ili primjer treba anonimizirati
  ostaje na Direktoru.

**Status:** Aktivno, potvrđeno i TESTIRANO end-to-end (2026-08-10) — Direktor
je učitao config, generisao raspored i izvezao Excel na živom (Vercel+Railway)
sajtu, iza lozinke. Otvoreno pitanje: javnost repoa — vidi napomenu iznad.

## DL-003 — HTTP Basic Auth direktno na backendu (main.py)

**Datum:** 2026-08-10
**Odlučio:** Direktor (Davor Mulalić) — prijavio sigurnosnu rupu nakon Sprint 03
**Kontekst:** Sprint 03 je zaštitio SAMO frontend (Vercel middleware). Railway
backend URL je ostao potpuno otvoren — `ALLOWED_ORIGINS` (CORS) sprečava
samo pozive iz browsera; direktan poziv (curl, skripta) ga u potpunosti
zaobilazi i mogao je pozvati `/solve`, `/export/excel`, `/export/report`
bez ikakve lozinke, mimo wizarda.

**Odluka:** Dodan HTTP Basic Auth direktno u `backend/main.py` (FastAPI
`Depends`) na SVAKI endpoint OSIM `/health` (health-check/monitoring i dalje
radi bez lozinke). Lozinka: nova env varijabla `BACKEND_PASSWORD` na
Railway-u (odvojena od Vercel-ovog `SITE_PASSWORD` jer su to dvije odvojene
platforme/sistemi za env varijable), frontend je šalje automatski kroz
`VITE_BACKEND_PASSWORD` (Vercel, build-time, isti mehanizam kao
`VITE_API_URL`). Fail-closed: ako `BACKEND_PASSWORD` nije podešen na
Railway-u, SVI zaštićeni pozivi vraćaju 500 (server odbija sve, ne propušta
ništa bez provjere) — testirano lokalno.

**Zašto je OK da vrijednost `BACKEND_PASSWORD` = `SITE_PASSWORD` (preporuka,
ne obaveza):** Frontend je Vite SPA — SVAKA `VITE_`-prefiksovana varijabla
se ugrađuje kao čist tekst u JS fajl koji se šalje browseru. To znači da
`VITE_BACKEND_PASSWORD` NIJE tajna za nekoga ko već ima pristup frontendu
(dev alati/"view source" je otkrivaju) — ali da bi neko uopšte DOŠAO do tog
JS fajla, prvo mora proći Vercel Basic Auth (DL-002), za šta mu treba
`SITE_PASSWORD`. Dakle korištenje iste vrijednosti ne otvara ništa novo:
ko god zna `SITE_PASSWORD` može otvoriti wizard i legalno raditi sve isto
preko UI-ja; razlika je samo da tehnički može i direktno pozivati API.
Prava rupa koju ovo zatvara je neko ko NE zna nijednu lozinku, a slučajno
sazna goli Railway URL (npr. iz javnog GitHub repoa/README-a).

**Posljedice:**
- main.py dotaknut (dozvoljeno — P-3 zabranjuje logiku u solver.py/
  validators.py/exports.py, ne konfiguraciju u main.py).
- App.jsx fetch pozivi šalju `Authorization: Basic` header automatski.
- Direktor mora postaviti `BACKEND_PASSWORD` (Railway) i
  `VITE_BACKEND_PASSWORD` (Vercel) — vidi HANDOFF u `sprints/SPRINT_03.md`.
- Lokalni razvoj (`uvicorn main:app --reload` bez env varijable) sada vraća
  500 na zaštićenim endpointima — namjerno (fail-closed); postaviti
  `BACKEND_PASSWORD` lokalno za razvoj ako treba testirati te pozive.

**Status:** Implementirano i TESTIRANO NA ŽIVOM (Railway) URL-u (2026-08-10):
- Direktan poziv (curl, bez lozinke) na `/feasibility`, `/solve`,
  `/export/excel` → 401, mimo browsera/wizarda. Rupa zatvorena.
- `/health` bez lozinke i dalje 200 (monitoring OK).
- Usput otkriveno i ispravljeno: `BACKEND_PASSWORD` je prvo greškom dodan
  u Railway "Shared Variables" umjesto u Variables tog servisa — env
  varijabla zbog toga nije stizala do aplikacije (fail-closed je ispravno
  vraćao 500). Nakon premještanja u servisne Variables, radi.
- Direktor potvrdio end-to-end kroz wizard (sa tačnom lozinkom): generisan
  raspored, izvezen Excel — normalan tok nije narušen.

## DL-004 — Nacharbeit preraspodjela (Semra → Tamara Mayer, 4. razred) + B/H/S i Englisch jutarnji i za 3. razred

**Datum:** 2026-08-10
**Odlučio:** Direktor (Davor Mulalić), nakon konsultacije sa Tamarom Mayer
**Kontekst:** Tamara Mayer može preuzeti TAČNO 2 dodatna Nacharbeit časa.

**Odluka:** U `idss_config.example.json` (backend/ i frontend/src/, identični):
- Nacharbeit unos za 4. razred (2 časa) prebačen sa "Semra Isanović" na
  "Tamara Mayer". Njen drugi Nacharbeit unos (3. razred, 6 časova) ostaje
  nepromijenjen.
- `morning_core_by_grade` proširen sa `{"B/H/S":[1,2,4],"Englisch":[1,2,4]}`
  na `{"B/H/S":[1,2,3,4],"Englisch":[1,2,3,4]}` — B/H/S i Englisch sada
  jutarnji i za 3. razred.
- SAMO promjena podataka u config fajlu — solver.py/validators.py/
  exports.py/main.py NETAKNUTI (P-3).

**Provjereno (solve_timetable na ažuriranom configu, 90s limit):**
- `validate_config`: 0 problema (izvodivo)
- `solve_timetable`: ok=True, status=FEASIBLE
- `validate()` nakon solve: 0 grešaka
- B/H/S i Englisch: 0 pojavljivanja u 6./7. času za razrede 1–4
- Semra Isanović: 22 časa (bilo 24); Tamara Mayer: 7 časova (bilo 5)
- Excel izvoz: uspio, validan (2 lista)

**Status:** Aktivno, potvrđeno i testirano.

## Napomena uz DL-001 (2026-08, nakon pitanja Direktora)

Direktor ne treba Docker instaliran lokalno. Cloud Run / Railway sami
grade Docker image iz `Dockerfile`-a u repozitoriju u trenutku deploya
(Sprint 03) — to je i stvarna provjera da Dockerfile radi. Lokalni
`docker build` test (spominjan u Sprint 01) bio je opcionalna, ne
neophodna provjera; njegovo odsustvo NE blokira napredak.

---

*Project Decision Log — IDSS Timetable*
