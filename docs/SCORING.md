# Scoring Framework

## Purpose

The scoring model evaluates sprint performance by allocating a quarter-level point pool across sprint working days, then applying metric multipliers to each sprint allocation.

The design goal is to make uneven sprint lengths comparable while still reflecting utilization, quality, efficiency, and defect recurrence.

## Quarter Allocation

```text
totalWorkingDays = weekdays between quarterStart and quarterEnd, inclusive
dailyRate = quarterBase / totalWorkingDays
sprintBasePoints = dailyRate * sprintWorkingDays
allottedHours = dailyCapacity * sprintWorkingDays
```

Default values:

| Setting | Default |
| --- | ---: |
| Quarter base score | `90` |
| Daily capacity | `7` hours |

## Weighted Parameters

Each sprint base allocation is split across four parameters.

| Parameter | Weight | Calculation |
| --- | ---: | --- |
| Planned Hours | 50% | `(completedHours + collaborationHours) / allottedHours * 100` |
| Code Quality | 20% | Manual quality grade multiplier |
| Efficiency | 10% | `completedHours / allottedHours * 100` |
| Issue Persists | 20% | `reopenedTickets / doneTickets * 100` |

Each parameter score is calculated as:

```text
allocated = sprintBasePoints * weight
achieved = allocated * multiplier
sprintTotal = sum(parameter achieved values)
```

## Planned Hours Bands

| Band | Multiplier |
| --- | ---: |
| 90-100 | 1.75x |
| 80-90 | 1.50x |
| 70-80 | 1.20x |
| 60-70 | 1.00x |
| 50-60 | 0.75x |
| 40-50 | 0.50x |
| 30-40 | 0.30x |
| Below 30 | 0.00x |

Planned Hours is capped at 100% for band lookup.

## Code Quality Grades

| Grade | Multiplier |
| --- | ---: |
| Outstanding | 1.75x |
| Good | 1.30x |
| Satisfactory | 1.00x |
| Needs Improvement | 0.60x |
| Unsatisfactory | 0.30x |
| Poor | -0.30x |

The default grade for a new sprint is `Satisfactory`.

## Efficiency Bands

| Band | Multiplier |
| --- | ---: |
| 95-100% | 1.20x |
| 85-95% | 1.00x |
| 75-85% | 0.60x |
| 65-75% | 0.00x |
| Below 65% | -0.30x |

Efficiency excludes collaboration hours. It measures completed delivery against allotted capacity.

## Issue Persists Bands

| Band | Multiplier |
| --- | ---: |
| 0-10% | 1.50x |
| 10-20% | 1.00x |
| 20-30% | 0.70x |
| 30-40% | 0.30x |
| 40%+ | -0.50x |

Lower issue persistence is better.

## Dual Penalty

Reopened tickets are intentionally penalized in two ways:

1. Rework is excluded from completed hours, reducing Planned Hours credit.
2. Reopened tickets increase the Issue Persists ratio.

This is a business rule, not a bug. The score table highlights when reopened tickets create this dual penalty.

## Zero Done Tickets

If `doneTickets` is zero, Issue Persists is set to the worst band:

```text
ipPct = 100
ipBand = 40%+
multiplier = -0.50x
```

This prevents a sprint from avoiding reopen penalties by reporting no completed tickets.

## Input Safety

`computeSprintResult` clamps numeric input values to zero or greater:

```javascript
Math.max(0, parseFloat(value) || 0)
```

This keeps negative user input from producing invalid score behavior.

## Locked Sprint Behavior

When a sprint is locked, its result is snapshotted and reused. The snapshot includes the scoring outcome at the time of locking. Quarter changes after that point do not rewrite the locked sprint score unless the sprint is unlocked and locked again.

## Test Coverage

Scoring tests live in `tests/scoring.test.mjs` and cover:

- Inclusive weekday counting.
- Threshold band selection.
- Weighted scoring for a healthy sprint.
- Worst-band assignment for zero done tickets.
- Quarterly aggregation totals.

Run:

```bash
npm run test
```
