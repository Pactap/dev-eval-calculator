import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { sanitizePdfText as A } from "./utils.js";
import { summarizeAvailability } from "./availability.js";
import { APP_VERSION } from "./version.js";

/* ---- Palette (Fortune-500 restrained navy/slate) ---- */
const NAVY = [30, 58, 138];
const ACCENT = [29, 78, 216];
const INK = [17, 24, 39];
const MUTED = [100, 116, 139];
const RULE = [226, 232, 240];
const ALT = [246, 249, 252];
const POS = [4, 120, 87];
const NEG = [180, 35, 24];
const WHITE = [255, 255, 255];

const MARGIN = { top: 108, bottom: 62, left: 50, right: 50 };

/* ---- Formatting helpers ---- */
function fmtDate(str) {
  if (!str) return "-";
  const [y, m, d] = String(str).split("-").map(Number);
  if (!y || !m || !d) return "-";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d).padStart(2, "0")} ${months[m - 1]} ${y}`;
}
const n2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : "-");
const n4 = (v) => (Number.isFinite(v) ? v.toFixed(4) : "-");
const pct = (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : "-");
const mult = (v) => (Number.isFinite(v) ? `${v.toFixed(2)}x` : "-");
const dash = (v) => (v == null || v === "" ? "-" : A(v));

/**
 * Generate a branded quarterly evaluation report as a PDF and trigger download.
 * Throws on failure so the caller can surface an error to the user.
 */
export function generateQuarterlyReportPDF(data) {
  const {
    quarterStart, quarterEnd, quarterBase, dailyCapacity, holidays = [],
    holidayNames = {}, restrictedHolidayPool = [],
    totalWorkingDays, dailyRate, config, sprints, sprintResults, summary,
    reportMeta = {}, generatedAt,
  } = data;

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - MARGIN.left - MARGIN.right;
  const stamp = generatedAt || new Date();
  const genLabel = stamp.toLocaleString("en-US", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const periodLabel = `${fmtDate(quarterStart)}  -  ${fmtDate(quarterEnd)}`;
  const meta = reportMeta || {};

  /* ---------- title + subject ---------- */
  let y = MARGIN.top;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("DEVELOPER SPRINT EVALUATION", MARGIN.left, y, { charSpace: 1.4 });
  y += 20;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  doc.text("Quarterly Performance Report", MARGIN.left, y, { charSpace: -0.3 });
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  const subject = meta.devName
    ? `Prepared for ${A(meta.devName)}${meta.empId ? `  |  Employee ID ${A(meta.empId)}` : ""}`
    : `Evaluation period  ${periodLabel}`;
  doc.text(clip(doc, subject, contentW), MARGIN.left, y);
  y += 26;

  /* ---------- section: report summary (identity) ---------- */
  y = sectionTitle(doc, "Report Summary", y);
  const identity = [
    ["Developer", dash(meta.devName), "Employee ID", dash(meta.empId)],
    ["Quarter", dash(meta.quarterLabel), "Date of joining", meta.doj ? fmtDate(meta.doj) : "-"],
    ["Evaluation period", periodLabel, "Generated", A(genLabel)],
  ];
  keyValueTable(doc, y, contentW, identity);
  y = doc.lastAutoTable.finalY + 26;

  /* ---------- section: evaluation parameters ---------- */
  y = sectionTitle(doc, "Evaluation Parameters", y);
  const holidayText = holidays.length
    ? `${holidays.length} (${[...holidays].sort().map(fmtDate).join(", ")})`
    : "None";
  const params = [
    ["Quarter start", fmtDate(quarterStart), "Base score", `${quarterBase}`],
    ["Quarter end", fmtDate(quarterEnd), "Daily capacity", `${dailyCapacity} hrs/day`],
    ["Work week", "Mon-Fri (Sat/Sun excluded)", "Productive days", `${totalWorkingDays}`],
    ["Sprints evaluated", `${sprints.length}`, "Daily rate", n4(dailyRate)],
    ["Available hours", `${(totalWorkingDays * dailyCapacity).toFixed(0)} hrs`, "Holidays", holidayText],
  ];
  keyValueTable(doc, y, contentW, params);
  y = doc.lastAutoTable.finalY + 26;

  /* ---------- section: availability & time off ---------- */
  const avail = summarizeAvailability({ quarterStart, quarterEnd, holidays, holidayNames, restrictedHolidayPool, sprints });
  if (avail.companyHolidays.length || avail.restrictedHolidays.length) {
    y = ensureSpace(doc, y, 150);
    y = sectionTitle(doc, "Availability & Time Off", y);

    const holidayLine = avail.companyHolidays.length
      ? avail.companyHolidays.map(h => `${h.name ? h.name + " - " : ""}${fmtDate(h.date)}${h.weekend ? " (weekend, no impact)" : ""}`).join(",  ")
      : "None in this period";
    const rhLine = avail.restrictedHolidays.length
      ? avail.restrictedHolidays.map(r => `${r.label ? r.label + " - " : ""}${fmtDate(r.date)}${r.sprintName ? ` (${r.sprintName})` : ""}`).join(",  ")
      : "None availed";
    const dilutedHrs = avail.dilutedDays * (Number(dailyCapacity) || 0);

    keyValueTable(doc, y, contentW, [
      ["Company holidays", holidayLine, "On weekend (no impact)", `${avail.weekendHolidays}`],
      ["Restricted holiday", rhLine, "Annual entitlement", "1 / calendar year"],
      ["Productive days lost", `${avail.dilutedDays} (~${dilutedHrs.toFixed(0)} hrs)`, "Basis", "Pro-rata to productive days"],
    ]);
    y = doc.lastAutoTable.finalY + 10;

    // Constructive framing: time away scales the target down, it is not a penalty.
    const note = avail.dilutedDays > 0
      ? "Scoring is pro-rata to productive days. Company holidays and approved restricted leave reduce the point pool proportionally and are not attributed to the developer; measured per-day performance is unaffected."
      : "The recorded holidays fell on weekends, which are already non-working days, so they had no additional impact on productive days or the score.";
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const noteLines = doc.splitTextToSize(A(note), contentW);
    doc.text(noteLines, MARGIN.left, y);
    doc.setFont("helvetica", "normal");
    y += noteLines.length * 11 + 20;
  }

  /* ---------- section: weighting model ---------- */
  y = ensureSpace(doc, y, 120);
  y = sectionTitle(doc, "Weighting Model", y);
  const w = config.weights;
  autoTable(doc, {
    startY: y,
    margin: MARGIN,
    head: [["Parameter", "Weight"]],
    body: rows([
      ["Planned Hours", `${(w.ph * 100).toFixed(0)}%`],
      ["Code Quality", `${(w.cq * 100).toFixed(0)}%`],
      ["Efficiency (closed / assigned tickets)", `${(w.eff * 100).toFixed(0)}%`],
      ["Issue Persistence", `${(w.ip * 100).toFixed(0)}%`],
    ]),
    foot: [["Total", `${(Object.values(w).reduce((a, b) => a + (Number(b) || 0), 0) * 100).toFixed(0)}%`]],
    ...tableTheme(),
    columnStyles: { 1: { halign: "right", cellWidth: 90 } },
    tableWidth: contentW * 0.62,
  });
  y = doc.lastAutoTable.finalY + 26;

  /* ---------- section: quarterly rollup ---------- */
  y = ensureSpace(doc, y, 160);
  y = sectionTitle(doc, "Quarterly Rollup", y);

  const delta = summary.ta - summary.tb;
  const pctOfBase = quarterBase > 0 ? (summary.ta / quarterBase) * 100 : 0;
  y = scoreCallout(doc, {
    y, contentW,
    achieved: summary.ta, base: summary.tb, delta,
    pctOfBase, daysUsed: summary.tw, totalDays: totalWorkingDays,
  });
  y += 16;

  const rollupBody = rows(sprintResults.map((r, i) => {
    const s = sprints[i];
    const period = `${fmtDate(s.startDate)} - ${fmtDate(s.endDate)}`;
    const days = r.leaks ? `${r.wdInQuarter} / ${r.wdTotal}` : `${r.wd}`;
    let status = s.locked ? "Locked" : "Open";
    if (r.noActivity) status = "No activity";
    return [
      r.name || `Sprint ${i + 1}`,
      period, days, n2(r.bp),
      r.wdTotal > 0 ? n2(r.total) : "-",
      status,
    ];
  }));
  autoTable(doc, {
    startY: y,
    margin: MARGIN,
    head: [["Sprint", "Period", "Days (qtr/total)", "Base", "Achieved", "Status"]],
    body: rollupBody,
    foot: [["Total", "", `${summary.tw} / ${totalWorkingDays}`, n2(summary.tb), n2(summary.ta), ""]],
    ...tableTheme(),
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 92 },
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
      5: { halign: "center" },
    },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 4) {
        const r = sprintResults[hook.row.index];
        if (r && r.wdTotal > 0) hook.cell.styles.textColor = r.total >= r.bp ? POS : NEG;
      }
    },
  });
  y = doc.lastAutoTable.finalY + 30;

  /* ---------- section: per-sprint detail ---------- */
  y = ensureSpace(doc, y, 70);
  y = sectionTitle(doc, "Sprint Detail", y);

  sprintResults.forEach((r, i) => {
    const s = sprints[i];
    // Reserve the whole block so heading + table + base line never split across a page.
    y = ensureSpace(doc, y, 250);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(clip(doc, `${i + 1}.  ${r.name || `Sprint ${i + 1}`}`, contentW), MARGIN.left, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(
      clip(doc, `${fmtDate(s.startDate)} - ${fmtDate(s.endDate)}   |   ${s.locked ? "Locked" : "Open"}${r.leaks ? "   |   spans quarter boundary" : ""}`, contentW),
      MARGIN.left, y + 13
    );
    y += 24;

    // inputs line (wraps if long so it never runs past the right margin)
    const inputs = [
      `Completed ${num(s.completedHours)}h`, `Collab ${num(s.collaborationHours)}h`,
      `Closed ${num(s.closedTickets)}`, `Assigned ${num(s.assignedTickets)}`,
      `Reopened ${num(s.reopenedTickets)}`, `Done ${num(s.doneTickets)}`,
      `Grade ${dash(s.codeQuality)}`,
    ].join("   |   ");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const inputLines = doc.splitTextToSize(A(inputs), contentW);
    doc.text(inputLines, MARGIN.left, y);
    y += inputLines.length * 11 + 1;

    autoTable(doc, {
      startY: y,
      margin: MARGIN,
      head: [["Parameter", "Allocated", "Band", "Multiplier", "Achieved"]],
      body: rows([
        ["Planned Hours", n2(r.phA), `${pct(r.phPct)} -> ${r.phB.label}`, mult(r.phM), n2(r.phAch)],
        ["Code Quality", n2(r.cqA), r.cqO.label, mult(r.cqM), n2(r.cqAch)],
        ["Efficiency", n2(r.effA), r.noAssigned ? "no tickets" : `${pct(r.effPct)} -> ${r.effB.label}`, mult(r.effM), n2(r.effAch)],
        ["Issue Persistence", n2(r.ipA), r.zeroDone ? "zero done -> worst" : `${pct(r.ipPct)} -> ${r.ipB.label}`, mult(r.ipM), n2(r.ipAch)],
      ]),
      foot: [["Sprint total", "", "", "", n2(r.total)]],
      ...tableTheme(),
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 108 },
        1: { halign: "right", cellWidth: 66 },
        3: { halign: "right", cellWidth: 72 },
        4: { halign: "right", cellWidth: 72, fontStyle: "bold" },
      },
    });
    y = doc.lastAutoTable.finalY + 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (r.noActivity) {
      doc.setTextColor(...NEG);
      doc.text(clip(doc, "No hours or tickets recorded - sprint not scored.", contentW), MARGIN.left, y + 8);
    } else {
      doc.setTextColor(...MUTED);
      doc.text(
        clip(doc, `Base ${n2(r.bp)} pts  (${r.wdInQuarter}${r.leaks ? " in-quarter" : ""} productive days x ${n4(r.wdInQuarter > 0 ? r.bp / r.wdInQuarter : dailyRate)})   |   Allotted ${n2(r.ah)} hrs`, contentW),
        MARGIN.left, y + 8
      );
    }
    y += 26;
  });

  /* ---------- header + footer on every page ---------- */
  paintChrome(doc, { genLabel, meta });

  const namePart = meta.devName ? A(meta.devName).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "";
  const datePart = (quarterStart || "report").replace(/[^0-9-]/g, "");
  doc.save(`Dev-Eval-Report-${[namePart, datePart].filter(Boolean).join("-") || "quarter"}.pdf`);
}

/* ---- building blocks ---- */
// Sanitize a 2-D array of cells for the built-in font.
function rows(arr2d) {
  return arr2d.map(row => row.map(A));
}

function keyValueTable(doc, y, contentW, body) {
  autoTable(doc, {
    startY: y,
    margin: MARGIN,
    body: rows(body),
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: { top: 5, bottom: 5, left: 0, right: 8 }, textColor: INK },
    columnStyles: {
      0: { textColor: MUTED, fontStyle: "bold", cellWidth: contentW * 0.2 },
      1: { cellWidth: contentW * 0.3 },
      2: { textColor: MUTED, fontStyle: "bold", cellWidth: contentW * 0.2 },
      3: { cellWidth: contentW * 0.3 },
    },
  });
}

function sectionTitle(doc, text, y) {
  const w = doc.internal.pageSize.getWidth() - MARGIN.left - MARGIN.right;
  // Short navy tick + uppercase letter-spaced label — restrained consulting-report style.
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN.left, y - 7, 3, 11, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(A(String(text).toUpperCase()), MARGIN.left + 10, y, { charSpace: 0.8 });
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.75);
  doc.line(MARGIN.left, y + 10, MARGIN.left + w, y + 10);
  return y + 26;
}

function tableTheme() {
  // Borderless zebra table with a navy header — clean, restrained, no gridlines.
  return {
    theme: "plain",
    styles: {
      fontSize: 9.5,
      cellPadding: { top: 7, bottom: 7, left: 10, right: 10 },
      textColor: INK, valign: "middle",
    },
    headStyles: {
      fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 8,
      halign: "left", cellPadding: { top: 8, bottom: 8, left: 10, right: 10 },
    },
    footStyles: {
      fillColor: [237, 242, 249], textColor: INK, fontStyle: "bold",
      cellPadding: { top: 8, bottom: 8, left: 10, right: 10 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  };
}

function ensureSpace(doc, y, needed) {
  const limit = doc.internal.pageSize.getHeight() - MARGIN.bottom;
  if (y + needed > limit) {
    doc.addPage();
    return MARGIN.top;
  }
  return y;
}

function scoreCallout(doc, { y, contentW, achieved, base, delta, pctOfBase, daysUsed, totalDays }) {
  const h = 88;
  const x = MARGIN.left;
  doc.setFillColor(...NAVY);
  doc.roundedRect(x, y, contentW, h, 10, 10, "F");

  const pad = 22;
  doc.setTextColor(191, 205, 240);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ACHIEVED SCORE", x + pad, y + 27, { charSpace: 1 });
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text(n2(achieved), x + pad, y + 66, { charSpace: -0.5 });

  const statsX = x + 205;
  // faint vertical divider
  doc.setDrawColor(86, 112, 170);
  doc.setLineWidth(0.5);
  doc.line(statsX - 22, y + 18, statsX - 22, y + h - 18);

  const stats = [
    ["Base", n2(base)],
    ["Delta vs base", `${delta >= 0 ? "+" : ""}${n2(delta)}`],
    ["% of base", `${pctOfBase.toFixed(0)}%`],
    ["Days used", `${daysUsed} / ${totalDays}`],
  ];
  const colW = (contentW - (statsX - x) - pad) / stats.length;
  stats.forEach(([label, val], i) => {
    const cx = statsX + i * colW;
    doc.setTextColor(191, 205, 240);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(A(label.toUpperCase()), cx, y + 36, { charSpace: 0.5 });
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(A(val), cx, y + 60);
  });
  return y + h;
}

function paintChrome(doc, { genLabel, meta = {} }) {
  const pages = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);

    /* header */
    const hy = 44;
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN.left, hy - 16, 26, 26, 5, 5, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DE", MARGIN.left + 13, hy + 1, { align: "center" });

    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Performance Evaluation Centre", MARGIN.left + 36, hy - 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    // Show the developer/employee on the running header when provided.
    const headerRight = meta.devName
      ? `${A(meta.devName)}${meta.empId ? `  |  ${A(meta.empId)}` : ""}`
      : "Developer Sprint Evaluation";
    doc.text(headerRight, MARGIN.left + 36, hy + 8);

    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Generated ${A(genLabel)}`, pageW - MARGIN.right, hy - 3, { align: "right" });

    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.8);
    doc.line(MARGIN.left, hy + 20, pageW - MARGIN.right, hy + 20);

    /* footer */
    const fy = pageH - 30;
    doc.setDrawColor(...RULE);
    doc.line(MARGIN.left, fy - 10, pageW - MARGIN.right, fy - 10);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("Confidential - Internal Use Only", MARGIN.left, fy);
    doc.text(`Page ${p} of ${pages}`, pageW / 2, fy, { align: "center" });
    doc.text(`Performance Evaluation Centre v${APP_VERSION}`, pageW - MARGIN.right, fy, { align: "right" });
  }
}

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Truncate a single-line string with an ellipsis so it never runs past maxWidth.
 *  Sanitizes for the built-in font; caller must set the font/size first. */
function clip(doc, text, maxWidth) {
  let t = A(text);
  if (!t) return "";
  if (doc.getTextWidth(t) <= maxWidth) return t;
  while (t.length > 1 && doc.getTextWidth(t + "...") > maxWidth) t = t.slice(0, -1);
  return t + "...";
}
