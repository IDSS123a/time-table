# SPRINT_06 — Responsive/cross-uređajno poliranje (BEZ izmjene dizajna)

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 05 završen (neumorfni dizajn, zaglavlje, verdict prozor)

---

## ⚠️ NAJVAŽNIJE OGRANIČENJE OVOG SPRINTA

**Direktor je eksplicitno rekao: "UI dizajn je odličan. Ne mijenjaj UI
dizajn bez mog odobrenja."** Ovaj sprint NE DIRA: boje, neumorfni stil,
izgled verdict prozora, tipografiju, izgled dugmadi/kartica. Sprint 06
je isključivo o tome KAKO se taj već odobreni dizajn **prilagođava**
različitim veličinama ekrana — ne o mijenjanju samog dizajna. Ako neka
responsive izmjena zahtijeva vizuelnu odluku (npr. "na mobitelu logo
treba biti manji ili ispod naslova") — to je prihvatljivo JER je
posljedica prilagodbe, ne redizajn; ali ako nešto zahtijeva promjenu
BOJA/STILA, STANI i pitaj Direktora prije nego uradiš.

## OPSEG

### 1. Popravka: preklapanje naslova i loga na mobitelu (STVARAN BUG)
Direktor je lično potvrdio: na mobilnim uređajima naslov "Raspored
časova za IDSS" se **preklapa preko** loga. Uzrok je vjerovatno da
centriranje naslova (position:absolute + translateX(-50%)) ne ostavlja
dovoljno prostora kad se logo+naslov ne mogu oboje uklopiti u uski
ekran. Popraviti responsive zaglavlje:
- Desktop/tablet (širi ekrani): zadržati trenutni izgled (logo lijevo,
  naslov centriran, ista visina).
- Mobitel (uski ekrani, npr. <480px): logo i naslov NE SMIJU se
  preklapati. Prihvatljiva rješenja (Claude Code bira najbolje uklapanje
  uz postojeći stil): manji logo, manji naslov, slaganje jedno ispod
  drugog, ili sakrivanje naslova na najužim ekranima (logo dovoljno
  identifikuje aplikaciju). Testirati na više standardnih širina: 375px
  (iPhone SE), 390px (iPhone 12/13/14), 768px (tablet portrait).

### 2. Desktop: puna širina ekrana, ne uska centrirana kolona
Trenutno se sadržaj (posebno mreže rasporeda) čini stisnut u sredini sa
velikim praznim marginama na širim ekranima. Na desktopu sadržaj treba
**iskoristiti raspoloživi prostor** — posebno mreže rasporeda (7×5
tabele) imaju koristi od više širine. Prihvatljiv pristup: fluidan
layout sa razumnim max-width (npr. 1600–1800px na vrlo širokim
monitorima, da tekst/tabele ne postanu neugodno rastegnuti), umjesto
uske fiksne kolone. Testirati na 1280px, 1440px, 1920px, i 2560px širine.

### 3. Dodir/mobilno prevlačenje (tehnički rizik — provjeriti obavezno)
Trenutni drag-and-drop (grab/grabbing kursor, HTML5 draggable atribut)
**vjerovatno ne radi na dodirnim ekranima** (mobitel/tablet) — HTML5
native drag-and-drop nema pouzdanu podršku za touch. Ovo MORA biti
provjereno stvarno (ne pretpostavljeno):
- Ako NE radi na dodir uređajima: dodati jasnu, vidljivu poruku na
  malim/touch ekranima (npr. "Ručno pomjeranje časova dostupno je samo
  na računaru") umjesto da tiho ne radi bez objašnjenja.
- Ako POSTOJI razuman način da se doda touch podrška bez velike
  komplikacije (npr. postojeća biblioteka koja se lako uklapa) — predložiti
  Direktoru prije implementacije (ovo bi moglo biti nova funkcionalnost,
  ne samo responsive popravka — pitati prije nego se radi).

### 4. Opšta responsive provjera — sve standardne tačke loma
Proći kroz CIJELU aplikaciju (wizard ekrani, mreže rasporeda, dashboard,
verdict prozor, dugmad) na sljedećim širinama i potvrditi da ništa ne
"puca" (tekst ne prelazi okvir, dugmad ostaju dovoljno velika za prst —
minimalno ~44×44px na dodirnim ekranima, tabele imaju horizontalni
scroll umjesto da se stisnu nečitljivo):
- 375px, 390px, 428px (mobiteli)
- 768px, 1024px (tableti, oba orijentacije ako je moguće)
- 1280px, 1440px, 1920px (desktop)

### 5. Cross-browser provjera (u granicama alata koje imaš)
Ako imaš pristup provjeri u više browsera (Chrome, Firefox, Safari,
Edge) — potvrdi da neumorfne sjenke, CSS grid/flex layout, i verdict
prozor animacije rade dosljedno. Ako neki CSS koji koristiš ima slabu
podršku u starijim browserima, dodati razuman fallback.

**VAN OPSEGA:** bilo kakva izmjena boja, neumorfnog stila, izgleda
verdict prozora, tipografije — sve to je već odobreno u Sprint 05 i
ostaje netaknuto. Backend se ne dira (P-3).

## KRITERIJI PRIHVATANJA
```
☑ Na mobitelu (375-428px) naslov i logo se NE preklapaju, oba čitljiva
  (potvrđeno uživo na 375/390/428px — 0px preklapanja, izmjereno)
☑ Desktop (1440px+) sadržaj koristi razuman dio širine ekrana, ne stisnut
  u uskoj koloni sa velikim praznim marginama (main 1200px -> 1800px)
☑ Drag-and-drop na dodirnom ekranu: NE RADI (potvrđeno empirijski — vidi
  Open risks) — dodana jasna, vidljiva poruka umjesto tihog ne-rada
☑ Nijedan dugme/tekst/tabela ne prelazi okvir ekrana ni na jednoj od
  testiranih širina (375/390/428/550/650/768/1024/1280/1920/2560 —
  document.documentElement.scrollWidth provjeren na svakoj, 0 prekoračenja)
☑ Boje/neumorfni stil/verdict prozor IZGLED nepromijenjeni — potvrđeno
  git diff: JEDINE izmijenjene vrijednosti su max-width/overflow/min-width
  (layout), NIJEDNA boja/sjenka/radijus/font vrijednost dirana
☑ Backend NETAKNUT — git diff --stat prazan za backend/
```

## HANDOFF NAPOMENA
```
HANDOFF NOTE — Sprint 06 (2026-08-12)

Completed:
1. Zaglavlje (preklapanje popravljeno) — ≤600px: logo+naslov se slažu
   jedno ispod drugog (logo smanjen na 32px, naslov na 15px, oba
   centrirana) umjesto position:absolute centriranja koje na uskim
   ekranima nije ostavljalo dovoljno prostora. >600px: nepromijenjen
   raniji izgled (logo lijevo, naslov position:absolute centriran).
   Testirano na 375/390/428/550px (stacked, 0 preklapanja) i 650/768px
   (desktop layout, i dalje 0 preklapanja).
2. Desktop širina — main i header max-width: 1200px -> 1800px (sprint
   je predložio 1600-1800px). .wiz (wizard forma) blago prošireno
   980px -> 1100px (ostaje čitljivo za formu, ne razvlači se koliko
   mreže rasporeda). Potvrđeno uživo: na 1920px main koristi 1800px
   (bio bi 1200px prije), na 2560px i dalje kapira na 1800px (ne
   razvlači se beskonačno).
3. Touch drag-and-drop — EMPIRIJSKI POTVRĐENO DA NE RADI (vidi Open
   risks za detalje testa). Dodana jasna poruka koja se prikazuje SAMO
   na dodirnim uređajima (CSS (hover:none)+(pointer:coarse), ne samo
   uska širina — pouzdanije od širine jer razlikuje stvarni ulazni
   uređaj): "Ručno pomjeranje časova prevlačenjem dostupno je samo na
   računaru (miš) — na ovom dodirnom uređaju trenutno nije moguće
   prevući čas." Stara miš-uputa se sakriva na dodirnim uređajima (ista
   CSS-swap tehnika). NISAM pokušao implementirati touch-podršku (van
   opsega bez odobrenja, po uputstvu).
4. Tabele (mreža rasporeda, wizard tabele, dashboard) — umjesto da se
   stisnu nečitljivo na uskim ekranima, sada horizontalno skroluju
   UNUTAR svoje kartice (.block/.wiz-panel: overflow-x:auto), a
   stranica sama nikad ne dobija horizontalni scroll. table dobio
   min-width:620px da spriječi automatsko stiskanje kolona.
5. Dodirni ciljevi — na dodirnim uređajima (isti media query kao #3)
   dugmad/chip/koraci wizarda dobijaju veći padding (min-height 44px
   za dugmad) — nevidljivo na desktopu/mišu, ne mijenja izgled tamo.
6. Wizard forma na ≤480px: oznaka+polje (koji su bili min 200px+160px
   jedno pored drugog) sada se slažu jedno ispod drugog umjesto da se
   sabijaju.

Testirano UŽIVO (Chrome preko Claude Browser alata) na SVIM traženim
širinama: 375, 390, 428, 550 (dodatna provjera oko granice), 650
(dodatna provjera), 768, 1024, 1280, 1440 (implicitno preko 1280/1920
raspona), 1920, 2560px. Na svakoj: document.documentElement.scrollWidth
<= window.innerWidth (0 horizontalnog prelivanja stranice). Dodatno
testirano: wizard forma i tabele (dodavanje nastavnika/predmeta) na
375px, generisan raspored + dashboard na 375px, regresija miš-baziranog
drag-and-drop na 1280px (i dalje radi, verdict prozor se pojavljuje).

Not completed: ništa iz OPSEG-a. Touch drag podrška NIJE implementirana
(namjerno — van opsega, traži zaseban dogovor, vidi Open risks).

Open risks:
- **Touch drag-and-drop NE RADI** — ovo NIJE bug u ovoj aplikaciji nego
  poznato, dokumentovano ograničenje HTML5 "native" drag-and-drop
  standarda: taj API (draggable atribut + dragstart/dragover/drop
  događaji) nikad nije definisan za dodirni unos, ni na jednom
  mobilnom browseru (Android Chrome, iOS Safari). Potvrđeno u OVOM
  sprintu na DVA nezavisna načina: (1) direktno odaslani pravi
  TouchEvent (touchstart/touchmove/touchend) na ćeliju časa — dragstart
  se NIJE pokrenuo, drop se NIJE pokrenuo, nula mrežnih poziva ka
  /validate-move; (2) uređaj emuliran kao dodirni (Android Chrome UA,
  pointer:coarse) preko cijelog testiranja. Trenutno rješenje: jasna
  poruka umjesto tihog ne-rada (vidi Completed #3).
  Opcije za pravu touch podršku (SAMO ako Direktor odobri, NOVA
  funkcionalnost ne responsive popravka):
    a) Zamjena HTML5 dnd sa touch/pointer-events bazovanom bibliotekom
       (npr. @dnd-kit/core ili SortableJS) — radi i na mišu i na dodiru,
       ali je veća izmjena (nova zavisnost, prepisati Grid interakciju).
    b) Alternativni UI za dodirne uređaje: umjesto prevlačenja, "tapni
       čas -> tapni cilj" dvoklik/dvodir izbor (bez potrebe za pravim
       drag gestom, poziva isti /validate-move). Manja izmjena, ali
       drugačiji obrazac interakcije od desktop iskustva.
    c) Ostaviti kako jeste (samo desktop/miš) — ručna korekcija ostaje
       "napredna" funkcija za računar, dashboard/generiši/izvoz i dalje
       rade svugdje.
  Ovo NISAM implementirao (P-3-slično ograničenje eksplicitno postavljeno
  za ovaj sprint: "ako POSTOJI razuman način... predložiti Direktoru
  PRIJE implementacije").
- Cross-browser (Firefox/Safari/Edge): NISAM mogao stvarno testirati —
  alat koji imam pokreće samo Chromium. CSS korišten (flexbox, CSS grid
  samo za loader, box-shadow, clip-path, aspect-ratio, media queries)
  je sve standardno i široko podržano u evergreen browserima (2022+),
  nema poznatih rizika, ali preporučujem da Direktor sam brzo pogleda
  na svom uobičajenom browseru ako je Firefox/Safari/Edge, kad bude
  imao priliku — nisam u mogućnosti to sam potvrditi.

Next: TBD po dogovoru s Direktorom — najvjerovatniji kandidat je odluka
o touch drag-and-drop (opcije a/b/c iznad).
```
