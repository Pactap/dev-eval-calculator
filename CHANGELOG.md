# Changelog

All notable changes to this project are documented here.

The format is inspired by Keep a Changelog, and this project follows semantic versioning.

## 4.0.0 - 2026-07-15

Renamed to **Performance Evaluation Centre** and published as a public web app via GitHub Pages.

### Added

- In-app **Framework** tab documenting workflows, definitions, constraints, enablers, thought process, and the version history (single source of truth in `src/version.js`).
- **Config-driven scoring**: weights, reward bands, and code-quality grades are editable in-app (`SettingsPanel`), persisted to localStorage, with JSON export/import and structural validation (`configValidation.js`).
- **Configurable holidays** excluded from productive days, alongside weekends.
- **Auto-generated 14-day draft sprints** on quarter lock; evaluation-period end auto-suggested from the start date.
- **Report metadata** (developer name, employee ID, quarter, date of joining) feeding a systematic PDF report (`pdfReport.js`).
- **Error boundary**, inline validation notices, and graceful config fallbacks.
- Comprehensive edge-case test suite (`tests/edge-cases.test.mjs`); 53 tests total.
- Published publicly on GitHub Pages at https://pactap.github.io/dev-eval-calculator/ (served from the `gh-pages` branch; relative Vite base for project-site hosting).

### Changed

- **Efficiency** redefined as tickets closed / tickets assigned (was hours-based).
- **Weights** updated to Planned Hours 40%, Code Quality 20%, Efficiency 40%, Issue Persistence 0%.
- **Cross-quarter** sprints score proportionally: whole-sprint days drive metrics, in-quarter days drive base points; shared-boundary sprints count the boundary day once.
- **Analytics chart** rebuilt as a per-sprint score-composition view with a base-target line.
- UI redesigned toward a minimalist, Fortune-50 aesthetic; PDF report upgraded to a systematic, restrained layout.

### Fixed

- Sprints with no hours and no tickets now score zero (the default grade no longer awards free points); zero assigned tickets earn no efficiency credit.
- Local-time date parsing (no timezone day-shift); PDF text sanitized for the built-in Latin-1 font.
- Locked-snapshot leaks, negative remaining days, empty-band crashes, and NaN-on-import all resolved.

## 3.1.0 - 2026-05-12

### Added

- Professional repository documentation set in `docs/`.
- Contributor guide and git workflow documentation.
- Pull request template for consistent review handoff.
- Node-based scoring and utility tests.
- `npm run test` and `npm run check` scripts.

### Changed

- README rewritten as a production-grade project overview.
- Package description normalized to ASCII text.
- Sprint locking now snapshots computed results so locked sprint scores remain immutable.
- Dashboard rebuilt as a Fortune 500-style operational layout (topbar, portfolio KPI panel, sprint ledger, insight grid).
- `src/App.css` restructured into a complete enterprise design system with responsive breakpoints.
- Sprint factory replaced inline `EMPTY_SPRINT` with `createSprint()`, adding a stable `id` and a `lockedResult` snapshot field.

### Verified

- Scoring tests cover working-day counting, band lookup, weighted scoring, zero-done behavior, and quarterly aggregation.
