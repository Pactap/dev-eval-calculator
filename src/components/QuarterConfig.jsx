import { formatDate } from "../utils.js";

export function QuarterConfig({
  quarterStart, quarterEnd, quarterBase, dailyCapacity,
  quarterLocked, totalWorkingDays, dailyRate, sprintCount,
  onChangeStart, onChangeEnd, onChangeBase, onChangeCapacity, onToggleLock,
}) {
  const canLock = quarterStart && quarterEnd;

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
          <label className="label">Capacity</label>
          <input
            type="number"
            value={dailyCapacity}
            disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeCapacity(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="quarter-config__stats">
        <span>Working days <strong>{totalWorkingDays}</strong></span>
        <span>Daily rate <strong className="mono">{dailyRate.toFixed(4)}</strong></span>
        <span>Sprints <strong>{sprintCount}</strong></span>
        {quarterLocked && <span>{formatDate(quarterStart)} to {formatDate(quarterEnd)}</span>}
      </div>
    </div>
  );
}
