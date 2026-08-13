# TODO.md — IDSS Timetable, otvorene stavke

> Živ popis (backlog) koji se dopunjava kroz sprintove — ne zamjenjuje
> sprints/SPRINT_XX.md (koji su zatvoreni/arhivski nakon završetka), nego
> prati ono što je dogovoreno a još nije urađeno, da se ništa ne izgubi.
> Kad se stavka završi i potvrdi, označi je [x] i dodaj datum.

## Sprint 05 — Vizuelna nadogradnja (završeno 2026-08-12)

- [x] Neumorfni "verdict" prozor (prihvaćeno/odbijeno) — vidi sprints/SPRINT_05.md (2026-08-12)
- [x] Grab-hand kursor za drag-and-drop časove (2026-08-12)
- [x] Dosljedna neumorfna porodica (dugmad, kartice, hover stanja) (2026-08-12)
- [x] `tabular-nums` na mreži rasporeda (2026-08-12)
- [x] Bolja prazna stanja (jasna uputa umjesto golog "Još nema...") (2026-08-12)
- [x] Vidljivo tastaturno fokusiranje (`:focus-visible`) (2026-08-12)
- [x] Dashboard: trake u `--navy`, najopterećeniji red istaknut `--yellow` linijom (2026-08-12)

## Zaglavlje i identitet (dodano 2026-08-11, završeno 2026-08-12)

- [x] Logo škole u gornji lijevi ugao: https://idss.edu.ba/wp-content/uploads/2024/03/logo_white.png
      (bijela verzija loga — pasuje na navy pozadinu zaglavlja, već postoji) (2026-08-12)
- [x] Naslov aplikacije, centriran, ISTA visina kao logo: "Raspored časova za IDSS"
      (zamjenjuje trenutni "IDSS — Raspored časova") (2026-08-12)
- [x] Ukloniti SVE developerski/interne tragove iz korisničkog interfejsa —
      npr. trenutni podnaslov "Sprint 02 · Wizard za unos config-a · USTAV
      Faze 0–3" ne smije biti vidljiv krajnjem korisniku (to je interna
      referenca na sprint, ne nešto što nastavnik/direktor treba da vidi) (2026-08-12)
- [x] Kompletna revizija SVIH tekstova u aplikaciji (dugmad, poruke,
      naslovi ekrana, tooltip-ovi, prazna stanja, greške) — sve mora biti
      profesionalno napisano, ispravnim bosanskim jezikom, bez internih
      referenci (Sprint, USTAV, Faza, itd.) vidljivih korisniku (2026-08-12,
      popis izmijenjenih tekstova u sprints/SPRINT_05.md HANDOFF napomeni)

## Sprint 08 — Sigurnosni audit (2026-08-13)

- [x] Autentifikacija ponovo potvrđena uživo na produkciji (401/401/200/
      fail-closed) + dodan rate-limit (10 pokušaja/5min po IP, bio potpuno
      odsutan) — vidi DECISION_LOG.md DL-005 (2026-08-13)
- [x] Mrežna sigurnost: HTTPS enforced (oba), ALLOWED_ORIGINS tačan —
      potvrđeno uživo na produkciji (2026-08-13)
- [x] Curenje informacija: malformisan/ekstreman JSON ne curi stack
      trace; `/docs`+`/openapi.json`+`/redoc` NAĐENI javno dostupni bez
      lozinke — popravljeno, isključeni (2026-08-13)
- [x] Excel formula injection (exports.py) — Direktor odobrio, apostrof-
      prefiks escape implementiran i testiran (2026-08-13)
- [x] Zavisnosti provjerene: npm audit (2 postojeća, dev-server only,
      nepovezano sa ovim sprintom), pip-audit (0 nalaza) (2026-08-13)
- [x] Podsjetnik dat Direktoru o javnosti repoa (odluka ostaje njegova,
      DL-002) (2026-08-13)
- [x] Uzorak ranijih napada (injection stringovi, ekstremno dugi string,
      duboko ugniježđen JSON, negativni brojevi) ponovljen — čisto,
      bez pada/curenja (2026-08-13)

## Sprint 09 — Neumorfni login ekran (2026-08-13)

- [x] Vercel middleware Basic Auth (frontend/middleware.js) uklonjen,
      zamijenjen in-app neumorfnim login ekranom — vidi DECISION_LOG.md
      DL-006 (2026-08-13)
- [x] Backend: `GET /verify-auth` dodan (tanka omotnica oko require_auth),
      solver.py/validators.py/exports.py netaknuti (2026-08-13)
- [x] Lozinka se čuva u sessionStorage (ne localStorage), šalje se uz
      svaki poziv backendu; automatska odjava na 401 (npr. lozinka
      promijenjena dok je tab otvoren) — testirano uživo (2026-08-13)
- [ ] **Direktor treba promijeniti `BACKEND_PASSWORD` na Railway-u** na
      novu lozinku po svom izboru — vidi sprints/SPRINT_09.md HANDOFF za
      korak-po-korak uputstvo. Claude Code ovo ne može uraditi sam.
- [ ] (opciono, nije hitno) Obrisati neiskorištene Vercel env varijable
      `SITE_PASSWORD` i `VITE_BACKEND_PASSWORD` — više se ne koriste
      nakon ovog sprinta, ali ne štete ako ostanu.

## Sprint 10 — Filigransko poliranje (2026-08-13)

- [x] Boja van palete (#1a7a3a zelena → var(--sky)) popravljena na 2
      mjesta (styles.css, Wizard.jsx) — vidi DECISION_LOG.md DL-007 (2026-08-13)
- [x] `.chip` hover stanje dodano (nije postojalo) (2026-08-13)
- [x] `.wiz-step` hover + tastaturni pristup (role/tabIndex/onKeyDown)
      dodano — ranije nije bilo moguće Tab-om doći do koraka wizarda (2026-08-13)
- [x] Ikonice na "Izvezi Excel"/"Izvezi izvještaj" dodane radi
      dosljednosti sa "⬇️ Izvezi CSV" (2026-08-13)
- [x] Svih 6 koraka wizarda + login + mreža + dashboard provjereni uživo
      na 375px/1280px — bez horizontalnog overflow-a (2026-08-13)
- [ ] **ČEKA Direktorov lični pregled na svom uređaju** — sprint kriterijum
      eksplicitno traži estetski sud koji ACA ne može sam donijeti. Dok se
      to ne potvrdi, sprint se ne smatra formalno zatvorenim (iako je kod
      spreman i push-ovan).

## Ranije, niži prioritet (nije zaboravljeno, samo čeka red)

- [ ] Ukloniti `frontend/.env` iz git praćenja (higijenska stavka)
- [ ] Razmotriti da li `solver.py` sam po sebi ikad može proizvesti isti-predmet
      dupli-angažman bug (trenutno vjerovanje: ne može, CP-SAT tvrdo pravilo
      nema taj izuzetak — samo je post-hoc `/validate-move` put bio ranjiv,
      popravljeno) — vrijedi ciljano pogledati ako se poželi apsolutna sigurnost
