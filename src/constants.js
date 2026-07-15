export const DEFAULT_CONFIG = {
  weights: { ph: 0.40, cq: 0.20, eff: 0.40, ip: 0.00 },
  holidays: [],
  plannedHoursBands: [
    { label: "90-100", min: 90, max: 100.01, multiplier: 1.75 },
    { label: "80-90", min: 80, max: 90, multiplier: 1.50 },
    { label: "70-80", min: 70, max: 80, multiplier: 1.20 },
    { label: "60-70", min: 60, max: 70, multiplier: 1.00 },
    { label: "50-60", min: 50, max: 60, multiplier: 0.75 },
    { label: "40-50", min: 40, max: 50, multiplier: 0.50 },
    { label: "30-40", min: 30, max: 40, multiplier: 0.30 },
    { label: "Below 30", min: 0, max: 30, multiplier: 0.00 },
  ],
  codeQualityOptions: [
    { label: "Outstanding", multiplier: 1.50 },
    { label: "Good", multiplier: 1.30 },
    { label: "Satisfactory", multiplier: 1.00 },
    { label: "Needs Improvement", multiplier: 0.60 },
    { label: "Unsatisfactory", multiplier: 0.30 },
    { label: "Poor", multiplier: -0.30 },
  ],
  efficiencyBands: [
    { label: "100%+", min: 100, max: Infinity, multiplier: 1.30 },
    { label: "91-100%", min: 91, max: 100, multiplier: 1.10 },
    { label: "81-90%", min: 81, max: 91, multiplier: 0.80 },
    { label: "71-80%", min: 71, max: 81, multiplier: 0.40 },
    { label: "70% and Below", min: 0, max: 71, multiplier: 0.20 },
  ],
  issuePersistBands: [
    { label: "0-10%", min: 0, max: 10, multiplier: 1.50 },
    { label: "10-20%", min: 10, max: 20, multiplier: 1.00 },
    { label: "20-30%", min: 20, max: 30, multiplier: 0.70 },
    { label: "30-40%", min: 30, max: 40, multiplier: 0.30 },
    { label: "40%+", min: 40, max: Infinity, multiplier: -0.50 },
  ],
};

let _sprintId = 0;
export function createSprint(overrides = {}) {
  return {
    id: ++_sprintId,
    name: "",
    workingDays: "",
    completedHours: "",
    collaborationHours: "",
    codeQuality: "Satisfactory",
    assignedTickets: "",
    closedTickets: "",
    reopenedTickets: "",
    doneTickets: "",
    restrictedHoliday: "",   // ISO date of a developer's restricted (optional) holiday in this sprint, if any
    locked: false,
    lockedResult: null,
    draft: false,
    startDate: "",
    endDate: "",
    ...overrides,
  };
}
