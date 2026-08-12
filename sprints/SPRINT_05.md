# SPRINT_05 — Vizuelna nadogradnja (UI/UX, bez dodira backend-a)

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 04 završen (drag-and-drop, dashboard, loader overlay)
# NAPOMENA: čisto frontend — App.jsx, Wizard.jsx, styles.css. Backend
# (solver.py, validators.py, exports.py, main.py) se NE DIRA (P-3).

---

## DIZAJN TOKENI (izvedeno isključivo iz zvanične palete)

```css
:root{
  --navy:#035EA1;      /* primarno: zaglavlja, glavna dugmad */
  --sky:#08ABE6;        /* sekundarno: "prihvaćeno", hover akcenti */
  --yellow:#FFCB29;     /* pažnja/istaknuto, NE za greške */
  --red:#E8262C;        /* greške, odbijanja, destruktivne akcije */
  --ink:#000000;        /* tekst */
  --surface:#EAF2FA;    /* neumorfna podloga — svijetla, plavkasto-siva iz navy */
  --shadow-light:#FFFFFF;
  --shadow-dark:#C9D9E8;
  --font-display: 'Manrope', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
}
/* Neumorfna "podignuta" površina (kartice, dugmad u mirovanju): */
.neu-raised{
  background: var(--surface);
  box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
  border-radius: 20px;
}
/* Neumorfna "utisnuta" površina (aktivno/pritisnuto stanje): */
.neu-pressed{
  background: var(--surface);
  box-shadow: inset 6px 6px 12px var(--shadow-dark), inset -6px -6px 12px var(--shadow-light);
  border-radius: 20px;
}
```

## OPSEG — konkretne stavke

### 1. Neumorfni "verdict" prozor (SIGNATURE element — najviše pažnje ovdje)
Zamijeni trenutni tekstualni `moveError`/uspjeh ispis velikim, plutajućim,
centriranim neumorfnim prozorom koji se pojavi nakon SVAKE odluke backend-a
(prihvaćena/odbijena izmjena rasporeda, uspješan/neuspješan Generiši):

- **Odbijeno**: `.neu-raised` kartica, tanka `--red` ivica (2px), veliki ⊘ ili
  ✕ simbol u `--red`, naslov "Nije moguće" (podebljano, `--font-display`),
  ispod njega tačan razlog iz `validate()` (isti tekst kao sada, samo bolje
  prezentovan — svaka stavka kao zaseban red s malom crvenom tačkom ispred).
- **Prihvaćeno**: ista kartica, tanka `--sky` ivica, veliki ✓ u `--sky`,
  naslov "Prihvaćeno" ili "Raspored generisan".
- Ulazna animacija: blag scale (0.92→1) + fade, ~200ms, JEDNA orkestrirana
  gesta — ne više odvojenih animacija. Nestaje na klik izvan kartice ili
  automatski nakon ~4s za uspjeh (greške ostaju dok korisnik ne zatvori —
  greška se ne smije sama izgubiti).
- Koristi isti `--surface`/sjenke sistem kao loader overlay iz Sprint 04,
  da djeluju kao ista porodica komponenti.

### 2. Grab-hand kursor za drag-and-drop
Na časove koji se mogu prevući (`canDrag` u Grid komponenti):
- `cursor: grab` pri hover-u
- `cursor: grabbing` tokom aktivnog prevlačenja
- Blag "lift" na hover (`transform: translateY(-2px)` + pojačana sjenka iz
  `.neu-raised`) — vizuelno govori "ovo se može podići" prije nego korisnik
  uopšte proba, bez čekanja na tooltip.

### 3. Dosljedna neumorfna porodica (restraint — mirno, ne upadljivo)
Primijeni `.neu-raised`/`.neu-pressed` NA POSTOJEĆE elemente, bez mijenjanja
strukture: dugmad (mirovanje=raised, aktivno/klik=pressed), wizard kartice
po ekranima, red u tabeli nastavnika pri hover-u. Cilj: sve djeluje kao
jedna porodica, ne zakrpljeno.

### 4. Sitna dosljedna poboljšanja
- `font-variant-numeric: tabular-nums` na mreži rasporeda (brojevi časova
  se poravnaju kao prava tabela).
- Prazna stanja (nema nastavnika/predmeta u wizardu) dobijaju kratku
  instrukciju umjesto golog "Još nema..." — npr. "Još nema nastavnika —
  dodaj prvog iznad ↑".
- Vidljivo tastaturno fokusiranje (`:focus-visible` prsten u `--sky`) na
  svim interaktivnim elementima — pristupačnost, ne kozmetika.
- Dashboard: trake opterećenja u `--navy`, najopterećeniji red istaknut
  tankom `--yellow` linijom (ne crvenom — to nije greška, samo info).

### 5. Zaglavlje — logo i naslov (dodano naknadno, isti sprint)
Novo zaglavlje, jedan red, ISTA visina za logo i naslov:
- **Lijevo**: logo škole, https://idss.edu.ba/wp-content/uploads/2024/03/logo_white.png
  (bijela verzija — pasuje na `--navy` pozadinu zaglavlja koja već postoji).
  Razumna visina (npr. 40–48px), `alt="IDSS logo"`.
- **Centar** (iste visine kao logo, vertikalno poravnato): naslov aplikacije
  "Raspored časova za IDSS" — zamjenjuje trenutni "IDSS — Raspored časova".
- Layout: flex red, logo lijevo, naslov centriran (npr. `position:absolute;
  left:50%; transform:translateX(-50%)` unutar relativno pozicioniranog
  zaglavlja, ili flex sa tri kolone gdje je srednja `flex:1;text-align:center`
  i lijeva/desna jednake širine radi balansa).

### 6. Ukloniti sve interne/developerske tragove iz interfejsa
Trenutni podnaslov "Sprint 02 · Wizard za unos config-a · USTAV Faze 0–3"
(i bilo šta slično — reference na Sprint/USTAV/Fazu) **mora nestati** iz
onoga što korisnik vidi. To je interna projektna referenca, ne nešto što
direktor/nastavnik treba vidjeti u alatu koji koriste.

### 7. Potpuna revizija teksta u aplikaciji
Proći kroz SVAKI tekst koji korisnik vidi (dugmad, naslovi ekrana u
wizardu, poruke grešaka/uspjeha, tooltip-ovi, prazna stanja, dashboard
oznake) i potvrditi/ispraviti da je: (a) profesionalno napisan, ispravnim
bosanskim jezikom, (b) bez internih referenci vidljivih korisniku, (c)
dosljedan po tonu kroz cijelu aplikaciju. Napraviti kratak popis šta je
mijenjano (za HANDOFF napomenu ispod), da Direktor može brzo pregledati
izmjene teksta bez čitanja cijelog koda.

**VAN OPSEGA:** bilo šta u `solver.py`/`validators.py`/`exports.py`/`main.py`;
promjena strukture podataka; mobilni/responsive raspored (posebna tema).

## KRITERIJI PRIHVATANJA
```
☑ Odbijena izmjena prikazuje veliki centriran neumorfni prozor s crvenom
  ivicom, ⊘ simbolom, i tačnim razlogom — ne nestaje sam
  (potvrđeno uživo, 2026-08-12)
☑ Prihvaćena izmjena prikazuje isti stil prozora, plava (--sky) ivica,
  ✓ simbol (potvrđeno uživo, 2026-08-12)
☑ Prevlačiv čas ima grab kursor na hover, grabbing tokom prevlačenja
  (potvrđeno u stylesheet-u, 2026-08-12)
☑ Dugmad i kartice koriste dosljedan neumorfni stil (raised/pressed)
  (potvrđeno uživo getComputedStyle, 2026-08-12)
☑ Brojevi u mreži rasporeda su poravnati (tabular-nums)
  (potvrđeno uživo, 2026-08-12)
☑ Tastaturni fokus vidljiv (Tab kroz stranicu, prsten se vidi) —
  CSS pravilo potvrđeno u stylesheet-u; live potvrda blokirana
  ograničenjem test okruženja (nema window fokusa) — vidi Open risks
☑ SVE boje su isključivo iz zvanične palete + izvedeni neutralni tonovi
  (navy/sky/yellow/red/ink + --surface/--shadow-* izvedeni iz navy)
☑ Backend NETAKNUT — git diff --stat prazan za backend/ (potvrđeno)
☑ Logo (bijela verzija) vidljiv gore lijevo, ista visina kao naslov
  (potvrđeno uživo: logo i naslov na identičnoj Y=32px)
☑ Naslov "Raspored časova za IDSS" centriran, ista visina kao logo
  (potvrđeno uživo)
☑ Podnaslov "Sprint 02 · ..." i sve slične interne reference UKLONJENE
  (potvrđeno grep + live page text — 0 pogodaka u JSX tekstu)
☑ Popis izmijenjenih tekstova priložen uz HANDOFF (šta je mijenjano i zašto)
  — vidi listu od 28 stavki iznad
```

## HANDOFF NAPOMENA
```
HANDOFF NOTE — Sprint 05 (2026-08-12)

Completed:
- Dizajn tokeni (:root) + .neu-raised/.neu-pressed utility klase, primijenjene
  na dugmad (.secondary = pravi neumorfni raised/pressed; primarna navy
  dugmad zadržavaju puni ton uz mekanu neumorfnu sjenku), .wiz-panel,
  .block (kartice rasporeda/dashboarda), wiz-table red pri hover-u.
- Verdict prozor (VerdictModal, App.jsx) — signature element: prikazuje se
  nakon SVAKE odluke backenda (Generiši uspio/nije, pomjeranje prihvaćeno/
  odbijeno). Uspjeh nestaje sam nakon ~4s; greška ostaje dok je korisnik
  sam ne zatvori (klik izvan kartice ili na ✕). Zamijenio je stare tekstualne
  banner-e (moveError, post-solve errors lista, generate apiError).
- Grab/grabbing kursor + "lift" na hover za prevlačive časove (Grid).
- tabular-nums na mreži rasporeda i wizard/dashboard tabelama.
- Prazna stanja (6 mjesta u Wizard.jsx) dobila kratku uputu "dodaj
  prvog/prvi u formi iznad ↑" umjesto golog "Još nema...".
- :focus-visible prsten (--sky) globalno, na svim interaktivnim elementima.
- Dashboard: traka opterećenja u --navy (dužina ∝ časovi), najopterećeniji
  red istaknut tankom --yellow linijom (lijeva ivica prve ćelije).
- Zaglavlje: logo (bijela verzija, idss.edu.ba) lijevo + "Raspored časova
  za IDSS" centrirano, potvrđeno IDENTIČNO vertikalno centrirani (ista
  Y-koordinata, izmjereno uživo). Stari podnaslov "Sprint 02 · ..." UKLONJEN.
- Fontovi: Manrope (naslovi) + Inter (tekst) preko Google Fonts CDN-a
  (index.html <link>), javna SIL OFL licenca — potvrđeno da se stvarno
  učitavaju (document.fonts.check).
- Tekstualna revizija — popis SVIH izmijenjenih tekstova:

  App.jsx / index.html:
  1. <title> stranice: "IDSS — Raspored časova" -> "Raspored časova za IDSS"
  2. Naslov u zaglavlju: isto, sada uz logo (H1 "Raspored časova za IDSS")
  3. Podnaslov "Sprint 02 · Wizard za unos config-a · USTAV Faze 0–3" -> UKLONJEN
  4. Post-Generiši greške ("Validacija nije čista (N):" + lista) -> verdict
     prozor ("Raspored je generisan" / "Raspored nije moguć")
  5. Banner "Pomjeranje odbijeno — čas je vraćen na staro mjesto:" -> verdict
     prozor ("Promjena prihvaćena" / "Nije moguće")
  6. "Čas se može prevući samo unutar ISTOG razreda." -> "...unutar istog
     razreda." (malim slovima, sada u verdict prozoru)
  7. Hint "...backend provjerava ispravnost..." -> "...ispravnost se
     provjerava automatski..." (uklonjena riječ "backend")
  8. Greška veze pri Generiši: "Ne mogu se povezati s backendom (URL). Je
     li pokrenut?" -> "Provjeri internet vezu i pokušaj ponovo."
  9. Greška izvoza: "Izvoz nije uspio (HTTP 500)." -> "Izvoz nije uspio
     (greška 500)." / "...ne mogu se povezati s backendom..." -> "...provjeri
     internet vezu..."
  10. Dashboard: nova kolona "Opterećenje" (vizuelna traka, nije bila prije)

  Wizard.jsx:
  11. Ekran A hint: "USTAV Faza 0: broj dana, časova..." -> "Odredi broj
      dana i časova u sedmici, njihova vremena, te koji periodi su
      jutarnji, a koji za Nacharbeit..."
  12. Ekran B hint: "USTAV Faza 0/1: svi nastavnici..." -> "Unesi sve
      nastavnike, predmete sa kategorijom..."
  13. Tooltip "max_period... (config_schema.md: teacher_constraints)" ->
      uklonjena referenca na fajl
  14. Tooltip "Jutarnji SAMO u ovom razredu (config_schema.md: ...)" ->
      "Jutarnji samo u ovom razredu"
  15. Hint "...umjesto ovoga. (config_schema.md: morning_core_by_grade)" ->
      uklonjena referenca na fajl
  16. Ekran C hint: "USTAV Faza 1: ko je razrednik..." -> "Odredi ko je
      razrednik kojeg razreda..."
  17. Ekran D hint: "USTAV Faza 1: po razredu — broj Nacharbeit..." ->
      "Za svaki razred unesi broj Nacharbeit časova i ko ih vodi..."
  18. Naslov "Provjera izvodivosti (Faza 3)" -> "Provjera izvodivosti"
  19. Naslov sekcije "Rezultat backenda (POST /feasibility)" -> "Rezultat
      provjere" (uklonjen naziv endpointa)
  20. Fallback poruka "Provjeri da je backend pokrenut." -> "Sistem
      trenutno nije dostupan — pokušaj ponovo za koji trenutak."
  21. Naslov "Napredno — sirovi config (JSON)" -> "Napredno — podaci u
      sirovom obliku (JSON)"
  22. Hint "Ovdje vidiš TAČAN config koji wizard šalje backendu..." ->
      "Ovdje vidiš tačne podatke koje wizard koristi za izradu rasporeda..."
  23-28. Šest praznih stanja (nastavnici, predmeti, redovni časovi, fiksni
      termini, Nacharbeit časovi, razredi) -> dodata uputa "dodaj prvog/
      prvi u formi iznad ↑" ili "dodaj ih na Ekranu A ↑"

Testirano UŽIVO (Chrome preko Claude Browser alata, ne samo build-check):
- Header: logo učitan (potvrđeno document.fonts + Image.complete/natural
  dimenzije), logo i naslov na IDENTIČNOJ Y-koordinati (32px), podnaslov
  potvrđeno uklonjen iz DOM-a.
- Fontovi: Manrope 700/800 i Inter 400/600 potvrđeno "loaded" preko
  document.fonts API.
- Neumorfne sjenke: .wiz-panel, .block, dugmad — provjereno getComputedStyle
  (boja/sjenka/border-radius tačno kako je specificirano).
- BUG NAĐEN I POPRAVLJEN TOKOM TESTIRANJA: .neu-raised/.neu-pressed klase
  su bile korištene u JSX-u (verdict prozor) ali NISU bile definisane u
  CSS-u (samo spomenute u komentaru) — verdict prozor je prvi put bio bez
  pozadine/sjenke. Popravljeno dodavanjem stvarnih .neu-raised/.neu-pressed
  pravila; potvrđeno computed style nakon popravke.
- Verdict prozor: uživo isprovociran i USPJEH (validno pomjeranje časa —
  "Promjena prihvaćena", ✓, --sky ivica, auto-nestao nakon ~4s) i GREŠKA
  (nevaljano pomjeranje — "Nije moguće", ⊘, --red ivica, tačne poruke iz
  validate(), NIJE nestao sam, zatvoren i klikom van kartice i ✕ dugmetom).
- Grab/grabbing kursor i hover-lift pravilo potvrđeno u stylesheet-u.
- tabular-nums potvrđeno na mreži rasporeda i wizard tabelama.
- Dashboard trake: potvrđeno uživo — traka širine ∝ satima u --navy,
  najopterećeniji red (top-loaded) ima 3px --yellow lijevu ivicu, drugi
  red nema tu klasu.
- Prazna stanja: potvrđeno tekstom stranice (get_page_text) da nove upute
  stoje umjesto starog "Još nema...".
- Regresija: Generiši (0 grešaka), izvoz Excel (validan .xlsx blob,
  presretnut i provjeren), drag-and-drop validacija i dalje ispravno
  odbija/prihvata — sve i dalje radi nakon svih vizuelnih izmjena.
- npm run build: čist. Backend NETAKNUT (git diff --stat prazan za backend/).

Not completed: ništa iz OPSEG-a.

Open risks:
- :focus-visible prsten je potvrđen STATIČKI (pravilo postoji ispravno u
  stylesheet-u), ali NIJE mogao biti potvrđen UŽIVO kroz automatizovani
  test — headless/prikaz-isključen browser okruženje nema pravi window
  fokus (document.hasFocus() vraća false), pa se :focus/:focus-visible
  pseudo-klase ne aktiviraju kroz automatizaciju. Ovo je poznato
  ograničenje test okruženja, ne CSS-a — pravi korisnik koji tabuje kroz
  stranicu u pravom (fokusiranom) prozoru browsera će vidjeti prsten.
  Preporuka: Direktor sam pritisne Tab par puta na živom sajtu da vizuelno
  potvrdi, kad bude imao priliku.
- Fontovi (Manrope/Inter) učitavaju se sa Google Fonts CDN-a — zahtijeva
  internet vezu pri prvom učitavanju stranice (uobičajeno, isto kao
  slika/logo); nema licencnog rizika (SIL Open Font License, besplatno).
- Logo se učitava direktno sa idss.edu.ba (hotlink) — ako škola promijeni
  URL slike na svom sajtu, logo bi nestao. Alternativa (kopirati sliku u
  repo) razmotrena ali nije zatražena; jednostavno za promijeniti kasnije
  ako zatreba.

Next: TBD po dogovoru s Direktorom
```
