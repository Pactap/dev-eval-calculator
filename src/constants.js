export const PLANNED_HOURS_BANDS = [
  { label: "90-100", min: 90, max: 100.01, multiplier: 1.75 },
  { label: "80-90", min: 80, max: 90, multiplier: 1.50 },
  { label: "70-80", min: 70, max: 80, multiplier: 1.20 },
  { label: "60-70", min: 60, max: 70, multiplier: 1.00 },
  { label: "50-60", min: 50, max: 60, multiplier: 0.75 },
  { label: "40-50", min: 40, max: 50, multiplier: 0.50 },
  { label: "30-40", min: 30, max: 40, multiplier: 0.30 },
  { label: "Below 30", min: 0, max: 30, multiplier: 0.00 },
];

export const CODE_QUALITY_OPTIONS = [
  { label: "Outstanding", multiplier: 1.75, index: 0 },
  { label: "Good", multiplier: 1.30, index: 1 },
  { label: "Satisfactory", multiplier: 1.00, index: 2 },
  { label: "Needs Improvement", multiplier: 0.60, index: 3 },
  { label: "Unsatisfactory", multiplier: 0.30, index: 4 },
  { label: "Poor", multiplier: -0.30, index: 5 },
];

export const EFFICIENCY_BANDS = [
  { label: "95-100%", min: 95, max: 100.01, multiplier: 1.20 },
  { label: "85-95%", min: 85, max: 95, multiplier: 1.00 },
  { label: "75-85%", min: 75, max: 85, multiplier: 0.60 },
  { label: "65-75%", min: 65, max: 75, multiplier: 0.00 },
  { label: "Below 65%", min: 0, max: 65, multiplier: -0.30 },
];

export const ISSUE_PERSIST_BANDS = [
  { label: "0-10%", min: 0, max: 10, multiplier: 1.50 },
  { label: "10-20%", min: 10, max: 20, multiplier: 1.00 },
  { label: "20-30%", min: 20, max: 30, multiplier: 0.70 },
  { label: "30-40%", min: 30, max: 40, multiplier: 0.30 },
  { label: "40%+", min: 40, max: Infinity, multiplier: -0.50 },
];

export const WEIGHTS = { ph: 0.50, cq: 0.20, eff: 0.10, ip: 0.20 };

let _sprintId = 0;
export function createSprint(overrides = {}) {
  return {
    id: ++_sprintId,
    name: "",
    workingDays: "",
    completedHours: "",
    collaborationHours: "",
    codeQuality: "Satisfactory",
    reopenedTickets: "",
    doneTickets: "",
    locked: false,
    lockedResult: null,
    startDate: "",
    endDate: "",
    ...overrides,
  };
}
