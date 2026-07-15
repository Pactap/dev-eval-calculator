# Performance Evaluation Centre

A client-side React application that turns a developer's sprint activity into a transparent, pro-rata quarterly performance score. Weights, reward bands, and grades are configurable; every calculation runs in the browser and is fully auditable.

**Live app:** https://pactap.github.io/dev-eval-calculator/

The app is intentionally frontend-only — no backend, no database, no data leaves the device. All scoring lives in deterministic JavaScript modules that are covered by tests.

## What it does

A quarter becomes a base point pool (default 90). Points are allocated across each sprint's productive working days (weekdays minus holidays), then each sprint score is adjusted through four weighted parameters:

| Parameter | Weight | Formula | Intent |
| --- | ---: | --- | --- |
| Planned Hours | 40% | `(completed + collaboration) / allotted` | Planned utilization; rework excluded. Capped at 100%. |
| Code Quality | 20% | Lead grade multiplier | Quality judgment, cross-checked against CQI. |
| Efficiency | 40% | `tickets closed / tickets assigned` | Delivery of assigned work. Zero assigned earns no credit. |
| Issue Persistence | 0% | `reopened / done tickets` | Legacy reach-back signal; retained, zero-weighted. |

Weights, bands, and grades are editable in-app (Settings panel) and persist locally.

## Key capabilities

- Pro-rata allocation across variable-length sprints; configurable base score and daily capacity.
- Cross-quarter sprints scored proportionally; shared-boundary sprints count the boundary day once.
- **Holiday calendar** managed per year (2025–2050): named company holidays and an admin-declared restricted-holiday pool. Weekend-dated holidays are recorded but flagged as no-impact (counted once, never twice).
- **Restricted (optional) holidays**: a developer avails one per calendar year, picked per sprint from the admin pool, excluded from productive days pro-rata so leave never reads as underperformance. The one-per-year quota is **server-authoritative** across machines via the Cloudflare Worker when configured, else a per-browser ledger.
- Constructive **Availability & time-off** summary (in-app stat tiles + PDF section) explaining holidays, restricted leave, and the pro-rata dilution of productive hours in no-fault language.
- Auto-generated 14-day draft sprints on quarter lock; auto-suggested period end date.
- Lockable quarters and immutable locked-sprint snapshots.
- Integrity rules: empty sprints score zero; zero-ticket efficiency awards nothing.
- Per-sprint score-composition chart; quarterly executive rollup.
- Formatted PDF report with optional developer/quarter metadata.
- In-app **Framework** tab: workflows, definitions, constraints, enablers, and version history.
- Light / system / dark themes; error boundary; 66 automated tests.

## Tech stack

| Area | Technology |
| --- | --- |
| UI | React 18 + Vite 5 |
| Charts | Chart.js 4 |
| PDF | jsPDF + jspdf-autotable |
| Testing | Node.js built-in test runner |
| Styling | CSS custom properties in `src/App.css` |

## Quick start

```bash
npm install
npm run dev      # start dev server
npm run test     # run scoring / utility / edge-case tests (66)
npm run build    # production build to dist/
npm run check    # test + build

node --test worker/worker.test.mjs   # Cloudflare Worker tests (config + restricted-holiday quota)
```

## Deployment

Live at **https://pactap.github.io/dev-eval-calculator/**, served from the `gh-pages` branch.

```bash
npm run deploy   # test + build, then publish dist/ to the gh-pages branch
```

Vite uses a relative base (`./`) so the app runs from the project subpath, and `public/.nojekyll` keeps GitHub Pages from processing the build. (GitHub Actions is not used because Actions runners are disabled for this repository at the organization level.)

## Repository structure

```text
src/
  App.jsx                Root state, theme, layout, view tabs
  App.css                Design system and responsive styles
  version.js             App version + changelog (single source of truth)
  constants.js           Default scoring config, sprint factory
  configStore.jsx        Config context + localStorage persistence
  configValidation.js    Structural validation for imported config
  scoring.js             Pure scoring and quarterly aggregation
  availability.js        Holiday / restricted-leave summary (shared by panel + PDF)
  restrictedHolidays.js  Per-developer, per-year restricted-holiday ledger
  utils.js               Working-day counts, dates, sprint generation, PDF sanitizer
  pdfReport.js           Formatted PDF report generator
  ErrorBoundary.jsx      Top-level error boundary
  components/
    QuarterConfig.jsx    Quarter period, capacity, productive-day stats
    HolidayManager.jsx   Per-year (2025–2050) company holidays + restricted-holiday pool
    SprintCard.jsx       Sprint inputs, metrics, restricted-holiday picker, lock controls
    AvailabilityPanel.jsx  Constructive availability & time-off summary (stat tiles)
    SettingsPanel.jsx    Editable weights / bands / grades
    ReportDetails ...    (in App.jsx) optional report metadata
    ScoreTable.jsx       Per-sprint score breakdown
    CorrelationChart.jsx Score-composition chart
    QuarterlySummary.jsx Quarter rollup
    Framework.jsx        In-app documentation + version history
tests/
  scoring.test.mjs       Core scoring / utility tests
  edge-cases.test.mjs    Boundary, timezone, validation, PDF sanitizer tests
  holidays-rh.test.mjs   Weekend holidays, restricted-holiday quota ledger, availability
```

## License

MIT. See [LICENSE](LICENSE). Changelog: [CHANGELOG.md](CHANGELOG.md).
