export function ScoreTable({ result, dailyRate }) {
  const r = result;
  const rows = [
    { n: "Planned Hrs", a: r.phA, b: r.phB.label, m: r.phB.multiplier, v: r.phAch },
    { n: "Code Quality", a: r.cqA, b: r.cqO.label, m: r.cqO.multiplier, v: r.cqAch },
    { n: "Efficiency", a: r.effA, b: r.effB.label, m: r.effB.multiplier, v: r.effAch },
    { n: "Issue Persist", a: r.ipA, b: r.zeroDone ? "40%+ default" : r.ipB.label, m: r.ipB.multiplier, v: r.ipAch },
  ];

  return (
    <div className="score-table">
      <div className="score-table__header">
        <span>Score breakdown</span>
        <strong>{r.total.toFixed(2)}</strong>
      </div>
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
          Base: {r.bp.toFixed(2)} ({r.wd}d x {dailyRate.toFixed(4)})
        </span>
        {r.reop > 0 && <span className="score-table__dual-penalty">Dual penalty active</span>}
      </div>
    </div>
  );
}
