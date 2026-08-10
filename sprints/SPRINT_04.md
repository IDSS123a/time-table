# SPRINT_04 — Ručna korekcija (drag-and-drop) + dashboard opterećenja

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 03 (deployment) ZAVRŠEN — ovaj sprint pretpostavlja da app
# već radi na produkciji ili je barem stabilan lokalno; ako Sprint 03 još nije
# rađen, uraditi njega PRIJE ovog.
# Porijeklo ideje: pregled vanjskih izvora (prabath1998/timetable-generator) —
# ideja preuzeta, kod NIJE kopiran (repo nema LICENSE, nema prava reuse-a).

---

## OPSEG (striktno — ništa van ovoga u ovom sprintu)

**U OPSEGU:**
1. Nakon "Generiši raspored", omogućiti **ručno prevlačenje** (drag-and-drop)
   jednog časa iz njegovog termina u drugi, unutar prikaza "po razredu".
2. Prilikom ispuštanja (drop), **backend provjerava** da li je novi raspored
   i dalje ispravan (isti `validators.py` koji već postoji — POST na novi
   endpoint, npr. `/validate-move`) — ako novi raspored krši bilo koje pravilo
   (nastavnik zauzet, predmet 2x u danu, Nacharbeit van 6./7., itd.), promjena
   se **odbija** i vraća se na staro mjesto uz jasnu poruku zašto.
3. **Dashboard opterećenja**: nova stranica/sekcija koja prikazuje, za svakog
   nastavnika, broj časova sedmično i najveću rupu (gap) tog dana — tablica,
   sortiva po broju časova. Cilj: direktor odmah vidi ko je preopterećen ili
   ko ima najviše rupa, bez otvaranja Excela.
4. Izvoz dashboard tabele kao CSV (jednostavno, koristi postojeći `export`
   obrazac iz `exports.py`, ne treba nova biblioteka).
5. **"Napredni" ekran u wizardu — ručno uređivanje sirovog config JSON-a.**
   Rješava ponavljajući problem iz Sprint 02/03: svaki put kad backend dobije
   NOVO polje (teacher_constraints, morning_core_by_grade, ...), wizard ga
   tiho gubi dok mu neko ručno ne doda podršku. Dodati jedan dodatni ekran
   (npr. "⑥ Napredno") s textarea poljem koje prikazuje TRENUTNI kompletan
   config kao JSON (uključujući polja koja wizard inače ne prikazuje kroz
   svoje forme) i dozvoljava direktnu izmjenu — promjene se odmah
   reflektuju u wizard state (isto kao Učitaj config, samo bez fajla).
   Cilj: bilo koje BUDUĆE novo polje se može ručno postaviti/urediti čak i
   prije nego dobije punu UI podršku, bez čekanja na sljedeći ACA ciklus.

**VAN OPSEGA (NE dirati u ovom sprintu):**
- Automatsko re-optimizovanje ostatka rasporeda nakon ručne izmjene (ručna
  izmjena je izolovana — samo zamjena dva termina, ne cijeli re-solve).
- Izmjena logike u `solver.py` (rješavač se ne dira; ručna korekcija je
  potpuno odvojen mehanizam koji koristi POSTOJEĆI `validators.py`).
- Bilo kakva promjena config_schema.md oblika.
- Mobilni prikaz / responsive dizajn (ostaje za kasnije).

## PLAN (FEATURE_LIFECYCLE Korak 2)

```
/**
 * SPRINT: 04
 * SVRHA: Omogućiti direktoru da RUČNO fino podesi gotov raspored (npr.
 *        zamijeni dva termina) bez ponovnog pokretanja cijelog rješavača,
 *        uz garantovanu ispravnost (isti validators.py). Plus dashboard
 *        opterećenja za brz pregled bez otvaranja Excela.
 * DOTIČE: frontend/src/App.jsx (drag-and-drop UI + dashboard prikaz),
 *         backend/main.py (nov endpoint /validate-move — tanka omotnica
 *         oko POSTOJEĆEG validate() iz validators.py, NE nova logika)
 * VAN OPSEGA: re-optimizacija, izmjena solver.py, mobilni dizajn
 * USTAV REF: CONSTITUTION.md P-3 (jezgro se ne prepisuje — /validate-move
 *            samo poziva postojeći validate())
 */
```

## KRITERIJI PRIHVATANJA (Faza 5 — TESTIRANJE)

Sprint NIJE završen dok Direktor LIČNO ne potvrdi:

```
□ Nakon Generiši, mogu prevući čas iz jednog termina u drugi (isti razred)
□ Ako je novi raspored ispravan, promjena se prihvata i prikaz se ažurira
□ Ako novi raspored NIJE ispravan (npr. nastavnik već zauzet u tom terminu),
  promjena se ODBIJA, čas se vraća na staro mjesto, i jasna poruka objašnjava
  zašto (npr. "Amra Franca već predaje u tom terminu u 6. razredu")
□ Dashboard prikazuje SVE nastavnike sa brojem časova i najvećom rupom,
  sortivo po broju časova
□ Izvoz dashboarda kao CSV radi (fajl se preuzima, otvoriv u Excelu)
□ Backend jezgro (solver.py, validators.py) NETAKNUTO — MD5 provjera
□ "Napredni" ekran prikazuje trenutni config kao čitljiv JSON; ručna izmjena
  tamo (npr. dodavanje testnog polja) se odmah odražava kad se pređe na
  drugi ekran ili klikne Generiši — bez potrebe za Sačuvaj/Učitaj fajla
```

## HANDOFF NAPOMENA (piše ACA na kraju sprinta)

```
HANDOFF NOTE — Sprint 04

Completed:
- backend/main.py: nov endpoint POST /validate-move — tanka omotnica oko
  POSTOJEĆEG validate() (validators.py). Prima {config, lessons, grade,
  src_day, src_period, dst_day, dst_period}; zamijeni dva termina ISTOG
  razreda, pusti validate() da presudi. Blok/fiksni časovi se odbijaju
  (400) prije provjere — ne pomjeraju se (P-2). solver.py/validators.py/
  exports.py POTVRĐENO netaknuti (git diff --stat prazan za sva tri fajla).
- frontend/src/App.jsx: drag-and-drop (HTML5 native, bez nove biblioteke)
  u prikazu "po razredu" — prevlačenje poziva /validate-move; ako backend
  odbije, čas ostaje na starom mjestu (nikad optimistički promijenjen) i
  prikazuje se JASNA poruka (direktno iz validate()).
- Dashboard opterećenja (DashboardTable): časova sedmično + najveća
  dnevna rupa po nastavniku (ista definicija rupe kao solver.py interno
  koristi), sortirano opadajuće po časovima, REZERVISANO izostavljen
  (nije stvarna osoba). Toggle dugme "📊 Dashboard opterećenja" /
  "◀ Nazad na raspored".
- CSV izvoz dashboarda: čisto na frontendu (Blob + UTF-8 BOM za ispravne
  dijakritike u Excelu) — exports.py NIJE dirano (nije bilo potrebno).
- Wizard.jsx: novi Ekran ⑥ "Napredno" — textarea sa TAČNIM config JSON-om,
  "Primijeni izmjene" / "Osvježi" dugmad, auto-primjena na blur i pri
  prelasku na drugi korak (goToStep). Rješava ponavljajući problem
  "wizard tiho gubi nova polja" (vidi napomenu u OPSEG-u iznad).

Testirano (JA, ne samo tvrdnja — vidi transkript sesije):
- Backend /validate-move (6 automatizovanih testova preko HTTP-a): valjan
  swap prihvaćen i primijenjen; nevaljan swap (core predmet van jutarnjih
  perioda) odbijen sa tačnim porukama iz validate(); nepostojeći termin
  → 400; blok/fiksni čas → 400; isti izvor/cilj → no-op ok; bez lozinke
  → 401.
- Stvarni browser test (Vite dev server + lokalni backend, Chrome preko
  Claude Browser alata): učitan pun idss_config.example.json kroz NOVI
  Napredno ekran (dokazuje da i taj ekran radi), generisan raspored,
  ZATIM stvarni HTML5 drag-and-drop eventi na DOM elementima:
    • Valjan swap (Mathematik Mo2 ↔ Deutsch Mo3, oba ostaju jutarnja) →
      PRIHVAĆEN, mreža ažurirana, bez greške.
    • Nevaljan swap (Mathematik ↔ Nacharbeit) → ODBIJEN, oba časa VRAĆENA
      na staro mjesto, prikazana poruka: "Mathematik razred 1 van
      jutarnjih perioda (Mo7) · Nacharbeit razred 1 van 6./7. časa ·
      Razred 1 Mo: predmet poslije Nacharbeita".
  Dashboard provjeren (19 nastavnika, sortirano, REZERVISANO izostavljen,
  Semra Isanović 22h / Tamara Mayer 7h — poklapa se s DL-004 solve
  rezultatom). CSV izvoz provjeren presretanjem stvarnog Blob sadržaja
  (ispravan header, navodnici, BOM, dijakritici).
- npm run build: čist.

Not completed: ništa iz OPSEGA (uključujući stavku 5, "Napredni" ekran).

Open risks:
- Drag-and-drop na sporijim/touch uređajima nije testiran (HTML5 native
  DnD slabo radi na mobilnim/touch ekranima — ali mobilni prikaz je i
  eksplicitno van opsega ovog sprinta).
- /validate-move ne provjerava da li su src/dst termini uopšte unutar
  config["days"]/["periods"] prije pretrage liste — nevažeći dan/period
  jednostavno neće naći čas (400 "Nema časa..."), što je i dalje ispravno
  ponašanje, samo poruka nije eksplicitno "nevažeći dan/period".

Technical debt:
- Usput otkriveno (ne popravljeno u ovom sprintu, ostavljen chip za
  kasnije): frontend/.env je i dalje komitovan u git iz ranijeg perioda
  (prije nego što je .env dodan u .gitignore u Sprint 03 popravci) —
  .gitignore ne uklanja retroaktivno već praćene fajlove.
- .claude/launch.json dodan (Vite dev server preview config za buduće
  testiranje) — dev-tooling, ne utiče na produkciju.

Next sprint: TBD — po dogovoru s Direktorom (kandidati: mobilni prikaz,
             višegodišnja arhiva rasporeda, PDF izvoz)
```
