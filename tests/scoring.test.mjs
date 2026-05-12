import test from "node:test";
import assert from "node:assert/strict";

import { computeSprintResult, computeQuarterlySummary } from "../src/scoring.js";
import { countWorkingDays, getBand } from "../src/utils.js";
import { PLANNED_HOURS_BANDS } from "../src/constants.js";

const round = (value) => Number(value.toFixed(3));

test("countWorkingDays counts weekdays inclusively", () => {
  assert.equal(countWorkingDays("2026-01-05", "2026-01-16"), 10);
  assert.equal(countWorkingDays("2026-01-10", "2026-01-11"), 0);
  assert.equal(countWorkingDays("", "2026-01-11"), 0);
});

test("getBand returns the configured threshold band", () => {
  assert.equal(getBand(95, PLANNED_HOURS_BANDS).label, "90-100");
  assert.equal(getBand(70, PLANNED_HOURS_BANDS).label, "70-80");
  assert.equal(getBand(29.9, PLANNED_HOURS_BANDS).label, "Below 30");
});

test("computeSprintResult applies weighted multipliers for a healthy sprint", () => {
  const result = computeSprintResult({
    name: "Sprint 1",
    workingDays: "10",
    completedHours: "62",
    collaborationHours: "8",
    codeQuality: "Good",
    reopenedTickets: "1",
    doneTickets: "18",
  }, 1.5, 7);

  assert.equal(result.wd, 10);
  assert.equal(result.bp, 15);
  assert.equal(result.ah, 70);
  assert.equal(result.phB.label, "90-100");
  assert.equal(result.cqO.label, "Good");
  assert.equal(result.effB.label, "85-95%");
  assert.equal(result.ipB.label, "0-10%");
  assert.equal(round(result.total), 23.025);
});

test("computeSprintResult assigns the worst issue persist band when done tickets are zero", () => {
  const result = computeSprintResult({
    name: "Sprint 2",
    workingDays: "5",
    completedHours: "10",
    collaborationHours: "0",
    codeQuality: "Satisfactory",
    reopenedTickets: "0",
    doneTickets: "0",
  }, 2, 7);

  assert.equal(result.zeroDone, true);
  assert.equal(result.ipPct, 100);
  assert.equal(result.ipB.label, "40%+");
  assert.equal(result.ipB.multiplier, -0.5);
});

test("computeQuarterlySummary aggregates sprint totals and remaining allocation", () => {
  const sprintA = computeSprintResult({
    workingDays: "10",
    completedHours: "70",
    collaborationHours: "0",
    codeQuality: "Satisfactory",
    reopenedTickets: "0",
    doneTickets: "10",
  }, 1.5, 7);
  const sprintB = computeSprintResult({
    workingDays: "5",
    completedHours: "20",
    collaborationHours: "0",
    codeQuality: "Poor",
    reopenedTickets: "2",
    doneTickets: "5",
  }, 1.5, 7);

  const summary = computeQuarterlySummary([sprintA, sprintB], 20, 1.5);

  assert.equal(summary.tb, 22.5);
  assert.equal(summary.tw, 15);
  assert.equal(summary.rw, 5);
  assert.equal(summary.rb, 7.5);
});
