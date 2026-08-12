import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./styles.css"; // Paleta boja škole (CONSTITUTION.md P-4) + layout mreža + wizard ekrani.
import Wizard from "./Wizard.jsx";

// URL backenda (FastAPI). Postavi u .env kao VITE_API_URL.
const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

// SPRINT 03 sigurnosna popravka: backend (main.py) sada zahtijeva HTTP Basic
// Auth na svakom endpointu osim /health (CORS ne štiti od direktnih poziva
// mimo browsera — vidi DECISION_LOG.md DL-003). Lozinka se ovdje ne kuca —
// dolazi iz VITE_BACKEND_PASSWORD (Vercel env var, ugrađuje se u JS pri
// build-u, isto kao VITE_API_URL). Username se ne provjerava na backendu.
const BACKEND_PASSWORD = import.meta.env.VITE_BACKEND_PASSWORD || "";
const AUTH_HEADERS = BACKEND_PASSWORD
  ? { Authorization: "Basic " + btoa(":" + BACKEND_PASSWORD) }
  : {};

// ── Jedna mreža 7×5 za jednu grupu (nastavnik ILI razred) ──────────────
// SPRINT 04: u prikazu "po razredu" (mode==="class"), časovi se mogu
// prevući (drag-and-drop) u drugi termin ISTOG razreda. Blok/fiksni časovi
// se NE prevlače (isto pravilo kao solver — P-2, honorarni/fiksni se ne
// pomjeraju). onCellDrop/onCellDragStart su undefined kad drag-and-drop
// nije aktivan (prikaz po nastavniku, ili nema generisanog rasporeda).
// disableDrag: true dok BILO KOJI drag-and-drop poziv već traje (bilo gdje u
// aplikaciji) — sprečava pokretanje drugog prevlačenja prije nego prvi završi
// (isti princip kao disabled dugme, primijenjen na drag gestove). Vizuelna
// povratna informacija za "traje" ide kroz jedinstveni LoadingOverlay, ne
// kroz ovu komponentu.
function Grid({ title, cells, config, mode, onCellDragStart, onCellDrop, disableDrag }) {
  // cells: mapa "day|period" -> lekcija
  const days = config.days;
  const periods = config.periods;
  const times = config.period_times || {};
  const [overKey, setOverKey] = useState(null); // vizuelni highlight cilja prevlačenja
  const dndOn = mode === "class" && !!onCellDrop;
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
                const isFixedOrBlock = L && (L.kind === "block" || L.kind === "fixed");
                const key = `${d}|${p}`;
                const canDrag = dndOn && !disableDrag && L && !isFixedOrBlock;
                const classes = [
                  isRes ? "reserved" : isNach ? "nach" : "",
                  canDrag ? "draggable" : "",
                  dndOn && overKey === key ? "drag-target" : "",
                ].filter(Boolean).join(" ");
                return (
                  <td
                    key={d}
                    className={classes}
                    draggable={canDrag}
                    title={
                      canDrag ? "Prevuci u drugi termin istog razreda"
                      : isFixedOrBlock ? "Blok/fiksni čas se ne može ručno pomjerati"
                      : undefined
                    }
                    onDragStart={canDrag ? () => onCellDragStart(d, p) : undefined}
                    onDragOver={dndOn && !disableDrag ? (e) => { e.preventDefault(); setOverKey(key); } : undefined}
                    onDragLeave={dndOn ? () => setOverKey((k) => (k === key ? null : k)) : undefined}
                    onDrop={
                      dndOn && !disableDrag
                        ? (e) => { e.preventDefault(); setOverKey(null); onCellDrop(d, p); }
                        : undefined
                    }
                  >
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

// ── Dashboard opterećenja: časova/sedmično + najveća dnevna rupa po nastavniku ──
// Rupa = ista definicija kao u solver.py (_polish_gaps.gap_penalty):
// (max period - min period + 1) - broj časova tog dana, za dane kad nastavnik
// uopšte predaje. Uzima se NAJVEĆA takva vrijednost preko svih dana (sedmice).
// REZERVISANO nije stvarna osoba — izostavljeno iz dashboarda.
// SPRINT 05: traka opterećenja (--navy, dužina ∝ časovi) + najopterećeniji
// red istaknut tankom --yellow linijom (info, ne greška).
function DashboardTable({ lessons, days }) {
  const rows = useMemo(() => {
    const byTeacher = {};
    for (const L of lessons) {
      const name = String(L.teacher);
      if (name.startsWith("REZERVISANO")) continue;
      (byTeacher[name] = byTeacher[name] || []).push(L);
    }
    const out = Object.entries(byTeacher).map(([name, ls]) => {
      const hours = ls.length;
      const byDay = {};
      for (const L of ls) (byDay[L.day] = byDay[L.day] || []).push(L.period);
      let maxGap = 0;
      for (const d of days) {
        const ps = byDay[d];
        if (!ps || !ps.length) continue;
        const span = Math.max(...ps) - Math.min(...ps) + 1;
        const gap = span - ps.length;
        if (gap > maxGap) maxGap = gap;
      }
      return { name, hours, maxGap };
    });
    out.sort((a, b) => b.hours - a.hours);
    return out;
  }, [lessons, days]);
  const maxHours = rows.length ? rows[0].hours : 0;

  function exportCsv() {
    const header = "Nastavnik,Casova sedmicno,Najveca dnevna rupa\n";
    const body = rows.map((r) => `"${r.name.replace(/"/g, '""')}",${r.hours},${r.maxGap}`).join("\n");
    // BOM na početku — da Excel ispravno prikaže dijakritike (č,ć,š,ž,đ) u UTF-8 CSV-u.
    const blob = new Blob(["﻿" + header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dashboard_opterecenje.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="block">
      <h3>📊 Dashboard opterećenja — časova sedmično i najveća dnevna rupa</h3>
      <div style={{ padding: "10px 14px", background: "#fff" }}>
        <button className="secondary" onClick={exportCsv} disabled={!rows.length}>
          ⬇️ Izvezi CSV
        </button>
        <table className="wiz-table dash-table" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>Nastavnik</th>
              <th>Časova sedmično</th>
              <th>Opterećenje</th>
              <th>Najveća dnevna rupa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className={i === 0 ? "top-loaded" : ""} title={i === 0 ? "Najveći sedmični broj časova" : undefined}>
                <td>{r.name}</td>
                <td>{r.hours}</td>
                <td>
                  <div className="dash-bar-track">
                    <div className="dash-bar-fill" style={{ width: `${maxHours ? (r.hours / maxHours) * 100 : 0}%` }} />
                  </div>
                </td>
                <td className={r.maxGap >= 3 ? "hot" : ""}>{r.maxGap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Jedinstveni loader: JEDAN overlay preko cijelog ekrana, umjesto
// razbacanih indikatora po dugmadima/ćelijama. Prikazuje se kad je BILO
// KOJI pozadinski poziv backendu u toku (vidi `anyLoading` u App). Dugmad i
// dalje ostaju `disabled` (to je zadržano) — ovo je SAMO vizuelni dio.
function LoadingOverlay({ active }) {
  if (!active) return null;
  return (
    <div className="loading-overlay-backdrop" role="status" aria-live="polite" aria-label="Učitavam…">
      <div className="loader" />
    </div>
  );
}

// ── Verdict prozor (SPRINT 05, signature element) ──────────────────────
// Prikazuje se nakon SVAKE odluke backenda: prihvaćena/odbijena izmjena
// rasporeda (drag-and-drop) i uspješan/neuspješan Generiši. Uspjeh nestaje
// sam nakon ~4s; greška ostaje dok je korisnik sam ne zatvori (klik izvan
// kartice ili na ✕) — greška se ne smije sama izgubiti.
// verdict: null | { kind: "success"|"error", title, messages?: string[] }
function VerdictModal({ verdict, onClose }) {
  useEffect(() => {
    if (verdict?.kind === "success") {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [verdict, onClose]);

  if (!verdict) return null;
  const isSuccess = verdict.kind === "success";
  return (
    <div className="verdict-backdrop" onClick={onClose}>
      <div
        className={`verdict-card neu-raised ${isSuccess ? "verdict-success" : "verdict-error"}`}
        role="alertdialog"
        aria-live="assertive"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="verdict-close" onClick={onClose} aria-label="Zatvori">✕</button>
        <div className="verdict-icon">{isSuccess ? "✓" : "⊘"}</div>
        <h3>{verdict.title}</h3>
        {verdict.sub && <p className="verdict-sub">{verdict.sub}</p>}
        {verdict.messages && verdict.messages.length > 0 && (
          <ul className="verdict-list">
            {verdict.messages.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        )}
      </div>
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
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("class"); // "class" | "teacher"
  const [exportError, setExportError] = useState(""); // samo izvoz Excel/izvještaj — ostalo ide kroz verdict
  const [showDashboard, setShowDashboard] = useState(false);

  // SPRINT 05: verdict prozor — rezultat SVAKE odluke backenda (Generiši,
  // ručno pomjeranje). Vidi VerdictModal.
  const [verdict, setVerdict] = useState(null);

  // ručna korekcija drag-and-drop (samo prikaz "po razredu").
  // dragSrc: {grade, day, period} — čas koji se trenutno prevlači, ili null.
  const [dragSrc, setDragSrc] = useState(null);
  // pendingMove: {grade, src:{day,period}, dst:{day,period}} dok /validate-move
  // poziv traje, inače null — koristi se za `disableDrag` (sprečava drugi
  // drag prije nego prvi završi) i ulazi u `anyLoading` niže.
  const [pendingMove, setPendingMove] = useState(null);
  const moving = !!pendingMove;

  // dok se izvozi Excel/izvještaj, dugme koje je kliknuto je onemogućeno
  // (samo TO dugme, ne oba) — vizuelni loader ide kroz LoadingOverlay.
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);

  // provjera izvodivosti — drži rezultat, zove /feasibility u pozadini.
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
          headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
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

  // SPRINT 04 loader popravka: ne dozvoli "Generiši" dok traje SVJEŽA provjera
  // izvodivosti (feasibilityLoading) — inače dugme može ostati klikabilno na
  // osnovu ZASTARJELOG feasibility.ok dok se nova provjera još ne zna.
  const canGenerate = feasibility?.ok === true && !loading && !feasibilityLoading;

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
        body: JSON.stringify({ config, time_limit_s: 45 }),
      });
      const data = await res.json();
      setLessons(data.lessons || []);
      if (data.ok) {
        setVerdict({ kind: "success", title: "Raspored je generisan", sub: "Svi časovi su uspješno raspoređeni." });
      } else {
        setVerdict({
          kind: "error",
          title: "Raspored nije moguć",
          messages: data.errors && data.errors.length ? data.errors : ["Rješavač nije uspio pronaći ispravan raspored."],
        });
      }
    } catch (e) {
      setVerdict({ kind: "error", title: "Veza nije uspjela", messages: [`Provjeri internet vezu i pokušaj ponovo. (${e})`] });
    } finally {
      setLoading(false);
    }
  }

  async function exportFile(kind) {
    const setBusy = kind === "excel" ? setExportingExcel : setExportingReport;
    setBusy(true);
    setExportError("");
    try {
      const res = await fetch(`${API}/export/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
        body: JSON.stringify({ config, lessons }),
      });
      if (!res.ok) {
        setExportError(`Izvoz nije uspio (greška ${res.status}).`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "excel" ? "raspored.xlsx" : "izvjestaj.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(`Izvoz nije uspio — provjeri internet vezu. (${e})`);
    } finally {
      setBusy(false);
    }
  }

  // ── SPRINT 04: ručna korekcija (drag-and-drop) ──────────────────────
  // Poziva /validate-move (tanka omotnica oko POSTOJEĆEG validators.py).
  // Ako backend kaže da je novi raspored ispravan -> prihvati ga (prikaz
  // se ažurira). Ako NIJE -> ništa se ne mijenja (čas ostaje gdje je bio,
  // jer `lessons` state nikad nije optimistički promijenjen) + prikaži
  // JASNU poruku zašto (direktno iz validate()).
  async function handleDrop(grade, day, period) {
    if (pendingMove) return; // već traje jedan poziv — ignoriši dok ne završi (isto kao disabled dugme)
    const src = dragSrc;
    setDragSrc(null);
    if (!src) return;
    if (src.grade !== grade) {
      setVerdict({ kind: "error", title: "Nije moguće", messages: ["Čas se može prevući samo unutar istog razreda."] });
      return;
    }
    if (src.day === day && src.period === period) return; // ispušteno na isto mjesto — ništa se ne dešava

    setPendingMove({ grade, src, dst: { day, period } });
    try {
      const res = await fetch(`${API}/validate-move`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
        body: JSON.stringify({
          config, lessons, grade,
          src_day: src.day, src_period: src.period,
          dst_day: day, dst_period: period,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setLessons(data.lessons);
        setVerdict({ kind: "success", title: "Promjena prihvaćena" });
      } else {
        const msgs = (data.errors && data.errors.length) ? data.errors : [data.detail || "Nepoznata greška."];
        setVerdict({ kind: "error", title: "Nije moguće", sub: "Čas je vraćen na svoje mjesto.", messages: msgs });
      }
    } catch (e) {
      setVerdict({
        kind: "error",
        title: "Veza nije uspjela",
        sub: "Čas je vraćen na svoje mjesto.",
        messages: [`Provjeri internet vezu i pokušaj ponovo. (${e})`],
      });
    } finally {
      setPendingMove(null);
    }
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

  // Jedinstveni loader: aktivan kad BILO KOJI pozadinski poziv backendu traje
  // — Generiši, /validate-move (drag-and-drop), izvoz Excel/izvještaj, ili
  // automatska provjera izvodivosti (uključujući onu pokrenutu iz "Napredno"
  // ekrana — Primijeni ne zove backend direktno, ali mijenja config, što
  // pokreće feasibilityLoading isto kao svaka druga izmjena).
  const anyLoading = loading || moving || exportingExcel || exportingReport || feasibilityLoading;

  return (
    <>
      <LoadingOverlay active={anyLoading} />
      <VerdictModal verdict={verdict} onClose={() => setVerdict(null)} />
      <header className="app-header">
        <div className="app-header-inner">
          <img className="app-logo" src="https://idss.edu.ba/wp-content/uploads/2024/03/logo_white.png" alt="IDSS logo" />
          <h1 className="app-title">Raspored časova za IDSS</h1>
        </div>
      </header>
      <main>
        {/* ── Wizard (gore) ── */}
        <Wizard
          config={config}
          onConfig={setConfig}
          feasibility={feasibility}
          feasibilityLoading={feasibilityLoading}
        />

        {/* ── Prikaz + akcije (kao Sprint 01, ali config iz wizarda) ── */}
        <div className="controls" style={{ marginTop: 28 }}>
          <button
            onClick={generate}
            disabled={!canGenerate}
            title={canGenerate || anyLoading ? "" : "Provjera izvodivosti nije prošla — popuni config"}
          >
            Generiši raspored
          </button>
          <button
            className="secondary"
            onClick={() => setView(view === "class" ? "teacher" : "class")}
          >
            Prikaz: {view === "class" ? "po razredu" : "po nastavniku"} (klikni za drugo)
          </button>
          {lessons.length > 0 && (
            <>
              <button className="secondary" onClick={() => exportFile("excel")} disabled={exportingExcel}>
                Izvezi Excel
              </button>
              <button className="secondary" onClick={() => exportFile("report")} disabled={exportingReport}>
                Izvezi izvještaj
              </button>
              <button className="secondary" onClick={() => setShowDashboard((v) => !v)}>
                {showDashboard ? "◀ Nazad na raspored" : "📊 Dashboard opterećenja"}
              </button>
            </>
          )}
        </div>

        {exportError && <div className="err">{exportError}</div>}

        {/* Ručna korekcija — kratka uputa za prevlačenje časova */}
        {!showDashboard && lessons.length > 0 && view === "class" && (
          <p className="hint" style={{ marginTop: -6 }}>
            💡 Prevuci čas u drugi termin istog razreda da ga ručno pomjeriš — ispravnost se provjerava
            automatski; ako neko pravilo bude prekršeno, čas se vraća na svoje mjesto uz objašnjenje.
          </p>
        )}

        {showDashboard ? (
          <DashboardTable lessons={lessons} days={config.days} />
        ) : (
          groupOrder.map((gk) => (
            <Grid
              key={gk}
              title={view === "teacher" ? gk : `${gk}. razred`}
              cells={groups[gk]}
              config={config}
              mode={view}
              onCellDragStart={view === "class" ? (d, p) => setDragSrc({ grade: gk, day: d, period: p }) : undefined}
              onCellDrop={view === "class" ? (d, p) => handleDrop(gk, d, p) : undefined}
              disableDrag={moving}
            />
          ))
        )}
      </main>
    </>
  );
}
