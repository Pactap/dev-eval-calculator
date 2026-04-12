import {
  PLANNED_HOURS_BANDS, CODE_QUALITY_OPTIONS,
  EFFICIENCY_BANDS, ISSUE_PERSIST_BANDS, WEIGHTS,
} from "./constants";
import { getBand } from "./utils";

export function computeSprintResult(sprint, dailyRate, dailyCapacity) {
  const wd = parseFloat(sprint.workingDays) || 0;
  const bp = dailyRate * wd;
  const ah = dailyCapacity * wd;
  const comp = parseFloat(sprint.completedHours) || 0;
  const collab = parseFloat(sprint.collaborationHours) || 0;
  const reop = parseFloat(sprint.reopenedTickets) || 0;
  const done = parseFloat(sprint.doneTickets) || 0;
  const phPct = ah > 0 ? ((comp + collab) / ah) * 100 : 0;
  const effPct = ah > 0 ? (comp / ah) * 100 : 0;
  const zeroDone = done === 0;
  const ipPct = zeroDone ? 100 : (reop / done) * 100;
  const phB = getBand(Math.min(phPct, 100), PLANNED_HOURS_BANDS);
  const cqO = CODE_QUALITY_OPTIONS.find(o => o.label === sprint.codeQuality) || CODE_QUALITY_OPTIONS[1];
  const effB = getBand(Math.min(effPct, 100), EFFICIENCY_BANDS);
  const ipB = zeroDone ? ISSUE_PERSIST_BANDS[ISSUE_PERSIST_BANDS.length - 1] : getBand(ipPct, ISSUE_PERSIST_BANDS);
  const phA = bp * WEIGHTS.ph, cqA = bp * WEIGHTS.cq, effA = bp * WEIGHTS.eff, ipA = bp * WEIGHTS.ip;
  const phAch = phA * phB.multiplier, cqAch = cqA * cqO.multiplier, effAch = effA * effB.multiplier, ipAch = ipA * ipB.multiplier;
  const total = phAch + cqAch + effAch + ipAch;
  return { wd, bp, ah, phPct, effPct, ipPct, zeroDone, phB, cqO, effB, ipB, phA, cqA, effA, ipA, phAch, cqAch, effAch, ipAch, total, name: sprint.name };
}

export function computeQuarterlySummary(sprintResults, totalWorkingDays, dailyRate) {
  const tb = sprintResults.reduce((s, r) => s + r.bp, 0);
  const ta = sprintResults.reduce((s, r) => s + r.total, 0);
  const tw = sprintResults.reduce((s, r) => s + r.wd, 0);
  return { tb, ta, tw, rw: totalWorkingDays - tw, rb: dailyRate * (totalWorkingDays - tw) };
}
