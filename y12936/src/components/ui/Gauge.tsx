import { cn } from "@/lib/utils";

export function Gauge({
  value,
  label,
  sub,
  size = 132,
}: {
  value: number;
  label?: string;
  sub?: string;
  size?: number;
}) {
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const circ = Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const tone =
    pct >= 0.9 ? "#bef264" : pct >= 0.75 ? "#fbbf24" : "#fb7185";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 14} className="overflow-visible">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#1a1a1f"
          strokeWidth={9}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={tone}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - r + 2}
          stroke={tone}
          strokeWidth={2}
          strokeLinecap="round"
          transform={`rotate(${-90 + pct * 180} ${cx} ${cy})`}
          style={{ transition: "transform 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
        <circle cx={cx} cy={cy} r={3.5} fill={tone} />
      </svg>
      <div className="-mt-6 flex flex-col items-center">
        <span
          className={cn("num font-mono text-2xl font-semibold")}
          style={{ color: tone }}
        >
          {(pct * 100).toFixed(0)}
          <span className="text-sm text-ink-500">%</span>
        </span>
        {label && <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">{label}</span>}
        {sub && <span className="text-[10px] text-ink-500">{sub}</span>}
      </div>
    </div>
  );
}
