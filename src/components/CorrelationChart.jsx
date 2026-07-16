import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  BarController, LineController,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend,
} from "chart.js";

ChartJS.register(
  BarController, LineController,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend,
);

// Semantic palette per parameter (light / dark).
const PARAMS = [
  { key: "phAch", label: "Planned Hours", light: "#2563eb", dark: "#60a5fa" },
  { key: "cqAch", label: "Code Quality", light: "#7c3aed", dark: "#a78bfa" },
  { key: "effAch", label: "Efficiency", light: "#0d9488", dark: "#2dd4bf" },
  { key: "ipAch", label: "Issue Persist", light: "#d97706", dark: "#fbbf24" },
];

export function CorrelationChart({ sprintResults, theme }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const isDark = theme === "dark";

  const valid = sprintResults.filter(r => r.wdTotal > 0);
  const hasData = valid.length > 0;

  useEffect(() => {
    if (!chartRef.current || typeof window === "undefined" || !hasData) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const labels = valid.map((r, i) => r.name || `Sprint ${i + 1}`);
    const tickColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.07)";
    const baseColor = isDark ? "#94a3b8" : "#475569";

    // Only include a parameter series if it contributes anywhere (skips zero-weight noise).
    const barSets = PARAMS
      .filter(p => valid.some(r => Math.abs(r[p.key]) > 0.005))
      .map(p => ({
        label: p.label,
        data: valid.map(r => parseFloat(r[p.key].toFixed(2))),
        backgroundColor: isDark ? p.dark : p.light,
        borderRadius: 4,
        borderSkipped: false,
        stack: "score",
        maxBarThickness: 64,
        order: 2,
      }));

    const baseLine = {
      label: "Base (target)",
      type: "line",
      data: valid.map(r => parseFloat(r.bp.toFixed(2))),
      borderColor: baseColor,
      backgroundColor: baseColor,
      borderWidth: 2,
      borderDash: [5, 4],
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: baseColor,
      tension: 0,
      stack: "target",
      order: 0,
    };

    chartInstance.current = new ChartJS(chartRef.current, {
      type: "bar",
      data: { labels, datasets: [...barSets, baseLine] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          title: { display: false },
          tooltip: {
            backgroundColor: isDark ? "#111827" : "#0f172a",
            titleColor: "#ffffff",
            bodyColor: isDark ? "#d1d5db" : "#e2e8f0",
            borderColor: isDark ? "rgba(148,163,184,0.24)" : "rgba(255,255,255,0.16)",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)} pts`,
              footer: items => {
                const achieved = items
                  .filter(it => it.dataset.stack === "score")
                  .reduce((s, it) => s + Number(it.raw), 0);
                return `Achieved total: ${achieved.toFixed(2)} pts`;
              },
            },
          },
        },
        scales: {
          x: { stacked: true, ticks: { color: tickColor, font: { size: 11 }, maxRotation: 0 }, grid: { display: false } },
          y: {
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: "Achieved points", color: tickColor, font: { size: 11 } },
            ticks: { color: tickColor, font: { size: 11 } },
            grid: { color: gridColor },
          },
        },
      },
    });

    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [sprintResults, isDark, hasData]);

  const shownParams = PARAMS.filter(p => valid.some(r => Math.abs(r[p.key]) > 0.005));

  return (
    <div className="card chart-card">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Performance Analytics</div>
          <h2>Score Composition by Sprint</h2>
        </div>
      </div>
      {hasData ? (
        <>
          <div className="chart-card__canvas-wrap">
            <canvas ref={chartRef} role="img" aria-label="Stacked bar chart of achieved points per parameter for each sprint, with a dashed line for the pro-rata base target."></canvas>
          </div>
          <div className="chart-card__legend">
            {shownParams.map(p => (
              <span key={p.key} className="chart-card__legend-item">
                <span className="chart-card__legend-dot" style={{ background: isDark ? p.dark : p.light }}></span>
                {p.label}
              </span>
            ))}
            <span className="chart-card__legend-item">
              <span className="chart-card__legend-line chart-card__legend-line--dashed" style={{ background: isDark ? "#94a3b8" : "#475569" }}></span>
              Base (target)
            </span>
          </div>
        </>
      ) : (
        <div className="chart-card__empty">
          Enter sprint dates or lock the quarter to generate sprints — score composition appears here.
        </div>
      )}
    </div>
  );
}
