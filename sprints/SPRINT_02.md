# SPRINT_02 — Wizard za unos i uređivanje config-a

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 01 ZAVRŠEN (vidi sprints/SPRINT_01.md — status potvrđen)

---

## OPSEG (striktno — ništa van ovoga u ovom sprintu)

**U OPSEGU:**
1. Zamijeni fiksni `idss_config.example.json` u `App.jsx` interaktivnim
   wizardom koji GRADI isti `config` oblik (vidi `config_schema.md`) kroz
   ekrane/forme, ne kroz fiksni fajl.
2. Ekrani prate FAZE iz `USTAV_metodologija.md` (Faza 0–2):
   a. Struktura dana (dani, periodi, vremena, jutarnji periodi, Nacharbeit
      periodi, ciljni broj časova po razredu).
   b. Nastavnici i predmeti — dodaj/uredi/obriši; za predmet označi kategoriju
      (glavni-jutarnji / blok / obični); za nastavnika označi je li honorarni
      (fiksan) i unesi fiksne termine ako jeste.
   c. Razredi i razredništva — ime razrednika po razredu; koji razredi imaju
      "razrednik svaki dan".
   d. Nacharbeit plan — po razredu: broj časova, nosilac(i).
3. Prikaz provjere izvodivosti (Faza 3 — poziva postojeći `POST /feasibility`)
   PRIJE nego dugme "Generiši" postane klikabilno. Ako provjera ne prođe,
   dugme ostaje onemogućeno i problemi se prikazuju crveno.
4. Dugmad **Sačuvaj config** (preuzmi trenutni `config` kao `.json`) i
   **Učitaj config** (učitaj `.json` i popuni wizard iz njega) — bez baze,
   samo fajl.
5. Paleta boja škole (već u `styles.css` iz Sprint 01) primijenjena i na
   nove wizard ekrane — ne izmišljati nove boje.

**VAN OPSEGA (NE dirati u ovom sprintu):**
- Deployment na Cloud Run/Railway (Sprint 03).
- Bilo kakva izmjena logike u `solver.py`, `validators.py`, `exports.py`,
  ili u API rutama u `main.py` (osim ako `/feasibility` treba sitno
  proširenje da vrati poruke koje wizard može prikazati po polju — ako je
  to potrebno, PITAJ prije izmjene backend koda, ne mijenjaj tiho).
- Baza podataka / Supabase (odlučeno: nije potrebna, vidi CONSTITUTION.md).
- Bilo kakva promjena `config_schema.md` oblika — wizard MORA graditi
  tačno taj oblik, ne izmišljati nova polja.

## PLAN (FEATURE_LIFECYCLE Korak 2)

```
/**
 * SPRINT: 02
 * SVRHA: Zamijeniti fiksni primjer-config interaktivnim wizardom koji
 *        Direktor (non-coder) koristi da unese/uredi stvarne IDSS podatke,
 *        umjesto da ručno uređuje JSON.
 * DOTIČE: frontend/src/App.jsx (novi wizard state + ekrani), NE backend
 * VAN OPSEGA: deployment, izmjena solver/validators/exports logike, baza
 * USTAV REF: USTAV_metodologija.md Faza 0–3; config_schema.md (autoritativan
 *            oblik podataka — wizard mu se prilagođava, ne obrnuto)
 */
```

## KRITERIJI PRIHVATANJA (Faza 5 — TESTIRANJE)

Sprint NIJE završen dok Direktor LIČNO (ne ACA-ova tvrdnja) ne potvrdi:

```
□ Wizard se otvara na praznom/početnom stanju (ne na fiksnom IDSS primjeru)
□ Mogu dodati/urediti/obrisati nastavnika kroz formu
□ Mogu dodati/urediti/obrisati predmet i označiti kategoriju (glavni/blok/obični)
□ Mogu unijeti honorarnog nastavnika s fiksnim terminima
□ Mogu postaviti razredništva i "razrednik svaki dan" listu
□ Mogu unijeti Nacharbeit plan po razredu
□ Provjera izvodivosti se prikazuje PRIJE "Generiši" i ispravno blokira dugme
  kad zbir časova po razredu ne odgovara ciljnom broju
□ "Sačuvaj config" preuzima ispravan .json (otvoriv, čitljiv)
□ "Učitaj config" iz tog istog .json vraća wizard u identično stanje
□ Klik "Generiši" na tako unesenom config-u i dalje radi kao u Sprint 01
  (obje mreže, bez grešaka) — regresija se NE smije desiti
```

Provjeri svaku stavku unosom PRAVIH IDSS podataka (barem 2-3 razreda,
5-6 nastavnika) da wizard nije samo "izgleda dobro" nego stvarno gradi
ispravan `config`.

## HANDOFF NAPOMENA (piše ACA na kraju sprinta)

```
HANDOFF NOTE — Sprint 02
Completed: [šta je urađeno]
Not completed: [šta eventualno nije]
Open risks: [rizici za Sprint 03 — npr. da li wizard state postaje pretrpan
             i treba li ga podijeliti na više komponenti prije deploya]
Technical debt: [prečice, ako ih ima]
Next sprint: Sprint 03 — Deployment (Cloud Run/Railway + Docker build)
```
