/**
 * Find the matching reward band for a given value.
 */
export function getBand(value, bands) {
  if (!bands || bands.length === 0) return { label: "—", min: 0, max: 0, multiplier: 0 };
  for (const band of bands) {
    if (value >= band.min && value < band.max) return band;
  }
  return bands[bands.length - 1];
}

/**
 * Convert a Date to a local "YYYY-MM-DD" string (matches <input type="date"> values).
 */
export function toISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse a "YYYY-MM-DD" string as a LOCAL-time date.
 * `new Date("2026-06-25")` parses as UTC midnight, which shifts the calendar
 * day in negative-UTC timezones; building from components keeps it local.
 */
export function parseLocalDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Count Saturdays + Sundays between two ISO date strings (inclusive). Used to show
 * the weekend portion of a sprint's non-working days.
 */
export function countWeekends(startStr, endStr) {
  const s = parseLocalDate(startStr);
  const e = parseLocalDate(endStr);
  if (!s || !e || s > e) return 0;
  let n = 0;
  const d = new Date(s);
  while (d <= e) {
    const day = d.getDay();
    if (day === 0 || day === 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

/**
 * True if an ISO "YYYY-MM-DD" date falls on a Saturday or Sunday (parsed local time).
 * Weekends are already non-productive, so a holiday landing on one has no scoring impact.
 */
export function isWeekend(str) {
  const d = parseLocalDate(str);
  if (!d) return false;
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Count productive days between two date strings (inclusive):
 * weekdays (Mon–Fri) that are NOT in the holidays list.
 * @param {string[]} holidays - array of "YYYY-MM-DD" strings.
 */
export function countWorkingDays(startStr, endStr, holidays = []) {
  if (!startStr || !endStr) return 0;
  const s = parseLocalDate(startStr);
  const e = parseLocalDate(endStr);
  if (!s || !e || isNaN(s) || isNaN(e) || s > e) return 0;
  const holidaySet = holidays instanceof Set ? holidays : new Set(holidays);
  let count = 0;
  const d = new Date(s);
  while (d <= e) {
    const day = d.getDay();
    if (day !== 0 && day !== 6 && !holidaySet.has(toISO(d))) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/**
 * Productive days of a sprint that fall inside the quarter window.
 * Returns the overlap of [sprintStart, sprintEnd] and [quarterStart, quarterEnd],
 * counting weekdays minus holidays. If the quarter window is not fully set,
 * falls back to the full sprint count (no clipping).
 */
export function countWorkingDaysInWindow(sprintStart, sprintEnd, quarterStart, quarterEnd, holidays = []) {
  if (!sprintStart || !sprintEnd) return 0;
  if (!quarterStart || !quarterEnd) return countWorkingDays(sprintStart, sprintEnd, holidays);
  // ISO date strings compare correctly with lexicographic max/min.
  const lo = sprintStart > quarterStart ? sprintStart : quarterStart;
  const hi = sprintEnd < quarterEnd ? sprintEnd : quarterEnd;
  if (lo > hi) return 0;
  return countWorkingDays(lo, hi, holidays);
}

/**
 * Split a date range into consecutive fixed-length sprint windows that SHARE
 * their boundary date: each sprint begins on the day the previous one ends
 * (e.g. Sprint 1 ends 2026-08-09, Sprint 2 starts 2026-08-09). The final window
 * is clamped to the range end. Returns [{ name, startDate, endDate }] ISO strings.
 */
export function generateSprintPeriods(startStr, endStr, lengthDays = 14) {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  if (!start || !end || start > end || lengthDays < 1) return [];
  const periods = [];
  const cursor = new Date(start);
  let n = 1;
  while (cursor <= end) {
    const wStart = new Date(cursor);
    const wEnd = new Date(cursor);
    wEnd.setDate(wEnd.getDate() + (lengthDays - 1));
    if (wEnd >= end) {                                   // last window: clamp and stop
      wEnd.setTime(end.getTime());
      periods.push({ name: `Sprint ${n}`, startDate: toISO(wStart), endDate: toISO(wEnd) });
      break;
    }
    periods.push({ name: `Sprint ${n}`, startDate: toISO(wStart), endDate: toISO(wEnd) });
    if (wEnd.getTime() <= cursor.getTime()) break;       // safety: no progress (lengthDays < 2)
    cursor.setTime(wEnd.getTime());                      // next sprint starts on this end date
    n++;
  }
  return periods;
}

/**
 * Add `n` days to an ISO "YYYY-MM-DD" string (local time). Returns the input unchanged if unparseable.
 */
export function addDaysISO(str, n) {
  const d = parseLocalDate(str);
  if (!d) return str;
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/**
 * The first day actually counted for a sprint. When a sprint starts on the
 * previous sprint's end date (shared boundary), that shared day is counted in
 * the EARLIER sprint only, so this sprint's window begins the next day. Used for
 * both day-counting and validating that a restricted holiday lands on a day this
 * sprint actually owns.
 */
export function effectiveCountStart(startDate, prevEndDate) {
  const shares = Boolean(startDate && prevEndDate && startDate === prevEndDate);
  return shares ? addDaysISO(startDate, 1) : startDate;
}

/**
 * Given an evaluation-period start date, return the auto-suggested end date:
 * `months` calendar months later, minus one day (e.g. 2026-04-01 → 2026-06-30).
 * Empty string for invalid input. Always editable before the period is locked.
 */
export function quarterEndFrom(startStr, months = 3) {
  const s = parseLocalDate(startStr);
  if (!s) return "";
  const d = new Date(s.getFullYear(), s.getMonth() + months, s.getDate());
  d.setDate(d.getDate() - 1);
  return toISO(d);
}

/**
 * Sanitize text for jsPDF's built-in Helvetica (WinAnsi/Latin-1). Typographic
 * glyphs like → — · × … are not encodable and corrupt the whole run, so map
 * them to ASCII and replace anything else outside Latin-1 with '?'.
 */
export function sanitizePdfText(s) {
  return String(s ?? "")
    .replace(/→/g, "->")            // →
    .replace(/[–—]/g, "-")     // – —
    .replace(/·/g, "|")             // ·
    .replace(/×/g, "x")             // ×
    .replace(/…/g, "...")           // …
    .replace(/[‘’]/g, "'")     // ‘ ’
    .replace(/[“”]/g, '"')     // “ ”
    .replace(/[^\x00-\xFF]/g, "?");      // any remaining non-Latin-1
}

/**
 * Format a date string as "Mar 31" style.
 */
export function formatDate(str) {
  if (!str) return "";
  const d = parseLocalDate(str) || new Date(str);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Weekday name of an ISO "YYYY-MM-DD" date ("2026-03-06" -> "Friday"), local time.
 * Included in exported holiday JSON for readability; derived (not trusted) on import.
 */
export function dayName(str) {
  const d = parseLocalDate(str);
  return d ? DAY_NAMES[d.getDay()] : "";
}
