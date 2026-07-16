import test from "node:test";
import assert from "node:assert/strict";
import {
  validResults, trendSeries, parameterTrendSeries,
  contributionTotals, strengthAverages, utilizationSeries, throughputSeries,
  hasHours, hasTickets, hasActivity, hasAchieved,
} from "../src/analytics.js";

// Two productive sprints + one empty (wdTotal 0, must be excluded everywhere).
const RESULTS = [
  {
    name: "S1", wdTotal: 10, total: 15.3, bp: 15, phPct: 80, effPct: 80, ipPct: 5,
    phAch: 9, cqAch: 3.9, effAch: 2.4, ipAch: 0, phM: 1.5, cqM: 1.3, effM: 0.4, ipM: 1.5,
    comp: 40, collab: 8, ah: 60, assigned: 20, closed: 16, reop: 2, done: 40,
  },
  {
    name: "S2", wdTotal: 10, total: 12, bp: 15, phPct: 100, effPct: 50, ipPct: 20,
    phAch: 10.5, cqAch: 3, effAch: 1.2, ipAch: 0, phM: 1.75, cqM: 1.0, effM: 0.2, ipM: 1.0,
    comp: 55, collab: 5, ah: 60, assigned: 10, closed: 5, reop: 4, done: 20,
  },
  { name: "S3-empty", wdTotal: 0, total: 0, bp: 0 },
];

test("validResults drops sprints with no productive days", () => {
  assert.equal(validResults(RESULTS).length, 2);
});

test("trendSeries pairs achieved with base target", () => {
  assert.deepEqual(trendSeries(RESULTS), [
    { name: "S1", achieved: 15.3, base: 15 },
    { name: "S2", achieved: 12, base: 15 },
  ]);
});

test("parameterTrendSeries caps Planned Hours at 100 and excludes empty sprints", () => {
  const s = parameterTrendSeries(RESULTS);
  assert.equal(s.length, 2);
  assert.deepEqual(s[0], { name: "S1", ph: 80, eff: 80, ip: 5 });
  assert.equal(s[1].ph, 100);
});

test("contributionTotals sums achieved points per parameter", () => {
  assert.deepEqual(contributionTotals(RESULTS), { ph: 19.5, cq: 6.9, eff: 3.6, ip: 0 });
});

test("strengthAverages averages the reward multiplier per parameter", () => {
  assert.deepEqual(strengthAverages(RESULTS), { ph: 1.63, cq: 1.15, eff: 0.3, ip: 1.25 });
});

test("utilizationSeries reports used (completed+collab) vs allotted", () => {
  assert.deepEqual(utilizationSeries(RESULTS)[0], { name: "S1", used: 48, allotted: 60 });
});

test("throughputSeries maps ticket counts", () => {
  assert.deepEqual(throughputSeries(RESULTS)[1], { name: "S2", assigned: 10, closed: 5, reopened: 4 });
});

test("data predicates are true for real activity, false for dates-only sprints", () => {
  assert.equal(hasHours(RESULTS), true);
  assert.equal(hasTickets(RESULTS), true);
  assert.equal(hasActivity(RESULTS), true);
  assert.equal(hasAchieved(RESULTS), true);

  const datesOnly = [{
    name: "D1", wdTotal: 10, total: 0, bp: 15, ah: 60,
    comp: 0, collab: 0, assigned: 0, closed: 0, reop: 0, done: 0,
    phAch: 0, cqAch: 0, effAch: 0, ipAch: 0, phM: 0, cqM: 0, effM: 0, ipM: 0,
    phPct: 0, effPct: 0, ipPct: 100,
  }];
  assert.equal(hasHours(datesOnly), false);
  assert.equal(hasTickets(datesOnly), false);
  assert.equal(hasActivity(datesOnly), false);
  assert.equal(hasAchieved(datesOnly), false);
});
