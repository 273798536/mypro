import type { PhPoint } from "@/types";
import { AlertTriangle } from "lucide-react";

interface Props {
  data: PhPoint[];
  range: [number, number];
  height?: number;
}

export default function PhChart({ data, range, height = 120 }: Props) {
  const svgW = 420;
  const svgH = height;
  const padL = 30;
  const padR = 12;
  const padT = 12;
  const padB = 20;

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[120px] bg-ink-50 rounded-xl border border-dashed border-ink-200 text-ink-400 text-sm">
        暂无pH数据
      </div>
    );
  }

  const times = data.map((d) => d.timeMin);
  const phs = data.map((d) => d.phValue);
  const maxX = Math.max(...times, 10);
  const maxY = Math.max(...phs, range[1]) + 0.3;
  const minY = Math.min(...phs, range[0]) - 0.3;
  const xScale = (svgW - padL - padR) / maxX;
  const yScale = (svgH - padT - padB) / (maxY - minY);
  const y = (v: number) => padT + (maxY - v) * yScale;
  const x = (v: number) => padL + v * xScale;

  const pts = data.map((d) => `${x(d.timeMin)},${y(d.phValue)}`).join(" ");

  const outOfRange = data.filter((d) => d.isOutOfRange);
  const outLabels = outOfRange.slice(0, 3);

  return (
    <div>
      <div className="w-full overflow-x-auto scrollbar-thin">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[360px]">
          <rect
            x={padL}
            y={y(range[1])}
            width={svgW - padL - padR}
            height={(range[1] - range[0]) * yScale}
            fill="#EDF8F2"
            stroke="#A9DEBD"
            strokeDasharray="3 3"
            strokeWidth="1"
            opacity="0.8"
          />
          <line x1={padL} x2={svgW - padR} y1={y(range[0])} y2={y(range[0])} stroke="#2D9A6F" strokeDasharray="4 2" strokeWidth="1" />
          <line x1={padL} x2={svgW - padR} y1={y(range[1])} y2={y(range[1])} stroke="#2D9A6F" strokeDasharray="4 2" strokeWidth="1" />
          <text x={padL + 2} y={y(range[1]) - 3} fontSize="9" fill="#247C58">上 {range[1]}</text>
          <text x={padL + 2} y={y(range[0]) + 10} fontSize="9" fill="#247C58">下 {range[0]}</text>

          <polyline points={pts} fill="none" stroke="#E8873A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {data.map((d, i) => (
            <circle
              key={d.phId || i}
              cx={x(d.timeMin)}
              cy={y(d.phValue)}
              r={d.isOutOfRange ? 4 : 2.5}
              fill={d.isOutOfRange ? "#D32F2F" : "#fff"}
              stroke={d.isOutOfRange ? "#D32F2F" : "#E8873A"}
              strokeWidth="1.5"
            />
          ))}

          <text x={svgW - padR} y={svgH - 4} fontSize="9" textAnchor="end" fill="#7F8AA2">
            min
          </text>
        </svg>
      </div>
      {outOfRange.length > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-warn-50 border border-warn-200 text-warn-700 text-sm space-y-1">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle size="15" />
            pH 越界 {outOfRange.length} 次
          </div>
          <ul className="list-disc list-inside text-xs space-y-0.5 text-warn-800">
            {outLabels.map((d, i) => (
              <li key={i}>
                第 {d.timeMin} 分钟 pH = {d.phValue.toFixed(2)}，超出推荐范围 [{range[0]} ~ {range[1]}]
              </li>
            ))}
            {outOfRange.length > outLabels.length && (
              <li>另有 {outOfRange.length - outLabels.length} 次越界，详情查看表格</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
