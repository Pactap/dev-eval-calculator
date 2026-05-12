# Developer Sprint Evaluation Calculator

Enterprise-style React application for evaluating developer sprint performance with pro-rata point allocation, weighted scoring bands, quarter-level summaries, and theme-aware analytics.

The app is intentionally frontend-only. It has no backend, no database, and no external service dependency at runtime beyond browser-loaded fonts. All scoring happens in deterministic JavaScript modules that can be tested directly.

## What This Project Does

Developer Sprint Evaluation Calculator turns a quarter into a base point pool, allocates points across sprint working days, and adjusts each sprint score through four weighted parameters:

| Parameter | Weight | Formula | Intent |
| --- | ---: | --- | --- |
| Planned Hours | 50% | `(completed + collaboration) / allotted` | Measures planned utilization without counting rework as credit. |
| Code Quality | 20% | Lead grade multiplier | Captures quality judgment cross-checked against CQI. |
| Efficiency | 10% | `completed / allotted` | Measures delivery efficiency without collaboration credit. |
| Issue Persists | 20% | `reopened / done tickets` | Penalizes recurring defects and legacy reach-back. |

The redesigned interface presents this as a professional dashboard: quarter controls, executive KPI snapshot, sprint ledger, score breakdowns, correlation chart, and quarterly rollup.

## Current Capabilities

- Pro-rata point allocation across variable-length sprints.
- Configurable quarter base score and daily capacity.
- Lockable quarters and immutable locked sprint snapshots.
- Four metric scoring model with configurable bands and multipliers.
- Dual penalty for reopened tickets by design.
- Zero-done ticket protection with worst-band assignment.
- Light, dark, and system theme modes.
- Chart.js correlation view for issue persistence and code quality.
- Responsive Fortune 500-style dashboard UI.
- Node-based tests for scoring and utility logic.

## Tech Stack

| Area | Technology |
| --- | --- |
| UI | React 18 |
| Build tool | Vite 5 |
| Charts | Chart.js 4 |
| Testing | Node.js built-in test runner |
| Styling | CSS custom properties in `src/App.css` |

## Quick Start

```bash
npm install
npm run dev
```

Open the URL printed by Vite. The default configured dev port is `3000`, but Vite may choose another port if `3000` is already occupied.

## Quality Commands

```bash
npm run test     # Run pure scoring and utility tests
npm run build    # Create production build in dist/
npm run check    # Run tests and production build
npm run preview  # Preview the production build
```

## Repository Structure

```text
src/
  App.jsx                    Root state, derived values, theme, layout
  App.css                    Complete design system and responsive styles
  constants.js               Scoring bands, weights, defaults, sprint factory
  scoring.js                 Pure scoring and quarterly aggregation logic
  utils.js                   Band lookup, working-day count, date formatting
  components/
    QuarterConfig.jsx        Quarter period and capacity controls
    SprintCard.jsx           Sprint inputs, metric panels, lock controls
    ScoreTable.jsx           Per-sprint scoring breakdown
    CorrelationChart.jsx     Chart.js mixed bar/line insight panel
    QuarterlySummary.jsx     Quarter rollup and status table
    MetricSection.jsx        Reusable metric shell
    Pill.jsx                 Multiplier badge
    Tip.jsx                  Accessible tooltip

tests/
  scoring.test.mjs           Node tests for scoring and utility behavior

docs/
  ARCHITECTURE.md            Data flow, module ownership, state model
  SCORING.md                 Business formulas, bands, edge cases
  FRONTEND.md                Dashboard design system and UX notes
  GIT_WORKFLOW.md            Branching, commits, PR and review practices
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Scoring Framework](docs/SCORING.md)
- [Frontend System](docs/FRONTEND.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Git Workflow](docs/GIT_WORKFLOW.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Core Implementation Notes

`App.jsx` owns the state and passes data down through props. Derived values are memoized:

1. Quarter dates produce total working days.
2. Quarter base and working days produce the daily rate.
3. Sprint dates produce sprint working days.
4. Each sprint is scored by `computeSprintResult`.
5. Sprint scores are aggregated by `computeQuarterlySummary`.

The scoring engine is deliberately pure. Keep business logic in `src/scoring.js`, configuration in `src/constants.js`, and rendering concerns in component files.

## Sprint Locking

When a sprint is locked, the app snapshots its computed score and working-day allocation. Locked sprint inputs are disabled and the sprint cannot be removed until it is unlocked. This prevents quarter-level configuration changes from silently rewriting completed sprint outcomes.

## Development Principles

- Preserve deterministic scoring logic.
- Keep the UI dense, clear, and operational rather than marketing-heavy.
- Keep scoring changes covered by tests.
- Prefer configuration changes in `constants.js` before changing calculation code.
- Avoid adding runtime dependencies unless they remove real complexity.

## License

MIT. See [LICENSE](LICENSE).
