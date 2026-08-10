# CONSTITUTION.md — Project: IDSS Timetable

# Inherits: Commander Universal Constitution v1.5.2 (live at
# https://raw.githubusercontent.com/IDSS123a/commander/main/CONSTITUTION.md
# — ACA treba UVIJEK fetchovati živu verziju, ne oslanjati se na broj
# napisan ovdje, jer se Commander mijenja. Ovaj dokument namjerno NE
# nabraja tačne brojeve M-/E-/A-/C- pravila da ne zastari; referencira
# ih po IMENU gdje je bitno.)
# Project Constitution Version 1.1 — korigovano 2026-08 nakon direktne
# provjere stvarnog initial_instructions.md v1.5.2

---

> Ovaj dokument dodaje pravila SPECIFIČNA za ovaj projekat na vrh
> Commander univerzalnog ustava. Kod kolizije, Commander univerzalni
> ustav ima prednost (osim gdje je niže eksplicitno navedeno drugačije
> kao odobreno odstupanje — vidi O-1, po pravilu "Stack Deviation Is
> a Path" iz Commander CONSTITUTION.md).
>
> NAPOMENA O REPO IMENOVANJU: Commander bootstrap (initial_instructions.md)
> standardno imenuje nove repoe `web-app-[naziv]`. Ovaj repo se zove
> `time-table` (kreiran prije formalnog bootstrapa, retroaktivno stavljen
> pod Commander governance). Nije potrebno preimenovati — zabilježeno
> ovdje radi transparentnosti (M-4/M-10: ne prešutjeti odstupanje).

## P-1. Svrha projekta

Web aplikacija koja reprodukuje proces izrade rasporeda časova za IDSS
(9 razreda, 5 dana, 7 časova/dan). Zamjenjuje ručnu izradu u chatu
(Claude) ponovljivim alatom koji Direktor može sam pokretati svake
školske godine.

## O-1. Odobreno odstupanje od zadanog stacka ("Stack Deviation Is a Path")

Commander default stack je **Next.js + Supabase + Vercel** (per
initial_instructions.md Step 3.6 i Commander DECISION_LOG DL-001 do
DL-008). **Ovaj projekat odstupa**: backend je Python/FastAPI (ne
Next.js), jer motor za raspoređivanje (Google OR-Tools CP-SAT) je
Python biblioteka koja ne može raditi unutar Next.js/Vercel Node
runtime-a niti u browseru, i zahtijeva dugotrajan proces neprikladan
za Vercel Serverless/Edge funkcije.

- Frontend: React (Vite), NE Next.js.
- Backend: Python 3.11 + FastAPI, hostovan odvojeno (Cloud Run / Railway).
- Deployment ne treba Docker instaliran lokalno kod Direktora — cloud
  host (Cloud Run/Railway) gradi Docker image iz `Dockerfile`-a u
  repozitoriju u trenutku deploya; to je i stvarna provjera.
- Baza podataka: NIJE Supabase (za razliku od Commander defaulta) —
  odlučeno da nije potrebna za ovaj projekat; konfiguracija se
  čuva kao `.json` fajl koji korisnik izvozi/uvozi.
- Ovo je dokumentovano i u DECISION_LOG.md (DL-001), zapisano prema
  pravilu Commander CONSTITUTION-a da svako odstupanje mora biti
  eksplicitno pitano i zapisano, ne prešutno pretpostavljeno.
- Svi ostali Commander arhitekturni obrasci (slojevi, single-source-of-truth,
  feature folderi) i dalje vrijede, prevedeni na Python/FastAPI ekvivalente:
  Domain = solver.py + validators.py; Infrastructure = exports.py;
  Application = main.py (API rute); Presentation = React frontend.

## P-2. Domenska pravila (nepromjenjiva bez odluke Direktora)

Ova pravila su TVRDA (hard constraints) u `solver.py` i ne mijenjaju se
osim eksplicitnim zahtjevom Direktora:

- Svaki razred ima tačno definisan sedmični broj časova (IDSS: 35).
- Matematika i njemački isključivo u jutarnjim periodima (IDSS: 1.–4. čas).
- Nacharbeit isključivo u zadnjim periodima dana (IDSS: 6./7. čas), uvijek
  kao sufiks — svi ostali predmeti tog razreda tog dana su prije njega.
- Svaki predmet najviše jednom dnevno po razredu, OSIM predmeta eksplicitno
  označenih kao blok (2 vezana časa) — IDSS: Sport (svi razredi), Kunst
  (razredi 1–4).
- Honorarni/fiksni nastavnici zadržavaju svoje unaprijed zadane termine —
  rješavač ih NE premješta.
- Razrednik ima kontakt sa svojim razredom svaki dan — OSIM razreda
  eksplicitno označenih kao izuzetak (jer razrednik tog razreda predaje
  premalo časova da bi to bilo izvodivo).

Puna metodologija (SEDAM FAZA procesa) je u `USTAV_metodologija.md` —
taj dokument ostaje autoritativan izvor za DOMENSKI proces (Faza 0–6);
ova CONSTITUTION.md je autoritativna za PROJEKTNA/inženjerska pravila
koja Commander traži da budu ovdje.

## P-3. Šta je gotovo i NE PREPISUJE SE

`solver.py`, `validators.py`, `exports.py` su testirano jezgro (vidi
DONE_CHECKLIST provjere u README.md). ACA ih povezuje, ne prepisuje
logiku. Ako je promjena logike zaista potrebna — STOP i pitaj Direktora
(M-4, M-10).

## P-4. Paleta boja (UI zahtjev, ne inženjerski, ali obavezujući)

`#035EA1` `#08ABE6` `#FFCB29` `#E8262C` `#000000`

---

*Project Constitution v1.0 — IDSS Timetable — inherits Commander v1.0*
