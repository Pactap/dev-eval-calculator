import { useState, useMemo, useEffect } from "react";
import { createSprint } from "./constants.js";
import { countWorkingDays, countWorkingDaysInWindow, parseLocalDate, toISO, generateSprintPeriods, evaluationEndFrom, effectiveCountStart, isWeekend, formatDate } from "./utils.js";
import { computeSprintResult, computeQuarterlySummary } from "./scoring.js";
import { devKeyOf, yearOf, canonicalEmpId } from "./restrictedHolidays.js";
import { useConfig } from "./configStore.jsx";
import { useNotify } from "./notify.jsx";
import { Boundary } from "./ErrorBoundary.jsx";
import { AnalyticsView } from "./components/AnalyticsView.jsx";
import { QuarterConfig } from "./components/QuarterConfig.jsx";
import { HolidayManager } from "./components/HolidayManager.jsx";
import { SprintCard } from "./components/SprintCard.jsx";
import { QuarterlySummary } from "./components/QuarterlySummary.jsx";
import { AvailabilityPanel } from "./components/AvailabilityPanel.jsx";
import { ConfigGlance } from "./components/ConfigGlance.jsx";
import { SettingsPanel } from "./components/SettingsPanel.jsx";
import { AdminUnlock } from "./components/AdminUnlock.jsx";
import { BulkIOPanel } from "./components/BulkIOPanel.jsx";
import { DevUsagePanel } from "./components/DevUsagePanel.jsx";
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

// Live India-Standard-Time clock. Uses the Asia/Kolkata zone regardless of the
// viewer's locale; tabular-nums keeps the width fixed as seconds tick (no reflow).
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const zone = { timeZone: "Asia/Kolkata" };
  const time = now.toLocaleTimeString("en-GB", { ...zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const date = now.toLocaleDateString("en-GB", { ...zone, weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  return (
    <div className="clock" role="timer" aria-label={`Current time ${time} India Standard Time`}>
      <span className="clock__time">{time}</span>
      <span className="clock__div" aria-hidden="true" />
      <span className="clock__date">{date}</span>
      <span className="clock__zone">IST</span>
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
  { key: "devName", label: "Developer full name", type: "text", placeholder: "e.g. Ram Sharma", required: false },
  { key: "empId", label: "Employee ID", type: "text", placeholder: "e.g. ABS100", required: true },
  { key: "doj", label: "Date of joining", type: "date", placeholder: "", required: false },
];

function ReportDetails({ meta, onChange, attempted }) {
  // Show the required-invalid state only after a field is touched or the user has
  // attempted to lock/export — never red on an untouched field at load.
  const [touched, setTouched] = useState({});
  return (
    <section className="card report-details" aria-label="Report details">
      <div className="report-details__head">
        <div>
          <div className="eyebrow">Report Details</div>
          <h2>Developer Details</h2>
        </div>
        <span className="report-details__hint">Included in the PDF report header</span>
      </div>
      <div className="report-details__grid">
        {REPORT_FIELDS.map(f => {
          const empty = f.required && !String(meta[f.key] || "").trim();
          const invalid = empty && (touched[f.key] || attempted);
          return (
            <div key={f.key} className="report-details__field">
              <label className="label" htmlFor={`rd-${f.key}`}>
                {f.label}{" "}
                {f.required
                  ? <span className="field-req">*</span>
                  : <span className="field-opt">(optional)</span>}
              </label>
              <input
                id={`rd-${f.key}`}
                type={f.type}
                value={meta[f.key]}
                placeholder={f.placeholder}
                className={`input${invalid ? " input--invalid" : ""}`}
                aria-invalid={invalid || undefined}
                onBlur={() => setTouched(t => ({ ...t, [f.key]: true }))}
                onChange={e => onChange({ ...meta, [f.key]: e.target.value })}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

const SPRINT_LENGTH_DAYS = 14; // fortnightly cadence: each sprint starts 14 days after the previous

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
  const { config, updateKey, rhUsage, claimRh, releaseRh, rhWritable, unlocked } = useConfig();
  const holidays = config.holidays || [];
  const holidayNames = config.holidayNames || {};
  const restrictedHolidayPool = config.restrictedHolidayPool || [];
  const [quarterStart, setQuarterStart] = useState("");
  const [quarterEnd, setQuarterEnd] = useState("");
  const [endEdited, setEndEdited] = useState(false); // true once the user manually sets the end date
  const [quarterLocked, setQuarterLocked] = useState(false);
  const [quarterBase, setQuarterBase] = useState(90);
  const [dailyCapacity, setDailyCapacity] = useState(6);
  const [sprints, setSprints] = useState([createSprint({ name: "Sprint 1" })]);
  const [reportMeta, setReportMeta] = useState({ devName: "", empId: "", quarterLabel: "", doj: "" });
  const [view, setView] = useState("workspace"); // "workspace" | "analytics" | "admin" | "framework"
  const [attempted, setAttempted] = useState(false); // a lock/export was tried -> reveal all missing required fields
  const notify = useNotify();

  const totalWorkingDays = useMemo(() => countWorkingDays(quarterStart, quarterEnd, holidays), [quarterStart, quarterEnd, holidays]);
  const dailyRate = totalWorkingDays > 0 ? quarterBase / totalWorkingDays : 0;

  // Entering the evaluation start auto-suggests the end (84 days = 6 fortnightly
  // sprints) until the user edits the end themselves; always editable before lock.
  const handleQuarterStartChange = (v) => {
    setQuarterStart(v);
    if (!endEdited && v) setQuarterEnd(evaluationEndFrom(v));
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
    notify.info(`Sprint ${sprints.length + 1} added.`);
  };
  const removeSprint = (i) => {
    const name = sprints[i]?.name || `Sprint ${i + 1}`;
    setSprints(p => p.filter((_, j) => j !== i));
    notify.info(`${name} removed.`);
  };

  // Mark (or clear, with "") a developer's restricted holiday on a sprint. Enforces
  // the one-per-calendar-year quota against both the current evaluation and the
  // cross-quarter per-developer ledger, and rejects invalid dates so the toast
  // explains exactly why. On rejection the sprint state is left unchanged, which
  // reverts the (uncontrolled) date input to its prior value.
  const setSprintRestrictedHoliday = async (i, date) => {
    const sprint = sprints[i];
    const devKey = devKeyOf(reportMeta);
    const prev = sprint.restrictedHoliday || "";
    // With a server, recording an RH is an authenticated write.
    if (!rhWritable) {
      notify.error("Unlock in Scoring rules (passkey) to record restricted holidays.");
      return;
    }
    // Release the prior claim under the identity it was RECORDED with — which may
    // differ from the current reportMeta if the Employee ID was edited since — so
    // the ledger entry is never orphaned (which would wrongly block the next one).
    const releasePrev = () => (prev && sprint.restrictedHolidayKey)
      ? releaseRh(sprint.restrictedHolidayKey, yearOf(prev))
      : Promise.resolve();

    if (!date) {                                  // clear
      await releasePrev();
      setSprints(p => p.map((s, j) => (j === i ? { ...s, restrictedHoliday: "", restrictedHolidayKey: "" } : s)));
      return;
    }
    if (date === prev) return;                    // no change

    // The date must be one the admin declared in the restricted-holiday pool.
    if (!restrictedHolidayPool.some(e => e.date === date)) {
      notify.error("Pick a restricted holiday the admin has declared in the pool for this sprint.");
      return;
    }

    // A shared start-boundary day already counts in the previous sprint, so an RH
    // there would spend the yearly quota while excluding no day. Validate against
    // the effective counted window, not the raw start date.
    const prevEnd = i > 0 ? sprints[i - 1].endDate : "";
    const countStart = effectiveCountStart(sprint.startDate, prevEnd);
    if ((countStart && date < countStart) || (sprint.endDate && date > sprint.endDate)) {
      notify.error(date === sprint.startDate && countStart !== sprint.startDate
        ? "That day is shared with the previous sprint and already counts there — pick a later day for the restricted holiday."
        : "Restricted holiday must fall within the sprint's dates.");
      return;
    }
    if (isWeekend(date)) {
      notify.error("That date is a weekend — already non-working, so no restricted holiday is needed.");
      return;
    }
    if (holidays.includes(date)) {
      notify.error("That date is already a company holiday — the day is off for everyone.");
      return;
    }

    const year = yearOf(date);
    // Cross-quarter quota: the per-developer ledger (server-authoritative when configured).
    const ledgerHit = devKey ? rhUsage(devKey, year) : null;
    if (ledgerHit && ledgerHit.date !== prev && ledgerHit.date !== date) {
      notify.error(`${reportMeta.devName || reportMeta.empId || "This developer"} has already used their ${year} restricted holiday on ${formatDate(ledgerHit.date)}${ledgerHit.quarterLabel ? ` (${ledgerHit.quarterLabel})` : ""}.`);
      return;
    }
    // In-evaluation quota: no other sprint in the same calendar year may hold one.
    const clash = sprints.find((s, j) => j !== i && s.restrictedHoliday && yearOf(s.restrictedHoliday) === year);
    if (clash) {
      notify.error(`A ${year} restricted holiday is already recorded on "${clash.name || "another sprint"}" (${formatDate(clash.restrictedHoliday)}). Only one is allowed per calendar year.`);
      return;
    }

    // The server claim is the final arbiter (it enforces the quota across machines);
    // on rejection the sprint stays unchanged, reverting the dropdown.
    try {
      await releasePrev();                        // drop the old entry before writing the new one
      if (devKey) {
        await claimRh(devKey, year, {
          date,
          sprintName: sprint.name || `Sprint ${i + 1}`,
          quarterLabel: reportMeta.quarterLabel || "",
          empId: canonicalEmpId(reportMeta.empId),
        });
      }
    } catch (err) {
      notify.error(err.message);
      return;
    }
    setSprints(p => p.map((s, j) => (j === i ? { ...s, restrictedHoliday: date, restrictedHolidayKey: devKey } : s)));
    notify.success(`Restricted holiday recorded for ${formatDate(date)}${devKey ? "" : " (add an Employee ID to track it across quarters)"}.`);
  };

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
      const countStart = effectiveCountStart(s.startDate, prevEnd);

      // A restricted holiday is a legitimate day off for THIS developer in THIS
      // sprint: exclude it like a holiday so the sprint's productive days (and thus
      // its allotted hours and pro-rata base points) shrink with availability —
      // non-punitive, since the target scales down with the time away.
      const sprintHolidays = s.restrictedHoliday ? [...holidays, s.restrictedHoliday] : holidays;
      const wdTotal = countWorkingDays(countStart, s.endDate, sprintHolidays);
      const wdInQuarter = countWorkingDaysInWindow(countStart, s.endDate, quarterStart, quarterEnd, sprintHolidays);
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
      notify.info("Evaluation period unlocked — edit the dates and re-lock when ready.");
      return;
    }
    if (!quarterStart || !quarterEnd) return;
    if (!reportMeta.quarterLabel) {
      notify.error("Select the financial quarter before locking the evaluation period.");
      return;
    }
    if (parseLocalDate(quarterStart) > parseLocalDate(quarterEnd)) {
      notify.error("Evaluation start date is after the end date.");
      return;
    }
    // On first lock, scaffold the period into 14-day draft sprints — but only when
    // the sprint list is untouched, so we never clobber work the user already entered.
    let generated = 0;
    if (sprints.every(isPristineSprint)) {
      // +1: generateSprintPeriods lengths are inclusive of the shared boundary day,
      // so a 14-day fortnightly cadence spans 15 calendar dates (start..start+14).
      const periods = generateSprintPeriods(quarterStart, quarterEnd, SPRINT_LENGTH_DAYS + 1);
      if (periods.length > 0) {
        setSprints(periods.map(p => createSprint({ ...p, draft: true })));
        generated = periods.length;
      }
    }
    setQuarterLocked(true);
    notify.success(generated > 0
      ? `Evaluation period locked. Generated ${generated} draft sprint${generated > 1 ? "s" : ""} (${SPRINT_LENGTH_DAYS}-day) — edit or remove any before locking each.`
      : "Evaluation period locked.");
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
    && sprintResults.some(r => r.wdTotal > 0)
    && String(reportMeta.empId || "").trim());

  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!canExport) {
      setAttempted(true); // reveal every missing required field at once
      const why = !String(reportMeta.empId || "").trim()
        ? "Employee ID is required before exporting."
        : "Add the evaluation period and at least one sprint with productive days before exporting.";
      notify.error(why);
      return;
    }
    setExporting(true);
    try {
      // Lazy-loaded so the ~500 KB PDF stack stays out of the initial bundle.
      const { generateQuarterlyReportPDF } = await import("./pdfReport.js");
      generateQuarterlyReportPDF({
        quarterStart, quarterEnd, quarterBase, dailyCapacity, holidays, holidayNames, restrictedHolidayPool,
        totalWorkingDays, dailyRate, config, sprints, sprintResults, summary: qSummary,
        reportMeta,
      });
      notify.success("PDF report generated.");
    } catch (err) {
      console.error("PDF export failed:", err);
      notify.error(`Could not generate PDF: ${err.message}`);
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
          <Clock />
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
                role="tab" aria-selected={view === "analytics"}
                className={`view-tabs__btn${view === "analytics" ? " view-tabs__btn--active" : ""}`}
                onClick={() => setView("analytics")}
              >
                Analytics
              </button>
              <button
                role="tab" aria-selected={view === "admin"}
                className={`view-tabs__btn${view === "admin" ? " view-tabs__btn--active" : ""}`}
                onClick={() => setView("admin")}
              >
                Admin
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
                  className={`btn btn--primary btn--export${!canExport ? " btn--inactive" : ""}`}
                  onClick={handleExportPdf}
                  disabled={exporting}
                  aria-disabled={!canExport || undefined}
                  title={canExport ? "Export a formatted PDF report" : "Add the evaluation period, Employee ID, and sprint data first"}
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
            quarterLabel={reportMeta.quarterLabel}
            quarterLocked={quarterLocked}
            totalWorkingDays={totalWorkingDays} dailyRate={dailyRate}
            sprintCount={sprints.length}
            holidays={holidays}
            attempted={attempted}
            onChangeStart={handleQuarterStartChange} onChangeEnd={handleQuarterEndChange}
            onChangeBase={setQuarterBase} onChangeCapacity={setDailyCapacity}
            onChangeQuarterLabel={(v) => setReportMeta(m => ({ ...m, quarterLabel: v }))}
            onInvalidAttempt={() => { setAttempted(true); notify.warning("Fill the required fields marked * before locking the evaluation period."); }}
            onToggleLock={handleQuarterLock}
          />

          <div className="card portfolio-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Portfolio Snapshot</div>
                <h2>Quarter Position</h2>
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

        <ReportDetails meta={reportMeta} onChange={setReportMeta} attempted={attempted} />

        <ConfigGlance />

        <Boundary label="Sprint ledger">
        <section className="workspace" aria-label="Sprint ledger">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Sprint Ledger</div>
              <h2>Evaluation Workspace</h2>
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
                restrictedHolidayPool={restrictedHolidayPool}
                rhWritable={rhWritable}
                onUpdate={(f, v) => updateSprint(idx, f, v)}
                onSetRestrictedHoliday={(date) => setSprintRestrictedHoliday(idx, date)}
                onToggleLock={() => toggleLock(idx)}
                onRemove={() => removeSprint(idx)}
                canRemove={sprints.length > 1 && !s.locked}
              />
            ))}
          </div>
        </section>
        </Boundary>

        <Boundary label="Availability summary">
        <AvailabilityPanel
          quarterStart={quarterStart} quarterEnd={quarterEnd}
          holidays={holidays} holidayNames={holidayNames}
          restrictedHolidayPool={restrictedHolidayPool} sprints={sprints}
          totalWorkingDays={totalWorkingDays} dailyCapacity={dailyCapacity}
          hasDevId={Boolean(devKeyOf(reportMeta))}
        />
        </Boundary>

        <Boundary label="Quarterly summary">
        <section className="insight-grid insight-grid--single" aria-label="Quarter insights">
          <QuarterlySummary
            sprints={sprints}
            sprintResults={sprintResults}
            summary={qSummary}
            totalWorkingDays={totalWorkingDays}
            quarterBase={quarterBase}
          />
        </section>
        </Boundary>
        </>
        )}

        {view === "analytics" && (
          <Boundary label="Analytics dashboard">
            <AnalyticsView sprintResults={sprintResults} theme={theme.resolved} />
          </Boundary>
        )}

        {view === "admin" && (
          <section className="admin" aria-label="Administration">
            <div className="section-heading">
              <div>
                <div className="eyebrow">Administration</div>
                <h2>Evaluation Parameters &amp; Calendar</h2>
              </div>
              <AdminUnlock />
            </div>
            <Boundary label="Evaluation parameters"><SettingsPanel /></Boundary>
            <Boundary label="Holiday calendar"><HolidayManager defaultYear={quarterStart ? quarterStart.slice(0, 4) : undefined} /></Boundary>
            {unlocked && <Boundary label="Bulk import/export"><BulkIOPanel /></Boundary>}
            {unlocked && <Boundary label="Developer usage"><DevUsagePanel /></Boundary>}
          </section>
        )}

        {view === "framework" && <Boundary label="Framework"><Framework /></Boundary>}

        <footer className="app__footer">
          Performance Evaluation Centre · v{APP_VERSION}
        </footer>
      </div>
    </div>
  );
}
