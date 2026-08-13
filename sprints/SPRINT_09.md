# SPRINT_09 — Neumorfni login ekran

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 05 (dizajn), Sprint 08 (sigurnost) po mogućnosti prije ovog

---

## KONTEKST (odluka Direktora, ne nagađano)
Direktor želi ljepši, prilagođen ekran za prijavu — NE stvarno više
korisnika. I dalje postoji JEDNA zajednička lozinka. Polje za korisničko
ime je kozmetičko (ne provjerava se posebno). Direktor takođe želi
PROMIJENITI trenutnu lozinku u novu.

## OPSEG

### 1. Ukloniti ružan native browser Basic Auth prozorčić
Trenutno Vercel middleware (i/ili browser native prompt) prekida
učitavanje PRIJE nego se React aplikacija uopšte prikaže. Da bi se
prikazao NAŠ dizajn umjesto browser-ovog, aplikacija mora sama
prikazati login ekran NAKON što se učita, ne prije.
- Ukloniti Vercel middleware Basic Auth (ako je to trenutni mehanizam
  na frontendu) — zamijeniti in-app login logikom opisanom ispod.
- **Napomena:** stvarna zaštita ostaje na backend Basic Auth (main.py)
  — to se NE uklanja. Ovo je samo promjena KAKO se lozinka traži od
  korisnika, ne promjena STVARNE sigurnosne granice.

### 2. Neumorfni login ekran (dizajn iz Sprint 05)
Novi ekran, prikazan kad aplikacija nema (ili ima nevažeću) sačuvanu
lozinku:
- Centrirana neumorfna kartica (`.neu-raised`, isti stil kao ostatak
  aplikacije), logo škole iznad, dva polja: "Korisničko ime" (bilo koji
  tekst prihvaćen, ne provjerava se) i "Lozinka" (tip password), dugme
  "Prijavi se".
- Netačna lozinka → isti stil verdict prozora kao za odbijenu izmjenu
  rasporeda (crvena ivica, jasna poruka "Netačna lozinka").
- Tačna lozinka → kartica nestaje, prikazuje se aplikacija.

### 3. Tehnička implementacija (potrebna mala backend dopuna)
Da bi se lozinka mogla PROVJERITI prije prikazivanja aplikacije (ne
samo pri prvom stvarnom pozivu), potreban je jedan mali, postojeći
mehanizam iskorišten iznova:
- Backend: DODATI jedan lagan endpoint (npr. `GET /verify-auth`) koji
  koristi POSTOJEĆI `require_auth` (main.py) — vraća `{"ok":true}` ako
  je lozinka tačna (401 ako nije). Ovo NIJE nova sigurnosna logika,
  samo tanka omotnica oko već postojeće provjere — isti standard kao
  `/validate-move` oko `validate()`.
- Frontend: pri unosu lozinke, pozvati `/verify-auth` s unesenom
  lozinkom (Basic Auth header ručno sastavljen). Ako 200 → sačuvati
  lozinku u `sessionStorage` (NE `localStorage` — briše se kad se
  tab zatvori, sigurnije) i koristiti je za SVE dalje pozive (Generiši,
  izvoz, itd. — svi fetch pozivi trebaju sad ručno dodati Authorization
  zaglavlje umjesto da se oslanjaju na browser cache).

### 4. Promjena same lozinke (nije kod, nego podešavanje)
Direktor treba SAM promijeniti vrijednost `BACKEND_PASSWORD` (Railway)
env varijable na novu lozinku po svom izboru (Railway Dashboard →
Variables). Claude Code može ovo samo PODSJETITI i objasniti korak-po-
korak, ne može sam mijenjati vrijednost (Direktor bira lozinku).

**VAN OPSEGA:** stvarni višekorisnički sistem (spisak korisnika) — nije
traženo. Promjena bilo kojeg drugog dizajna van login ekrana.

## KRITERIJI PRIHVATANJA
```
□ Otvaranje sajta prikazuje NAŠ neumorfni login ekran, ne browser prozorčić
□ Netačna lozinka → crveni verdict stil, jasna poruka, ostaje na login ekranu
□ Tačna lozinka → aplikacija se prikazuje, radi normalno (Generiši/izvoz/drag)
□ Lozinka u sessionStorage, ne localStorage
□ Backend dopuna (samo /verify-auth) — ništa drugo u main.py, solver.py/
  validators.py/exports.py netaknuti
□ Direktor dobija jasno uputstvo kako da promijeni BACKEND_PASSWORD na Railway
```

## HANDOFF NAPOMENA
```
HANDOFF NOTE — Sprint 09 (2026-08-13)

Completed:
- Vercel middleware Basic Auth (frontend/middleware.js) UKLONJEN.
  Zamijenjen neumorfnim login ekranom (LoginScreen, App.jsx) — kartica
  (.neu-raised), logo, "Korisničko ime" (kozmetičko, ne šalje se nikuda)
  + "Lozinka", dugme "Prijavi se".
- Backend: dodan GET /verify-auth (tanka omotnica oko postojećeg
  require_auth) — jedina izmjena main.py. solver.py/validators.py/
  exports.py netaknuti (potvrđeno git diff --stat).
- Lozinka se čuva u sessionStorage (NE localStorage — briše se kad se
  tab zatvori), šalje kao Basic Auth header uz SVAKI poziv backendu
  (feasibility/solve/export/validate-move) preko novog apiFetch
  helper-a. Build-time ugrađena lozinka (VITE_BACKEND_PASSWORD) uklonjena
  — bila je vidljiva u javnom JS bundle-u, ovo je usput i sigurnosno
  poboljšanje.
- Netačna lozinka -> verdict prozor "Netačna lozinka" (isti stil kao
  odbijena izmjena rasporeda — crvena ivica), login forma ostaje
  vidljiva ispod. Tačna lozinka -> app se prikazuje, radi normalno.
- Ako backend vrati 401 na bilo koji autentifikovan poziv (npr. lozinka
  promijenjena na Railway-u dok je tab već otvoren) -> automatska odjava,
  sessionStorage očišćen, korisnik vraćen na login ekran umjesto da app
  ostane "zaglavljena" uz zbunjujuću grešku veze.
- Testirano UŽIVO (lokalni backend + frontend dev server, desktop 1280px
  i mobilni 375px viewport): pogrešna lozinka -> greška, ostaje na
  loginu; tačna lozinka -> app radi (feasibility poziv potvrđen sa
  ispravnim Authorization headerom u mrežnim zahtjevima); reload istog
  taba ne traži login ponovo (tiha provjera sačuvane lozinke); STVARNA
  promjena lozinke na backendu dok je tab otvoren -> sljedeći poziv vraća
  401 -> app se automatski odjavljuje -> prijava novom lozinkom radi;
  mobilni prikaz login kartice bez horizontalnog overflow-a.
  Vidi DECISION_LOG.md DL-006 za pun opis.

Uputstvo za promjenu BACKEND_PASSWORD na Railway (Direktor radi sam,
Claude Code ne može mijenjati vrijednost env varijable):
1. Otvori https://railway.app i prijavi se.
2. Otvori projekat "time-table" (backend servis).
3. Klikni na servis (backend), pa karticu "Variables".
4. Pronađi BACKEND_PASSWORD, klikni na njega (ikonica olovke/edit).
5. Upiši novu lozinku po svom izboru (bez razmaka na početku/kraju).
6. Sačuvaj — Railway automatski restartuje servis sa novom vrijednošću
   (traje otprilike 30-60 sekundi, provjeri https://<backend-url>/health
   vraća {"ok":true} kad je gotovo).
7. VAŽNO: nakon ovoga, SVI tabovi koji su već otvoreni sa starom
   lozinkom biće automatski odjavljeni na sljedećoj radnji (ovo je
   namjerno ponašanje iz ovog sprinta) — treba se ponovo prijaviti sa
   novom lozinkom.
8. (Opciono) SITE_PASSWORD i VITE_BACKEND_PASSWORD Vercel env varijable
   se više ne koriste nakon ovog sprinta — mogu se obrisati radi
   urednosti, nije obavezno.

Next: TBD — najvjerovatnije potvrda na živoj produkciji nakon push-a
(login ekran umjesto browser prozorčića na pravom Vercel URL-u), i po
želji Direktorova promjena BACKEND_PASSWORD.
```
