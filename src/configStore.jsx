import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_CONFIG } from "./constants.js";
import { validateConfig } from "./configValidation.js";
import { loadLedger, saveLedger, recordRh, clearRh } from "./restrictedHolidays.js";
import { useNotify } from "./notify.jsx";

const STORAGE_KEY = "devEvalConfig.v1";
// Optional backend (Cloudflare Worker). Set VITE_CONFIG_API to enable the shared,
// server-enforced config; unset -> the app runs local-only, per browser.
const CONFIG_API = (import.meta.env.VITE_CONFIG_API || "").replace(/\/$/, "");
const ConfigContext = createContext(null);

// Passkey gate for editing every evaluation parameter (weights, bands, grades,
// AND holidays). Only the SHA-256 hash of the key ships; the raw key is held in
// memory (this page load) to authorize a server publish.
const PASS_HASH = "12877a7977da00b5fd066e7dfec573873ff3be9b67a4a0b067807fe25e78c45e";
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
  const notify = useNotify();
  const [config, setConfig] = useState(loadConfig);
  const [unlocked, setUnlocked] = useState(false); // editing gate; re-auth each page load
  const keyRef = useRef("");
  const dirtyRef = useRef(false);                   // true once the admin edits (vs. server hydration)
  const [configSync, setConfigSync] = useState("idle"); // idle | saving | saved | error (server mode)

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
  // gate the import path uses). If the admin has already started editing (dirtyRef),
  // never clobber those edits with the server copy.
  useEffect(() => {
    if (!CONFIG_API) return;
    let cancelled = false;
    fetch(`${CONFIG_API}/config`)
      .then(r => (r.ok ? r.json() : null))
      .then(remote => {
        if (cancelled || dirtyRef.current) return;
        if (remote) {
          try { validateConfig(remote); setConfig(reviveConfig(remote)); } catch { /* keep local */ }
        } else if (localStorage.getItem(STORAGE_KEY)) {
          // Server has no config yet but this browser has one -> it's the real data.
          // Mark dirty so the auto-save effect seeds the server once the admin unlocks.
          dirtyRef.current = true;
        }
      })
      .catch(() => { // offline -> keep local, but let the user know why edits stay local
        if (!cancelled) notify.info("Working offline — using this browser's saved configuration.");
      });
    return () => { cancelled = true; };
  }, []);

  // Auto-save: after any admin edit (dirtyRef), debounce ~1s then persist to the
  // server. Passkey-gated, so it only fires while unlocked. On failure it keeps the
  // local copy and surfaces "offline"; the next edit (or unlock) retries.
  useEffect(() => {
    if (!CONFIG_API || !unlocked || !dirtyRef.current) return;
    setConfigSync("saving");
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${CONFIG_API}/config`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Passkey": keyRef.current || "" },
          body: serializeConfig(config),
        });
        if (!res.ok) throw new Error(String(res.status));
        if (!cancelled) setConfigSync("saved");
      } catch {
        if (!cancelled) setConfigSync("error");
      }
    }, 1000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [config, unlocked]);

  // Restricted-holiday quota ledger. With a server, it is authoritative across
  // machines (the Worker enforces one-per-dev-per-year); without one, it is the
  // per-browser localStorage ledger. Held in memory so reads stay synchronous.
  const [rhLedger, setRhLedger] = useState(() => (CONFIG_API ? {} : loadLedger()));

  // The server ledger holds employee IDs + usage, so its GET is passkey-gated:
  // load it once unlocked (with the key), and drop it from memory on lock.
  // Stranded-data recovery: if the server ledger is empty but this browser has a
  // local ledger (e.g. recorded before the Worker had /rh), push the local copy up
  // once so it isn't lost.
  useEffect(() => {
    if (!CONFIG_API) return;
    if (!unlocked) { setRhLedger({}); return; }
    let cancelled = false;
    (async () => {
      let server = null;
      try {
        const res = await fetch(`${CONFIG_API}/rh`, { headers: { "X-Passkey": keyRef.current || "" } });
        if (res.ok) server = (await res.json()).ledger || null;
      } catch {
        if (!cancelled) notify.warning("Couldn't reach the server for the restricted-holiday ledger — using the local copy.");
      }
      if (cancelled) return;
      const local = loadLedger();
      if (server && Object.keys(server).length) {
        setRhLedger(server);
      } else if (Object.keys(local).length) {
        try {
          await fetch(`${CONFIG_API}/rh`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-Passkey": keyRef.current || "" },
            body: JSON.stringify(local),
          });
        } catch { /* keep local; retries next unlock */ }
        if (!cancelled) setRhLedger(local);
      } else {
        setRhLedger(server || {});
      }
    })();
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

  // Every admin edit marks the config dirty so the auto-save effect persists it.
  const reset = useCallback(() => { dirtyRef.current = true; setConfig(DEFAULT_CONFIG); }, []);

  const updateWeights = useCallback((weights) => {
    dirtyRef.current = true;
    setConfig(c => ({ ...c, weights: { ...c.weights, ...weights } }));
  }, []);

  const updateKey = useCallback((key, value) => {
    dirtyRef.current = true;
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
    dirtyRef.current = true;
    setConfig(reviveConfig(parsed));
  }, []);

  return (
    <ConfigContext.Provider value={{
      config, reset,
      updateWeights, updateKey,
      exportJson, importJson,
      configApiEnabled: !!CONFIG_API, configSync,
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
