# TODO.md — IDSS Timetable, otvorene stavke

> Živ popis (backlog) koji se dopunjava kroz sprintove — ne zamjenjuje
> sprints/SPRINT_XX.md (koji su zatvoreni/arhivski nakon završetka), nego
> prati ono što je dogovoreno a još nije urađeno, da se ništa ne izgubi.
> Kad se stavka završi i potvrdi, označi je [x] i dodaj datum.

## Sprint 13 — Fiksirana traka + ujednačene kolone (2026-08-30)

- [x] Ujednačene širine kolona dana (Mo-Fr) u SVIM tabelama, oba prikaza —
      `table.grid-table{table-layout:fixed}` + klasa na Grid komponenti,
      scoped samo na .grid-table (ne Wizard-ove tabele) (2026-08-30)
- [x] Fiksirana ("sticky") traka komandi na desktop/tablet (≥481px), na
      mobitelu (<481px) NEPROMIJENJENO (statična, kao prije sprinta) —
      namjerna odluka, vidi DECISION_LOG.md DL-011 (2026-08-30)
- [x] Testirano UŽIVO na svim traženim širinama (375/390/428 mobitel,
      768/1024 tablet, 1280/1440/1920/2560 desktop) sa pravim solve-om
      (315 časova, 9 tabela, oba prikaza) — DOM inspekcija potvrdila
      sticky/static ponašanje i jednake širine kolona (2026-08-30)
- [x] Backend netaknut (`git diff --stat backend/` prazan), boje/stil
      nepromijenjeni (nula novih color/--var vrijednosti u CSS diff-u)
      (2026-08-30)
- [ ] **Direktor treba:** lično ocijeniti mobilnu verziju trake (statična,
      bez sticky) na svom uređaju — javiti ako treba kompaktnija sticky
      verzija za mobitel umjesto potpunog isključivanja

## Sprint 14 — Meko upozorenje 5.–9. razred, Mathematik/Deutsch (2026-08-30)

- [x] Jezgro (solver.py `morning_core_hard_grades`, validators.py
      `validate_warnings`) — već izmijenjeno/testirano prije ovog dijela,
      potvrđeno da NIJE dalje mijenjano (2026-08-30)
- [x] main.py: `/solve` vraća `warnings` odvojeno od `errors`, `ok` zavisi
      samo od `errors` (2026-08-30)
- [x] Frontend: `VerdictModal` novi `kind:"warning"` (žuta, ne crvena),
      ne auto-nestaje (2026-08-30)
- [x] `morning_core_hard_grades: [1,2,3,4]` zadano u OBA
      idss_config.example.json (2026-08-30)
- [x] **E-14 KRITIČNO — round-trip test PROŠAO** (učitaj→sačuvaj→uporedi,
      i sa i bez polja u config-u) + puna UI kontrola (chip-lista) u
      Wizard.jsx, ne samo "preživi kroz Napredno" — vidi DECISION_LOG.md
      DL-010 (2026-08-30)
- [x] Pun end-to-end test sa stvarnim IDSS podacima — žuto upozorenje
      prikazano ispravno, generisanje nije blokirano, dashboard i dalje
      radi (2026-08-30)

## Sprint 12 — Čuvanje rasporeda, Supabase (2026-08-30)

- [x] `backend/storage.py` (nov modul) + 3 nova endpointa u main.py
      (`/schedule/save|list/{id}`) — solver.py/validators.py/exports.py
      netaknuti (2026-08-30)
- [x] Frontend: "💾 Sačuvaj raspored" + "📂 Učitaj sačuvano" (posljednjih
      10), upozorenje prije prepisivanja nesačuvanih izmjena (2026-08-30)
- [x] Regresija provjerena: Generiši/dashboard/validate-move/export
      identični kao prije — vidi DECISION_LOG.md DL-009 (2026-08-30)
- [x] Fail-closed testirano: bez Supabase env varijabli, /schedule/* daje
      čist 503, sve ostalo radi normalno (2026-08-30)
- [x] Supabase service_role ključ NIJE u frontend kodu/bundle-u — provjereno
      (2026-08-30)
- [x] **INCIDENT popravljen isti dan:** prvi push je oborio produkciju
      (Dockerfile nije kopirao novi storage.py, main.py pucao na importu) —
      Direktor primijetio CRASHED na Railway dashboardu, popravljeno i
      potvrđeno uživo u roku od par minuta. Vidi DECISION_LOG.md DL-009
      ("nauk za buduće" napomena) (2026-08-30)
- [ ] **Direktor treba:** kreirati Supabase nalog+tabelu (SQL u
      sprints/SPRINT_12.md), postaviti `SUPABASE_URL` i
      `SUPABASE_SERVICE_ROLE_KEY` na Railway, i potvrditi stvaran upis u
      Supabase Table Editor-u nakon deploya (Claude Code testirao samo
      protiv mock Supabase servera, ne pravog — ne rukuje pravim ključem)

## Sprint 11 — "Koliko truda" best-of-N (2026-08-13)

- [x] `solve_timetable_best_of` dodan (solver.py), aditivno, Standardno
      bit-identično prije/poslije — regresija provjerena i prošla (2026-08-13)
- [x] Izbor Standardno/Pojačano/Maksimalno u App.jsx, sa izmjerenim (ne
      pretpostavljenim) vremenima (2026-08-13)
- [x] Duplirana zadana objective_weights svedena na jedan izvor istine
      (Wizard.jsx izvozi, App.jsx uvozi) (2026-08-13)
- [x] Mrtav `compactness` parametar jasno označen komentarom (nije uklonjen,
      van opsega) (2026-08-13)
- [x] **Nalaz i popravka: Railway idle-timeout rizik** — Maksimalno smanjeno
      sa 6 na 4 pokušaja (Direktorova odluka), i frontend i backend klamp
      ažurirani — vidi DECISION_LOG.md DL-008 (2026-08-13)

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
