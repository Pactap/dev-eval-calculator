import { formatDate } from "../utils";

export function QuarterConfig({
  quarterStart, quarterEnd, quarterBase, dailyCapacity,
  quarterLocked, totalWorkingDays, dailyRate, sprintCount,
  onChangeStart, onChangeEnd, onChangeBase, onChangeCapacity, onToggleLock,
}) {
  const canLock = quarterStart && quarterEnd;

  return (
    <div className={`card quarter-config${quarterLocked ? " quarter-config--locked" : ""}`}>
      <div className="quarter-config__header">
        <div className="quarter-config__title-group">
          <span className="quarter-config__title">Quarter configuration</span>
          {quarterLocked && <span className="badge">LOCKED</span>}
        </div>
        <button
          className={`btn${quarterLocked ? " btn--primary" : ""}`}
          onClick={() => { if (!quarterLocked && !canLock) return; onToggleLock(); }}
        >
          {quarterLocked ? "Unlock Quarter" : "Lock Quarter"}
        </button>
      </div>

      <div className="quarter-config__inputs">
        <div className="quarter-config__field">
          <label className="label">Quarter start</label>
          <input type="date" value={quarterStart} disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeStart(e.target.value)} />
        </div>
        <div className="quarter-config__field">
          <label className="label">Quarter end</label>
          <input type="date" value={quarterEnd} disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeEnd(e.target.value)} />
        </div>
        <div className="quarter-config__field--sm">
          <label className="label">Base score</label>
          <input type="number" value={quarterBase} disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeBase(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="quarter-config__field--sm">
          <label className="label">Capacity (hrs/day)</label>
          <input type="number" value={dailyCapacity} disabled={quarterLocked}
            className={`input${quarterLocked ? " input--disabled" : ""}`}
            onChange={e => onChangeCapacity(parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <div className="flex-row--stats">
        <span>Working days: <strong>{totalWorkingDays}</strong></span>
        <span className="stat-sep">|</span>
        <span>Daily rate: <strong className="mono">{dailyRate.toFixed(4)}</strong> pts/day</span>
        <span className="stat-sep">|</span>
        <span>Sprints: <strong>{sprintCount}</strong></span>
        {quarterLocked && <>
          <span className="stat-sep">|</span>
          <span>{formatDate(quarterStart)} → {formatDate(quarterEnd)}</span>
        </>}
      </div>
    </div>
  );
}
