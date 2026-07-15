import { useState, useRef } from "react";
import { useConfig } from "../configStore.jsx";
import {
  exportCompanyHolidays, importCompanyHolidays,
  exportRestrictedPool, importRestrictedPool,
  exportDeveloperUsage, importDeveloperUsage,
} from "../bulkIO.js";

function download(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// One import/export row for a dataset. `onImport` may be async (server writes).
function IoRow({ title, desc, count, unlocked, onExport, onImport, setStatus }) {
  const fileRef = useRef(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        await onImport(JSON.parse(evt.target.result));
        setStatus({ type: "ok", msg: `${title}: imported.` });
      } catch (err) {
        setStatus({ type: "err", msg: `${title}: ${err.message}` });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  return (
    <div className="bulk-io__row">
      <div className="bulk-io__row-info">
        <div className="bulk-io__row-title">{title} <span className="bulk-io__row-count">{count}</span></div>
        <div className="bulk-io__row-desc">{desc}</div>
      </div>
      <div className="bulk-io__row-actions">
        <button className="btn btn--sm" onClick={onExport}>Download</button>
        {unlocked && (
          <>
            <button className="btn btn--sm btn--primary" onClick={() => fileRef.current?.click()}>Upload</button>
            <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleFile} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Bulk JSON import/export for the admin-managed calendar data. Downloading is
 * open; uploading (which replaces the data) is passkey-gated like every other
 * admin write. Uploads replace the whole dataset with the file's contents.
 */
export function BulkIOPanel() {
  const { config, updateKey, unlocked, rhLedger, replaceRhLedger } = useConfig();
  const holidays = config.holidays || [];
  const holidayNames = config.holidayNames || {};
  const pool = config.restrictedHolidayPool || [];
  const [status, setStatus] = useState(null);

  const usageCount = Object.keys(rhLedger || {}).reduce((n, k) => n + Object.keys(rhLedger[k] || {}).length, 0);

  return (
    <section className="card bulk-io" aria-label="Bulk import and export">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Bulk data</div>
          <h2>Import &amp; export</h2>
        </div>
      </div>
      <p className="bulk-io__note">
        Each file is a list of <code>{"{ date, day, name }"}</code>. Uploading <strong>replaces</strong> the whole
        dataset; <code>day</code> is derived from the date.{!unlocked && " Unlock in Evaluation parameters to upload."}
      </p>

      <div className="bulk-io__rows">
        <IoRow
          title="Company holidays" count={holidays.length} unlocked={unlocked} setStatus={setStatus}
          desc="Dates excluded from productive days for everyone (name optional)."
          onExport={() => download(exportCompanyHolidays(holidays, holidayNames), "company-holidays.json")}
          onImport={(json) => {
            const { holidays: h, holidayNames: n } = importCompanyHolidays(json);
            updateKey("holidays", h); updateKey("holidayNames", n);
          }}
        />
        <IoRow
          title="Restricted-holiday pool" count={pool.length} unlocked={unlocked} setStatus={setStatus}
          desc="Named optional holidays a developer may avail one of per year."
          onExport={() => download(exportRestrictedPool(pool), "restricted-holiday-pool.json")}
          onImport={(json) => updateKey("restrictedHolidayPool", importRestrictedPool(json))}
        />
        <IoRow
          title="Developer usage" count={usageCount} unlocked={unlocked} setStatus={setStatus}
          desc="Restricted holiday each developer has used (by employee ID, one per year)."
          onExport={() => download(exportDeveloperUsage(rhLedger || {}), "developer-usage.json")}
          onImport={(json) => replaceRhLedger(importDeveloperUsage(json))}
        />
      </div>

      {status && (
        <div className={status.type === "err" ? "settings-panel__error" : "settings-panel__desc"} role="status">
          {status.msg}
        </div>
      )}
    </section>
  );
}
