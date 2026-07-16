export function ScoreTable({ result, dailyRate }) {
  const r = result;
  // Derive the shown rate from the (possibly frozen) result so a locked card's
  // "days x rate" always reconciles with its frozen base, even after dailyRate changes.
  const shownRate = r.wdInQuarter > 0 ? r.bp / r.wdInQuarter : dailyRate;
  // Use effective multipliers (already zeroed when there's no activity) so
  // Alloc x Mult = Achieved stays consistent in every row.
  const rows = [
    { n: "Planned Hrs", a: r.phA, b: r.phB.label, m: r.phM, v: r.phAch },
    { n: "Code Quality", a: r.cqA, b: r.cqO.label, m: r.cqM, v: r.cqAch },
    { n: "Efficiency", a: r.effA, b: r.noAssigned ? "no tickets" : r.effB.label, m: r.effM, v: r.effAch },
    { n: "Issue Persist", a: r.ipA, b: r.zeroClosed ? "40%+ default" : r.ipB.label, m: r.ipM, v: r.ipAch },
  ];

  return (
    <div className="score-table">
      <div className="score-table__header">
        <span>Score breakdown</span>
        <strong>{r.total.toFixed(2)}</strong>
      </div>
      {r.noActivity && (
        <div className="score-table__notice">No hours or tickets recorded — sprint not scored.</div>
      )}
      <div className="score-table__wrap">
        <table>
          <thead>
            <tr>
              {["Param", "Alloc", "Band", "Mult", "Achieved"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="score-table__param">{row.n}</td>
                <td className="score-table__mono">{row.a.toFixed(2)}</td>
                <td className="score-table__band">{row.b}</td>
                <td className="score-table__mono">{row.m.toFixed(2)}x</td>
                <td className={row.v >= row.a ? "score-table__achieved--positive" : "score-table__achieved--negative"}>
                  {row.v.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="score-table__footer">
        <span className="score-table__base">
          Base: {r.bp.toFixed(2)} ({r.wdInQuarter}{r.leaks ? " in-qtr" : ""}d x {shownRate.toFixed(4)})
        </span>
        {r.reop > 0 && <span className="score-table__dual-penalty">Dual penalty active</span>}
      </div>
    </div>
  );
}
