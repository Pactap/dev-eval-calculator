import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { DEFAULT_CONFIG } from "./constants.js";
import { validateConfig } from "./configValidation.js";

const STORAGE_KEY = "devEvalConfig.v1";
// Optional backend (Cloudflare Worker). Set VITE_CONFIG_API to enable the shared,
// server-enforced config; unset -> the app runs local-only, per browser.
const CONFIG_API = (import.meta.env.VITE_CONFIG_API || "").replace(/\/$/, "");
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

function loadConfig() {
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

  // On load, the server holds the authoritative shared config; adopt it if reachable.
  useEffect(() => {
    if (!CONFIG_API) return;
    let cancelled = false;
    fetch(`${CONFIG_API}/config`)
      .then(r => (r.ok ? r.json() : null))
      .then(remote => { if (!cancelled && remote) setConfig(reviveConfig(remote)); })
      .catch(() => {}); // offline -> keep local
    return () => { cancelled = true; };
  }, []);

  // The real gate: persisting the shared config requires the passkey, verified server-side.
  const publishConfig = useCallback(async (passkey) => {
    if (!CONFIG_API) throw new Error("No server configured.");
    const res = await fetch(`${CONFIG_API}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Passkey": passkey || "" },
      body: serializeConfig(config),
    });
    if (!res.ok) {
      throw new Error(res.status === 401 ? "Server rejected the passkey." : `Publish failed (${res.status}).`);
    }
  }, [config]);

  const reset = useCallback(() => setConfig(DEFAULT_CONFIG), []);

  const updateWeights = useCallback((weights) => {
    setConfig(c => ({ ...c, weights: { ...c.weights, ...weights } }));
  }, []);

  const updateKey = useCallback((key, value) => {
    setConfig(c => ({ ...c, [key]: value }));
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
      config, reset,
      updateWeights, updateKey,
      exportJson, importJson,
      publishConfig, configApiEnabled: !!CONFIG_API,
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
