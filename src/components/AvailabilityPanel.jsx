import { summarizeAvailability } from "../availability.js";
import { formatDate } from "../utils.js";

/**
 * Constructive, non-punitive summary of the developer's time-off context:
 * company holidays (named; weekend ones flagged no-impact), any restricted
 * holiday availed from the admin pool, and how that time away dilutes the
 * pro-rata point pool — framed as context for the score, never as fault.
 * Mirrors the PDF report's section.
 */
export function AvailabilityPanel({ quarterStart, quarterEnd, holidays, holidayNames, restrictedHolidayPool, sprints, totalWorkingDays, dailyCapacity, hasDevId }) {
  const a = summarizeAvailability({ quarterStart, quarterEnd, holidays, holidayNames, restrictedHolidayPool, sprints });
  const rh = a.restrictedHolidays[0]; // at most one per calendar year

  if (!quarterStart || !quarterEnd) return null;
  if (a.companyHolidays.length === 0 && a.restrictedHolidays.length === 0) return null;

  const dilutedHrs = a.dilutedDays * (Number(dailyCapacity) || 0);

  const tiles = [
    { label: "Productive days", value: `${totalWorkingDays}`, sub: "after weekends & holidays" },
    { label: "Company holidays", value: `${a.impactingHolidays}`, sub: a.weekendHolidays ? `+${a.weekendHolidays} on weekend (no impact)` : "in this period" },
    { label: "Restricted holiday", value: rh ? "1 / 1" : "0 / 1", sub: rh ? rh.label || formatDate(rh.date) : "none availed" },
    { label: "Time diluted", value: `${a.dilutedDays}d`, sub: `~${dilutedHrs.toFixed(0)} hrs off the pool` },
  ];

  return (
    <section className="card availability" aria-label="Availability and time off">
      <div className="availability__head">
        <div>
          <div className="eyebrow">Availability &amp; time off</div>
          <h2>Holidays &amp; Approved Leave</h2>
        </div>
        <span className="availability__hint">Context for the score — not a deduction against the developer</span>
      </div>

      <div className="availability__tiles">
        {tiles.map((t) => (
          <div key={t.label} className="avail-tile">
            <div className="avail-tile__label">{t.label}</div>
            <div className="avail-tile__value">{t.value}</div>
            <div className="avail-tile__sub">{t.sub}</div>
          </div>
        ))}
      </div>

      <div className="availability__lists">
        <div className="availability__block">
          <div className="availability__label">Company holidays in period</div>
          {a.companyHolidays.length ? (
            <div className="availability__chips">
              {a.companyHolidays.map((h) => (
                <span key={h.date} className={`avail-chip${h.weekend ? " avail-chip--muted" : ""}`}>
                  <span className="avail-chip__name">{h.name || "Holiday"}</span>
                  <span className="avail-chip__date">{formatDate(h.date)}</span>
                  {h.weekend && <span className="avail-chip__tag">weekend · no impact</span>}
                </span>
              ))}
            </div>
          ) : (
            <div className="availability__none">None</div>
          )}
        </div>

        <div className="availability__block">
          <div className="availability__label">Restricted holiday availed <span className="availability__sub-note">(1 / calendar year)</span></div>
          {rh ? (
            <div className="availability__chips">
              <span className="avail-chip avail-chip--accent">
                <span className="avail-chip__name">{rh.label || "Restricted holiday"}</span>
                <span className="avail-chip__date">{formatDate(rh.date)}</span>
                {rh.sprintName && <span className="avail-chip__tag">{rh.sprintName}</span>}
              </span>
            </div>
          ) : (
            <div className="availability__none">None availed{hasDevId ? "" : " · add an Employee ID to track across quarters"}</div>
          )}
        </div>
      </div>

      <p className="availability__note">
        {a.dilutedDays > 0 ? (
          <>
            {a.dilutedDays} productive day{a.dilutedDays === 1 ? "" : "s"} (~{dilutedHrs.toFixed(0)} hrs) {a.dilutedDays === 1 ? "was" : "were"} unavailable due to holidays and approved leave.
            Scoring is <strong>pro-rata to productive days</strong>, so this time away reduces the point pool proportionally and is
            <strong> not</strong> counted as underperformance — measured per-day performance is unaffected.
          </>
        ) : (
          <>All recorded holidays fell on weekends, which are already non-working — they had no additional impact on productive days or the score.</>
        )}
      </p>
    </section>
  );
}
