import { useState } from "react";
import { useConfig } from "../configStore.jsx";
import { formatDate } from "../utils.js";
import { normalizeEmpId, rhConflicts } from "../restrictedHolidays.js";

/**
 * Manage each developer's restricted holiday (one per calendar year) directly in
 * the Admin tab. Adds, edits and removals go through the config store's
 * claimRh / releaseRh, which are server-authoritative (Cloudflare Worker + KV)
 * when a backend is configured, so the ledger stays consistent across machines.
 * This panel only renders when unlocked, so every write is passkey-protected.
 */
export function DevUsagePanel() {
  const { config, rhLedger, rhUsage, claimRh, releaseRh } = useConfig();
  const pool = [...(config.restrictedHolidayPool || [])].sort((a, b) => a.date.localeCompare(b.date));

  const [empId, setEmpId] = useState("");
  const [selDate, setSelDate] = useState("");
  const [status, setStatus] = useState(null); // { type, msg }
  const [busy, setBusy] = useState(false);

  const rows = [];
  Object.keys(rhLedger || {}).forEach((devKey) => {
    const byYear = rhLedger[devKey] || {};
    Object.keys(byYear).forEach((year) => {
      const e = byYear[year] || {};
      rows.push({ devKey, year, empId: e.empId || devKey, date: e.date || "", name: e.name || e.label || "" });
    });
  });
  rows.sort((a, b) => (a.empId + a.year).localeCompare(b.empId + b.year));

  const optionLabel = (e) => `${e.label} · ${formatDate(e.date)} · ${e.date.slice(0, 4)}`;

  const add = async () => {
    const devKey = normalizeEmpId(empId);
    if (!devKey) { setStatus({ type: "err", msg: "Employee ID is required (alphanumeric)." }); return; }
    const entry = pool.find((e) => e.date === selDate);
    if (!entry) { setStatus({ type: "err", msg: "Pick a declared restricted holiday." }); return; }
    const year = entry.date.slice(0, 4);
    // One per developer per calendar year — pre-check so a duplicate is blocked
    // consistently (the server also enforces this with a 409).
    const existing = rhUsage(devKey, year);
    if (rhConflicts(existing, entry.date)) {
      setStatus({ type: "err", msg: `${empId.trim()} already has a ${year} restricted holiday (${existing.name || formatDate(existing.date)}). Edit or remove the existing row.` });
      return;
    }
    setBusy(true);
    try {
      await claimRh(devKey, year, { date: entry.date, name: entry.label, empId: empId.trim() });
      setEmpId(""); setSelDate("");
      setStatus({ type: "ok", msg: `Recorded ${entry.label} for ${empId.trim()}.` });
    } catch (e) {
      setStatus({ type: "err", msg: e.message });
    } finally { setBusy(false); }
  };

  // Edit: move a developer's restricted holiday to another declared date. Moving to
  // a different year is refused if that year is already taken (no destructive
  // release), and if the claim fails after releasing we restore the original slot —
  // so the developer never loses their recorded restricted holiday.
  const change = async (row, newDate) => {
    if (!newDate || newDate === row.date) return;
    const entry = pool.find((e) => e.date === newDate);
    if (!entry) return;
    const newYear = entry.date.slice(0, 4);
    if (newYear !== row.year) {
      const clash = rhUsage(row.devKey, newYear);
      if (rhConflicts(clash, entry.date)) {
        setStatus({ type: "err", msg: `${row.empId} already has a ${newYear} restricted holiday (${clash.name || formatDate(clash.date)}). Remove it first.` });
        return;
      }
    }
    setBusy(true);
    const original = { date: row.date, name: row.name, empId: row.empId };
    try {
      await releaseRh(row.devKey, row.year);
      await claimRh(row.devKey, newYear, { date: entry.date, name: entry.label, empId: row.empId });
      setStatus({ type: "ok", msg: `Updated ${row.empId}.` });
    } catch (e) {
      // Restore the original slot so the edit is all-or-nothing.
      try { await claimRh(row.devKey, row.year, original); } catch { /* best effort */ }
      setStatus({ type: "err", msg: `Could not update ${row.empId}: ${e.message}` });
    } finally { setBusy(false); }
  };

  const remove = async (row) => {
    setBusy(true);
    try { await releaseRh(row.devKey, row.year); setStatus({ type: "ok", msg: `Cleared ${row.empId} (${row.year}).` }); }
    catch (e) { setStatus({ type: "err", msg: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <section className="card dev-usage" aria-label="Developer restricted holidays">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Developer usage</div>
          <h2>Restricted Holidays Taken</h2>
        </div>
        <span className="panel-heading__meta">{rows.length} record{rows.length === 1 ? "" : "s"}</span>
      </div>

      <p className="dev-usage__desc">
        One restricted holiday per developer per calendar year. Changes sync to the shared server ledger.
        {pool.length === 0 && " Declare restricted holidays above before assigning them."}
      </p>

      <div className="dev-usage__add">
        <input className="input" placeholder="Employee ID (e.g. PT-1042)" value={empId}
          onChange={(e) => setEmpId(e.target.value)} aria-label="Employee ID" />
        <select className="input" value={selDate} onChange={(e) => setSelDate(e.target.value)}
          disabled={!pool.length} aria-label="Restricted holiday">
          <option value="">{pool.length ? "Select restricted holiday" : "No restricted holidays declared"}</option>
          {pool.map((e) => <option key={e.date} value={e.date}>{optionLabel(e)}</option>)}
        </select>
        <button className="btn btn--sm btn--primary" onClick={add} disabled={busy || !empId.trim() || !selDate}>Add</button>
      </div>

      {status && (
        <div className={status.type === "err" ? "settings-panel__error" : "settings-panel__desc"} role="status">
          {status.msg}
        </div>
      )}

      {rows.length ? (
        <div className="dev-usage__table-wrap">
          <table className="dev-usage__table">
            <thead>
              <tr><th>Employee ID</th><th>Year</th><th>Restricted holiday</th><th aria-label="Actions"></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.devKey}-${r.year}`}>
                  <td className="mono">{r.empId}</td>
                  <td className="mono">{r.year}</td>
                  <td>
                    <select className="input dev-usage__row-select" value={r.date}
                      disabled={busy} onChange={(e) => change(r, e.target.value)}>
                      {!pool.some((p) => p.date === r.date) && r.date && (
                        <option value={r.date}>{(r.name || "Holiday")} · {formatDate(r.date)}</option>
                      )}
                      {pool.map((e) => <option key={e.date} value={e.date}>{e.label} · {formatDate(e.date)}</option>)}
                    </select>
                  </td>
                  <td className="dev-usage__actions">
                    <button className="btn btn--xs btn--danger" disabled={busy} onClick={() => remove(r)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dev-usage__empty">No restricted holidays recorded yet. Add one above, or import in bulk.</div>
      )}
    </section>
  );
}
