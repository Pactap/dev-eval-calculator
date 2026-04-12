import { Tip } from "./Tip";

export function MetricSection({ icon, title, weightLabel, tipText, hasInputs, children, resultDisplay }) {
  return (
    <div className="metric">
      <div className={`metric__header${!hasInputs ? " metric__header--no-inputs" : ""}`}>
        <span className="metric__icon">{icon}</span>
        <span className="metric__title">{title}</span>
        <span className="metric__weight">{weightLabel}</span>
        {tipText && <Tip text={tipText} />}
      </div>
      {children}
      {resultDisplay}
    </div>
  );
}
