// Pure data transforms for the Performance Analytics dashboard. No Chart.js, no
// React — just sprintResult[] -> chart-ready series, so they can be unit-tested.
// "Valid" sprints are those with productive days (wdTotal > 0), matching the charts.

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

export function validResults(results = []) {
  return results.filter(r => r && r.wdTotal > 0);
}

// Per-chart "is there anything meaningful to plot" checks. Sprints with dates but no
// recorded activity would otherwise render misleading zeros / a flat 100% line / an
// empty donut, so each chart falls back to an empty state until these pass.
export function hasHours(results = []) {
  return validResults(results).some(r => (Number(r.comp) || 0) + (Number(r.collab) || 0) > 0);
}
export function hasTickets(results = []) {
  return validResults(results).some(r =>
    (Number(r.assigned) || 0) + (Number(r.closed) || 0) + (Number(r.reop) || 0) > 0);
}
export function hasActivity(results = []) {
  return hasHours(results) || hasTickets(results);
}
// Score-based charts (composition, achieved-vs-target, radar, contribution) have signal
// once any points were achieved anywhere.
export function hasAchieved(results = []) {
  return validResults(results).some(r => Math.abs(Number(r.total) || 0) > 0.005);
}

const label = (r, i) => r.name || `Sprint ${i + 1}`;

// Achieved total vs pro-rata base target, per sprint.
export function trendSeries(results = []) {
  return validResults(results).map((r, i) => ({
    name: label(r, i), achieved: r2(r.total), base: r2(r.bp),
  }));
}

// Input percentages per sprint (Code Quality is a grade, not a %, so it's excluded).
export function parameterTrendSeries(results = []) {
  return validResults(results).map((r, i) => ({
    name: label(r, i),
    ph: r1(Math.min(r.phPct, 100)),
    eff: r1(r.effPct),
    ip: r1(r.ipPct),
  }));
}

// Total achieved points contributed by each parameter across the quarter.
export function contributionTotals(results = []) {
  const v = validResults(results);
  const sum = (k) => v.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  return { ph: r2(sum("phAch")), cq: r2(sum("cqAch")), eff: r2(sum("effAch")), ip: r2(sum("ipAch")) };
}

// Average reward-band multiplier per parameter — a strengths/weaknesses snapshot.
export function strengthAverages(results = []) {
  const v = validResults(results);
  const n = v.length || 1;
  const avg = (k) => v.reduce((s, r) => s + (Number(r[k]) || 0), 0) / n;
  return { ph: r2(avg("phM")), cq: r2(avg("cqM")), eff: r2(avg("effM")), ip: r2(avg("ipM")) };
}

// Hours: used (completed + collaboration) vs allotted, per sprint.
export function utilizationSeries(results = []) {
  return validResults(results).map((r, i) => ({
    name: label(r, i),
    used: r1((Number(r.comp) || 0) + (Number(r.collab) || 0)),
    allotted: r1(r.ah),
  }));
}

// Ticket flow per sprint.
export function throughputSeries(results = []) {
  return validResults(results).map((r, i) => ({
    name: label(r, i),
    assigned: Number(r.assigned) || 0,
    closed: Number(r.closed) || 0,
    reopened: Number(r.reop) || 0,
  }));
}
