# Changelog

All notable changes to this project are documented here.

The format is inspired by Keep a Changelog, and this project follows semantic versioning.

## 4.2.0 - 2026-07-15

Admin-declared restricted-holiday pool and a multi-year holiday calendar.

### Added

- **Holiday calendar manager** (`components/HolidayManager.jsx`) with a year selector spanning 2025–2050, managing both company holidays and the restricted-holiday pool one year at a time; editing is passkey-gated, read-only otherwise.
- **Admin-declared restricted-holiday pool** (`config.restrictedHolidayPool`): named, dated optional holidays. A developer avails one per calendar year by choosing it from a dropdown on the sprint.
- **Named holidays**: company holidays carry optional names (`config.holidayNames`); restricted holidays carry pool labels — shown across the app and PDF.
- Redesigned the Availability & time-off summary into stat tiles + named holiday chips.

### Changed

- Restricted holidays are no longer free-date entry; they must come from the admin pool. Company-holiday editing moved out of the Quarter panel into the Holiday calendar manager.
- Config gains `holidayNames` and `restrictedHolidayPool` (both optional, defaulted and validated); 66 tests total.

## 4.1.0 - 2026-07-15

Restricted-holiday tracking and constructive availability reporting.

### Added

- **Restricted (optional) holidays** (`src/restrictedHolidays.js`, `SprintCard`): mark one per sprint, enforced to at most one per developer per calendar year — both within the evaluation and across quarters via a per-developer localStorage ledger keyed on Employee ID.
- **Availability & time-off summary** (`src/availability.js`, `components/AvailabilityPanel.jsx`, and a new PDF section): states company holidays, restricted leave, and the pro-rata dilution of productive hours in constructive, no-fault language.
- Community-health files for the public repository: `SECURITY.md`, `CODE_OF_CONDUCT.md`, and GitHub issue / pull-request templates.
- Tests for weekend holidays, the restricted-holiday quota ledger, and the availability summary (`tests/holidays-rh.test.mjs`); 62 tests total.

### Changed

- **Holidays** may now fall on a weekend: such dates are recorded but flagged as no-impact, since weekends are already non-working (counted once, never twice) — the previous version rejected them.
- A restricted holiday is excluded from its sprint's productive days like a company holiday: because scoring is pro-rata, the target shrinks with the time away, so approved leave never reads as underperformance.
- Refreshed `README.md`, `package.json` metadata, and the in-app **Framework** documentation to cover the above.

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
