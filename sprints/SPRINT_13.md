# SPRINT_13 — Fiksirana traka kontrola + ujednačene kolone

# Project: IDSS Timetable
# Prati: FEATURE_LIFECYCLE.md (7 koraka)
# Preduslov: Sprint 10/06 (dizajn, responsive) zatvoreni. Ovaj sprint NE
# mijenja dizajn (boje/neumorfni stil/verdict prozor) — isto ograničenje
# kao Sprint 06, samo raspored/ponašanje postojećih elemenata.

---

## POVOD (Direktorovo zapažanje, sa stvarnim screenshotom)

1. Traka s komandama (Generiši, "Koliko truda", Prikaz po nastavniku,
   Izvezi Excel, Izvezi izvještaj, Dashboard opterećenja) se odskroluje
   zajedno sa sadržajem — Direktor mora stalno skrolovati nazad na vrh
   da bi ponovo kliknuo bilo koju od tih akcija dok pregleda mreže
   rasporeda ispod. Treba biti "lijepo izdvojena pri vrhu", uvijek
   dostupna.
2. Širine kolona dana (Mo/Di/Mi/Do/Fr) nisu ujednačene — na priloženom
   screenshot-u se vidi da je npr. "Di" kolona vidno šira od "Mo" u
   istoj tabeli, i da se raspodjela mijenja od tabele do tabele (svaki
   nastavnik može imati drugačije proporcije). Treba da SVE kolone dana,
   u SVIM tabelama, budu iste, dosljedne širine.

## OPSEG

**U OPSEGU:**
1. **Fiksirana ("sticky") traka komandi** — traka ostaje vidljiva na
   vrhu ekrana dok se skroluje kroz mreže rasporeda ispod (CSS
   `position: sticky`, ne JavaScript trik). Na desktopu: fiksirana traka
   preko cijele širine, ispod zaglavlja (logo+naslov). Na mobitelu (gdje
   je vertikalni prostor dragocjen): razmotriti da li puna fiksirana
   traka ima smisla ili treba kompaktnija verzija (npr. samo Generiši +
   izbornik za ostalo) — Claude Code treba predložiti rješenje koje ne
   guta previše ekrana na malim uređajima, dosljedno s postojećim
   responsive pristupom iz Sprint 06 (ne izmišljati nov pristup).
2. **Ujednačene širine kolona** — svih 5 dana (Mo-Fr) ista širina, u
   SVAKOJ tabeli, dosljedno kroz cijelu aplikaciju (i "po razredu" i
   "po nastavniku" prikaz). Kolona "Čas" (vremena) zadržava svoju
   trenutnu, užu širinu.
3. **Potvrda punog iskorištenja širine ekrana** — traka komandi i mreže
   rasporeda moraju koristiti ISTI pristup širini koji je već uspostavljen
   u Sprint 06 (do 1800px na širokim ekranima, ne uska centrirana
   kolona). Ovo je POTVRDA/PRODUŽETAK postojećeg rada na NOVIM
   elementima (fiksirana traka), ne redizajn onoga što već radi.
4. Testirati na istim tačkama loma kao Sprint 06 (375/390/428 mobitel,
   768/1024 tablet, 1280/1440/1920/2560 desktop) — posebno provjeriti da
   fiksirana traka ne prekriva sadržaj ispod sebe na uskim ekranima.

**VAN OPSEGA (namjerno):**
- Bilo kakva izmjena boja/neumorfnog stila/verdict prozora.
- Backend — ništa se ne dira, ovo je čist frontend layout.
- Sadržaj/funkcija dugmadi — samo POZICIJA i ŠIRINA kolona se mijenja,
  ne šta dugmad rade.

## KRITERIJI PRIHVATANJA
```
□ Traka komandi ostaje vidljiva pri skrolovanju kroz mreže rasporeda
  (testirano uživo, ne pretpostavljeno) — na desktopu
□ Mobilna verzija trake ne guta neprihvatljivo mnogo ekrana — Direktor
  lično ocjenjuje na svom uređaju
□ Sve kolone dana su ISTE širine, u SVIM tabelama, oba prikaza
  (po razredu i po nastavniku)
□ Fiksirana traka NE prekriva sadržaj ispod sebe ni na jednoj testiranoj
  širini
□ Boje/stil/verdict prozor NEPROMIJENJENI — git diff na CSS bojama prazan
□ Backend netaknut — git diff --stat prazan za backend/
```

## HANDOFF NAPOMENA
```
HANDOFF NOTE — Sprint 13

Completed:
1. Ujednačene širine kolona dana — jedna nova CSS klasa "grid-table"
   dodana na <table> u Grid komponenti (App.jsx), plus
   `table.grid-table{table-layout:fixed}` (styles.css). Bez logike u
   JS-u: fixed layout znači da SAMO prva vrsta (thead: "Čas"=120px,
   dani bez eksplicitne širine) određuje kolone, pa 5 dana automatski
   dijele preostali prostor POJEDNAKO — isto u svakoj tabeli jer sve
   dijele isti kontejner. Scoped samo na .grid-table (ne bare `table`)
   da se Wizard-ove tabele (nastavnici/predmeti/lista) ne diraju.
2. Fiksirana ("sticky") traka komandi — `.controls{position:sticky;
   top:0;z-index:50;background:var(--surface);box-shadow:0 4px 10px
   var(--shadow-dark)}` unutar `@media (min-width:481px)`. Boje su
   POSTOJEĆI tokeni (--surface, --shadow-dark) — pozadina je nužna
   samo da sadržaj ispod ne "prosijava" kroz zalijepljenu traku, nije
   nova boja/stil.

Testirano UŽIVO (pravi backend na localhost:8080, pravi 9-razredni IDSS
config sa Sprint 14 poljima, real solve — 315 časova, 9 tabela u oba
prikaza):
- 375/390/428 (mobitel): .controls je position:static (nepromijenjeno u
  odnosu na prije sprinta) — traka se skroluje sa sadržajem, NE guta
  vertikalni prostor. Potvrđeno DOM inspekcijom (getComputedStyle).
- 768/1024/1280/1440/1920/2560: .controls je position:sticky, top:0px,
  ostaje zalijepljena za vrh ekrana i pri skrolu do samog dna stranice
  (testirano scrollTo do document.body.scrollHeight) — ne prekriva
  sadržaj ispod (provjereno: h3 naslov sekcije ispod trake ostaje
  vidljiv, top koordinata veća od dna trake).
- Sve kolone dana (Mo-Fr) imaju IDENTIČNU širinu u SVIH 9 tabela, u OBA
  prikaza ("po razredu" i "po nastavniku"), na svakoj testiranoj širini
  (npr. 1280px: 219px po danu u svih 9 tabela; 1920/2560px: 1752px
  ukupna širina tabele u oba slučaja — potvrđuje da postojeći 1800px
  max-width cap iz Sprint 06 i dalje važi, nije probijen).
- Backend netaknut: `git diff --stat backend/` prazan.
- Boje/stil nepromijenjeni: `git diff` na styles.css sadrži NULA novih
  hex/color/--var vrijednosti (grep provjeren) — jedine dvije nove CSS
  cjeline koriste isključivo postojeće tokene.
- `npm run build` prolazi bez grešaka.

Not completed: ništa iz opsega.

Open risks:
- Mobilna verzija trake (< 481px): odabrano rješenje je POTPUNO
  isključivanje sticky-ja (vraćanje na ponašanje prije ovog sprinta),
  a ne kompaktnija "sticky-lite" traka. Razlog: dugmadi ima dosta
  (Generiši, izbor truda, Prikaz, Učitaj sačuvano, oznaka+Sačuvaj, 2×
  Izvezi, Dashboard) — čak i kompaktna sticky verzija bi na uskom
  ekranu trajno zauzimala značajan dio već ograničenog vertikalnog
  prostora, što je upravo problem koji je sprint tražio da se izbjegne.
  Direktor treba lično ocijeniti na svom uređaju da li je "skroluje se
  normalno" prihvatljivo, ili treba naknadno tražiti kompaktniju
  sticky verziju za mobitel (npr. samo dugme "Generiši" fiksirano).
Next: TBD po dogovoru s Direktorom — čeka se ocjena mobilne verzije.
```
