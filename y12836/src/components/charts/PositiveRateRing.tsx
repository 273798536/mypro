interface PositiveRateRingProps {
  rate: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
}

export default function PositiveRateRing({
  rate,
  size = 120,
  strokeWidth = 10,
  showLabel = true,
  label,
}: PositiveRateRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;

  const getColor = (r: number) => {
    if (r >= 50) return '#2da289';
    if (r >= 20) return '#3571a1';
    if (r >= 5) return '#ee913a';
    return '#64748b';
  };

  const color = getColor(rate);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease',
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="stat-number text-2xl"
            style={{ color }}
          >
            {rate.toFixed(1)}%
          </span>
          {label && <span className="text-xs text-slate-500 mt-0.5">{label}</span>}
        </div>
      )}
    </div>
  );
}
