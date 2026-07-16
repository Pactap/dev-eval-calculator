// Chart.js config builders shared by the on-screen Analytics dashboard and the PDF
// report, so both render identically. Each builder takes (results, dark) and returns a
// plain Chart.js config object — no React, no DOM. `results` are already filtered/valid.
import {
  trendSeries, parameterTrendSeries, contributionTotals,
  strengthAverages, utilizationSeries, throughputSeries,
} from "./analytics.js";

export const PARAM = {
  ph: { label: "Planned Hours", l: "#2563eb", d: "#60a5fa" },
  cq: { label: "Code Quality", l: "#7c3aed", d: "#a78bfa" },
  eff: { label: "Efficiency", l: "#0d9488", d: "#2dd4bf" },
  ip: { label: "Issue Persist", l: "#d97706", d: "#fbbf24" },
};
export const col = (k, dark) => (dark ? PARAM[k].d : PARAM[k].l);

export function themeColors(dark) {
  return {
    tick: dark ? "#94a3b8" : "#64748b",
    grid: dark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.07)",
    base: dark ? "#94a3b8" : "#475569",
    tip: dark ? "#111827" : "#0f172a",
    angle: dark ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.10)",
  };
}

// Shared base options. `animate` is off for the PDF (synchronous capture); `scale`
// multiplies font sizes so charts stay readable when rendered large for the PDF.
function baseOpts(dark, { legend = true, animate = true, scale = 1 } = {}) {
  const c = themeColors(dark);
  const fs = (n) => Math.round(n * scale);
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: animate ? undefined : false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: legend, labels: { color: c.tick, font: { size: fs(11) }, boxWidth: fs(12), boxHeight: fs(12), usePointStyle: true, padding: fs(14) } },
      tooltip: {
        backgroundColor: c.tip, titleColor: "#fff",
        bodyColor: dark ? "#d1d5db" : "#e2e8f0", padding: 10,
        borderColor: dark ? "rgba(148,163,184,0.24)" : "rgba(255,255,255,0.16)", borderWidth: 1,
      },
    },
    scales: {
      x: { ticks: { color: c.tick, font: { size: fs(10) }, maxRotation: 0, autoSkipPadding: 12 }, grid: { display: false }, border: { color: c.grid } },
      y: { beginAtZero: true, ticks: { color: c.tick, font: { size: fs(10) } }, grid: { color: c.grid }, border: { display: false } },
    },
  };
}
const yTitle = (opts, text, dark, scale = 1) => {
  opts.scales.y.title = { display: true, text, color: themeColors(dark).tick, font: { size: Math.round(10 * scale) } };
  return opts;
};

export function compositionConfig(results, dark, opts = {}) {
  const keys = ["ph", "cq", "eff", "ip"].filter(k => results.some(r => Math.abs(r[`${k}Ach`]) > 0.005));
  const bars = keys.map(k => ({
    label: PARAM[k].label,
    data: results.map(r => Number(r[`${k}Ach`].toFixed(2))),
    backgroundColor: col(k, dark), borderRadius: 4, borderSkipped: false, stack: "score", maxBarThickness: 46, order: 2,
  }));
  const base = {
    label: "Base (target)", type: "line",
    data: results.map(r => Number(r.bp.toFixed(2))),
    borderColor: themeColors(dark).base, backgroundColor: themeColors(dark).base,
    borderWidth: 2, borderDash: [5, 4], pointRadius: 2, pointHoverRadius: 4, tension: 0, stack: "target", order: 0,
  };
  const o = baseOpts(dark, opts);
  o.scales.x.stacked = true; o.scales.y.stacked = true;
  return { type: "bar", data: { labels: results.map((r, i) => r.name || `Sprint ${i + 1}`), datasets: [...bars, base] }, options: yTitle(o, "Achieved points", dark, opts.scale) };
}

export function trendConfig(results, dark, opts = {}) {
  const s = trendSeries(results);
  return {
    type: "line",
    data: { labels: s.map(x => x.name), datasets: [
      { label: "Achieved", data: s.map(x => x.achieved), borderColor: col("eff", dark), backgroundColor: col("eff", dark), tension: 0.25, pointRadius: 3, borderWidth: 2 },
      { label: "Base (target)", data: s.map(x => x.base), borderColor: themeColors(dark).base, backgroundColor: themeColors(dark).base, borderDash: [5, 4], tension: 0, pointRadius: 2, borderWidth: 2 },
    ] },
    options: yTitle(baseOpts(dark, opts), "Points", dark, opts.scale),
  };
}

export function parameterTrendConfig(results, dark, opts = {}) {
  const s = parameterTrendSeries(results);
  const line = (label, key, k) => ({ label, data: s.map(x => x[key]), borderColor: col(k, dark), backgroundColor: col(k, dark), tension: 0.25, pointRadius: 3, borderWidth: 2 });
  return {
    type: "line",
    data: { labels: s.map(x => x.name), datasets: [line("Planned Hours %", "ph", "ph"), line("Efficiency %", "eff", "eff"), line("Issue Persistence %", "ip", "ip")] },
    options: baseOpts(dark, opts),
  };
}

export function strengthsConfig(results, dark, opts = {}) {
  const a = strengthAverages(results);
  const c = themeColors(dark);
  const accent = col("cq", dark);
  const s = opts.scale || 1;
  return {
    type: "radar",
    data: { labels: [PARAM.ph.label, PARAM.cq.label, PARAM.eff.label, PARAM.ip.label], datasets: [{
      label: "Avg multiplier", data: [a.ph, a.cq, a.eff, a.ip],
      borderColor: accent, backgroundColor: dark ? "rgba(167,139,250,0.22)" : "rgba(124,58,237,0.16)",
      pointBackgroundColor: accent, borderWidth: 2,
    }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: opts.animate === false ? false : undefined,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: c.tip, titleColor: "#fff", bodyColor: dark ? "#d1d5db" : "#e2e8f0", padding: 10 } },
      scales: { r: { suggestedMin: 0, angleLines: { color: c.angle }, grid: { color: c.angle }, pointLabels: { color: c.tick, font: { size: Math.round(10 * s) } }, ticks: { color: c.tick, backdropColor: "transparent", font: { size: Math.round(9 * s) } } } },
    },
  };
}

export function contributionConfig(results, dark, opts = {}) {
  const t = contributionTotals(results);
  const c = themeColors(dark);
  return {
    type: "doughnut",
    data: { labels: [PARAM.ph.label, PARAM.cq.label, PARAM.eff.label, PARAM.ip.label], datasets: [{
      data: [t.ph, t.cq, t.eff, t.ip].map(v => Math.max(0, v)),
      backgroundColor: [col("ph", dark), col("cq", dark), col("eff", dark), col("ip", dark)],
      borderColor: dark ? "#0f172a" : "#ffffff", borderWidth: 2,
    }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "58%", animation: opts.animate === false ? false : undefined,
      plugins: {
        legend: { position: "bottom", labels: { color: c.tick, font: { size: Math.round(11 * (opts.scale || 1)) }, boxWidth: Math.round(12 * (opts.scale || 1)), usePointStyle: true, padding: 12 } },
        tooltip: { backgroundColor: c.tip, titleColor: "#fff", bodyColor: dark ? "#d1d5db" : "#e2e8f0", padding: 10, callbacks: { label: ctx => `${ctx.label}: ${Number(ctx.raw).toFixed(2)} pts` } },
      },
    },
  };
}

export function utilizationConfig(results, dark, opts = {}) {
  const s = utilizationSeries(results);
  return {
    type: "bar",
    data: { labels: s.map(x => x.name), datasets: [
      { label: "Used (completed + collab)", data: s.map(x => x.used), backgroundColor: col("ph", dark), borderRadius: 4, maxBarThickness: 26 },
      { label: "Allotted", data: s.map(x => x.allotted), backgroundColor: dark ? "rgba(148,163,184,0.35)" : "rgba(100,116,139,0.30)", borderRadius: 4, maxBarThickness: 26 },
    ] },
    options: yTitle(baseOpts(dark, opts), "Hours", dark, opts.scale),
  };
}

export function throughputConfig(results, dark, opts = {}) {
  const s = throughputSeries(results);
  const bar = (label, key, color) => ({ label, data: s.map(x => x[key]), backgroundColor: color, borderRadius: 3, maxBarThickness: 18 });
  return {
    type: "bar",
    data: { labels: s.map(x => x.name), datasets: [
      bar("Assigned", "assigned", dark ? "#64748b" : "#94a3b8"),
      bar("Closed", "closed", col("eff", dark)),
      bar("Done", "done", col("ph", dark)),
      bar("Reopened", "reopened", col("ip", dark)),
    ] },
    options: baseOpts(dark, opts),
  };
}
