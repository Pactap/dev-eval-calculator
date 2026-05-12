import { useState, useMemo, useEffect } from "react";
import { createSprint } from "./constants.js";
import { countWorkingDays } from "./utils.js";
import { computeSprintResult, computeQuarterlySummary } from "./scoring.js";
import { QuarterConfig } from "./components/QuarterConfig.jsx";
import { SprintCard } from "./components/SprintCard.jsx";
import { CorrelationChart } from "./components/CorrelationChart.jsx";
import { QuarterlySummary } from "./components/QuarterlySummary.jsx";
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

export default function DevEvaluationCalculator() {
  const theme = useTheme();
  const [quarterStart, setQuarterStart] = useState("");
  const [quarterEnd, setQuarterEnd] = useState("");
  const [quarterLocked, setQuarterLocked] = useState(false);
  const [quarterBase, setQuarterBase] = useState(90);
  const [dailyCapacity, setDailyCapacity] = useState(7);
  const [sprints, setSprints] = useState([createSprint({ name: "Sprint 1" })]);

  const totalWorkingDays = useMemo(() => countWorkingDays(quarterStart, quarterEnd), [quarterStart, quarterEnd]);
  const dailyRate = totalWorkingDays > 0 ? quarterBase / totalWorkingDays : 0;

  const updateSprint = (i, f, v) => setSprints(p => p.map((s, j) => j === i ? { ...s, [f]: v } : s));
  const addSprint = () => {
    const lastSprint = sprints[sprints.length - 1];
    let nextStart = "";
    if (lastSprint.endDate) {
      const d = new Date(lastSprint.endDate);
      d.setDate(d.getDate() + 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      nextStart = `${yyyy}-${mm}-${dd}`;
    }
    setSprints(p => [...p, createSprint({ name: `Sprint ${p.length + 1}`, startDate: nextStart })]);
  };
  const removeSprint = (i) => setSprints(p => p.filter((_, j) => j !== i));

  const sprintsWithWD = useMemo(() => {
    return sprints.map(s => {
      if (s.locked && s.workingDays) return s;
      const autoWD = countWorkingDays(s.startDate, s.endDate);
      return { ...s, workingDays: autoWD > 0 ? autoWD.toString() : s.workingDays };
    });
  }, [sprints]);

  const toggleLock = (i) => {
    const sprintForResult = sprintsWithWD[i];
    setSprints(p => p.map((s, j) => {
      if (j !== i) return s;
      if (s.locked) return { ...s, locked: false, lockedResult: null };

      const lockedResult = computeSprintResult(sprintForResult, dailyRate, dailyCapacity);
      return {
        ...s,
        workingDays: sprintForResult.workingDays,
        locked: true,
        lockedResult,
      };
    }));
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
        : computeSprintResult(s, dailyRate, dailyCapacity)
    ));
  }, [sprints, sprintsWithWD, dailyRate, dailyCapacity]);

  const qSummary = useMemo(() => {
    return computeQuarterlySummary(sprintResults, totalWorkingDays, dailyRate);
  }, [sprintResults, totalWorkingDays, dailyRate]);

  const lockedCount = useMemo(() => sprints.filter(s => s.locked).length, [sprints]);
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
              <h1 className="topbar__title">Performance Control Center</h1>
              <p className="topbar__subtitle">Pro-rata scoring, sprint accountability, and quarterly rollup in one workspace.</p>
            </div>
          </div>
          <div className="topbar__actions">
            <div className={`status-chip${quarterLocked ? " status-chip--locked" : ""}`}>
              <span className="status-chip__dot" />
              {quarterLocked ? "Quarter locked" : "Quarter open"}
            </div>
            <ThemeToggle theme={theme} />
          </div>
        </header>

        <section className="overview-grid" aria-label="Quarter overview">
          <QuarterConfig
            quarterStart={quarterStart} quarterEnd={quarterEnd}
            quarterBase={quarterBase} dailyCapacity={dailyCapacity}
            quarterLocked={quarterLocked}
            totalWorkingDays={totalWorkingDays} dailyRate={dailyRate}
            sprintCount={sprints.length}
            onChangeStart={setQuarterStart} onChangeEnd={setQuarterEnd}
            onChangeBase={setQuarterBase} onChangeCapacity={setDailyCapacity}
            onToggleLock={() => {
              if (!quarterLocked && (!quarterStart || !quarterEnd)) return;
              setQuarterLocked(!quarterLocked);
            }}
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
      </div>
    </div>
  );
}
