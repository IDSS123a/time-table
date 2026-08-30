# SPRINT_15 — Boja po predmetu u mreži rasporeda

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 10-14 zatvoreni. Direktor je dostavio gotovu tabelu
# boja po predmetu (iz vlastitog mockup-a) — ovaj sprint je uglavnom
# "ugradi postojeću tabelu", ne dizajn od nule.

---

## ⚠️ SVJESNO ODSTUPANJE OD ZVANIČNE PALETE — SAMO OVDJE

Direktor je eksplicitno odobrio da SAMO za ovu jednu svrhu (boja po
predmetu u ćeliji rasporeda) izađemo iz zvanične palete od 5 boja
(#035EA1/#08ABE6/#FFCB29/#E8262C/#000000). Ovo NE mijenja pravilo za
sve ostalo (dugmad, verdict prozor, zaglavlje, dashboard) — tamo
zvanična paleta ostaje netaknuta, isključivo ovaj jedan element dobija
širu paletu.

## OPSEG

**U OPSEGU:**
1. Dodati mapu `SUBJECT_COLORS` (ispod) u frontend, i primijeniti kao
   pozadinsku boju ćelije u OBA prikaza mreže rasporeda ("po razredu" i
   "po nastavniku"), po nazivu predmeta.
2. **Nacharbeit** predmet VEĆ ima svoju boju u ovoj tabeli
   (`#FBD4B4`) — ovo ZAMJENJUJE postojeće posebno hardkodirano
   svijetlo-zeleno isticanje za Nacharbeit (trenutno u kodu kao
   poseban slučaj). Nakon ovog sprinta, Nacharbeit se boji kroz ISTI,
   jedinstveni mehanizam kao svaki drugi predmet — ne dva odvojena
   sistema.
3. Tamniji/čitljiv tekst preko svih pozadina (provjeriti čitljivost —
   neke boje u tabeli su vrlo svijetle, npr. Chemie `#CCFFFF`).
4. Postojeća stanja ćelije koja MORAJU ostati vidljiva PREKO/UZ novu
   boju predmeta, ne zamijenjena njome: "rezervisano" (honorarni
   placeholder), hover/grab tokom prevlačenja (Sprint 07), stanje
   tokom čekanja (loader, Sprint 05). Ova stanja idu kao granica/ikonica/
   providnost NA VRHU boje predmeta, ne kao zamjena.

**Konačna tabela boja (2 duplikata iz Direktorovog fajla ispravljena —
Naturkunde i Lebenskunde dobili nove, jedinstvene nijanse; ostalih 21
nepromijenjeno iz originala):**

```javascript
const SUBJECT_COLORS = {
  'B/H/S': '#F47914',
  'Biologie': '#01FF62',
  'Chemie': '#CCFFFF',
  'Deutsch': '#FF3737',
  'Englisch': '#DF6FBF',
  'Erdkunde': '#92D050',
  'Ethik': '#548DD4',
  'Französisch': '#00FFFF',
  'Geschichte': '#666699',
  'Gesellschaft': '#FBD90D',
  'Grundtechniken': '#FFE699',
  'Informatik': '#80EFFE',
  'Kunst': '#95B3D7',
  'Lebenskunde': '#C9A0DC',   // ISPRAVLJENO — bilo isto kao Physik
  'Mathematik': '#FFFF00',
  'Musik': '#FBBDF8',
  'Nacharbeit': '#FBD4B4',
  'Naturkunde': '#7FE8A4',    // ISPRAVLJENO — bilo isto kao Biologie
  'Physik': '#00CC99',
  'Sachkunde': '#99FF33',
  'Sport': '#00B0F0',
  'Technik': '#FFE699',
  'Umweltkunde': '#33CC33'
};
```

**VAN OPSEGA (namjerno, osim ako Direktor kasnije zatraži drugačije):**
- Excel/Word izvoz — ova tabela je za EKRAN (React grid), ne za
  `exports.py`. Ako Direktor poželi iste boje i u Excel izvozu, to je
  ZASEBNA, buduća odluka.
- Bilo kakva izmjena zvanične palete za dugmad/dashboard/verdict prozor.
- Backend — ovo je čisto frontend, `solver.py`/`validators.py`/
  `exports.py`/`main.py` se ne diraju.

## KRITERIJI PRIHVATANJA
```
□ Svaki predmet ima dosljednu, jedinstvenu boju u obje mreže (po
  razredu i po nastavniku)
□ Nijedna dva predmeta nemaju identičnu boju (provjereno, uklj. dva
  popravljena duplikata)
□ Tekst čitljiv preko svih pozadina, uključujući najsvjetlije (Chemie)
□ Nacharbeit koristi NOVI, jedinstveni mehanizam — stari poseban slučaj
  uklonjen, ne dupliran
□ "Rezervisano", hover/grab, i loader stanja i dalje vidljivi preko
  boje predmeta
□ Zvanična paleta (dugmad/verdict/zaglavlje/dashboard) NEPROMIJENJENA —
  git diff potvrđuje da se boje mijenjaju SAMO u komponenti mreže
□ Backend netaknut — git diff --stat prazan za backend/
```

## HANDOFF NAPOMENA
```
HANDOFF NOTE — Sprint 15

Completed:
1. SUBJECT_COLORS mapa (App.jsx) — Direktorova tabela preuzeta tačno,
   SA JEDNIM DODATNIM ispravkom preko dva već navedena: dostavljeni
   fajl je imao TRI duplikata, ne dva. Naturkunde/Lebenskunde su već
   stigli ispravljeni; Grundtechniken i Technik su OBA imala #FFE699
   (nenavedeno u sprint dokumentu) — pitao Direktora uživo (2026-08-30),
   odabrano: Grundtechniken zadržava #FFE699, Technik dobija #D2B48C
   (ista porodica boja — tan/bež, vizuelno blizu originalne namjere,
   ali razlučiva). Svih 23 boje sada međusobno jedinstvene (provjereno
   programski, prije i poslije izmjene).
2. Boja se primjenjuje kao inline style (backgroundColor) na <td> u
   OBA prikaza (Grid komponenta je zajednička za "po razredu" i "po
   nastavniku" — jedna izmjena pokriva oba).
3. Nacharbeit VIŠE NEMA poseban CSS slučaj (bila je td.nach{background:
   #eaf6ff}, uklonjeno) — ide kroz ISTI mehanizam kao svaki drugi
   predmet, SUBJECT_COLORS["Nacharbeit"]. Potvrđeno uživo: 35 Nacharbeit
   ćelija, 0 ćelija još koristi staru "nach" klasu.
4. Čitljivost teksta: izračunata WCAG relativna luminansa/kontrast za
   svih 23 boje NAMJERNO prije pisanja koda (crno vs bijelo tekst za
   svaku) — 22 od 23 boje prolaze sa CRNIM tekstom (uklj. najsvjetliju,
   Chemie #CCFFFF, kontrast 19.3:1); JEDINO Geschichte (#666699)
   zahtijeva BIJELI tekst (crno bi dalo samo 3.93:1, ispod WCAG AA
   4.5:1) — implementirano kao nova "light-text" CSS klasa, primijenjena
   i na .sub i na .who (podnaslov nastavnika). Postojeći fiksni ".who"
   ton (#456, tuniran za bijelu pozadinu) ZAMIJENJEN sa color:inherit —
   taj stari ton bi na nekoliko zasićenih novih boja (npr. Deutsch
   #FF3737) pao na samo 2.1:1 kontrasta, daleko ispod čitljivog praga.
5. "Rezervisano" (honorarni placeholder): PREKO boje predmeta (ne
   zamjena) — crvena inset ivica (3px, var(--red)) + crven podebljan
   tekst (.sub i .who), boja predmeta ostaje vidljiva ispod. Potvrđeno
   uživo: 13 rezervisanih ćelija, sve zadržavaju svoju boju predmeta u
   pozadini (npr. Französisch #00FFFF) uz crvenu ivicu.
6. Hover/grab (draggable) i "vučem preko" (drag-target) stanja: hover
   koristi transform+box-shadow (nikad nije dirao pozadinu, ostaje
   kompatibilan bez izmjene). drag-target je PROMIJENJEN sa punog
   `background:#fff6d8` (potpuna zamjena) na poluproziran žuti
   `background-image: linear-gradient(rgba(255,203,41,.45), ...)` —
   boja predmeta u pozadini OSTAJE vidljiva ispod žutog "premaza".
   Potvrđeno programski (getComputedStyle): backgroundColor nepromijenjen
   dok je drag-target/dragging klasa prisutna.

Testirano UŽIVO (pravi backend, pravi 9-razredni IDSS config, real
solve — 315 časova, 9 tabela u OBA prikaza):
- Svih 23 predmeta ima dosljednu boju u svih 9 tabela, oba prikaza
  (getComputedStyle provjeren za svaku ćeliju, 0 nekonzistentnosti).
- Nijedna dva predmeta nemaju istu boju (Technik promijenjen, ostatak
  tabele netaknut).
- Geschichte ćelije: potvrđen bijeli tekst (.sub, .who, td sve #fff).
- Chemie (najsvjetlija, #CCFFFF) i Deutsch (najzasićenija za crno,
  5.85:1) ćelije: potvrđen crn tekst, vizuelno čitljivo na screenshot-u.
- Rezervisano: potvrđena crvena ivica + crven tekst PREKO vidljive boje
  predmeta (Französisch cyan pozadina i dalje vidljiva).
- Nacharbeit: potvrđen jedinstven mehanizam, stara klasa uklonjena.
- Drag-target: potvrđen poluproziran žuti sloj preko boje predmeta.
- npm run build prolazi bez grešaka.
- backend/ netaknut (git diff --stat prazan).
- Zvanična paleta (:root u styles.css) netaknuta (git diff potvrđuje
  nula izmjena u :root bloku) — dugmad/verdict/zaglavlje/dashboard i
  dalje koriste ISKLJUČIVO --navy/--sky/--yellow/--red/--ink/--surface.
  "Rezervisano" ivica koristi POSTOJEĆI var(--red) token, nije nova boja.
- Dva čista screenshot-a snimljena uživo (svježa kartica, prije
  zatvaranja verdict prozora) — vizuelno potvrđuju čitljive, ispravne
  boje po predmetu uz aktivan sticky traka (Sprint 13) i žuti verdict
  prozor (Sprint 14), sve zajedno bez sukoba.

Not completed: ništa iz opsega.

Open risks:
- Alatka za snimanje ekrana u ovom razvojnom okruženju povremeno vraća
  prazan snimak nakon zatvaranja verdict prozora ili promjene prikaza
  (nasumično, potvrđeno da NIJE vezano za CSS/JS izmjene ovog sprinta —
  ista pojava se javlja i na sasvim svježoj kartici bez ijedne moje
  izmjene stanja). Zamijenjeno sa programskom provjerom (getComputedStyle
  na svih 9 tabela × 2 prikaza) koja je, za ovu vrstu provjere (boje,
  kontrast, klase), pouzdanija od vizuelnog snimka.
- Treći duplikat boje (Grundtechniken/Technik #FFE699) koji Direktorov
  originalni fajl nije naveo — riješeno uz Direktorovu potvrdu uživo
  (2026-08-30), Technik dobio #D2B48C.
Next: TBD po dogovoru s Direktorom.
```
