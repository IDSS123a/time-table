# SPRINT_07 — Prava podrška za dodir + miš u prevlačenju časova

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 06 završen (Direktor izabrao opciju (a) — prava
# biblioteka, ne "tapni-tapni" alternativa, ne "ostavi kako jeste")

---

## OPSEG

**U OPSEGU:**
1. Zamijeniti trenutni HTML5 "native" drag-and-drop (koji ne radi na
   dodirnim ekranima, potvrđeno u Sprint 06) bibliotekom koja podržava
   I miš I dodir. Preporuka: **@dnd-kit/core** (moderna, aktivno
   održavana, ima ugrađene senzore za miš i dodir, lagana) — ali ako
   Claude Code ima dobar razlog za drugu jednako pouzdanu biblioteku sa
   stvarnom touch podrškom, slobodno predložiti i objasniti zašto.
2. Zadržati POSTOJEĆE ponašanje i izgled u potpunosti: grab/grabbing
   kursor i lift efekat na desktopu, poziv `/validate-move` nakon
   ispuštanja, verdict prozor (uspjeh/greška) kao rezultat — ovo je
   zamjena MEHANIZMA ispod haube, ne promjena onoga što korisnik vidi
   kao ishod.
3. Ukloniti poruku "Ručno pomjeranje... dostupno je samo na računaru"
   (dodanu u Sprint 06) — više nije tačna kad dodir stvarno radi.
4. Testirati GENUINE na oba unosa: desktop (miš, kao do sada) I dodir
   (stvarni touch eventi kao u Sprint 06 testu — ne pretpostaviti da
   radi samo zato što biblioteka to obećava).

**VAN OPSEGA:** bilo kakva izmjena boja/stila/verdict prozora (P-3-tipa
pravilo za ovaj sprint — dizajn iz Sprint 05 se ne dira). Backend se ne
dira (pravo P-3).

## KRITERIJI PRIHVATANJA
```
☑ Desktop: prevlačenje mišem radi identično kao prije (grab kursor,
  lift, verdict prozor) — regresija provjerena UŽIVO (pravi MouseEvent
  niz: mousedown->mousemove->mouseup, ne samo klik)
☑ Dodir: stvaran touch test (touchstart/touchmove/touchend, ne samo
  pretpostavka) uspješno pomjera čas i poziva /validate-move —
  potvrđeno DVA puta (validna promjena = uspjeh, nevalidna = odbijena
  sa tačnim porukama), plus potvrđeno da KRATAK dodir (<200ms) NE
  pokreće prevlačenje (da ne otima skrolanje tabele na dodir)
☑ Poruka "samo na računaru" uklonjena (potvrđeno — 0 pogodaka u tekstu
  stranice)
☑ Nema nove zavisnosti van jedne odabrane drag-and-drop biblioteke —
  samo @dnd-kit/core u package.json (njegove sopstvene tranzitivne
  zavisnosti nisu poseban izbor)
☑ Backend NETAKNUT — git diff --stat prazan za backend/
```

## HANDOFF NAPOMENA
```
HANDOFF NOTE — Sprint 07 (2026-08-12)

Completed:
Biblioteka: @dnd-kit/core (^6.3.1) — jedina nova zavisnost, kako je
Direktor odobrio (opcija a). Zamijenjen HTML5 "native" draggable atribut
+ dragstart/dragover/drop događaji, koji na dodiru nisu radili (Sprint 06
nalaz), sa @dnd-kit-ovim DndContext + useDraggable/useDroppable hook-ovima.

Tehnički detalji (za budući ACA):
- Svaka ćelija mreže je ISTOVREMENO draggable i droppable (isti fizički
  termin je i mogući izvor i mogući cilj) — dva dnd-kit hook-a spojena u
  jedan ref preko malog wrapper-a (DraggableCell u App.jsx).
- id ćelije: "{grade}::{day}::{period}" — jedinstven kroz SVE razrede,
  jedan zajednički DndContext obuhvata sve mreže (isto kao ranije: cross-
  razred prevlačenje se registruje ali se ODBIJA u handleDragEnd, isti
  UX kao prije).
- DVA senzora, namjerno RAZLIČITA aktivaciona pravila:
  • MouseSensor {distance: 5} — miš: prevlačenje počinje odmah (5px praga),
    isti "osjećaj" kao ranije native dnd.
  • TouchSensor {delay: 200, tolerance: 8} — dodir: MORA se držati prst
    ~200ms prije nego prevlačenje počne. Bez ovoga bi SVAKI pokušaj
    horizontalnog skrolanja mreže na dodirnom ekranu (iz Sprint 06)
    greškom pokrenuo prevlačenje umjesto skrolanja — standardan dnd-kit
    obrazac za "prevlačivo unutar skrolabilnog kontejnera", POTVRĐEN
    uživo (kratak dodir <200ms ne pokreće drag, vidi testove ispod).
  Nije korišten jedinstveni PointerSensor jer on nema odvojena pravila
  za miš vs dodir — MouseSensor+TouchSensor daje finiju kontrolu tačno
  za ovaj slučaj (klizna tabela).
- touch-action:none dodan na .draggable ćelije (CSS) — potreban da
  browser ne "otme" touch gest za svoje ugrađeno skrolanje prije nego
  dnd-kit stigne da ga prepozna kao prevlačenje.
- handleDrop(grade,day,period) [pratio dragSrc state odvojeno] zamijenjen
  sa handleDragEnd(event) — @dnd-kit-ov onDragEnd daje I izvor (active)
  I cilj (over) ODJEDNOM, nije više potreban odvojen onDragStart+state.
  dragSrc state uklonjen (više ne postoji).
- Vizuelno: dragovana ćelija dobija translate3d (prati prst/kursor) —
  ovo NIJE postojalo kod native dnd (koji je ostavljao izvornu ćeliju na
  mjestu i oslanjao se na OS "duh" sliku) — neizbježna posljedica zamjene
  mehanizma, ne namjerna estetska promjena. Grab/grabbing kursor, hover
  lift efekat, drag-target highlight, verdict prozor — SVE identično kao
  prije (drag-target sada dolazi direktno iz dnd-kit-ovog useDroppable
  isOver, umjesto ručno praćenog App-state).

Testirano UŽIVO sa PRAVIM događajima (ne pretpostavkom, ne .click()):
1. Miš: pravi MouseEvent niz (mousedown na izvoru, mousemove preko praga
   pa do cilja, mouseup na cilju) — potvrđeno: cilj dobija "drag-target"
   klasu dok se lebdi iznad, verdict "Promjena prihvaćena" nakon
   ispuštanja, /validate-move pozvan (potvrđeno u backend logu).
2. Miš, usred prevlačenja (bez ispuštanja): ćelija dobija klasu
   "dragging", cursor: grabbing (bilo "grab" u mirovanju) — potvrđeno
   getComputedStyle.
3. Dodir (390px, emulacija dodira potvrđena preko pointer:coarse): pravi
   TouchEvent niz (touchstart, 260ms pauza — duže od 200ms aktivacionog
   kašnjenja, touchmove, touchend) — VALJANA promjena: verdict "Promjena
   prihvaćena", /validate-move pozvan (potvrđeno backend logom).
4. Dodir, NEVALJANA promjena (Mathematik iz jutarnjeg u Nacharbeit
   period): verdict "Nije moguće" sa TAČNIM porukama iz validate()
   ("Mathematik razred 1 van jutarnjih perioda...", itd.) — identično
   ponašanje kao miš/native dnd u ranijim sprintovima.
5. Dodir, KRATAK dodir (<200ms prije micanja, simulira brz svajp/skrol):
   potvrđeno da NE pokreće prevlačenje (nema "dragging" klase, nema
   verdict-a) — dokaz da skrolanje tabele na dodirnom ekranu (Sprint 06)
   ostaje neometano.
6. Cross-razred prevlačenje (razred 1 -> razred 2 mreža): i dalje
   ODBIJENO sa istom porukom kao prije ("Čas se može prevući samo unutar
   istog razreda.").
7. Stara poruka "Ručno pomjeranje... dostupno je samo na računaru"
   potvrđeno uklonjena iz teksta stranice (0 pogodaka).
8. Regresija: Generiši i dalje radi (2 razreda generisano), backend
   log potvrđuje /validate-move pozive. npm run build čist.

Not completed: ništa iz OPSEG-a.

Open risks:
- Veličina bundle-a: 180KB -> 219KB (gzip 56KB -> 68.6KB), +38KB/+12.5KB
  gzip zbog @dnd-kit/core. Razuman trošak za pravu touch podršku;
  spomenuto jer je Sprint 06 HANDOFF izričito tražio da se ovo zabilježi.
- Vizuelni detalj (ne dizajn, mehanika): dragovana ćelija sada VIDLJIVO
  prati kursor/prst tokom prevlačenja (translate3d), što native dnd nije
  radio (native je ostavljao izvornu ćeliju na mjestu). Ovo je
  standardno dnd-kit ponašanje i nužna posljedica zamjene biblioteke —
  Direktor bi trebao sam probati uživo da potvrdi da mu se ovo sviđa;
  ako ne, može se ukloniti (samo cursor/highlight bez pomjeranja ćelije)
  uz malu izmjenu, javiti ako se to želi.
- npm audit prijavljuje 2 postojeće ranjivosti (esbuild/vite dev-server) —
  NEPOVEZANE sa @dnd-kit/core, postojale su i prije ovog sprinta
  (razvojni alat, ne utiče na produkcijski build/deploy), nisam ih
  dirao (van opsega, popravka bi tražila veliki vite major upgrade).

Next: TBD po dogovoru s Direktorom.
```
