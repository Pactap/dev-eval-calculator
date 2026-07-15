import { useState, useRef } from "react";
import { useConfig } from "../configStore.jsx";

const WEIGHT_KEYS = [
  { key: "ph", label: "Planned Hours" },
  { key: "cq", label: "Code Quality" },
  { key: "eff", label: "Efficiency" },
  { key: "ip", label: "Issue Persist" },
];

const BAND_GROUPS = [
  { key: "plannedHoursBands", label: "Planned Hours bands", hasRange: true, unit: "%" },
  { key: "efficiencyBands", label: "Efficiency bands", hasRange: true, unit: "%" },
  { key: "issuePersistBands", label: "Issue Persist bands", hasRange: true, unit: "%" },
];

function fmtMax(v) {
  if (v === Infinity || v === null || v === undefined) return "";
  return v;
}

function parseMax(str) {
  if (str === "" || str === null) return Infinity;
  const n = parseFloat(str);
  return isNaN(n) ? Infinity : n;
}

export function SettingsPanel() {
  const { config, updateWeights, updateBands, updateOptions, reset, exportJson, importJson } = useConfig();
  const [open, setOpen] = useState(false);
  const [importErr, setImportErr] = useState("");
  const fileInputRef = useRef(null);

  // Sum over the canonical keys (not Object.values) so a missing key is caught
  // rather than silently excluded from the total.
  const weightSum = WEIGHT_KEYS.reduce((a, w) => a + (Number(config.weights[w.key]) || 0), 0);
  const weightSumPct = (weightSum * 100);
  const weightsValid = Math.abs(weightSum - 1) < 0.001;

  const setWeight = (k, v) => {
    const num = parseFloat(v);
    updateWeights({ [k]: isNaN(num) ? 0 : num / 100 });
  };

  const updateBandField = (groupKey, idx, field, value) => {
    const bands = [...config[groupKey]];
    let parsed = value;
    if (field === "min") parsed = value === "" ? 0 : parseFloat(value);
    else if (field === "max") parsed = parseMax(value);
    else if (field === "multiplier") parsed = value === "" ? 0 : parseFloat(value);
    bands[idx] = { ...bands[idx], [field]: parsed };
    updateBands(groupKey, bands);
  };

  const addBand = (groupKey) => {
    const bands = [...config[groupKey]];
    bands.push({ label: "New band", min: 0, max: 0, multiplier: 1.0 });
    updateBands(groupKey, bands);
  };

  const removeBand = (groupKey, idx) => {
    const bands = config[groupKey].filter((_, i) => i !== idx);
    updateBands(groupKey, bands);
  };

  const moveBand = (groupKey, idx, dir) => {
    const bands = [...config[groupKey]];
    const target = idx + dir;
    if (target < 0 || target >= bands.length) return;
    [bands[idx], bands[target]] = [bands[target], bands[idx]];
    updateBands(groupKey, bands);
  };

  const updateCqField = (idx, field, value) => {
    const opts = [...config.codeQualityOptions];
    let parsed = value;
    if (field === "multiplier") parsed = value === "" ? 0 : parseFloat(value);
    opts[idx] = { ...opts[idx], [field]: parsed };
    updateOptions("codeQualityOptions", opts);
  };

  const addCq = () => {
    const opts = [...config.codeQualityOptions, { label: "New grade", multiplier: 1.0 }];
    updateOptions("codeQualityOptions", opts);
  };

  const removeCq = (idx) => {
    const opts = config.codeQualityOptions.filter((_, i) => i !== idx);
    updateOptions("codeQualityOptions", opts);
  };

  const moveCq = (idx, dir) => {
    const opts = [...config.codeQualityOptions];
    const target = idx + dir;
    if (target < 0 || target >= opts.length) return;
    [opts[idx], opts[target]] = [opts[target], opts[idx]];
    updateOptions("codeQualityOptions", opts);
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
          <button className="btn btn--sm" onClick={() => setOpen(o => !o)}>
            {open ? "Collapse" : "Configure"}
          </button>
        </div>
      </div>

      {open && (
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

          <div className="settings-panel__section">
            <h3>Code Quality grades</h3>
            <div className="settings-panel__table-wrap">
              <table className="settings-panel__table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Multiplier</th>
                    <th>Order</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {config.codeQualityOptions.map((opt, idx) => (
                    <tr key={idx}>
                      <td><input className="input" value={opt.label}
                        onChange={e => updateCqField(idx, "label", e.target.value)} /></td>
                      <td><input className="input" type="number" step="0.01" value={opt.multiplier}
                        onChange={e => updateCqField(idx, "multiplier", e.target.value)} /></td>
                      <td className="settings-panel__order-cell">
                        <button className="btn btn--xs" disabled={idx === 0} onClick={() => moveCq(idx, -1)}>↑</button>
                        <button className="btn btn--xs" disabled={idx === config.codeQualityOptions.length - 1} onClick={() => moveCq(idx, 1)}>↓</button>
                      </td>
                      <td><button className="btn btn--xs btn--danger" disabled={config.codeQualityOptions.length <= 1} onClick={() => removeCq(idx)}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn--sm" onClick={addCq}>+ Add grade</button>
          </div>

          {BAND_GROUPS.map(group => (
            <div key={group.key} className="settings-panel__section">
              <h3>{group.label}</h3>
              <div className="settings-panel__table-wrap">
                <table className="settings-panel__table">
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Min {group.unit}</th>
                      <th>Max {group.unit} <span className="settings-panel__hint">(blank = ∞)</span></th>
                      <th>Multiplier</th>
                      <th>Order</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {config[group.key].map((band, idx) => (
                      <tr key={idx}>
                        <td><input className="input" value={band.label}
                          onChange={e => updateBandField(group.key, idx, "label", e.target.value)} /></td>
                        <td><input className="input" type="number" step="0.01" value={band.min}
                          onChange={e => updateBandField(group.key, idx, "min", e.target.value)} /></td>
                        <td><input className="input" type="number" step="0.01"
                          value={fmtMax(band.max)} placeholder="∞"
                          onChange={e => updateBandField(group.key, idx, "max", e.target.value)} /></td>
                        <td><input className="input" type="number" step="0.01" value={band.multiplier}
                          onChange={e => updateBandField(group.key, idx, "multiplier", e.target.value)} /></td>
                        <td className="settings-panel__order-cell">
                          <button className="btn btn--xs" disabled={idx === 0} onClick={() => moveBand(group.key, idx, -1)}>↑</button>
                          <button className="btn btn--xs" disabled={idx === config[group.key].length - 1} onClick={() => moveBand(group.key, idx, 1)}>↓</button>
                        </td>
                        <td><button className="btn btn--xs btn--danger" disabled={config[group.key].length <= 1} onClick={() => removeBand(group.key, idx)}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn--sm" onClick={() => addBand(group.key)}>+ Add band</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
