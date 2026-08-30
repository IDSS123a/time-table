# SPRINT_14 — Meko upozorenje za 5.–9. razred (Mathematik/Deutsch)

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: otkriveno kroz Direktorovu nezavisnu provjeru stvarnih
# produkcijskih podataka (Sprint 12 test) — pravi honorarni raspored
# (Haris Hamzić) ima Mathematik popodne za razrede 5/8/9, što je
# ISPRAVNO stanje stvari, ali `validate()` je to prijavljivao kao
# grešku. Direktorova odluka (2026-08-30): 1.–4. razred ostaje TVRDO
# pravilo (mora ujutru); 5.–9. postaje SAMO upozorenje, ne blokira.

---

## ⚠️ JEZGRO VEĆ POPRAVLJENO I TESTIRANO — OVAJ SPRINT JE ZAVRŠNI DIO

`solver.py` i `validators.py` su VEĆ izmijenjeni i temeljno testirani
(od strane Claude/glavnog asistenta lično, isti standard kao i za sve
prethodne izmjene jezgra) — priloženi uz ovaj sprint, spremni za
zamjenu. Ovaj sprint POKRIVA SAMO ono što je ostalo: `main.py` (mala
dopuna), frontend prikaz upozorenja, i KRITIČNO — osigurati da se novo
config polje NE izgubi (vidi upozorenje ispod).

## 🔴 KRITIČNO UPOZORENJE — VEĆ SE DOGODILO DVAPUT

Dva puta ranije u ovom projektu (`teacher_constraints`, pa
`morning_core_by_grade`) novo config polje je TIHO IZGUBLJENO jer ga
Wizard.jsx/App.jsx nisu poznavali — sad je i formalno pravilo u
COMMANDER-u (ENGINEERING_RULES.md E-14) da se ovo NE smije ponoviti.
**Novo polje ovog sprinta je `morning_core_hard_grades`** — MORA se
runtrip-testirati (učitaj→sačuvaj→uporedi) PRIJE nego se sprint smatra
gotovim, isto kao E-14 sad eksplicitno zahtijeva.

## OPSEG

**Već urađeno (priloženo, samo zamijeniti fajlove):**
1. `solver.py` — novo polje `morning_core_hard_grades` (lista razreda).
   Ako nije podešeno, zadano je "svi razredi" (identično ponašanje kao
   prije ove izmjene — potvrđena povratna kompatibilnost, testirano).
   Mathematik/Deutsch su TVRDO ograničeni na jutro SAMO za razrede u
   toj listi; van nje, slobodni su (CP-SAT ih uopšte ne ograničava).
2. `validators.py` — `validate()` (tvrde greške) sad koristi istu
   po-razredu logiku — razredi van `morning_core_hard_grades` se više
   NE prijavljuju kao greška. Nova, ZASEBNA funkcija
   `validate_warnings(lessons, config)` — vraća listu upozorenja
   (Mathematik/Deutsch van jutra za razrede VAN tvrde liste). Namjerno
   odvojeno od `errs` — upozorenja NIKAD ne blokiraju niti utiču na
   `/validate-move` (ručno prevlačenje).

**U OPSEGU ovog sprinta (Claude Code):**
1. `main.py` — u `/solve` ruti, pozvati i `validate_warnings(res["lessons"], body.config)`
   pored postojećeg `validate()`, i vratiti kao novo polje `warnings`
   u odgovoru (pored postojećeg `errors`). `ok` status ostaje baziran
   ISKLJUČIVO na `errors` (ne na `warnings`) — Direktorov zahtjev:
   "upozorava ali ne sprječava".
2. Frontend — prikazati `warnings` VIZUELNO RAZLIČITO od `errors`
   (blaži ton, npr. žuta/`--yellow` umjesto crvene `--red` iz verdict
   prozora — Sprint 05 stil, ne novi stil). Ne blokira "Generiši"
   dugme niti prikaz rasporeda.
3. **Postaviti `morning_core_hard_grades: [1,2,3,4]` kao zadanu
   vrijednost** u `idss_config.example.json` (oba mjesta — backend I
   frontend/src, isti obrazac kao ranije) — ovo je Direktorova stvarna
   odluka za IDSS, ne apstraktan primjer.
4. **OBAVEZNO**: dodati podršku za `morning_core_hard_grades` u
   Wizard.jsx buildConfig()/loadConfig() (isti obrazac kao ranija
   popravka za `morning_core_by_grade`) — round-trip test PRIJE
   zatvaranja sprinta, ne poslije.
5. Ako nema vremena za punu wizard UI kontrolu (klizač/checkbox po
   razredu), MINIMALNO osigurati da polje preživi Sačuvaj/Učitaj kroz
   postojeći "Napredno" JSON ekran (Sprint 04 sigurnosni ventil) — to
   je prihvatljivo privremeno rješenje, potpuna UI kontrola nije
   obavezna za ovaj sprint.

**VAN OPSEGA:**
- Bilo kakva dalja izmjena `solver.py`/`validators.py` van onoga što
  je već priloženo.
- `/validate-move` — namjerno NE prikazuje upozorenja, samo greške
  (nepromijenjeno ponašanje).

## KRITERIJI PRIHVATANJA
```
□ main.py vraća "warnings" polje u /solve odgovoru, odvojeno od "errors"
□ "ok" status i dalje zavisi SAMO od "errors" (upozorenja ga ne mijenjaju)
□ Frontend prikazuje upozorenja vizuelno blaže od grešaka (žuta, ne crvena)
□ Generisanje NIJE blokirano upozorenjima
□ morning_core_hard_grades: [1,2,3,4] postavljeno kao zadano u oba
  idss_config.example.json fajla
□ Round-trip test za morning_core_hard_grades kroz wizard PROŠAO
  (učitaj→sačuvaj→uporedi, identično) — PRIJE zatvaranja sprinta
□ Regresija: postojeći stvarni config (bez ovog polja) i dalje radi
  identično kao prije ovog sprinta
□ git diff potvrđuje da solver.py/validators.py NISU dodatno mijenjani
  van onoga što je već priloženo
```

## HANDOFF NAPOMENA
```
HANDOFF NOTE — Sprint 14 (2026-08-30)

Completed:
- main.py: /solve poziva i validate_warnings(), vraća "warnings" polje
  odvojeno od "errors". "ok" i dalje zavisi ISKLJUČIVO od "errors".
- Frontend: VerdictModal dobija ADITIVNI kind:"warning" (žuta --yellow,
  ⚠ ikonica, ne auto-nestaje). Postojeći success/error pozivi nepromijenjeni.
- morning_core_hard_grades: [1,2,3,4] postavljeno kao zadano u OBA
  idss_config.example.json (backend i frontend/src, identični).
- E-14 KRITIČNO: puna round-trip podrška u Wizard.jsx —
  emptyWizard()/buildConfig()/loadConfig() + PRAVA UI kontrola (chip-lista
  na Ekranu A, isti obrazac kao "Razrednik svaki dan"), ne samo minimalno
  "preživi kroz Napredno" (odlučeno da se uradi puna podrška jer nije bilo
  suštinski skuplje).

Round-trip test rezultat: PROŠAO, oba scenarija testirana uživo:
1. Config sa morning_core_hard_grades:[1,2] (namjerno različit od "svi
   razredi") → Ekran A chips ispravno [1,2] uključeno/[3] isključeno →
   Napredno JSON i dalje [1,2] bez izmjene — čist round-trip.
2. Config BEZ polja (stariji config) → Ekran A chips ispravno SVI
   razredi uključeno (fallback) → Napredno JSON eksplicitno [1,2,3] —
   isto ponašanje, sad perzistentno umjesto tiho izgubljeno.
Dodatno: UI toggle (klik chip) potvrđeno uživo ažurira config odmah.

Pun end-to-end test (stvaran IDSS 9-razredni config, pravi Haris Hamzić
raspored): 315 časova generisano bez grešaka (regresija identična
ranijim sprintovima), žuti verdict prozor prikazao 5 konkretnih napomena
(Deutsch popodne razredi 5/7/8/9), generisanje NIJE blokirano, dashboard
nakon toga i dalje ispravno prikazuje 19 nastavnika.

Not completed: ništa iz opsega Claude Code dijela — sve 5 stavki iz
"U OPSEGU" urađene (uključujući punu UI kontrolu, ne samo minimum).

solver.py/validators.py: git diff --stat potvrđuje da NISU dalje
mijenjani u ovom dijelu rada (diff koji postoji je onaj koji je već bio
prisutan prije početka ovog dijela — potvrđeno, nijedan Edit/Write poziv
nije napravljen na ta dva fajla ovom sesijom).

Next: TBD po dogovoru s Direktorom — projekat sad ima i tvrdo pravilo
(1.-4. razred) i meko upozorenje (5.-9. razred) za Mathematik/Deutsch,
ispravno odvojeno svugdje (solver/validate/main.py/frontend/wizard).
```
