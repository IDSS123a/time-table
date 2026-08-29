# SPRINT_11 — Izbor "koliko truda" za smanjenje pauza nastavnika

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 10 zatvoren. Zasnovano na STVARNOJ analizi žive aplikacije
# (Claude Code izvještaj, 2026-08-XX): 315 časova, 0 grešaka, ~45-60s po pokušaju,
# 11/19 nastavnika već gap 0-1, 7/19 gap=2, 1/19 (Selma M.) gap=3 (jedina
# "vruća" po postojećem dashboard pragu).

---

## ⚠️ NAJVAŽNIJE OGRANIČENJE — ADITIVNO, NE ZAMJENSKO

Ovo je **DODATNA, opcionalna** mogućnost — **ne mijenja podrazumijevano
ponašanje**. Ako korisnik ne dira ovu novu postavku, aplikacija radi
**identično kao danas** (1 pokušaj, ~45-60s). Rizik za postojeću, aktivnu
funkcionalnost je time sveden na minimum — nema šanse da ovo pokvari ono
što već radi za nekoga ko ovu opciju ne koristi.

## OPSEG

**U OPSEGU:**
1. U `solver.py` (ili tanka omotnica u `main.py`): dodati mogućnost da se
   `solve_timetable` pozove N puta (različiti nasumični seedovi, CP-SAT je
   djelimično stohastičan), i vrati NAJBOLJI rezultat — mjeren ISTOM
   metrikom koju dashboard već prikazuje ("Najveća dnevna rupa" po
   nastavniku, zbir preko svih nastavnika). Ne izmišljati novu metriku.
2. U Wizard-u/App.jsx: jednostavan izbor (NE apstraktan klizač) sa
   TAČNIM, poštenim vremenskim očekivanjem baziranim na stvarno
   izmjerenom ~45-60s po pokušaju:
   - **Standardno** (podrazumijevano, isto kao sada) — 1 pokušaj, ~45-60s
   - **Pojačano** — 3 pokušaja, zadrži najbolji, ~2.5-3 min
   - **Maksimalno** — 6 pokušaja, zadrži najbolji, ~5-6 min
3. Popraviti dvostruko hardkodiranu zadanu vrijednost `objective_weights`
   (trenutno postoji identično u Wizard.jsx buildConfig() I App.jsx
   inicijalnom config skeletu — dva mjesta za jednu vrijednost). Ne mora
   nužno postati vidljiva korisniku (i dalje van opsega, vidi ispod), ali
   OVAJ sprint dotiče taj kod pa je razuman trenutak da se ne dupliraju
   dvije nezavisne definicije iste stvari.
4. (Opciono, nisko prioritetno, samo ako je lako i bez rizika): ukloniti
   ili jasno označiti mrtvi `compactness` parametar u zadanim težinama,
   da se ne ostavlja zbunjujuć trag za budućnost.

**VAN OPSEGA (namjerno):**
- `gap`/`balance`/`light_late` kao pojedinačni klizači korisniku — ranije
  testirano, promjena same težine ne daje pouzdanu razliku (poliranje je
  dominira); ne graditi tu kontrolu.
- Bilo kakva promjena postojeće logike generisanja za "Standardno" način
  — mora ostati bit-identična trenutnom ponašanju.
- Backend Basic Auth, deployment, dizajn — ništa od toga se ne dira.

## PLAN (FEATURE_LIFECYCLE Korak 2)

```
/**
 * SPRINT: 11
 * SVRHA: Dati korisniku POŠTEN, TESTIRAN način da kaže "potrudi se više
 *        oko smanjenja pauza nastavnika" — bez lažnog utiska kontrole
 *        (raniji test dokazao da sama promjena težine ne radi pouzdano;
 *        više nezavisnih pokušaja + zadrži najbolji JESTE dokazano
 *        efikasno, izmjereno na stvarnim podacima).
 * DOTIČE: solver.py (best-of-N omotnica), main.py (prosljeđuje broj
 *         pokušaja), Wizard.jsx/App.jsx (izbor + popravka duplicirane
 *         zadane vrijednosti)
 * VAN OPSEGA: pojedinačni klizači za gap/balance/light_late, bilo šta
 *             van generisanja rasporeda
 * GARANCIJA: "Standardno" (zadano) ponašanje ostaje bit-identično
 *            trenutnoj produkciji — provjeriti eksplicitno prije i poslije.
 */
```

## KRITERIJI PRIHVATANJA
```
□ "Standardno" način daje IDENTIČAN rezultat kao trenutna produkcija na
  istom config-u (regresija provjerena — pokrenuti prije i poslije
  izmjene, uporediti)
□ "Pojačano"/"Maksimalno" stvarno pozivaju solve_timetable više puta i
  zadržavaju objektivno najbolji rezultat (po dashboard metrici) —
  provjereno da rezultat NIJE isti kao samo jedan nasumičan pokušaj
□ Vrijeme čekanja odgovara najavljenom (izmjereno, ne pretpostavljeno)
□ Loader (iz Sprint 04/05) ispravno prikazuje trajanje i za duže pokušaje
□ Backend jezgro netaknuto osim najavljene best-of-N omotnice — git diff
  jasno pokazuje SAMO tu izmjenu
□ Postojeći dashboard i dalje ispravno prikazuje rezultat (bez obzira na
  broj pokušaja koji su se desili "iza scene")
```

## HANDOFF NAPOMENA
```
HANDOFF NOTE — Sprint 11 (2026-08-13)

Completed:
- solve_timetable_best_of (solver.py) — aditivna omotnica, attempts<=1 je
  čist passthrough na nepromijenjeni solve_timetable. attempts>1 zove N puta
  sa različitim seedovima (CP-SAT random_seed + _polish_gaps seed), bira
  najmanji _dashboard_gap_score (kopija DashboardTable metrike, ne nova).
- main.py: /solve prima attempts (zadano 1), klampovano [1,4].
- App.jsx: izbor Standardno/Pojačano/Maksimalno (obično <select>, ne
  klizač), loader hint tekst za trajanja duža od Standardnog.
- Duplirana objective_weights svedena na jedan izvor istine (Wizard.jsx
  izvozi DEFAULT_OBJECTIVE_WEIGHTS, App.jsx uvozi).
- Mrtav compactness parametar jasno označen komentarom (nije uklonjen).

Izmjerena STVARNA vremena (idss_config.example.json, 9 razreda, 315 časova):
- Standardno (1 pokušaj): 47.1s
- Pojačano (3 pokušaja): 139.3s (~2.3 min)
- Maksimalno (originalno 6 pokušaja, testirano): 280.2s (~4.67 min)
- Maksimalno (FINALNO 4 pokušaja, nakon Railway nalaza): 186.8s (~3.11 min)

Regression check: Standardno način PROŠAO. git diff na solver.py pregledan
liniju-po-liniju — svaka nova linija je unutar `if seed is not None:` grane
koja se za Standardno (seed=None, zadano) nikad ne izvršava. Uživo pokrenuto:
315 časova, 0 grešaka, 47.1s — identično prošlom izvještaju (Sprint 10
analiza), nema odstupanja ni u jednoj stavci.

Dokaz da Pojačano/Maksimalno rade više pokušaja (ne samo tvrdnja):
instrumentisan poziv solve_timetable_best_of(attempts=3) pokazao 3 RAZLIČITA
pojedinačna rezultata (gap_score 23, 21, 21) unutar JEDNOG poziva, i potvrdio
da vraćeni rezultat = min od sva tri. Puni end-to-end test kroz stvarni UI
(login → paste config → izbor Pojačano → Generiši → dashboard) — loader
ispravno prikazao "Pojačano način — traje ~2.5–3 min, isprobava 3 varijante",
rezultat renderovan (9 razreda, 315 časova), dashboard i dalje ispravno
prikazuje 19 nastavnika sa istim brojevima kao inače.

Not completed: ništa iz opsega — sve 4 stavke iz "U OPSEGU" urađene.

Open risks — NAĐEN i POPRAVLJEN prije zatvaranja sprinta:
Railway zatvara HTTP vezu "nakon 5 minuta bez prenosa podataka" (potvrđeno
iz zvanične dokumentacije). /solve ne šalje ništa nazad dok cijeli izračun
ne završi — tačan scenario za taj limit. Originalnih 6 pokušaja = 4.67 min
(opasno blizu granice na lokalnoj mašini, realan rizik da bude gore na
produkcijskom hardveru). Direktor upitan eksplicitno, odlučio smanjiti na 4
pokušaja = 3.11 min (sigurna margina ~2 min). I frontend labela I backend
klamp (main.py) ažurirani — 6 se više nigdje ne pojavljuje kao gornja
granica. Vercel NIJE rizik (frontend zove Railway direktno iz browsera).

Preostalo, nije hitno: da se stvarno provjeri na ŽIVOJ produkciji (ne samo
lokalno na identičnom kodu) da Maksimalno=4 zaista prolazi kroz Railway bez
problema — Claude Code ne rukuje pravom lozinkom pa ovo zahtijeva ili da
Direktor sam proba, ili buduću sesiju s dozvolom.

Next: push na produkciju, pa (opciono) Direktorova živa provjera Maksimalno
načina na pravom Railway URL-u.
```
