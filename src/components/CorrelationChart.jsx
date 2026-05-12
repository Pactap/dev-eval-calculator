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

export function CorrelationChart({ sprintResults, theme }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const isDark = theme === "dark";

  useEffect(() => {
    if (!chartRef.current || typeof window === "undefined") return;
    const validSprints = sprintResults.filter(r => r.wd > 0);
    if (validSprints.length < 1) return;

    if (chartInstance.current) chartInstance.current.destroy();

    const labels = validSprints.map(r => r.name || "Sprint");
    const ipData = validSprints.map(r => parseFloat(r.ipPct.toFixed(1)));
    const cqData = validSprints.map(r => r.cqO.multiplier * 100);
    const ipAchData = validSprints.map(r => parseFloat(r.ipAch.toFixed(2)));
    const cqAchData = validSprints.map(r => parseFloat(r.cqAch.toFixed(2)));

    const tickColor = isDark ? "#9ca3af" : "#64748b";
    const gridColor = isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.08)";

    chartInstance.current = new ChartJS(chartRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Issue Persist %", data: ipData, backgroundColor: isDark ? "#f87171" : "#dc2626", borderRadius: 6, yAxisID: "y", order: 2 },
          { label: "Code Quality Mult %", data: cqData, backgroundColor: isDark ? "#38bdf8" : "#2563eb", borderRadius: 6, yAxisID: "y", order: 3 },
          { label: "IP Achieved Pts", data: ipAchData, type: "line", borderColor: isDark ? "#fbbf24" : "#d97706", backgroundColor: "rgba(217,119,6,0.1)", fill: false, tension: 0.32, pointRadius: 4, pointBackgroundColor: isDark ? "#fbbf24" : "#d97706", yAxisID: "y1", order: 1 },
          { label: "CQ Achieved Pts", data: cqAchData, type: "line", borderColor: isDark ? "#a78bfa" : "#7c3aed", backgroundColor: "rgba(124,58,237,0.1)", fill: false, tension: 0.32, pointRadius: 4, pointBackgroundColor: isDark ? "#a78bfa" : "#7c3aed", yAxisID: "y1", order: 0 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
          tooltip: {
            backgroundColor: isDark ? "#111827" : "#0f172a",
            titleColor: "#ffffff",
            bodyColor: isDark ? "#d1d5db" : "#e2e8f0",
            borderColor: isDark ? "rgba(148,163,184,0.24)" : "rgba(255,255,255,0.16)",
            borderWidth: 1,
            callbacks: { label: ctx => ctx.dataset.label + ": " + ctx.raw },
          },
        },
        scales: {
          x: { ticks: { color: tickColor, font: { size: 11 }, maxRotation: 0 }, grid: { display: false } },
          y: { position: "left", title: { display: true, text: "Percentage (%)", color: tickColor, font: { size: 11 } }, ticks: { color: tickColor, font: { size: 11 } }, grid: { color: gridColor } },
          y1: { position: "right", title: { display: true, text: "Achieved Points", color: tickColor, font: { size: 11 } }, ticks: { color: tickColor, font: { size: 11 } }, grid: { display: false } },
        },
      },
    });

    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [sprintResults, isDark]);

  const hasData = sprintResults.some(r => r.wd > 0);
  if (!hasData) return null;

  const barRed = isDark ? "#f87171" : "#dc2626";
  const barBlue = isDark ? "#38bdf8" : "#2563eb";
  const lineAmber = isDark ? "#fbbf24" : "#d97706";
  const lineViolet = isDark ? "#a78bfa" : "#7c3aed";

  return (
    <div className="card chart-card">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Signal Correlation</div>
          <h2>Issue persists vs code quality</h2>
        </div>
      </div>
      <div className="chart-card__canvas-wrap">
        <canvas ref={chartRef}></canvas>
      </div>
      <div className="chart-card__legend">
        <span className="chart-card__legend-item"><span className="chart-card__legend-dot" style={{ background: barRed }}></span>Issue Persist %</span>
        <span className="chart-card__legend-item"><span className="chart-card__legend-dot" style={{ background: barBlue }}></span>Code Quality Mult %</span>
        <span className="chart-card__legend-item"><span className="chart-card__legend-line" style={{ background: lineAmber }}></span>IP Achieved Pts</span>
        <span className="chart-card__legend-item"><span className="chart-card__legend-line" style={{ background: lineViolet }}></span>CQ Achieved Pts</span>
      </div>
    </div>
  );
}
