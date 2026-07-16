# Performance Evaluation Centre

A client-side React application that turns a developer's sprint activity into a transparent,
pro-rata quarterly performance score. Weights, reward bands, and grades are **configurable** — the
app ships with defaults but treats none of them as fixed law. Every calculation runs in the browser
and is fully auditable.

The app is intentionally frontend-only — no backend required, no database, no evaluation data leaves
the device. An **optional** Cloudflare Worker (`worker/`) can be configured to share the evaluation
parameters and the restricted-holiday quota across a team; when it is absent the app runs entirely
per-browser. All scoring lives in deterministic JavaScript modules covered by tests.

---

## Contents

- [What it does](#what-it-does)
- [The scoring model](#the-scoring-model)
  - [Quarter allocation (pro-rata)](#quarter-allocation-pro-rata)
  - [The four parameters — definitions & worked examples](#the-four-parameters--definitions--worked-examples)
  - [Putting a sprint together](#putting-a-sprint-together)
- [Holidays & availability](#holidays--availability)
- [Integrity rules](#integrity-rules)
- [Key capabilities](#key-capabilities)
- [Configuration & persistence](#configuration--persistence)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Build & deployment](#build--deployment)
- [Repository structure](#repository-structure)
- [Documentation map](#documentation-map)
- [License](#license)

---

## What it does

A quarter is a fixed **base point pool** (a configurable score, default `90`). That pool is allocated
across each sprint in proportion to the **productive working days** the sprint contains (weekdays
minus holidays), so uneven sprint lengths stay comparable. Each sprint's allocation is then adjusted
by **four weighted parameters**, each of which maps a recorded performance value to a multiplier.

Because both the weights and the band/grade multipliers are edited in-app, this README describes the
*mechanism* and its *default* configuration, never a hardcoded number as the rule. The authoritative
defaults live in [`src/constants.js`](src/constants.js); when a number here disagrees with that file,
that file wins.

## The scoring model

### Quarter allocation (pro-rata)

```text
totalWorkingDays = weekdays (Mon–Fri) in the quarter, minus holidays
dailyRate        = quarterBase / totalWorkingDays
sprintBasePoints = dailyRate * sprintProductiveDays
allottedHours    = dailyCapacity * sprintProductiveDays
```

| Setting | Default | Where to change |
| --- | ---: | --- |
| Quarter base score | `90` | state in `src/App.jsx` |
| Daily capacity | `6` hours/day | state in `src/App.jsx` |
| Parameter weights | see below | Admin → Evaluation Parameters |
| Reward bands & grades | see below | Admin → Evaluation Parameters |

**Worked allocation example.** A quarter with `60` total productive days and a base of `90` gives a
`dailyRate = 90 / 60 = 1.5` points/day. A sprint containing `10` productive days claims
`sprintBasePoints = 1.5 × 10 = 15` points, and (at the default `6` hrs/day capacity)
`allottedHours = 6 × 10 = 60` hours. Those 15 points are what the four parameters below split and
scale.

### The four parameters — definitions & worked examples

Each parameter takes a raw performance value, looks up a **multiplier** (from a configurable band
table or grade list), and contributes:

```text
allocated (per parameter) = sprintBasePoints * parameterWeight
achieved  (per parameter) = allocated * multiplier
sprintTotal               = sum of the four achieved values
```

The **percentage formulas are fixed**; the **weights and multipliers are configurable**. Default
weights are shown, but the panel lets a team retune them (they should sum to 100%).

Bands are **inclusive of their lower bound and exclusive of their upper**. All example multipliers
below are the *shipped defaults* from `src/constants.js`.

---

#### 1. Planned Hours — *default weight 40%*

**What it measures:** planned utilization of available time. Rework is excluded (see
[Dual penalty](#dual-penalty)).

**Formula:**

```text
plannedHours% = (completedHours + collaborationHours) / allottedHours * 100    (capped at 100%)
```

**Example.** Sprint has `10` productive days → `allottedHours = 6 × 10 = 60`. The developer logs
`40` completed + `8` collaboration = `48` hours. `plannedHours% = 48 / 60 × 100 = 80%`. The default
band covering 80% (`80–90`) supplies a **1.50×** multiplier. With `sprintBasePoints = 15` and weight
`0.40`: `allocated = 15 × 0.40 = 6.0`, `achieved = 6.0 × 1.50 = 9.0` points.

#### 2. Code Quality — *default weight 20%*

**What it measures:** the team lead's quality judgment for the sprint, cross-checked against the CQI.

**Formula:** the chosen grade label maps directly to a multiplier — no percentage.

```text
codeQualityMultiplier = grade → multiplier   (from the configurable grade list)
```

Default grade ladder: `Outstanding 1.50×`, `Good 1.30×`, `Satisfactory 1.00×`,
`Needs Improvement 0.60×`, `Unsatisfactory 0.30×`, `Poor −0.30×` (a genuinely poor sprint can
*subtract* points).

**Example.** A lead grades the sprint **Good** → **1.30×**. With `sprintBasePoints = 15` and weight
`0.20`: `allocated = 15 × 0.20 = 3.0`, `achieved = 3.0 × 1.30 = 3.9` points.

#### 3. Efficiency — *default weight 40%*

**What it measures:** delivery of assigned work — tickets actually closed against tickets assigned.
Collaboration hours do not count here.

**Formula:**

```text
efficiency% = closedTickets / assignedTickets * 100
```

**Zero assigned tickets earns no credit (0×)** — distinct from closing 0 of N assigned.

**Example.** `16` closed of `20` assigned → `efficiency% = 16 / 20 × 100 = 80%`. The default band
covering 80% (`71–80%`) supplies **0.40×**. With `sprintBasePoints = 15` and weight `0.40`:
`allocated = 15 × 0.40 = 6.0`, `achieved = 6.0 × 0.40 = 2.4` points.

#### 4. Issue Persistence — *default weight 0%*

**What it measures:** defect recurrence — how often completed work is reopened. A legacy reach-back
signal, retained but zero-weighted by default (so it contributes nothing unless a team re-weights
it).

**Formula:**

```text
issuePersistence% = reopenedTickets / doneTickets * 100
```

**Zero done tickets forces the worst band** — a sprint cannot dodge reopen penalties by reporting no
completed work.

**Example.** `2` reopened of `40` done → `issuePersistence% = 2 / 40 × 100 = 5%`. The default band
covering 5% (`0–10%`) supplies **1.50×** (best). But at the default weight `0.00`:
`allocated = 15 × 0.00 = 0`, so `achieved = 0` regardless of the multiplier. Give it a non-zero
weight and it starts contributing.

### Putting a sprint together

Summing the four worked examples above (default weights, `sprintBasePoints = 15`):

| Parameter | Value | Multiplier | Weight | Allocated | Achieved |
| --- | --- | ---: | ---: | ---: | ---: |
| Planned Hours | 80% | 1.50× | 0.40 | 6.0 | **9.0** |
| Code Quality | Good | 1.30× | 0.20 | 3.0 | **3.9** |
| Efficiency | 80% | 0.40× | 0.40 | 6.0 | **2.4** |
| Issue Persistence | 5% | 1.50× | 0.00 | 0.0 | **0.0** |
| **Sprint total** | | | | | **15.3** |

The sprint *earned* 15.3 points against a 15-point base allocation — slightly above target because
Planned Hours and Code Quality over-performed while Efficiency dragged. Retune any weight,
multiplier, or grade in the Admin panel and every number here moves with it.

## Holidays & availability

- A per-year **holiday calendar** (2025–2050) holds named **company holidays** and an
  admin-declared list of **restricted (optional) holidays**. Weekend-dated holidays are recorded but
  flagged no-impact (weekends are already non-working — counted once, never twice).
- A developer avails **one restricted holiday per calendar year**, picked per sprint from the
  declared list. One developer availing a day never blocks another. The one-per-year quota is
  **server-authoritative** across machines via the Cloudflare Worker when configured, else a
  per-browser ledger.
- An availed restricted holiday is **excluded from that sprint's productive days**, exactly like a
  company holiday. Because scoring is pro-rata, the target shrinks with the day away — time off is
  never counted as underperformance. A constructive availability summary appears in-app and in the
  PDF report.

## Integrity rules

- A sprint with **no hours and no tickets** scores zero — the default grade never awards free points.
- **Zero assigned tickets** earns no efficiency credit (`0×`).
- **Zero done tickets** forces Issue Persistence to its worst band.
- Numeric inputs are clamped with `Math.max(0, …)`, so negative input cannot produce invalid scores.
- **Cross-quarter sprints** use their full length for hours and percentages, but only in-quarter
  productive days claim base points for this quarter.
- **Shared-boundary sprints** count the shared day once (in the earlier sprint), so per-sprint days
  tile the quarter exactly.
- **Locked sprints** are immutable snapshots — later config, holiday, or rate changes do not rewrite
  them unless unlocked and re-locked.
- A band or grade group can never be fully emptied; the last entry cannot be removed.

### Dual penalty

Reopened tickets are penalized **twice, by design**: rework is excluded from completed hours
(reducing Planned Hours credit) *and* reopened tickets raise the Issue Persistence ratio. This is a
business rule, not a bug.

## Key capabilities

- Pro-rata allocation across variable-length sprints; configurable base score and daily capacity.
- Cross-quarter and shared-boundary sprints scored proportionally.
- Admin tab (passkey-gated): centralized evaluation parameters + holiday calendar, bulk JSON
  import/export (company holidays, restricted holidays, developer usage) with sample templates, and
  add/edit/remove of each developer's restricted holiday.
- Config **auto-saves** to the shared server on every admin edit (when a backend is configured), with
  a sync indicator and stranded-data recovery; edits survive reloads and redeploys.
- Employee IDs are matched normalization-insensitively and displayed in one canonical uppercase form.
- Mandatory Financial Quarter label (dropdown) decoupled from the scored **evaluation period**; picking the Evaluation Start Date auto-fills the End Date to 84 days (6 fortnightly sprints, editable).
- Auto-generated fortnightly (14-day) draft sprints on lock, landing on true sprint boundaries; drafts stay editable.
- Per-sprint score-composition chart; quarterly executive rollup.
- Formatted PDF report with optional developer/quarter metadata.
- In-app **Framework** tab: workflows, definitions (with the same worked examples), constraints,
  enablers, and version history.
- Light / system / dark themes; error boundary.

## Configuration & persistence

- **Weights, bands, grades** are edited in the Admin → Evaluation Parameters panel and validated
  structurally; exportable/importable as JSON.
- **Local mode** (no Worker): everything persists to `localStorage`, per browser.
- **Shared mode** (Worker configured via `VITE_CONFIG_API`): the config and the restricted-holiday
  ledger are server-authoritative and auto-saved; the passkey gates every write, verified server-side
  with a constant-time comparison.

## Tech stack

| Area | Technology |
| --- | --- |
| UI | React 18 + Vite 5 |
| Charts | Chart.js 4 |
| PDF | jsPDF + jspdf-autotable |
| Testing | Node.js built-in test runner |
| Styling | CSS custom properties in `src/App.css` |
| Optional backend | Cloudflare Worker + KV (`worker/`) |

## Quick start

```bash
npm install
npm run dev      # start dev server
npm run test     # run scoring / utility / edge-case tests
npm run build    # production build to dist/
npm run check    # test + build

node --test worker/worker.test.mjs   # Cloudflare Worker tests (config + restricted-holiday quota)
```

## Build & deployment

The app is a static build (`npm run build` → `dist/`) and can be served from any static host. Vite
uses a relative base (`./`) so it runs from any subpath, and `public/.nojekyll` keeps static hosts
from processing the build.

```bash
npm run deploy   # test + build, then publish dist/ to the gh-pages branch
```

GitHub Actions is not used (Actions runners are disabled for this repository at the organization
level).

## Repository structure

```text
src/
  App.jsx                Root state, theme, layout, view tabs
  App.css                Design system and responsive styles
  version.js             App version + changelog (single source of truth)
  constants.js           Default scoring config (source of truth for defaults), sprint factory
  configStore.jsx        Config context, persistence, auto-save, passkey gate
  configValidation.js    Structural validation for imported config
  scoring.js             Pure scoring and quarterly aggregation
  availability.js        Holiday / restricted-leave summary (shared by panel + PDF)
  restrictedHolidays.js  Per-developer, per-year restricted-holiday ledger; Employee-ID normalization
  bulkIO.js              JSON import/export for holidays and developer usage
  utils.js               Working-day counts, dates, sprint generation, PDF sanitizer
  pdfReport.js           Formatted PDF report generator
  ErrorBoundary.jsx      Top-level error boundary
  components/            SprintCard, HolidayManager, SettingsPanel, DevUsagePanel, BulkIOPanel,
                         AvailabilityPanel, ScoreTable, CorrelationChart, QuarterlySummary,
                         QuarterConfig, Framework, AdminUnlock, …
worker/
  worker.mjs             Optional Cloudflare Worker (shared config + restricted-holiday quota)
  worker.test.mjs        Worker tests
tests/
  scoring.test.mjs       Core scoring / utility tests
  edge-cases.test.mjs    Boundary, timezone, validation, PDF sanitizer tests
  holidays-rh.test.mjs   Weekend holidays, restricted-holiday quota ledger, availability
docs/
  SCORING.md             Full scoring reference (formulas, examples, integrity rules)
```

## Documentation map

- **This README** — overview, the scoring model, and worked examples.
- [`docs/SCORING.md`](docs/SCORING.md) — the complete scoring reference.
- In-app **Framework** tab — the same model rendered against the *live* configuration, so it always
  reflects the current weights, bands, and grades.
- [`CHANGELOG.md`](CHANGELOG.md) — release history (mirrored in `src/version.js`).

## License

MIT. See [LICENSE](LICENSE). Changelog: [CHANGELOG.md](CHANGELOG.md).
