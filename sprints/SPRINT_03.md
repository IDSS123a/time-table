# SPRINT_03 — Deployment (backend + frontend na internet)

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 01 i Sprint 02 ZAVRŠENI i potvrđeni (uključujući
# Claude Code popravku za morning_core_by_grade, nezavisno verifikovanu)

---

## OPSEG (striktno — ništa van ovoga u ovom sprintu)

**U OPSEGU:**
1. Deploy **backend** (FastAPI + OR-Tools, postojeći `backend/Dockerfile`) na
   **Railway** (preporuka — GitHub-povezan, bez potrebe za komandnom linijom,
   pogodno za non-codera). Cloud Run je alternativa ako Director radije to
   želi, ali zahtijeva `gcloud` CLI — više koraka za non-codera.
2. Podesiti `ALLOWED_ORIGINS` environment varijablu na backendu da dozvoli
   samo stvarni frontend URL (ne `*` u produkciji — sigurnosni minimum).
3. Deploy **frontend** (Vite/React build) na **Vercel** (GitHub-povezan,
   automatski build na svaki push).
4. Postaviti `VITE_API_URL` na Vercelu da pokazuje na live backend URL
   (Railway).
5. **Uključiti password protection** na Vercel deploymentu (ugrađena opcija,
   bez pisanja koda — Vercel Project Settings → Deployment Protection →
   Password Protection). Odlučeno: Direktor NE želi javno dostupan URL bez
   lozinke, s obzirom da app sadrži stvarne IDSS podatke o nastavnicima.
6. Provjeriti cijeli tok **uživo, s interneta** (ne localhost): otvoriti
   frontend URL u browseru, unijeti lozinku, učitati config, generisati
   raspored, izvesti Excel/izvještaj.
7. Ažurirati `README.md` sa live URL-ovima (backend i frontend) i napomenom
   da je frontend zaštićen lozinkom (bez upisivanja same lozinke u README).

**VAN OPSEGA (NE dirati u ovom sprintu):**
- Vlastiti domen (npr. raspored.idss.ba) — kasnije, opcionalno.
- Prijava/lozinka (autentifikacija) — vidi napomenu o sigurnosti ispod;
  ne implementira se u ovom sprintu, samo se svjesno odluči.
- Baza podataka — i dalje nije potrebna.
- Bilo kakva izmjena logike u `solver.py`, `validators.py`, `exports.py`.
- Wizard funkcionalnost (drag-and-drop, dashboard) — to je Sprint 04.

## ✅ Sigurnosna odluka (donesena 2026-08-10)

Direktor je odlučio: **frontend MORA imati lozinku** (Vercel Password
Protection, ugrađena opcija). Zapisati ovu odluku u `DECISION_LOG.md` kao
novi DL unos kad se sprint završi. Backend URL (Railway) ostaje bez lozinke
— dostupan je samo preko frontenda koji je zaštićen, i nije praktično
koristan bez wizarda ispred njega.

## PLAN (FEATURE_LIFECYCLE Korak 2)

```
/**
 * SPRINT: 03
 * SVRHA: Učiniti aplikaciju dostupnom preko interneta (ne samo na
 *        Direktorovom računaru), da je može koristiti i s drugog uređaja.
 * DOTIČE: hosting konfiguracija (Railway, Vercel), main.py (samo
 *         ALLOWED_ORIGINS env varijabla, NE logika), README.md
 * VAN OPSEGA: custom domen, autentifikacija (osim ako Direktor eksplicitno
 *             zatraži password protection), baza, wizard funkcionalnost
 * USTAV REF: CONSTITUTION.md P-3 (jezgro se ne prepisuje), DECISION_LOG.md
 *            DL-001 (Python/FastAPI stack odluka — ovaj sprint je razlog
 *            zašto je ta odluka uopšte donesena: OR-Tools treba pravi
 *            server, ne samo localhost)
 */
```

## KRITERIJI PRIHVATANJA (Faza 5 — TESTIRANJE)

Sprint NIJE završen dok Direktor LIČNO (ne ACA-ova tvrdnja) ne potvrdi:

```
□ Backend URL (Railway) je dostupan s interneta — GET .../health vraća {"ok":true}
  otvoreno u browseru na TELEFONU ili drugom računaru (ne istoj mreži/računaru
  gdje je rađen deploy — to je prava provjera da je stvarno na internetu)
□ Frontend URL (Vercel) traži lozinku PRIJE nego prikaže wizard — testirano
  u browseru gdje Direktor NIJE prijavljen (npr. Incognito ili drugi uređaj)
□ Nakon unosa tačne lozinke, wizard se otvara i radi normalno
□ "Generiši raspored" na živom sajtu radi (poziva live backend, ne localhost)
□ Izvoz Excel i izvještaja rade na živom sajtu
□ ALLOWED_ORIGINS na backendu NIJE "*" — postavljen na tačan Vercel URL
□ README.md ažuriran sa oba live URL-a (bez same lozinke u README-u)
□ Sigurnosna odluka (lozinka: DA) zapisana kao novi unos u DECISION_LOG.md
```

## HANDOFF NAPOMENA (piše ACA na kraju sprinta)

```
HANDOFF NOTE — Sprint 03
Completed: [šta je urađeno — live URL-ovi ovdje]
Not completed: [šta eventualno nije]
Open risks: [npr. Railway besplatni plan ima ograničenja — koja?]
Technical debt: [prečice, ako ih ima]
Next sprint: Sprint 04 — Drag-and-drop ručna korekcija + dashboard opterećenja
```
