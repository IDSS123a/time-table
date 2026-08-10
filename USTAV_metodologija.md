# USTAV — Metodologija izrade rasporeda časova (IDSS)

> Ovo je **okosnica cijelog sistema**. Opisuje _proces_ kojim se od prve ideje
> dolazi do tačnog rasporeda časova i narativnog izvještaja. Rješavač (CP-SAT)
> je samo motor; vrijednost je u ovom procesu. Aplikacija mora **vjerno
> reprodukovati ovih sedam faza** — jer se upravo tu prave (ili izbjegavaju)
> greške.

---

## 0. Osnovno načelo

Dobar raspored ne pravi pametan algoritam, nego **precizno postavljen problem**.
Redoslijed je uvijek isti i **nikad se ne preskače**:

1. razumjeti postojeće stanje →
2. prikupiti pravila i promjene →
3. uhvatiti kontradikcije i praznine →
4. provjeriti da je uopšte izvodivo →
5. tek onda računati →
6. provjeriti rezultat →
7. izvesti dokumente.

Rješavač se pokreće **tek u koraku 5**. Sve prije toga je ljudski/logički rad koji
aplikacija mora voditi kroz pitanja i provjere. „Garbage in — confident garbage
out": ako su pravila pogrešna ili se sudaraju, računar će samouvjereno izbaciti
„validan" ali pogrešan raspored.

---

## 1. Faze procesa (aplikacija ih vodi redom)

### FAZA 0 — Snimanje postojećeg stanja
Prije bilo kakve izmjene, sistem mora znati **kako izgleda trenutni raspored**:
- struktura dana (broj časova, vremena, pauze, produženi boravak),
- svi nastavnici, predmeti, razredi,
- ko je razrednik kojeg razreda,
- ko su honorarni nastavnici i na kojim su **fiksnim** terminima,
- broj časova po predmetu i razredu.

> U aplikaciji: unos ili uvoz prošlogodišnjeg rasporeda (JSON). To postaje
> polazna tačka i „topli start".

### FAZA 1 — Elicitacija promjena i pravila
Sistem kroz **pitanja** (wizard) prikuplja sve što se mijenja i sva pravila:
- kadrovske promjene (ko odlazi, ko dolazi, ko mijenja predmet/razred),
- razredništva za novu godinu,
- Nacharbeit plan (broj po razredu, nosilac, jezik),
- posebna pravila (npr. glavni predmeti ujutru, blok-časovi, razrednik svaki dan).

Pravilo: **jedno pitanje = jedna odluka**. Ne pretpostavljati odgovore.

### FAZA 2 — Otkrivanje kontradikcija i praznina (NAJVAŽNIJE)
Prije računanja, sistem **aktivno traži** logičke sudare i rupe i **pita
korisnika** dok ih ne razriješi. Tipovi koje uvijek provjeriti:

- **Kontradikcije**: dvije izjave koje se sudaraju
  (npr. „X preuzima biblioteku od Y" + „Y i dalje vodi biblioteku" → ko je vodi?).
- **Nepokriveni predmeti**: predmet čiji je nastavnik otišao a niko nije određen
  (npr. njemački u 1. razredu ostane bez nastavnika).
- **Prekobrojna zaduženja**: nastavnik iznad razumne norme (npr. > 25 časova).
- **Nemogući razrednik**: razrednik koji u svom razredu predaje premalo da bi
  imao dnevni kontakt (specijalista s 1 blokom sedmično).

Za svaku otkrivenu stavku sistem **postavlja konkretno pitanje s prijedlogom**,
ne rješava tiho umjesto korisnika. Subjektivne kompromise (kome dati koji čas,
je li rupa prihvatljiva) **uvijek bira čovjek**.

### FAZA 3 — Provjera izvodivosti (prije računanja)
Sistem matematički provjeri da traženo **uopšte može stati**, i to _prije_
pokretanja rješavača, da ne troši vrijeme na nemoguć problem:

- **Suma po razredu = tačan broj časova.** Redovni časovi + Nacharbeit moraju dati
  tačan sedmični broj (kod IDSS: 35). Ako ne, javiti tačnu razliku.
- **Kapacitet jutarnjih perioda.** Predmeti koji moraju ujutru (matematika,
  njemački) + fiksni honorarni u 1.–4. času ≤ broj jutarnjih termina.
- **Nema predmeta > broja dana.** Ako predmet mora ≤1 dnevno, ne smije imati više
  časova nego što ima radnih dana (osim blokova).
- **Nacharbeit staje u 6./7. čas** kao sufiks (dnevni blok na kraju), po nosiocu.
- **Razrednik može dostići dnevni kontakt** — provjeriti za svaki razred; gdje ne
  može (specijalista), **eksplicitno označiti izuzetak** i pitati korisnika.

Ako neka provjera padne → **ne računati**, nego javiti korisniku šta popustiti.

### FAZA 4 — Rješavanje (CP-SAT)
Tek sada se poziva `solver.solve_timetable(config)`. Sva tvrda pravila su
ograničenja; meki ciljevi (zbijenost, balans, lakši predmeti kasnije) su
funkcija cilja. (Detalji u `solver.py` i `config_schema.md`.)

### FAZA 5 — Validacija (obavezno, automatski)
Nakon rješavača **uvijek** pokrenuti `validators.validate(lessons, config)`.
Ako vrati bilo koju grešku → to je bug u modelu/podacima, ne prikazivati
korisniku kao gotov raspored. Provjere: 0 preklapanja (razred i nastavnik),
matematika/njemački u 1.–4., Nacharbeit 6./7. i na kraju dana, svaki predmet
≤1/dan (osim blokova), blokovi vezani, razrednik svaki dan, tačan broj časova.

### FAZA 6 — Izlazi
`exports.export_excel(...)` → dvije mreže (po nastavniku, po razredu).
`exports.export_report(...)` → narativni izvještaj (.docx). Bez PDF-a.

### Iterativna petlja (dorada)
Raspored se rijetko dobije iz prve. Poslije prikaza, korisnik traži korekcije
(„glavni predmeti ujutru", „razrednik svaki dan", „bez velikih rupa"). Svaka
korekcija se vrati u **Fazu 1–3** (novo pravilo → provjera izvodivosti → ponovno
računanje). Sistem to mora podržati bez gubljenja prethodne konfiguracije.

---

## 2. Taksonomija pravila (šta je tvrdo, šta meko)

**TVRDA pravila (ograničenja — moraju uvijek vrijediti):**
- svaki razred ima tačno zadani broj časova (IDSS: 35);
- matematika i njemački samo u 1.–4. času;
- Nacharbeit samo u 6./7. času i uvijek na kraju dana (svi ostali predmeti prije);
- svaki predmet najviše jednom dnevno po razredu — **osim** Sporta (1.–9.) i
  likovnog/Kunst (1.–4.), koji su blok od 2 vezana časa;
- honorarni nastavnici na svojim fiksnim terminima;
- nijedan nastavnik u dva razreda istovremeno (spojeni čas = isti nastavnik/predmet
  za dva razreda = dozvoljeno);
- razrednik svaki dan sa svojim razredom (za razrede gdje je to izvodivo; ostali
  su označeni izuzeci).

**MEKA pravila (ciljevi — optimizuju se, ne moraju biti savršena):**
- nastavnici bez velikih rupa između časova (zbijenost);
- ravnomjeran dnevni raspored (bez „5 časova pa sutra 1");
- lakši/nejezički predmeti u kasnijim terminima, glavni ranije.

Ako se dva **tvrda** pravila strukturno sudare, to nije bug nego kompromis koji
**bira korisnik** (primjer IDSS: „glavni predmeti ujutru" + „Nacharbeit na kraju"
nužno ostavljaju prazan srednji čas nastavniku koji radi oboje).

---

## 3. Kako aplikacija reprodukuje ovaj proces

- **Wizard (Faze 0–2)**: niz ekrana s pitanjima koji pune `config` i, na svakom
  koraku, pokreću provjere kontradikcija/praznina i traže odgovor. UI ne dozvoljava
  „Generiši" dok Faza 3 (izvodivost) ne prođe.
- **Dugme „Generiši" (Faza 4–5)**: backend poziva `solve_timetable` pa `validate`.
  Ako validacija nije čista → poruka o grešci, ne raspored.
- **Prikaz i izvoz (Faza 6)**: mreže + izvještaj + dugme za izvoz.
- **Sačuvaj/Učitaj**: `config` se izvozi/uvozi kao JSON (bez baze) — to je
  „pamćenje" prošlih godina i osnova za sljedeću.

> Napomena o „učenju": CP-SAT je determinističan — sistem ne postaje pametniji
> od sačuvanih rasporeda. Vrijednost čuvanja je **ponovna upotreba i historija**,
> ne mašinsko učenje.
