import React, { useMemo, useState, useEffect, useCallback } from "react";
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import "./styles.css"; // Paleta boja škole (CONSTITUTION.md P-4) + layout mreža + wizard ekrani.
import Wizard from "./Wizard.jsx";

// URL backenda (FastAPI). Postavi u .env kao VITE_API_URL.
const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

// SPRINT 09: lozinka se više NE ugrađuje u JS pri build-u (VITE_BACKEND_
// PASSWORD, uklonjeno — bilo je vidljivo u bundle-u svakom ko otvori dev
// tools). Umjesto toga, korisnik je unosi u naš neumorfni login ekran
// (vidi LoginScreen niže), ona se čuva SAMO u sessionStorage (briše se kad
// se tab zatvori) i koristi za sve pozive backendu. Backend Basic Auth
// (main.py, require_auth) ostaje ISTA stvarna sigurnosna granica — ovo
// mijenja samo KAKO se lozinka traži od korisnika. Username je kozmetički
// (backend ga ne provjerava), zato se nikad ne šalje.
const SESSION_KEY = "idss_pwd";
function authHeader(password) {
  return password ? { Authorization: "Basic " + btoa(":" + password) } : {};
}

// ── SPRINT 07: jedna ćelija mreže, i dalje "draggable" I "droppable"
// istovremeno (isti fizički termin je i moguć izvor i moguć cilj
// prevlačenja) — @dnd-kit/core zahtijeva da se dvije odvojene hook-ref
// funkcije spoje u jedan ref callback, standardan obrazac biblioteke.
// id oblik: "{grade}::{day}::{period}" — jedinstven kroz SVE razrede
// (jedan zajednički DndContext obuhvata sve mreže odjednom).
function DraggableCell({ id, canDrag, canDrop, className, title, children }) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id, disabled: !canDrag });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id, disabled: !canDrop });
  const setRefs = useCallback((node) => { setDragRef(node); setDropRef(node); }, [setDragRef, setDropRef]);
  const style = {};
  if (transform) style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  if (isDragging) style.zIndex = 50;
  const classes = [className, isDragging ? "dragging" : "", isOver && canDrop ? "drag-target" : ""].filter(Boolean).join(" ");
  return (
    <td
      ref={setRefs}
      className={classes}
      style={style}
      title={title}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
    >
      {children}
    </td>
  );
}

// ── Jedna mreža 7×5 za jednu grupu (nastavnik ILI razred) ──────────────
// U prikazu "po razredu" (mode==="class"), časovi se mogu prevući
// (@dnd-kit — miš I dodir, SPRINT 07) u drugi termin ISTOG razreda. Blok/
// fiksni časovi se NE prevlače (isto pravilo kao solver — P-2, honorarni/
// fiksni se ne pomjeraju), ali OSTAJU važeći cilj (droppable) — isto kao
// ranije, backend/validate-move ih odbija sa jasnom porukom.
// grade: potreban za id ćelija (samo u "po razredu" prikazu).
// disableDrag: true dok BILO KOJI drag-and-drop poziv već traje (bilo gdje u
// aplikaciji) — sprečava pokretanje drugog prevlačenja prije nego prvi
// završi (isti princip kao disabled dugme, primijenjen na drag gestove).
// Vizuelna povratna informacija za "traje" ide kroz jedinstveni
// LoadingOverlay, ne kroz ovu komponentu.
function Grid({ title, cells, config, mode, grade, dndEnabled, disableDrag }) {
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
                const isFixedOrBlock = L && (L.kind === "block" || L.kind === "fixed");
                const canDrag = dndEnabled && !disableDrag && !!L && !isFixedOrBlock;
                const canDrop = dndEnabled && !disableDrag && !!L;
                const classes = [isRes ? "reserved" : isNach ? "nach" : "", canDrag ? "draggable" : ""]
                  .filter(Boolean).join(" ");
                const cellTitle = canDrag
                  ? "Prevuci u drugi termin istog razreda"
                  : isFixedOrBlock ? "Blok/fiksni čas se ne može ručno pomjerati" : undefined;
                const content = L ? (
                  <>
                    <div className="sub">
                      {L.subj}
                      {L.grade != null && mode === "teacher" ? ` ${L.grade}` : ""}
                    </div>
                    <div className="who">
                      {mode === "class" ? String(L.teacher).split(" ")[0] : ""}
                    </div>
                  </>
                ) : "";

                if (!dndEnabled) {
                  return <td key={d} className={classes} title={cellTitle}>{content}</td>;
                }
                return (
                  <DraggableCell
                    key={d}
                    id={`${grade}::${d}::${p}`}
                    canDrag={canDrag}
                    canDrop={canDrop}
                    className={classes}
                    title={cellTitle}
                  >
                    {content}
                  </DraggableCell>
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

// ── SPRINT 09: neumorfni login ekran ────────────────────────────────────
// Zamjenjuje native browser Basic Auth prozorčić (Vercel Edge Middleware,
// uklonjen ovim sprintom — vidi DECISION_LOG.md). Korisničko ime je
// kozmetičko (ne provjerava se, ne šalje se nikuda — vidi napomenu uz
// authHeader iznad); samo lozinka ide u /verify-auth poziv. Greška
// (netačna lozinka / veza nije uspjela) prikazuje se kroz POSTOJEĆI
// VerdictModal (isti stil kao odbijena izmjena rasporeda), ne poseban
// ekran — pozива ga App, LoginScreen samo prikuplja unos.
function LoginScreen({ onLogin, loading }) {
  const [username, setUsername] = useState("");
  const [pwd, setPwd] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!pwd || loading) return;
    onLogin(pwd);
  }

  return (
    <div className="login-backdrop">
      <form className="login-card neu-raised" onSubmit={submit}>
        <div className="login-logo-wrap">
          <img className="login-logo" src="https://idss.edu.ba/wp-content/uploads/2024/03/logo_white.png" alt="IDSS logo" />
        </div>
        <h2>Raspored časova za IDSS</h2>
        <p className="hint">Unesi lozinku da nastaviš.</p>
        <label className="login-field">
          Korisničko ime
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="login-field">
          Lozinka
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
        </label>
        <button type="submit" disabled={!pwd || loading}>
          {loading ? "Provjeravam…" : "Prijavi se"}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  // ── SPRINT 09: login stanje ─────────────────────────────────────────
  // password: učitava se iz sessionStorage pri prvom mount-u (prazan string
  // ako ništa nije sačuvano — tad se odmah prikazuje login ekran).
  // authChecking: dok se SAČUVANA lozinka (ako postoji) tiho provjerava
  // protiv backenda prije nego se bilo šta prikaže — pokriva slučaj da je
  // Direktor promijenio BACKEND_PASSWORD dok je stara sesija još važeća
  // (bez ovoga bi app "tiho" pucala na prvom pravom pozivu).
  const [password, setPassword] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) || ""; } catch { return ""; }
  });
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  useEffect(() => {
    if (!password) { setAuthChecking(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/verify-auth`, { headers: authHeader(password) });
        if (res.ok) {
          setAuthed(true);
        } else {
          try { sessionStorage.removeItem(SESSION_KEY); } catch {}
          setPassword("");
        }
      } catch {
        // mrežni problem pri provjeri — fail-closed, isti duh kao backend
        // (main.py): radije prikaži login ekran nego rizikovati polovičnu
        // aplikaciju bez potvrđene lozinke.
        setAuthed(false);
      } finally {
        setAuthChecking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // samo jednom, pri učitavanju

  async function handleLogin(pwd) {
    setLoginSubmitting(true);
    try {
      const res = await fetch(`${API}/verify-auth`, { headers: authHeader(pwd) });
      if (res.ok) {
        try { sessionStorage.setItem(SESSION_KEY, pwd); } catch {}
        setPassword(pwd);
        setAuthed(true);
      } else {
        setVerdict({ kind: "error", title: "Netačna lozinka", messages: ["Provjeri lozinku i pokušaj ponovo."] });
      }
    } catch (e) {
      setVerdict({ kind: "error", title: "Veza nije uspjela", messages: [`Provjeri internet vezu i pokušaj ponovo. (${e})`] });
    } finally {
      setLoginSubmitting(false);
    }
  }

  // Svi pozivi backendu (osim /verify-auth iznad, koji nema šta da odjavi)
  // idu kroz ovo — dodaje Authorization zaglavlje, i ako backend odgovori
  // 401 (lozinka je u međuvremenu promijenjena na Railway-u, ili je sesija
  // nekako nevažeća), odjavljuje korisnika umjesto da app ostane "zaglavljena"
  // uz pogrešne/zbunjujuće poruke o grešci veze.
  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: { ...(options.headers || {}), ...authHeader(password) },
    });
    if (res.status === 401) {
      try { sessionStorage.removeItem(SESSION_KEY); } catch {}
      setPassword("");
      setAuthed(false);
    }
    return res;
  }

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
  // pendingMove: {grade, src:{day,period}, dst:{day,period}} dok /validate-move
  // poziv traje, inače null — koristi se za `disableDrag` (sprečava drugi
  // drag prije nego prvi završi) i ulazi u `anyLoading` niže.
  const [pendingMove, setPendingMove] = useState(null);
  const moving = !!pendingMove;

  // SPRINT 07: @dnd-kit senzori — miš (distance: mala udaljenost prije nego
  // prevlačenje počne, isti "osjećaj" kao ranije) i dodir (delay: mora se
  // zadržati prst ~200ms prije nego počne prevlačenje — bez ovoga bi svaki
  // pokušaj horizontalnog skrolanja mreže na dodirnom ekranu greškom
  // pokretao prevlačenje časa umjesto skrolanja, standardan obrazac
  // biblioteke za "prevlačivo unutar skrolabilnog").
  const dndSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  // dok se izvozi Excel/izvještaj, dugme koje je kliknuto je onemogućeno
  // (samo TO dugme, ne oba) — vizuelni loader ide kroz LoadingOverlay.
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);

  // provjera izvodivosti — drži rezultat, zove /feasibility u pozadini.
  const [feasibility, setFeasibility] = useState(null);
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);

  // Provjera izvodivosti kad se config promijeni (debounce 400ms).
  // SPRINT 09: ne zovi backend prije prijave (authed) — inače bi svaki
  // (i neprijavljeni) posjetilac odmah trošio jedan neuspio pokušaj iz
  // rate-limitera na prazno/pogrešno Authorization zaglavlje.
  useEffect(() => {
    if (!authed) return;
    if (!config || !config.grades || !config.grades.length) return;
    setFeasibilityLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiFetch("/feasibility", {
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
  }, [config, authed]);

  // SPRINT 04 loader popravka: ne dozvoli "Generiši" dok traje SVJEŽA provjera
  // izvodivosti (feasibilityLoading) — inače dugme može ostati klikabilno na
  // osnovu ZASTARJELOG feasibility.ok dok se nova provjera još ne zna.
  const canGenerate = feasibility?.ok === true && !loading && !feasibilityLoading;

  async function generate() {
    setLoading(true);
    try {
      const res = await apiFetch("/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await apiFetch(`/export/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // ── Ručna korekcija (drag-and-drop, @dnd-kit — miš i dodir) ─────────
  // Poziva /validate-move (tanka omotnica oko POSTOJEĆEG validators.py).
  // Ako backend kaže da je novi raspored ispravan -> prihvati ga (prikaz
  // se ažurira). Ako NIJE -> ništa se ne mijenja (čas ostaje gdje je bio,
  // jer `lessons` state nikad nije optimistički promijenjen) + prikaži
  // JASNU poruku zašto (direktno iz validate()), u verdict prozoru.
  // event.active/event.over dolaze direktno iz @dnd-kit (id oblik
  // "grade::day::period") — ne treba više posebno pratiti "izvor" kroz
  // odvojeni onDragStart, DndContext daje oboje odjednom u onDragEnd.
  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || pendingMove) return; // ispušteno van cilja, ili već traje jedan poziv
    const [srcGradeStr, srcDay, srcPeriodStr] = String(active.id).split("::");
    const [dstGradeStr, dstDay, dstPeriodStr] = String(over.id).split("::");
    const grade = Number(srcGradeStr);
    const srcPeriod = Number(srcPeriodStr);
    const dstPeriod = Number(dstPeriodStr);

    if (Number(dstGradeStr) !== grade) {
      setVerdict({ kind: "error", title: "Nije moguće", messages: ["Čas se može prevući samo unutar istog razreda."] });
      return;
    }
    if (srcDay === dstDay && srcPeriod === dstPeriod) return; // ispušteno na isto mjesto — ništa se ne dešava

    setPendingMove({ grade, src: { day: srcDay, period: srcPeriod }, dst: { day: dstDay, period: dstPeriod } });
    try {
      const res = await apiFetch("/validate-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config, lessons, grade,
          src_day: srcDay, src_period: srcPeriod,
          dst_day: dstDay, dst_period: dstPeriod,
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

  // SPRINT 09: dok se sačuvana lozinka tiho provjerava, ne prikazuj NIŠTA
  // (ni login ekran ni app) — spriječava kratak "trep" login forme za
  // korisnika koji je zapravo već prijavljen u ovom tab-u.
  if (authChecking) {
    return <LoadingOverlay active={true} />;
  }

  return (
    <>
      <LoadingOverlay active={anyLoading} />
      <VerdictModal verdict={verdict} onClose={() => setVerdict(null)} />
      {!authed ? (
        <LoginScreen onLogin={handleLogin} loading={loginSubmitting} />
      ) : (
      <>
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

        {/* Ručna korekcija — kratka uputa za prevlačenje časova. SPRINT 07:
            @dnd-kit radi na mišu I na dodiru (potvrđeno uživo pravim touch
            eventima) — jedna uputa za sve uređaje, stara "samo na računaru"
            poruka iz Sprint 06 više nije tačna, uklonjena. */}
        {!showDashboard && lessons.length > 0 && view === "class" && (
          <p className="hint" style={{ marginTop: -6 }}>
            💡 Prevuci čas u drugi termin istog razreda da ga ručno pomjeriš — ispravnost se provjerava
            automatski; ako neko pravilo bude prekršeno, čas se vraća na svoje mjesto uz objašnjenje.
          </p>
        )}

        {showDashboard ? (
          <DashboardTable lessons={lessons} days={config.days} />
        ) : (
          <DndContext sensors={dndSensors} onDragEnd={handleDragEnd}>
            {groupOrder.map((gk) => (
              <Grid
                key={gk}
                title={view === "teacher" ? gk : `${gk}. razred`}
                cells={groups[gk]}
                config={config}
                mode={view}
                grade={gk}
                dndEnabled={view === "class"}
                disableDrag={moving}
              />
            ))}
          </DndContext>
        )}
      </main>
      </>
      )}
    </>
  );
}
