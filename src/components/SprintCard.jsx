import { useState, useEffect } from "react";
import { formatDate, addDaysISO, isWeekend, countWeekends } from "../utils.js";
import { useConfig } from "../configStore.jsx";
import { Pill } from "./Pill.jsx";
import { MetricSection } from "./MetricSection.jsx";
import { ScoreTable } from "./ScoreTable.jsx";

export function SprintCard({
  index, sprint, sprintWithWD, result, isLocked, exceedsQuarter,
  quarterLocked, quarterStart, quarterEnd, dailyRate, restrictedHolidayPool = [], rhWritable = true,
  onUpdate, onSetRestrictedHoliday, onToggleLock, onRemove, canRemove,
}) {
  const { config } = useConfig();
  const { weights, codeQualityOptions } = config;
  const holidays = config.holidays || [];
  const holidayNames = config.holidayNames || {};

  const METRIC_CONFIGS = [
    { key: "ph", icon: "PH", title: "Planned Hours", weightLabel: `${(weights.ph * 100).toFixed(0)}%`, tipText: "(Completed hours + Collaboration hours) / Allotted hours, in this Sprint. Rework excluded; capped at 100%." },
    { key: "cq", icon: "CQ", title: "Code Quality", weightLabel: `${(weights.cq * 100).toFixed(0)}%`, tipText: "Team-lead grade for this Sprint, cross-checked against the CQI." },
    { key: "eff", icon: "EF", title: "Efficiency", weightLabel: `${(weights.eff * 100).toFixed(0)}%`, tipText: "Tickets Marked Closed (by Developer) / Tickets Assigned, in this Sprint. Zero Assigned = no credit." },
    { key: "ip", icon: "IP", title: "Issue Persists", weightLabel: `${(weights.ip * 100).toFixed(0)}%`, tipText: "Tickets Reopened / Tickets Marked Closed (the same Marked-Closed value as Efficiency), in this Sprint. Tickets are Reopened by Quality Assurance on grounds such as failed acceptance criteria, regression bugs, unmet technical standards or environment errors (not limited to) — on QA's own evaluation or on the recommendation of Product Management, the Engineering Team Lead, or the Engineering Manager on similar grounds. Reopens counted here may be tickets Marked Closed in this or an earlier Sprint that QA has since tested and reopened. Each reopen counted separately. Zero Marked Closed = worst band." },
  ];

  const s = sprint;
  const sw = sprintWithWD;
  const r = result;
  const hasInput = r.wdTotal > 0;

  // Restricted-holiday options: admin-declared pool entries that fall on a working
  // day this sprint actually owns (shared-boundary start day excluded, and never a
  // company holiday — that day is already off, so it can't also be availed).
  const rhEffMin = sw.sharesStartBoundary ? addDaysISO(s.startDate, 1) : s.startDate;
  const rhOptions = (restrictedHolidayPool || [])
    .filter(e => e && !isWeekend(e.date) && !holidays.includes(e.date) && s.startDate && s.endDate && e.date >= rhEffMin && e.date <= s.endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const availedRh = (restrictedHolidayPool || []).find(e => e && e.date === s.restrictedHoliday) || null;

  // Non-working days inside this sprint's counted window — explains why productive
  // days are fewer than the calendar span (weekends + company holidays + any RH).
  const hasDates = Boolean(s.startDate && s.endDate);
  const sprintCompanyHolidays = hasDates
    ? holidays.filter(d => d >= rhEffMin && d <= s.endDate).sort()
    : [];
  const weekendDays = hasDates ? countWeekends(rhEffMin, s.endDate) : 0;

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
                <input type="number" min="0" placeholder="0" value={s.completedHours} disabled={isLocked}
                  className={`input${isLocked ? " input--disabled" : ""}`}
                  onChange={e => onUpdate("completedHours", e.target.value)} />
              </div>
              <div className="metric__input-field">
                <label className="label">Collab</label>
                <input type="number" min="0" placeholder="0" value={s.collaborationHours} disabled={isLocked}
                  className={`input${isLocked ? " input--disabled" : ""}`}
                  onChange={e => onUpdate("collaborationHours", e.target.value)} />
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
              {codeQualityOptions.map(opt => (
                <button key={opt.label} disabled={isLocked}
                  className={`cq-btn${s.codeQuality === opt.label ? " cq-btn--active" : ""}${isLocked ? " cq-btn--disabled" : ""}`}
                  onClick={() => onUpdate("codeQuality", opt.label)}>
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
          children: (
            <div className="metric__inputs">
              <div className="metric__input-field">
                <label className="label">Tickets Marked Closed</label>
                <input type="number" min="0" placeholder="0" value={s.closedTickets} disabled={isLocked}
                  className={`input${isLocked ? " input--disabled" : ""}`}
                  onChange={e => onUpdate("closedTickets", e.target.value)} />
              </div>
              <div className="metric__input-field">
                <label className="label">Tickets Assigned</label>
                <input type="number" min="0" placeholder="0" value={s.assignedTickets} disabled={isLocked}
                  className={`input${isLocked ? " input--disabled" : ""}`}
                  onChange={e => onUpdate("assignedTickets", e.target.value)} />
              </div>
            </div>
          ),
          resultDisplay: hasInput ? (
            <div className={`metric__result${r.noAssigned ? " metric__result--error" : ""}`}>
              {r.noAssigned
                ? <><span className="metric__emphasis">No tickets assigned</span><Pill value={r.effB.multiplier} /></>
                : <><span>{r.closed}/{r.assigned} = {r.effPct.toFixed(1)}%</span><span className="metric__arrow">{"->"}</span><span>{r.effB.label}</span><Pill value={r.effB.multiplier} /></>}
            </div>
          ) : null,
        };
      case "ip":
        return {
          children: (
            <div className="metric__inputs">
              <div className="metric__input-field">
                <label className="label">Tickets Reopened</label>
                <input type="number" min="0" placeholder="0" value={s.reopenedTickets} disabled={isLocked}
                  className={`input${isLocked ? " input--disabled" : ""}`}
                  onChange={e => onUpdate("reopenedTickets", e.target.value)} />
              </div>
              <div className="metric__input-field">
                {/* Same shared value as Efficiency's Tickets Marked Closed (the IP denominator). */}
                <label className="label">Tickets Marked Closed</label>
                <input type="number" min="0" placeholder="0" value={s.closedTickets} disabled={isLocked}
                  className={`input${isLocked ? " input--disabled" : ""}`}
                  onChange={e => onUpdate("closedTickets", e.target.value)} />
              </div>
            </div>
          ),
          resultDisplay: hasInput ? (
            <div className={`metric__result${r.zeroClosed ? " metric__result--error" : ""}`}>
              {r.zeroClosed
                ? <><span className="metric__emphasis">Zero Marked Closed - worst band</span><Pill value={r.ipB.multiplier} /></>
                : <><span>{r.reop}/{r.closed} = {r.ipPct.toFixed(1)}%</span><span className="metric__arrow">{"->"}</span><span>{r.ipB.label}</span><Pill value={r.ipB.multiplier} /></>}
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
            <div className="sprint-card__name-row">
              <input type="text" value={s.name} placeholder={`Sprint ${index + 1}`} disabled={isLocked}
                className={`sprint-card__name${isLocked ? " sprint-card__name--locked" : ""}`}
                onChange={e => onUpdate("name", e.target.value)} />
              {s.draft && !isLocked && <span className="sprint-card__draft-badge">Draft</span>}
            </div>
            <span className="sprint-card__meta">{isLocked ? "Locked sprint" : s.draft ? "Auto-generated draft" : "Open sprint"}</span>
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
          <input type="date" value={localStartDate} disabled={isLocked}
            min={quarterLocked ? quarterStart : undefined} max={quarterLocked ? quarterEnd : undefined}
            className={`input${isLocked ? " input--disabled" : ""}`}
            onChange={e => { setLocalStartDate(e.target.value); onUpdate("startDate", e.target.value); }} />
        </div>
        <div className="sprint-card__date-field">
          <label className="label">End date</label>
          <input type="date" value={localEndDate} disabled={isLocked}
            min={localStartDate || (quarterLocked ? quarterStart : undefined)} max={quarterLocked ? quarterEnd : undefined}
            className={`input${isLocked ? " input--disabled" : ""}`}
            onChange={e => { setLocalEndDate(e.target.value); onUpdate("endDate", e.target.value); }} />
        </div>
        <div className="sprint-card__stat-field">
          <label className="label">{r.leaks ? "Total days" : "Work days"}</label>
          <div className="input input--green">{sw.workingDays || "-"}</div>
        </div>
        {r.leaks && (
          <div className="sprint-card__stat-field">
            <label className="label">In-quarter</label>
            <div className="input input--green">{r.wdInQuarter}</div>
          </div>
        )}
        <div className="sprint-card__stat-field">
          <label className="label">Base pts</label>
          <div className="input input--display">{r.bp.toFixed(2)}</div>
        </div>
        <div className="sprint-card__stat-field">
          <label className="label">Allotted hrs</label>
          <div className="input input--display">{r.ah.toFixed(0)}</div>
        </div>
      </div>

      {r.leaks && (
        <div className="sprint-card__leak-note">
          Sprint spans quarter boundary — {r.wdInQuarter} of {r.wdTotal} productive days counted toward this quarter's base points. Metrics use the full sprint.
        </div>
      )}

      {sw.sharesStartBoundary && !isLocked && (
        <div className="sprint-card__leak-note">
          Shares its start date ({formatDate(s.startDate)}) with the previous sprint — that day is counted in the previous sprint, so it's excluded from this sprint's productive days.
        </div>
      )}

      {hasDates && (weekendDays > 0 || sprintCompanyHolidays.length > 0 || s.restrictedHoliday) && (
        <div className="sprint-card__nonworking">
          <div className="sprint-card__nonworking-head">
            <span className="sprint-card__nonworking-title">Non-working days in this sprint</span>
            <span className="sprint-card__nonworking-counts">
              <span>Weekends <strong>{weekendDays}</strong></span>
              <span>Company <strong>{sprintCompanyHolidays.filter(d => !isWeekend(d)).length}</strong></span>
              <span>Restricted <strong>{s.restrictedHoliday ? 1 : 0}</strong></span>
            </span>
          </div>
          {(sprintCompanyHolidays.length > 0 || s.restrictedHoliday) && (
            <div className="sprint-card__nonworking-chips">
              {sprintCompanyHolidays.map(d => (
                <span key={d} className={`nw-chip${isWeekend(d) ? " nw-chip--muted" : ""}`}>
                  {holidayNames[d] || "Holiday"} · {formatDate(d)}{isWeekend(d) ? " · weekend" : ""}
                </span>
              ))}
              {s.restrictedHoliday && (
                <span className="nw-chip nw-chip--accent">
                  {(availedRh && availedRh.label) || "Restricted holiday"} · {formatDate(s.restrictedHoliday)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {!isLocked && s.startDate && s.endDate && (
        <div className="sprint-card__rh">
          <div className="sprint-card__rh-field">
            <label className="label">Restricted holiday <span className="sprint-card__rh-opt">optional · 1 / year</span></label>
            <select className="input" value={s.restrictedHoliday || ""}
              disabled={!rhWritable || (rhOptions.length === 0 && !s.restrictedHoliday)}
              onChange={e => onSetRestrictedHoliday(e.target.value)}>
              <option value="">None</option>
              {rhOptions.map(e => (
                <option key={e.date} value={e.date}>{e.label} · {formatDate(e.date)}</option>
              ))}
              {s.restrictedHoliday && !rhOptions.some(o => o.date === s.restrictedHoliday) && (
                <option value={s.restrictedHoliday}>{(availedRh && availedRh.label) || "Availed"} · {formatDate(s.restrictedHoliday)}</option>
              )}
            </select>
          </div>
          <p className="sprint-card__rh-note">
            {!rhWritable && !s.restrictedHoliday
              ? "Unlock in Scoring rules (passkey) to record a restricted holiday."
              : s.restrictedHoliday
                ? `${availedRh ? availedRh.label + " — " : ""}excluded from this sprint's productive hours. Pro-rata, so it lowers the target proportionally, not the developer's score.`
                : rhOptions.length
                  ? "If the developer availed an optional (restricted) holiday this sprint, pick it from the declared list. One per calendar year, independent of other developers."
                  : "No declared restricted holidays fall in this sprint. Admins declare them in the Holiday calendar."}
          </p>
        </div>
      )}

      {isLocked && s.restrictedHoliday && (
        <div className="sprint-card__leak-note">
          Restricted holiday{availedRh ? ` (${availedRh.label})` : ""} on {formatDate(s.restrictedHoliday)} — excluded from this sprint's productive days (non-punitive).
        </div>
      )}

      <div className="metric-grid">
        {METRIC_CONFIGS.map(cfg => {
          const { children, resultDisplay } = renderMetricContent(cfg.key);
          return (
            <MetricSection key={cfg.key} icon={cfg.icon} title={cfg.title}
              weightLabel={cfg.weightLabel} tipText={cfg.tipText}
              hasInputs={true}>
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
