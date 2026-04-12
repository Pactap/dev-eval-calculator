/**
 * Find the matching reward band for a given value.
 */
export function getBand(value, bands) {
  for (const band of bands) {
    if (value >= band.min && value < band.max) return band;
  }
  return bands[bands.length - 1];
}

/**
 * Count working days (Mon–Fri) between two date strings (inclusive).
 */
export function countWorkingDays(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s) || isNaN(e) || s > e) return 0;
  let count = 0;
  const d = new Date(s);
  while (d <= e) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/**
 * Format a date string as "Mar 31" style.
 */
export function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
