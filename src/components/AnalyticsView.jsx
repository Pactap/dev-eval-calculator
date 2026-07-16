import { useEffect, useRef, useMemo } from "react";
import {
  Chart as ChartJS,
  BarController, LineController, DoughnutController, RadarController,
  CategoryScale, LinearScale, RadialLinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Filler, Tooltip, Legend,
} from "chart.js";
import { CorrelationChart } from "./CorrelationChart.jsx";
import { Boundary } from "../ErrorBoundary.jsx";
import {
  validResults, trendSeries, parameterTrendSeries,
  contributionTotals, strengthAverages, utilizationSeries, throughputSeries,
} from "../analytics.js";

ChartJS.register(
  BarController, LineController, DoughnutController, RadarController,
  CategoryScale, LinearScale, RadialLinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Filler, Tooltip, Legend,
);

const PARAM = {
  ph: { label: "Planned Hours", l: "#2563eb", d: "#60a5fa" },
  cq: { label: "Code Quality", l: "#7c3aed", d: "#a78bfa" },
  eff: { label: "Efficiency", l: "#0d9488", d: "#2dd4bf" },
  ip: { label: "Issue Persist", l: "#d97706", d: "#fbbf24" },
};
const col = (k, dark) => (dark ? PARAM[k].d : PARAM[k].l);

function themeColors(dark) {
  return {
    tick: dark ? "#94a3b8" : "#64748b",
    grid: dark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.07)",
    base: dark ? "#94a3b8" : "#475569",
    tip: dark ? "#111827" : "#0f172a",
    angle: dark ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.10)",
  };
}

function baseOpts(dark, { legend = true } = {}) {
  const c = themeColors(dark);
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: legend, labels: { color: c.tick, font: { size: 11 }, boxWidth: 12, usePointStyle: true } },
      tooltip: {
        backgroundColor: c.tip, titleColor: "#fff",
        bodyColor: dark ? "#d1d5db" : "#e2e8f0", padding: 10,
        borderColor: dark ? "rgba(148,163,184,0.24)" : "rgba(255,255,255,0.16)", borderWidth: 1,
      },
    },
    scales: {
      x: { ticks: { color: c.tick, font: { size: 10 }, maxRotation: 0 }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: c.tick, font: { size: 10 } }, grid: { color: c.grid } },
    },
  };
}

// Generic canvas that (re)builds a Chart.js instance whenever `config` changes.
function ChartCanvas({ config, ariaLabel }) {
  const ref = useRef(null);
  const inst = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.destroy();
    inst.current = new ChartJS(ref.current, config);
    return () => { if (inst.current) { inst.current.destroy(); inst.current = null; } };
  }, [config]);
  return (
    <div className="analytics-card__canvas">
      <canvas ref={ref} role="img" aria-label={ariaLabel} />
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card analytics-card">
      <div className="analytics-card__head">
        <h3>{title}</h3>
        {subtitle && <span className="analytics-card__sub">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

/* ---- individual charts (each memoizes its config on data + theme) ---- */

function TrendChart({ results, dark }) {
  const config = useMemo(() => {
    const s = trendSeries(results);
    const c = themeColors(dark);
    return {
      type: "line",
      data: {
        labels: s.map(x => x.name),
        datasets: [
          { label: "Achieved", data: s.map(x => x.achieved), borderColor: col("eff", dark), backgroundColor: col("eff", dark), tension: 0.25, pointRadius: 3, borderWidth: 2 },
          { label: "Base (target)", data: s.map(x => x.base), borderColor: c.base, backgroundColor: c.base, borderDash: [5, 4], tension: 0, pointRadius: 2, borderWidth: 2 },
        ],
      },
      options: { ...baseOpts(dark), scales: { ...baseOpts(dark).scales, y: { ...baseOpts(dark).scales.y, title: { display: true, text: "Points", color: c.tick, font: { size: 10 } } } } },
    };
  }, [results, dark]);
  return <ChartCanvas config={config} ariaLabel="Line chart of achieved points versus the base target for each sprint." />;
}

function ParameterTrendChart({ results, dark }) {
  const config = useMemo(() => {
    const s = parameterTrendSeries(results);
    return {
      type: "line",
      data: {
        labels: s.map(x => x.name),
        datasets: [
          { label: "Planned Hours %", data: s.map(x => x.ph), borderColor: col("ph", dark), backgroundColor: col("ph", dark), tension: 0.25, pointRadius: 3, borderWidth: 2 },
          { label: "Efficiency %", data: s.map(x => x.eff), borderColor: col("eff", dark), backgroundColor: col("eff", dark), tension: 0.25, pointRadius: 3, borderWidth: 2 },
          { label: "Issue Persistence %", data: s.map(x => x.ip), borderColor: col("ip", dark), backgroundColor: col("ip", dark), tension: 0.25, pointRadius: 3, borderWidth: 2 },
        ],
      },
      options: baseOpts(dark),
    };
  }, [results, dark]);
  return <ChartCanvas config={config} ariaLabel="Line chart of Planned Hours, Efficiency and Issue Persistence percentages per sprint." />;
}

function StrengthsRadar({ results, dark }) {
  const config = useMemo(() => {
    const a = strengthAverages(results);
    const c = themeColors(dark);
    const accent = col("cq", dark);
    return {
      type: "radar",
      data: {
        labels: [PARAM.ph.label, PARAM.cq.label, PARAM.eff.label, PARAM.ip.label],
        datasets: [{
          label: "Avg multiplier",
          data: [a.ph, a.cq, a.eff, a.ip],
          borderColor: accent,
          backgroundColor: dark ? "rgba(167,139,250,0.22)" : "rgba(124,58,237,0.16)",
          pointBackgroundColor: accent, borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: c.tip, titleColor: "#fff", bodyColor: dark ? "#d1d5db" : "#e2e8f0", padding: 10 } },
        scales: { r: { angleLines: { color: c.angle }, grid: { color: c.angle }, pointLabels: { color: c.tick, font: { size: 10 } }, ticks: { color: c.tick, backdropColor: "transparent", font: { size: 9 } } } },
      },
    };
  }, [results, dark]);
  return <ChartCanvas config={config} ariaLabel="Radar chart of the average reward multiplier for each of the four parameters." />;
}

function ContributionDonut({ results, dark }) {
  const config = useMemo(() => {
    const t = contributionTotals(results);
    const c = themeColors(dark);
    return {
      type: "doughnut",
      data: {
        labels: [PARAM.ph.label, PARAM.cq.label, PARAM.eff.label, PARAM.ip.label],
        datasets: [{
          data: [t.ph, t.cq, t.eff, t.ip],
          backgroundColor: [col("ph", dark), col("cq", dark), col("eff", dark), col("ip", dark)],
          borderColor: dark ? "#0f172a" : "#ffffff", borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "58%",
        plugins: {
          legend: { position: "bottom", labels: { color: c.tick, font: { size: 11 }, boxWidth: 12, usePointStyle: true } },
          tooltip: { backgroundColor: c.tip, titleColor: "#fff", bodyColor: dark ? "#d1d5db" : "#e2e8f0", padding: 10, callbacks: { label: ctx => `${ctx.label}: ${Number(ctx.raw).toFixed(2)} pts` } },
        },
      },
    };
  }, [results, dark]);
  return <ChartCanvas config={config} ariaLabel="Doughnut chart of total achieved points contributed by each parameter." />;
}

function UtilizationChart({ results, dark }) {
  const config = useMemo(() => {
    const s = utilizationSeries(results);
    return {
      type: "bar",
      data: {
        labels: s.map(x => x.name),
        datasets: [
          { label: "Used (completed + collab)", data: s.map(x => x.used), backgroundColor: col("ph", dark), borderRadius: 4, maxBarThickness: 28 },
          { label: "Allotted", data: s.map(x => x.allotted), backgroundColor: dark ? "rgba(148,163,184,0.35)" : "rgba(100,116,139,0.30)", borderRadius: 4, maxBarThickness: 28 },
        ],
      },
      options: { ...baseOpts(dark), scales: { ...baseOpts(dark).scales, y: { ...baseOpts(dark).scales.y, title: { display: true, text: "Hours", color: themeColors(dark).tick, font: { size: 10 } } } } },
    };
  }, [results, dark]);
  return <ChartCanvas config={config} ariaLabel="Grouped bar chart of used versus allotted hours per sprint." />;
}

function ThroughputChart({ results, dark }) {
  const config = useMemo(() => {
    const s = throughputSeries(results);
    return {
      type: "bar",
      data: {
        labels: s.map(x => x.name),
        datasets: [
          { label: "Assigned", data: s.map(x => x.assigned), backgroundColor: dark ? "#64748b" : "#94a3b8", borderRadius: 3, maxBarThickness: 20 },
          { label: "Closed", data: s.map(x => x.closed), backgroundColor: col("eff", dark), borderRadius: 3, maxBarThickness: 20 },
          { label: "Done", data: s.map(x => x.done), backgroundColor: col("ph", dark), borderRadius: 3, maxBarThickness: 20 },
          { label: "Reopened", data: s.map(x => x.reopened), backgroundColor: col("ip", dark), borderRadius: 3, maxBarThickness: 20 },
        ],
      },
      options: baseOpts(dark),
    };
  }, [results, dark]);
  return <ChartCanvas config={config} ariaLabel="Grouped bar chart of assigned, closed, done and reopened tickets per sprint." />;
}

export function AnalyticsView({ sprintResults = [], theme }) {
  const dark = theme === "dark";
  const hasData = validResults(sprintResults).length > 0;

  if (!hasData) {
    return (
      <section className="analytics" aria-label="Performance analytics">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Performance Analytics</div>
            <h2>Developer Monitoring Dashboard</h2>
          </div>
        </div>
        <div className="card analytics-empty">
          Enter sprint data (dates, hours, tickets) or lock the evaluation period to generate sprints —
          the performance charts appear here once there are sprints with productive days.
        </div>
      </section>
    );
  }

  return (
    <section className="analytics" aria-label="Performance analytics">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Performance Analytics</div>
          <h2>Developer Monitoring Dashboard</h2>
        </div>
      </div>

      <div className="analytics-grid">
        <Boundary label="Score composition"><CorrelationChart sprintResults={sprintResults} theme={theme} /></Boundary>
        <Boundary label="Achieved vs target">
          <ChartCard title="Achieved vs Target" subtitle="Points per sprint">
            <TrendChart results={sprintResults} dark={dark} />
          </ChartCard>
        </Boundary>
        <Boundary label="Parameter trends">
          <ChartCard title="Parameter Trends" subtitle="Input % per sprint">
            <ParameterTrendChart results={sprintResults} dark={dark} />
          </ChartCard>
        </Boundary>
        <Boundary label="Strengths radar">
          <ChartCard title="Strengths" subtitle="Avg multiplier by parameter">
            <StrengthsRadar results={sprintResults} dark={dark} />
          </ChartCard>
        </Boundary>
        <Boundary label="Contribution">
          <ChartCard title="Score Contribution" subtitle="Where the points came from">
            <ContributionDonut results={sprintResults} dark={dark} />
          </ChartCard>
        </Boundary>
        <Boundary label="Hours utilization">
          <ChartCard title="Hours Utilization" subtitle="Used vs allotted">
            <UtilizationChart results={sprintResults} dark={dark} />
          </ChartCard>
        </Boundary>
        <Boundary label="Ticket throughput">
          <ChartCard title="Ticket Throughput" subtitle="Per sprint">
            <ThroughputChart results={sprintResults} dark={dark} />
          </ChartCard>
        </Boundary>
      </div>
    </section>
  );
}
