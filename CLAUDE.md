# CLAUDE.md — Dev Evaluation Calculator

## What this project is

A React + Vite app implementing a Developer Sprint Evaluation Framework (v3.0) with pro-rata point allocation across variable-length sprints. Features light/dark/system theme toggle and a modular component architecture.

## Architecture

- **Frontend only** — React 18 + Vite + Chart.js
- **No backend** — all calculations are client-side
- **Component-based** — modular architecture with extracted scoring logic

## Key files

```
src/
  App.jsx                    # Slim orchestrator (~155 lines) — state, theme, layout
  App.css                    # All styles with CSS custom properties, light/dark themes
  scoring.js                 # Pure scoring functions (computeSprintResult, computeQuarterlySummary)
  constants.js               # Evaluation bands, multipliers, weights (source of truth)
  utils.js                   # Pure utilities (getBand, countWorkingDays, formatDate)
  main.jsx                   # React entry point
  components/
    SprintCard.jsx           # Sprint card with date inputs, 4 metric sections, score table
    QuarterConfig.jsx        # Quarter date/config panel with lock/unlock
    CorrelationChart.jsx     # Chart.js bar+line chart (theme-aware)
    QuarterlySummary.jsx     # Dark summary panel with stat cards and totals
    ScoreTable.jsx           # Per-sprint score breakdown table
    MetricSection.jsx        # Reusable metric section shell (DRY for 4 metrics)
    Pill.jsx                 # Colored multiplier badge (positive/neutral/negative)
    Tip.jsx                  # Hover tooltip
```

## Business logic

### Pro-rata mechanism
- Quarter = 90 calendar days, base score = 90 points (configurable)
- Daily rate = base ÷ total working days in quarter
- Sprint base points = daily rate × working days in sprint
- Allotted hours = capacity (default 7 hrs/day) × working days
- Locked sprints are immutable; daily rate recalculates only for future sprints

### Four parameters (weights must sum to 1.0)
- **Planned Hours (50%)**: (completed + collaboration) ÷ allotted. Rework excluded.
- **Code Quality (20%)**: Team lead grade (Outstanding/Good/Satisfactory/Needs Improvement/Unsatisfactory/Poor), cross-checked against CQI.
- **Efficiency (10%)**: completed ÷ allotted. Auto-calculated, no collab hours.
- **Issue Persists (20%)**: reopened ÷ done tickets. Legacy reach-back. Each reopen counted separately. Zero done = worst band.

### Dual penalty
Reopened tickets penalize both Planned Hours (rework time excluded) and Issue Persists (reopen ratio). Intentional by design.

## Theming

Three modes: Light (default), System (follows OS), Dark. Controlled via `data-theme` attribute on `<html>`. Persisted in localStorage. CSS uses custom properties that swap via `[data-theme="dark"]` selector. Chart.js colors are theme-aware via `theme` prop.

## Development commands

```bash
npm install    # Install dependencies
npm run dev    # Start dev server
npm run build  # Production build to dist/
```

## Common modifications

- To change band thresholds or multipliers → edit `src/constants.js`
- To add a new parameter → add bands in constants.js, update WEIGHTS, add config to METRIC_CONFIGS in SprintCard.jsx, add row in ScoreTable.jsx
- To change daily capacity → it's a state variable in App.jsx (default 7)
- To change quarter base → it's a state variable in App.jsx (default 90)
- To modify theme colors → edit CSS custom properties in `src/App.css` (`:root` for light, `[data-theme="dark"]` for dark)
