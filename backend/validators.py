# -*- coding: utf-8 -*-
"""Provjere ispravnosti generisanog rasporeda. Vrte se poslije rješavača."""
import collections
def validate_config(config):
    """FAZA 3 (USTAV) — STROGA provjera SIROVOG unosa PRIJE poziva rješavača.
    Cilj: svaka nemoguća ili nekonzistentna kombinacija mora dati JASNU,
    konkretnu poruku ovdje — nikad nejasan pad ili tih pogrešan rezultat
    iz CP-SAT-a. Vraća listu poruka o greškama (prazna lista = sve u redu)."""
    errs = []
    req = ["days","periods","grades","morning_periods","nach_periods",
           "morning_core_subjects","block_subjects","homeroom",
           "homeroom_daily_grades","lessons"]
    for k in req:
        if k not in config:
            errs.append(f"Konfiguraciji nedostaje obavezno polje: '{k}'.")
    if errs: return errs  # nema smisla dalje bez osnovnih polja

    D=config["days"]; P=config["periods"]; GR=config["grades"]
    MORNING=set(config["morning_periods"]); NACHP=set(config["nach_periods"])
    CORE=set(config["morning_core_subjects"]); BLOCK=config["block_subjects"]
    CORE_BY_GRADE=config.get("morning_core_by_grade", {})
    def is_core(subj, grade): return subj in CORE or grade in CORE_BY_GRADE.get(subj, [])
    HR=config["homeroom"]; HRD=config["homeroom_daily_grades"]
    TC=config.get("teacher_constraints", {})
    total_slots=len(D)*len(P)
    grade_set=set(GR)

    if not D: errs.append("Nema definisanih dana (days je prazno).")
    if not P: errs.append("Nema definisanih perioda (periods je prazno).")
    if not GR: errs.append("Nema definisanih razreda (grades je prazno).")
    if not MORNING.issubset(set(P)):
        errs.append(f"morning_periods sadrži period(e) van 'periods': {sorted(MORNING-set(P))}.")
    if not NACHP.issubset(set(P)):
        errs.append(f"nach_periods sadrži period(e) van 'periods': {sorted(NACHP-set(P))}.")
    if MORNING & NACHP:
        errs.append(f"morning_periods i nach_periods se preklapaju: {sorted(MORNING&NACHP)} — isti period ne može biti i jutarnji i Nacharbeit.")

    for subj, glist in BLOCK.items():
        bad = [g for g in glist if g not in grade_set]
        if bad: errs.append(f"block_subjects['{subj}'] navodi razred(e) koji ne postoje u 'grades': {bad}.")

    hr_bad = [g for g in HR if int(g) not in grade_set]
    if hr_bad: errs.append(f"homeroom navodi razred(e) koji ne postoje u 'grades': {hr_bad}.")
    missing_hr = [g for g in GR if str(g) not in HR and g not in HR]
    if missing_hr: errs.append(f"Razred(i) bez razrednika u 'homeroom': {missing_hr}.")
    hrd_bad = [g for g in HRD if g not in grade_set]
    if hrd_bad: errs.append(f"homeroom_daily_grades navodi razred(e) koji ne postoje u 'grades': {hrd_bad}.")

    def is_block(subj, g): return subj in BLOCK and g in BLOCK[subj]

    def allowed_periods(teacher):
        mp = TC.get(teacher, {}).get("max_period")
        return set(p for p in P if mp is None or p <= mp)

    for t, c in TC.items():
        mp = c.get("max_period")
        if mp is not None and mp not in P:
            errs.append(f"teacher_constraints['{t}'].max_period={mp} nije među definisanim periodima {P}.")

    # ---- lessons[] provjera ----
    per_grade_count = {g: 0 for g in GR}
    subj_count_per_grade = collections.defaultdict(int)  # (grade,subj) -> count, samo NE-blok
    for idx, L in enumerate(config["lessons"]):
        tag = f"lessons[{idx}] ({L.get('subj','?')}, {L.get('teacher','?')})"
        if not L.get("teacher"): errs.append(f"{tag}: nedostaje 'teacher' (ime nastavnika).")
        if not L.get("subj"): errs.append(f"{tag}: nedostaje 'subj' (naziv predmeta).")
        grades = L.get("grades")
        if not grades: errs.append(f"{tag}: 'grades' je prazno — mora sadržavati bar jedan razred.")
        else:
            bad = [g for g in grades if g not in grade_set]
            if bad: errs.append(f"{tag}: razred(i) {bad} ne postoje u 'grades'.")
        cnt = L.get("count", 1)
        if L.get("kind") != "nach" and not (isinstance(cnt, int) and cnt >= 1):
            errs.append(f"{tag}: 'count' mora biti cijeli broj ≥ 1 (dobijeno: {cnt!r}).")
        if L.get("kind") == "nach" and not (isinstance(cnt, int) and cnt >= 1):
            errs.append(f"{tag}: Nacharbeit 'count' mora biti cijeli broj ≥ 1 (dobijeno: {cnt!r}).")
        teacher = L.get("teacher")
        for g in (grades or []):
            if g not in grade_set: continue
            if L.get("kind") == "nach":
                per_grade_count[g] += cnt
                cap = len(D) * len(NACHP & allowed_periods(teacher))
                if cnt > cap:
                    mp = TC.get(teacher, {}).get("max_period")
                    reason = f" (ograničenje max_period={mp} smanjuje dostupne Nacharbeit periode)" if mp is not None else ""
                    errs.append(f"{tag}: {cnt} Nacharbeit časova za razred {g} premašuje kapacitet ({cap} = {len(D)} dana × {len(NACHP & allowed_periods(teacher))} dostupnih perioda){reason}.")
            elif is_block(L.get("subj",""), g):
                per_grade_count[g] += 2  # blok je uvijek 2 vezana časa, bez obzira na 'count'
            else:
                per_grade_count[g] += cnt
                subj_count_per_grade[(g, L.get("subj"))] += cnt
            # provjeri da nastavniku ostaje ijedan dozvoljen period za ovaj čas
            if teacher:
                dom = MORNING if is_core(L.get("subj"), g) else set(P)
                dom = dom & allowed_periods(teacher)
                if L.get("kind") == "nach":
                    dom = NACHP & allowed_periods(teacher)
                if not dom:
                    mp = TC.get(teacher, {}).get("max_period")
                    errs.append(f"{tag}: nastavnik '{teacher}' ima ograničenje (max_period={mp}) koje isključuje SVE moguće termine za ovaj čas u razredu {g} — nemoguće rasporediti.")

    for (g, subj), cnt in subj_count_per_grade.items():
        if cnt > len(D):
            errs.append(f"Razred {g}, predmet '{subj}': {cnt} časova sedmično, ali pravilo je najviše 1 dnevno (max {len(D)} sedmično) — nemoguće bez kršenja pravila.")

    # ---- teachers_fixed[] provjera ----
    fixed = config.get("teachers_fixed", [])
    seen_teacher_slot = {}
    seen_grade_slot = {}
    for idx, f in enumerate(fixed):
        tag = f"teachers_fixed[{idx}] ({f.get('teacher','?')}, {f.get('subj','?')})"
        if f.get("day") not in D: errs.append(f"{tag}: dan '{f.get('day')}' nije među definisanim danima {D}.")
        if f.get("period") not in P: errs.append(f"{tag}: period {f.get('period')} nije među definisanim periodima {P}.")
        if f.get("grade") not in grade_set: errs.append(f"{tag}: razred {f.get('grade')} ne postoji u 'grades'.")
        if not f.get("teacher"): errs.append(f"{tag}: nedostaje 'teacher'.")
        if not f.get("subj"): errs.append(f"{tag}: nedostaje 'subj'.")
        key_t = (f.get("teacher"), f.get("day"), f.get("period"))
        if key_t in seen_teacher_slot and fixed[seen_teacher_slot[key_t]].get("subj") != f.get("subj"):
            # isti nastavnik, isti termin, RAZLIČIT predmet -> stvaran konflikt.
            # Isti predmet (npr. spojeni Sport za dva razreda) je NAMJERNO dozvoljen.
            errs.append(f"{tag}: nastavnik '{f.get('teacher')}' već ima RAZLIČIT fiksni čas u {f.get('day')} {f.get('period')} (dvostruko zauzet termin).")
        seen_teacher_slot[key_t] = idx
        key_g = (f.get("grade"), f.get("day"), f.get("period"))
        if key_g in seen_grade_slot and fixed[seen_grade_slot[key_g]].get("teacher") != f.get("teacher"):
            errs.append(f"{tag}: razred {f.get('grade')} već ima drugi fiksni čas u {f.get('day')} {f.get('period')}.")
        else:
            seen_grade_slot[key_g] = idx
        if f.get("grade") in grade_set:
            per_grade_count[f.get("grade")] = per_grade_count.get(f.get("grade"), 0) + 1

    # ---- ukupan zbir po razredu ----
    for g in GR:
        if per_grade_count.get(g, 0) != total_slots:
            errs.append(f"Razred {g}: {per_grade_count.get(g,0)} časova umjesto {total_slots} "
                        f"(razlika {per_grade_count.get(g,0)-total_slots:+d}).")

    return errs

def validate(lessons, config):
    D=config["days"]; P=config["periods"]; GR=config["grades"]
    CORE=set(config["morning_core_subjects"]); MORNING=set(config["morning_periods"]); NACHP=set(config["nach_periods"])
    CORE_BY_GRADE=config.get("morning_core_by_grade", {})
    def is_core(subj, grade): return subj in CORE or grade in CORE_BY_GRADE.get(subj, [])
    BLOCK=config["block_subjects"]; HR={int(k):v for k,v in config["homeroom"].items()}; HRD=set(config["homeroom_daily_grades"])
    def is_block(s,g): return s in BLOCK and g in BLOCK[s]
    errs=[]
    # class: svaki termin tačno jednom
    occ=collections.Counter((L["grade"],L["day"],L["period"]) for L in lessons)
    for k,v in occ.items():
        if v>1: errs.append(f"Razred {k[0]} ima {v} časa u {k[1]}{k[2]}")
    for g in GR:
        for d in D:
            for p in P:
                if occ[(g,d,p)]==0: errs.append(f"Razred {g} prazan termin {d}{p}")
    # teacher: bez preklapanja (spojeni ISTI-nastavnik-ISTI-predmet-ISTI-fiksni-blok dozvoljen)
    tt=collections.defaultdict(list)
    for L in lessons: tt[(L["teacher"],L["day"],L["period"])].append(L)
    for k,v in tt.items():
        if len(v)>1 and not str(k[0]).startswith("REZERVISANO"):
            same_subj = len(set(x["subj"] for x in v))==1
            # Izuzetak (spojeni čas, npr. Sport za dva razreda) vrijedi SAMO ako su
            # SVI sudionici 'fixed' (unaprijed zadati honorarni termin) — takvi spojevi
            # su namjerno deklarisani u teachers_fixed, ne nastaju slučajno. Za 'regular'/
            # 'nach'/'block' časove isti naziv predmeta NIJE dovoljan izgovor: dva
            # različita, nepovezana razreda s istim nastavnikom u istom terminu je
            # stvaran sudar (npr. ručno pomjeranje preko /validate-move), bez obzira
            # dijele li slučajno naziv predmeta.
            all_fixed = all(x.get("kind")=="fixed" for x in v)
            if not (same_subj and all_fixed):
                errs.append(f"Nastavnik {k[0]} preklapanje {k[1]}{k[2]}: {[ (x['subj'],x['grade']) for x in v]}")
    # Glavni/jutarnji predmeti (globalno ili po razredu) u jutarnjim periodima
    for L in lessons:
        if is_core(L["subj"], L["grade"]) and L["period"] not in MORNING:
            errs.append(f"{L['subj']} razred {L['grade']} van jutarnjih perioda ({L['day']}{L['period']})")
    # Nacharbeit u nach periodima + sufiks
    cells=collections.defaultdict(list)
    for L in lessons: cells[(L["grade"],L["day"])].append((L["period"],L["kind"],L["subj"]))
    for L in lessons:
        if L["subj"]=="Nacharbeit" and L["period"] not in NACHP:
            errs.append(f"Nacharbeit razred {L['grade']} van 6./7. časa")
    for (g,d),ls in cells.items():
        n=[p for p,k,s in ls if s=="Nacharbeit"]; r=[p for p,k,s in ls if s!="Nacharbeit"]
        if n and r and max(r)>min(n): errs.append(f"Razred {g} {d}: predmet poslije Nacharbeita")
    # svaki predmet <=1/dan (osim blok i Nacharbeit)
    sd=collections.Counter()
    for L in lessons:
        if L["subj"]=="Nacharbeit" or is_block(L["subj"],L["grade"]): continue
        sd[(L["grade"],L["subj"],L["day"])]+=1
    for k,v in sd.items():
        if v>1: errs.append(f"Razred {k[0]} predmet {k[1]} {v}× u {k[2]}")
    # blok: 2 vezana časa
    for g in GR:
        for s,gs in BLOCK.items():
            if g not in gs: continue
            byd=collections.defaultdict(list)
            for L in lessons:
                if L["grade"]==g and L["subj"]==s: byd[L["day"]].append(L["period"])
            for d,ps in byd.items():
                ps=sorted(ps)
                if len(ps)==2 and ps[1]-ps[0]!=1: errs.append(f"Blok {s} razred {g} {d} nije vezan: {ps}")
    # razrednik svaki dan
    for g in HRD:
        dw=set(L["day"] for L in lessons if L["teacher"]==HR[g] and L["grade"]==g)
        for d in D:
            if d not in dw: errs.append(f"Razrednik razreda {g} ({HR[g]}) nema čas u {d}")
    return errs
