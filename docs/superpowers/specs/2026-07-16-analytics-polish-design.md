# Analytics polish, validation UX & PDF charts — design

**Date:** 2026-07-16
**Version target:** v4.8.0
**Status:** Approved (direct implementation)

## Problem

After shipping the Analytics dashboard (v4.7.0), four issues surfaced:

1. **Validation nudge bug** — the Employee ID field renders a red `input--invalid`
   border immediately on load (required + empty), while Quarter Control's mandatory
   fields only show a `*`. The red border pulls attention to Employee ID before the
   user fills the primary Quarter Control fields ("nudging, bypassing other mandatory
   fields").
2. **Presentation leaking** — the moved Score Composition card (`.chart-card`) and the
   new chart cards (`.analytics-card`) use different structures; subtitles overflow the
   card edge; chart heights are uneven; the last card can clip. "Not solid."
3. **Data inconsistent** — sprints with dates but no recorded activity produce misleading
   charts: Issue Persistence flat at 100% (zero-done → worst band), Efficiency/Planned
   Hours at 0, and an **empty contribution donut**.
4. **No charts in the PDF** — the exported performance report has no graphs.

## Decisions (from brainstorming)

- No-data handling: **per-chart empty state**.
- PDF charts: **curated 4** (Composition, Achieved-vs-Target, Strengths radar, Contribution).
- Validation: **validate on touch/submit** (no red on untouched fields).
- Aesthetics: Fortune-50; apply `dataviz` + `ui-ux-pro-max` guidance at build time; keep the
  semantic per-parameter palette.

## 1. Validation UX (`App.jsx`, `components/QuarterConfig.jsx`)

- Track `touched` per field (set on blur) and an `attempted` flag (set when Lock or Export
  is pressed).
- A required field shows `input--invalid` only when `required && empty && (touched || attempted)`.
  Nothing is red at load; pressing Lock/Export reveals all remaining required fields at once.
- Keep the `*` markers. Apply the same rule to both Quarter Control (Evaluation Start/End,
  Base score, Capacity, Financial Quarter) and Developer Details (Employee ID).
- Lock/Export handlers set `attempted` so the fields light up together, then the existing
  notifications explain what's missing.

## 2. Analytics presentation (`components/AnalyticsView.jsx`, `App.css`, `components/CorrelationChart.jsx`)

- **Unify cards:** one `ChartCard` shell (header = title + subtitle, consistent padding /
  elevation / fixed canvas height) wraps every chart, including Score Composition. The
  CorrelationChart renders inside the shell (no more `.chart-card` divergence).
- **Fix leaking:** card header wraps; subtitle constrained (`min-width:0`, allowed to wrap);
  content never overflows the card; grid reflows without clipping.
- **Polish:** consistent spacing rhythm, muted subtitles, subtler grid/tick colors, refined
  legends, uniform canvas height. Palette unchanged (parameter colors are semantic).

## 3. Data consistency — per-chart empty states (`analytics.js`, `AnalyticsView.jsx`)

- Add predicates to `analytics.js`:
  - `hasActivity(results)` — any sprint with comp/collab/tickets > 0.
  - Per-chart data checks: composition/trend/radar/contribution need any achieved > 0;
    parameter-trends needs activity; utilization needs used hours > 0; throughput needs any ticket.
- Each chart component renders a clean `"Awaiting sprint activity"` placeholder (chart-specific
  wording) until its data is meaningful — instead of zeros, a flat 100% line, or an empty donut.

## 4. Charts in the PDF (`pdfReport.js`, new `analyticsCharts.js`)

- Extract Chart.js **config builders** (data + dark flag → Chart.js config object) into a shared
  `src/analyticsCharts.js`, consumed by both `AnalyticsView.jsx` and `pdfReport.js` (DRY,
  identical look).
- On export, if there is chart data: render Composition, Achieved-vs-Target, Strengths radar,
  and Contribution onto offscreen canvases (`animation:false`, light theme, fixed pixel size),
  capture `toBase64Image()`, and place them two-per-row on a dedicated **"Performance Analytics"**
  page via jsPDF `addImage`. Skipped when there is no data.
- Chart.js is already bundled with the (lazy-loaded) PDF path; rendering happens in the export flow.

**Approach:** reuse the live configs → offscreen canvas → image for pixel-fidelity with the app.
Rejected: hand-drawing charts in jsPDF (more code, drifts from the on-screen look).

## Testing

- Unit-test the new `analytics.js` predicates (`hasActivity` and per-chart data checks).
- Validation touch/submit behaviour and the PDF analytics page are verified live in the preview
  (fill fields, press Lock/Export; export a report and inspect the analytics page).

## Files

`App.jsx`, `components/QuarterConfig.jsx`, `components/AnalyticsView.jsx`, `analytics.js`,
new `analyticsCharts.js`, `App.css`, `pdfReport.js`, `components/CorrelationChart.jsx`.

## Out of scope

Cross-quarter / cross-developer history (needs a data store); changes to the scoring model.
