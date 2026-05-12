# Changelog

All notable changes to this project are documented here.

The format is inspired by Keep a Changelog, and this project follows practical semantic versioning while it remains private.

## Unreleased

No unreleased changes.

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

### Verified

- Scoring tests cover working-day counting, band lookup, weighted scoring, zero-done behavior, and quarterly aggregation.
