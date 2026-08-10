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

## Napomena uz DL-001 (2026-08, nakon pitanja Direktora)

Direktor ne treba Docker instaliran lokalno. Cloud Run / Railway sami
grade Docker image iz `Dockerfile`-a u repozitoriju u trenutku deploya
(Sprint 03) — to je i stvarna provjera da Dockerfile radi. Lokalni
`docker build` test (spominjan u Sprint 01) bio je opcionalna, ne
neophodna provjera; njegovo odsustvo NE blokira napredak.

---

*Project Decision Log — IDSS Timetable*
