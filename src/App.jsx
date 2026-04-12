import { useState, useMemo, useEffect } from "react";
import { EMPTY_SPRINT } from "./constants";
import { countWorkingDays } from "./utils";
import { computeSprintResult, computeQuarterlySummary } from "./scoring";
import { QuarterConfig } from "./components/QuarterConfig";
import { SprintCard } from "./components/SprintCard";
import { CorrelationChart } from "./components/CorrelationChart";
import { QuarterlySummary } from "./components/QuarterlySummary";
import "./App.css";

function useTheme() {
  const [mode, setMode] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    localStorage.setItem("theme", mode);
    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => document.documentElement.setAttribute("data-theme", mq.matches ? "dark" : "light");
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else {
      document.documentElement.setAttribute("data-theme", mode);
    }
  }, [mode]);

  const resolved = mode === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : mode;

  return { mode, resolved, setMode };
}

export default function DevEvaluationCalculator() {
  const theme = useTheme();
  const [quarterStart, setQuarterStart] = useState("");
  const [quarterEnd, setQuarterEnd] = useState("");
  const [quarterLocked, setQuarterLocked] = useState(false);
  const [quarterBase, setQuarterBase] = useState(90);
  const [dailyCapacity, setDailyCapacity] = useState(7);
  const [sprints, setSprints] = useState([{ ...EMPTY_SPRINT, name: "Sprint 1" }]);

  const totalWorkingDays = useMemo(() => countWorkingDays(quarterStart, quarterEnd), [quarterStart, quarterEnd]);
  const dailyRate = totalWorkingDays > 0 ? quarterBase / totalWorkingDays : 0;

  const updateSprint = (i, f, v) => setSprints(p => p.map((s, j) => j === i ? { ...s, [f]: v } : s));
  const addSprint = () => {
    const lastSprint = sprints[sprints.length - 1];
    let nextStart = "";
    if (lastSprint.endDate) {
      const d = new Date(lastSprint.endDate);
      d.setDate(d.getDate() + 1);
      nextStart = d.toISOString().split("T")[0];
    }
    setSprints(p => [...p, { ...EMPTY_SPRINT, name: `Sprint ${p.length + 1}`, startDate: nextStart }]);
  };
  const removeSprint = (i) => setSprints(p => p.filter((_, j) => j !== i));
  const toggleLock = (i) => setSprints(p => p.map((s, j) => j === i ? { ...s, locked: !s.locked } : s));

  const sprintsWithWD = useMemo(() => {
    return sprints.map(s => {
      const autoWD = countWorkingDays(s.startDate, s.endDate);
      return { ...s, workingDays: autoWD > 0 ? autoWD.toString() : s.workingDays };
    });
  }, [sprints]);

  const lastSprintExceedsQuarter = useMemo(() => {
    if (!quarterLocked || !quarterEnd || sprints.length === 0) return false;
    const lastEnd = sprints[sprints.length - 1].endDate;
    if (!lastEnd) return false;
    return new Date(lastEnd) > new Date(quarterEnd);
  }, [sprints, quarterEnd, quarterLocked]);

  const sprintResults = useMemo(() => {
    return sprintsWithWD.map(s => computeSprintResult(s, dailyRate, dailyCapacity));
  }, [sprintsWithWD, dailyRate, dailyCapacity]);

  const qSummary = useMemo(() => {
    return computeQuarterlySummary(sprintResults, totalWorkingDays, dailyRate);
  }, [sprintResults, totalWorkingDays, dailyRate]);

  return (
    <div className="app">
      <div className="app__container">

        <div className="header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="header__badge">Sprint Evaluator v3.0 — Pro Rata</div>
              <h1 className="header__title">Developer Evaluation Calculator</h1>
              <p className="header__subtitle">Pro-rata base points. Lock quarter dates to constrain sprints.</p>
            </div>
            <div className="theme-toggle">
              {["light", "system", "dark"].map(m => (
                <button key={m} className={`theme-toggle__btn${theme.mode === m ? " theme-toggle__btn--active" : ""}`}
                  onClick={() => theme.setMode(m)}>
                  {m === "light" ? "\u2600" : m === "dark" ? "\u263E" : "\u25D0"}
                </button>
              ))}
            </div>
          </div>
        </div>

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

        {sprints.map((s, idx) => (
          <SprintCard
            key={idx}
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
            canRemove={sprints.length > 1}
          />
        ))}

        <button className="add-sprint-btn" onClick={addSprint}>+ Add sprint</button>

        <CorrelationChart sprintResults={sprintResults} theme={theme.resolved} />

        <QuarterlySummary
          sprints={sprints}
          sprintResults={sprintResults}
          summary={qSummary}
          totalWorkingDays={totalWorkingDays}
          quarterBase={quarterBase}
        />

      </div>
    </div>
  );
}
