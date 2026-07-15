import { summarizeAvailability } from "../availability.js";
import { formatDate } from "../utils.js";

/**
 * Constructive, non-punitive summary of the developer's time-off context:
 * company holidays (weekend ones flagged as no-impact), any restricted holiday
 * taken, and how that time away dilutes the pro-rata point pool — framed as
 * context for the score, never as fault. Mirrors the PDF report's section.
 */
export function AvailabilityPanel({ quarterStart, quarterEnd, holidays, sprints, totalWorkingDays, dailyCapacity, hasDevId }) {
  const a = summarizeAvailability({ quarterStart, quarterEnd, holidays, sprints });
  const rh = a.restrictedHolidays[0]; // at most one per calendar year

  // Nothing worth a panel until there's a period and some time-off context.
  if (!quarterStart || !quarterEnd) return null;
  if (a.companyHolidays.length === 0 && a.restrictedHolidays.length === 0) return null;

  const dilutedHrs = a.dilutedDays * (Number(dailyCapacity) || 0);

  return (
    <section className="card availability" aria-label="Availability and time off">
      <div className="availability__head">
        <div>
          <div className="eyebrow">Availability &amp; time off</div>
          <h2>Holidays and approved leave</h2>
        </div>
        <span className="availability__hint">Context for the score — not a deduction against the developer</span>
      </div>

      <div className="availability__grid">
        <div className="availability__block">
          <div className="availability__label">Company holidays in period</div>
          {a.companyHolidays.length ? (
            <div className="availability__chips">
              {a.companyHolidays.map(h => (
                <span key={h.date} className={`avail-chip${h.weekend ? " avail-chip--muted" : ""}`}>
                  {formatDate(h.date)}{h.weekend && <span className="avail-chip__tag">weekend · no impact</span>}
                </span>
              ))}
            </div>
          ) : (
            <div className="availability__none">None</div>
          )}
        </div>

        <div className="availability__block">
          <div className="availability__label">Restricted holiday <span className="availability__sub">(1 / calendar year)</span></div>
          {rh ? (
            <div className="availability__chips">
              <span className="avail-chip avail-chip--accent">
                {formatDate(rh.date)}{rh.sprintName ? <span className="avail-chip__tag">{rh.sprintName}</span> : null}
              </span>
            </div>
          ) : (
            <div className="availability__none">None taken{hasDevId ? "" : " · add an Employee ID to track across quarters"}</div>
          )}
        </div>
      </div>

      <p className="availability__note">
        {a.dilutedDays > 0 ? (
          <>
            {a.dilutedDays} productive day{a.dilutedDays === 1 ? "" : "s"} (~{dilutedHrs.toFixed(0)} hrs) {a.dilutedDays === 1 ? "was" : "were"} unavailable due to holidays and approved leave.
            Scoring is <strong>pro-rata to productive days</strong>, so this time away reduces the point pool proportionally and is
            <strong> not</strong> counted as underperformance — measured per-day performance is unaffected.
            {a.weekendHolidays > 0 && ` ${a.weekendHolidays} holiday${a.weekendHolidays === 1 ? "" : "s"} fell on a weekend and had no additional impact.`}
          </>
        ) : (
          <>All recorded holidays fell on weekends, which are already non-working — they had no additional impact on productive days or the score.</>
        )}
      </p>
    </section>
  );
}
