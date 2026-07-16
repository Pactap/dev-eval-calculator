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

Each sprint base allocation is split across four parameters. The **percentage formulas are fixed**;
the **weights and the band/grade multipliers are configurable** and edited in-app (Admin → Evaluation
Parameters). Weights should sum to 100%. The default weights below are the shipped starting point, not
a fixed rule.

| Parameter | Default weight | What it measures | Calculation |
| --- | ---: | --- | --- |
| Planned Hours | 40% | Planned utilization of available time (rework excluded) | `(completedHours + collaborationHours) / allottedHours * 100`, capped at 100% |
| Code Quality | 20% | Team-lead quality judgment, cross-checked against the CQI | grade label → multiplier |
| Efficiency | 40% | Delivery of assigned work | `closedTickets / assignedTickets * 100` |
| Issue Persistence | 0% | Defect recurrence (reopens vs tickets closed, zero-weighted by default) | `reopenedTickets / closedTickets * 100` |

```text
allocated   = sprintBasePoints * weight
achieved    = allocated * multiplier
sprintTotal = sum(parameter achieved values)
```

Bands (Planned Hours, Efficiency, Issue Persistence) and Code Quality grades map percentages/labels to
multipliers; they are configurable and listed read-only in the app. Bands are inclusive of their lower
bound and exclusive of their upper.

### Worked example

Take a quarter with `60` total productive days and a base of `90` → `dailyRate = 1.5`/day. A sprint of
`10` productive days claims `sprintBasePoints = 1.5 × 10 = 15`, and at the default `6` hrs/day
capacity `allottedHours = 60`. Using the shipped default weights and bands:

| Parameter | Recorded | Percentage | Default multiplier | Weight | Achieved (`15 × weight × mult`) |
| --- | --- | ---: | ---: | ---: | ---: |
| Planned Hours | 40 completed + 8 collab of 60 allotted | `48/60 = 80%` | `1.50×` (band 80–90) | 0.40 | `15 × 0.40 × 1.50 =` **9.00** |
| Code Quality | Lead grade "Good" | — | `1.30×` | 0.20 | `15 × 0.20 × 1.30 =` **3.90** |
| Efficiency | 16 closed of 20 assigned | `16/20 = 80%` | `0.40×` (band 71–80) | 0.40 | `15 × 0.40 × 0.40 =` **2.40** |
| Issue Persistence | 2 reopened of 40 closed | `2/40 = 5%` | `1.50×` (band 0–10) | 0.00 | `15 × 0.00 × 1.50 =` **0.00** |
| **Sprint total** | | | | | **15.30** |

The sprint earned `15.30` against its `15`-point base allocation. Retune any weight, band multiplier,
or grade in the Admin panel and every number above moves with it — the in-app **Framework** tab
recomputes this example against the live configuration.

Edge behaviours reflected by the formulas: Planned Hours is **capped at 100%**; **zero assigned
tickets** gives Efficiency no credit (`0×`, distinct from closing 0 of N); and **zero closed tickets**
forces Issue Persistence to its worst band rather than letting a sprint dodge reopen penalties.

## Cross-quarter & shared-boundary sprints

- A sprint that spans the quarter boundary uses its **full length** for hours and percentages, but only its
  **in-quarter** productive days claim base points for this quarter.
- Auto-generated sprints begin on the day the previous one ends; that shared boundary day is counted in the
  earlier sprint only, so per-sprint days tile the quarter exactly and the base is never over-allocated.

## Holidays, restricted holidays & availability

- The **Holiday calendar manager** (`components/HolidayManager.jsx`) manages both lists one year at a time
  (2025–2050); editing is passkey-gated. Company holidays and restricted-holiday pool entries can be named.
- **Company holidays** are excluded from productive days alongside weekends. A holiday that falls on a
  weekend is recorded but has **no additional impact** — weekends are already non-working, so it is counted
  once, never twice.
- **Restricted (optional) holidays** come from an **admin-declared pool** (`config.restrictedHolidayPool`,
  named + dated). A developer avails **one per calendar year**, chosen per sprint from that pool. The quota
  is enforced within the evaluation and per developer by Employee ID: when the Cloudflare Worker backend is
  configured it is **server-authoritative** (the Worker's `/rh/claim` rejects a second date for the same
  dev+year with 409, and recording requires the passkey) so it holds **across machines**; without a backend
  it falls back to a per-browser ledger (`src/restrictedHolidays.js`). An availed restricted holiday is
  excluded from that sprint's productive days exactly like a company holiday.
- Because scoring is **pro-rata to productive days**, holidays and restricted leave shrink the point pool
  proportionally: the target scales down with the time away, so approved leave is **never counted as
  underperformance**. The Availability & time-off summary (`src/availability.js`) states this in the app and
  in the PDF report in constructive, no-fault language.

## Integrity rules

- A sprint with **no hours and no tickets** scores zero — the default grade never awards free points.
- **Zero assigned tickets** earns no efficiency credit (0×), distinct from closing 0 of N assigned.
- If `closedTickets` is zero, Issue Persistence is forced to its worst band, so a sprint cannot dodge reopen
  penalties by closing no tickets.
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
