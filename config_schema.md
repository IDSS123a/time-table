# Shema konfiguracije (`config`) — model podataka

Cijeli ulaz u rješavač je jedan JSON objekat `config`. UI ga gradi kroz wizard,
a `solve_timetable(config)` ga pretvara u raspored. Ništa se ne čuva u bazi —
`config` se izvozi/uvozi kao `.json`.

## Polja

| Polje | Tip | Opis |
|---|---|---|
| `days` | lista stringova | radni dani, npr. `["Mo","Di","Mi","Do","Fr"]` |
| `periods` | lista brojeva | časovi, npr. `[1,2,3,4,5,6,7]` |
| `period_times` | mapa | prikaz vremena po času (samo za izvoz), `{"1":"08:00–08:45",...}` |
| `morning_periods` | lista brojeva | gdje smiju „glavni-jutarnji" predmeti, npr. `[1,2,3,4]` |
| `nach_periods` | lista brojeva | gdje ide Nacharbeit, npr. `[6,7]` |
| `grades` | lista brojeva | razredi, npr. `[1..9]` |
| `morning_core_subjects` | lista | predmeti koji MORAJU u `morning_periods`, GLOBALNO za sve razrede, npr. `["Mathematik","Deutsch"]` |
| `morning_core_by_grade` | mapa (opciono) | isto kao gore, ali SAMO za navedene razrede, npr. `{"B/H/S":[1,2,4],"Englisch":[1,2,4]}` — koristi kad predmet treba biti jutarnji samo u nekim razredima, ne svuda gdje se predaje. |
| `block_subjects` | mapa | predmet → razredi u kojima je BLOK (2 vezana časa), npr. `{"Sport":[1..9],"Kunst":[1,2,3,4]}` |
| `homeroom` | mapa | razred → ime razrednika, `{"1":"Amina...",...}` |
| `homeroom_daily_grades` | lista | razredi za koje vrijedi „razrednik svaki dan" (ostali su izuzeci) |
| `light_subjects` | lista | lakši predmeti (guraju se kasnije), npr. `["Kunst","Ethik","Musik"]` |
| `objective_weights` | mapa | težine ciljeva: `{"compactness":1,"balance":2,"light_late":1}` |
| `teachers_fixed` | lista objekata | **honorarni/rezervisani** fiksni časovi: `{teacher, subj, grade, day, period}` |
| `teacher_constraints` | mapa (opciono) | ograničenja dostupnosti po nastavniku, npr. `{"Victoria Bartz": {"max_period": 6}}` — nastavnik se NIKAD ne raspoređuje poslije navedenog perioda (uključivo). Trenutno podržano samo `max_period`. |
| `lessons` | lista objekata | **mobilni** časovi koji se raspoređuju (vidi dolje) |

### `lessons[]` (mobilni časovi)
```json
{ "grades": [1], "subj": "Deutsch", "teacher": "Melisa Babić", "count": 5, "kind": "regular" }
```
- `grades`: obično jedan razred; može više ako isti čas dijeli razrede.
- `count`: broj sedmičnih časova tog predmeta u tom razredu.
- `kind`: `"regular"` ili `"nach"` (Nacharbeit).
- Ako je `(subj, grade)` u `block_subjects`, `count` treba biti `2` (blok od 2 vezana časa).

### `teachers_fixed[]` (honorarni + rezervisani)
```json
{ "teacher": "Aras Samardžija", "subj": "Musik", "grade": 7, "day": "Mi", "period": 7 }
```
Rezervisane pozicije (predmet bez nastavnika) upisuju se s imenom
`"REZERVISANO – Physik"` — rješavač ih drži na fiksnim terminima, ali ih ne
tretira kao pravog nastavnika kod provjere preklapanja.

## Pravilo konzistentnosti (Faza 3 — izvodivost)
Za svaki razred `g`:  
`sum(count svih regular lessons za g)  +  sum(count svih nach za g)  +  broj fixed časova za g  =  len(days) × len(periods)`  
(kod IDSS: `= 35`). Ako nije jednako — UI mora javiti razliku i **ne dozvoliti**
generisanje.

## Gotov primjer
`idss_config.example.json` sadrži kompletan, provjeren IDSS ulaz (9 razreda,
svi nastavnici, honorarni, Nacharbeit) — koristi ga za prvi test i kao šablon.
