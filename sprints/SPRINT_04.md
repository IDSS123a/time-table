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
```

## HANDOFF NAPOMENA (piše ACA na kraju sprinta)

```
HANDOFF NOTE — Sprint 04
Completed: [šta je urađeno]
Not completed: [šta eventualno nije]
Open risks: [npr. da li drag-and-drop ostaje intuitivan na sporijim
             računarima s puno časova na ekranu]
Technical debt: [prečice, ako ih ima]
Next sprint: TBD — po dogovoru s Direktorom (kandidati: mobilni prikaz,
             višegodišnja arhiva rasporeda, PDF izvoz)
```
