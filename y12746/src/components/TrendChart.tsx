import { useVolumeStore } from "@/store/useVolumeStore";

export default function TrendChart() {
  const { batches, currentBatchId, setCurrentBatchId } = useVolumeStore();

  const data = batches.map((b) => ({
    id: b.id,
    label: b.name.match(/\d+月/)?.[0] ?? b.id,
    volume: b.totalApproxVolume ?? 0,
  }));

  const maxVol = Math.max(...data.map((d) => d.volume), 1);
  const width = 480;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 28, left: 52 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2),
    y: padding.top + innerH - (d.volume / maxVol) * innerH,
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const yTicks = 4;

  return (
    <div className="bg-white/80 backdrop-blur rounded-lg border border-ink-100 shadow-card p-5 animate-fadeUp" style={{ animationDelay: "120ms" }}>
      <h3 className="serif text-base font-semibold text-ink-800 mb-3">近批次体积趋势</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = padding.top + (i / yTicks) * innerH;
          const val = Math.round(maxVol - (i / yTicks) * maxVol);
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#E3EAF3" strokeDasharray="3 3" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-ink-400" fontSize="10" fontFamily="JetBrains Mono">
                {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}
        <path d={pathD} fill="none" stroke="#98B1CC" strokeWidth="2" strokeDasharray="4 4" />
        {points.map((p, i) => {
          const isCurrent = p.id === currentBatchId;
          return (
            <g key={p.id} className="cursor-pointer" onClick={() => setCurrentBatchId(p.id)}>
              {isCurrent && (
                <circle cx={p.x} cy={p.y} r="10" fill="#D4A24C" fillOpacity="0.15" />
              )}
              <circle
                cx={p.x} cy={p.y}
                r={isCurrent ? 6 : 4}
                fill={isCurrent ? "#D4A24C" : "#6386AD"}
                stroke="#fff" strokeWidth="2"
              />
              <text x={p.x} y={height - padding.bottom + 16} textAnchor="middle" className="fill-ink-500" fontSize="11" fontFamily="Noto Serif SC">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="serif text-xs text-ink-400 mt-2">点击圆点可切换批次查看约束校验差别</p>
    </div>
  );
}
