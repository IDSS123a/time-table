# SPRINT_12 — Čuvanje rasporeda (Supabase, ručno, s istorijom)

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 11 zatvoren, projekat bio proglašen "definitivno
# završenim" prije nego je ovaj zahtjev otvoren — Direktorova odluka,
# legitiman novi zahtjev.
#
# ZAŠTO OVO STVARNO TREBA (dopunjeno nakon Direktorovog zapažanja iz
# stvarne upotrebe): "best-of-N" (Sprint 11) bira pokušaj s najmanjim
# UKUPNIM zbirom rupa preko svih nastavnika — to NE garantuje da je
# baš svaki pojedinačni nastavnik optimalan; moguće je da odličan
# ukupan rezultat ipak ostavi jednog-dva nastavnika lošije. Direktor je
# ovo primijetio uživo (isti nastavnici — Hena, Selma, Semra, Amina —
# ponekad odlično, ponekad loše, i s "Maksimalno" postavkom). Ručno
# generisanje-pregled-čuvanje je stvaran, razuman odgovor na ovo
# ograničenje, ne samo pogodnost.

---

## ⚠️ NAJVAŽNIJE OGRANIČENJE — ADITIVNO I BEZBJEDNO PO DIZAJNU

1. **Ništa postojeće se ne mijenja.** Generiši, izvoz, prevlačenje,
   dashboard, login — sve mora raditi IDENTIČNO kao danas, bez obzira
   da li Supabase uopšte postoji/radi.
2. **Ako Supabase nije podešen ili je nedostupan, aplikacija MORA nastaviti
   raditi normalno** — samo novi "Sačuvaj"/"Učitaj sačuvano" dio pokazuje
   jasnu grešku, ništa se ne blokira niti ruši.
3. **Supabase veza ide ISKLJUČIVO kroz backend** (server-side, service
   key u Railway environment varijabli) — **NIKAD direktno iz frontenda**.
   Ovo je sigurnosni zahtjev, ne stilska preferenca: frontend i dalje
   priča SAMO sa našim već-zaštićenim backendom (Basic Auth, ista
   lozinka kao za sve ostalo), ne otvara se nov, odvojen put koji bi
   zaobišao tu zaštitu.

## OPSEG

**U OPSEGU:**
1. Supabase tabela (npr. `saved_schedules`): `id`, `created_at`,
   `config` (jsonb), `lessons` (jsonb), `label` (tekst, opciono —
   npr. auto-generisano "29.08.2026 14:32" ako korisnik ne unese svoje),
   `gap_score` (broj — ista metrika koju dashboard i Sprint 11 already
   koriste, sačuvana UZ raspored da se u listi odmah vidi kvalitet bez
   da se svaka verzija mora učitati da bi se provjerila).
2. Backend (novi, mali dio `main.py`, **ne dira** `solver.py`/
   `validators.py`/`exports.py`):
   - `POST /schedule/save` — sprema TRENUTNO stanje (config+lessons+
     opciona oznaka), zaštićeno `require_auth` kao i sve ostalo.
   - `GET /schedule/list` — vraća spisak POSLJEDNJIH 10 sačuvanih
     (id/vrijeme/oznaka/`gap_score` — dovoljno da se u listi ODMAH vidi
     koja je verzija bila bolja, bez učitavanja svake pojedinačno).
   - `GET /schedule/{id}` — vraća pun config+lessons za JEDAN odabrani
     zapis (za stvarno učitavanje).
   - Namjerno BEZ automatskog brisanja starih zapisa — jednostavnije,
     bez rizika da nešto slučajno nestane; lista prikazuje samo
     posljednjih 10, stariji ostaju u bazi ali se ne prikazuju.
3. Frontend:
   - Dugme "💾 Sačuvaj raspored" (ručno, RUČNO klikanje — NE automatski
     — Direktorova eksplicitna odluka) — pored postojećih Izvezi
     dugmadi. Opciono polje za naziv/oznaku.
   - Ekran/padajuća lista "Učitaj sačuvano" — prikazuje posljednjih 10
     (vrijeme + oznaka), klik učitava taj raspored u trenutni prikaz.
   - Ako postoje NESAČUVANE izmjene u trenutnom prikazu, učitavanje
     sačuvane verzije mora **jasno upozoriti** prije nego ih prepiše
     (isti neumorfni "verdict" stil upozorenja iz Sprint 05, ne novi
     stil).
4. Direktor kreira Supabase nalog (besplatan nivo), dobija URL i
   service key, upisuje ih u Railway environment varijable (isti
   obrazac kao `BACKEND_PASSWORD` ranije).

**VAN OPSEGA (namjerno):**
- Automatsko čuvanje bez klika — eksplicitno odbačeno (Direktorova odluka).
- Brisanje starih zapisa iz UI-a (može se dodati kasnije ako zatreba,
  nije dio ovog zahtjeva).
- Bilo kakva izmjena `solver.py`/`validators.py`/`exports.py`.
- Dijeljenje sačuvanih rasporeda između više korisnika/uređaja izvan
  onoga što Supabase već prirodno omogućava (nema posebnih dozvola po
  korisniku — jedan zajednički spisak, isto kao i sve ostalo u ovoj
  aplikaciji do sada).

## PLAN (FEATURE_LIFECYCLE Korak 2)

```
/**
 * SPRINT: 12
 * SVRHA: Omogućiti Direktoru da RUČNO sačuva trenutni raspored (nakon
 *        finog ručnog podešavanja) i da mu se vrati kasnije, bez
 *        ponovnog generisanja iz JSON-a — uz malu istoriju (10) da se
 *        može vratiti na raniju verziju ako treba.
 * DOTIČE: main.py (3 nova endpoint-a, tanka omotnica), novi Supabase
 *         klijent modul (npr. backend/storage.py — nov, mali fajl),
 *         App.jsx (dugme + lista za učitavanje)
 * VAN OPSEGA: solver.py, validators.py, exports.py — netaknuti
 * GARANCIJA: Ako Supabase nedostupan/nepodešen, SVE ostalo radi
 *            identično kao danas — provjeriti eksplicitno.
 * SIGURNOST: Supabase service key ISKLJUČIVO server-side (Railway env),
 *            nikad u frontend kodu/bundle-u (isti standard kao
 *            BACKEND_PASSWORD, ista greška koju smo već jednom našli
 *            i popravili za lozinku u Sprint 09 — ne ponoviti je ovdje
 *            za Supabase ključ).
 */
```

## KRITERIJI PRIHVATANJA
```
□ Postojeća funkcionalnost (Generiši/izvoz/prevlačenje/dashboard/login)
  RADI IDENTIČNO kao prije ovog sprinta — regresija eksplicitno provjerena
□ Aplikacija radi normalno i BEZ podešenih Supabase env varijabli (samo
  Sačuvaj/Učitaj dio jasno kaže da nije dostupno, ništa se ne ruši)
□ "Sačuvaj raspored" stvarno upiše zapis u Supabase — provjereno direktno
  u Supabase tabeli, ne samo da frontend kaže "sačuvano"
□ "Učitaj sačuvano" prikazuje TAČNO posljednjih 10, ispravnim redoslijedom
  (najnoviji prvi)
□ Učitavanje sačuvane verzije preko NESAČUVANIH izmjena jasno upozorava
  prije nego prepiše
□ Supabase service key NIJE vidljiv nigdje u frontend kodu/bundle-u —
  eksplicitno provjereno (isti test kao za staru ugrađenu lozinku ranije)
□ solver.py/validators.py/exports.py netaknuti — git diff potvrđuje
```

## HANDOFF NAPOMENA
```
HANDOFF NOTE — Sprint 12 (2026-08-30)

Completed:
- backend/storage.py (nov, mali fajl) — Supabase REST API klijent preko
  requests biblioteke, server-side ISKLJUČIVO. StorageNotConfigured/
  StorageError -> main.py ih pretvara u jasan 503/502, ne pad.
- main.py: POST /schedule/save, GET /schedule/list, GET /schedule/{id} —
  sva tri require_auth zaštićena, tanka omotnica, solver.py/validators.py/
  exports.py NETAKNUTI (samo uvoz _dashboard_gap_score iz solver.py).
- Frontend: "💾 Sačuvaj raspored" (opciona oznaka, auto "dd.mm.gggg hh:mm"
  ako prazno) + "📂 Učitaj sačuvano" (posljednjih 10, najnoviji prvi).
  Upozorenje prije prepisivanja nesačuvanih izmjena kroz PROŠIRENI
  VerdictModal (isti stil, dodata dugmad "Otkaži"/"Učitaj svejedno").
  Wizard.jsx dobio forwardRef/useImperativeHandle da se i wizard forma
  sinhronizuje pri učitavanju, ne samo prikaz rasporeda.

Regression check — IDENTIČNO kao prije ovog sprinta:
- git diff --stat na solver.py/validators.py/exports.py: PRAZNO.
- Generiši (Standardno): 315 časova, 9 razreda — isto kao ranije.
- Dashboard: 19 nastavnika, iste vrijednosti (computeTeacherGaps refaktor
  matematički ekvivalentan staroj inline verziji, provjereno).
- /validate-move: testirano direktno sa stvarnim podacima (round-trip kroz
  novi Save) — 200, ok:true. handleDragEnd dobio samo JEDNU dodatu liniju
  (setUnsavedChanges), ne mijenja API poziv/kontrolni tok.
- /export/excel: 200 OK, radi i BEZ Supabase env varijabli.
- Login: nepromijenjen, radio normalno tokom cijelog testiranja.

Fail-closed test (BEZ SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY):
/schedule/save, /schedule/list, /schedule/{id} -> sva tri čist 503 sa
jasnom porukom. /health, /feasibility, /export/excel -> i dalje 200,
potpuno nezavisno. Ništa se ne ruši.

Testirano protiv MOCK Supabase servera (lokalni FastAPI koji simulira
PostgREST) — Claude Code ne rukuje pravim service_role ključem, isti
standard kao BACKEND_PASSWORD. Stvaran upis potvrđen direktnim čitanjem
mock baze, ne samo "frontend kaže sačuvano". Lista/učitavanje/upozorenje
(oba puta — Otkaži i Učitaj svejedno) testirani uživo kroz stvarni UI.

Sigurnost: grep na cijeli frontend dist/ build i izvorni kod — riječ
"supabase" se NE POJAVLJUJE nigdje u App.jsx/Wizard.jsx/main.jsx (0
pogodaka). Frontend zna SAMO za /schedule/* rute vlastitog backenda,
arhitekturalno nemoguće da service_role ključ procuri.

Not completed: ništa iz opsega — sve 4 stavke iz "U OPSEGU" (1-3, kod;
4 je Direktorova radnja, uputstvo ispod).

Open risks:
- Supabase besplatan nivo automatski PAUZIRA projekat nakon ~1 sedmicu
  neaktivnosti — prvi poziv nakon duže pauze može dobiti grešku dok se
  "probudi" (par sekundi do minute). Nije blokirajuće.
- NIJE testirano protiv PRAVOG Supabase-a (samo mock) — vidi uputstvo
  ispod za Direktorovu potvrdu nakon deploya.

INCIDENT (isti dan, popravljeno odmah): prvi push je oborio produkciju —
backend/Dockerfile eksplicitno navodi koje .py fajlove kopira u sliku, a
NIJE ažuriran kad je dodan novi backend/storage.py. Railway kontejner je
pukao (CRASHED, Direktor primijetio na dashboardu) sa ModuleNotFoundError
na main.py "from storage import ...". Lokalno testiranje ovo nije uhvatilo
jer se odvijalo direktno na fajl-sistemu (svi .py fajlovi prisutni), ne
kroz Docker build. Popravka: storage.py dodan u Dockerfile COPY liniju,
push-ovano odmah, potvrđeno uživo (/health 200, /schedule/list 401 —
kontejner stabilan). Vidi DECISION_LOG.md DL-009 za pun opis i "nauk za
buduće": svaki NOVI backend .py fajl mora ići u Dockerfile COPY liniju.

═══════════════════════════════════════════════════════════════════
UPUTSTVO ZA DIREKTORA — Supabase podešavanje (Claude Code ne može ovo
uraditi sam, ne rukuje pravim kredencijalima)
═══════════════════════════════════════════════════════════════════

1. Kreiraj besplatan nalog na https://supabase.com i novi projekat.

2. U Supabase dashboardu -> "SQL Editor" -> "New query", nalijepi i
   pokreni TAČNO ovo (kreira tabelu, bez izmjena):

   create table saved_schedules (
     id bigint generated always as identity primary key,
     created_at timestamptz not null default now(),
     config jsonb not null,
     lessons jsonb not null,
     label text,
     gap_score integer
   );

3. U Supabase dashboardu -> "Project Settings" -> "API":
   - Kopiraj "Project URL" (izgleda kao https://xxxxx.supabase.co)
   - Kopiraj "service_role" ključ (NE "anon"/"public" ključ — mora biti
     service_role, taj ima pun pristup i namjerno se koristi SAMO
     server-side)

4. Na Railway-u (isti obrazac kao BACKEND_PASSWORD ranije) -> backend
   servis -> "Variables" -> dodaj DVIJE nove varijable, TAČNO ovih imena
   (backend ih čita po ovim tačnim nazivima, storage.py):

     SUPABASE_URL = <Project URL iz koraka 3>
     SUPABASE_SERVICE_ROLE_KEY = <service_role ključ iz koraka 3>

5. Sačuvaj — Railway restartuje servis automatski (~30-60s).

6. Provjeri: otvori aplikaciju, generiši raspored, klikni
   "💾 Sačuvaj raspored". Ako je sve podešeno ispravno, dobićeš zelenu
   poruku "Raspored sačuvan". Za dodatnu potvrdu, u Supabase dashboardu
   -> "Table Editor" -> "saved_schedules" trebao bi vidjeti novi red.

Next: Direktorovo podešavanje Supabase-a (koraci gore), zatim potvrda da
"Sačuvaj"/"Učitaj" rade na živoj produkciji.
```
