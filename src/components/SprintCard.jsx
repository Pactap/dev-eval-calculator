import { useState, useEffect } from "react";
import { CODE_QUALITY_OPTIONS, WEIGHTS } from "../constants.js";
import { formatDate } from "../utils.js";
import { Pill } from "./Pill.jsx";
import { MetricSection } from "./MetricSection.jsx";
import { ScoreTable } from "./ScoreTable.jsx";

const METRIC_CONFIGS = [
  {
    key: "ph",
    icon: "PH",
    title: "Planned Hours",
    weightLabel: `${WEIGHTS.ph * 100}%`,
    tipText: "(Completed + Collaboration) / Allotted Hours. Rework excluded.",
  },
  {
    key: "cq",
    icon: "CQ",
    title: "Code Quality",
    weightLabel: `${WEIGHTS.cq * 100}%`,
    tipText: "Team lead grade, cross-checked against CQI.",
  },
  {
    key: "eff",
    icon: "EF",
    title: "Efficiency",
    weightLabel: `${WEIGHTS.eff * 100}% auto`,
    tipText: null,
  },
  {
    key: "ip",
    icon: "IP",
    title: "Issue Persists",
    weightLabel: `${WEIGHTS.ip * 100}%`,
    tipText: "Reopened / Done. Legacy reach-back, each reopen counted separately. Zero Done = worst band.",
  },
];

export function SprintCard({
  index, sprint, sprintWithWD, result, isLocked, exceedsQuarter,
  quarterLocked, quarterStart, quarterEnd, dailyRate,
  onUpdate, onToggleLock, onRemove, canRemove,
}) {
  const s = sprint;
  const sw = sprintWithWD;
  const r = result;
  const hasInput = r.wd > 0;

  const [localStartDate, setLocalStartDate] = useState(s.startDate);
  const [localEndDate, setLocalEndDate] = useState(s.endDate);

  useEffect(() => { setLocalStartDate(s.startDate); }, [s.startDate]);
  useEffect(() => { setLocalEndDate(s.endDate); }, [s.endDate]);

  let cardClass = "card sprint-card";
  if (exceedsQuarter) cardClass += " sprint-card--exceeds";
  else if (isLocked) cardClass += " sprint-card--locked";

  const renderMetricContent = (key) => {
    switch (key) {
      case "ph":
        return {
          children: (
            <div className="metric__inputs">
              <div className="metric__input-field">
                <label className="label">Completed</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={s.completedHours}
                  disabled={isLocked}
                  className={`input${isLocked ? " input--disabled" : ""}`}
                  onChange={e => onUpdate("completedHours", e.target.value)}
                />
              </div>
              <div className="metric__input-field">
                <label className="label">Collab</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={s.collaborationHours}
                  disabled={isLocked}
                  className={`input${isLocked ? " input--disabled" : ""}`}
                  onChange={e => onUpdate("collaborationHours", e.target.value)}
                />
              </div>
            </div>
          ),
          resultDisplay: hasInput ? (
            <div className="metric__result">
              <span>{r.phPct.toFixed(1)}%</span>
              <span className="metric__arrow">{"->"}</span>
              <span>{r.phB.label}</span>
              <Pill value={r.phB.multiplier} />
            </div>
          ) : null,
        };
      case "cq":
        return {
          children: (
            <div className="metric__inputs metric__inputs--quality">
              {CODE_QUALITY_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  disabled={isLocked}
                  className={`cq-btn${s.codeQuality === opt.label ? " cq-btn--active" : ""}${isLocked ? " cq-btn--disabled" : ""}`}
                  onClick={() => onUpdate("codeQuality", opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ),
          resultDisplay: hasInput ? (
            <div className="metric__result">
              <span>{r.cqO.label}</span>
              <Pill value={r.cqO.multiplier} />
            </div>
          ) : null,
        };
      case "eff":
        return {
          children: !hasInput ? <div className="metric__auto-text">Auto-calculated from completed hours</div> : null,
          resultDisplay: hasInput ? (
            <div className="metric__result">
              <span>{r.effPct.toFixed(1)}%</span>
              <span className="metric__arrow">{"->"}</span>
              <span>{r.effB.label}</span>
              <Pill value={r.effB.multiplier} />
            </div>
          ) : null,
        };
      case "ip":
        return {
          children: (
            <div className="metric__inputs">
              <div className="metric__input-field">
                <label className="label">Reopened</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={s.reopenedTickets}
                  disabled={isLocked}
                  className={`input${isLocked ? " input--disabled" : ""}`}
                  onChange={e => onUpdate("reopenedTickets", e.target.value)}
                />
              </div>
              <div className="metric__input-field">
                <label className="label">Done tickets</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={s.doneTickets}
                  disabled={isLocked}
                  className={`input${isLocked ? " input--disabled" : ""}`}
                  onChange={e => onUpdate("doneTickets", e.target.value)}
                />
              </div>
            </div>
          ),
          resultDisplay: hasInput ? (
            <div className={`metric__result${r.zeroDone ? " metric__result--error" : ""}`}>
              {r.zeroDone
                ? <><span className="metric__emphasis">Zero Done - worst band</span><Pill value={r.ipB.multiplier} /></>
                : <><span>{r.ipPct.toFixed(1)}%</span><span className="metric__arrow">{"->"}</span><span>{r.ipB.label}</span><Pill value={r.ipB.multiplier} /></>}
            </div>
          ) : null,
        };
      default:
        return { children: null, resultDisplay: null };
    }
  };

  return (
    <article className={cardClass}>
      <div className="sprint-card__header">
        <div className="sprint-card__identity">
          <span className={`sprint-card__number${isLocked ? " sprint-card__number--locked" : ""}`}>{index + 1}</span>
          <div className="sprint-card__title-block">
            <input
              type="text"
              value={s.name}
              placeholder={`Sprint ${index + 1}`}
              disabled={isLocked}
              className={`sprint-card__name${isLocked ? " sprint-card__name--locked" : ""}`}
              onChange={e => onUpdate("name", e.target.value)}
            />
            <span className="sprint-card__meta">{isLocked ? "Locked sprint" : "Open sprint"}</span>
          </div>
        </div>
        <div className="sprint-card__actions">
          <button className="btn btn--sm" onClick={onToggleLock}>{isLocked ? "Unlock" : "Lock"}</button>
          {canRemove && <button className="btn btn--sm btn--danger" onClick={onRemove}>Remove</button>}
        </div>
      </div>

      {exceedsQuarter && (
        <div className="sprint-card__warning">
          Sprint end date ({formatDate(s.endDate)}) exceeds quarter end ({formatDate(quarterEnd)}). Adjust the end date.
        </div>
      )}

      <div className="sprint-card__dates">
        <div className="sprint-card__date-field">
          <label className="label">Start date</label>
          <input
            type="date"
            value={localStartDate}
            disabled={isLocked}
            min={quarterLocked ? quarterStart : undefined}
            max={quarterLocked ? quarterEnd : undefined}
            className={`input${isLocked ? " input--disabled" : ""}`}
            onChange={e => {
              setLocalStartDate(e.target.value);
              onUpdate("startDate", e.target.value);
            }}
          />
        </div>
        <div className="sprint-card__date-field">
          <label className="label">End date</label>
          <input
            type="date"
            value={localEndDate}
            disabled={isLocked}
            min={localStartDate || (quarterLocked ? quarterStart : undefined)}
            max={quarterLocked ? quarterEnd : undefined}
            className={`input${isLocked ? " input--disabled" : ""}`}
            onChange={e => {
              setLocalEndDate(e.target.value);
              onUpdate("endDate", e.target.value);
            }}
          />
        </div>
        <div className="sprint-card__stat-field">
          <label className="label">Work days</label>
          <div className="input input--green">{sw.workingDays || "-"}</div>
        </div>
        <div className="sprint-card__stat-field">
          <label className="label">Base pts</label>
          <div className="input input--display">{r.bp.toFixed(2)}</div>
        </div>
        <div className="sprint-card__stat-field">
          <label className="label">Allotted hrs</label>
          <div className="input input--display">{r.ah.toFixed(0)}</div>
        </div>
      </div>

      <div className="metric-grid">
        {METRIC_CONFIGS.map(cfg => {
          const { children, resultDisplay } = renderMetricContent(cfg.key);
          return (
            <MetricSection
              key={cfg.key}
              icon={cfg.icon}
              title={cfg.title}
              weightLabel={cfg.weightLabel}
              tipText={cfg.tipText}
              hasInputs={cfg.key !== "eff"}
            >
              {children}
              {resultDisplay}
            </MetricSection>
          );
        })}
      </div>

      {hasInput && <ScoreTable result={r} dailyRate={dailyRate} />}
    </article>
  );
}
