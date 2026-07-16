import { useConfig } from "../configStore.jsx";
import { dayName, formatDate } from "../utils.js";

/**
 * At-a-glance table of every developer's recorded restricted-holiday usage
 * (one per developer per calendar year). Read-only unless unlocked; removing a
 * row frees that developer's quota for the year. Bulk edits go through the
 * Import & export panel.
 */
export function DevUsagePanel() {
  const { rhLedger, releaseRh, unlocked } = useConfig();

  const rows = [];
  Object.keys(rhLedger || {}).forEach((devKey) => {
    const byYear = rhLedger[devKey] || {};
    Object.keys(byYear).forEach((year) => {
      const e = byYear[year] || {};
      rows.push({ devKey, year, empId: e.empId || devKey, date: e.date || "", name: e.name || e.label || "" });
    });
  });
  rows.sort((a, b) => (a.empId + a.year).localeCompare(b.empId + b.year));

  return (
    <section className="card dev-usage" aria-label="Developer restricted-holiday usage">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Developer usage</div>
          <h2>Restricted Holidays Taken</h2>
        </div>
        <span className="panel-heading__meta">{rows.length} record{rows.length === 1 ? "" : "s"}</span>
      </div>

      {rows.length ? (
        <div className="dev-usage__table-wrap">
          <table className="dev-usage__table">
            <thead>
              <tr>
                <th>Employee ID</th><th>Year</th><th>Date</th><th>Day</th><th>Holiday</th>
                {unlocked && <th aria-label="Actions"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.devKey}-${r.year}`}>
                  <td className="mono">{r.empId}</td>
                  <td className="mono">{r.year}</td>
                  <td className="mono">{r.date ? formatDate(r.date) : "—"}</td>
                  <td>{r.date ? dayName(r.date) : "—"}</td>
                  <td>{r.name || <em>Unnamed</em>}</td>
                  {unlocked && (
                    <td className="dev-usage__actions">
                      <button className="btn btn--xs btn--danger" title="Free this year's quota"
                        onClick={() => releaseRh(r.devKey, r.year)}>Remove</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dev-usage__empty">No restricted holidays recorded yet. Developers avail them per sprint, or import in bulk above.</div>
      )}
    </section>
  );
}
