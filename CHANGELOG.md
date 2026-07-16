# Changelog

All notable changes to this project are documented here.

The format is inspired by Keep a Changelog, and this project follows semantic versioning.

## 4.7.0 - 2026-07-16

Analytics dashboard, a real notification system, and per-section error resilience.

### Added

- **Analytics tab** (`components/AnalyticsView.jsx`, `analytics.js`): a developer monitoring dashboard with seven theme-aware charts across the quarter's sprints — score composition, achieved-vs-target trend, parameter trends (PH/Efficiency/Issue Persistence), a strengths radar, a score-contribution donut, hours utilization, and ticket throughput. Pure data transforms are unit-tested (`tests/analytics.test.mjs`).
- **Notification system** (`notify.jsx`): a stacked, dismissible toast system (success / error / info / warning) with per-type auto-dismiss and `aria-live`, provided via context (`useNotify`). Action feedback wired into lock/unlock, add/remove sprint, restricted-holiday, import and export.
- **Per-section error boundaries** (`Boundary` in `ErrorBoundary.jsx`) around each chart, the sprint ledger, availability, and the admin panels — a scoped Retry fallback instead of a blank app.

### Changed

- `computeSprintResult` now also returns `comp`, `collab`, and `done` (used by the utilization/throughput charts).
- Previously silent server-sync failures (config fetch, restricted-holiday ledger) now surface as non-blocking notifications.
- The score-composition chart moved from the workspace into the Analytics tab.

## 4.6.1 - 2026-07-16

Required/optional field markers and refreshed placeholders.

### Changed

- Marked the evaluation-period fields (Evaluation Start/End Date, Base score, Capacity) and Financial Quarter as **required** (`*`).
- **Employee ID is now required** and enforced before PDF export; Developer full name and Date of joining marked optional; section renamed to **Developer Details**.
- Placeholder examples refreshed to in-house conventions (Ram Sharma, ABS100).

## 4.6.0 - 2026-07-16

Evaluation period: mandatory Financial Quarter dropdown, decoupled dates, fortnightly sprints.

### Added

- **Mandatory Financial Quarter dropdown** in the Evaluation Period panel (`QuarterConfig.jsx`): Q1–Q4 for FY2026-27 onward (`fyQuarterOptions` in `utils.js`). A pure label, decoupled from the scored dates; required before the period can be locked. Moved out of Report Details; still flows to the PDF via `reportMeta.quarterLabel`.
- Test coverage for `evaluationEndFrom`, fortnightly 6-sprint division, and `fyQuarterOptions` (79 front-end tests).

### Changed

- Renamed the date inputs to **Evaluation Start Date / Evaluation End Date** — the scored window is independent of the financial quarter.
- Selecting the Evaluation Start Date auto-fills the End Date to **+84 days** (`evaluationEndFrom`, 6 fortnightly sprints); editable while unlocked.
- Sprint scaffolding is now **true fortnightly** (14-day cadence): `generateSprintPeriods` is called with an inclusive length of 15 so drafts land on the real sprint boundaries (e.g. 27 May → 10 Jun → 24 Jun …). Drafts stay editable.
- PDF report labels the metadata row **Financial Quarter** (shown alongside the evaluation-period dates).

## 4.5.0 - 2026-07-16

Durable admin data: auto-save, stranded-data recovery, and the scoring formula in-app.

### Changed

- **Config auto-saves** (`src/configStore.jsx`): every admin edit (parameters, company holidays, restricted-holiday list) persists to the shared server automatically, debounced ~1s. The manual "Publish to server" button is removed. A `dirtyRef` guard stops the on-load `GET /config` from overwriting an in-progress edit — the class of bug where saved data vanished after a reload or new deploy.
- **Employee IDs display canonically** (`canonicalEmpId` in `src/restrictedHolidays.js`): stored and shown as uppercase `ABS100` regardless of entered form (`abs 100`, `Abs100`, `aBs-100`…). Matching was already normalization-based; this makes the display consistent too. Applied in `DevUsagePanel`, `App.jsx` and `bulkIO.js` (import + export).

### Added

- **Sync indicator** in the Evaluation Parameters panel: Saving… / Saved / Offline — will retry.
- **Stranded-data recovery**: on unlock, a local ledger or config that never reached the server is pushed up once (server-empty + local-present) so it is not lost.
- **Evaluation formula** display (`SettingsPanel.jsx`): point allocation, per-parameter achievement, and the four parameter inputs, shown alongside the configured weights, bands and grades.

## 4.4.0 - 2026-07-16

Admin centre, bulk data management, and a Fortune-50 presentation pass.

### Added

- **Admin tab** (`components/AdminUnlock.jsx`, `BulkIOPanel.jsx`, `DevUsagePanel.jsx`, `HolidayManager.jsx`, `ConfigGlance.jsx`): a single passkey-gated place for evaluation parameters, the holiday calendar, bulk import/export and developer-usage management. One centralized Unlock control; read-only visitors see the rules + holidays, not the write tools.
- **Bulk JSON import/export** (`src/bulkIO.js`) for company holidays, restricted holidays and per-developer usage — `{ date, day, name }` rows, downloadable sample templates (`samples/`), strict alphanumeric Employee-ID normalization.
- **Developer restricted-holiday management** — add / edit / remove in the Admin tab; edits are all-or-nothing and sync to the server ledger.
- **Per-sprint Non-working days** breakdown (weekends + company holidays + restricted holiday) in the workspace and the PDF report.

### Changed

- Restricted holidays are an **admin-declared list, not a depletable pool** (one developer availing a day never blocks another); removed all "approved leave" wording.
- `GET /rh` on the Worker is now **passkey-gated** (it holds employee IDs + usage); the client loads the ledger on unlock. `PUT /rh` validates every entry's shape.
- **Fortune-50 presentation pass**: Inter typography, soft-UI layered elevation, restrained gradients, a consistent 24px / 20px spacing rhythm, aligned controls, Title Case section titles.
- 75 front-end tests + 14 Worker tests.

## 4.3.0 - 2026-07-15

Server-authoritative restricted-holiday quota, plus code-review hardening.

### Added

- **Worker restricted-holiday ledger** (`worker/worker.js`): `GET /rh` (public read), `POST /rh/claim` and `POST /rh/release` (passkey-gated). The Worker enforces one restricted holiday per developer per calendar year across machines — a second, different date for the same dev+year returns 409. KV-backed under key `rhLedger`; 7 new Worker tests.
- Client uses the server ledger when `VITE_CONFIG_API` is set (recording an RH becomes a passkey-gated write via `configStore.claimRh`/`releaseRh`); falls back to the per-browser ledger otherwise, and to local if the Worker lacks `/rh` (so front-end and Worker deploys need not be simultaneous).

### Changed / Fixed (from code review)

- The shared/remote config is now validated (`validateConfig`) before it is adopted, so a malformed remote `restrictedHolidayPool` can't reach render.
- The Holiday calendar rejects a date that is both a company holiday and a restricted-holiday pool entry; company-holiday dates are excluded from the restricted-holiday dropdown (no dead options).

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
- Static-build hosting on the `gh-pages` branch (relative Vite base for subpath hosting).

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
