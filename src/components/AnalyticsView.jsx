import { useEffect, useRef, useMemo } from "react";
import {
  Chart as ChartJS,
  BarController, LineController, DoughnutController, RadarController,
  CategoryScale, LinearScale, RadialLinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Filler, Tooltip, Legend,
} from "chart.js";
import { Boundary } from "../ErrorBoundary.jsx";
import { validResults, hasAchieved, hasActivity, hasHours, hasTickets } from "../analytics.js";
import {
  compositionConfig, trendConfig, parameterTrendConfig,
  strengthsConfig, contributionConfig, utilizationConfig, throughputConfig,
} from "../analyticsCharts.js";

ChartJS.register(
  BarController, LineController, DoughnutController, RadarController,
  CategoryScale, LinearScale, RadialLinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Filler, Tooltip, Legend,
);

// Rebuilds a Chart.js instance whenever its config changes; cleans up on unmount.
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

// One card: header (title + subtitle) and either the chart or a clean empty state.
function Chart({ title, subtitle, show, empty, config, ariaLabel }) {
  return (
    <Boundary label={title}>
      <div className="card analytics-card">
        <div className="analytics-card__head">
          <h3>{title}</h3>
          {subtitle && <span className="analytics-card__sub">{subtitle}</span>}
        </div>
        {show
          ? <ChartCanvas config={config} ariaLabel={ariaLabel} />
          : <div className="analytics-card__empty">{empty}</div>}
      </div>
    </Boundary>
  );
}

export function AnalyticsView({ sprintResults = [], theme }) {
  const dark = theme === "dark";
  const results = useMemo(() => validResults(sprintResults), [sprintResults]);
  const cfg = useMemo(() => (results.length ? {
    composition: compositionConfig(results, dark),
    trend: trendConfig(results, dark),
    params: parameterTrendConfig(results, dark),
    strengths: strengthsConfig(results, dark),
    contribution: contributionConfig(results, dark),
    utilization: utilizationConfig(results, dark),
    throughput: throughputConfig(results, dark),
  } : {}), [results, dark]);

  const Header = (
    <div className="section-heading">
      <div>
        <div className="eyebrow">Performance Analytics</div>
        <h2>Developer Monitoring Dashboard</h2>
      </div>
    </div>
  );

  if (!results.length) {
    return (
      <section className="analytics" aria-label="Performance analytics">
        {Header}
        <div className="card analytics-empty">
          Enter sprint data (dates, hours, tickets) or lock the evaluation period to generate sprints —
          the performance charts appear here once there are sprints with productive days.
        </div>
      </section>
    );
  }

  const achieved = hasAchieved(results);
  const activity = hasActivity(results);
  const hours = hasHours(results);
  const tickets = hasTickets(results);

  return (
    <section className="analytics" aria-label="Performance analytics">
      {Header}
      <div className="analytics-grid">
        <Chart title="Score Composition" subtitle="Achieved points per sprint"
          show={achieved} empty="Record sprint hours, tickets, or a code-quality grade to see how points are composed."
          config={cfg.composition} ariaLabel="Stacked bar chart of achieved points per parameter for each sprint, with a dashed base-target line." />
        <Chart title="Achieved vs Target" subtitle="Points per sprint"
          show={achieved} empty="Achieved points appear once sprints have recorded activity."
          config={cfg.trend} ariaLabel="Line chart of achieved points versus the base target for each sprint." />
        <Chart title="Parameter Trends" subtitle="Input % per sprint"
          show={activity} empty="Enter hours and tickets to chart Planned Hours, Efficiency and Issue Persistence."
          config={cfg.params} ariaLabel="Line chart of Planned Hours, Efficiency and Issue Persistence percentages per sprint." />
        <Chart title="Strengths" subtitle="Avg multiplier by parameter"
          show={achieved} empty="Strengths appear once sprints have scored activity."
          config={cfg.strengths} ariaLabel="Radar chart of the average reward multiplier for each of the four parameters." />
        <Chart title="Score Contribution" subtitle="Where the points came from"
          show={achieved} empty="No points contributed yet — record sprint activity."
          config={cfg.contribution} ariaLabel="Doughnut chart of total achieved points contributed by each parameter." />
        <Chart title="Hours Utilization" subtitle="Used vs allotted"
          show={hours} empty="Enter completed and collaboration hours to see utilization."
          config={cfg.utilization} ariaLabel="Grouped bar chart of used versus allotted hours per sprint." />
        <Chart title="Ticket Throughput" subtitle="Per sprint"
          show={tickets} empty="Enter ticket counts (Assigned / Marked Closed / Reopened) to see throughput."
          config={cfg.throughput} ariaLabel="Grouped bar chart of Tickets Assigned, Marked Closed and Reopened per sprint." />
      </div>
    </section>
  );
}
