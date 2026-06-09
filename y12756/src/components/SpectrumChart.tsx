import { useMemo, useState } from "react";
import type { SpectrumPoint } from "@/types";

interface Props {
  data: SpectrumPoint[];
  title?: string;
  highlightLambda?: number;
}

export const SpectrumChart = ({ data, title, highlightLambda }: Props) => {
  type ChartPt = SpectrumPoint & { x: number; y: number };
  const [hover, setHover] = useState<ChartPt | null>(null);
  const [mouseX, setMouseX] = useState<number>(-1);

  const W = 720;
  const H = 320;
  const paddingL = 56;
  const paddingR = 24;
  const paddingT = 32;
  const paddingB = 48;

  const { minL, maxL, minA, maxA, path, areaPath, points } = useMemo(() => {
    const lambdas = data.map((p) => p.wavelength);
    const absorptions = data.map((p) => p.absorbance);
    const minL = Math.min(...lambdas);
    const maxL = Math.max(...lambdas);
    const minA = 0;
    const maxA = Math.max(...absorptions, 0.2) * 1.1;

    const sx = (l: number) =>
      paddingL + ((l - minL) / (maxL - minL)) * (W - paddingL - paddingR);
    const sy = (a: number) =>
      paddingT + (1 - (a - minA) / (maxA - minA)) * (H - paddingT - paddingB);

    const pts: ChartPt[] = data.map((p) => ({
      ...p,
      x: sx(p.wavelength),
      y: sy(p.absorbance),
    }));
    const path = pts
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(" ");
    const areaPath =
      path +
      ` L ${sx(maxL)} ${sy(minA)} L ${sx(minL)} ${sy(minA)} Z`;

    return { minL, maxL, minA, maxA, path, areaPath, points: pts };
  }, [data]);

  const xTicks = useMemo(() => {
    const ticks = [];
    const step = 50;
    for (let l = Math.ceil(minL / step) * step; l <= maxL; l += step) {
      ticks.push(l);
    }
    return ticks;
  }, [minL, maxL]);

  const yTicks = useMemo(() => {
    const ticks = [];
    const step = Math.ceil((maxA - minA) / 5 * 100) / 100;
    for (let a = minA; a <= maxA + 0.001; a += step) {
      ticks.push(Number(a.toFixed(2)));
    }
    return ticks;
  }, [minA, maxA]);

  const sx = (l: number) =>
    paddingL + ((l - minL) / (maxL - minL)) * (W - paddingL - paddingR);
  const sy = (a: number) =>
    paddingT + (1 - (a - minA) / (maxA - minA)) * (H - paddingT - paddingB);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const scaleX = W / rect.width;
    const px = (e.clientX - rect.left) * scaleX;
    setMouseX(px);
    const nearest = points.reduce((prev, curr) =>
      Math.abs(curr.x - px) < Math.abs(prev.x - px) ? curr : prev
    );
    if (Math.abs(nearest.x - px) < 14) setHover(nearest);
    else setHover(null);
  };

  const highlightPt = highlightLambda
    ? points.find((p) => p.wavelength === highlightLambda)
    : null;

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="panel-title">{title || "紫外-可见吸收光谱"}</h3>
        <div className="flex items-center gap-3 text-xs text-ink-500 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm bg-copper-500/70" />
            吸收曲线
          </span>
          {data.some((d) => d.isAnomaly) && (
            <span className="flex items-center gap-1.5 text-red-600">
              <span className="relative h-2 w-2">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-500/40" />
                <span className="absolute inset-0 rounded-full bg-red-500" />
              </span>
              异常点
            </span>
          )}
        </div>
      </div>
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[320px]"
          onMouseMove={onMove}
          onMouseLeave={() => {
            setHover(null);
            setMouseX(-1);
          }}
        >
          <defs>
            <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((t) => (
            <g key={`yt-${t}`}>
              <line
                x1={paddingL}
                x2={W - paddingR}
                y1={sy(t)}
                y2={sy(t)}
                stroke="#e2e8f0"
                strokeDasharray="2 3"
              />
              <text
                x={paddingL - 8}
                y={sy(t) + 4}
                textAnchor="end"
                className="fill-ink-400"
                style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
              >
                {t.toFixed(2)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={`xt-${t}`}>
              <line
                x1={sx(t)}
                x2={sx(t)}
                y1={paddingT}
                y2={H - paddingB}
                stroke="#f1f5f9"
              />
              <text
                x={sx(t)}
                y={H - paddingB + 18}
                textAnchor="middle"
                className="fill-ink-400"
                style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
              >
                {t}
              </text>
            </g>
          ))}

          <line
            x1={paddingL}
            x2={paddingL}
            y1={paddingT}
            y2={H - paddingB}
            stroke="#cbd5e1"
          />
          <line
            x1={paddingL}
            x2={W - paddingR}
            y1={H - paddingB}
            y2={H - paddingB}
            stroke="#cbd5e1"
          />

          <text
            x={paddingL - 42}
            y={paddingT - 12}
            className="fill-ink-600 font-serif"
            style={{ fontSize: 11 }}
          >
            吸光度 A
          </text>
          <text
            x={W - paddingR}
            y={H - 10}
            textAnchor="end"
            className="fill-ink-600 font-serif"
            style={{ fontSize: 11 }}
          >
            波长 λ (nm)
          </text>

          <path d={areaPath} fill="url(#areaFill)" />
          <path
            d={path}
            fill="none"
            stroke="#d97706"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points
            .filter((p) => p.isAnomaly)
            .map((p, i) => (
              <g key={`anom-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={14}
                  fill="#dc2626"
                  fillOpacity={0.12}
                  className="animate-pulse"
                />
                <circle cx={p.x} cy={p.y} r={4} fill="#dc2626" stroke="#fff" strokeWidth={1.5} />
              </g>
            ))}

          {highlightPt && (
            <g>
              <line
                x1={highlightPt.x}
                x2={highlightPt.x}
                y1={paddingT}
                y2={H - paddingB}
                stroke="#0f766e"
                strokeDasharray="4 3"
              />
              <circle cx={highlightPt.x} cy={highlightPt.y} r={5} fill="#0f766e" stroke="#fff" strokeWidth={2} />
              <text
                x={highlightPt.x + 10}
                y={highlightPt.y - 10}
                className="fill-teal-700 font-mono"
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                λ={highlightPt.wavelength}nm  A={highlightPt.absorbance.toFixed(3)}
              </text>
            </g>
          )}

          {mouseX > 0 && (
            <line
              x1={mouseX}
              x2={mouseX}
              y1={paddingT}
              y2={H - paddingB}
              stroke="#94a3b8"
              strokeDasharray="2 2"
              strokeWidth={1}
              opacity={0.5}
            />
          )}

          {hover && (
            <g>
              <circle cx={hover.x} cy={hover.y} r={4} fill="#1a2744" stroke="#fff" strokeWidth={1.5} />
              <rect
                x={Math.min(hover.x + 8, W - 140)}
                y={Math.max(hover.y - 42, paddingT)}
                width={132}
                height={36}
                rx={6}
                fill="#1a2744"
                opacity={0.92}
              />
              <text
                x={Math.min(hover.x + 8, W - 140) + 10}
                y={Math.max(hover.y - 42, paddingT) + 15}
                fill="#fff"
                style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
              >
                λ = {hover.wavelength} nm
              </text>
              <text
                x={Math.min(hover.x + 8, W - 140) + 10}
                y={Math.max(hover.y - 42, paddingT) + 30}
                fill="#fdba74"
                style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
              >
                A = {hover.absorbance.toFixed(4)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
