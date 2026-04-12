export function Pill({ value }) {
  const tier = value >= 1.0 ? "positive" : value >= 0.5 ? "neutral" : "negative";
  return (
    <span className={`pill pill--${tier}`}>
      {value >= 0 ? "+" : ""}{(value * 100).toFixed(0)}%
    </span>
  );
}
