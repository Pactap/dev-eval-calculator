const BAND_KEYS = ["plannedHoursBands", "efficiencyBands", "issuePersistBands"];

/**
 * Strict finite-number check. Rejects "", null, [], booleans and whitespace,
 * all of which `Number(x)` would silently coerce to a finite 0.
 */
function isNum(x) {
  if (typeof x === "number") return Number.isFinite(x);
  if (typeof x === "string" && x.trim() !== "") return Number.isFinite(Number(x));
  return false;
}

/**
 * Structurally validate an imported config object. Throws a descriptive Error
 * so the UI can tell the user exactly what is wrong instead of silently
 * accepting malformed data (which would later surface as NaN or a crash).
 */
export function validateConfig(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Config must be a JSON object.");
  }
  if (raw.weights !== undefined) {
    if (typeof raw.weights !== "object" || Array.isArray(raw.weights)) {
      throw new Error("`weights` must be an object.");
    }
    for (const k of Object.keys(raw.weights)) {
      if (!isNum(raw.weights[k])) {
        throw new Error(`Weight "${k}" must be a number.`);
      }
    }
  }
  const checkBands = (arr, name) => {
    if (arr === undefined) return;
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error(`\`${name}\` must be a non-empty array.`);
    }
    arr.forEach((b, i) => {
      if (!b || typeof b !== "object") throw new Error(`\`${name}[${i}]\` must be an object.`);
      if (typeof b.label !== "string") throw new Error(`\`${name}[${i}].label\` must be a string.`);
      if (!isNum(b.min)) throw new Error(`\`${name}[${i}].min\` must be a number.`);
      if (b.max !== null && b.max !== Infinity && !isNum(b.max)) throw new Error(`\`${name}[${i}].max\` must be a number or null.`);
      if (!isNum(b.multiplier)) throw new Error(`\`${name}[${i}].multiplier\` must be a number.`);
    });
  };
  BAND_KEYS.forEach(k => checkBands(raw[k], k));
  if (raw.codeQualityOptions !== undefined) {
    if (!Array.isArray(raw.codeQualityOptions) || raw.codeQualityOptions.length === 0) {
      throw new Error("`codeQualityOptions` must be a non-empty array.");
    }
    raw.codeQualityOptions.forEach((o, i) => {
      if (typeof o?.label !== "string") throw new Error(`\`codeQualityOptions[${i}].label\` must be a string.`);
      if (!isNum(o.multiplier)) throw new Error(`\`codeQualityOptions[${i}].multiplier\` must be a number.`);
    });
  }
  if (raw.holidays !== undefined && !Array.isArray(raw.holidays)) {
    throw new Error("`holidays` must be an array of date strings.");
  }
  return true;
}
