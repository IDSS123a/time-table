# -*- coding: utf-8 -*-
"""
IDSS Timetable Solver — OR-Tools CP-SAT core ("USTAV" jezgro).

Ovaj modul je SRCE aplikacije. Prima jedan `config` dict (validiran po shemi iz
config_schema.md) i vraća gotov, provjeren raspored + izvještaj o validaciji.

NE MIJENJATI logiku ograničenja bez razloga — ona kodira pedagoška pravila škole.
Frontend/backend samo pripremaju `config` i prikazuju rezultat.

Zavisnost:  pip install ortools
"""
from ortools.sat.python import cp_model
import collections

def solve_timetable(config, time_limit_s=60, workers=8):
    D  = config["days"]                      # npr. ["Mo","Di","Mi","Do","Fr"]
    P  = config["periods"]                   # npr. [1..7]
    MORNING = set(config["morning_periods"]) # 1..4  (glavni predmeti)
    NACHP   = set(config["nach_periods"])    # 6,7
    GR = config["grades"]
    CORE = set(config["morning_core_subjects"])          # {"Mathematik","Deutsch"} — globalno, svi razredi
    CORE_BY_GRADE = config.get("morning_core_by_grade", {})  # {"B/H/S":[1,2,3,4], "Englisch":[1,2,3,4]} — samo navedeni razredi
    def is_core(subj, grade):
        return subj in CORE or grade in CORE_BY_GRADE.get(subj, [])
    BLOCK = config["block_subjects"]                       # {"Sport":[...], "Kunst":[1,2,3,4]}
    HR    = {int(k):v for k,v in config["homeroom"].items()}
    HR_DAILY = set(config["homeroom_daily_grades"])
    W = config.get("objective_weights", {"compactness":1,"balance":2,"light_late":1,"gap":3})
    LIGHT = set(config.get("light_subjects", ["Kunst","Ethik","Musik"]))
    # Per-teacher availability constraints, e.g. {"Victoria Bartz": {"max_period": 6}}
    # max_period = zadnji čas u kojem taj nastavnik smije predavati (uključivo).
    TC = config.get("teacher_constraints", {})
    def allowed_periods_for(teacher):
        mp = TC.get(teacher, {}).get("max_period")
        return set(p for p in P if mp is None or p <= mp)

    def is_block(subj, g):
        return subj in BLOCK and g in BLOCK[subj]

    # ---- razvrstaj časove ----
    FIXED=[]      # honorarni + rezervisani (fiksni termini)
    for f in config.get("teachers_fixed", []):
        FIXED.append(dict(cls=f["grade"],subj=f["subj"],teacher=f["teacher"],d=f["day"],p=f["period"]))
    SINGLES=[]; BLOCKS=[]; NACHL=[]
    for L in config["lessons"]:
        for g in L["grades"]:
            if L.get("kind")=="nach":
                for _ in range(L["count"]): NACHL.append(dict(cls=g,subj="Nacharbeit",teacher=L["teacher"]))
            elif is_block(L["subj"], g):
                BLOCKS.append(dict(cls=g,subj=L["subj"],teacher=L["teacher"]))   # 1 blok = 2 vezana časa
            else:
                for _ in range(L["count"]): SINGLES.append(dict(cls=g,subj=L["subj"],teacher=L["teacher"]))

    m=cp_model.CpModel()
    xs={}; xn={}; xb={}
    for i,L in enumerate(SINGLES):
        dom = MORNING if is_core(L["subj"], L["cls"]) else set(P)
        dom = dom & allowed_periods_for(L["teacher"])
        for d in D:
            for p in dom: xs[(i,d,p)]=m.NewBoolVar(f"s{i}_{d}_{p}")
        m.Add(sum(xs[(i,d,p)] for d in D for p in dom)==1)
    for j,L in enumerate(NACHL):
        dom = NACHP & allowed_periods_for(L["teacher"])
        for d in D:
            for p in dom: xn[(j,d,p)]=m.NewBoolVar(f"n{j}_{d}_{p}")
        m.Add(sum(xn[(j,d,p)] for d in D for p in dom)==1)
    maxp=max(P)
    for b,L in enumerate(BLOCKS):
        allowed = allowed_periods_for(L["teacher"])
        for d in D:
            for p in P:
                if p+1 in P and p in allowed and p+1 in allowed: xb[(b,d,p)]=m.NewBoolVar(f"b{b}_{d}_{p}")
        m.Add(sum(xb[(b,d,p)] for d in D for p in P if (b,d,p) in xb)==1)

    fixed_cd=collections.defaultdict(list)
    for f in FIXED: fixed_cd[(f["cls"],f["d"],f["p"])].append(f)

    def cover(c,d,p):
        t=[]
        for i,L in enumerate(SINGLES):
            if L["cls"]==c and (i,d,p) in xs: t.append(xs[(i,d,p)])
        for j,L in enumerate(NACHL):
            if L["cls"]==c and (j,d,p) in xn: t.append(xn[(j,d,p)])
        for b,L in enumerate(BLOCKS):
            if L["cls"]==c:
                if (b,d,p) in xb: t.append(xb[(b,d,p)])
                if (b,d,p-1) in xb: t.append(xb[(b,d,p-1)])
        return t

    # svaki termin svakog razreda tačno jednom popunjen (=> tačan broj časova, puno pakovanje)
    for c in GR:
        for d in D:
            for p in P:
                terms=cover(c,d,p)
                if fixed_cd[(c,d,p)]: m.Add(sum(terms)==0)
                else:                 m.Add(sum(terms)==1)

    # nastavnik ne može u dva razreda istovremeno (spojeni Sport = isti nastavnik/termin = OK)
    teachers=set(L["teacher"] for L in SINGLES+NACHL+BLOCKS)|set(f["teacher"] for f in FIXED)
    def tterms(t,d,p):
        r=[]
        for i,L in enumerate(SINGLES):
            if L["teacher"]==t and (i,d,p) in xs: r.append(xs[(i,d,p)])
        for j,L in enumerate(NACHL):
            if L["teacher"]==t and (j,d,p) in xn: r.append(xn[(j,d,p)])
        for b,L in enumerate(BLOCKS):
            if L["teacher"]==t:
                if (b,d,p) in xb: r.append(xb[(b,d,p)])
                if (b,d,p-1) in xb: r.append(xb[(b,d,p-1)])
        return r
    for t in teachers:
        if str(t).startswith("REZERVISANO"): continue
        for d in D:
            for p in P:
                fx=1 if any(f["teacher"]==t for f in fixed_cd[(g,d,p)] for g in GR) else 0
                # spojeni časovi (isti nastavnik, više razreda, isti termin) ne broje se kao konflikt
                fx=1 if any(f["teacher"]==t and f["d"]==d and f["p"]==p for f in FIXED) else 0
                terms=tterms(t,d,p)
                if terms: m.Add(sum(terms)+fx<=1)

    # Nacharbeit sufiks: ako je 6. čas Nacharbeit -> i 7. mora biti (Nacharbeit uvijek na kraju dana)
    ordered_nach=sorted(NACHP)
    for c in GR:
        for d in D:
            for k in range(len(ordered_nach)-1):
                lo,hi=ordered_nach[k],ordered_nach[k+1]
                a=[xn[(j,d,lo)] for j,L in enumerate(NACHL) if L["cls"]==c and (j,d,lo) in xn]
                b=[xn[(j,d,hi)] for j,L in enumerate(NACHL) if L["cls"]==c and (j,d,hi) in xn]
                if a and b: m.Add(sum(a)<=sum(b))

    # svaki predmet najviše jednom dnevno po razredu (osim blokova i Nacharbeita)
    for c in GR:
        subs=set(L["subj"] for L in SINGLES if L["cls"]==c)
        for s in subs:
            for d in D:
                idx=[i for i,L in enumerate(SINGLES) if L["cls"]==c and L["subj"]==s]
                dom = MORNING if is_core(s, c) else set(P)
                terms=[xs[(i,d,p)] for i in idx for p in dom if (i,d,p) in xs]
                if terms: m.Add(sum(terms)<=1)

    # razrednik svaki dan sa svojim razredom (za zadate razrede)
    for c in HR_DAILY:
        rl=HR[c]
        for d in D:
            terms=[]
            for i,L in enumerate(SINGLES):
                if L["cls"]==c and L["teacher"]==rl:
                    dom = MORNING if is_core(L["subj"], L["cls"]) else set(P)
                    terms+=[xs[(i,d,p)] for p in dom if (i,d,p) in xs]
            for j,L in enumerate(NACHL):
                if L["cls"]==c and L["teacher"]==rl:
                    terms+=[xn[(j,d,p)] for p in NACHP if (j,d,p) in xn]
            fx=sum(1 for f in FIXED if f["cls"]==c and f["teacher"]==rl and f["d"]==d)
            if terms or fx: m.Add(sum(terms)+fx>=1)

    # ---- CILJ: EKSPLICITNA kazna za rupe (kvadratna) + balans + lakši predmeti kasnije ----
    teachP={}
    for t in teachers:
        if str(t).startswith("REZERVISANO"): continue
        for d in D:
            for p in P:
                tt=tterms(t,d,p)
                fx=any(f["teacher"]==t and f["d"]==d and f["p"]==p for f in FIXED)
                v=m.NewBoolVar(f"tp_{abs(hash((t,d,p)))%10**7}")
                if tt and not fx: m.Add(v==sum(tt))
                else: m.Add(v==(1 if fx else 0))
                teachP[(t,d,p)]=v

    pmin, pmax = min(P), max(P)
    gap_terms=[]
    for t in teachers:
        if str(t).startswith("REZERVISANO"): continue
        for d in D:
            occ=[teachP[(t,d,p)] for p in P]
            has_any=m.NewBoolVar(f"has_{abs(hash((t,d)))%10**7}")
            m.AddMaxEquality(has_any, occ)
            cnt=m.NewIntVar(0,len(P),f"cnt_{abs(hash((t,d)))%10**7}")
            m.Add(cnt==sum(occ))
            first=m.NewIntVar(pmin,pmax,f"first_{abs(hash((t,d)))%10**7}")
            last=m.NewIntVar(pmin,pmax,f"last_{abs(hash((t,d)))%10**7}")
            for idx,p in enumerate(P):
                m.Add(first<=p).OnlyEnforceIf(occ[idx])
                m.Add(last>=p).OnlyEnforceIf(occ[idx])
            gap=m.NewIntVar(0,len(P),f"gap_{abs(hash((t,d)))%10**7}")
            m.Add(gap==(last-first+1)-cnt).OnlyEnforceIf(has_any)
            m.Add(gap==0).OnlyEnforceIf(has_any.Not())
            gap_sq=m.NewIntVar(0,len(P)*len(P),f"gapsq_{abs(hash((t,d)))%10**7}")
            m.AddMultiplicationEquality(gap_sq,[gap,gap])
            gap_terms.append(gap_sq)

    # balans: minimiziraj najveći dnevni broj časova po nastavniku
    maxload=[]
    for t in teachers:
        if str(t).startswith("REZERVISANO"): continue
        ml=m.NewIntVar(0,len(P),f"ml_{abs(hash(t))%10**7}")
        for d in D:
            m.Add(sum(teachP[(t,d,p)] for p in P)<=ml)
        maxload.append(ml)
    # lakši predmeti kasnije: nagrada za light subj u kasnim periodima
    light_late=[]
    for i,L in enumerate(SINGLES):
        if L["subj"] in LIGHT:
            for d in D:
                for p in P:
                    if (i,d,p) in xs and p>=5: light_late.append(xs[(i,d,p)])
    m.Minimize( W.get("gap",3)*sum(gap_terms)
                + W.get("balance",2)*sum(maxload)
                - W.get("light_late",1)*sum(light_late) )

    solver=cp_model.CpSolver()
    solver.parameters.max_time_in_seconds=time_limit_s
    solver.parameters.num_search_workers=workers
    status=solver.Solve(m)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {"ok":False,"status":solver.StatusName(status),"lessons":[]}

    out=[]
    for f in FIXED: out.append(dict(teacher=f["teacher"],subj=f["subj"],grade=f["cls"],day=f["d"],period=f["p"],kind="fixed"))
    for i,L in enumerate(SINGLES):
        dom = MORNING if is_core(L["subj"], L["cls"]) else set(P)
        dom = dom & allowed_periods_for(L["teacher"])
        for d in D:
            for p in dom:
                if (i,d,p) in xs and solver.Value(xs[(i,d,p)]):
                    out.append(dict(teacher=L["teacher"],subj=L["subj"],grade=L["cls"],day=d,period=p,kind="regular"))
    for j,L in enumerate(NACHL):
        dom = NACHP & allowed_periods_for(L["teacher"])
        for d in D:
            for p in dom:
                if (j,d,p) in xn and solver.Value(xn[(j,d,p)]):
                    out.append(dict(teacher=L["teacher"],subj="Nacharbeit",grade=L["cls"],day=d,period=p,kind="nach"))
    for b,L in enumerate(BLOCKS):
        for d in D:
            for p in P:
                if (b,d,p) in xb and solver.Value(xb[(b,d,p)]):
                    out.append(dict(teacher=L["teacher"],subj=L["subj"],grade=L["cls"],day=d,period=p,kind="block"))
                    out.append(dict(teacher=L["teacher"],subj=L["subj"],grade=L["cls"],day=d,period=p+1,kind="block"))

    out = _polish_gaps(out, D, P, MORNING, CORE, CORE_BY_GRADE, TC, HR, HR_DAILY)
    return {"ok":True,"status":solver.StatusName(status),"objective":solver.ObjectiveValue(),"lessons":out}


def _polish_gaps(lessons, D, P, MORNING, CORE, CORE_BY_GRADE, TC, HR, HR_DAILY, iters=40000, seed=7):
    """FAZA 2 (post-CP-SAT): lokalna pretraga koja SAMO smanjuje rupe kod
    nastavnika, nikad ne krši nijedno tvrdo pravilo — UKLJUČUJUĆI "razrednik
    svaki dan" (HR/HR_DAILY), koje se lako zaboravi jer CP-SAT ga garantuje
    sam po sebi, ali swap-baziran post-processing to mora provjeriti eksplicitno."""
    import random, math
    rng = random.Random(seed)

    def allowed(teacher):
        mp = TC.get(teacher, {}).get("max_period")
        return set(p for p in P if mp is None or p <= mp)

    movable = [L for L in lessons if L["kind"] == "regular"]
    fixed_like = [L for L in lessons if L["kind"] != "regular"]

    def occ_maps(exclude_ids=()):
        t_occ, c_occ = set(), set()
        for L in lessons:
            if id(L) in exclude_ids: continue
            t_occ.add((L["teacher"], L["day"], L["period"]))
            c_occ.add((L["grade"], L["day"], L["period"]))
        return t_occ, c_occ

    def dom_ok(L, p):
        is_c = L["subj"] in CORE or L["grade"] in CORE_BY_GRADE.get(L["subj"], [])
        if is_c and p not in MORNING: return False
        if p not in allowed(L["teacher"]): return False
        return True

    def subj_ok_after_move(mover, other, new_day):
        """provjeri da mover['subj'] ne postoji već tog dana u tom razredu (osim other)."""
        for L in lessons:
            if L is mover or L is other: continue
            if L["grade"] == mover["grade"] and L["day"] == new_day and L["subj"] == mover["subj"]:
                return False
        return True

    def homeroom_ok_after_swap(A, B):
        g = A["grade"]  # can_swap already guarantees A["grade"]==B["grade"]
        if g not in HR_DAILY: return True
        rl = HR.get(g)
        if not rl: return True
        if A["teacher"] != rl and B["teacher"] != rl: return True  # razrednik nije uključen u ovaj swap
        do_swap(A, B)
        days_with = set(L["day"] for L in lessons if L["grade"] == g and L["teacher"] == rl)
        ok = all(d in days_with for d in D)
        do_swap(A, B)  # vrati stanje — ovo je samo provjera
        return ok

    def can_swap(A, B):
        if A["grade"] != B["grade"]: return False
        if (A["day"], A["period"]) == (B["day"], B["period"]): return False
        if not dom_ok(A, B["period"]) or not dom_ok(B, A["period"]): return False
        # nastavnik ne smije već biti zauzet na novom terminu (osim ako je to baš onaj drugi čas koji se pomjera)
        t_occ, _ = occ_maps()
        if (A["teacher"], B["day"], B["period"]) in t_occ and not (A["teacher"] == B["teacher"] and B["day"]==A["day"] and B["period"]==A["period"]):
            if A["teacher"] != B["teacher"] or True:
                # provjeri isključujući vlastite trenutne pozicije
                other_at_slot = [L for L in lessons if L["teacher"]==A["teacher"] and L["day"]==B["day"] and L["period"]==B["period"] and L is not A]
                if other_at_slot: return False
        if (B["teacher"], A["day"], A["period"]) in t_occ:
            other_at_slot = [L for L in lessons if L["teacher"]==B["teacher"] and L["day"]==A["day"] and L["period"]==A["period"] and L is not B]
            if other_at_slot: return False
        if not subj_ok_after_move(A, B, B["day"]): return False
        if not subj_ok_after_move(B, A, A["day"]): return False
        if not homeroom_ok_after_swap(A, B): return False
        return True

    def do_swap(A, B):
        A["day"], A["period"], B["day"], B["period"] = B["day"], B["period"], A["day"], A["period"]

    def gap_penalty():
        from collections import defaultdict
        byTd = defaultdict(list)
        for L in lessons:
            if str(L["teacher"]).startswith("REZERVISANO"): continue
            byTd[(L["teacher"], L["day"])].append(L["period"])
        pen = 0
        for ps in byTd.values():
            ps = sorted(set(ps))
            g = (max(ps) - min(ps) + 1) - len(ps)
            pen += g * g
        return pen

    def hill(passes=15):
        for _ in range(passes):
            improved = False
            for i in range(len(movable)):
                for j in range(i+1, len(movable)):
                    A, B = movable[i], movable[j]
                    if not can_swap(A, B): continue
                    before = gap_penalty()
                    do_swap(A, B)
                    if gap_penalty() < before: improved = True
                    else: do_swap(A, B)
            if not improved: break

    def anneal(n=iters, T0=3.0, Tend=0.02):
        best_state = [(L["day"], L["period"]) for L in movable]
        best_pen = gap_penalty()
        cur = best_pen
        for it in range(n):
            if len(movable) < 2: break
            T = T0 * ((Tend/T0) ** (it/n))
            A, B = rng.sample(movable, 2)
            if not can_swap(A, B): continue
            do_swap(A, B)
            newpen = gap_penalty()
            delta = newpen - cur
            if delta <= 0 or rng.random() < math.exp(-delta / max(T, 1e-6)):
                cur = newpen
                if newpen < best_pen:
                    best_pen = newpen
                    best_state = [(L["day"], L["period"]) for L in movable]
            else:
                do_swap(A, B)
        for L, (d, p) in zip(movable, best_state):
            L["day"], L["period"] = d, p

    hill()
    anneal()
    hill()
    return fixed_like + movable
