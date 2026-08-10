import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./styles.css"; // Paleta boja škole (CONSTITUTION.md P-4) + layout mreža + wizard ekrani.
import Wizard from "./Wizard.jsx";

// URL backenda (FastAPI). Postavi u .env kao VITE_API_URL.
const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ── Jedna mreža 7×5 za jednu grupu (nastavnik ILI razred) ──────────────
function Grid({ title, cells, config, mode }) {
  // cells: mapa "day|period" -> lekcija
  const days = config.days;
  const periods = config.periods;
  const times = config.period_times || {};
  return (
    <div className="block">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th style={{ width: 120 }}>Čas</th>
            {days.map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p}>
              <td className="time">
                {p}. <br />
                <span style={{ fontWeight: "normal", fontSize: 11 }}>{times[String(p)] || ""}</span>
              </td>
              {days.map((d) => {
                const L = cells[`${d}|${p}`];
                const isNach = L && L.subj === "Nacharbeit";
                const isRes = L && String(L.teacher).startsWith("REZERVISANO");
                return (
                  <td key={d} className={isRes ? "reserved" : isNach ? "nach" : ""}>
                    {L ? (
                      <>
                        <div className="sub">
                          {L.subj}
                          {L.grade != null && mode === "teacher" ? ` ${L.grade}` : ""}
                        </div>
                        <div className="who">
                          {mode === "class" ? String(L.teacher).split(" ")[0] : ""}
                        </div>
                      </>
                    ) : (
                      ""
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  // SPRINT 02: config se gradi iz wizarda, ne iz fiksnog primjera.
  // Početno stanje = prazno (Wizard.jsx emptyWizard → buildConfig).
  // Wizard poziva onConfig(next) pri svakoj izmjeni.
  const [config, setConfig] = useState(() => {
    // inicijalno prazno config odgovarajuće strukture (days/periods default)
    return {
      days: ["Mo", "Di", "Mi", "Do", "Fr"],
      periods: [1, 2, 3, 4, 5, 6, 7],
      period_times: { 1: "08:00–08:45", 2: "09:05–09:50", 3: "10:10–10:55", 4: "11:15–12:00", 5: "13:00–13:45", 6: "13:50–14:35", 7: "14:40–15:25" },
      morning_periods: [1, 2, 3, 4],
      nach_periods: [6, 7],
      grades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      morning_core_subjects: [],
      block_subjects: {},
      homeroom: {},
      homeroom_daily_grades: [],
      light_subjects: [],
      objective_weights: { compactness: 1, balance: 2, light_late: 1, gap: 3 },
      teachers_fixed: [],
      teacher_constraints: {},
      lessons: [],
    };
  });
  const [lessons, setLessons] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("class"); // "class" | "teacher"
  const [apiError, setApiError] = useState("");

  // SPRINT 02: provjera izvodivosti (Faza 3) — drži rezultat, zove /feasibility.
  const [feasibility, setFeasibility] = useState(null);
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);

  // Provjera izvodivosti kad se config promijeni (debounce 400ms).
  useEffect(() => {
    if (!config || !config.grades || !config.grades.length) return;
    setFeasibilityLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/feasibility`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        });
        const data = await res.json();
        setFeasibility(data);
      } catch (e) {
        setFeasibility({ ok: false, problems: ["Ne mogu se povezati s backendom za provjeru izvodivosti."] });
      } finally {
        setFeasibilityLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [config]);

  const canGenerate = feasibility?.ok === true && !loading;

  async function generate() {
    setLoading(true);
    setApiError("");
    setErrors([]);
    try {
      const res = await fetch(`${API}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, time_limit_s: 45 }),
      });
      const data = await res.json();
      setLessons(data.lessons || []);
      setErrors(data.errors || []);
    } catch (e) {
      setApiError(`Ne mogu se povezati s backendom (${API}). Je li pokrenut? (${e})`);
    } finally {
      setLoading(false);
    }
  }

  async function exportFile(kind) {
    const res = await fetch(`${API}/export/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, lessons }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = kind === "excel" ? "raspored.xlsx" : "izvjestaj.docx";
    a.click();
    URL.revokeObjectURL(url);
  }

  // grupiši lekcije po nastavniku ili razredu -> {grupa: {"day|period": lekcija}}
  const groups = useMemo(() => {
    const key = view === "teacher" ? "teacher" : "grade";
    const g = {};
    for (const L of lessons) {
      const gk = L[key];
      (g[gk] = g[gk] || {})[`${L.day}|${L.period}`] = L;
    }
    return g;
  }, [lessons, view]);

  const groupOrder =
    view === "teacher"
      ? Object.keys(groups).sort()
      : config.grades.filter((x) => groups[x]);

  return (
    <>
      <header>
        <h1>IDSS — Raspored časova</h1>
        <small>Sprint 02 · Wizard za unos config-a · USTAV Faze 0–3</small>
      </header>
      <main>
        {/* ── SPRINT 02: Wizard (gore) ── */}
        <Wizard
          config={config}
          onConfig={setConfig}
          feasibility={feasibility}
          feasibilityLoading={feasibilityLoading}
        />

        {/* ── Prikaz + akcije (kao Sprint 01, ali config iz wizarda) ── */}
        <div className="controls" style={{ marginTop: 28 }}>
          <button onClick={generate} disabled={!canGenerate} title={canGenerate ? "" : "Provjera izvodivosti nije prošla — popuni config"}>
            {loading ? "Računam…" : "Generiši raspored"}
          </button>
          <button
            className="secondary"
            onClick={() => setView(view === "class" ? "teacher" : "class")}
          >
            Prikaz: {view === "class" ? "po razredu" : "po nastavniku"} (klikni za drugo)
          </button>
          {lessons.length > 0 && (
            <>
              <button className="secondary" onClick={() => exportFile("excel")}>
                Izvezi Excel
              </button>
              <button className="secondary" onClick={() => exportFile("report")}>
                Izvezi izvještaj
              </button>
            </>
          )}
        </div>

        {apiError && <div className="err">{apiError}</div>}
        {errors.length > 0 && (
          <div className="err">
            <b>Validacija nije čista ({errors.length}):</b>
            <ul>
              {errors.slice(0, 12).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {groupOrder.map((gk) => (
          <Grid
            key={gk}
            title={view === "teacher" ? gk : `${gk}. razred`}
            cells={groups[gk]}
            config={config}
            mode={view}
          />
        ))}
      </main>
    </>
  );
}
