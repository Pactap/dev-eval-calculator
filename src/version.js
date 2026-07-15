// Single source of truth for the app version and its history.
// Bump APP_VERSION and prepend a CHANGELOG entry on every release
// (semantic versioning: MAJOR.MINOR.PATCH).
export const APP_VERSION = "4.2.0";

export const CHANGELOG = [
  {
    version: "4.2.0",
    date: "2026-07-15",
    title: "Admin restricted-holiday pool & multi-year calendar",
    type: "minor",
    changes: [
      "Restricted holidays are now an admin-declared pool: admins name and date optional holidays, and a developer avails one per calendar year by picking it from a dropdown on the sprint (free-date entry removed).",
      "New Holiday calendar manager with a year selector (2025–2050) covering both company holidays and the restricted-holiday pool, each entry optionally named.",
      "Company holidays and restricted holidays now carry names, shown across the app and the PDF report.",
      "Redesigned the Availability & time-off summary into stat tiles (productive days, holidays, restricted leave, hours diluted) with named holiday chips.",
    ],
  },
  {
    version: "4.1.0",
    date: "2026-07-15",
    title: "Restricted holidays & availability reporting",
    type: "minor",
    changes: [
      "Restricted (optional) holidays: mark one per sprint, enforced to at most one per developer per calendar year against a per-developer ledger that remembers across quarters.",
      "A restricted holiday is excluded from that sprint's productive days — pro-rata, so it lowers the target proportionally and is never counted as underperformance.",
      "Weekend-dated company holidays can now be recorded; they are flagged as no-impact since weekends are already non-working (counted once, never twice).",
      "New Availability & time-off summary (in-app panel and PDF section) stating holidays, restricted leave and the pro-rata dilution of productive hours in constructive, no-fault language.",
      "Professionalised the public repository: refreshed README, CHANGELOG, package metadata, plus SECURITY, CODE_OF_CONDUCT and GitHub issue/PR templates.",
    ],
  },
  {
    version: "4.0.0",
    date: "2026-07-15",
    title: "Performance Evaluation Centre",
    type: "major",
    changes: [
      "Renamed to Performance Evaluation Centre with a minimalist, Fortune-50 grade interface.",
      "Config-driven scoring: weights, reward bands and code-quality grades are editable in-app, with JSON import/export and structural validation.",
      "Efficiency redefined as a ticket ratio (tickets closed / tickets assigned).",
      "Cross-quarter proportional scoring: a sprint's whole-sprint days drive metrics while only in-quarter days claim base points.",
      "Shared-boundary sprints with count-once day allocation, so per-sprint days tile the quarter exactly.",
      "Configurable holidays excluded from productive days (alongside weekends).",
      "Auto-generated 14-day draft sprints on quarter lock; the evaluation-period end date is auto-suggested from the start.",
      "Integrity rules: sprints with no hours and no tickets score zero, and zero assigned tickets earn no efficiency credit.",
      "Rebuilt analytics chart into a per-sprint score-composition view with a base-target line.",
      "Fortune-50 PDF reports with optional developer/quarter metadata, a systematic layout, and Latin-1 text sanitisation.",
      "Error handling throughout: error boundary, inline validation notices, and graceful config fallbacks.",
      "In-app Framework tab documenting workflows, definitions, constraints, enablers and this version history.",
      "53 automated tests covering scoring, dates, bands, validation and edge cases.",
    ],
  },
  {
    version: "3.1.0",
    date: "2026-05-12",
    title: "Documentation & release baseline",
    type: "minor",
    changes: [
      "Professionalised repository documentation and aligned the codebase to the v3.1.0 baseline.",
    ],
  },
  {
    version: "3.0.0",
    date: "2026-04-12",
    title: "Developer Evaluation Calculator",
    type: "major",
    changes: [
      "Initial React + Vite evaluation calculator with pro-rata scoring across four parameters and light/dark themes.",
    ],
  },
];
