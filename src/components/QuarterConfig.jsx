import { formatDate, fyQuarterOptions } from "../utils.js";

const QUARTER_OPTIONS = fyQuarterOptions(2026, 6); // FY2026-27 → FY2031-32

export function QuarterConfig({
  quarterStart, quarterEnd, quarterBase, dailyCapacity, quarterLabel,
  quarterLocked, totalWorkingDays, dailyRate, sprintCount,
  holidays = [],
  onChangeStart, onChangeEnd, onChangeBase, onChangeCapacity, onChangeQuarterLabel, onToggleLock,
}) {
  const canLock = quarterStart && quarterEnd && quarterLabel;

  // Company holidays that actually fall inside the evaluation period (informational).
  const holidaysInQuarter = quarterStart && quarterEnd
    ? holidays.filter(d => d >= quarterStart && d <= quarterEnd).length
    : 0;

  // Validation surfaced to the user (instead of silently computing 0 days).
  const issues = [];
  if (quarterStart && quarterEnd && quarterStart > quarterEnd) {
    issues.push("Quarter start date is after the end date.");
  }
  if (quarterStart && quarterEnd && quarterStart <= quarterEnd && totalWorkingDays === 0) {
    issues.push("No productive days in this range (all weekends/holidays).");
  }
  if (!(quarterBase > 0)) issues.push("Base score must be greater than zero.");
  if (!(dailyCapacity > 0)) issues.push("Daily capacity must be greater than zero.");
  if (!quarterLabel) issues.push("Select the financial quarter (required to lock).");

  return (
    <div className={`card quarter-config${quarterLocked ? " quarter-config--locked" : ""}`}>
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Quarter Control</div>
          <h2>Evaluation Period</h2>
        </div>
        <button
          className={`btn${quarterLocked ? " btn--primary" : ""}`}
          onClick={() => { if (!quarterLocked && !canLock) return; onToggleLock(); }}
        >
          {quarterLocked ? "Unlock" : "Lock"}
        </button>
      </div>

      <div className="quarter-config__inputs">
        <div className="quarter-config__field">
          <label className="label">Financial quarter <span className="quarter-config__req">*</span></label>
          <select
            value={quarterLabel || ""}
            disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeQuarterLabel(e.target.value)}
          >
            <option value="">Select quarter…</option>
            {QUARTER_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
        <div className="quarter-config__field">
          <label className="label">Evaluation Start Date <span className="quarter-config__req">*</span></label>
          <input
            type="date"
            value={quarterStart}
            disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeStart(e.target.value)}
          />
        </div>
        <div className="quarter-config__field">
          <label className="label">Evaluation End Date <span className="quarter-config__req">*</span></label>
          <input
            type="date"
            value={quarterEnd}
            disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeEnd(e.target.value)}
          />
        </div>
        <div className="quarter-config__field--sm">
          <label className="label">Base score <span className="quarter-config__req">*</span></label>
          <input
            type="number"
            value={quarterBase}
            disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeBase(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="quarter-config__field--sm">
          <label className="label">Capacity (hrs/day) <span className="quarter-config__req">*</span></label>
          <input
            type="number"
            value={dailyCapacity}
            disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeCapacity(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {issues.length > 0 && (
        <div className="config-notice config-notice--error" role="alert">
          {issues.map((msg, i) => <div key={i}>{msg}</div>)}
        </div>
      )}

      <div className="quarter-config__stats">
        <span>Work week <strong>Mon–Fri</strong></span>
        <span>Productive days <strong>{totalWorkingDays}</strong></span>
        <span>Holidays in period <strong>{holidaysInQuarter}</strong></span>
        <span>Daily rate <strong className="mono">{dailyRate.toFixed(4)}</strong></span>
        <span>Available hrs <strong>{(totalWorkingDays * dailyCapacity).toFixed(0)}</strong></span>
        <span>Sprints <strong>{sprintCount}</strong></span>
        {quarterLocked && <span>{formatDate(quarterStart)} to {formatDate(quarterEnd)}</span>}
      </div>
    </div>
  );
}
