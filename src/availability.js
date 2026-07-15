import { isWeekend } from "./utils.js";

/**
 * Summarize the time-off context of an evaluation for the report — company
 * holidays in the period and restricted holidays taken by the developer.
 * Pure: shared by the in-app Availability panel and the PDF report so both tell
 * the same story. Weekend-dated holidays are surfaced but flagged as no-impact
 * (weekends are already excluded from productive days, so they never double-count).
 *
 * @returns {{
 *   companyHolidays: {date: string, name: string, weekend: boolean}[],
 *   impactingHolidays: number,   // weekday company holidays that actually reduce productive days
 *   weekendHolidays: number,     // company holidays that fell on a weekend (no impact)
 *   restrictedHolidays: {date: string, label: string, sprintName: string, weekend: boolean}[],
 *   dilutedDays: number,         // productive days removed from the pool by time off
 * }}
 */
export function summarizeAvailability({ quarterStart, quarterEnd, holidays = [], holidayNames = {}, restrictedHolidayPool = [], sprints = [] }) {
  // ISO date strings compare lexicographically, so a plain string range test is correct.
  const inWindow = (iso) =>
    (!quarterStart || iso >= quarterStart) && (!quarterEnd || iso <= quarterEnd);

  const companyHolidays = [...new Set(holidays)]
    .filter(inWindow)
    .sort()
    .map((date) => ({ date, name: holidayNames[date] || "", weekend: isWeekend(date) }));

  const weekendHolidays = companyHolidays.filter((h) => h.weekend).length;
  const impactingHolidays = companyHolidays.length - weekendHolidays;

  const poolLabel = (date) => {
    const hit = restrictedHolidayPool.find((e) => e.date === date);
    return hit ? hit.label : "";
  };

  const restrictedHolidays = sprints
    .filter((s) => s && s.restrictedHoliday)
    .map((s) => ({
      date: s.restrictedHoliday,
      label: poolLabel(s.restrictedHoliday),
      sprintName: s.name || "",
      weekend: isWeekend(s.restrictedHoliday),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dilutedDays = impactingHolidays + restrictedHolidays.filter((r) => !r.weekend).length;

  return { companyHolidays, impactingHolidays, weekendHolidays, restrictedHolidays, dilutedDays };
}
