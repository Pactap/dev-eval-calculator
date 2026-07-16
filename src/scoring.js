import { getBand } from "./utils.js";

export function computeSprintResult(sprint, dailyRate, dailyCapacity, config) {
  const { weights, plannedHoursBands, codeQualityOptions, efficiencyBands, issuePersistBands } = config;

  // Productive days: whole-sprint drives allotted hours & percentages (intrinsic to the
  // sprint); in-quarter overlap drives the base-points share claimed by this quarter.
  const wdTotal = Math.max(0, parseFloat(sprint.workingDaysTotal ?? sprint.workingDays) || 0);
  const wdInQuarter = Math.max(0, parseFloat(sprint.workingDaysInQuarter ?? sprint.workingDays) || 0);
  const leaks = wdInQuarter < wdTotal;

  const bp = dailyRate * wdInQuarter;        // quarter's share of base points
  const ah = dailyCapacity * wdTotal;        // available productive hours (whole sprint)

  const comp = Math.max(0, parseFloat(sprint.completedHours) || 0);
  const collab = Math.max(0, parseFloat(sprint.collaborationHours) || 0);
  const assigned = Math.max(0, parseFloat(sprint.assignedTickets) || 0);
  const closed = Math.max(0, parseFloat(sprint.closedTickets) || 0);
  const reop = Math.max(0, parseFloat(sprint.reopenedTickets) || 0);
  const done = Math.max(0, parseFloat(sprint.doneTickets) || 0);

  // A sprint with no recorded work (no hours AND no tickets of any kind) earns nothing —
  // the default code-quality grade must not hand out free points.
  const hasActivity = comp > 0 || collab > 0 || assigned > 0 || closed > 0 || reop > 0 || done > 0;
  const noActivity = !hasActivity;

  const phPct = ah > 0 ? ((comp + collab) / ah) * 100 : 0;
  const noAssigned = assigned === 0;
  const effPct = noAssigned ? 0 : (closed / assigned) * 100;
  const zeroDone = done === 0;
  const ipPct = zeroDone ? 100 : (reop / done) * 100;

  const NEUTRAL = { label: "—", multiplier: 0 };
  const NO_TICKETS = { label: "no tickets", multiplier: 0 }; // zero assigned tickets earns no efficiency credit
  const phB = getBand(Math.min(phPct, 100), plannedHoursBands);
  const cqO = codeQualityOptions.find(o => o.label === sprint.codeQuality) || codeQualityOptions[Math.min(1, codeQualityOptions.length - 1)] || NEUTRAL;
  const effB = noAssigned ? NO_TICKETS : getBand(effPct, efficiencyBands);
  const ipB = (zeroDone ? issuePersistBands[issuePersistBands.length - 1] : getBand(ipPct, issuePersistBands)) || NEUTRAL;

  // Effective multiplier zeroes out entirely when there is no activity, so the
  // per-parameter Allocated x Multiplier = Achieved column stays self-consistent.
  const active = noActivity ? 0 : 1;
  const phM = phB.multiplier * active;
  const cqM = cqO.multiplier * active;
  const effM = effB.multiplier * active;
  const ipM = ipB.multiplier * active;

  const phA = bp * weights.ph, cqA = bp * weights.cq, effA = bp * weights.eff, ipA = bp * weights.ip;
  const phAch = phA * phM, cqAch = cqA * cqM, effAch = effA * effM, ipAch = ipA * ipM;
  const total = phAch + cqAch + effAch + ipAch;

  return {
    wd: wdInQuarter, wdTotal, wdInQuarter, leaks,
    bp, ah, phPct, effPct, ipPct, zeroDone, noAssigned, noActivity,
    comp, collab, reop, assigned, closed, done,
    phB, cqO, effB, ipB, phM, cqM, effM, ipM,
    phA, cqA, effA, ipA, phAch, cqAch, effAch, ipAch,
    total, name: sprint.name,
  };
}

export function computeQuarterlySummary(sprintResults, totalWorkingDays, dailyRate) {
  const tb = sprintResults.reduce((s, r) => s + r.bp, 0);
  const ta = sprintResults.reduce((s, r) => s + r.total, 0);
  const tw = sprintResults.reduce((s, r) => s + r.wd, 0);
  // Frozen locked-sprint days can exceed a later-shrunk quarter; never show negative remaining.
  const rem = Math.max(0, totalWorkingDays - tw);
  return { tb, ta, tw, rw: rem, rb: dailyRate * rem };
}
