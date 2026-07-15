import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { DEFAULT_CONFIG } from "./constants.js";
import { validateConfig } from "./configValidation.js";

const STORAGE_KEY = "devEvalConfig.v1";
const ConfigContext = createContext(null);

function reviveConfig(raw) {
  const cfg = { ...DEFAULT_CONFIG, ...raw };
  // Deep-merge nested weights so a partial/foreign config missing a key falls back
  // to the default instead of leaving it undefined (which cascades to NaN scores).
  cfg.weights = { ...DEFAULT_CONFIG.weights, ...(raw.weights || {}) };
  const reviveBands = (arr) => arr.map(b => ({
    ...b,
    max: b.max === null ? Infinity : b.max,
  }));
  if (cfg.plannedHoursBands) cfg.plannedHoursBands = reviveBands(cfg.plannedHoursBands);
  if (cfg.efficiencyBands) cfg.efficiencyBands = reviveBands(cfg.efficiencyBands);
  if (cfg.issuePersistBands) cfg.issuePersistBands = reviveBands(cfg.issuePersistBands);
  return cfg;
}

function serializeConfig(cfg) {
  const stripBands = (arr) => arr.map(b => ({
    ...b,
    max: b.max === Infinity ? null : b.max,
  }));
  return JSON.stringify({
    ...cfg,
    plannedHoursBands: stripBands(cfg.plannedHoursBands),
    efficiencyBands: stripBands(cfg.efficiencyBands),
    issuePersistBands: stripBands(cfg.issuePersistBands),
  });
}

export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return reviveConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(loadConfig);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeConfig(config));
    } catch {}
  }, [config]);

  const reset = useCallback(() => setConfig(DEFAULT_CONFIG), []);

  const updateWeights = useCallback((weights) => {
    setConfig(c => ({ ...c, weights: { ...c.weights, ...weights } }));
  }, []);

  const updateBands = useCallback((key, bands) => {
    setConfig(c => ({ ...c, [key]: bands }));
  }, []);

  const updateOptions = useCallback((key, options) => {
    setConfig(c => ({ ...c, [key]: options }));
  }, []);

  const setHolidays = useCallback((holidays) => {
    setConfig(c => ({ ...c, holidays }));
  }, []);

  const exportJson = useCallback(() => serializeConfig(config), [config]);

  const importJson = useCallback((jsonStr) => {
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error("File is not valid JSON.");
    }
    validateConfig(parsed);
    setConfig(reviveConfig(parsed));
  }, []);

  return (
    <ConfigContext.Provider value={{
      config, setConfig, reset,
      updateWeights, updateBands, updateOptions, setHolidays,
      exportJson, importJson,
    }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be within ConfigProvider");
  return ctx;
}
