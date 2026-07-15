export function QuarterlySummary({ sprints, sprintResults, summary, totalWorkingDays, quarterBase }) {
  const stats = [
    { l: "Sprints", v: sprints.length },
    { l: "Days used", v: `${summary.tw} / ${totalWorkingDays}` },
    { l: "Base used", v: `${summary.tb.toFixed(1)} / ${quarterBase}` },
  ];

  return (
    <div className="q-summary">
      <div className="q-summary__header">
        <div>
          <div className="eyebrow">Quarter Summary</div>
          <h2 className="q-summary__title">Executive rollup</h2>
        </div>
        <div className={`q-summary__total-value ${summary.ta >= summary.tb ? "q-summary__total-value--positive" : "q-summary__total-value--negative"}`}>
          {summary.ta.toFixed(2)}
        </div>
      </div>

      <div className="q-summary__stats">
        {stats.map((m, i) => (
          <div key={i} className="q-summary__stat-card">
            <div className="q-summary__stat-label">{m.l}</div>
            <div className="q-summary__stat-value">{m.v}</div>
          </div>
        ))}
      </div>

      <div className="q-summary__table-wrap">
        <table>
          <thead>
            <tr>
              {["Sprint", "Days", "Base", "Achieved", "Status"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sprintResults.map((r, i) => (
              <tr key={i}>
                <td className="q-summary__name">{r.name || `Sprint ${i + 1}`}</td>
                <td className="mono">{r.leaks ? `${r.wdInQuarter}/${r.wdTotal}` : r.wd}</td>
                <td className="mono">{r.bp.toFixed(2)}</td>
                <td className={r.total >= r.bp ? "q-summary__achieved--positive" : "q-summary__achieved--negative"}>
                  {r.wd > 0 ? r.total.toFixed(2) : "-"}
                </td>
                <td>
                  {sprints[i].locked
                    ? <span className="q-summary__locked-badge">Locked</span>
                    : <span className="q-summary__open-badge">Open</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="q-summary__footer">
        <div>
          <div className="q-summary__total-label">Remaining allocation</div>
          <div className="q-summary__remaining">{summary.rb.toFixed(2)} pts / {summary.rw} days</div>
        </div>
        <div className="q-summary__remaining">Quarter base {quarterBase}</div>
      </div>
    </div>
  );
}
