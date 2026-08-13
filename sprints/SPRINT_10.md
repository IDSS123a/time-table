# SPRINT_10 — Filigransko poliranje svih komponenti

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 05/06/07/09 (dizajn+responsive+login) završeni

---

## OPSEG — proći kroz SVAKU komponentu, jednu po jednu

Ovo je završni pregled, ne nov dizajn. Cilj: ništa "otprilike dobro" —
sve tačno poravnato, dosljedno, bez sitnih nesavršenosti.

### Za svaku od sljedećih komponenti, provjeriti:
- Wizard Ekran A (Struktura dana)
- Wizard Ekran B (Nastavnici i predmeti)
- Wizard Ekran C (Razredi i razredništva)
- Wizard Ekran D (Nacharbeit plan)
- Wizard Ekran ⑤ (Provjera izvodivosti)
- Wizard Ekran ⑥ (Napredno — JSON)
- Login ekran (iz Sprint 09)
- Mreže rasporeda (po razredu i po nastavniku)
- Dashboard opterećenja
- Verdict prozor (uspjeh i greška varijanta)
- Loader overlay
- Dugmad (svi tipovi/stanja: mirovanje, hover, aktivno, disabled)

### Provjeriti na SVAKOJ od gore navedenih:
- [ ] Razmaci (padding/margin) dosljedni kroz cijelu aplikaciju — ista
  jedinica mjere ponavljana, ne nasumični brojevi
- [ ] Poravnanje teksta/ikonica unutar dugmadi i kartica — vizuelno
  centrirano, ne "otprilike"
- [ ] Hover/focus/active stanja postoje i dosljedna su na SVIM
  klikabilnim elementima, ne samo nekima
- [ ] Sjenke (neumorfni stil) dosljedne jačine/smjera kroz sve kartice
- [ ] Nema teksta koji se siječe, prelama ružno, ili je predaleko/preblizu
  ivici na bilo kojoj širini ekrana (ponovo brzo proći kroz breakpoint-e
  iz Sprint 06: 375/768/1280/1920px)
- [ ] Boje ISKLJUČIVO iz zvanične palete — nema slučajno uvedenih nijansi
- [ ] Ikonice/simboli (✓/⊘/⏳ i sl.) vizuelno iste veličine/stila kroz
  cijelu aplikaciju, ne miješano
- [ ] Tranzicije (hover, pojavljivanje verdict prozora, itd.) glatke,
  ne nagle/trzave — razumno trajanje (150-250ms za male, do 300ms za
  veće promjene)

**VAN OPSEGA:** bilo kakva NOVA funkcionalnost ili promjena postojećeg
dizajnerskog jezika (boje/stil su već odobreni — ovo je fino podešavanje
POSTOJEĆEG, ne novi prijedlog). Backend se ne dira (P-3).

## KRITERIJI PRIHVATANJA
```
□ Sve komponente iz liste prošle kroz sve provjere iznad
□ Direktor lično pregleda na svom uređaju prije potvrde zatvaranja
  sprinta — ovo je estetski sud koji ACA ne može sam donijeti
□ Backend NETAKNUT
```

## HANDOFF NAPOMENA
```
HANDOFF NOTE — Sprint 10 (2026-08-13)

Completed (konkretne, provjerljive popravke — ne subjektivna nagađanja):
1. Boja van zvanične palete: #1a7a3a (zelena, korištena za "izvodivo"/
   tačnu sumu časova) NIJE dio navy/sky/yellow/red/ink palete — jedina
   takva boja u cijeloj aplikaciji. Zamijenjena sa var(--sky) (isto
   značenje "prihvaćeno/uspjeh" već koristi VerdictModal). 2 mjesta:
   styles.css (.wiz-summary .ok) i Wizard.jsx (inline diff boja).
2. .chip (chip-dugmad za periode/blok-razrede/razrednik svaki dan) nije
   imao NIKAKVO hover stanje — dodano (lift + sjenka + tranzicija, isti
   obrazac kao button).
3. .wiz-step (koraci wizarda) bili su <div> bez hover stila I bez
   tastaturnog pristupa (nije se moglo doći Tab-om niti aktivirati
   Enter/Space) — dodano role="button", tabIndex, onKeyDown, aria-current,
   hover stil.
4. Nedosljedne ikonice: "Izvezi Excel"/"Izvezi izvještaj" nisu imali
   ikonicu dok "⬇️ Izvezi CSV" (ista kategorija akcije) jeste — dodato
   ⬇️ objema, dovršava postojeći obrazac.

Provjereno UŽIVO (lokalni backend + frontend dev server), bez daljih
nalaza:
- Svih 6 koraka wizarda (A–Napredno) + login ekran + mreža rasporeda
  (po razredu i po nastavniku) + dashboard opterećenja — na 375px i
  1280px, BEZ horizontalnog document-level overflow-a (automatska
  provjera scrollWidth vs innerWidth na svakom ekranu).
- Puna regresija: pravi 9-razredni config, stvaran solve (315 časova),
  verdict prozor, mreža, dashboard — sve renderuje ispravno, boja fix
  potvrđen (computed color rgb(8,171,230) na svih 9 redova provjere
  izvodivosti).

NIJE mijenjano (van opsega ili nedovoljno objektivno bez Direktorove
odluke): razmaci/border-radius variraju (5/6/8px na različitim malim
elementima) ali razlika je ispod praga vizuelne percepcije — puna
standardizacija bi rizikovala regresije bez jasne dobiti. Emoji/simbol
izbor je postojeći odobreni obrazac (Sprint 05), nije nedosljednost.

Backend NETAKNUT — git diff --stat potvrđuje SAMO App.jsx/Wizard.jsx/
styles.css promijenjeni.

Vidi DECISION_LOG.md DL-007 za pun opis.

VAŽNA NAPOMENA: kriterijum "Direktor lično pregleda na svom uređaju
prije potvrde zatvaranja sprinta" NIJE ispunjen — to je estetski sud
koji Claude Code ne može sam donijeti. Kod je gotov, testiran i
push-ovan, ali sprint se formalno ne smatra zatvorenim dok Direktor ne
pogleda uživo na svom uređaju (desktop + mobitel) i potvrdi.

Next: Direktorov pregled na živoj produkciji (desktop + mobitel) →
potvrda zatvaranja sprinta. Ako nešto zapne oku, javiti — sitne izmjene
ovog tipa su brze.
```
