import test from "node:test";
import assert from "node:assert/strict";

import { computeSprintResult, computeQuarterlySummary } from "../src/scoring.js";
import {
  countWorkingDays, countWorkingDaysInWindow, getBand,
  generateSprintPeriods, quarterEndFrom, evaluationEndFrom, fyQuarterOptions,
  addDaysISO, toISO, parseLocalDate,
  sanitizePdfText,
} from "../src/utils.js";
import { DEFAULT_CONFIG } from "../src/constants.js";
import { validateConfig } from "../src/configValidation.js";

const CFG = DEFAULT_CONFIG;
const round = (v) => Number(v.toFixed(3));

/* =================================================================
   countWorkingDays — boundaries, holidays, timezone, leap, rollover
   ================================================================= */

test("countWorkingDays: Fri..Mon spanning a weekend counts only the two weekdays", () => {
  assert.equal(countWorkingDays("2026-01-09", "2026-01-12"), 2); // Fri + Mon
});

test("countWorkingDays: all-weekend range is zero", () => {
  assert.equal(countWorkingDays("2026-02-28", "2026-03-01"), 0); // Sat + Sun
});

test("countWorkingDays: accepts holidays as a Set and dedupes duplicates", () => {
  assert.equal(countWorkingDays("2026-01-05", "2026-01-09", new Set(["2026-01-07"])), 4);
  assert.equal(countWorkingDays("2026-01-05", "2026-01-09", ["2026-01-07", "2026-01-07"]), 4);
});

test("countWorkingDays: holiday outside the range is ignored", () => {
  assert.equal(countWorkingDays("2026-01-05", "2026-01-09", ["2026-02-01"]), 5);
});

test("countWorkingDays: every weekday a holiday yields zero", () => {
  assert.equal(countWorkingDays("2026-01-05", "2026-01-09",
    ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08", "2026-01-09"]), 0);
});

test("countWorkingDays: leap day (2028-02-29 = Tue) is counted", () => {
  assert.equal(countWorkingDays("2028-02-29", "2028-02-29"), 1);
  assert.equal(countWorkingDays("2028-02-28", "2028-03-01"), 3); // Mon, Tue(29), Wed
});

test("countWorkingDays: year boundary is handled", () => {
  assert.equal(countWorkingDays("2025-12-31", "2026-01-02"), 3); // Wed, Thu, Fri
  assert.equal(countWorkingDays("2026-12-31", "2027-01-01"), 2); // Thu, Fri
});

/* =================================================================
   countWorkingDaysInWindow — clipping edges
   ================================================================= */

test("countWorkingDaysInWindow: sprint starting before the quarter is clipped on the left", () => {
  // Sprint Mar 30 (Mon) .. Apr 10 (Fri); quarter starts Apr 1.
  assert.equal(countWorkingDaysInWindow("2026-03-30", "2026-04-10", "2026-04-01", "2026-06-30"), 8);
});

test("countWorkingDaysInWindow: sprint identical to the quarter equals the quarter total", () => {
  const full = countWorkingDays("2026-04-01", "2026-06-30");
  assert.equal(countWorkingDaysInWindow("2026-04-01", "2026-06-30", "2026-04-01", "2026-06-30"), full);
});

/* =================================================================
   getBand — exact threshold boundaries for every band table
   ================================================================= */

test("getBand: planned-hours thresholds are min-inclusive / max-exclusive", () => {
  assert.equal(getBand(100, CFG.plannedHoursBands).label, "90-100");
  assert.equal(getBand(90, CFG.plannedHoursBands).label, "90-100");
  assert.equal(getBand(89.999, CFG.plannedHoursBands).label, "80-90");
  assert.equal(getBand(80, CFG.plannedHoursBands).label, "80-90");
  assert.equal(getBand(0, CFG.plannedHoursBands).label, "Below 30");
});

test("getBand: efficiency thresholds incl. open-ended top band", () => {
  assert.equal(getBand(100, CFG.efficiencyBands).label, "100%+");
  assert.equal(getBand(120, CFG.efficiencyBands).label, "100%+"); // over 100%
  assert.equal(getBand(99.9, CFG.efficiencyBands).label, "91-100%");
  assert.equal(getBand(91, CFG.efficiencyBands).label, "91-100%");
  assert.equal(getBand(90.99, CFG.efficiencyBands).label, "81-90%");
  assert.equal(getBand(71, CFG.efficiencyBands).label, "71-80%");
  assert.equal(getBand(70.99, CFG.efficiencyBands).label, "70% and Below");
  assert.equal(getBand(0, CFG.efficiencyBands).label, "70% and Below");
});

test("getBand: issue-persist thresholds incl. open-ended top band", () => {
  assert.equal(getBand(0, CFG.issuePersistBands).label, "0-10%");
  assert.equal(getBand(10, CFG.issuePersistBands).label, "10-20%");
  assert.equal(getBand(40, CFG.issuePersistBands).label, "40%+");
  assert.equal(getBand(999, CFG.issuePersistBands).label, "40%+");
});

/* =================================================================
   computeSprintResult — degenerate & boundary inputs
   ================================================================= */

test("computeSprintResult: fully empty sprint yields all-zero, no NaN", () => {
  const r = computeSprintResult({}, 1.5, 7, CFG);
  assert.equal(r.wd, 0);
  assert.equal(r.bp, 0);
  assert.equal(r.ah, 0);
  assert.equal(r.total, 0);
  assert.ok(!Number.isNaN(r.total));
  assert.ok(!Number.isNaN(r.phPct) && !Number.isNaN(r.effPct) && !Number.isNaN(r.ipPct));
});

test("computeSprintResult: negative numeric inputs clamp to zero", () => {
  const r = computeSprintResult({
    workingDays: "5", completedHours: "-10", collaborationHours: "-3",
    closedTickets: "-4", assignedTickets: "10", codeQuality: "Satisfactory",
    reopenedTickets: "-1", doneTickets: "4",
  }, 2, 7, CFG);
  assert.equal(r.phPct, 0);        // (0+0)/35
  assert.equal(r.effPct, 0);       // 0/10
  assert.equal(r.ipPct, 100);      // closed clamped to 0 -> zero closed -> worst band
  assert.equal(r.zeroClosed, true);
});

test("computeSprintResult: planned-hours over 100% is clamped to the top band", () => {
  const r = computeSprintResult({
    workingDays: "5", completedHours: "100", collaborationHours: "0",
    assignedTickets: "10", closedTickets: "9", codeQuality: "Satisfactory",
    reopenedTickets: "0", doneTickets: "5",
  }, 2, 7, CFG);
  assert.ok(r.phPct > 100);        // 100/35 ≈ 285%
  assert.equal(r.phB.label, "90-100");
});

test("computeSprintResult: efficiency over 100% (closed>assigned) lands in top band", () => {
  const r = computeSprintResult({
    workingDays: "5", completedHours: "20", assignedTickets: "10", closedTickets: "11",
    codeQuality: "Satisfactory", reopenedTickets: "0", doneTickets: "5",
  }, 2, 7, CFG);
  assert.equal(round(r.effPct), 110);
  assert.equal(r.effB.label, "100%+");
  assert.equal(r.effB.multiplier, 1.3);
});

test("computeSprintResult: unknown code-quality grade falls back without crashing", () => {
  const r = computeSprintResult({
    workingDays: "5", completedHours: "20", assignedTickets: "10", closedTickets: "9",
    codeQuality: "Legendary", reopenedTickets: "0", doneTickets: "5",
  }, 2, 7, CFG);
  assert.ok(typeof r.cqO.multiplier === "number");
  assert.ok(!Number.isNaN(r.total));
});

test("computeSprintResult: legacy workingDays (no split fields) sets total == in-quarter, no leak", () => {
  const r = computeSprintResult({
    workingDays: "8", completedHours: "40", assignedTickets: "10", closedTickets: "8",
    codeQuality: "Satisfactory", reopenedTickets: "0", doneTickets: "5",
  }, 1.5, 7, CFG);
  assert.equal(r.wdTotal, 8);
  assert.equal(r.wdInQuarter, 8);
  assert.equal(r.leaks, false);
});

test("computeSprintResult: sprint fully outside the quarter contributes zero base but keeps allotted hours", () => {
  const r = computeSprintResult({
    workingDaysTotal: "5", workingDaysInQuarter: "0",
    completedHours: "30", assignedTickets: "10", closedTickets: "9",
    codeQuality: "Good", reopenedTickets: "0", doneTickets: "5",
  }, 1.5, 7, CFG);
  assert.equal(r.wdTotal, 5);
  assert.equal(r.wdInQuarter, 0);
  assert.equal(r.leaks, true);
  assert.equal(r.bp, 0);           // no in-quarter days -> no base points
  assert.equal(r.ah, 35);          // allotted hours still from the whole sprint
  assert.equal(r.total, 0);        // every achieved term scales off bp
});

test("computeSprintResult: Poor code quality produces a negative contribution below base", () => {
  const r = computeSprintResult({
    workingDays: "10", completedHours: "70", assignedTickets: "10", closedTickets: "9",
    codeQuality: "Poor", reopenedTickets: "0", doneTickets: "10",
  }, 1.5, 7, CFG);
  assert.ok(r.cqAch < 0);          // 3 * -0.30
  assert.equal(round(r.cqAch), round(15 * CFG.weights.cq * -0.30));
});

/* =================================================================
   computeQuarterlySummary — empty & aggregate
   ================================================================= */

test("computeQuarterlySummary: empty sprint list", () => {
  const s = computeQuarterlySummary([], 20, 1.5);
  assert.equal(s.tb, 0);
  assert.equal(s.ta, 0);
  assert.equal(s.tw, 0);
  assert.equal(s.rw, 20);
  assert.equal(s.rb, 30);
});

/* =================================================================
   generateSprintPeriods — degenerate lengths & ranges
   ================================================================= */

test("generateSprintPeriods: single-day range yields one zero-width sprint", () => {
  const p = generateSprintPeriods("2026-06-15", "2026-06-15", 14);
  assert.equal(p.length, 1);
  assert.equal(p[0].startDate, "2026-06-15");
  assert.equal(p[0].endDate, "2026-06-15");
});

test("generateSprintPeriods: length larger than range yields one clamped sprint", () => {
  const p = generateSprintPeriods("2026-04-01", "2026-04-10", 14);
  assert.equal(p.length, 1);
  assert.equal(p[0].endDate, "2026-04-10");
});

test("generateSprintPeriods: length exactly equal to the range yields one sprint", () => {
  const p = generateSprintPeriods("2026-04-01", "2026-04-14", 14);
  assert.equal(p.length, 1);
  assert.equal(p[0].endDate, "2026-04-14");
});

test("generateSprintPeriods: length < 2 terminates (no infinite loop)", () => {
  const p = generateSprintPeriods("2026-04-01", "2026-04-05", 1);
  assert.ok(Array.isArray(p) && p.length >= 1);   // safety break fires; does not hang
});

test("evaluationEndFrom: start + 84 days = 6 fortnightly sprints", () => {
  assert.equal(evaluationEndFrom("2026-05-27"), "2026-08-19");   // matches the real Q2 window
  assert.equal(evaluationEndFrom("2026-08-19"), "2026-11-11");
  assert.equal(evaluationEndFrom(""), "");
});

test("fortnightly division: an 84-day window yields exactly 6 sprints on the real boundaries", () => {
  // 14-day cadence => inclusive length 15 (shared boundary day).
  const p = generateSprintPeriods("2026-05-27", "2026-08-19", 15);
  assert.equal(p.length, 6);
  assert.deepEqual(p.map(s => s.startDate), ["2026-05-27","2026-06-10","2026-06-24","2026-07-08","2026-07-22","2026-08-05"]);
  assert.equal(p[5].endDate, "2026-08-19");
});

test("fyQuarterOptions: labels from FY2026-27, four per year", () => {
  const opts = fyQuarterOptions(2026, 6);
  assert.equal(opts.length, 24);
  assert.equal(opts[0], "Q1 FY2026-27");
  assert.equal(opts[4], "Q1 FY2027-28");
  assert.equal(opts[23], "Q4 FY2031-32");
});

/* =================================================================
   quarterEndFrom & addDaysISO — calendar rollover
   ================================================================= */

test("quarterEndFrom: month-end overflow clamps sensibly", () => {
  assert.equal(quarterEndFrom("2026-01-31"), "2026-04-30"); // Jan31 +3mo-1d
  assert.equal(quarterEndFrom("2026-04-01", 1), "2026-04-30"); // custom 1-month period
});

test("addDaysISO: negative shift and year rollover", () => {
  assert.equal(addDaysISO("2026-01-01", -1), "2025-12-31");
  assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
});

/* =================================================================
   validateConfig — accepted & rejected shapes
   ================================================================= */

test("validateConfig: accepts null/Infinity band max and negative multipliers", () => {
  assert.equal(validateConfig({ efficiencyBands: [{ label: "x", min: 0, max: null, multiplier: 1 }] }), true);
  assert.equal(validateConfig({ issuePersistBands: [{ label: "x", min: 0, max: Infinity, multiplier: -0.5 }] }), true);
  assert.equal(validateConfig({ codeQualityOptions: [{ label: "Poor", multiplier: -0.3 }] }), true);
});

test("validateConfig: allows a partial weights object (deep-merge completes it later)", () => {
  assert.equal(validateConfig({ weights: { ph: 0.5 } }), true);
  assert.equal(validateConfig({ weights: { ph: 0.9, cq: 0.9, eff: 0, ip: 0 } }), true); // sum not enforced here
});

test("validateConfig: rejects non-numeric band fields and non-array holidays", () => {
  assert.throws(() => validateConfig({ efficiencyBands: [{ label: "x", min: "abc", max: 10, multiplier: 1 }] }), /min/);
  assert.throws(() => validateConfig({ efficiencyBands: [{ label: "x", max: 10, multiplier: 1 }] }), /min/); // missing min
  assert.throws(() => validateConfig({ holidays: { "2026-01-01": true } }), /must be an array/);
});

/* =================================================================
   End-to-end chain: generate → count-once → score → sum == base
   ================================================================= */

test("E2E: shared-boundary generated sprints' base points sum to the quarter base", () => {
  const qStart = "2026-04-01", qEnd = "2026-06-30";
  const totalWD = countWorkingDays(qStart, qEnd);   // 65
  const base = 90, rate = base / totalWD;
  const periods = generateSprintPeriods(qStart, qEnd, 14);
  let tb = 0;
  periods.forEach((p, i) => {
    const shares = i > 0 && p.startDate === periods[i - 1].endDate;
    const countStart = shares ? addDaysISO(p.startDate, 1) : p.startDate;
    const wdInQ = countWorkingDaysInWindow(countStart, p.endDate, qStart, qEnd);
    const r = computeSprintResult(
      { workingDaysTotal: String(wdInQ), workingDaysInQuarter: String(wdInQ), codeQuality: "Satisfactory" },
      rate, 7, CFG,
    );
    tb += r.bp;
  });
  assert.equal(round(tb), round(base));   // per-sprint base points tile exactly to 90
});

/* sanity: toISO/parseLocalDate round-trip */
test("toISO(parseLocalDate(x)) round-trips", () => {
  assert.equal(toISO(parseLocalDate("2026-07-15")), "2026-07-15");
});

/* =================================================================
   sanitizePdfText — the fix for garbled report glyphs
   ================================================================= */

test("sanitizePdfText maps non-Latin-1 typography to ASCII (fixes PDF garbling)", () => {
  assert.equal(sanitizePdfText("90.0% → Below 30"), "90.0% -> Below 30"); // the exact garbled case
  assert.equal(sanitizePdfText("zero done → worst"), "zero done -> worst");
  assert.equal(sanitizePdfText("a — b – c"), "a - b - c");                 // em/en dash
  assert.equal(sanitizePdfText("x · y"), "x | y");                        // middle dot
  assert.equal(sanitizePdfText("5 × 7"), "5 x 7");                        // multiplication
  assert.equal(sanitizePdfText("more…"), "more...");                     // ellipsis
  // nothing outside Latin-1 survives (so jsPDF can never garble)
  const out = sanitizePdfText("emoji 🚀 and 汉字 →");
  assert.ok(!/[^\x00-\xFF]/.test(out));
  assert.ok(out.includes("->"));
});
