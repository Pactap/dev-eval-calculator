export function Pill({ value }) {
  const tier = value >= 1.0 ? "positive" : value >= 0.5 ? "neutral" : "negative";
  const pct = (value * 100).toFixed(0);
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`pill pill--${tier}`}>
      {sign}{pct}%
    </span>
  );
}
