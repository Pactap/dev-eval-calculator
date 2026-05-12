# Architecture

## Overview

Developer Sprint Evaluation Calculator is a client-side React application. There is no backend, API layer, persistence layer, or server-side rendering. The browser owns all state for the active session, and the scoring engine is implemented as pure JavaScript functions.

The application follows a simple composition model:

```text
App.jsx
  QuarterConfig
  Portfolio KPI panel
  SprintCard[]
    MetricSection[]
    ScoreTable
  CorrelationChart
  QuarterlySummary
```

## State Ownership

`src/App.jsx` is the only stateful orchestration layer for business data.

| State | Purpose |
| --- | --- |
| `quarterStart` | Quarter start date in `YYYY-MM-DD` format. |
| `quarterEnd` | Quarter end date in `YYYY-MM-DD` format. |
| `quarterLocked` | Disables quarter configuration edits when true. |
| `quarterBase` | Total base score for the quarter. Defaults to `90`. |
| `dailyCapacity` | Work capacity in hours per weekday. Defaults to `7`. |
| `sprints` | Array of sprint records created by `createSprint()`. |

Theme state is managed by `useTheme()` inside `App.jsx`, persisted in `localStorage`, and applied through the `data-theme` attribute on `<html>`.

## Derived Values

The app uses memoized derived values rather than duplicating calculations across components.

```text
quarterStart + quarterEnd
  -> totalWorkingDays

quarterBase + totalWorkingDays
  -> dailyRate

sprints
  -> sprintsWithWD

sprintsWithWD + dailyRate + dailyCapacity
  -> sprintResults

sprintResults + totalWorkingDays + dailyRate
  -> quarterlySummary
```

## Module Ownership

| Module | Responsibility |
| --- | --- |
| `src/constants.js` | Thresholds, multipliers, weights, and sprint factory. |
| `src/scoring.js` | Pure scoring and aggregation functions. |
| `src/utils.js` | Pure helper utilities for bands and dates. |
| `src/App.jsx` | State ownership, derived values, app-level layout. |
| `src/App.css` | Complete visual system and responsive behavior. |
| `src/components/*` | Presentational and interaction components. |

## Data Flow

Data flows downward as props. Events flow upward through callbacks.

```text
QuarterConfig -> App
  onChangeStart
  onChangeEnd
  onChangeBase
  onChangeCapacity
  onToggleLock

SprintCard -> App
  onUpdate
  onToggleLock
  onRemove

App -> Components
  quarter config
  sprint records
  computed results
  quarterly summary
  resolved theme
```

There is no Redux, Context API, router, or global event bus. That keeps the app small and easy to reason about.

## Sprint Locking Model

Locking a sprint captures a score snapshot:

1. The current sprint working days are resolved.
2. `computeSprintResult` is executed with the current daily rate and capacity.
3. The computed result is stored on the sprint as `lockedResult`.
4. Future recalculations reuse `lockedResult` until the sprint is unlocked.

This ensures completed sprint outcomes do not drift if the quarter configuration is later changed.

## Rendering Strategy

The UI is a single route and renders immediately after React mounts. Components are intentionally shallow:

- `QuarterConfig` owns no business state.
- `SprintCard` owns only local date input state to keep native date pickers stable.
- `CorrelationChart` owns a Chart.js instance ref and destroys it on updates.
- `QuarterlySummary` and `ScoreTable` are pure display components.

## Extension Points

Common changes should be made in predictable places:

| Change | Primary files |
| --- | --- |
| Change scoring bands | `src/constants.js`, tests |
| Change metric weights | `src/constants.js`, `src/scoring.js`, tests |
| Add a scoring parameter | `constants.js`, `scoring.js`, `SprintCard.jsx`, `ScoreTable.jsx`, tests |
| Change dashboard styling | `src/App.css` |
| Change chart data | `CorrelationChart.jsx` |
