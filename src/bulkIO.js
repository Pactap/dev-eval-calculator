// Pure JSON import/export for the admin-managed calendar data, so holidays, the
// restricted-holiday pool, and per-developer usage can be managed at scale by
// uploading / downloading files. Each row carries { date, day, name }; `day` is
// derived from the date on export and re-derived (not trusted) on import.

import { dayName, parseLocalDate } from "./utils.js";
import { normalizeEmpId, canonicalEmpId } from "./restrictedHolidays.js";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isISO = (d) => typeof d === "string" && ISO.test(d) && !!parseLocalDate(d);

/* ---------------- Company holidays ---------------- */
// config.holidays: string[]  +  config.holidayNames: { [date]: name }

export function exportCompanyHolidays(holidays = [], holidayNames = {}) {
  return {
    type: "companyHolidays",
    version: 1,
    holidays: [...new Set(holidays)].sort().map((date) => ({
      date, day: dayName(date), name: holidayNames[date] || "",
    })),
  };
}

export function importCompanyHolidays(json) {
  const arr = Array.isArray(json) ? json : (json && json.holidays);
  if (!Array.isArray(arr)) throw new Error("Expected a company-holidays file with a `holidays` array.");
  const holidays = [];
  const holidayNames = {};
  arr.forEach((e, i) => {
    const date = typeof e === "string" ? e : (e && e.date);
    if (!isISO(date)) throw new Error(`Row ${i + 1}: date must be a real "YYYY-MM-DD".`);
    if (!holidays.includes(date)) holidays.push(date);       // dedupe
    const name = e && typeof e.name === "string" ? e.name.trim() : "";
    if (name) holidayNames[date] = name;
  });
  holidays.sort();
  return { holidays, holidayNames };
}

/* ---------------- Restricted-holiday pool ---------------- */
// config.restrictedHolidayPool: [{ date, label }]

export function exportRestrictedPool(pool = []) {
  return {
    type: "restrictedHolidayPool",
    version: 1,
    restrictedHolidays: [...pool]
      .filter((e) => e && e.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ date: e.date, day: dayName(e.date), name: e.label || "" })),
  };
}

export function importRestrictedPool(json) {
  const arr = Array.isArray(json) ? json : (json && (json.restrictedHolidays || json.restrictedHolidayPool));
  if (!Array.isArray(arr)) throw new Error("Expected a restricted-holiday file with a `restrictedHolidays` array.");
  const seen = new Set();
  const pool = [];
  arr.forEach((e, i) => {
    const date = e && e.date;
    if (!isISO(date)) throw new Error(`Row ${i + 1}: date must be a real "YYYY-MM-DD".`);
    const label = e && typeof e.name === "string" ? e.name.trim()
      : (e && typeof e.label === "string" ? e.label.trim() : "");
    if (!label) throw new Error(`Row ${i + 1}: a name is required for a restricted holiday.`);
    if (seen.has(date)) return;                              // dedupe by date
    seen.add(date);
    pool.push({ date, label });
  });
  pool.sort((a, b) => a.date.localeCompare(b.date));
  return pool;
}

/* ---------------- Developer usage (the restricted-holiday ledger) ---------------- */
// ledger: { [devKey]: { [year]: { date, name?, empId?, sprintName? } } }

export function exportDeveloperUsage(ledger = {}) {
  const usage = [];
  Object.keys(ledger).forEach((devKey) => {
    const byYear = ledger[devKey] || {};
    Object.keys(byYear).forEach((year) => {
      const e = byYear[year] || {};
      usage.push({
        employeeId: canonicalEmpId(e.empId || devKey),
        date: e.date || "",
        day: e.date ? dayName(e.date) : "",
        name: e.name || e.label || "",
        year,
      });
    });
  });
  usage.sort((a, b) => (a.employeeId + a.year).localeCompare(b.employeeId + b.year));
  return { type: "developerUsage", version: 1, usage };
}

/* ---------------- Sample templates (multi-entry, for admins to follow) ---------------- */

const SAMPLE_COMPANY = [
  ["2026-01-01", "New Year's Day"], ["2026-01-26", "Republic Day"], ["2026-08-15", "Independence Day"],
  ["2026-10-02", "Gandhi Jayanti"], ["2026-11-09", "Diwali"], ["2026-12-25", "Christmas"],
];
const SAMPLE_RESTRICTED = [
  ["2026-03-06", "Holi"], ["2026-04-03", "Good Friday"], ["2026-08-28", "Raksha Bandhan"], ["2026-11-10", "Bhai Dooj"],
];
const SAMPLE_USAGE = [
  ["PT-1042", "2026-03-06", "Holi"], ["PT-2087", "2026-08-28", "Raksha Bandhan"], ["ENG-315", "2026-04-03", "Good Friday"],
];

export const sampleCompanyHolidays = () => ({
  type: "companyHolidays", version: 1,
  holidays: SAMPLE_COMPANY.map(([date, name]) => ({ date, day: dayName(date), name })),
});
export const sampleRestrictedHolidays = () => ({
  type: "restrictedHolidayPool", version: 1,
  restrictedHolidays: SAMPLE_RESTRICTED.map(([date, name]) => ({ date, day: dayName(date), name })),
});
export const sampleDeveloperUsage = () => ({
  type: "developerUsage", version: 1,
  usage: SAMPLE_USAGE.map(([employeeId, date, name]) => ({ employeeId, date, day: dayName(date), name, year: date.slice(0, 4) })),
});

export function importDeveloperUsage(json) {
  const arr = Array.isArray(json) ? json : (json && json.usage);
  if (!Array.isArray(arr)) throw new Error("Expected a developer-usage file with a `usage` array.");
  const ledger = {};
  arr.forEach((e, i) => {
    const rawId = e && (e.employeeId ?? e.empId ?? e.id);
    const devKey = normalizeEmpId(rawId);
    if (!devKey) throw new Error(`Row ${i + 1}: employeeId is required (alphanumeric).`);
    const date = e && e.date;
    if (!isISO(date)) throw new Error(`Row ${i + 1}: date must be a real "YYYY-MM-DD".`);
    const year = date.slice(0, 4);
    const name = e && typeof e.name === "string" ? e.name.trim() : "";
    ledger[devKey] = ledger[devKey] || {};
    // Enforce the model on import: one restricted holiday per developer per year.
    if (ledger[devKey][year] && ledger[devKey][year].date !== date) {
      throw new Error(`Row ${i + 1}: ${rawId} already has a ${year} restricted holiday (${ledger[devKey][year].date}). Only one per calendar year.`);
    }
    ledger[devKey][year] = { date, name, empId: canonicalEmpId(rawId) };
  });
  return ledger;
}
