import React, { useMemo, useState, useRef, useEffect } from "react";

/**
 * SPRINT 02 — Wizard za unos i uređivanje config-a.
 *
 * Dotiče: frontend/src/Wizard.jsx (NOVI), frontend/src/styles.css (proširen P-4).
 * NE dira: backend (solver/validators/exports/main.py), config_schema.md oblik.
 *
 * Wizard interno drži "editor-friendly" state i kroz buildConfig() ga pretvara
 * u TAČAN config_schema.md oblik (14 top-level ključeva). loadConfig() radi
 * inverzno — iz JSON-a puni wizard state. Sačuvaj/Učitaj daje identičan round-trip.
 *
 * Ekrani prate USTAV_metodologija.md Faze 0-2:
 *   A = Faza 0 (struktura dana) + Faza 1 (pravila: jutarnji/nach/cilj)
 *   B = Faza 0/1 (nastavnici, predmeti sa kategorijama, honorarni+fiksni termini)
 *   C = Faza 1 (razredi, razredništva, "razrednik svaki dan")
 *   D = Faza 1 (Nacharbeit plan po razredu)
 *
 * Propovi (od App.jsx):
 *   - config: trenutni config objekat (koji wizard edituje)
 *   - onConfig(next): callback kad se config promijeni
 *   - feasibility: {ok, problems[]} iz POST /feasibility (App.jsx drži)
 *   - feasibilityLoading: bool
 */

// ── Pomoć: prazno početno stanje wizarda (ne fiksni IDSS primjer) ──────
function emptyWizard() {
  return {
    // Ekran A — struktura dana
    days: ["Mo", "Di", "Mi", "Do", "Fr"],
    periods: [1, 2, 3, 4, 5, 6, 7],
    period_times: {
      1: "08:00–08:45", 2: "09:05–09:50", 3: "10:10–10:55",
      4: "11:15–12:00", 5: "13:00–13:45", 6: "13:50–14:35", 7: "14:40–15:25",
    },
    morning_periods: [1, 2, 3, 4],
    nach_periods: [6, 7],
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    target_per_grade: 35, // ciljni broj časova po razredu (IDSS: 35)

    // Ekran B — nastavnici, predmeti, lessons, fixed
    teachers: [],          // [{name, maxPeriod}]  maxPeriod = zadnji dozvoljeni čas (opciono)
    subjects: [],          // [{name, category: "core"|"block"|"regular", blockGrades: []}]
    lessons: [],           // [{id, grades:[], subj, teacher, count, kind:"regular"|"nach"}]
    teachers_fixed: [],    // [{id, teacher, subj, grade, day, period}]
    teacher_constraints: {}, // {"Ime nastavnika": {"max_period": broj}} — ograničenje dostupnosti

    // Ekran C — razredništva
    homeroom: {},          // {grade: teacherName}
    homeroom_daily_grades: [], // [grade, ...]

    // Ekran D — Nacharbeit (izvedeno iz lessons kind=nach, ali i eksplicitni prikaz)
    // Nacharbeit se unosi kao lessons sa kind:"nach"; Ekran D je fokusiran prikaz/unos.
  };
}

// ── buildConfig: wizard state -> TAČAN config_schema.md oblik ──────────
// Ovo je jedino mjesto gdje se config gradi. M-4: ne izmišljati polja.
function buildConfig(w) {
  // morning_core_subjects = predmeti kategorije "core"
  const morning_core_subjects = w.subjects
    .filter((s) => s.category === "core")
    .map((s) => s.name);
  // block_subjects = predmeti kategorije "block" -> {name: [grades]}
  const block_subjects = {};
  for (const s of w.subjects) {
    if (s.category === "block") block_subjects[s.name] = s.blockGrades || [];
  }
  // light_subjects = predmeti eksplicitno označeni kao "light/lakši" (MEKO pravilo).
  // NE izvoditi — korisnik ih označi u Ekranu B. (M-4: ne izmišljati polja.)
  const light_subjects = w.subjects.filter((s) => s.light).map((s) => s.name);

  // morning_core_by_grade = predmeti koji su jutarnji SAMO za navedene razrede
  // (za razliku od morning_core_subjects, koji je globalno za sve razrede tog predmeta).
  // config_schema.md: mapa {predmet: [razredi]}. Izvor je s.morningGrades po predmetu
  // (jedan izvor istine — postavlja ga i loadConfig pri učitavanju i UI u Ekranu B).
  // Predmet se pojavljuje u mapi samo ako ima bar jedan odabran razred.
  const morning_core_by_grade = {};
  for (const s of w.subjects) {
    if (s.morningGrades && s.morningGrades.length > 0) {
      morning_core_by_grade[s.name] = s.morningGrades.map(Number);
    }
  }

  // lessons: samo regular + nach (teachers_fixed ide posebno)
  const lessons = w.lessons.map((L) => ({
    grades: L.grades,
    subj: L.subj,
    teacher: L.teacher,
    count: Number(L.count),
    kind: L.kind,
  }));

  // teachers_fixed: tačan oblik {teacher, subj, grade, day, period}
  const teachers_fixed = w.teachers_fixed.map((f) => ({
    teacher: f.teacher,
    subj: f.subj,
    grade: Number(f.grade),
    day: f.day,
    period: Number(f.period),
  }));

  // homeroom: {grade(String): name}
  const homeroom = {};
  for (const [g, name] of Object.entries(w.homeroom)) {
    if (name) homeroom[String(g)] = name;
  }

  // teacher_constraints: mapa {ime: {max_period: broj}} — samo nastavnici sa postavljenim maxPeriod.
  // Logika: UI polje (teachers[].maxPeriod) ima PREDNOST nad w.teacher_constraints (iz učitanog config-a).
  // Ako korisnik očisti UI polje (""), constraint se UKLANJA — eksplicitna korisnička akcija.
  // Nastavnici koji nisu u teachers[] ali su u w.teacher_constraints (npr. iz učitanog config-a bez lessons)
  // zadržavaju svoj constraint ako UI nije diran.
  const teacher_constraints = {};
  // 1) Prebaci iz w.teacher_constraints (round-trip iz učitanog JSON-a)
  if (w.teacher_constraints && Object.keys(w.teacher_constraints).length > 0) {
    for (const [name, c] of Object.entries(w.teacher_constraints)) {
      if (c && c.max_period != null) teacher_constraints[name] = { max_period: Number(c.max_period) };
    }
  }
  // 2) UI override: ako nastavnik ima maxPeriod u teachers[], to je konačna riječ
  //    (prazno "" = ukloni constraint; broj = postavi/override)
  const teacherNames = new Set(w.teachers.map((t) => t.name));
  for (const t of w.teachers) {
    if (t.maxPeriod != null && t.maxPeriod !== "" && !Number.isNaN(Number(t.maxPeriod))) {
      teacher_constraints[t.name] = { max_period: Number(t.maxPeriod) };
    } else if (t.maxPeriod === "" && teacher_constraints[t.name]) {
      // UI eksplicitno očišćeno — ukloni constraint
      delete teacher_constraints[t.name];
    }
  }

  return {
    days: w.days,
    periods: w.periods.map(Number),
    period_times: w.period_times,
    morning_periods: w.morning_periods.map(Number),
    nach_periods: w.nach_periods.map(Number),
    grades: w.grades.map(Number),
    morning_core_subjects,
    morning_core_by_grade,
    block_subjects,
    homeroom,
    homeroom_daily_grades: w.homeroom_daily_grades.map(Number),
    light_subjects,
    objective_weights: { compactness: 1, balance: 2, light_late: 1, gap: 3 },
    teachers_fixed,
    teacher_constraints,
    lessons,
  };
}

// ── loadConfig: config objekat -> wizard state (inverz od buildConfig) ─
// Koristi se za "Učitaj config". Mora dati round-trip identičan buildConfig.
function loadConfig(cfg) {
  const w = emptyWizard();
  if (cfg.days) w.days = [...cfg.days];
  if (cfg.periods) w.periods = cfg.periods.map(Number);
  if (cfg.period_times) w.period_times = { ...cfg.period_times };
  if (cfg.morning_periods) w.morning_periods = cfg.morning_periods.map(Number);
  if (cfg.nach_periods) w.nach_periods = cfg.nach_periods.map(Number);
  if (cfg.grades) w.grades = cfg.grades.map(Number);
  if (cfg.homeroom_daily_grades) w.homeroom_daily_grades = cfg.homeroom_daily_grades.map(Number);
  if (cfg.homeroom) w.homeroom = { ...cfg.homeroom };

  // target_per_grade izvedi iz days×periods ako nema eksplicitnog
  w.target_per_grade = (w.days.length || 5) * (w.periods.length || 7);

  // Predmeti + kategorije: rekonstruiši iz morning_core_subjects, block_subjects, lessons.
  // OČUVAJ redoslijed (Set kvari redoslijed → round-trip nejednak). Zato prvo skupi u
  // uređenu listu: core (redoslijed iz configa) → block → ostali iz lessons/fixed.
  const subjOrdered = [];
  const subjSeen = new Set();
  const pushSubj = (name) => { if (!subjSeen.has(name)) { subjSeen.add(name); subjOrdered.push(name); } };
  (cfg.morning_core_subjects || []).forEach(pushSubj);
  Object.keys(cfg.block_subjects || {}).forEach(pushSubj);
  Object.keys(cfg.morning_core_by_grade || {}).forEach(pushSubj);
  (cfg.lessons || []).forEach((L) => pushSubj(L.subj));
  (cfg.teachers_fixed || []).forEach((f) => pushSubj(f.subj));
  const lightSet = new Set(cfg.light_subjects || []);
  const mcbg = cfg.morning_core_by_grade || {};
  w.subjects = subjOrdered.map((name) => {
    const isCore = (cfg.morning_core_subjects || []).includes(name);
    const blockGrades = cfg.block_subjects?.[name] || [];
    const isBlock = blockGrades.length > 0;
    return {
      name,
      category: isCore ? "core" : isBlock ? "block" : "regular",
      blockGrades: isBlock ? [...blockGrades] : [],
      light: lightSet.has(name), // lakši predmet (MEKO pravilo — gura se kasnije)
      // jutarnji SAMO za navedene razrede (config_schema.md: morning_core_by_grade) — round-trip
      morningGrades: mcbg[name] ? [...mcbg[name]] : [],
    };
  });

  // Nastavnici: iz lessons + teachers_fixed (bez REZERVISANO)
  // teacher_constraints: pročitaj iz config-a i postavi maxPeriod na odgovarajućeg nastavnika.
  const tc = cfg.teacher_constraints || {};
  const teachSet = new Set();
  (cfg.lessons || []).forEach((L) => teachSet.add(L.teacher));
  (cfg.teachers_fixed || []).forEach((f) => {
    if (!f.teacher.startsWith("REZERVISANO")) teachSet.add(f.teacher);
  });
  // Uvaži i nastavnike koji se javljaju SAMO u teacher_constraints (npr. ako nemaju lessons/fixed)
  Object.keys(tc).forEach((name) => teachSet.add(name));
  w.teachers = [...teachSet].map((name) => ({
    name,
    maxPeriod: tc[name] && tc[name].max_period != null ? tc[name].max_period : "",
  }));
  // Sačuvaj teacher_constraints i u wizard state (za round-trip — nepromijenjeno)
  w.teacher_constraints = {};
  for (const [name, c] of Object.entries(tc)) {
    if (c && c.max_period != null) w.teacher_constraints[name] = { max_period: c.max_period };
  }

  // Lessons
  w.lessons = (cfg.lessons || []).map((L, i) => ({
    id: i + 1,
    grades: [...L.grades],
    subj: L.subj,
    teacher: L.teacher,
    count: L.count,
    kind: L.kind || "regular",
  }));

  // teachers_fixed
  w.teachers_fixed = (cfg.teachers_fixed || []).map((f, i) => ({
    id: i + 1,
    teacher: f.teacher,
    subj: f.subj,
    grade: Number(f.grade),
    day: f.day,
    period: Number(f.period),
  }));

  return w;
}

let _id = 100;
const nextId = () => ++_id;

// ── Mali reusable inputi ──────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="wiz-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function Wizard({ config, onConfig, feasibility, feasibilityLoading }) {
  // Wizard interno drži editor-friendly state; App.jsx dobija config via buildConfig.
  // Inicijalno: prazno stanje (NE fiksni IDSS primjer — Sprint 02 kriterij).
  const [w, setW] = useState(() => emptyWizard());
  const [step, setStep] = useState(0); // 0=A, 1=B, 2=C, 3=D, 4=Provjera, 5=Napredno
  const fileRef = useRef(null);
  const ADVANCED_STEP = 5;

  // ── SPRINT 04, stavka 5: "Napredno" — ručno uređivanje sirovog config JSON-a.
  // Rješava ponavljajući problem: svako NOVO polje koje backend dobije (npr.
  // teacher_constraints, morning_core_by_grade u prošlim sprintovima) wizard
  // ga tiho gubi dok forma za njega ne postoji. Ovaj ekran radi isto što i
  // Učitaj config (loadConfig), samo bez fajla — direktno iz textarea.
  const [advText, setAdvText] = useState("");
  const [advError, setAdvError] = useState("");
  const [advDirty, setAdvDirty] = useState(false); // true = korisnik je tu nešto ukucao, ne prepisuj ga automatski

  // Uđeš na Napredno ekran (i nisi mijenjao/la tekst) → osvježi ga trenutnim configom.
  useEffect(() => {
    if (step === ADVANCED_STEP && !advDirty) {
      setAdvText(JSON.stringify(buildConfig(w), null, 2));
      setAdvError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function applyAdvanced() {
    if (!advText.trim()) return;
    try {
      const parsed = JSON.parse(advText);
      const loaded = loadConfig(parsed);
      setW(loaded);
      onConfig(buildConfig(loaded));
      setAdvError("");
      setAdvDirty(false);
    } catch (err) {
      setAdvError("Nevažeći JSON — izmjena NIJE primijenjena: " + err.message);
    }
  }

  function refreshAdvanced() {
    setAdvText(JSON.stringify(buildConfig(w), null, 2));
    setAdvError("");
    setAdvDirty(false);
  }

  // primijeni Napredno izmjene PRIJE nego što se pređe na drugi korak
  // (onBlur na textarea pokriva klik van nje, ovo je dodatna garancija)
  function goToStep(i) {
    if (step === ADVANCED_STEP) applyAdvanced();
    setStep(i);
  }

  // ── Ažuriranje wizard state ──
  function up(patch) {
    setW((prev) => {
      const next = { ...prev, ...patch };
      // odmah propagiraj config gore (App.jsx ga koristi za /feasibility + /solve)
      onConfig(buildConfig(next));
      return next;
    });
  }
  // duboko ažuriranje listi
  function upList(key, idx, patch) {
    setW((prev) => {
      const arr = prev[key].map((x, i) => (i === idx ? { ...x, ...patch } : x));
      const next = { ...prev, [key]: arr };
      onConfig(buildConfig(next));
      return next;
    });
  }
  function addList(key, item) {
    setW((prev) => {
      const arr = [...prev[key], item];
      const next = { ...prev, [key]: arr };
      onConfig(buildConfig(next));
      return next;
    });
  }
  function delList(key, idx) {
    setW((prev) => {
      const arr = prev[key].filter((_, i) => i !== idx);
      const next = { ...prev, [key]: arr };
      onConfig(buildConfig(next));
      return next;
    });
  }

  // ── Sačuvaj config (preuzmi .json) ──
  function saveConfig() {
    const cfg = buildConfig(w);
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "idss_config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Učitaj config (.json -> wizard state) ──
  function loadConfigFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const cfg = JSON.parse(reader.result);
        const loaded = loadConfig(cfg);
        setW(loaded);
        onConfig(buildConfig(loaded));
        setStep(0);
      } catch (err) {
        alert("Nije uspjelo čitanje JSON-a: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset da se isti fajl može ponovo izabrati
  }

  // ── Validacija brojeva (pomoćni prikaz, ne blokira unos) ──
  const days = w.days;
  const periods = w.periods;
  const grades = w.grades;
  const totalSlots = days.length * periods.length;
  const perGrade = useMemo(() => {
    const m = {};
    grades.forEach((g) => (m[g] = 0));
    for (const f of w.teachers_fixed) if (m[f.grade] != null) m[f.grade] += 1;
    for (const L of w.lessons)
      for (const g of L.grades) if (m[g] != null) m[g] += Number(L.count || 0);
    return m;
  }, [grades, w.teachers_fixed, w.lessons]);

  const stepNames = ["A · Struktura dana", "B · Nastavnici & predmeti", "C · Razredi & razredništva", "D · Nacharbeit", "Provjera izvodivosti", "Napredno"];

  return (
    <div className="wiz">
      {/* Trajni dugmad: Sačuvaj / Učitaj */}
      <div className="wiz-nav" style={{ justifyContent: "flex-end" }}>
        <button className="secondary" onClick={saveConfig}>💾 Sačuvaj config (.json)</button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>📂 Učitaj config (.json)</button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="file-input" style={{ display: "none" }} onChange={loadConfigFile} />
      </div>

      {/* Step traka */}
      <div className="wiz-steps">
        {stepNames.map((n, i) => (
          <div
            key={n}
            className={`wiz-step ${i === step ? "active" : i < step ? "done" : ""}`}
            onClick={() => goToStep(i)}
            role="button"
            tabIndex={0}
            aria-current={i === step ? "step" : undefined}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToStep(i); }
            }}
          >
            <span className="num">{i + 1}</span>{n}
          </div>
        ))}
      </div>

      {/* ── EKRAN A: Struktura dana ── */}
      {step === 0 && (
        <div className="wiz-panel">
          <h2>Struktura dana</h2>
          <p className="hint">Odredi broj dana i časova u sedmici, njihova vremena, te koji periodi su jutarnji, a koji za Nacharbeit. Ovo određuje ciljni broj časova po razredu.</p>

          <Field label="Radni dani (zarezom)">
            <input type="text" value={w.days.join(", ")} onChange={(e) => up({ days: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </Field>
          <Field label="Periodi / časovi (zarezom)">
            <input type="text" value={w.periods.join(", ")} onChange={(e) => up({ periods: e.target.value.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n)) })} />
          </Field>

          <div className="wiz-section-title">Vremena po času (samo za prikaz/izvoz)</div>
          {periods.map((p) => (
            <Field key={p} label={`Čas ${p}`}>
              <input type="text" value={w.period_times[p] || ""} onChange={(e) => up({ period_times: { ...w.period_times, [p]: e.target.value } })} placeholder="npr. 08:00–08:45" />
            </Field>
          ))}

          <div className="wiz-section-title">Jutarnji periodi (glavni predmeti: Matematika, Deutsch)</div>
          <div className="wiz-chips">
            {periods.map((p) => (
              <button key={p} className={`chip ${w.morning_periods.includes(p) ? "" : "off"}`} onClick={() => {
                const has = w.morning_periods.includes(p);
                up({ morning_periods: has ? w.morning_periods.filter((x) => x !== p) : [...w.morning_periods, p].sort((a, b) => a - b) });
              }}>{p}. čas</button>
            ))}
          </div>

          <div className="wiz-section-title">Nacharbeit periodi (zadnji časevi dana)</div>
          <div className="wiz-chips">
            {periods.map((p) => (
              <button key={p} className={`chip ${w.nach_periods.includes(p) ? "" : "off"}`} onClick={() => {
                const has = w.nach_periods.includes(p);
                up({ nach_periods: has ? w.nach_periods.filter((x) => x !== p) : [...w.nach_periods, p].sort((a, b) => a - b) });
              }}>{p}. čas</button>
            ))}
          </div>

          <div className="wiz-section-title">Razredi (zarezom)</div>
          <Field label="Razredi">
            <input type="text" value={w.grades.join(", ")} onChange={(e) => up({ grades: e.target.value.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n)) })} />
          </Field>

          <div className="wiz-summary">
            <b>Ciljni broj časova po razredu:</b> {days.length} dana × {periods.length} časa = <b className={totalSlots === w.target_per_grade ? "ok" : "bad"}>{totalSlots}</b>
            {" "}(IDSS: 35). Ovaj broj rješavač očekuje da suma časova po razredu tačno dostigne.
          </div>
        </div>
      )}

      {/* ── EKRAN B: Nastavnici & predmeti ── */}
      {step === 1 && (
        <div className="wiz-panel">
          <h2>Nastavnici i predmeti</h2>
          <p className="hint">Unesi sve nastavnike, predmete sa kategorijom (glavni-jutarnji / blok / obični), te redovne časove i honorarne nastavnike sa fiksnim terminima.</p>

          <div className="wiz-section-title">Nastavnici</div>
          <div className="wiz-inline-form">
            <div className="f"><label>Ime nastavnika</label><input type="text" id="newTeacher" placeholder="npr. Melisa Babić" /></div>
            <button className="btn-add" onClick={() => {
              const el = document.getElementById("newTeacher");
              const name = el.value.trim();
              if (!name) return;
              addList("teachers", { name, maxPeriod: "" });
              el.value = "";
            }}>+ Dodaj nastavnika</button>
          </div>
          {w.teachers.length === 0 ? <div className="wiz-empty">Još nema nastavnika — dodaj prvog u formi iznad ↑</div> : (
            <table className="wiz-table">
              <thead><tr><th>#</th><th>Ime</th><th>Zadnji dozvoljeni čas</th><th className="act">Akcija</th></tr></thead>
              <tbody>
                {w.teachers.map((t, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><input type="text" value={t.name} onChange={(e) => upList("teachers", i, { name: e.target.value })} style={{ width: "100%" }} /></td>
                    <td style={{ maxWidth: 180 }}>
                      <input
                        type="number"
                        min={1}
                        max={w.periods.length ? Math.max(...w.periods) : 7}
                        value={t.maxPeriod ?? ""}
                        placeholder="—"
                        onChange={(e) => {
                          const v = e.target.value;
                          upList("teachers", i, { maxPeriod: v === "" ? "" : Number(v) });
                        }}
                        style={{ width: 70 }}
                      />
                      <span style={{ fontSize: 11, color: "#5a6b7d", marginLeft: 6 }}>max_period</span>
                    </td>
                    <td className="act"><button className="btn-del" onClick={() => delList("teachers", i)}>Obriši</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="hint">"Zadnji dozvoljeni čas" = nastavnik se nikad ne raspoređuje poslije tog časa (uključujući njega). Ostavi prazno ako nema ograničenja.</p>

          <div className="wiz-section-title">Predmeti (sa kategorijom)</div>
          <div className="wiz-inline-form">
            <div className="f"><label>Naziv predmeta</label><input type="text" id="newSubj" placeholder="npr. Mathematik" /></div>
            <div className="f"><label>Kategorija</label>
              <select id="newCat">
                <option value="regular">Obični</option>
                <option value="core">Glavni-jutarnji (Math/Deutsch)</option>
                <option value="block">Blok (2 vezana časa)</option>
              </select>
            </div>
            <button className="btn-add" onClick={() => {
              const el = document.getElementById("newSubj");
              const cat = document.getElementById("newCat").value;
              const name = el.value.trim();
              if (!name) return;
              addList("subjects", { name, category: cat, blockGrades: cat === "block" ? [...grades] : [], light: false, morningGrades: [] });
              el.value = "";
            }}>+ Dodaj predmet</button>
          </div>
          {w.subjects.length === 0 ? <div className="wiz-empty">Još nema predmeta — dodaj prvi u formi iznad ↑</div> : (
            <table className="wiz-table">
              <thead><tr><th>#</th><th>Predmet</th><th>Kategorija</th><th>Lakši</th><th>Blok razredi (ako blok)</th><th>Jutarnji samo za razred(e)</th><th className="act">Akcija</th></tr></thead>
              <tbody>
                {w.subjects.map((s, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><input type="text" value={s.name} onChange={(e) => upList("subjects", i, { name: e.target.value })} style={{ width: "100%" }} /></td>
                    <td>
                      <select value={s.category} onChange={(e) => upList("subjects", i, { category: e.target.value, blockGrades: e.target.value === "block" ? (s.blockGrades.length ? s.blockGrades : [...grades]) : [] })}>
                        <option value="regular">Obični</option>
                        <option value="core">Glavni-jutarnji</option>
                        <option value="block">Blok</option>
                      </select>
                      <span className={`wiz-badge ${s.category}`}>{s.category === "core" ? "jutarnji" : s.category === "block" ? "blok" : "obični"}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input type="checkbox" checked={!!s.light} onChange={(e) => upList("subjects", i, { light: e.target.checked })} title="Lakši predmet — gura se u kasnije termine (MEKO pravilo)" />
                    </td>
                    <td>
                      {s.category === "block" ? (
                        <div className="wiz-chips" style={{ margin: 0 }}>
                          {grades.map((g) => (
                            <button key={g} className={`chip ${(s.blockGrades || []).includes(g) ? "" : "off"}`} onClick={() => {
                              const bg = s.blockGrades || [];
                              const has = bg.includes(g);
                              upList("subjects", i, { blockGrades: has ? bg.filter((x) => x !== g) : [...bg, g].sort((a, b) => a - b) });
                            }}>{g}</button>
                          ))}
                        </div>
                      ) : "—"}
                    </td>
                    <td>
                      <div className="wiz-chips" style={{ margin: 0 }}>
                        {grades.map((g) => (
                          <button
                            key={g}
                            className={`chip ${(s.morningGrades || []).includes(g) ? "" : "off"}`}
                            title="Jutarnji samo u ovom razredu"
                            onClick={() => {
                              const mg = s.morningGrades || [];
                              const has = mg.includes(g);
                              upList("subjects", i, { morningGrades: has ? mg.filter((x) => x !== g) : [...mg, g].sort((a, b) => a - b) });
                            }}
                          >{g}</button>
                        ))}
                      </div>
                    </td>
                    <td className="act"><button className="btn-del" onClick={() => delList("subjects", i)}>Obriši</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="hint">"Jutarnji samo za razred(e)" — označi razrede u kojima ovaj predmet mora biti u jutarnjem terminu (npr. B/H/S ili Englisch samo u razredima 1, 2, 4 — ne svuda gdje se predaje). Za predmet koji je jutarnji svuda gdje se predaje, koristi kategoriju "Glavni-jutarnji" umjesto ovoga.</p>

          <div className="wiz-section-title">Redovni časovi (mobilni — raspoređuju se)</div>
          <p className="hint">Za svaki predmet po razredu: broj sedmičnih časova. Ako je predmet blok, count treba biti 2.</p>
          <div className="wiz-inline-form">
            <div className="f"><label>Razred(i) — zarezom</label><input type="text" id="rL_grades" placeholder="npr. 1 ili 1,2" /></div>
            <div className="f"><label>Predmet</label><select id="rL_subj">{w.subjects.length ? w.subjects.map((s) => <option key={s.name} value={s.name}>{s.name}</option>) : <option value="">— prvo dodaj predmet —</option>}</select></div>
            <div className="f"><label>Nastavnik</label><select id="rL_teacher">{w.teachers.length ? w.teachers.map((t) => <option key={t.name} value={t.name}>{t.name}</option>) : <option value="">— prvo dodaj nastavnika —</option>}</select></div>
            <div className="f"><label>Broj časova</label><input type="number" id="rL_count" min="1" defaultValue="4" style={{ width: 70 }} /></div>
            <button className="btn-add" onClick={() => {
              const gRaw = document.getElementById("rL_grades").value.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n));
              const subj = document.getElementById("rL_subj").value;
              const teacher = document.getElementById("rL_teacher").value;
              const count = Number(document.getElementById("rL_count").value);
              if (!gRaw.length || !subj || !teacher || !count) { alert("Popuni razred, predmet, nastavnika i broj časova."); return; }
              addList("lessons", { id: nextId(), grades: gRaw, subj, teacher, count, kind: "regular" });
            }}>+ Dodaj čas</button>
          </div>
          {w.lessons.filter((L) => L.kind === "regular").length === 0 ? <div className="wiz-empty">Još nema redovnih časova — dodaj prvi u formi iznad ↑</div> : (
            <table className="wiz-table">
              <thead><tr><th>#</th><th>Razred</th><th>Predmet</th><th>Nastavnik</th><th>Časova</th><th className="act">Akcija</th></tr></thead>
              <tbody>
                {w.lessons.map((L, i) => L.kind === "regular" && (
                  <tr key={L.id}>
                    <td>{i + 1}</td>
                    <td><input type="text" value={L.grades.join(",")} onChange={(e) => upList("lessons", i, { grades: e.target.value.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n)) })} style={{ width: 60 }} /></td>
                    <td><select value={L.subj} onChange={(e) => upList("lessons", i, { subj: e.target.value })}>{w.subjects.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}</select></td>
                    <td><select value={L.teacher} onChange={(e) => upList("lessons", i, { teacher: e.target.value })}>{w.teachers.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}</select></td>
                    <td><input type="number" value={L.count} min="1" onChange={(e) => upList("lessons", i, { count: Number(e.target.value) })} style={{ width: 55 }} /></td>
                    <td className="act"><button className="btn-del" onClick={() => delList("lessons", i)}>Obriši</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="wiz-section-title">Honorarni nastavnici — fiksni termini (ne pomjeraju se)</div>
          <p className="hint">Rezervisano mjesto (bez nastavnika) unesi kao ime „REZERVISANO – Predmet”.</p>
          <div className="wiz-inline-form">
            <div className="f"><label>Nastavnik</label><input type="text" id="fL_teacher" placeholder="ime ili REZERVISANO – X" list="teacherList" /></div>
            <datalist id="teacherList">{w.teachers.map((t) => <option key={t.name} value={t.name} />)}</datalist>
            <div className="f"><label>Predmet</label><select id="fL_subj">{w.subjects.length ? w.subjects.map((s) => <option key={s.name} value={s.name}>{s.name}</option>) : <option value="">—</option>}</select></div>
            <div className="f"><label>Razred</label><select id="fL_grade">{grades.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
            <div className="f"><label>Dan</label><select id="fL_day">{days.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
            <div className="f"><label>Čas</label><select id="fL_period">{periods.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <button className="btn-add" onClick={() => {
              const teacher = document.getElementById("fL_teacher").value.trim();
              const subj = document.getElementById("fL_subj").value;
              const grade = Number(document.getElementById("fL_grade").value);
              const day = document.getElementById("fL_day").value;
              const period = Number(document.getElementById("fL_period").value);
              if (!teacher || !subj) { alert("Popuni nastavnika i predmet."); return; }
              addList("teachers_fixed", { id: nextId(), teacher, subj, grade, day, period });
            }}>+ Dodaj fiksni termin</button>
          </div>
          {w.teachers_fixed.length === 0 ? <div className="wiz-empty">Još nema fiksnih termina — dodaj prvi u formi iznad ↑</div> : (
            <table className="wiz-table">
              <thead><tr><th>#</th><th>Nastavnik</th><th>Predmet</th><th>Razred</th><th>Dan</th><th>Čas</th><th className="act">Akcija</th></tr></thead>
              <tbody>
                {w.teachers_fixed.map((f, i) => (
                  <tr key={f.id}>
                    <td>{i + 1}</td>
                    <td><input type="text" value={f.teacher} onChange={(e) => upList("teachers_fixed", i, { teacher: e.target.value })} style={{ width: "100%" }} /></td>
                    <td><select value={f.subj} onChange={(e) => upList("teachers_fixed", i, { subj: e.target.value })}>{w.subjects.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}</select></td>
                    <td><select value={f.grade} onChange={(e) => upList("teachers_fixed", i, { grade: Number(e.target.value) })}>{grades.map((g) => <option key={g} value={g}>{g}</option>)}</select></td>
                    <td><select value={f.day} onChange={(e) => upList("teachers_fixed", i, { day: e.target.value })}>{days.map((d) => <option key={d} value={d}>{d}</option>)}</select></td>
                    <td><select value={f.period} onChange={(e) => upList("teachers_fixed", i, { period: Number(e.target.value) })}>{periods.map((p) => <option key={p} value={p}>{p}</option>)}</select></td>
                    <td className="act"><button className="btn-del" onClick={() => delList("teachers_fixed", i)}>Obriši</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── EKRAN C: Razredi & razredništva ── */}
      {step === 2 && (
        <div className="wiz-panel">
          <h2>Razredi i razredništva</h2>
          <p className="hint">Odredi ko je razrednik kojeg razreda, te za koje razrede vrijedi „razrednik svaki dan”. Ostali su izuzeci (kad razrednik predaje premalo časova da bi to bilo izvodivo).</p>

          <div className="wiz-section-title">Razrednik po razredu</div>
          {grades.length === 0 ? <div className="wiz-empty">Još nema razreda — dodaj ih na Ekranu A ↑</div> : (
            <table className="wiz-table">
              <thead><tr><th>Razred</th><th>Razrednik (nastavnik)</th></tr></thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g}>
                    <td><b>{g}</b></td>
                    <td>
                      <select value={w.homeroom[g] || ""} onChange={(e) => up({ homeroom: { ...w.homeroom, [g]: e.target.value } })}>
                        <option value="">— (nije postavljeno) —</option>
                        {w.teachers.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="wiz-section-title">„Razrednik svaki dan” — označi razrede</div>
          <p className="hint">Ovo su razredi za koje rješavač traži dnevni kontakt razrednika. Neoznačeni su izuzeci.</p>
          <div className="wiz-chips">
            {grades.map((g) => (
              <button key={g} className={`chip ${w.homeroom_daily_grades.includes(g) ? "" : "off"}`} onClick={() => {
                const has = w.homeroom_daily_grades.includes(g);
                up({ homeroom_daily_grades: has ? w.homeroom_daily_grades.filter((x) => x !== g) : [...w.homeroom_daily_grades, g].sort((a, b) => a - b) });
              }}>{g}. razred</button>
            ))}
          </div>
        </div>
      )}

      {/* ── EKRAN D: Nacharbeit plan ── */}
      {step === 3 && (
        <div className="wiz-panel">
          <h2>Nacharbeit plan</h2>
          <p className="hint">Za svaki razred unesi broj Nacharbeit časova i ko ih vodi. Nacharbeit ide u zadnje časove dana ({w.nach_periods.join(", ")}), uvijek kao posljednji u rasporedu tog dana.</p>

          <div className="wiz-inline-form">
            <div className="f"><label>Razred</label><select id="nL_grade">{grades.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
            <div className="f"><label>Nosilac (nastavnik)</label><select id="nL_teacher">{w.teachers.length ? w.teachers.map((t) => <option key={t.name} value={t.name}>{t.name}</option>) : <option value="">— prvo dodaj nastavnika —</option>}</select></div>
            <div className="f"><label>Broj časova</label><input type="number" id="nL_count" min="1" defaultValue="2" style={{ width: 70 }} /></div>
            <button className="btn-add" onClick={() => {
              const grade = Number(document.getElementById("nL_grade").value);
              const teacher = document.getElementById("nL_teacher").value;
              const count = Number(document.getElementById("nL_count").value);
              if (!teacher || !count) { alert("Popuni nosioca i broj časova."); return; }
              addList("lessons", { id: nextId(), grades: [grade], subj: "Nacharbeit", teacher, count, kind: "nach" });
            }}>+ Dodaj Nacharbeit</button>
          </div>

          {w.lessons.filter((L) => L.kind === "nach").length === 0 ? <div className="wiz-empty">Još nema Nacharbeit časova — dodaj prvi u formi iznad ↑</div> : (
            <table className="wiz-table">
              <thead><tr><th>#</th><th>Razred</th><th>Nosilac</th><th>Časova</th><th className="act">Akcija</th></tr></thead>
              <tbody>
                {w.lessons.map((L, i) => L.kind === "nach" && (
                  <tr key={L.id}>
                    <td>{i + 1}</td>
                    <td><select value={L.grades[0]} onChange={(e) => upList("lessons", i, { grades: [Number(e.target.value)] })}>{grades.map((g) => <option key={g} value={g}>{g}</option>)}</select></td>
                    <td><select value={L.teacher} onChange={(e) => upList("lessons", i, { teacher: e.target.value })}>{w.teachers.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}</select></td>
                    <td><input type="number" value={L.count} min="1" onChange={(e) => upList("lessons", i, { count: Number(e.target.value) })} style={{ width: 55 }} /></td>
                    <td className="act"><button className="btn-del" onClick={() => delList("lessons", i)}>Obriši</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="wiz-summary">
            <b>Napomena:</b> Nacharbeit subjekt u config-u je uvijek „Nacharbeit”. Rješavač ga stavlja u period {w.nach_periods.join(" ili ")} kao sufiks dana.
          </div>
        </div>
      )}

      {/* ── EKRAN: Provjera izvodivosti ── */}
      {step === 4 && (
        <div className="wiz-panel">
          <h2>Provjera izvodivosti</h2>
          <p className="hint">Prije generisanja rasporeda, sistem provjerava da li uneseni podaci uopšte mogu stati u sedmični raspored. Dugme „Generiši raspored” je onemogućeno dok provjera ne prođe.</p>

          <div className="wiz-section-title">Suma časova po razredu (cilj: {totalSlots})</div>
          <table className="wiz-table">
            <thead><tr><th>Razred</th><th>Redovni + Nach + Fiksni</th><th>Cilj</th><th>Razlika</th></tr></thead>
            <tbody>
              {grades.map((g) => {
                const sum = perGrade[g] || 0;
                const diff = sum - totalSlots;
                return (
                  <tr key={g}>
                    <td><b>{g}</b></td>
                    <td>{sum}</td>
                    <td>{totalSlots}</td>
                    <td className={diff === 0 ? "ok" : "bad"} style={{ fontWeight: "bold", color: diff === 0 ? "var(--sky)" : "var(--red)" }}>{diff > 0 ? `+${diff}` : diff}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="wiz-section-title">Rezultat provjere</div>
          {feasibilityLoading ? (
            <div className="wiz-summary">Provjeravam…</div>
          ) : feasibility?.ok ? (
            <div className="wiz-summary"><span className="ok">✓ Izvodivo.</span> Možeš kliknuti „Generiši raspored” gore.</div>
          ) : (
            <div className="wiz-summary">
              <span className="bad">✗ Nije izvodivo — popraviti:</span>
              <ul className="wiz-feaslist">
                {(feasibility?.problems || ["Sistem trenutno nije dostupan — pokušaj ponovo za koji trenutak."]).map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── EKRAN ⑥: Napredno — sirovi config JSON ── */}
      {step === ADVANCED_STEP && (
        <div className="wiz-panel">
          <h2>Napredno — podaci u sirovom obliku (JSON)</h2>
          <p className="hint">
            Ovdje vidiš tačne podatke koje wizard koristi za izradu rasporeda, kao tekst. Koristi
            ovo kad wizard forma (Ekrani A–D) još nema polje za nešto što ti treba — uredi tekst
            direktno i klikni „Primijeni izmjene”. Isto kao Učitaj config (.json), samo bez fajla.
            Ako ne znaš šta je JSON ili ti ovo ne treba, slobodno preskoči ovaj ekran.
          </p>
          <textarea
            className="wiz-json"
            spellCheck={false}
            value={advText}
            onChange={(e) => { setAdvText(e.target.value); setAdvDirty(true); }}
            onBlur={applyAdvanced}
          />
          {advError && <div className="wiz-summary"><span className="bad">✗ {advError}</span></div>}
          <div className="wiz-nav" style={{ justifyContent: "flex-start", marginTop: 10 }}>
            <button onClick={applyAdvanced}>✅ Primijeni izmjene</button>
            <button className="secondary" onClick={refreshAdvanced}>🔄 Osvježi (odbaci moje izmjene, učitaj trenutni config)</button>
          </div>
        </div>
      )}

      {/* Navigacija */}
      <div className="wiz-nav">
        <button className="secondary" disabled={step === 0} onClick={() => goToStep(step - 1)}>← Nazad</button>
        <span style={{ color: "#5a6b7d", fontSize: 13 }}>Korak {step + 1} / {stepNames.length}</span>
        <button className="secondary" disabled={step === stepNames.length - 1} onClick={() => goToStep(step + 1)}>Naprijed →</button>
      </div>
    </div>
  );
}
