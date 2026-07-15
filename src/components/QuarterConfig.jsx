import { useState } from "react";
import { formatDate, parseLocalDate } from "../utils.js";
import { useConfig } from "../configStore.jsx";

export function QuarterConfig({
  quarterStart, quarterEnd, quarterBase, dailyCapacity,
  quarterLocked, totalWorkingDays, dailyRate, sprintCount,
  holidays = [], onChangeHolidays,
  onChangeStart, onChangeEnd, onChangeBase, onChangeCapacity, onToggleLock,
}) {
  const { unlocked } = useConfig();          // holidays are an evaluation parameter -> passkey-gated
  const holidaysEditable = unlocked && !quarterLocked;
  const canLock = quarterStart && quarterEnd;
  const [newHoliday, setNewHoliday] = useState("");
  const [holidayError, setHolidayError] = useState("");

  const sortedHolidays = [...holidays].sort();

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

  const addHoliday = () => {
    if (!newHoliday) return;
    if (holidays.includes(newHoliday)) {
      setHolidayError("That date is already marked as a holiday.");
      return;
    }
    const parsed = parseLocalDate(newHoliday);
    const day = parsed ? parsed.getDay() : -1;
    if (day === 0 || day === 6) {
      setHolidayError("That date is a weekend — already excluded.");
      return;
    }
    setHolidayError("");
    onChangeHolidays([...holidays, newHoliday]);
    setNewHoliday("");
  };

  const removeHoliday = (date) => {
    onChangeHolidays(holidays.filter(h => h !== date));
  };

  return (
    <div className={`card quarter-config${quarterLocked ? " quarter-config--locked" : ""}`}>
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Quarter Control</div>
          <h2>Evaluation period</h2>
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
          <label className="label">Quarter start</label>
          <input
            type="date"
            value={quarterStart}
            disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeStart(e.target.value)}
          />
        </div>
        <div className="quarter-config__field">
          <label className="label">Quarter end</label>
          <input
            type="date"
            value={quarterEnd}
            disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeEnd(e.target.value)}
          />
        </div>
        <div className="quarter-config__field--sm">
          <label className="label">Base score</label>
          <input
            type="number"
            value={quarterBase}
            disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeBase(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="quarter-config__field--sm">
          <label className="label">Capacity (hrs/day)</label>
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

      <div className="quarter-config__holidays">
        <div className="quarter-config__holidays-head">
          <label className="label">Holidays (excluded from productive days)</label>
          <span className="quarter-config__holidays-count">{holidays.length}</span>
        </div>
        {holidaysEditable && (
          <div className="quarter-config__holidays-add">
            <input
              type="date"
              value={newHoliday}
              min={quarterStart || undefined}
              className="input"
              onChange={e => setNewHoliday(e.target.value)}
            />
            <button className="btn btn--sm" onClick={addHoliday} disabled={!newHoliday}>Add holiday</button>
          </div>
        )}
        {!unlocked && !quarterLocked && (
          <div className="config-notice config-notice--warn">
            Unlock in Scoring rules (passkey) to edit holidays, then publish.
          </div>
        )}
        {holidayError && <div className="config-notice config-notice--warn" role="alert">{holidayError}</div>}
        {sortedHolidays.length > 0 && (
          <div className="quarter-config__holidays-list">
            {sortedHolidays.map(date => (
              <span key={date} className="holiday-chip">
                {formatDate(date)}
                {holidaysEditable && (
                  <button className="holiday-chip__x" aria-label={`Remove ${date}`} onClick={() => removeHoliday(date)}>×</button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="quarter-config__stats">
        <span>Work week <strong>Mon–Fri</strong></span>
        <span>Productive days <strong>{totalWorkingDays}</strong></span>
        <span>Daily rate <strong className="mono">{dailyRate.toFixed(4)}</strong></span>
        <span>Available hrs <strong>{(totalWorkingDays * dailyCapacity).toFixed(0)}</strong></span>
        <span>Sprints <strong>{sprintCount}</strong></span>
        {quarterLocked && <span>{formatDate(quarterStart)} to {formatDate(quarterEnd)}</span>}
      </div>
    </div>
  );
}
