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
- [ ] **Excel formula injection (exports.py) — ČEKA ODOBRENJE.** Stvaran
      mehanizam potvrđen (openpyxl tretira `=...` kao formulu). Predložen
      apostrof-prefiks escape. NIJE mijenjano bez izričitog "da" — pravilo
      sprinta za taj fajl.
- [x] Zavisnosti provjerene: npm audit (2 postojeća, dev-server only,
      nepovezano sa ovim sprintom), pip-audit (0 nalaza) (2026-08-13)
- [x] Podsjetnik dat Direktoru o javnosti repoa (odluka ostaje njegova,
      DL-002) (2026-08-13)
- [x] Uzorak ranijih napada (injection stringovi, ekstremno dugi string,
      duboko ugniježđen JSON, negativni brojevi) ponovljen — čisto,
      bez pada/curenja (2026-08-13)

## Ranije, niži prioritet (nije zaboravljeno, samo čeka red)

- [ ] Ukloniti `frontend/.env` iz git praćenja (higijenska stavka)
- [ ] Razmotriti da li `solver.py` sam po sebi ikad može proizvesti isti-predmet
      dupli-angažman bug (trenutno vjerovanje: ne može, CP-SAT tvrdo pravilo
      nema taj izuzetak — samo je post-hoc `/validate-move` put bio ranjiv,
      popravljeno) — vrijedi ciljano pogledati ako se poželi apsolutna sigurnost
