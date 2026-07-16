import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_CONFIG } from "./constants.js";
import { validateConfig } from "./configValidation.js";
import { loadLedger, saveLedger, recordRh, clearRh } from "./restrictedHolidays.js";

const STORAGE_KEY = "devEvalConfig.v1";
// Optional backend (Cloudflare Worker). Set VITE_CONFIG_API to enable the shared,
// server-enforced config; unset -> the app runs local-only, per browser.
const CONFIG_API = (import.meta.env.VITE_CONFIG_API || "").replace(/\/$/, "");
const ConfigContext = createContext(null);

// Passkey gate for editing every evaluation parameter (weights, bands, grades,
// AND holidays). Only the SHA-256 hash of the key ships; the raw key is held in
// memory (this page load) to authorize a server publish.
const PASS_HASH = "49efb886446cb7b6b3018bff28018333edf402f4cdf2b4074deda5cbe82a54f4";
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

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
  const [unlocked, setUnlocked] = useState(false); // editing gate; re-auth each page load
  const keyRef = useRef("");

  const unlock = useCallback(async (key) => {
    if (await sha256(key) === PASS_HASH) {
      keyRef.current = key;
      setUnlocked(true);
      return true;
    }
    return false;
  }, []);

  const lock = useCallback(() => {
    keyRef.current = "";
    setUnlocked(false);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeConfig(config));
    } catch {}
  }, [config]);

  // On load, the server holds the authoritative shared config; adopt it if reachable.
  // Validate before adopting so a malformed remote config can't crash render (same
  // gate the import path uses).
  useEffect(() => {
    if (!CONFIG_API) return;
    let cancelled = false;
    fetch(`${CONFIG_API}/config`)
      .then(r => (r.ok ? r.json() : null))
      .then(remote => {
        if (cancelled || !remote) return;
        try { validateConfig(remote); setConfig(reviveConfig(remote)); } catch { /* keep local */ }
      })
      .catch(() => {}); // offline -> keep local
    return () => { cancelled = true; };
  }, []);

  // Restricted-holiday quota ledger. With a server, it is authoritative across
  // machines (the Worker enforces one-per-dev-per-year); without one, it is the
  // per-browser localStorage ledger. Held in memory so reads stay synchronous.
  const [rhLedger, setRhLedger] = useState(() => (CONFIG_API ? {} : loadLedger()));

  // The server ledger holds employee IDs + usage, so its GET is passkey-gated:
  // load it once unlocked (with the key), and drop it from memory on lock.
  useEffect(() => {
    if (!CONFIG_API) return;
    if (!unlocked) { setRhLedger({}); return; }
    let cancelled = false;
    fetch(`${CONFIG_API}/rh`, { headers: { "X-Passkey": keyRef.current || "" } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d && d.ledger) setRhLedger(d.ledger); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [unlocked]);

  const rhUsage = useCallback((devKey, year) => {
    if (!devKey || !year) return null;
    return (rhLedger[devKey] && rhLedger[devKey][year]) || null;
  }, [rhLedger]);

  // Claim throws on the server's 409 (already used) / 401 (bad passkey) so the
  // caller can surface the reason and leave the sprint unchanged.
  const claimRh = useCallback(async (devKey, year, entry) => {
    if (!devKey || !year) return;
    if (CONFIG_API) {
      const res = await fetch(`${CONFIG_API}/rh/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Passkey": keyRef.current || "" },
        body: JSON.stringify({ devKey, year, entry }),
      });
      if (res.status === 404) {                    // Worker not yet redeployed with /rh — degrade to local
        recordRh(devKey, year, entry);
        setRhLedger(l => ({ ...l, [devKey]: { ...(l[devKey] || {}), [year]: entry } }));
        return;
      }
      if (res.status === 409) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || `Restricted holiday already used in ${year}.`);
      }
      if (!res.ok) throw new Error(res.status === 401 ? "Server rejected the passkey." : `Could not record restricted holiday (${res.status}).`);
      const j = await res.json().catch(() => ({}));
      if (j.ledger) setRhLedger(j.ledger);
      else setRhLedger(l => ({ ...l, [devKey]: { ...(l[devKey] || {}), [year]: entry } }));
    } else {
      recordRh(devKey, year, entry);
      setRhLedger(l => ({ ...l, [devKey]: { ...(l[devKey] || {}), [year]: entry } }));
    }
  }, []);

  const releaseRh = useCallback(async (devKey, year) => {
    if (!devKey || !year) return;
    const drop = (l) => {
      const n = { ...l };
      if (n[devKey]) {
        const y = { ...n[devKey] };
        delete y[year];
        if (Object.keys(y).length) n[devKey] = y; else delete n[devKey];
      }
      return n;
    };
    if (CONFIG_API) {
      try {
        const res = await fetch(`${CONFIG_API}/rh/release`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Passkey": keyRef.current || "" },
          body: JSON.stringify({ devKey, year }),
        });
        const j = await res.json().catch(() => ({}));
        if (j.ledger) setRhLedger(j.ledger); else setRhLedger(drop);
      } catch { setRhLedger(drop); }
    } else {
      clearRh(devKey, year);
      setRhLedger(drop);
    }
  }, []);

  // Bulk replace the whole ledger (admin JSON import). Server-authoritative when
  // configured (passkey-gated PUT /rh), else writes the local ledger.
  const replaceRhLedger = useCallback(async (ledger) => {
    if (CONFIG_API) {
      const res = await fetch(`${CONFIG_API}/rh`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Passkey": keyRef.current || "" },
        body: JSON.stringify(ledger),
      });
      if (res.status === 404) { saveLedger(ledger); setRhLedger(ledger); return; } // worker without /rh — local
      if (!res.ok) throw new Error(res.status === 401 ? "Server rejected the passkey." : `Import failed (${res.status}).`);
      const j = await res.json().catch(() => ({}));
      setRhLedger(j.ledger || ledger);
    } else {
      saveLedger(ledger);
      setRhLedger(ledger);
    }
  }, []);

  // With a server, recording an RH is a write and needs the passkey; local-only stays open.
  const rhWritable = CONFIG_API ? unlocked : true;

  // The real gate: persisting the shared config requires the passkey, verified server-side.
  const publishConfig = useCallback(async () => {
    if (!CONFIG_API) throw new Error("No server configured.");
    const res = await fetch(`${CONFIG_API}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Passkey": keyRef.current || "" },
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
      unlocked, unlock, lock,
      rhUsage, claimRh, releaseRh, rhWritable, rhLedger, replaceRhLedger,
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
