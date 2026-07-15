import { useState, useMemo, useEffect } from "react";
import { createSprint } from "./constants.js";
import { countWorkingDays, countWorkingDaysInWindow, parseLocalDate, toISO, generateSprintPeriods, quarterEndFrom, addDaysISO } from "./utils.js";
import { computeSprintResult, computeQuarterlySummary } from "./scoring.js";
import { useConfig } from "./configStore.jsx";
import { QuarterConfig } from "./components/QuarterConfig.jsx";
import { SprintCard } from "./components/SprintCard.jsx";
import { CorrelationChart } from "./components/CorrelationChart.jsx";
import { QuarterlySummary } from "./components/QuarterlySummary.jsx";
import { SettingsPanel } from "./components/SettingsPanel.jsx";
import { Framework } from "./components/Framework.jsx";
import { APP_VERSION } from "./version.js";
import "./App.css";

const THEME_OPTIONS = [
  { id: "light", label: "Light", glyph: "L" },
  { id: "system", label: "System", glyph: "S" },
  { id: "dark", label: "Dark", glyph: "D" },
];

function useTheme() {
  const [mode, setMode] = useState(() => localStorage.getItem("theme") || "light");
  const [resolved, setResolved] = useState(() => {
    const m = localStorage.getItem("theme") || "light";
    return m === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : m;
  });

  useEffect(() => {
    localStorage.setItem("theme", mode);
    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => {
        const t = mq.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", t);
        setResolved(t);
      };
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }

    document.documentElement.setAttribute("data-theme", mode);
    setResolved(mode);
  }, [mode]);

  return { mode, resolved, setMode };
}

function ThemeToggle({ theme }) {
  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {THEME_OPTIONS.map(option => (
        <button
          key={option.id}
          className={`theme-toggle__btn${theme.mode === option.id ? " theme-toggle__btn--active" : ""}`}
          aria-label={`${option.label} theme`}
          aria-pressed={theme.mode === option.id}
          title={`${option.label} theme`}
          onClick={() => theme.setMode(option.id)}
        >
          {option.glyph}
        </button>
      ))}
    </div>
  );
}

function KpiCard({ label, value, detail, tone = "default" }) {
  return (
    <div className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">{value}</div>
      <div className="kpi-card__detail">{detail}</div>
    </div>
  );
}

const REPORT_FIELDS = [
  { key: "devName", label: "Developer full name", type: "text", placeholder: "e.g. Jordan Rivera" },
  { key: "empId", label: "Employee ID", type: "text", placeholder: "e.g. PT-1042" },
  { key: "quarterLabel", label: "Quarter", type: "text", placeholder: "e.g. Q2 FY2026-27" },
  { key: "doj", label: "Date of joining", type: "date", placeholder: "" },
];

function ReportDetails({ meta, onChange }) {
  return (
    <section className="card report-details" aria-label="Report details">
      <div className="report-details__head">
        <div>
          <div className="eyebrow">Report Details</div>
          <h2>Developer &amp; quarter (optional)</h2>
        </div>
        <span className="report-details__hint">Included in the PDF report header</span>
      </div>
      <div className="report-details__grid">
        {REPORT_FIELDS.map(f => (
          <div key={f.key} className="report-details__field">
            <label className="label" htmlFor={`rd-${f.key}`}>{f.label}</label>
            <input
              id={`rd-${f.key}`}
              type={f.type}
              value={meta[f.key]}
              placeholder={f.placeholder}
              className="input"
              onChange={e => onChange({ ...meta, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

const SPRINT_LENGTH_DAYS = 14;

// A sprint the user hasn't touched — safe to replace with auto-generated drafts.
// Also treats a renamed sprint or a changed code-quality grade as "touched" so
// auto-generation never silently discards those (the initial sprint ships as
// name "Sprint 1" / grade "Satisfactory", which still count as untouched).
function isPristineSprint(s) {
  return !s.locked
    && (!s.name || s.name === "Sprint 1")
    && s.codeQuality === "Satisfactory"
    && !s.startDate && !s.endDate
    && !s.completedHours && !s.collaborationHours
    && !s.assignedTickets && !s.closedTickets
    && !s.reopenedTickets && !s.doneTickets;
}

export default function DevEvaluationCalculator() {
  const theme = useTheme();
  const { config, setHolidays } = useConfig();
  const holidays = config.holidays || [];
  const [quarterStart, setQuarterStart] = useState("");
  const [quarterEnd, setQuarterEnd] = useState("");
  const [endEdited, setEndEdited] = useState(false); // true once the user manually sets the end date
  const [quarterLocked, setQuarterLocked] = useState(false);
  const [quarterBase, setQuarterBase] = useState(90);
  const [dailyCapacity, setDailyCapacity] = useState(7);
  const [sprints, setSprints] = useState([createSprint({ name: "Sprint 1" })]);
  const [reportMeta, setReportMeta] = useState({ devName: "", empId: "", quarterLabel: "", doj: "" });
  const [view, setView] = useState("workspace"); // "workspace" | "framework"
  const [toast, setToast] = useState(null); // { type: "success" | "error", message }

  const totalWorkingDays = useMemo(() => countWorkingDays(quarterStart, quarterEnd, holidays), [quarterStart, quarterEnd, holidays]);
  const dailyRate = totalWorkingDays > 0 ? quarterBase / totalWorkingDays : 0;

  // Entering the period start auto-suggests the end (a quarter later) until the
  // user edits the end themselves; always editable before the period is locked.
  const handleQuarterStartChange = (v) => {
    setQuarterStart(v);
    if (!endEdited && v) setQuarterEnd(quarterEndFrom(v));
  };
  const handleQuarterEndChange = (v) => {
    setQuarterEnd(v);
    setEndEdited(Boolean(v)); // clearing the end re-enables auto-fill from start
  };

  const updateSprint = (i, f, v) => setSprints(p => p.map((s, j) => j === i ? { ...s, [f]: v } : s));
  const addSprint = () => {
    // New sprint begins on the previous sprint's end date (shared boundary).
    const lastSprint = sprints[sprints.length - 1];
    const nextStart = lastSprint.endDate || "";
    setSprints(p => [...p, createSprint({ name: `Sprint ${p.length + 1}`, startDate: nextStart })]);
  };
  const removeSprint = (i) => setSprints(p => p.filter((_, j) => j !== i));

  const sprintsWithWD = useMemo(() => {
    return sprints.map((s, i) => {
      if (s.locked) return s;
      // Unlocked sprints derive day counts purely from their dates + holidays —
      // never fall back to stale frozen values left over from a prior lock.
      // Shared boundary: when a sprint starts on the previous sprint's end date,
      // that shared day is counted in the EARLIER sprint only, so per-sprint
      // counts tile the quarter exactly (summed base stays within the quarter base).
      const prevEnd = i > 0 ? sprints[i - 1].endDate : "";
      const sharesStartBoundary = Boolean(s.startDate && prevEnd && s.startDate === prevEnd);
      const countStart = sharesStartBoundary ? addDaysISO(s.startDate, 1) : s.startDate;

      const wdTotal = countWorkingDays(countStart, s.endDate, holidays);
      const wdInQuarter = countWorkingDaysInWindow(countStart, s.endDate, quarterStart, quarterEnd, holidays);
      return {
        ...s,
        sharesStartBoundary,
        workingDays: wdTotal > 0 ? wdTotal.toString() : "",
        workingDaysTotal: wdTotal > 0 ? wdTotal.toString() : "",
        workingDaysInQuarter: wdInQuarter.toString(),
      };
    });
  }, [sprints, quarterStart, quarterEnd, holidays]);

  const toggleLock = (i) => {
    const sprintForResult = sprintsWithWD[i];
    setSprints(p => p.map((s, j) => {
      if (j !== i) return s;
      if (s.locked) return { ...s, locked: false, lockedResult: null, workingDays: "", workingDaysTotal: "", workingDaysInQuarter: "" };

      const lockedResult = computeSprintResult(sprintForResult, dailyRate, dailyCapacity, config);
      return {
        ...s,
        workingDays: sprintForResult.workingDays,
        workingDaysTotal: sprintForResult.workingDaysTotal,
        workingDaysInQuarter: sprintForResult.workingDaysInQuarter,
        locked: true,
        draft: false,
        lockedResult,
      };
    }));
  };

  const handleQuarterLock = () => {
    if (quarterLocked) {          // unlock — leave sprints untouched
      setQuarterLocked(false);
      return;
    }
    if (!quarterStart || !quarterEnd) return;
    if (parseLocalDate(quarterStart) > parseLocalDate(quarterEnd)) {
      setToast({ type: "error", message: "Quarter start date is after the end date." });
      return;
    }
    // On first lock, scaffold the period into 14-day draft sprints — but only when
    // the sprint list is untouched, so we never clobber work the user already entered.
    if (sprints.every(isPristineSprint)) {
      const periods = generateSprintPeriods(quarterStart, quarterEnd, SPRINT_LENGTH_DAYS);
      if (periods.length > 0) {
        setSprints(periods.map(p => createSprint({ ...p, draft: true })));
        setToast({
          type: "success",
          message: `Locked. Generated ${periods.length} draft sprint${periods.length > 1 ? "s" : ""} (${SPRINT_LENGTH_DAYS}-day) — edit or remove any before locking each.`,
        });
      }
    }
    setQuarterLocked(true);
  };

  const lastSprintExceedsQuarter = useMemo(() => {
    if (!quarterLocked || !quarterEnd || sprints.length === 0) return false;
    const lastEnd = sprints[sprints.length - 1].endDate;
    if (!lastEnd) return false;
    return new Date(lastEnd) > new Date(quarterEnd);
  }, [sprints, quarterEnd, quarterLocked]);

  const sprintResults = useMemo(() => {
    return sprintsWithWD.map((s, index) => (
      sprints[index]?.locked && sprints[index].lockedResult
        ? sprints[index].lockedResult
        : computeSprintResult(s, dailyRate, dailyCapacity, config)
    ));
  }, [sprints, sprintsWithWD, dailyRate, dailyCapacity, config]);

  const qSummary = useMemo(() => {
    return computeQuarterlySummary(sprintResults, totalWorkingDays, dailyRate);
  }, [sprintResults, totalWorkingDays, dailyRate]);

  const lockedCount = useMemo(() => sprints.filter(s => s.locked).length, [sprints]);

  const canExport = Boolean(quarterStart && quarterEnd && totalWorkingDays > 0
    && sprintResults.some(r => r.wdTotal > 0));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!canExport) {
      setToast({ type: "error", message: "Add quarter dates and at least one sprint with productive days before exporting." });
      return;
    }
    setExporting(true);
    try {
      // Lazy-loaded so the ~500 KB PDF stack stays out of the initial bundle.
      const { generateQuarterlyReportPDF } = await import("./pdfReport.js");
      generateQuarterlyReportPDF({
        quarterStart, quarterEnd, quarterBase, dailyCapacity, holidays,
        totalWorkingDays, dailyRate, config, sprints, sprintResults, summary: qSummary,
        reportMeta,
      });
      setToast({ type: "success", message: "PDF report generated." });
    } catch (err) {
      console.error("PDF export failed:", err);
      setToast({ type: "error", message: `Could not generate PDF: ${err.message}` });
    } finally {
      setExporting(false);
    }
  };
  const baseUsedPct = quarterBase > 0 ? Math.min(100, (qSummary.tb / quarterBase) * 100) : 0;
  const daysUsedPct = totalWorkingDays > 0 ? Math.min(100, (qSummary.tw / totalWorkingDays) * 100) : 0;
  const achievedDelta = qSummary.ta - qSummary.tb;
  const achievedTone = achievedDelta >= 0 ? "positive" : "negative";

  return (
    <div className="app">
      <div className="app__container">
        <header className="topbar">
          <div className="brand">
            <div className="brand__mark" aria-hidden="true">DE</div>
            <div>
              <div className="eyebrow">Developer Sprint Evaluation</div>
              <h1 className="topbar__title">Performance Evaluation Centre</h1>
              <p className="topbar__subtitle">Pro-rata scoring, sprint accountability, and quarterly rollup in one workspace.</p>
            </div>
          </div>
          <div className="topbar__actions">
            <div className="view-tabs" role="tablist" aria-label="View">
              <button
                role="tab" aria-selected={view === "workspace"}
                className={`view-tabs__btn${view === "workspace" ? " view-tabs__btn--active" : ""}`}
                onClick={() => setView("workspace")}
              >
                Workspace
              </button>
              <button
                role="tab" aria-selected={view === "framework"}
                className={`view-tabs__btn${view === "framework" ? " view-tabs__btn--active" : ""}`}
                onClick={() => setView("framework")}
              >
                Framework
              </button>
            </div>
            {view === "workspace" && (
              <>
                <div className={`status-chip${quarterLocked ? " status-chip--locked" : ""}`}>
                  <span className="status-chip__dot" />
                  {quarterLocked ? "Quarter locked" : "Quarter open"}
                </div>
                <button
                  className="btn btn--primary btn--export"
                  onClick={handleExportPdf}
                  disabled={!canExport || exporting}
                  title={canExport ? "Export a formatted PDF report" : "Add quarter dates and sprint data first"}
                >
                  {exporting ? "Generating…" : "Export PDF"}
                </button>
              </>
            )}
            <ThemeToggle theme={theme} />
          </div>
        </header>

        {view === "workspace" && (
        <>
        <section className="overview-grid" aria-label="Quarter overview">
          <QuarterConfig
            quarterStart={quarterStart} quarterEnd={quarterEnd}
            quarterBase={quarterBase} dailyCapacity={dailyCapacity}
            quarterLocked={quarterLocked}
            totalWorkingDays={totalWorkingDays} dailyRate={dailyRate}
            sprintCount={sprints.length}
            holidays={holidays} onChangeHolidays={setHolidays}
            onChangeStart={handleQuarterStartChange} onChangeEnd={handleQuarterEndChange}
            onChangeBase={setQuarterBase} onChangeCapacity={setDailyCapacity}
            onToggleLock={handleQuarterLock}
          />

          <div className="card portfolio-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Portfolio Snapshot</div>
                <h2>Quarter position</h2>
              </div>
              <span className="panel-heading__meta">{lockedCount} locked</span>
            </div>
            <div className="kpi-grid">
              <KpiCard
                label="Achieved"
                value={qSummary.ta.toFixed(2)}
                detail={`${achievedDelta >= 0 ? "+" : ""}${achievedDelta.toFixed(2)} vs base`}
                tone={achievedTone}
              />
              <KpiCard
                label="Base used"
                value={qSummary.tb.toFixed(1)}
                detail={`${baseUsedPct.toFixed(0)}% of quarter`}
              />
              <KpiCard
                label="Days used"
                value={`${qSummary.tw}`}
                detail={`${qSummary.rw} remaining`}
              />
              <KpiCard
                label="Daily rate"
                value={dailyRate.toFixed(3)}
                detail={`${dailyCapacity} hrs capacity`}
              />
            </div>
            <div className="portfolio-panel__meter" aria-hidden="true">
              <span style={{ width: `${daysUsedPct}%` }} />
            </div>
          </div>
        </section>

        <ReportDetails meta={reportMeta} onChange={setReportMeta} />

        <SettingsPanel />

        <section className="workspace" aria-label="Sprint ledger">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Sprint Ledger</div>
              <h2>Evaluation workspace</h2>
            </div>
            <button className="add-sprint-btn" onClick={addSprint}>Add sprint</button>
          </div>

          <div className="sprint-grid">
            {sprints.map((s, idx) => (
              <SprintCard
                key={s.id}
                index={idx}
                sprint={s}
                sprintWithWD={sprintsWithWD[idx]}
                result={sprintResults[idx]}
                isLocked={s.locked}
                isLast={idx === sprints.length - 1}
                exceedsQuarter={idx === sprints.length - 1 && lastSprintExceedsQuarter}
                quarterLocked={quarterLocked}
                quarterStart={quarterStart}
                quarterEnd={quarterEnd}
                dailyRate={dailyRate}
                onUpdate={(f, v) => updateSprint(idx, f, v)}
                onToggleLock={() => toggleLock(idx)}
                onRemove={() => removeSprint(idx)}
                canRemove={sprints.length > 1 && !s.locked}
              />
            ))}
          </div>
        </section>

        <section className="insight-grid" aria-label="Quarter insights">
          <CorrelationChart sprintResults={sprintResults} theme={theme.resolved} />
          <QuarterlySummary
            sprints={sprints}
            sprintResults={sprintResults}
            summary={qSummary}
            totalWorkingDays={totalWorkingDays}
            quarterBase={quarterBase}
          />
        </section>
        </>
        )}

        {view === "framework" && <Framework />}

        <footer className="app__footer">
          Performance Evaluation Centre · v{APP_VERSION} · Runs entirely in your browser · No data leaves this device
        </footer>
      </div>

      {toast && (
        <div className={`toast toast--${toast.type}`} role="status" aria-live="polite">
          <span className="toast__dot" />
          <span>{toast.message}</span>
          <button className="toast__close" aria-label="Dismiss" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </div>
  );
}
