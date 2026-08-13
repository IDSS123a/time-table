# SPRINT_08 — Sigurnosni audit i ojačavanje

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 07 završen. Ovaj sprint MOŽE dirati main.py (bezbjednosne
# dopune su opravdan izuzetak od "backend se ne dira" — solver.py/
# validators.py/exports.py se i dalje ne diraju bez izričitog razloga).

---

## OPSEG — provjeriti UŽIVO na pravom deployment-u, ne pretpostaviti

### 1. Autentifikacija
- [ ] Ponovo potvrditi na ŽIVOM sistemu (ne lokalno): bez lozinke → 401,
  pogrešna lozinka → 401, tačna → 200, `/health` otvoren, fail-closed
  ako env varijabla nije podešena.
- [ ] **Brute-force zaštita — trenutno NE POSTOJI.** Neko može pokušati
  neograničen broj lozinki bez ikakvog ograničenja. Dodati jednostavno
  ograničenje (npr. max 10 pokušaja po IP adresi u 5 minuta, in-memory
  brojač — ne treba baza). Ako Railway/Cloudflare nudi rate-limiting na
  platformi bez koda, to je i prihvatljivo/bolje rješenje — provjeriti.
- [ ] Lozinka se NIGDJE ne smije pojaviti u konzoli, mrežnim logovima
  (osim same Authorization zaglavlje, što je neizbježno), ili porukama
  o grešci.

### 2. Mrežna sigurnost
- [ ] Potvrditi da su i Railway i Vercel isključivo HTTPS (bez HTTP
  fallback-a koji bi izložio lozinku u čistom tekstu).
- [ ] Potvrditi da je `ALLOWED_ORIGINS` na Railway i dalje tačan Vercel
  URL, NE `*` (provjeriti da nije slučajno vraćeno na default tokom
  nekog kasnijeg deploya).

### 3. Curenje informacija
- [ ] Namjerno izazvati grešku na backendu (npr. loš JSON) i provjeriti
  da odgovor NE sadrži Python stack trace, putanje fajlova na serveru,
  niti verzije biblioteka — samo čista poruka.
- [ ] Provjeriti da FastAPI automatski generisana dokumentacija (`/docs`,
  `/openapi.json` — FastAPI ih pravi same po sebi ako se ne isključe)
  NIJE javno dostupna bez lozinke, ili je potpuno isključena ako nije
  potrebna.

### 4. Izvoz fajlova — formula injection
Excel (`export_excel`) upisuje tekst koji dolazi iz konfiguracije
(imena nastavnika, predmeta) direktno u ćelije. Ako neki tekst počne
znakom `=`, `+`, `-` ili `@`, Excel to može protumačiti kao formulu kad
korisnik otvori fajl (poznat napad — "CSV/Excel injection"). Provjeriti
`exports.py` (SAMO čitati, ne mijenjati bez odobrenja — ovo je jedina
stavka koja bi mogla dotaći exports.py, i to samo ako se dokaže stvaran
rizik) — po potrebi, dodati escape (npr. apostrof ispred takvog teksta)
prije upisa u ćeliju.

### 5. Zavisnosti (poznate ranjivosti)
- [ ] Pokrenuti `npm audit` (frontend) i `pip list --outdated` /
  `pip-audit` ili sličan alat (backend) — prijaviti nalaze. NE ažurirati
  automatski bez javljanja (nadogradnja biblioteke može nešto pokvariti
  — prijaviti pa pitati ako ima ozbiljnih nalaza).

### 6. Javnost repozitorija (podsjetnik, već jednom zapisano u DL-002)
Repo je javan, `idss_config.example.json` sadrži prava imena nastavnika.
Ovo je RANIJE svjesno prihvaćeno (DL-002). U sklopu ovog audita, samo
PODSJETI Direktora da li i dalje želi da repo ostane javan sad kad je
projekat u punoj produkciji — njegova odluka, ne mijenjati sam.

### 7. Ponoviti ranije napade, ali na ŽIVOM sistemu
Svi napadi koje je Claude (u razgovoru s Direktorom) ranije testirao
LOKALNO (SQL/script injection stringovi, ekstremno dugi stringovi,
duboko ugniježđen JSON, negativni brojevi) — ponoviti barem uzorak
njih protiv PRAVOG živog Railway URL-a, da se potvrdi da isto važi i
u produkciji, ne samo lokalno.

**VAN OPSEGA:** promjena dizajna (Sprint 05/06/07 se ne dira); promjena
solver.py/validators.py logike (osim ako audit otkrije da je STVARNO
potrebno, u kom slučaju STANI i pitaj prije izmjene).

## KRITERIJI PRIHVATANJA
```
☑ Svih 7 stavki iznad provjereno (uživo na produkciji gdje autentifikacija
  nije bila prepreka; lokalno na identičnom kodu gdje JESTE bila prepreka
  — vidi HANDOFF za koje stavke je koje vrijedilo)
☑ Bilo koji nalaz ili popravljen (rate-limit, /docs izloženost), ili
  jasno prijavljen Direktoru s preporukom (exports.py formula injection)
☑ Backend jezgro (solver.py/validators.py/exports.py) NETAKNUTO —
  potvrđeno git diff --stat prazan za sva tri; SAMO main.py mijenjan
  (eksplicitno dozvoljeno u preduslovu ovog sprinta)
```

## HANDOFF NAPOMENA
```
HANDOFF NOTE — Sprint 08 (2026-08-13)

Nalazi (po stavci 1-7):
1. Autentifikacija — auth ponašanje (401/401/200/fail-closed) potvrđeno
   UŽIVO na produkciji, čisto. Brute-force zaštita NIJE postojala —
   STVARAN nalaz, popravljeno (vidi ispod). Lozinka se ne pojavljuje u
   odgovorima/logovima koje kontrolišemo (kod ne echo-uje pokušaj).
2. Mrežna sigurnost — čisto. HTTPS enforced na oba (Railway 301, Vercel
   308 redirect sa HTTP-a). ALLOWED_ORIGINS tačan Vercel URL, NE `*`
   (lažan Origin -> "Disallowed CORS origin" 400; pravi Vercel Origin ->
   dozvoljen) — sve potvrđeno uživo na produkciji.
3. Curenje informacija — DVA nalaza:
   a) Malformisan/ekstreman JSON (prazno tijelo, nevaljan JSON, pogrešan
      tip, 20.000-nivoa ugniježđen) -> čiste poruke, BEZ stack trace-a,
      putanja ili verzija biblioteka, server se ne ruši. Čisto.
   b) /docs, /openapi.json, /redoc bili JAVNO DOSTUPNI bez lozinke —
      STVARAN nalaz, popravljeno (vidi ispod).
4. Excel formula injection — STVARAN mehanizam potvrđen (openpyxl string
   koji počinje `=` postaje formula). NIJE popravljeno — exports.py je
   po pravilu sprinta "samo čitati, ne mijenjati bez odobrenja". Čeka
   Direktorovo "da"/"ne".
5. Zavisnosti — npm audit: 2 nalaza, oba esbuild/vite RAZVOJNI server
   (ne produkcijski build, ne utiče na deploy), postojala prije ovog
   sprinta, popravka = breaking vite 8.x upgrade — NIJE urađena bez
   javljanja. pip-audit -r requirements.txt: 0 nalaza.
6. Javnost repoa — podsjetnik dat Direktoru (vidi poruku ispod), odluka
   ostaje njegova, DL-002 nepromijenjen.
7. Ponovljeni napadi na PRAVI Railway URL gdje nije trebala autentifikacija
   (CORS/HTTPS/health/404 na /docs), i na LOKALNU instancu identičnog
   koda gdje JESTE trebala (injection stringovi, 100.000-karakterni
   string, 20.000-nivoa JSON, negativni brojevi na /feasibility i
   /solve) — vidi DECISION_LOG.md DL-005 tačka 5 za objašnjenje zašto
   (ne rukujem produkcijskom lozinkom). Sve čisto, bez pada/curenja.

Popravljeno (main.py, testirano lokalno prije push-a, spremno za deploy):
- Rate-limiting: in-memory brojač neuspjelih pokušaja po IP
  (X-Forwarded-For), 10/5min, potom 429. Uspjeh briše brojač. Testirano:
  10× pogrešno -> 401, 11. -> 429; tačna lozinka nakon par pogrešnih i
  dalje 200 (dok se prag ne dostigne).
- /docs, /redoc, /openapi.json potpuno isključeni (docs_url=None,
  redoc_url=None, openapi_url=None) — bili javno dostupni, sad 404.

Preporučeno ali NE urađeno (čeka odluku Direktora):
- exports.py: dodati apostrof-prefiks escape za ćelije koje počinju
  =, +, -, @ (formula injection zaštita). Mali, izolovan fix (par linija
  u export_excel), ali NE dirati bez "da" — vidi DECISION_LOG.md DL-005
  tačka 3.
- npm audit nalazi (esbuild/vite dev-server) — popravka je breaking
  vite major upgrade, procijenjeno da nije hitno (ne utiče na
  produkcijski build), ali javljeno na uvid.
- Javnost GitHub repoa — i dalje otvoreno pitanje iz DL-002, samo
  ponovljen podsjetnik, Direktorova odluka.

Next: TBD po dogovoru s Direktorom — najvjerovatnije exports.py
odobrenje, zatim push main.py popravki i re-provjera na živom Railway-u.
```
