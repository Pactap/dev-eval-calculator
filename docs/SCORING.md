# Scoring Framework

> **Source of truth:** the live defaults are in [`src/constants.js`](../src/constants.js) and every rule is
> editable in-app (Settings panel) and documented in the in-app **Framework** tab. This file explains the
> model; when a number here and in `constants.js` disagree, `constants.js` wins.

## Purpose

The model turns a developer's sprint activity into a transparent, pro-rata quarterly score. A quarter is a
fixed point pool; that pool is allocated across each sprint's productive working days, and each sprint's
allocation is then adjusted by four weighted parameters. The goal is to keep uneven sprint lengths
comparable while still reflecting utilization, quality, delivery, and defect recurrence.

## Quarter Allocation

```text
totalWorkingDays = weekdays (Mon–Fri) between quarterStart and quarterEnd, minus holidays
dailyRate        = quarterBase / totalWorkingDays
sprintBasePoints = dailyRate * sprintWorkingDays
allottedHours    = dailyCapacity * sprintWorkingDays
```

| Setting | Default |
| --- | ---: |
| Quarter base score | `90` |
| Daily capacity | `6` hours |

## Weighted Parameters

Each sprint base allocation is split across four parameters. Weights are configurable and should sum to 100%.

| Parameter | Default weight | Calculation |
| --- | ---: | --- |
| Planned Hours | 40% | `(completedHours + collaborationHours) / allottedHours * 100`, capped at 100% |
| Code Quality | 20% | Team-lead grade multiplier, cross-checked against the CQI |
| Efficiency | 40% | `closedTickets / assignedTickets * 100` |
| Issue Persistence | 0% | `reopenedTickets / doneTickets * 100` (retained, currently zero-weighted) |

```text
allocated   = sprintBasePoints * weight
achieved    = allocated * multiplier
sprintTotal = sum(parameter achieved values)
```

Bands (Planned Hours, Efficiency, Issue Persistence) and Code Quality grades map percentages/labels to
multipliers; they are configurable and listed read-only in the app. Bands are inclusive of their lower
bound and exclusive of their upper.

## Cross-quarter & shared-boundary sprints

- A sprint that spans the quarter boundary uses its **full length** for hours and percentages, but only its
  **in-quarter** productive days claim base points for this quarter.
- Auto-generated sprints begin on the day the previous one ends; that shared boundary day is counted in the
  earlier sprint only, so per-sprint days tile the quarter exactly and the base is never over-allocated.

## Holidays, restricted holidays & availability

- **Company holidays** are excluded from productive days alongside weekends. A holiday that falls on a
  weekend is recorded but has **no additional impact** — weekends are already non-working, so it is counted
  once, never twice.
- **Restricted (optional) holidays** are a developer's personal day off — at most **one per developer per
  calendar year**, enforced within the evaluation and remembered across quarters by Employee ID
  (`src/restrictedHolidays.js`). A restricted holiday marked on a sprint is excluded from that sprint's
  productive days exactly like a company holiday.
- Because scoring is **pro-rata to productive days**, holidays and restricted leave shrink the point pool
  proportionally: the target scales down with the time away, so approved leave is **never counted as
  underperformance**. The Availability & time-off summary (`src/availability.js`) states this in the app and
  in the PDF report in constructive, no-fault language.

## Integrity rules

- A sprint with **no hours and no tickets** scores zero — the default grade never awards free points.
- **Zero assigned tickets** earns no efficiency credit (0×), distinct from closing 0 of N assigned.
- If `doneTickets` is zero, Issue Persistence is forced to its worst band, so a sprint cannot dodge reopen
  penalties by reporting no completed work.
- `computeSprintResult` clamps numeric inputs with `Math.max(0, parseFloat(value) || 0)`, so negative input
  cannot produce invalid scores.
- Remaining quarter allocation is clamped at zero and never reads negative.

## Dual penalty

Reopened tickets are intentionally penalized twice: rework is excluded from completed hours (reducing
Planned Hours credit) **and** reopened tickets raise the Issue Persistence ratio. This is a business rule,
not a bug.

## Locked sprint behavior

Locking a sprint snapshots its computed result. Later quarter, holiday, or config changes do not rewrite a
locked sprint's score unless it is unlocked and locked again.

## Test coverage

Scoring, edge-case, and availability/restricted-holiday tests live in `tests/`:

- `scoring.test.mjs` — working-day counting, band lookup, weighted scoring, zero-done, aggregation.
- `edge-cases.test.mjs` — boundaries, timezone, config validation, PDF sanitizer.
- `holidays-rh.test.mjs` — weekend holidays, the restricted-holiday quota ledger, and the availability summary.

```bash
npm run test
```
