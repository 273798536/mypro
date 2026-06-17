import type { VersionTrendPoint } from "@/store/selectors";

// 版本趋势：跨版本折线，可切换指标
const METRICS = {
  refusalRate: { label: "拒答率", color: "#3fba78", fmt: (v: number) => `${Math.round(v * 100)}%` },
  boundaryCount: { label: "边界样本", color: "#f5a524", fmt: (v: number) => `${v}` },
  correctionRate: { label: "修正率", color: "#60a5fa", fmt: (v: number) => `${Math.round(v * 100)}%` },
  leakageCount: { label: "泄漏样本", color: "#f43f5e", fmt: (v: number) => `${v}` },
} as const;

export type TrendMetric = keyof typeof METRICS;

export function MiniTrend({
  points,
  metric,
}: {
  points: VersionTrendPoint[];
  metric: TrendMetric;
}) {
  const m = METRICS[metric];
  const W = 520;
  const H = 150;
  const padX = 36;
  const padY = 20;

  const values = points.map((p) => p[metric]);
  const max = metric === "refusalRate" || metric === "correctionRate" ? 1 : Math.max(1, ...values);
  const min = 0;

  const xStep = points.length > 1 ? (W - padX * 2) / (points.length - 1) : 0;
  const yFor = (v: number) => H - padY - ((v - min) / (max - min || 1)) * (H - padY * 2);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${padX + i * xStep} ${yFor(p[metric])}`)
    .join(" ");
  const area = `${path} L ${padX + (points.length - 1) * xStep} ${H - padY} L ${padX} ${H - padY} Z`;

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
        <span className="eyebrow !text-muted">{m.label} · 跨版本趋势</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={m.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={m.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={padX}
            x2={W - padX}
            y1={padY + g * (H - padY * 2)}
            y2={padY + g * (H - padY * 2)}
            stroke="#2c2620"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}
        <path d={area} fill={`url(#grad-${metric})`} />
        <path d={path} fill="none" stroke={m.color} strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.versionId}>
            <circle
              cx={padX + i * xStep}
              cy={yFor(p[metric])}
              r="3.5"
              fill="#0f0d0b"
              stroke={m.color}
              strokeWidth="2"
            />
            <text
              x={padX + i * xStep}
              y={yFor(p[metric]) - 10}
              textAnchor="middle"
              className="fill-cream font-mono"
              fontSize="11"
            >
              {m.fmt(p[metric])}
            </text>
            <text
              x={padX + i * xStep}
              y={H - 4}
              textAnchor="middle"
              className="fill-faint font-mono"
              fontSize="10"
            >
              {p.versionId}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
