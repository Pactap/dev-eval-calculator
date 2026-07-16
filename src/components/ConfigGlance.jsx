import { useConfig } from "../configStore.jsx";

/**
 * Compact, always-on read-only reflection of the active scoring rules and
 * calendar counts, so the workspace stays agile even though management lives in
 * the Admin tab. Updates live as the config changes.
 */
export function ConfigGlance() {
  const { config } = useConfig();
  const w = config.weights || {};
  const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`;
  const items = [
    ["Planned Hours", pct(w.ph)],
    ["Code Quality", pct(w.cq)],
    ["Efficiency", pct(w.eff)],
    ["Issue Persist", pct(w.ip)],
    ["Company holidays", `${(config.holidays || []).length}`],
    ["Restricted days", `${(config.restrictedHolidayPool || []).length}`],
  ];
  return (
    <section className="card config-glance" aria-label="Active configuration">
      <div className="config-glance__label">Active rules</div>
      <div className="config-glance__items">
        {items.map(([k, v]) => (
          <div key={k} className="config-glance__item">
            <span className="config-glance__k">{k}</span>
            <strong className="config-glance__v">{v}</strong>
          </div>
        ))}
      </div>
      <span className="config-glance__hint">Managed in Admin · live</span>
    </section>
  );
}
