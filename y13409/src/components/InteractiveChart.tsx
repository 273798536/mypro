import { useMemo, useState } from "react";
import { useSamplingStore } from "@/store/useSamplingStore";
import { cn } from "@/lib/utils";

interface HoverState {
  index: number;
  x: number;
  y: number;
}

export default function InteractiveChart() {
  const points = useSamplingStore((s) => s.chartPoints);
  const highlightedIdx = useSamplingStore((s) => s.highlightedPointIndex);
  const setHighlightedIdx = useSamplingStore((s) => s.setHighlightedPointIndex);
  const scrollToSample = useSamplingStore((s) => s.scrollToSample);
  const [hover, setHover] = useState<HoverState | null>(null);

  const { width, height, padding, xScale, yScale, pathD, areaD } = useMemo(() => {
    const width = 560;
    const height = 280;
    const padding = { top: 24, right: 24, bottom: 36, left: 44 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys) * 0.85;
    const yMax = Math.max(...ys) * 1.08;

    const xScale = (v: number) => padding.left + ((v - xMin) / (xMax - xMin)) * innerW;
    const yScale = (v: number) => padding.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

    const pathD = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x)} ${yScale(p.y)}`)
      .join(" ");

    const areaD =
      pathD +
      ` L ${xScale(xMax)} ${padding.top + innerH} L ${xScale(xMin)} ${padding.top + innerH} Z`;

    const yTicks = 4;
    void yTicks;

    return { width, height, padding, xScale, yScale, pathD, areaD };
  }, [points]);

  const yTicksVals = useMemo(() => {
    const ys = points.map((p) => p.y);
    const yMin = Math.min(...ys) * 0.85;
    const yMax = Math.max(...ys) * 1.08;
    return Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) / 4) * i);
  }, [points]);

  return (
    <section className="bg-white rounded-xl shadow-card overflow-hidden animate-fadeUp">
      <div className="px-5 py-4 border-b border-ink-100">
        <h3 className="font-display text-lg font-semibold text-ink-900">抽样分布曲线</h3>
        <p className="text-xs font-mono text-ink-500 mt-0.5">
          点击曲线上的点可跳转到对应原始记录，异常点以琥珀色标记
        </p>
      </div>

      <div className="p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {yTicksVals.map((v, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={yScale(v)}
                y2={yScale(v)}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 6}
                y={yScale(v) + 3}
                textAnchor="end"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fill="#94a3b8"
              >
                {Math.round(v)}
              </text>
            </g>
          ))}

          <path d={areaD} fill="url(#areaGrad)" />
          <path
            d={pathD}
            fill="none"
            stroke="#1e3a5f"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, i) => {
            const isOutlier = p.isOutlier;
            const isHighlighted = highlightedIdx === i;
            const cx = xScale(p.x);
            const cy = yScale(p.y);
            return (
              <g key={i}>
                {isHighlighted && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="16"
                    fill="none"
                    stroke={isOutlier ? "#d97706" : "#0d9488"}
                    strokeWidth="2"
                    className="animate-pulseHighlight"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHighlighted ? 7 : isOutlier ? 6 : 4}
                  fill={isOutlier ? "#d97706" : "#1e3a5f"}
                  stroke="#fff"
                  strokeWidth="2"
                  filter={isHighlighted ? "url(#glow)" : undefined}
                  className={cn("cursor-pointer transition-all")}
                  onMouseEnter={() => setHover({ index: i, x: cx, y: cy })}
                  onClick={() => {
                    setHighlightedIdx(i);
                    if (p.sampleId) scrollToSample(p.sampleId);
                  }}
                />
              </g>
            );
          })}

          {hover && (
            <g>
              <rect
                x={Math.min(hover.x + 8, width - 140)}
                y={Math.max(hover.y - 46, 0)}
                width="132"
                height="40"
                rx="4"
                fill="#0f172a"
                opacity="0.92"
              />
              <text
                x={Math.min(hover.x + 8, width - 140) + 8}
                y={Math.max(hover.y - 46, 0) + 16}
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fill="#fff"
              >
                {points[hover.index].label.slice(0, 12)}
              </text>
              <text
                x={Math.min(hover.x + 8, width - 140) + 8}
                y={Math.max(hover.y - 46, 0) + 32}
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fill={points[hover.index].isOutlier ? "#fbbf24" : "#5eead4"}
              >
                value = {points[hover.index].y.toLocaleString()}
                {points[hover.index].isOutlier && " · 异常点"}
              </text>
            </g>
          )}
        </svg>

        <div className="flex items-center gap-4 mt-2 pt-3 border-t border-ink-100">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-ink-500">
            <span className="w-3 h-3 rounded-full bg-slate-deep inline-block"></span>
            正常数据点
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-ink-500">
            <span className="w-3 h-3 rounded-full bg-amber-warm inline-block"></span>
            异常点（可点击回溯）
          </div>
        </div>
      </div>
    </section>
  );
}
