import { Tip } from "./Tip.jsx";

export function MetricSection({ icon, title, weightLabel, tipText, hasInputs, children }) {
  return (
    <section className="metric">
      <div className={`metric__header${!hasInputs ? " metric__header--no-inputs" : ""}`}>
        <span className="metric__icon" aria-hidden="true">{icon}</span>
        <div className="metric__title-group">
          <span className="metric__title">{title}</span>
          <span className="metric__weight">{weightLabel}</span>
        </div>
        {tipText && <Tip text={tipText} />}
      </div>
      {children}
    </section>
  );
}
