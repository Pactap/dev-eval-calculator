import { useState, useRef } from "react";
import { useConfig } from "../configStore.jsx";

const WEIGHT_KEYS = [
  { key: "ph", label: "Planned Hours" },
  { key: "cq", label: "Code Quality" },
  { key: "eff", label: "Efficiency" },
  { key: "ip", label: "Issue Persist" },
];

const BAND_GROUPS = [
  { key: "plannedHoursBands", label: "Planned Hours bands" },
  { key: "efficiencyBands", label: "Efficiency bands" },
  { key: "issuePersistBands", label: "Issue Persist bands" },
];

const num = (v) => (v === "" ? 0 : parseFloat(v));

// Editing the scoring rules is gated by a passkey. Only the SHA-256 hash ships,
// so the plaintext key isn't in the bundle. NOTE: this is a client-side gate on a
// static site — it hides the key and deters casual edits, it is NOT real access
// control (a determined user can bypass it via devtools/localStorage). Real
// enforcement needs a backend.
const PASS_HASH = "49efb886446cb7b6b3018bff28018333edf402f4cdf2b4074deda5cbe82a54f4";
const UNLOCK_KEY = "pec.settingsUnlocked";

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function fmtMax(v) {
  if (v === Infinity || v === null || v === undefined) return "";
  return v;
}

function parseMax(str) {
  if (str === "" || str === null) return Infinity;
  const n = parseFloat(str);
  return isNaN(n) ? Infinity : n;
}

// One editable table for a list of {label, ...} rows — shared by the code-quality
// grades and every band group (add/remove/reorder/inline-edit).
function ListEditor({ title, addLabel, items, columns, newItem, onChange }) {
  const patch = (i, key, val) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: val } : it)));
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="settings-panel__section">
      <h3>{title}</h3>
      <div className="settings-panel__table-wrap">
        <table className="settings-panel__table">
          <thead>
            <tr>
              {columns.map(c => <th key={c.key}>{c.head}</th>)}
              <th>Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                {columns.map(c => (
                  <td key={c.key}>
                    <input
                      className="input"
                      type={c.type || "text"}
                      step={c.type === "number" ? "0.01" : undefined}
                      placeholder={c.placeholder}
                      value={c.format ? c.format(it[c.key]) : it[c.key]}
                      onChange={e => patch(i, c.key, c.parse ? c.parse(e.target.value) : e.target.value)}
                    />
                  </td>
                ))}
                <td className="settings-panel__order-cell">
                  <button className="btn btn--xs" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button className="btn btn--xs" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                </td>
                <td><button className="btn btn--xs btn--danger" disabled={items.length <= 1} onClick={() => remove(i)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn--sm" onClick={() => onChange([...items, newItem()])}>{addLabel}</button>
    </div>
  );
}

export function SettingsPanel() {
  const { config, updateWeights, updateKey, reset, exportJson, importJson } = useConfig();
  const [open, setOpen] = useState(false);
  const [importErr, setImportErr] = useState("");
  const fileInputRef = useRef(null);

  // Passkey gate for editing (persists for the browser session once unlocked).
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(UNLOCK_KEY) === "1"; } catch { return false; }
  });
  const [prompting, setPrompting] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");

  const submitKey = async (e) => {
    e.preventDefault();
    if (await sha256(keyInput) === PASS_HASH) {
      setUnlocked(true);
      try { sessionStorage.setItem(UNLOCK_KEY, "1"); } catch {}
      setOpen(true);
      setPrompting(false);
      setKeyInput("");
      setKeyError("");
    } else {
      setKeyError("Incorrect passkey.");
    }
  };

  const lock = () => {
    setUnlocked(false);
    setOpen(false);
    try { sessionStorage.removeItem(UNLOCK_KEY); } catch {}
  };

  // Sum over the canonical keys (not Object.values) so a missing key is caught
  // rather than silently excluded from the total.
  const weightSum = WEIGHT_KEYS.reduce((a, w) => a + (Number(config.weights[w.key]) || 0), 0);
  const weightSumPct = (weightSum * 100);
  const weightsValid = Math.abs(weightSum - 1) < 0.001;

  const setWeight = (k, v) => {
    const n = parseFloat(v);
    updateWeights({ [k]: isNaN(n) ? 0 : n / 100 });
  };

  const doExport = () => {
    const json = exportJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dev-eval-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        importJson(evt.target.result);
        setImportErr("");
      } catch (err) {
        setImportErr(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const doReset = () => {
    if (window.confirm("Reset all scoring rules to defaults? This clears your customizations.")) {
      reset();
    }
  };

  return (
    <section className="card settings-panel" aria-label="Scoring rules">
      <div className="settings-panel__header">
        <div>
          <div className="eyebrow">Scoring rules</div>
          <h2>Evaluation parameters</h2>
          <p className="settings-panel__desc">
            Weights: PH {(config.weights.ph * 100).toFixed(0)}% ·
            CQ {(config.weights.cq * 100).toFixed(0)}% ·
            EF {(config.weights.eff * 100).toFixed(0)}% ·
            IP {(config.weights.ip * 100).toFixed(0)}%
            {!weightsValid && <span className="settings-panel__warn"> (sum {weightSumPct.toFixed(0)}% ≠ 100%)</span>}
          </p>
        </div>
        <div className="settings-panel__actions">
          {unlocked ? (
            <>
              <button className="btn btn--sm" onClick={() => setOpen(o => !o)}>
                {open ? "Collapse" : "Configure"}
              </button>
              <button className="btn btn--sm" onClick={lock} title="Lock editing">Lock</button>
            </>
          ) : (
            <button className="btn btn--sm" onClick={() => { setPrompting(p => !p); setKeyError(""); }}>
              Configure
            </button>
          )}
        </div>
      </div>

      {!unlocked && prompting && (
        <form className="settings-panel__unlock" onSubmit={submitKey}>
          <span className="settings-panel__unlock-label">Passkey required to edit evaluation parameters</span>
          <div className="settings-panel__unlock-row">
            <input
              type="password"
              className="input"
              value={keyInput}
              autoFocus
              autoComplete="off"
              placeholder="Enter passkey"
              onChange={e => { setKeyInput(e.target.value); setKeyError(""); }}
            />
            <button className="btn btn--sm btn--primary" type="submit">Unlock</button>
          </div>
          {keyError && <span className="settings-panel__warn">{keyError}</span>}
        </form>
      )}

      {open && unlocked && (
        <div className="settings-panel__body">
          <div className="settings-panel__toolbar">
            <button className="btn btn--sm" onClick={doExport}>Export JSON</button>
            <button className="btn btn--sm" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
            <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={doImport} />
            <button className="btn btn--sm btn--danger" onClick={doReset}>Reset defaults</button>
          </div>
          {importErr && <div className="settings-panel__error">{importErr}</div>}

          <div className="settings-panel__section">
            <h3>Weights (must sum to 100%)</h3>
            <div className="settings-panel__weights">
              {WEIGHT_KEYS.map(w => (
                <label key={w.key} className="settings-panel__weight-field">
                  <span className="label">{w.label}</span>
                  <input type="number" min="0" max="100" step="1"
                    value={(config.weights[w.key] * 100).toFixed(0)}
                    onChange={e => setWeight(w.key, e.target.value)}
                    className="input" />
                  <span className="settings-panel__unit">%</span>
                </label>
              ))}
              <div className={`settings-panel__sum${weightsValid ? " settings-panel__sum--ok" : " settings-panel__sum--bad"}`}>
                Sum: {weightSumPct.toFixed(0)}%
              </div>
            </div>
          </div>

          <ListEditor
            title="Code Quality grades" addLabel="+ Add grade"
            items={config.codeQualityOptions}
            onChange={items => updateKey("codeQualityOptions", items)}
            newItem={() => ({ label: "New grade", multiplier: 1.0 })}
            columns={[
              { key: "label", head: "Label" },
              { key: "multiplier", head: "Multiplier", type: "number", parse: num },
            ]}
          />

          {BAND_GROUPS.map(group => (
            <ListEditor
              key={group.key}
              title={group.label} addLabel="+ Add band"
              items={config[group.key]}
              onChange={items => updateKey(group.key, items)}
              newItem={() => ({ label: "New band", min: 0, max: 0, multiplier: 1.0 })}
              columns={[
                { key: "label", head: "Label" },
                { key: "min", head: "Min %", type: "number", parse: num },
                { key: "max", head: <>Max % <span className="settings-panel__hint">(blank = ∞)</span></>, type: "number", parse: parseMax, format: fmtMax, placeholder: "∞" },
                { key: "multiplier", head: "Multiplier", type: "number", parse: num },
              ]}
            />
          ))}
        </div>
      )}
    </section>
  );
}
