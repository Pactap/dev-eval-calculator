import test from "node:test";
import assert from "node:assert/strict";

// Minimal localStorage so the restricted-holiday ledger persists within the run.
globalThis.localStorage = (() => {
  let m = {};
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: (k) => { delete m[k]; },
    clear: () => { m = {}; },
  };
})();

import { countWorkingDays, isWeekend, effectiveCountStart, dayName } from "../src/utils.js";
import { summarizeAvailability } from "../src/availability.js";
import { devKeyOf, normalizeEmpId, yearOf, rhUsage, recordRh, clearRh } from "../src/restrictedHolidays.js";
import {
  exportCompanyHolidays, importCompanyHolidays,
  exportRestrictedPool, importRestrictedPool,
  exportDeveloperUsage, importDeveloperUsage,
} from "../src/bulkIO.js";

/* ---------------- isWeekend ---------------- */

test("isWeekend flags Sat/Sun and clears weekdays", () => {
  assert.equal(isWeekend("2026-02-28"), true);  // Saturday
  assert.equal(isWeekend("2026-03-01"), true);  // Sunday
  assert.equal(isWeekend("2026-01-09"), false); // Friday
  assert.equal(isWeekend(""), false);
});

/* ---------------- restricted holiday excludes one sprint day ---------------- */

test("a restricted holiday removes exactly one productive day from a sprint", () => {
  assert.equal(countWorkingDays("2026-03-02", "2026-03-06"), 5);                     // Mon–Fri
  assert.equal(countWorkingDays("2026-03-02", "2026-03-06", ["2026-03-04"]), 4);     // RH on Wed
});

test("a weekend-dated holiday has no impact on productive days (counted once)", () => {
  // 2026-03-07 is a Saturday — already excluded, so adding it changes nothing.
  assert.equal(countWorkingDays("2026-03-02", "2026-03-06", ["2026-03-07"]), 5);
});

/* ---------------- summarizeAvailability ---------------- */

test("summarizeAvailability separates weekday vs weekend holidays and counts dilution", () => {
  const a = summarizeAvailability({
    quarterStart: "2026-01-01",
    quarterEnd: "2026-12-31",
    holidays: ["2026-02-28", "2026-01-09", "2026-02-28"], // Sat (no impact), Fri (impact), dup
    sprints: [
      { name: "Sprint 1", restrictedHoliday: "2026-03-13" }, // Friday
      { name: "Sprint 2", restrictedHoliday: "" },
    ],
  });
  assert.deepEqual(a.companyHolidays, [
    { date: "2026-01-09", name: "", weekend: false },
    { date: "2026-02-28", name: "", weekend: true },
  ]);
  assert.equal(a.weekendHolidays, 1);
  assert.equal(a.impactingHolidays, 1);
  assert.equal(a.restrictedHolidays.length, 1);
  assert.equal(a.restrictedHolidays[0].date, "2026-03-13");
  assert.equal(a.restrictedHolidays[0].sprintName, "Sprint 1");
  assert.equal(a.dilutedDays, 2); // 1 weekday holiday + 1 weekday restricted holiday
});

test("summarizeAvailability attaches company holiday names and restricted-holiday pool labels", () => {
  const a = summarizeAvailability({
    quarterStart: "2026-01-01",
    quarterEnd: "2026-12-31",
    holidays: ["2026-01-09"],
    holidayNames: { "2026-01-09": "Founders Day" },
    restrictedHolidayPool: [{ date: "2026-03-13", label: "Holi" }, { date: "2026-08-15", label: "Independence Day" }],
    sprints: [{ name: "Sprint 1", restrictedHoliday: "2026-03-13" }],
  });
  assert.equal(a.companyHolidays[0].name, "Founders Day");
  assert.equal(a.restrictedHolidays[0].label, "Holi");        // label resolved from the pool
  assert.equal(a.restrictedHolidays[0].date, "2026-03-13");
});

test("summarizeAvailability excludes holidays outside the quarter window", () => {
  const a = summarizeAvailability({
    quarterStart: "2026-04-01",
    quarterEnd: "2026-06-30",
    holidays: ["2026-01-09", "2026-05-01"], // only May 1 is in-window
    sprints: [],
  });
  assert.deepEqual(a.companyHolidays.map((h) => h.date), ["2026-05-01"]);
});

/* ---------------- ledger: one restricted holiday per dev per year ---------------- */

test("normalizeEmpId strips to alphanumeric, case-agnostic, trimmed", () => {
  assert.equal(normalizeEmpId("PT-1042"), "pt1042");
  assert.equal(normalizeEmpId("  pt 1042 "), "pt1042");
  assert.equal(normalizeEmpId("PT_1042"), "pt1042");
  assert.equal(normalizeEmpId(""), "");
});

test("devKeyOf prefers normalized Employee ID, falls back to name, else empty", () => {
  assert.equal(devKeyOf({ empId: "PT-1042" }), "pt1042");     // special chars stripped
  assert.equal(devKeyOf({ empId: "  ", devName: "Jordan Rivera" }), "jordan rivera");
  assert.equal(devKeyOf({}), "");
});

test("dayName returns the weekday of an ISO date", () => {
  assert.equal(dayName("2026-03-06"), "Friday");
  assert.equal(dayName("2026-03-08"), "Sunday");
  assert.equal(dayName(""), "");
});

test("yearOf extracts the calendar year", () => {
  assert.equal(yearOf("2026-03-13"), "2026");
  assert.equal(yearOf(""), "");
});

test("ledger records, isolates by dev + year, and clears", () => {
  localStorage.clear();
  assert.equal(rhUsage("pt-1", "2026"), null);

  recordRh("pt-1", "2026", { date: "2026-03-13", sprintName: "Sprint 1" });
  assert.equal(rhUsage("pt-1", "2026").date, "2026-03-13");

  assert.equal(rhUsage("pt-1", "2027"), null); // a new calendar year is a fresh quota
  assert.equal(rhUsage("pt-2", "2026"), null); // a different developer is independent

  clearRh("pt-1", "2026");
  assert.equal(rhUsage("pt-1", "2026"), null); // released when un-marked
});

test("recordRh overwrites the same dev+year rather than stacking", () => {
  localStorage.clear();
  recordRh("pt-9", "2026", { date: "2026-03-13" });
  recordRh("pt-9", "2026", { date: "2026-06-05" }); // moved within the same year
  assert.equal(rhUsage("pt-9", "2026").date, "2026-06-05");
});

test("ledger releases only under the recorded key (guards the orphan/wrong-block bug)", () => {
  localStorage.clear();
  recordRh("a1", "2026", { date: "2026-03-16" });
  clearRh("a2", "2026");                            // wrong key (e.g. Employee ID edited) must NOT release a1
  assert.equal(rhUsage("a1", "2026").date, "2026-03-16");
  clearRh("a1", "2026");                            // the recorded key releases correctly
  assert.equal(rhUsage("a1", "2026"), null);
});

/* ---------------- effective count start (shared-boundary day) ---------------- */

test("effectiveCountStart skips a shared start-boundary day, else keeps the start", () => {
  assert.equal(effectiveCountStart("2026-03-16", "2026-03-16"), "2026-03-17"); // shared -> next day
  assert.equal(effectiveCountStart("2026-03-16", "2026-03-13"), "2026-03-16"); // not shared
  assert.equal(effectiveCountStart("2026-03-16", ""), "2026-03-16");           // first sprint
  assert.equal(effectiveCountStart("", "2026-03-13"), "");
});

test("a restricted holiday on a shared-boundary day would exclude nothing (why it is rejected)", () => {
  const start = "2026-03-16", prevEnd = "2026-03-16", end = "2026-03-27";
  const cs = effectiveCountStart(start, prevEnd);                 // 2026-03-17
  // The boundary day belongs to the previous sprint: marking it here removes no day.
  assert.equal(countWorkingDays(cs, end, [start]), countWorkingDays(cs, end));
  // A day the sprint actually owns does remove exactly one.
  assert.equal(countWorkingDays(cs, end, ["2026-03-18"]), countWorkingDays(cs, end) - 1);
});

/* ---------------- bulk JSON import / export ---------------- */

test("company holidays round-trip: export carries day+name, import restores dates+names", () => {
  const out = exportCompanyHolidays(["2026-03-10"], { "2026-03-10": "Company Day" });
  assert.equal(out.type, "companyHolidays");
  assert.deepEqual(out.holidays[0], { date: "2026-03-10", day: "Tuesday", name: "Company Day" });
  const back = importCompanyHolidays(out);
  assert.deepEqual(back.holidays, ["2026-03-10"]);
  assert.deepEqual(back.holidayNames, { "2026-03-10": "Company Day" });
});

test("restricted pool round-trip maps name<->label and dedupes by date", () => {
  const out = exportRestrictedPool([{ date: "2026-03-06", label: "Holi" }]);
  assert.deepEqual(out.restrictedHolidays[0], { date: "2026-03-06", day: "Friday", name: "Holi" });
  const back = importRestrictedPool({ restrictedHolidays: [{ date: "2026-03-06", name: "Holi" }, { date: "2026-03-06", name: "Dup" }] });
  assert.deepEqual(back, [{ date: "2026-03-06", label: "Holi" }]);
});

test("importRestrictedPool requires a name and a valid date", () => {
  assert.throws(() => importRestrictedPool({ restrictedHolidays: [{ date: "2026-03-06" }] }), /name is required/);
  assert.throws(() => importRestrictedPool({ restrictedHolidays: [{ date: "nope", name: "X" }] }), /YYYY-MM-DD/);
});

test("developer usage round-trip normalizes employee id and rebuilds the ledger", () => {
  const ledger = { pt1042: { "2026": { date: "2026-03-06", name: "Holi", empId: "PT-1042" } } };
  const out = exportDeveloperUsage(ledger);
  assert.deepEqual(out.usage[0], { employeeId: "PT-1042", date: "2026-03-06", day: "Friday", name: "Holi", year: "2026" });
  const back = importDeveloperUsage({ usage: [{ employeeId: "PT-1042", date: "2026-03-06", name: "Holi" }] });
  assert.equal(back.pt1042["2026"].date, "2026-03-06");
  assert.equal(back.pt1042["2026"].empId, "PT-1042");
});

test("importDeveloperUsage enforces one restricted holiday per developer per year", () => {
  assert.throws(() => importDeveloperUsage({ usage: [
    { employeeId: "PT-1", date: "2026-03-06", name: "Holi" },
    { employeeId: "pt-1", date: "2026-06-05", name: "Raksha Bandhan" }, // same dev (normalized), same year
  ] }), /already has a 2026 restricted holiday/);
});
