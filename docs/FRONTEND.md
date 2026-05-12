# Frontend System

## Product Direction

The application is designed as an operational dashboard, not a marketing site. The first screen prioritizes controls, KPIs, sprint data, and decision support.

The visual style aims for a professional enterprise product:

- Dense but readable layout.
- Clear hierarchy between quarter controls, KPI snapshot, sprint ledger, and rollup.
- Conservative card radius and borders.
- Strong table legibility.
- Theme-aware charts and status colors.
- Responsive behavior for desktop and mobile.

## Screen Layout

```text
Topbar
  Brand mark
  Product title
  Quarter lock status
  Theme toggle

Overview grid
  Quarter configuration
  Portfolio snapshot KPIs

Sprint ledger
  Sprint cards
  Metric panels
  Score breakdown tables

Insight grid
  Correlation chart
  Quarterly summary
```

## Styling Architecture

All styling is centralized in `src/App.css`.

The file contains:

- Theme variables in `:root`.
- Dark theme overrides in `[data-theme="dark"]`.
- Layout primitives.
- Form controls.
- Dashboard sections.
- Sprint card and metric panel styles.
- Chart and summary styles.
- Responsive breakpoints.

There is no component-scoped CSS or CSS-in-JS layer.

## Theme Model

The app supports:

| Mode | Behavior |
| --- | --- |
| Light | Uses `:root` variables. |
| Dark | Uses `[data-theme="dark"]` overrides. |
| System | Resolves from `prefers-color-scheme`. |

Theme selection is stored in `localStorage` as `theme`.

The resolved theme is also passed to `CorrelationChart`, which chooses Chart.js colors based on the active mode.

## Component Design Notes

### `QuarterConfig`

Focused on period, base score, and daily capacity. It emits changes upward and does not own business state.

### `SprintCard`

The primary work surface. It renders:

- Sprint identity and lock controls.
- Date and calculated allocation fields.
- Four metric panels.
- Per-sprint score table when working days exist.

Date inputs use local state so native date pickers remain stable during rerenders.

### `MetricSection`

Reusable shell for the four metric areas. It keeps metric headings, weight labels, and help tooltips visually consistent.

### `ScoreTable`

Explains how the score was produced. This is important because the scoring model uses multipliers and can exceed or fall below the base allocation.

### `CorrelationChart`

Mixed Chart.js view:

- Bars show Issue Persist % and Code Quality multiplier %.
- Lines show achieved points for Issue Persist and Code Quality.

The chart renders only when at least one sprint has working days.

### `QuarterlySummary`

Shows total achieved score, base usage, days used, per-sprint status, and remaining allocation.

## Responsive Rules

The dashboard uses CSS grid and collapses in stages:

- Wide screens: quarter controls and KPIs sit side by side.
- Medium screens: overview and insights collapse to one column.
- Small screens: sprint dates, metric grids, KPI cells, and summary stats become single column.

The intent is to preserve data readability rather than shrink typography aggressively.

## Accessibility Notes

- Theme toggle uses `aria-pressed`.
- Major page areas use `aria-label`.
- Tooltips support hover and focus.
- Tables use semantic headers.
- Buttons and form controls have visible focus treatment.

## Frontend Change Checklist

Before merging UI changes:

1. Run `npm run build`.
2. Open the app in a browser.
3. Check empty state and scored sprint state.
4. Check light and dark themes.
5. Check a narrow viewport.
6. Confirm score tables and summary values remain readable.
