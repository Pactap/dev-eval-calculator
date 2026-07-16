import test from "node:test";
import assert from "node:assert/strict";

import { computeSprintResult, computeQuarterlySummary } from "../src/scoring.js";
import { countWorkingDays, countWorkingDaysInWindow, getBand, generateSprintPeriods, addDaysISO } from "../src/utils.js";
import { DEFAULT_CONFIG } from "../src/constants.js";
import { validateConfig } from "../src/configValidation.js";

const CFG = DEFAULT_CONFIG;
const round = (value) => Number(value.toFixed(3));

/* ---------------- 14-day draft sprint generation ---------------- */

test("generateSprintPeriods splits a range into shared-boundary 14-day windows, clamping the last", () => {
  const p = generateSprintPeriods("2026-04-01", "2026-06-30", 14);
  assert.equal(p.length, 7);
  assert.equal(p[0].startDate, "2026-04-01");
  assert.equal(p[0].endDate, "2026-04-14");        // 14 calendar days inclusive
  assert.equal(p[1].startDate, "2026-04-14");      // next sprint BEGINS on prior sprint's end date
  assert.equal(p[0].endDate, p[1].startDate);      // shared boundary, no gap
  assert.equal(p[p.length - 1].endDate, "2026-06-30"); // last window clamped to range end
  assert.equal(p[0].name, "Sprint 1");
});

test("generateSprintPeriods clamps the tail and rejects bad ranges", () => {
  const p = generateSprintPeriods("2026-04-01", "2026-04-28", 14);
  assert.equal(p.length, 3);                        // Apr1-14, Apr14-27, Apr27-28 (shared boundaries)
  assert.equal(p[2].startDate, "2026-04-27");
  assert.equal(p[2].endDate, "2026-04-28");
  assert.deepEqual(generateSprintPeriods("2026-06-30", "2026-04-01", 14), []); // start after end
  assert.deepEqual(generateSprintPeriods("", "2026-04-01", 14), []);
});

test("addDaysISO shifts a local date by n days", () => {
  assert.equal(addDaysISO("2026-04-14", 1), "2026-04-15");
  assert.equal(addDaysISO("2026-04-30", 1), "2026-05-01"); // month rollover
  assert.equal(addDaysISO("", 1), "");
});

test("shared-boundary 'count once' makes per-sprint productive days tile the quarter exactly", () => {
  // Assign each shared boundary day to the EARLIER sprint: later sprint counts from start+1.
  const periods = generateSprintPeriods("2026-04-01", "2026-06-30", 14);
  let sum = 0;
  periods.forEach((p, i) => {
    const shares = i > 0 && p.startDate === periods[i - 1].endDate;
    const countStart = shares ? addDaysISO(p.startDate, 1) : p.startDate;
    sum += countWorkingDays(countStart, p.endDate);
  });
  // Must equal the working days of the whole contiguous range — no day double-counted.
  assert.equal(sum, countWorkingDays("2026-04-01", "2026-06-30"));
});

/* ---------------- working days: weekends + holidays ---------------- */

test("countWorkingDays counts weekdays inclusively and excludes weekends by default", () => {
  assert.equal(countWorkingDays("2026-01-05", "2026-01-16"), 10); // two full Mon-Fri weeks
  assert.equal(countWorkingDays("2026-01-10", "2026-01-11"), 0);  // Sat + Sun
  assert.equal(countWorkingDays("", "2026-01-11"), 0);
  assert.equal(countWorkingDays("2026-01-16", "2026-01-05"), 0);  // start after end
});

test("countWorkingDays excludes holidays in addition to weekends", () => {
  // Mon 2026-01-05 .. Fri 2026-01-09 = 5 weekdays; drop one holiday -> 4.
  assert.equal(countWorkingDays("2026-01-05", "2026-01-09", ["2026-01-07"]), 4);
  // A holiday on a weekend does not double-subtract.
  assert.equal(countWorkingDays("2026-01-05", "2026-01-09", ["2026-01-10"]), 5);
});

test("countWorkingDays is timezone-safe (no UTC day shift)", () => {
  // A single Monday must count as exactly 1 regardless of host timezone.
  assert.equal(countWorkingDays("2026-06-15", "2026-06-15"), 1); // Monday
  assert.equal(countWorkingDays("2026-06-14", "2026-06-14"), 0); // Sunday
});

test("countWorkingDaysInWindow clips a sprint to the quarter overlap", () => {
  // Sprint Jun 22 (Mon) .. Jul 3 (Fri); quarter ends Jun 30.
  assert.equal(countWorkingDaysInWindow("2026-06-22", "2026-07-03", "2026-04-01", "2026-06-30"), 7);
  // Full sprint with no quarter bounds falls back to the total.
  assert.equal(countWorkingDaysInWindow("2026-06-22", "2026-07-03", "", ""), 10);
  // Sprint entirely outside the quarter -> 0.
  assert.equal(countWorkingDaysInWindow("2026-07-06", "2026-07-10", "2026-04-01", "2026-06-30"), 0);
});

/* ---------------- getBand ---------------- */

test("getBand returns the configured threshold band", () => {
  assert.equal(getBand(95, CFG.plannedHoursBands).label, "90-100");
  assert.equal(getBand(70, CFG.plannedHoursBands).label, "70-80");
  assert.equal(getBand(29.9, CFG.plannedHoursBands).label, "Below 30");
});

test("getBand degrades gracefully on an empty band array", () => {
  const b = getBand(50, []);
  assert.equal(b.multiplier, 0);
});

/* ---------------- ticket-based efficiency ---------------- */

test("computeSprintResult uses ticket ratio for efficiency and new weights", () => {
  const r = computeSprintResult({
    name: "Sprint 1",
    workingDays: "10",
    completedHours: "62",
    collaborationHours: "8",
    codeQuality: "Good",
    closedTickets: "9",
    assignedTickets: "10",
    reopenedTickets: "1",
    doneTickets: "18",
  }, 1.5, 7, CFG);

  assert.equal(r.wd, 10);
  assert.equal(r.bp, 15);
  assert.equal(r.ah, 70);
  assert.equal(r.phB.label, "90-100");       // (62+8)/70 = 100%
  assert.equal(r.cqO.label, "Good");
  assert.equal(round(r.effPct), 90);          // 9/10
  assert.equal(r.effB.label, "81-90%");
  assert.equal(r.effB.multiplier, 0.8);
  // ph 6*1.75 + cq 3*1.30 + eff 6*0.80 + ip 0 = 10.5 + 3.9 + 4.8 + 0
  assert.equal(round(r.total), 19.2);
});

test("computeSprintResult awards NO efficiency credit when zero tickets are assigned", () => {
  const r = computeSprintResult({
    workingDays: "5", completedHours: "10", collaborationHours: "0",
    codeQuality: "Satisfactory", closedTickets: "0", assignedTickets: "0",
    reopenedTickets: "0", doneTickets: "3",
  }, 2, 7, CFG);

  assert.equal(r.noAssigned, true);
  assert.equal(r.effPct, 0);
  assert.equal(r.effB.label, "no tickets");
  assert.equal(r.effB.multiplier, 0);   // zero assigned -> no efficiency award (was 0.20)
  assert.equal(r.effM, 0);
  assert.equal(r.effAch, 0);
});

test("computeSprintResult: a sprint with no hours AND no tickets scores zero (no free CQ points)", () => {
  const r = computeSprintResult({
    workingDaysTotal: "10", workingDaysInQuarter: "10",
    completedHours: "", collaborationHours: "",
    assignedTickets: "", closedTickets: "", reopenedTickets: "", doneTickets: "",
    codeQuality: "Outstanding", // default/high grade must not hand out points
  }, 1.5, 7, CFG);

  assert.equal(r.noActivity, true);
  assert.equal(r.total, 0);
  assert.equal(r.cqAch, 0);
  assert.equal(r.phAch, 0);
  assert.equal(r.effAch, 0);
  assert.equal(r.cqM, 0);         // effective multiplier zeroed for display consistency
  assert.ok(r.bp > 0);            // base points (the pool) are unaffected
});

test("computeSprintResult: activity via hours alone still scores CQ/PH but not efficiency", () => {
  const r = computeSprintResult({
    workingDays: "10", completedHours: "70", collaborationHours: "0",
    assignedTickets: "0", closedTickets: "0", reopenedTickets: "0", doneTickets: "0",
    codeQuality: "Good",
  }, 1.5, 7, CFG);

  assert.equal(r.noActivity, false);   // hours count as activity
  assert.ok(r.cqAch > 0);              // CQ still credited
  assert.ok(r.phAch > 0);              // planned hours still credited
  assert.equal(r.effAch, 0);           // but no tickets -> no efficiency award
});

test("computeSprintResult assigns worst issue-persist band when closed tickets are zero", () => {
  const r = computeSprintResult({
    workingDays: "5", completedHours: "10", closedTickets: "0", assignedTickets: "2",
    codeQuality: "Satisfactory", reopenedTickets: "1", doneTickets: "3",
  }, 2, 7, CFG);

  assert.equal(r.zeroClosed, true);
  assert.equal(r.ipPct, 100);
  assert.equal(r.ipB.label, "40%+");
  assert.equal(r.ipB.multiplier, -0.5);
});

test("computeSprintResult: issue persistence is reopened / closed (this sprint)", () => {
  const r = computeSprintResult({
    workingDays: "5", completedHours: "10", closedTickets: "10", assignedTickets: "12",
    codeQuality: "Satisfactory", reopenedTickets: "1", doneTickets: "3",
  }, 2, 7, CFG);

  assert.equal(r.zeroClosed, false);
  assert.equal(round(r.ipPct), 10);          // 1 reopened / 10 closed (not / doneTickets=3)
  assert.equal(r.ipB.label, "10-20%");       // 10% is the lower bound of 10-20 (inclusive)
});

/* ---------------- cross-quarter split ---------------- */

test("computeSprintResult splits total vs in-quarter days for a leaking sprint", () => {
  const r = computeSprintResult({
    workingDays: "9",
    workingDaysTotal: "9",
    workingDaysInQuarter: "6",
    completedHours: "40", collaborationHours: "0",
    codeQuality: "Satisfactory", closedTickets: "8", assignedTickets: "10",
    reopenedTickets: "0", doneTickets: "5",
  }, 1.4063, 7, CFG);

  assert.equal(r.leaks, true);
  assert.equal(r.wdTotal, 9);
  assert.equal(r.wdInQuarter, 6);
  assert.equal(r.ah, 63);                       // allotted uses whole sprint (9 * 7)
  assert.equal(round(r.bp), round(1.4063 * 6)); // base points use in-quarter days only
});

/* ---------------- quarterly summary ---------------- */

test("computeQuarterlySummary aggregates totals and never returns negative remaining", () => {
  const a = computeSprintResult({
    workingDays: "10", completedHours: "70", codeQuality: "Satisfactory",
    closedTickets: "9", assignedTickets: "10", reopenedTickets: "0", doneTickets: "10",
  }, 1.5, 7, CFG);
  const b = computeSprintResult({
    workingDays: "5", completedHours: "20", codeQuality: "Poor",
    closedTickets: "3", assignedTickets: "5", reopenedTickets: "2", doneTickets: "5",
  }, 1.5, 7, CFG);

  const summary = computeQuarterlySummary([a, b], 20, 1.5);
  assert.equal(summary.tb, 22.5);
  assert.equal(summary.tw, 15);
  assert.equal(summary.rw, 5);
  assert.equal(summary.rb, 7.5);

  // Frozen days exceeding a shrunk quarter must clamp, not go negative.
  const clamped = computeQuarterlySummary([a, b], 10, 1.5);
  assert.equal(clamped.rw, 0);
  assert.equal(clamped.rb, 0);
});

/* ---------------- config validation ---------------- */

test("validateConfig accepts the default config", () => {
  assert.equal(validateConfig(DEFAULT_CONFIG), true);
});

test("validateConfig rejects malformed configs with clear messages", () => {
  assert.throws(() => validateConfig(null), /JSON object/);
  assert.throws(() => validateConfig([]), /JSON object/);
  assert.throws(() => validateConfig({ weights: { ph: "abc" } }), /Weight "ph" must be a number/);
  assert.throws(() => validateConfig({ weights: { ph: "" } }), /Weight "ph" must be a number/);   // empty string must not coerce to 0
  assert.throws(() => validateConfig({ weights: { ph: null } }), /Weight "ph" must be a number/);
  assert.throws(() => validateConfig({ efficiencyBands: [] }), /non-empty array/);
  assert.throws(() => validateConfig({ codeQualityOptions: [{ label: "X" }] }), /multiplier/);
  assert.throws(() => validateConfig({ holidays: "2026-01-01" }), /must be an array/);
});
