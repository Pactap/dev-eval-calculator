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

    const tickColor = isDark ? "#606070" : "#6b7280";
    const titleColor = isDark ? "#f0f0f5" : "#374151";
    const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";

    chartInstance.current = new ChartJS(chartRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Issue Persist %", data: ipData, backgroundColor: isDark ? "#f87171" : "#ef4444", borderRadius: 4, yAxisID: "y", order: 2 },
          { label: "Code Quality Mult %", data: cqData, backgroundColor: isDark ? "#60a5fa" : "#3b82f6", borderRadius: 4, yAxisID: "y", order: 3 },
          { label: "IP Achieved Pts", data: ipAchData, type: "line", borderColor: isDark ? "#fb923c" : "#f97316", backgroundColor: "rgba(249,115,22,0.1)", fill: false, tension: 0.3, pointRadius: 5, pointBackgroundColor: isDark ? "#fb923c" : "#f97316", yAxisID: "y1", order: 1 },
          { label: "CQ Achieved Pts", data: cqAchData, type: "line", borderColor: isDark ? "#a78bfa" : "#8b5cf6", backgroundColor: "rgba(139,92,246,0.1)", fill: false, tension: 0.3, pointRadius: 5, pointBackgroundColor: isDark ? "#a78bfa" : "#8b5cf6", yAxisID: "y1", order: 0 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "Issue Persists vs Code Quality — correlation across sprints", color: titleColor, font: { size: 13, weight: "400" }, align: "start", padding: { bottom: 16 } },
          tooltip: {
            backgroundColor: isDark ? "#1a1a26" : "#1f2937",
            titleColor: isDark ? "#f0f0f5" : "#f9fafb",
            bodyColor: isDark ? "#a0a0b0" : "#d1d5db",
            borderColor: "rgba(255,255,255,0.1)", borderWidth: 1,
            callbacks: { label: ctx => ctx.dataset.label + ": " + ctx.raw },
          },
        },
        scales: {
          x: { ticks: { color: tickColor, font: { size: 11 }, maxRotation: 45 }, grid: { display: false } },
          y: { position: "left", title: { display: true, text: "Percentage (%)", color: tickColor, font: { size: 11 } }, ticks: { color: tickColor, font: { size: 11 } }, grid: { color: gridColor } },
          y1: { position: "right", title: { display: true, text: "Achieved Points", color: tickColor, font: { size: 11 } }, ticks: { color: tickColor, font: { size: 11 } }, grid: { display: false } },
        },
      },
    });

    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [sprintResults, isDark]);

  const hasData = sprintResults.some(r => r.wd > 0);
  if (!hasData) return null;

  const barRed = isDark ? "#f87171" : "#ef4444";
  const barBlue = isDark ? "#60a5fa" : "#3b82f6";
  const lineOrange = isDark ? "#fb923c" : "#f97316";
  const lineViolet = isDark ? "#a78bfa" : "#8b5cf6";

  return (
    <div className="card chart-card">
      <div className="chart-card__canvas-wrap">
        <canvas ref={chartRef}></canvas>
      </div>
      <div className="chart-card__legend">
        <span className="chart-card__legend-item"><span className="chart-card__legend-dot" style={{ background: barRed }}></span>Issue Persist %</span>
        <span className="chart-card__legend-item"><span className="chart-card__legend-dot" style={{ background: barBlue }}></span>Code Quality Mult %</span>
        <span className="chart-card__legend-item"><span className="chart-card__legend-line" style={{ background: lineOrange }}></span>IP Achieved Pts</span>
        <span className="chart-card__legend-item"><span className="chart-card__legend-line" style={{ background: lineViolet }}></span>CQ Achieved Pts</span>
      </div>
    </div>
  );
}
