# Developer Sprint Evaluation Calculator v3.0

A pro-rata, points-based developer evaluation framework built with React + Vite + Chart.js. Features a premium light/dark theme toggle, modular component architecture, and real-time scoring with correlation charts.

## Quick Start

```bash
npm install
npm run dev
```

## Features

- **Pro-rata scoring** — points allocated proportionally across variable-length sprints
- **4 weighted metrics** — Planned Hours, Code Quality, Efficiency, Issue Persists
- **6-grade Code Quality scale** — Outstanding, Good, Satisfactory, Needs Improvement, Unsatisfactory, Poor
- **Light / Dark / System theme** — toggle with localStorage persistence
- **Correlation chart** — visualizes Issue Persist % vs Code Quality across sprints
- **Quarterly summary** — aggregated stats with remaining points/days
- **Sprint locking** — freeze completed sprints
- **Dual penalty system** — reopened tickets penalize both Planned Hours and Issue Persists
- **Zero Done detection** — auto-assigns worst band when no tickets are marked done

## Project Structure

```
src/
  App.jsx                    # Orchestrator — state, theme, layout
  App.css                    # Dual-theme CSS with custom properties
  scoring.js                 # Pure scoring engine
  constants.js               # Bands, weights, multipliers
  utils.js                   # getBand, countWorkingDays, formatDate
  main.jsx                   # React entry point
  components/
    SprintCard.jsx           # Sprint card with metrics and score table
    QuarterConfig.jsx        # Quarter configuration panel
    CorrelationChart.jsx     # Chart.js correlation visualization
    QuarterlySummary.jsx     # Quarterly totals and breakdown
    ScoreTable.jsx           # Per-sprint score breakdown
    MetricSection.jsx        # Reusable metric section wrapper
    Pill.jsx                 # Multiplier badge component
    Tip.jsx                  # Hover tooltip component
```

## Scoring Framework

**Quarter**: Configurable base score (default 90) across all working days.

**Pro-rata mechanism**: Daily rate = base / working days. Each sprint gets base points = daily rate x sprint working days.

**Capacity**: Configurable hours/day (default 7). Allotted hours = capacity x working days.

### Parameters

| Parameter | Weight | Calculation | Bands |
|-----------|--------|-------------|-------|
| Planned Hours | 50% | (Completed + Collab) / Allotted | 8 bands: Below 30 to 90-100 |
| Code Quality | 20% | Team lead grade | 6 grades: Outstanding to Poor |
| Efficiency | 10% | Completed / Allotted (auto) | 5 bands: Below 65% to 95-100% |
| Issue Persists | 20% | Reopened / Done tickets | 5 bands: 0-10% to 40%+ |

### Multiplier Ranges

Each band has a multiplier applied to the allocated points:
- **Positive** (>= 1.0x): Score exceeds allocation
- **Neutral** (0.5x - 1.0x): Score below allocation
- **Negative** (< 0.5x): Significant penalty, can go negative

### Key Design Decisions

- **Locked sprints** never retroactively recalculate
- **Dual penalty** — reopened tickets reduce both Planned Hours and Issue Persists
- **Zero Done tickets** defaults to worst band (-0.50x)
- **No minimum thresholds** — rules apply uniformly regardless of sprint length
- **Quarter date locking** — sprints cannot exceed quarter end date

## Theming

Three modes accessible via the toggle in the top-right corner:
- **Light** (default) — clean white cards, subtle shadows
- **Dark** — glassmorphism cards, noise grain texture, glowing score numbers
- **System** — follows OS `prefers-color-scheme`

Theme persists across sessions via localStorage.

## Build

```bash
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Extending

**Change scoring bands**: Edit `src/constants.js`. All band definitions with min/max/multiplier.

**Add a new parameter**: Add band array in `constants.js`, update `WEIGHTS` (must sum to 1.0), add config entry to `METRIC_CONFIGS` in `SprintCard.jsx`, add table row in `ScoreTable.jsx`, update `computeSprintResult` in `scoring.js`.

**Modify theme**: Edit CSS custom properties in `src/App.css` — `:root` for light theme, `[data-theme="dark"]` for dark theme.

## Tech Stack

- React 18.2
- Vite 5.1
- Chart.js 4.4
- Plus Jakarta Sans + JetBrains Mono (Google Fonts)

## License

MIT
