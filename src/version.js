// Single source of truth for the app version and its history.
// Bump APP_VERSION and prepend a CHANGELOG entry on every release
// (semantic versioning: MAJOR.MINOR.PATCH).
export const APP_VERSION = "4.8.0";

export const CHANGELOG = [
  {
    version: "4.8.0",
    date: "2026-07-16",
    title: "Analytics polish, smarter validation & charts in the PDF",
    type: "minor",
    changes: [
      "Analytics dashboard refined to a solid, uniform grid: every chart shares one padded card shell with aligned headers, fixed plot heights, and a fully responsive layout (single column on mobile) — no more leaking titles or clipped cards.",
      "Charts no longer show misleading data for empty sprints: each chart falls back to a clear 'awaiting sprint activity' state until it has real hours, tickets, or scored points (fixes the flat 100% line and empty donut).",
      "Smarter required-field validation: fields turn red only after you touch them or press Lock/Export — never on load — so nothing prematurely nudges you to Employee ID. Base score and Daily capacity are enforced as mandatory alongside the dates and quarter.",
      "The exported PDF now includes a Performance Analytics page with four charts (score composition, achieved-vs-target, strengths radar, score contribution), rendered from the same definitions as the dashboard.",
    ],
  },
  {
    version: "4.7.0",
    date: "2026-07-16",
    title: "Analytics dashboard, notifications & resilient error handling",
    type: "minor",
    changes: [
      "New Analytics tab — a developer monitoring dashboard with seven charts across the quarter's sprints: score composition, achieved-vs-target trend, parameter trends (Planned Hours / Efficiency / Issue Persistence), a strengths radar, a score-contribution donut, hours utilization, and ticket throughput. All theme-aware and computed from the live sprint data.",
      "Rebuilt action notifications: a stacked, dismissible toast system (success / error / info / warning) with per-type duration and accessibility, surfaced through a shared context so any part of the app can raise one. Wired feedback into lock/unlock, add/remove sprint, restricted-holiday, import and export actions.",
      "Hardened error handling: per-section error boundaries (each chart, the sprint ledger, admin panels, availability) with a Retry, so one failure can't blank the app; previously silent server-sync failures now surface as non-blocking notifications.",
    ],
  },
  {
    version: "4.6.1",
    date: "2026-07-16",
    title: "Field labels: required/optional markers",
    type: "patch",
    changes: [
      "Marked the evaluation-period fields (Start, End, Base score, Capacity) and the Financial Quarter as required (*).",
      "Developer Details: Employee ID is now required (and enforced before PDF export); full name and date of joining are marked optional; section renamed from \"Developer Details (Optional)\".",
      "Refreshed placeholder examples to match in-house conventions (Ram Sharma, ABS100).",
    ],
  },
  {
    version: "4.6.0",
    date: "2026-07-16",
    title: "Evaluation period: quarter dropdown & fortnightly sprints",
    type: "minor",
    changes: [
      "The Evaluation Period panel now has a mandatory Financial Quarter dropdown (Q1–Q4, FY2026-27 onward) — a globally-consistent label, decoupled from the scored dates. It moved out of Report Details and is required before locking.",
      "Renamed \"Quarter start / end\" to \"Evaluation Start Date / Evaluation End Date\" to reflect that the scored window is independent of the financial quarter.",
      "Selecting the Evaluation Start Date auto-fills the End Date to 84 days later (6 fortnightly sprints); always editable while unlocked.",
      "Sprint scaffolding is now true fortnightly (14-day cadence) so the auto-generated 14-day drafts land on the real sprint boundaries; drafts remain fully editable.",
      "The PDF report shows both the Financial Quarter label and the evaluation period dates.",
    ],
  },
  {
    version: "4.5.0",
    date: "2026-07-16",
    title: "Durable admin data: auto-save & recovery",
    type: "minor",
    changes: [
      "Admin edits (evaluation parameters, company holidays, restricted-holiday list) now auto-save to the shared server the moment they change — the manual \"Publish\" step is gone, and edits survive reloads and new deploys instead of being overwritten by the older server copy.",
      "A sync indicator (Saving… / Saved / Offline — will retry) shows the save state; the on-load fetch never clobbers an edit already in progress.",
      "Stranded-data recovery: on unlock, a local ledger or config that never reached the server (e.g. recorded before the backend existed) is pushed up once so it is no longer lost.",
      "Employee IDs display in a single canonical uppercase form (ABS100) regardless of how they were entered (abs 100, Abs100, aBs-100…); matching was already case- and separator-insensitive.",
      "The Evaluation Parameters panel now shows the full scoring formula — point allocation, per-parameter achievement and the four parameter inputs — alongside the configured weights, bands and grades.",
    ],
  },
  {
    version: "4.4.0",
    date: "2026-07-16",
    title: "Admin centre, bulk data & Fortune-50 revamp",
    type: "minor",
    changes: [
      "New Admin tab centralises the evaluation parameters, the holiday calendar, bulk import/export and developer-usage management behind one passkey unlock; read-only visitors see the rules and holidays but not the write tools.",
      "Bulk JSON import/export for company holidays, restricted holidays and per-developer usage (each { date, day, name }), with downloadable sample templates and strict alphanumeric Employee-ID normalisation.",
      "Developer restricted holidays are added, edited and removed in the Admin tab; edits are all-or-nothing and sync to the server ledger, whose read is now passkey-gated.",
      "Restricted holidays are framed as an admin-declared list (not a depletable pool) — one developer availing a day never blocks another; 'approved leave' wording removed throughout.",
      "Each sprint shows a Non-working days breakdown (weekends + company holidays + restricted holiday), mirrored in the PDF report.",
      "Fortune-50 presentation pass: Inter typography, soft-UI layered elevation, restrained gradients, a consistent 24px / 20px spacing rhythm, aligned controls and Title Case section titles.",
    ],
  },
  {
    version: "4.3.0",
    date: "2026-07-15",
    title: "Server-authoritative restricted-holiday quota",
    type: "minor",
    changes: [
      "The one-per-developer-per-calendar-year restricted-holiday quota is now enforced by the Cloudflare Worker (new /rh, /rh/claim, /rh/release endpoints, KV-backed) when a backend is configured — authoritative across machines, not just per browser. Recording an RH becomes a passkey-gated write; falls back to the per-browser ledger when no server is set.",
      "Hardening from code review: the shared/remote config is validated before it is adopted; a date cannot be both a company holiday and a restricted-holiday pool entry; company-holiday dates are excluded from the restricted-holiday dropdown.",
    ],
  },
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
