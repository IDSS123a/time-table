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

## Napomena uz DL-001 (2026-08, nakon pitanja Direktora)

Direktor ne treba Docker instaliran lokalno. Cloud Run / Railway sami
grade Docker image iz `Dockerfile`-a u repozitoriju u trenutku deploya
(Sprint 03) — to je i stvarna provjera da Dockerfile radi. Lokalni
`docker build` test (spominjan u Sprint 01) bio je opcionalna, ne
neophodna provjera; njegovo odsustvo NE blokira napredak.

---

*Project Decision Log — IDSS Timetable*
