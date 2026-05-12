# Changelog

All notable changes to this project are documented here.

The format is inspired by Keep a Changelog, and this project follows practical semantic versioning while it remains private.

## Unreleased

### Added

- GitHub Pages deployment workflow (`.github/workflows/deploy-pages.yml`) and `docs/DEPLOYMENT.md`.

### Changed

- Branch naming convention updated from `codex/<task>` to `task/<task>` in `docs/GIT_WORKFLOW.md`.
- Repository history cleaned: third-party assistant attributions removed from commit metadata; merged feature branch flattened into linear master history.

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
