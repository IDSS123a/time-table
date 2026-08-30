# DECISION_LOG.md — Project: IDSS Timetable

## DL-001 — Backend stack: Python/FastAPI umjesto Next.js Server Actions

**Datum:** 2026-08
**Odlučio:** Direktor (Davor Mulalić), na preporuku Claude
**Kontekst:** Commander default stack je Next.js + Server Actions + Vercel
(M-16 pretpostavka). Ovaj projekat treba rješavač ograničenja
(constraint solver) za raspoređivanje časova.

**Odluka:** Koristiti Google OR-Tools CP-SAT (Python biblioteka) kao
motor za raspoređivanje, hostovan u zasebnom Python/FastAPI backendu
(Docker, Cloud Run ili Railway), umjesto pokušaja da se logika napiše
u TypeScript/Next.js.

**Razlog:**
1. OR-Tools nema podržan/pouzdan JavaScript/TypeScript ekvivalent za
   CP-SAT (constraint programming) kvalitete potrebne za ovaj problem.
2. Vercel Serverless/Edge funkcije i Supabase Edge Functions imaju
   vremenska/memorijska ograničenja neprikladna za CP-SAT pretragu.
3. Rješavač je već napisan, testiran i provjeren na stvarnim IDSS
   podacima (vidi README.md, "SVE RADI" test) — prepisivanje na drugi
   jezik bi ponovo uvelo rizik grešaka bez ikakve koristi.

**Posljedice:**
- Frontend je React + Vite (ne Next.js), jer nema potrebe za Next.js
  Server Components/Actions kad backend ionako nije u Next.js procesu.
- Deployment zahtijeva DVA hostinga (frontend + backend), ne jedan
  Vercel deployment.
- Svi budući ACA na ovom projektu MORAJU poštovati ovu odluku (M-16) —
  ne predlagati migraciju na Next.js/Server Actions bez nove odluke
  Direktora zapisane ovdje.

**Status:** Aktivno, potvrđeno.

## DL-002 — Vercel Password Protection na frontendu (produkcija)

**Datum:** 2026-08-10
**Odlučio:** Direktor (Davor Mulalić)
**Kontekst:** Sprint 03 (deployment) — app sadrži stvarne IDSS podatke o
nastavnicima (imena, raspored, opterećenje). Frontend (Vercel) i backend
(Railway) postaju dostupni s javnog interneta.

**Odluka:** Frontend MORA imati lozinku. Prvobitni plan (ugrađena Vercel
Password Protection, Project Settings → Deployment Protection) je odbačen
prilikom izvršenja — ta opcija zahtijeva Pro plan + Advanced Deployment
Protection ($150/mjesečno), što Direktor NIJE odobrio ("Rekli smo da idemo
besplatno"). Umjesto toga implementirana je **HTTP Basic Auth kroz Vercel
Edge Middleware** (`frontend/middleware.js`) — besplatna na svim planovima,
provjera se dešava na serveru prije slanja bilo kojeg fajla, lozinka je u
Vercel environment varijabli `SITE_PASSWORD` (ne u kodu/git-u). Backend
(Railway) ostaje bez lozinke — nije praktično koristan bez wizarda ispred
njega, a `ALLOWED_ORIGINS` je sužen na tačan Vercel URL (ne `*`).

**Posljedice:**
- Lozinka se unosi kroz nativni browser prozorčić (HTTP Basic Auth), ne
  kroz prilagođenu formu — jednostavnije za implementirati, jednako
  sigurno (server-side provjera), samo drugačiji izgled od Vercel-ove
  ugrađene opcije.
- Direktor mora unijeti lozinku prilikom svakog otvaranja frontend URL-a
  (i podijeliti je samo s ovlaštenim licima — ne stavljati je u README.md
  ili commit history).
- NAPOMENA (otkriveno prilikom izvršenja Sprinta 03): GitHub repo
  `IDSS123a/time-table` je JAVAN (public). `idss_config.example.json`
  (u oba `backend/` i `frontend/src/`) sadrži stvarna imena nastavnika —
  ta imena su već javno vidljiva preko GitHub-a, NEZAVISNO od Vercel
  Password Protection na frontendu. Password Protection štiti pristup
  wizardu/rasporedu, ali NE štiti podatke koji su već u javnom repou.
  Ovo je zapisano ovdje radi transparentnosti (M-4/M-10); odluka o tome
  da li repo treba postati privatan ili primjer treba anonimizirati
  ostaje na Direktoru.

**Status:** Aktivno, potvrđeno i TESTIRANO end-to-end (2026-08-10) — Direktor
je učitao config, generisao raspored i izvezao Excel na živom (Vercel+Railway)
sajtu, iza lozinke. Otvoreno pitanje: javnost repoa — vidi napomenu iznad.

## DL-003 — HTTP Basic Auth direktno na backendu (main.py)

**Datum:** 2026-08-10
**Odlučio:** Direktor (Davor Mulalić) — prijavio sigurnosnu rupu nakon Sprint 03
**Kontekst:** Sprint 03 je zaštitio SAMO frontend (Vercel middleware). Railway
backend URL je ostao potpuno otvoren — `ALLOWED_ORIGINS` (CORS) sprečava
samo pozive iz browsera; direktan poziv (curl, skripta) ga u potpunosti
zaobilazi i mogao je pozvati `/solve`, `/export/excel`, `/export/report`
bez ikakve lozinke, mimo wizarda.

**Odluka:** Dodan HTTP Basic Auth direktno u `backend/main.py` (FastAPI
`Depends`) na SVAKI endpoint OSIM `/health` (health-check/monitoring i dalje
radi bez lozinke). Lozinka: nova env varijabla `BACKEND_PASSWORD` na
Railway-u (odvojena od Vercel-ovog `SITE_PASSWORD` jer su to dvije odvojene
platforme/sistemi za env varijable), frontend je šalje automatski kroz
`VITE_BACKEND_PASSWORD` (Vercel, build-time, isti mehanizam kao
`VITE_API_URL`). Fail-closed: ako `BACKEND_PASSWORD` nije podešen na
Railway-u, SVI zaštićeni pozivi vraćaju 500 (server odbija sve, ne propušta
ništa bez provjere) — testirano lokalno.

**Zašto je OK da vrijednost `BACKEND_PASSWORD` = `SITE_PASSWORD` (preporuka,
ne obaveza):** Frontend je Vite SPA — SVAKA `VITE_`-prefiksovana varijabla
se ugrađuje kao čist tekst u JS fajl koji se šalje browseru. To znači da
`VITE_BACKEND_PASSWORD` NIJE tajna za nekoga ko već ima pristup frontendu
(dev alati/"view source" je otkrivaju) — ali da bi neko uopšte DOŠAO do tog
JS fajla, prvo mora proći Vercel Basic Auth (DL-002), za šta mu treba
`SITE_PASSWORD`. Dakle korištenje iste vrijednosti ne otvara ništa novo:
ko god zna `SITE_PASSWORD` može otvoriti wizard i legalno raditi sve isto
preko UI-ja; razlika je samo da tehnički može i direktno pozivati API.
Prava rupa koju ovo zatvara je neko ko NE zna nijednu lozinku, a slučajno
sazna goli Railway URL (npr. iz javnog GitHub repoa/README-a).

**Posljedice:**
- main.py dotaknut (dozvoljeno — P-3 zabranjuje logiku u solver.py/
  validators.py/exports.py, ne konfiguraciju u main.py).
- App.jsx fetch pozivi šalju `Authorization: Basic` header automatski.
- Direktor mora postaviti `BACKEND_PASSWORD` (Railway) i
  `VITE_BACKEND_PASSWORD` (Vercel) — vidi HANDOFF u `sprints/SPRINT_03.md`.
- Lokalni razvoj (`uvicorn main:app --reload` bez env varijable) sada vraća
  500 na zaštićenim endpointima — namjerno (fail-closed); postaviti
  `BACKEND_PASSWORD` lokalno za razvoj ako treba testirati te pozive.

**Status:** Implementirano i TESTIRANO NA ŽIVOM (Railway) URL-u (2026-08-10):
- Direktan poziv (curl, bez lozinke) na `/feasibility`, `/solve`,
  `/export/excel` → 401, mimo browsera/wizarda. Rupa zatvorena.
- `/health` bez lozinke i dalje 200 (monitoring OK).
- Usput otkriveno i ispravljeno: `BACKEND_PASSWORD` je prvo greškom dodan
  u Railway "Shared Variables" umjesto u Variables tog servisa — env
  varijabla zbog toga nije stizala do aplikacije (fail-closed je ispravno
  vraćao 500). Nakon premještanja u servisne Variables, radi.
- Direktor potvrdio end-to-end kroz wizard (sa tačnom lozinkom): generisan
  raspored, izvezen Excel — normalan tok nije narušen.

## DL-004 — Nacharbeit preraspodjela (Semra → Tamara Mayer, 4. razred) + B/H/S i Englisch jutarnji i za 3. razred

**Datum:** 2026-08-10
**Odlučio:** Direktor (Davor Mulalić), nakon konsultacije sa Tamarom Mayer
**Kontekst:** Tamara Mayer može preuzeti TAČNO 2 dodatna Nacharbeit časa.

**Odluka:** U `idss_config.example.json` (backend/ i frontend/src/, identični):
- Nacharbeit unos za 4. razred (2 časa) prebačen sa "Semra Isanović" na
  "Tamara Mayer". Njen drugi Nacharbeit unos (3. razred, 6 časova) ostaje
  nepromijenjen.
- `morning_core_by_grade` proširen sa `{"B/H/S":[1,2,4],"Englisch":[1,2,4]}`
  na `{"B/H/S":[1,2,3,4],"Englisch":[1,2,3,4]}` — B/H/S i Englisch sada
  jutarnji i za 3. razred.
- SAMO promjena podataka u config fajlu — solver.py/validators.py/
  exports.py/main.py NETAKNUTI (P-3).

**Provjereno (solve_timetable na ažuriranom configu, 90s limit):**
- `validate_config`: 0 problema (izvodivo)
- `solve_timetable`: ok=True, status=FEASIBLE
- `validate()` nakon solve: 0 grešaka
- B/H/S i Englisch: 0 pojavljivanja u 6./7. času za razrede 1–4
- Semra Isanović: 22 časa (bilo 24); Tamara Mayer: 7 časova (bilo 5)
- Excel izvoz: uspio, validan (2 lista)

**Status:** Aktivno, potvrđeno i testirano.

## DL-005 — Sprint 08 sigurnosni audit: nalazi i popravke

**Datum:** 2026-08-13
**Kontekst:** Rutinski sigurnosni audit produkcije (sprints/SPRINT_08.md),
7 stavki, provjereno uživo na živom Railway/Vercel gdje god je bilo moguće
bez rukovanja stvarnom lozinkom (ne rukujem lozinkama — vidi napomenu niže).

**Nalazi i odluke:**
1. **Rate-limiting nije postojao** — dodano u `main.py`: in-memory brojač
   neuspjelih pokušaja prijave po IP adresi (X-Forwarded-For), max 10 u 5
   minuta, potom 429. Uspješna prijava briše brojač za taj IP. Testirano
   uživo (lokalno, isti kod kao produkcija): 10× pogrešna lozinka → 401,
   11. → 429; tačna lozinka odmah nakon par pogrešnih i dalje prolazi
   (200) dok se prag ne dostigne.
2. **`/docs`, `/openapi.json`, `/redoc` bili javno dostupni bez lozinke**
   (FastAPI ih sam generiše; `require_auth` je bio vezan PO RUTI, ne
   globalno, pa framework-generisane rute nisu bile obuhvaćene). Popravka:
   potpuno isključeni (`docs_url=None, redoc_url=None, openapi_url=None`)
   — frontend ne treba interaktivnu dokumentaciju, najjednostavnije i
   najsigurnije je ugasiti ih. Potvrđeno uživo prije popravke (200 na sva
   tri, `/openapi.json` vraćao punu šemu API-ja) i lokalno poslije (404).
3. **Formula injection u Excel izvozu (`exports.py`) — STVARAN mehanizam
   rizika potvrđen** (openpyxl string koji počinje sa `=` tretira kao
   formulu). Prijavljeno Direktoru s preporukom (apostrof-prefiks escape
   prije upisa u ćeliju); Direktor odobrio 2026-08-13 ("Odobravam popravku
   Excel formula injection-a — dodaj apostrof zaštitu kako si predložio").
   **Implementirano:** dodana `_safe()` funkcija u `exports.py` — svaki
   string koji počinje sa `=`, `+`, `-` ili `@` dobija apostrof-prefiks
   prije upisa u ćeliju (brojevi/None prolaze nepromijenjeno). Primijenjeno
   na svih 8 mjesta u `export_excel` gdje tekst iz config-a/lekcija ide u
   ćeliju (zaglavlje nastavnika, nazivi dana, vremena časova, sadržaj
   ćelije po nastavniku, zaglavlje razreda/razrednik, sadržaj ćelije po
   razredu). `export_report` (.docx) namjerno NIJE dirana — Word ne
   izvršava vodeće `=`/`+`/`-`/`@` kao formulu, pa rizik ne postoji tamo.
   Testirano lokalno: zlonamjerni unosi (`=SUM(...)`, `+HACK`, `-x`,
   `@SUM(1)`) u imenima nastavnika, predmeta, dana i vremena časova —
   svi dobijaju apostrof u izlaznom `.xlsx`-u (potvrđeno čitanjem fajla
   nazad kroz openpyxl, 0 nezaštićenih ćelija u adversarial test config-u);
   benigni unosi (obična imena, dani, vremena) ostaju nepromijenjeni;
   puna regresija sa stvarnim 9-razrednim config-om (315 časova) — i
   `export_excel` i `export_report` i dalje rade bez greške. `git diff
   --stat` potvrđuje da su promijenjeni SAMO redovi u `exports.py`;
   `solver.py`/`validators.py` netaknuti.
4. Sve ostalo provjereno ČISTO na živoj produkciji ili lokalno (identičan
   kod, gdje je autentifikacija spriječila test na produkciji bez
   rukovanja stvarnom lozinkom): HTTPS enforced (Railway 301, Vercel 308),
   `ALLOWED_ORIGINS` tačan (lažan Origin → CORS odbijen, pravi Vercel
   Origin → dozvoljen), fail-closed auth i dalje radi, malformisan/
   ekstreman JSON (prazno tijelo, nevaljan JSON, string umjesto objekta,
   100.000-karakterni string, 20.000 nivoa ugniježđen JSON, negativni
   brojevi, SQL/script injection stringovi kao imena) — svi vraćaju čiste
   poruke bez Python stack trace-a/putanja/verzija biblioteka, bez pada
   servera. `npm audit` (frontend): 2 poznata nalaza, oba u esbuild/vite
   RAZVOJNOM serveru (ne produkcijski build), postojala prije ovog
   sprinta, popravka bi tražila breaking vite upgrade — NIJE urađena bez
   javljanja. `pip-audit -r requirements.txt` (backend): 0 poznatih
   ranjivosti.
5. **Napomena o metodologiji:** ne rukujem stvarnim produkcijskim
   lozinkama (BACKEND_PASSWORD/SITE_PASSWORD) — ni da ih tražim od
   Direktora, ni da ih unosim. Zbog toga su testovi koji zahtijevaju
   VALJANU autentifikaciju (curenje informacija na zaštićenim rutama,
   injection napadi na /solve i /feasibility) rađeni protiv LOKALNE
   instance sa IDENTIČNIM kodom kao produkcija (main.py/solver.py/
   validators.py bez razlike po okruženju) — rezultati su reprezentativni
   za produkciju. Testovi koji NE zahtijevaju auth (401/429 ponašanje,
   CORS, HTTPS, /docs izloženost, /health) rađeni su direktno protiv
   živog Railway/Vercel URL-a.
6. Repo je i dalje javan (DL-002) — Direktor je već ranije svjesno
   odlučio da ostane tako (2026-08-10); ovaj audit samo ponavlja
   podsjetnik, ne mijenja odluku.

**Status:** Sve tri popravke (#1 rate-limit, #2 /docs isključivanje, #3
exports.py formula injection) implementirane i testirane lokalno,
spremne za push.

## DL-006 — Sprint 09: neumorfni login ekran zamjenjuje Vercel middleware

**Datum:** 2026-08-13
**Kontekst:** Direktor je tražio ljepši, prilagođen ekran za prijavu (i
dalje JEDNA zajednička lozinka, ne pravi višekorisnički sistem) umjesto
native browser Basic Auth prozorčića koji je do sada iskakao PRIJE nego
se React app uopšte učita (`frontend/middleware.js`, Vercel Edge
Middleware, vidi DL-002).

**Promjena mehanizma (svjesna, ne slučajna):**
- `frontend/middleware.js` (Vercel Edge Middleware, `SITE_PASSWORD`)
  UKLONJEN. Posljedica: statički frontend fajlovi (HTML/JS/CSS) su sada
  javno dostupni bez lozinke — bilo ko može otvoriti sajt i VIDJETI
  prazan login ekran/JS bundle. Ovo je NAMJERNO i u skladu sa sprint
  zahtjevom ("stvarna zaštita ostaje na backend Basic Auth, ovo je samo
  promjena KAKO se lozinka traži").
- STVARNA sigurnosna granica ostaje ISTA: backend `require_auth`
  (main.py, DL-003/DL-005) i dalje štiti svaki endpoint osim `/health` —
  bez tačne lozinke se ne može ni provjeriti izvodivost, ni generisati
  raspored, ni izvesti fajl. Rate-limit (DL-005 #1) i dalje važi.
- Dodan `GET /verify-auth` (main.py) — tanka omotnica oko POSTOJEĆEG
  `require_auth`, ista sigurnosna logika, nema nove provjere.
- Frontend: build-time ugrađena lozinka (`VITE_BACKEND_PASSWORD`,
  Vercel env var) UKLONJENA — bila je vidljiva u javnom JS bundle-u
  (svako ko otvori dev tools/view-source može je pročitati). Ovo je
  usput i sigurnosno poboljšanje, ne samo kozmetička promjena. Zamijenjena
  in-app login ekranom (`LoginScreen`, App.jsx) — lozinka se unosi pri
  svakoj novoj sesiji, čuva SAMO u `sessionStorage` (briše se kad se tab
  zatvori), i šalje kao Basic Auth header uz svaki poziv backendu.
- Ako backend ikad vrati 401 na autentifikovan poziv (npr. Direktor
  promijeni `BACKEND_PASSWORD` dok je neki tab već otvoren), frontend
  automatski odjavljuje (briše sessionStorage, vraća login ekran) umjesto
  da app ostane "zaglavljena" uz pogrešne poruke o grešci veze —
  testirano uživo (vidi HANDOFF sprints/SPRINT_09.md).
- Korisničko ime na login ekranu je čisto kozmetičko — ne šalje se
  backendu, ne provjerava se (isto kao i ranije).

**Posljedica za Vercel env varijable:** `SITE_PASSWORD` i
`VITE_BACKEND_PASSWORD` više se NE koriste (middleware i build-time
ugrađivanje su uklonjeni) — mogu se obrisati iz Vercel Project Settings
radi urednosti, nije hitno/obavezno (ne štete ako ostanu, samo su mrtav
kod). `BACKEND_PASSWORD` (Railway) OSTAJE jedina stvarna lozinka koja
nešto štiti.

**Testirano lokalno (backend na localhost:8080, frontend dev server):**
netačna lozinka → verdict prozor "Netačna lozinka" (isti stil kao
odbijena izmjena rasporeda), forma ostaje; tačna lozinka → app se
prikazuje; sessionStorage (NE localStorage) čuva lozinku; reload istog
taba NE traži login ponovo (tiha provjera sačuvane lozinke prije prikaza);
promjena `BACKEND_PASSWORD` na backendu dok je tab otvoren → sljedeći
poziv (automatska provjera izvodivosti) vraća 401 → app automatski
odjavljuje i vraća login ekran, sessionStorage očišćen; ponovna prijava
novom lozinkom radi. Mobilni prikaz (375px) provjeren — kartica se
uklapa bez horizontalnog overflow-a. `git diff --stat`: samo
`.claude/launch.json`, `backend/main.py`, `frontend/src/App.jsx`,
`frontend/src/styles.css` promijenjeni + `frontend/middleware.js`
obrisan; `solver.py`/`validators.py`/`exports.py` netaknuti.

**Preostalo (nije kod, Direktorova radnja):** promjena vrijednosti
`BACKEND_PASSWORD` na Railway-u — vidi HANDOFF u sprints/SPRINT_09.md
za korak-po-korak uputstvo.

## DL-007 — Sprint 10: filigransko poliranje (nalazi i popravke)

**Datum:** 2026-08-13
**Kontekst:** Završni pregled postojećeg dizajna (Sprint 05/06/07/09),
BEZ novog dizajna — "sve tačno poravnato, dosljedno, bez sitnih
nesavršenosti" (sprints/SPRINT_10.md). Backend NIJE dirano (potvrđeno
`git diff --stat` — samo `frontend/src/App.jsx`, `Wizard.jsx`,
`styles.css` promijenjeni).

**Nalazi i popravke (konkretni, provjerljivi — ne subjektivna nagađanja):**
1. **Boja van zvanične palete** — `#1a7a3a` (zelena) korištena za "✓
   Izvodivo"/"tačno" tekst u wizardu (`wiz-summary .ok`, i inline u
   Wizard.jsx za razliku sume časova) — jedina boja u cijeloj aplikaciji
   koja nije izvedena iz palete (navy/sky/yellow/red/ink). Popravka:
   zamijenjena sa `var(--sky)`, koji već nosi značenje "prihvaćeno/
   uspjeh" u VerdictModal-u — dosljednije semantički, ne samo vizuelno.
   Potvrđeno uživo: computed color sada `rgb(8,171,230)` (= --sky) na
   svih 9 redova provjere izvodivosti.
2. **`.chip` (chip-dugmad — periodi, blok/jutarnji razredi, razrednik
   svaki dan) nije imao NIKAKVO hover stanje** — jedini klikabilni tip
   elementa u aplikaciji bez vizuelne povratne informacije na hover, za
   razliku od `button` i draggable ćelija. Dodano: lift + sjenka na
   hover, tranzicija (isti obrazac kao dugmad, .12s ease).
3. **`.wiz-step` (koraci wizarda A–Napredno) bili su obični `<div>` bez
   hover stanja I bez tastaturnog pristupa** — nisu se mogli dosegnuti
   Tab-om niti aktivirati Enter/Space (samo klik mišem/dodirom). Popravka:
   `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space), `aria-
   current` za aktivni korak, + hover stil. Potvrđeno uživo: koraci se
   sada čitaju kao `button` u accessibility stablu.
4. **Nedosljedne ikonice na dugmadima iste kategorije akcije** — "Izvezi
   Excel"/"Izvezi izvještaj" nisu imali ikonicu dok "⬇️ Izvezi CSV" (u
   dashboardu, ista kategorija — preuzimanje fajla) jeste. Popravka:
   dodato ⬇️ objema, dovršava već postojeći obrazac (ne novi), isti kao
   💾/📂 na Sačuvaj/Učitaj.

**Provjereno uživo (lokalni backend + frontend dev server), bez nalaza
koji bi tražili izmjenu:**
- Svih 6 koraka wizarda (A–Napredno) + login ekran + mreža rasporeda
  (po razredu i po nastavniku) + dashboard opterećenja — BEZ horizontalnog
  document-level overflow-a na 375px i 1280px (provjereno skriptom koja
  poredi `document.documentElement.scrollWidth` sa `window.innerWidth`
  na svakom ekranu; tabele unutar `.wiz-panel`/`.block` namjerno
  horizontalno skroluju SAMO unutar svog kontejnera — Sprint 06 odluka,
  ne bug).
- Puna regresija: pravi 9-razredni config (real solve, 315 časova) +
  verdict prozor (uspjeh) + mreža + dashboard — sve renderuje ispravno.
- Loader overlay, verdict prozor (uspjeh/greška), login ekran — vizuelno
  pregledani, dosljedni sa ostatkom (isti neumorfni obrazac, ista paleta).

**Nije mijenjano (van opsega ili nedovoljno objektivno da se mijenja bez
Direktorovog estetskog suda):**
- Razmaci (padding/margin/border-radius) VARIRAJU kroz aplikaciju (npr.
  border-radius 5px/6px/8px na različitim malim elementima) — organski
  nastalo kroz Sprint 02–09, ali razlika je ispod praga vizuelne
  percepcije i puna standardizacija bi rizikovala nepotrebne regresije
  bez jasne dobiti. Nije dirano.
- Emoji/simboli izbor (💾📂✅🔄📊⬇️ nasuprot ✓⊘ u verdict prozoru) —
  postojeći, već odobreni obrazac (Sprint 05), različiti simboli za
  različite kontekste namjerno, ne nedosljednost.

**Napomena o metodologiji:** `computer` (klik/hover) alat u ovom
okruženju je nepouzdan na mobilnoj (resized) veličini prozora — koristio
sam JS-simulirane klikove i computed-style provjere kao pouzdanu
zamjenu (isti pristup kao ranije za screenshot-ove, koji su takođe
nedostupni u ovom okruženju).

**Status:** Popravke #1–4 implementirane i testirane uživo. Sprint 10
kriterijum "Direktor lično pregleda na svom uređaju prije potvrde
zatvaranja sprinta" NIJE i ne može biti ispunjen od strane Claude Code-a
— ovo je estetski sud koji zahtijeva Direktorov pregled prije nego se
sprint smatra zatvorenim.

## DL-008 — Sprint 11: "koliko truda" (best-of-N), i Maksimalno=4 umjesto 6

**Datum:** 2026-08-13
**Kontekst:** Zasnovano na Sprint 10 analizi žive aplikacije (315 časova, 0
grešaka, ~45-60s, 1/19 nastavnika "vruć" gap=3). Cilj: dati Direktoru pošten,
DOKAZAN način da kaže "potrudi se više" — bez lažnog utiska kontrole (ranije
utvrđeno da sama promjena objective_weights ne daje pouzdanu razliku).

**Implementacija (solver.py, main.py, App.jsx/Wizard.jsx):**
- `solve_timetable(config, time_limit_s, workers, seed=None)` — NOVI opcioni
  `seed` parametar. Kad je `None` (svi dosadašnji pozivi), kod se izvršava
  IDENTIČNO kao prije ovog sprinta — `solver.parameters.random_seed` se ne
  postavlja, `_polish_gaps` se zove BEZ seed kwarg-a (svoj stari default=7).
  Kad je `seed` dat, postavlja i CP-SAT random_seed i _polish_gaps seed —
  CP-SAT je djelimično stohastičan (multi-worker portfolio pretraga sa
  vremenskim ograničenjem), različit seed daje različit raspored.
- `solve_timetable_best_of(config, attempts, time_limit_s, workers)` — NOVA
  funkcija. attempts<=1 je čist passthrough na solve_timetable (bit-identično
  main.py pozivu prije ovog sprinta). attempts>1 zove solve_timetable N puta
  sa različitim seedovima, bira rezultat sa najmanjim `_dashboard_gap_score`
  (NOVA pomoćna funkcija, ali namjerno KOPIRA postojeću DashboardTable
  metriku iz App.jsx — najveća dnevna rupa po nastavniku, zbir preko svih,
  REZERVISANO izostavljen — ne izmišlja se nova metrika).
- main.py: `/solve` prima `attempts` (zadano 1), klampovano na [1,4] bez
  obzira šta klijent pošalje (vidi rizik ispod za zašto 4, ne 6).
- Frontend: izbor "Standardno"/"Pojačano"/"Maksimalno" pored dugmeta Generiši
  (obično `<select>`, NE apstraktan klizač — pojedinačni gap/balance/
  light_late klizači su namjerno VAN opsega, ranije dokazano nepouzdano).
  Loader dobija kratak tekst objašnjenja za trajanja duža od Standardnog
  (bez toga bi 3-4 min mirni spinner mogao djelovati zaglavljeno).
- Duplirana zadana `objective_weights` (identična definicija nezavisno u
  Wizard.jsx I App.jsx) svedena na jedan izvor istine — `Wizard.jsx` izvozi
  `DEFAULT_OBJECTIVE_WEIGHTS`, `App.jsx` ga uvozi. Vrijednosti nepromijenjene.
- `compactness` (mrtav parametar u solver.py — nikad korišten u
  m.Minimize()) NIJE uklonjen (van opsega da se dira sama ciljna funkcija),
  samo jasno označen komentarom da ne zbunjuje u budućnosti.

**Regresijski test "Standardno" (Direktorov eksplicitan zahtjev prije bilo
kakvog nastavka):** `git diff` na solver.py pregledan liniju-po-liniju —
svaka nova linija je unutar `if seed is not None:` grane koja se za
Standardno nikad ne izvršava. Pokrenuto uživo: 315 časova, 0 grešaka, 47.1s
— identično prošlom izvještaju. BEZ regresije.

**Dokaz da Pojačano/Maksimalno stvarno rade više pokušaja (ne samo tvrdnja):**
instrumentisan poziv `solve_timetable_best_of(attempts=3)` pokazao 3 različita
pojedinačna rezultata (gap_score 23, 21, 21) i potvrdio da vraćeni rezultat =
min od sva tri (21). Puni end-to-end testovi: Pojačano (3 pokušaja) = 139.3s,
Maksimalno (originalno 6 pokušaja) = 280.2s.

**⚠️ Nalaz — Railway idle-timeout rizik za Maksimalno=6:** Railway-jeva
[dokumentacija](https://docs.railway.com/networking/public-networking/specs-and-limits)
zatvara vezu "nakon 5 minuta BEZ PRENOSA PODATAKA" (aktivan prenos smije do
15 min). `/solve` endpoint ne šalje NIŠTA nazad dok cijeli izračun ne završi
— tačan scenario za to pravilo. Izmjereno 6 pokušaja = 4.67 min, samo ~20s
ispod granice od 300s — na produkcijskom (vjerovatno sporijem) hardveru
realan rizik da Railway prekine vezu usred izračuna. Vercel NIJE rizik
(frontend zove Railway direktno iz browsera, ne kroz Vercel funkciju/proxy —
Vercel-ova ograničenja se ne primjenjuju).

**Direktorova odluka (2026-08-13, upitan eksplicitno):** smanjiti Maksimalno
sa 6 na **4 pokušaja**. Izmjereno: 4 pokušaja = 186.8s (3.11 min) — sigurna
margina od skoro 2 minute ispod Railway granice. Klamp u main.py promijenjen
sa [1,6] na [1,4] (ne samo frontend labela — i direktan API poziv je
ograničen). Sve reference na "Maksimalno=6" u kodu/komentarima ažurirane.

**Status:** implementirano, testirano (Standardno regresija, Pojačano i
Maksimalno=4 pun end-to-end, dashboard i loader potvrđeni uživo), spremno za
push.

## DL-009 — Sprint 12: čuvanje rasporeda (Supabase, ručno, s istorijom)

**Datum:** 2026-08-30
**Kontekst:** Direktorovo zapažanje iz stvarne upotrebe — best-of-N (Sprint
11) bira pokušaj s najmanjim UKUPNIM zbirom rupa, što ne garantuje da je baš
svaki pojedinačni nastavnik optimalan u toj konkretnoj verziji. Ručno
generisanje-pregled-čuvanje je razuman odgovor: generiši par puta, sačuvaj
najbolju verziju za konkretnog nastavnika koji ti je bitan, vrati se na nju
kasnije.

**Implementacija:**
- `backend/storage.py` (NOV fajl) — tanka omotnica oko Supabase REST API-ja
  (PostgREST) preko `requests`, BEZ dodatne `supabase-py` SDK zavisnosti.
  `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` iz Railway env varijabli,
  ISKLJUČIVO server-side. `StorageNotConfigured`/`StorageError` — jasne,
  očekivane greške (main.py ih pretvara u 503/502), NE pad aplikacije.
- `main.py`: `POST /schedule/save`, `GET /schedule/list`, `GET /schedule/
  {id}` — sva tri `require_auth` kao i sve ostalo. `gap_score` se računa NA
  SERVERU pozivom `_dashboard_gap_score` (Sprint 11, solver.py) — ISTA
  metrika, ne nova, i ne vjerujemo klijentu da je sam izračuna.
- Frontend: "💾 Sačuvaj raspored" (ručno, s opcionom oznakom — automatski
  "dd.mm.gggg hh:mm" ako se ostavi prazno) i "📂 Učitaj sačuvano" (lista
  posljednjih 10, najnoviji prvi). Učitavanje preko nesačuvanih izmjena
  upozorava kroz POSTOJEĆI VerdictModal (Sprint 05), proširen ADITIVNIM
  `actions` poljem (dugmad "Otkaži"/"Učitaj svejedno") — svi dosadašnji
  pozivi VerdictModal-a (bez `actions`) ostaju vizuelno i funkcionalno
  identični.
- `Wizard.jsx` dobija `forwardRef`+`useImperativeHandle` (`loadExternalConfig`)
  — bez ovoga bi učitavanje sačuvane verzije ažuriralo App.jsx-ov `config`
  ali NE i Wizard-ov interni state, pa bi wizard forma "tiho" prepisala
  tek-učitani config nazad na staro čim korisnik dirne bilo koje polje.
  Ista mehanika koju "Učitaj config (.json)" već koristi interno.
- `DashboardTable` (App.jsx) refaktorisan — `computeTeacherGaps`/
  `computeGapScore` izdvojeni van komponente, jedan izvor istine za
  dashboard prikaz I "Sačuvaj raspored" frontend prikaz (backend ipak uvijek
  računa svoju server-side vrijednost preko `_dashboard_gap_score`, ovo je
  samo frontend logika, uklanja duplikat unutar App.jsx).

**Sigurnost — Supabase service_role ključ NIKAD u frontendu:**
provjereno eksplicitno (isti test kao za staru ugrađenu lozinku, Sprint 09):
`grep` na cijeli `dist/` build i na sav frontend izvorni kod — riječ
"supabase" se NE POJAVLJUJE NIGDJE u frontend kodu (0 pogodaka u App.jsx/
Wizard.jsx/main.jsx). Frontend zna SAMO za `/schedule/save`, `/schedule/
list`, `/schedule/{id}` — generičke rute vlastitog već-zaštićenog backenda,
nema pojma o Supabase-u ispod haube. Arhitekturalno nemoguće da ključ
procuri kroz frontend, ne samo "nismo ga stavili".

**Regresijski test (eksplicitan zahtjev prije nastavka):**
- `git diff --stat backend/solver.py backend/validators.py backend/exports.py`
  — PRAZNO, potpuno netaknuti (main.py samo UVOZI `_dashboard_gap_score` iz
  solver.py, ne mijenja ga).
- Generiši (Standardno): 315 časova, 9 razreda — identično prijašnjim
  izvještajima.
- Dashboard: 19 nastavnika, iste vrijednosti kao prije refaktora
  (computeTeacherGaps potvrđeno ekvivalentan staroj inline verziji).
- `/validate-move`: testirano direktno na backendu sa stvarnim podacima
  (315 časova, round-trip kroz novi Save) — 200, ok:true, bez grešaka.
  Frontend `handleDragEnd` dobio samo JEDNU dodatu liniju
  (`setUnsavedChanges(true)` u success grani) — ne mijenja API poziv niti
  kontrolni tok.
- `/export/excel`: 200 OK, radi identično i BEZ Supabase env varijabli.
- Login: nepromijenjen ovim sprintom, testiran implicitno kroz sve gornje
  (prijava radila normalno tokom cijelog testiranja).

**Fail-closed test (eksplicitan zahtjev — "ne bi pukla kad bi Supabase
varijable nedostajale"):** backend pokrenut BEZ `SUPABASE_URL`/
`SUPABASE_SERVICE_ROLE_KEY`. Rezultat:
- `POST /schedule/save`, `GET /schedule/list`, `GET /schedule/{id}` → sva
  tri čist **503** sa jasnom porukom ("Čuvanje rasporeda nije podešeno na
  serveru...").
- `/health`, `/feasibility`, `/export/excel` i dalje **200**, rade potpuno
  normalno — potvrđeno da ništa drugo ne zavisi o storage.py.

**Testirano PROTIV mock Supabase servera** (lokalni FastAPI koji simulira
PostgREST, ne pravi Supabase — Claude Code ne rukuje pravim service_role
ključem, isti standard kao za BACKEND_PASSWORD): stvaran upis potvrđen
direktnim čitanjem mock baze (ne samo "frontend kaže sačuvano"), lista
vraća tačno redoslijed (najnoviji prvi), učitavanje vraća pun config+lessons
i ispravno sinhronizuje i App.jsx i Wizard.jsx state, upozorenje o
nesačuvanim izmjenama prikazano i testirano na oba puta (Otkaži i Učitaj
svejedno).

**Preostalo — Direktorova radnja (Claude Code ne rukuje pravim Supabase
kredencijalima):**
1. Kreirati Supabase nalog (besplatan nivo) i projekat.
2. U Supabase SQL editoru pokrenuti (vidi sprints/SPRINT_12.md HANDOFF za
   tačan SQL) da se napravi `saved_schedules` tabela.
3. Na Railway (isti obrazac kao `BACKEND_PASSWORD`) postaviti DVIJE env
   varijable: `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` (TAČNO ta imena,
   backend ih čita po tim nazivima — vidi storage.py).
4. Nakon deploya, provjeriti da "💾 Sačuvaj raspored" stvarno upisuje red u
   Supabase tabelu (Direktor može provjeriti direktno u Supabase Table
   Editor-u) — Claude Code ovo nije mogao testirati protiv PRAVOG Supabase-a
   bez pravih kredencijala.

**Otvoren rizik (Supabase besplatan nivo):** projekat na besplatnom Supabase
nivou se automatski PAUZIRA nakon ~1 sedmicu neaktivnosti (Supabase pravilo,
ne nešto što mi kontrolišemo) — ako se "Sačuvaj"/"Učitaj" ne koristi duže
vrijeme, prvi sljedeći poziv može dobiti grešku dok se projekat ne "probudi"
(obično par sekundi do minute). Nije blokirajuće, ali vrijedi znati ako se
pojavi privremena greška nakon duže pauze u korištenju.

**⚠️ INCIDENT — produkcija je pukla nakon prvog push-a, popravljeno odmah
(isti dan, 2026-08-30):** `backend/Dockerfile` eksplicitno navodi koji `.py`
fajlovi se kopiraju u sliku (`COPY solver.py validators.py exports.py
main.py ./`) — pri dodavanju NOVOG fajla `backend/storage.py` u ovom
sprintu, Dockerfile NIJE ažuriran da ga uključi. Rezultat: Railway kontejner
je pukao (`CRASHED` status, Direktor je primijetio na Railway dashboardu)
sa `ModuleNotFoundError` na `main.py`-jevom `from storage import ...`, jer
`storage.py` fizički nije bio u Docker slici. Sve lokalno testiranje prije
push-a je prošlo jer se odvijalo DIREKTNO na fajl-sistemu (svi `.py` fajlovi
prisutni), ne kroz Docker build — ovaj konkretan rizik (fajl postoji lokalno
ali nije u Dockerfile COPY listi) lokalni test nije mogao uhvatiti.
**Popravka:** `storage.py` dodan u COPY liniju. **Provjereno** (Docker nije
lokalno instaliran): ručno kopiran TAČAN skup fajlova koji Dockerfile sada
navodi u izolovan direktorijum, `main.py` se uvozi bez greške — simulira
Docker-ovu izolaciju fajlova. Nakon push-a popravke, potvrđeno uživo na
Railway-u: `/health` → 200, `/schedule/list` → 401 (ruta postoji, auth radi,
kontejner stabilan). **Nauk za buduće sprintove:** svaki NOVI backend `.py`
fajl mora se eksplicitno dodati u `Dockerfile` COPY liniju — ovo sad treba
biti dio standardne provjere kad god se dodaje novi backend modul.

## DL-010 — Sprint 14: meko upozorenje za 5.–9. razred (Mathematik/Deutsch)

**Datum:** 2026-08-30
**Kontekst:** Otkriveno kroz Direktorovu nezavisnu provjeru stvarnih
produkcijskih podataka (Sprint 12 test) — pravi honorarni raspored (Haris
Hamzić) ima Mathematik popodne za razrede 5/8/9, što je ISPRAVNO stanje
stvari (honorarni nastavnici nisu uvijek dostupni ujutru za starije
razrede), ali `validate()` je to prijavljivao kao grešku. Direktorova
odluka: 1.–4. razred ostaje TVRDO pravilo (mora ujutru); 5.–9. postaje
SAMO upozorenje, ne blokira.

**Jezgro (solver.py, validators.py) već izmijenjeno i testirano prije ovog
dijela** (od strane Direktora/glavnog asistenta lično, isti standard kao za
sve prethodne izmjene jezgra) — novo polje `morning_core_hard_grades`
(lista razreda), zadano "svi razredi" ako nije podešeno (povratna
kompatibilnost). Nova `validate_warnings()` funkcija u validators.py,
namjerno ODVOJENA od `validate()` — upozorenja NIKAD ne blokiraju niti
utiču na `/validate-move`.

**Ovaj dio (Claude Code):**
- `main.py`: `/solve` sada poziva i `validate_warnings()`, vraća novo
  polje `warnings` odvojeno od `errors`. `ok` status i dalje zavisi
  ISKLJUČIVO od `errors` — Direktorov zahtjev "upozorava ali ne
  sprječava" ispoštovan doslovno.
- Frontend: `VerdictModal` dobija NOVI, ADITIVNI `kind: "warning"` — žuta
  (`--yellow`, zvanična paleta, "pažnja/istaknuto", NIKAD za greške po
  CONSTITUTION.md P-4 — semantički savršeno pristaje), ⚠ ikonica, NE
  auto-nestaje (kao greška — Direktor treba stići pročitati). Postojeći
  "success"/"error" pozivi VerdictModal-a rade identično kao prije
  (isWarning=false za njih, isti kod put).
- `morning_core_hard_grades: [1,2,3,4]` postavljeno kao Direktorova
  stvarna zadana vrijednost u OBA `idss_config.example.json` (backend I
  frontend/src, identični, provjereno diff-om).
- **KRITIČNO — E-14 pravilo (novo formalno pravilo COMMANDER-a, nastalo
  upravo zbog ove dvije ranije greške — `teacher_constraints`, pa
  `morning_core_by_grade`):** puna round-trip podrška za
  `morning_core_hard_grades` u Wizard.jsx — `emptyWizard()` (zadano SVI
  razredi, isto značenje kao backend fallback — bez ovoga bi prazan wizard
  TIHO promijenio ponašanje za svakog ko ovu kontrolu ne dirne),
  `buildConfig()` (uvijek eksplicitno emituje), `loadConfig()` (ISTA
  fallback formula kao backend: `cfg.morning_core_hard_grades ?? cfg.grades`),
  i PRAVA UI kontrola (chip-lista na Ekranu A, isti obrazac kao "Razrednik
  svaki dan") — ne samo "preživi kroz Napredno JSON", puna funkcionalna
  podrška urađena jer nije bilo suštinski skuplje.

**Round-trip test (E-14 eksplicitno zahtijeva PRIJE zatvaranja sprinta):**
- Config sa `morning_core_hard_grades: [1,2]` (NAMJERNO različit od "svi
  razredi" da se dokaže da se polje stvarno čita, ne samo slučajno
  poklapa sa fallback-om) → Ekran A chips ispravno pokazuju [1,2]
  uključeno, [3] isključeno → Napredno JSON i dalje `[1,2]` bez ijedne
  izmjene — round-trip potpuno čist.
- Config BEZ polja (simulira stariji config) → Ekran A chips ispravno
  pokazuju SVE razrede uključeno (fallback na "svi razredi TOG config-a")
  → Napredno JSON eksplicitno emituje `[1,2,3]` (grades tog config-a) —
  ISTO ponašanje kao prije, sada eksplicitno perzistentno, ne izgubljeno.
- UI toggle (klik na chip) potvrđeno da odmah ažurira `config` uživo.

**Pun end-to-end test sa stvarnim IDSS podacima** (9 razreda,
`morning_core_hard_grades: [1,2,3,4]`, pravi Haris Hamzić raspored):
solve uspio (315 časova, 9 razreda — regresija identična ranijim
sprintovima), verdict prozor prikazao ŽUTO upozorenje ("Raspored je
generisan — uz napomenu", 5 konkretnih napomena za Deutsch popodne u
razredima 5/7/8/9), NE crveno, NE blokirano. Dashboard nakon toga i dalje
ispravno prikazuje 19 nastavnika.

**Status:** implementirano, testirano (round-trip PROŠAO za oba slučaja —
sa i bez polja, pun end-to-end sa žutim upozorenjem potvrđen uživo),
solver.py/validators.py potvrđeno NISU dalje mijenjani u ovom dijelu
(git diff pokazuje samo ono što je već bilo prisutno prije ovog rada).

## Napomena uz DL-001 (2026-08, nakon pitanja Direktora)

Direktor ne treba Docker instaliran lokalno. Cloud Run / Railway sami
grade Docker image iz `Dockerfile`-a u repozitoriju u trenutku deploya
(Sprint 03) — to je i stvarna provjera da Dockerfile radi. Lokalni
`docker build` test (spominjan u Sprint 01) bio je opcionalna, ne
neophodna provjera; njegovo odsustvo NE blokira napredak.

---

*Project Decision Log — IDSS Timetable*
