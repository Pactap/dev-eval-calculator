// Per-developer, per-calendar-year ledger of restricted (optional) holidays.
// A developer may take at most ONE restricted holiday per calendar year; this
// ledger remembers what was claimed so a second one is prevented across separate
// evaluations/quarters (same browser). It is deliberately client-side and keyed
// on the Employee ID entered in Report Details — the honest limit of a tool that
// stores nothing on a server. Falls back to the developer name when no ID is set.

const LEDGER_KEY = "rhLedger.v1";

// localStorage is absent in Node (tests) and SSR; degrade to an in-memory shim
// so the pure quota logic stays testable and never throws.
const memory = {};
function store() {
  try {
    if (typeof localStorage !== "undefined" && localStorage) return localStorage;
  } catch { /* access can throw in locked-down contexts */ }
  return {
    getItem: (k) => (k in memory ? memory[k] : null),
    setItem: (k, v) => { memory[k] = String(v); },
  };
}

export function loadLedger() {
  try {
    return JSON.parse(store().getItem(LEDGER_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveLedger(ledger) {
  try {
    store().setItem(LEDGER_KEY, JSON.stringify(ledger));
  } catch { /* quota / private mode — non-fatal, tracking just won't persist */ }
}

/**
 * Normalize an Employee ID for use as a stable ledger key: trimmed, lower-cased,
 * and stripped to alphanumeric only (case-agnostic, no special characters), so
 * "PT-1042", "pt 1042" and "pt1042" all map to the same developer.
 */
export function normalizeEmpId(v) {
  return String(v || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Per-developer key: normalized Employee ID preferred, else a trimmed name. "" if neither. */
export function devKeyOf(meta = {}) {
  const id = normalizeEmpId(meta.empId);
  const name = String(meta.devName || "").trim().toLowerCase().replace(/\s+/g, " ");
  return id || name || "";
}

/** Calendar year of an ISO date ("2026-03-14" -> "2026"). */
export function yearOf(iso) {
  return iso ? String(iso).slice(0, 4) : "";
}

/** The restricted-holiday entry recorded for a developer + year, or null. */
export function rhUsage(devKey, year) {
  if (!devKey || !year) return null;
  const ledger = loadLedger();
  return (ledger[devKey] && ledger[devKey][year]) || null;
}

/** Record (or overwrite) the developer's restricted holiday for a year. */
export function recordRh(devKey, year, entry) {
  if (!devKey || !year) return;
  const ledger = loadLedger();
  ledger[devKey] = { ...(ledger[devKey] || {}), [year]: entry };
  saveLedger(ledger);
}

/** Release the developer's restricted holiday for a year (when it is un-marked). */
export function clearRh(devKey, year) {
  if (!devKey || !year) return;
  const ledger = loadLedger();
  if (ledger[devKey] && ledger[devKey][year]) {
    delete ledger[devKey][year];
    if (Object.keys(ledger[devKey]).length === 0) delete ledger[devKey];
    saveLedger(ledger);
  }
}
