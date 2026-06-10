import { useMemo } from "react";
import type { TempPoint } from "@/types";

interface Props {
  data: TempPoint[];
  boilingPoint?: number;
  highlight?: { min: number; max: number; reason: string };
  height?: number;
}

export default function TempChart({ data, boilingPoint, highlight, height = 220 }: Props) {
  const svgW = 560;
  const svgH = height;
  const padL = 42;
  const padR = 16;
  const padT = 18;
  const padB = 30;

  const { points, xScale, yScale, maxT, minT } = useMemo(() => {
    if (!data.length) {
      return { points: [] as string[], xScale: 0, yScale: 0, maxT: 100, minT: 0 };
    }
    const times = data.map((d) => d.timeMin);
    const temps = data.map((d) => d.tempC);
    const maxX = Math.max(...times, 10);
    const maxT = Math.max(...temps, boilingPoint ?? 0) + 5;
    const minT = Math.min(...temps, 20) - 5;
    const xScale = (svgW - padL - padR) / maxX;
    const yScale = (svgH - padT - padB) / (maxT - minT);
    const pts = data
      .map((d) => `${padL + d.timeMin * xScale},${padT + (maxT - d.tempC) * yScale}`)
      .join(" ");
    return { points: [pts], xScale, yScale, maxT, minT };
  }, [data, boilingPoint]);

  const yTicks = 5;
  const yTickArr = Array.from({ length: yTicks + 1 }, (_, i) => minT + ((maxT - minT) * i) / yTicks);

  const xTicks = 6;
  const maxX = data.length ? Math.max(...data.map((d) => d.timeMin)) : 60;
  const xTickArr = Array.from({ length: xTicks + 1 }, (_, i) => Math.round((maxX * i) / xTicks));

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[220px] bg-ink-50 rounded-xl border border-dashed border-ink-200 text-ink-400 text-sm">
        暂无温度数据，请先录入回流过程中的温度记录点
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[480px]">
        <defs>
          <linearGradient id="tempFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1E4D8C" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#1E4D8C" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTickArr.map((t, i) => (
          <g key={`yt-${i}`}>
            <line
              x1={padL}
              x2={svgW - padR}
              y1={padT + ((maxT - minT) * i) / yTicks * yScale * 0 ? padT + (maxT - t) * yScale : padT + (maxT - t) * yScale}
              y2={padT + (maxT - t) * yScale}
              stroke="#ECEEF2"
              strokeWidth="1"
            />
            <text
              x={padL - 6}
              y={padT + (maxT - t) * yScale + 3}
              fontSize="10"
              textAnchor="end"
              fill="#7F8AA2"
            >
              {t.toFixed(0)}°C
            </text>
          </g>
        ))}

        {xTickArr.map((t, i) => {
          const x = padL + t * xScale;
          return (
            <g key={`xt-${i}`}>
              <line x1={x} x2={x} y1={padT} y2={svgH - padB} stroke="#ECEEF2" strokeWidth="1" />
              <text x={x} y={svgH - padB + 16} fontSize="10" textAnchor="middle" fill="#7F8AA2">
                {t}分
              </text>
            </g>
          );
        })}

        {boilingPoint && boilingPoint >= minT && boilingPoint <= maxT && (
          <g>
            <line
              x1={padL}
              x2={svgW - padR}
              y1={padT + (maxT - boilingPoint) * yScale}
              y2={padT + (maxT - boilingPoint) * yScale}
              stroke="#2D9A6F"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <text
              x={svgW - padR - 4}
              y={padT + (maxT - boilingPoint) * yScale - 4}
              fontSize="10"
              textAnchor="end"
              fill="#247C58"
              fontWeight="600"
            >
              沸点 {boilingPoint}°C
            </text>
          </g>
        )}

        {highlight && (
          <rect
            x={padL + highlight.min * xScale}
            y={padT}
            width={(highlight.max - highlight.min) * xScale}
            height={svgH - padT - padB}
            fill="#E8873A"
            fillOpacity="0.12"
            stroke="#E8873A"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {points[0] && (
          <>
            <polygon
              points={`${padL},${svgH - padB} ${points[0]} ${padL + maxX * xScale},${svgH - padB}`}
              fill="url(#tempFill)"
            />
            <polyline
              points={points[0]}
              fill="none"
              stroke="#1E4D8C"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}

        {data.map((d, i) => (
          <circle
            key={d.tempId || i}
            cx={padL + d.timeMin * xScale}
            cy={padT + (maxT - d.tempC) * yScale}
            r="3"
            fill="#fff"
            stroke="#1E4D8C"
            strokeWidth="1.5"
          />
        ))}

        {highlight && (
          <text
            x={padL + (highlight.min + highlight.max) * xScale / 2}
            y={padT + 12}
            fontSize="10"
            textAnchor="middle"
            fill="#BC6B2B"
            fontWeight="600"
          >
            ⚠ {highlight.reason}
          </text>
        )}
      </svg>
    </div>
  );
}
