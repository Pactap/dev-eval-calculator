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

import { countWorkingDays, isWeekend, effectiveCountStart } from "../src/utils.js";
import { summarizeAvailability } from "../src/availability.js";
import { devKeyOf, yearOf, rhUsage, recordRh, clearRh } from "../src/restrictedHolidays.js";

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
    { date: "2026-01-09", weekend: false },
    { date: "2026-02-28", weekend: true },
  ]);
  assert.equal(a.weekendHolidays, 1);
  assert.equal(a.impactingHolidays, 1);
  assert.equal(a.restrictedHolidays.length, 1);
  assert.equal(a.restrictedHolidays[0].date, "2026-03-13");
  assert.equal(a.restrictedHolidays[0].sprintName, "Sprint 1");
  assert.equal(a.dilutedDays, 2); // 1 weekday holiday + 1 weekday restricted holiday
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

test("devKeyOf prefers Employee ID, falls back to name, else empty", () => {
  assert.equal(devKeyOf({ empId: "PT-1042" }), "pt-1042");
  assert.equal(devKeyOf({ empId: "  ", devName: "Jordan Rivera" }), "jordan rivera");
  assert.equal(devKeyOf({}), "");
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
