import { useState } from "react";
import { useConfig } from "../configStore.jsx";
import { formatDate, isWeekend } from "../utils.js";

// Admin-declared calendar data spans many years; a single year is shown at a time.
const YEARS = Array.from({ length: 2050 - 2025 + 1 }, (_, i) => 2025 + i);

const yearOf = (iso) => String(iso || "").slice(0, 4);

export function HolidayManager({ defaultYear }) {
  const { config, updateKey, unlocked } = useConfig();
  const holidays = config.holidays || [];
  const holidayNames = config.holidayNames || {};
  const pool = config.restrictedHolidayPool || [];

  const initialYear = String(defaultYear || new Date().getFullYear());
  const [year, setYear] = useState(YEARS.map(String).includes(initialYear) ? initialYear : "2026");

  const [newHoliday, setNewHoliday] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newRhDate, setNewRhDate] = useState("");
  const [newRhLabel, setNewRhLabel] = useState("");
  const [error, setError] = useState("");

  const yearMin = `${year}-01-01`;
  const yearMax = `${year}-12-31`;

  const holidaysThisYear = holidays.filter((d) => yearOf(d) === year).sort();
  const poolThisYear = pool.filter((e) => yearOf(e.date) === year).sort((a, b) => a.date.localeCompare(b.date));

  const addHoliday = () => {
    if (!newHoliday) return;
    if (yearOf(newHoliday) !== year) { setError(`Pick a date in ${year}.`); return; }
    if (holidays.includes(newHoliday)) { setError("That date is already a company holiday."); return; }
    if (pool.some((e) => e.date === newHoliday)) { setError("That date is in the restricted-holiday pool — remove it there first."); return; }
    updateKey("holidays", [...holidays, newHoliday]);
    if (newHolidayName.trim()) updateKey("holidayNames", { ...holidayNames, [newHoliday]: newHolidayName.trim() });
    setNewHoliday(""); setNewHolidayName(""); setError("");
  };

  const removeHoliday = (date) => {
    updateKey("holidays", holidays.filter((d) => d !== date));
    if (holidayNames[date]) {
      const next = { ...holidayNames };
      delete next[date];
      updateKey("holidayNames", next);
    }
  };

  const addRh = () => {
    if (!newRhDate) return;
    if (yearOf(newRhDate) !== year) { setError(`Pick a date in ${year}.`); return; }
    if (!newRhLabel.trim()) { setError("Give the restricted holiday a name (e.g. Holi)."); return; }
    if (pool.some((e) => e.date === newRhDate)) { setError("That date is already in the restricted-holiday pool."); return; }
    if (holidays.includes(newRhDate)) { setError("That date is already a company holiday — everyone is off, so it can't be a restricted holiday."); return; }
    updateKey("restrictedHolidayPool", [...pool, { date: newRhDate, label: newRhLabel.trim() }]);
    setNewRhDate(""); setNewRhLabel(""); setError("");
  };

  const removeRh = (date) => {
    updateKey("restrictedHolidayPool", pool.filter((e) => e.date !== date));
  };

  return (
    <section className="card holiday-manager" aria-label="Holiday calendar">
      <div className="holiday-manager__head">
        <div>
          <div className="eyebrow">Holiday calendar</div>
          <h2>Company &amp; restricted holidays</h2>
        </div>
        <label className="holiday-manager__year">
          <span className="label">Year</span>
          <select className="input" value={year} onChange={(e) => { setYear(e.target.value); setError(""); }}>
            {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </label>
      </div>

      {!unlocked && (
        <div className="holiday-manager__hint">Read-only · unlock in Scoring rules to edit</div>
      )}
      {error && <div className="config-notice config-notice--warn" role="alert">{error}</div>}

      <div className="holiday-manager__cols">
        {/* Company holidays -------------------------------------------------- */}
        <div className="holiday-manager__col">
          <div className="holiday-manager__col-head">
            <h3>Company holidays</h3>
            <span className="holiday-manager__count">{holidaysThisYear.length}</span>
          </div>
          <p className="holiday-manager__desc">Excluded from productive days for everyone. Weekend dates are recorded but have no additional impact.</p>

          {unlocked && (
            <div className="holiday-manager__add">
              <input type="date" className="input" value={newHoliday} min={yearMin} max={yearMax}
                onChange={(e) => setNewHoliday(e.target.value)} aria-label="Company holiday date" />
              <input type="text" className="input" value={newHolidayName} placeholder="Name (optional)"
                onChange={(e) => setNewHolidayName(e.target.value)} aria-label="Company holiday name" />
              <button className="btn btn--sm" onClick={addHoliday} disabled={!newHoliday}>Add</button>
            </div>
          )}

          {holidaysThisYear.length ? (
            <ul className="holiday-manager__list">
              {holidaysThisYear.map((date) => (
                <li key={date} className={`holiday-row${isWeekend(date) ? " holiday-row--weekend" : ""}`}>
                  <span className="holiday-row__date">{formatDate(date)}</span>
                  <span className="holiday-row__name">{holidayNames[date] || <em>Unnamed</em>}</span>
                  {isWeekend(date) && <span className="holiday-row__tag" title="Falls on a weekend — no additional impact">wknd</span>}
                  {unlocked && <button className="holiday-row__x" aria-label={`Remove ${date}`} onClick={() => removeHoliday(date)}>×</button>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="holiday-manager__empty">No company holidays in {year}.</div>
          )}
        </div>

        {/* Restricted holiday pool ------------------------------------------ */}
        <div className="holiday-manager__col">
          <div className="holiday-manager__col-head">
            <h3>Restricted holiday pool</h3>
            <span className="holiday-manager__count">{poolThisYear.length}</span>
          </div>
          <p className="holiday-manager__desc">Optional holidays the admin offers. A developer may avail <strong>one per calendar year</strong>, chosen per sprint.</p>

          {unlocked && (
            <div className="holiday-manager__add">
              <input type="date" className="input" value={newRhDate} min={yearMin} max={yearMax}
                onChange={(e) => setNewRhDate(e.target.value)} aria-label="Restricted holiday date" />
              <input type="text" className="input" value={newRhLabel} placeholder="Name (e.g. Holi)"
                onChange={(e) => setNewRhLabel(e.target.value)} aria-label="Restricted holiday name" />
              <button className="btn btn--sm" onClick={addRh} disabled={!newRhDate}>Add</button>
            </div>
          )}

          {poolThisYear.length ? (
            <ul className="holiday-manager__list">
              {poolThisYear.map((e) => (
                <li key={e.date} className={`holiday-row${isWeekend(e.date) ? " holiday-row--weekend" : ""}`}>
                  <span className="holiday-row__date">{formatDate(e.date)}</span>
                  <span className="holiday-row__name">{e.label}</span>
                  {isWeekend(e.date) && <span className="holiday-row__tag" title="Falls on a weekend — a developer cannot meaningfully avail it">wknd</span>}
                  {unlocked && <button className="holiday-row__x" aria-label={`Remove ${e.date}`} onClick={() => removeRh(e.date)}>×</button>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="holiday-manager__empty">No restricted holidays declared for {year}.</div>
          )}
        </div>
      </div>
    </section>
  );
}
