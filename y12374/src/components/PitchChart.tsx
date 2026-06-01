import { useMemo } from "react";
import type { PitchPoint, Issue } from "@/types";

interface PitchChartProps {
  pitchData: PitchPoint[];
  issues: Issue[];
  partName: string;
}

export default function PitchChart({ pitchData, issues, partName }: PitchChartProps) {
  const width = 800;
  const height = 300;
  const padX = 50;
  const padY = 30;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const { minY, maxY } = useMemo(() => {
    if (pitchData.length === 0) return { minY: 50, maxY: 80 };
    const notes = pitchData.map((p) => p.midiNote);
    const lo = Math.min(...notes);
    const hi = Math.max(...notes);
    return { minY: Math.floor(lo) - 2, maxY: Math.ceil(hi) + 2 };
  }, [pitchData]);

  const scaleX = (time: number) => padX + (time / 60) * innerW;
  const scaleY = (note: number) => padY + innerH - ((note - minY) / (maxY - minY)) * innerH;

  const pathD = useMemo(() => {
    if (pitchData.length === 0) return "";
    return pitchData.map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.time).toFixed(1)},${scaleY(p.midiNote).toFixed(1)}`).join(" ");
  }, [pitchData, minY, maxY]);

  const deviationSegments = useMemo(() => {
    const segs: Array<{ d: string; isIssue: boolean }> = [];
    let currentD = "";
    let currentIssue = false;
    for (let i = 0; i < pitchData.length; i++) {
      const p = pitchData[i];
      const inIssue = issues.some(
        (iss) => p.time >= iss.startTime && p.time <= iss.endTime
      );
      const highDev = Math.abs(p.deviation) > 15;
      const isIssue = inIssue || highDev;
      const cmd = i === 0 || isIssue !== currentIssue ? "M" : "L";
      if (isIssue !== currentIssue && currentD) {
        segs.push({ d: currentD, isIssue: currentIssue });
        currentD = "";
      }
      currentIssue = isIssue;
      currentD += `${cmd}${scaleX(p.time).toFixed(1)},${scaleY(p.midiNote).toFixed(1)} `;
    }
    if (currentD) segs.push({ d: currentD, isIssue: currentIssue });
    return segs;
  }, [pitchData, issues, minY, maxY]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let n = Math.ceil(minY); n <= Math.floor(maxY); n += 2) ticks.push(n);
    return ticks;
  }, [minY, maxY]);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#1B2A4A]">音高检测 — {partName}</h3>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#1B2A4A] inline-block" /> 实际音高
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-zinc-300 inline-block border-t border-dashed border-zinc-400" /> 参考音高
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#C44E52] inline-block" /> 偏差区域
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {yTicks.map((n) => (
          <g key={n}>
            <line x1={padX} y1={scaleY(n)} x2={width - padX} y2={scaleY(n)} stroke="#e5e7eb" strokeWidth={0.5} />
            <text x={padX - 6} y={scaleY(n) + 3} textAnchor="end" className="text-[10px]" fill="#9ca3af">
              {n}
            </text>
          </g>
        ))}
        {[0, 10, 20, 30, 40, 50, 60].map((t) => (
          <g key={t}>
            <line x1={scaleX(t)} y1={padY} x2={scaleX(t)} y2={height - padY} stroke="#e5e7eb" strokeWidth={0.5} />
            <text x={scaleX(t)} y={height - padY + 14} textAnchor="middle" className="text-[10px]" fill="#9ca3af">
              {t}s
            </text>
          </g>
        ))}
        {issues.map((iss) => (
          <rect
            key={iss.id}
            x={scaleX(iss.startTime)}
            y={padY}
            width={scaleX(iss.endTime) - scaleX(iss.startTime)}
            height={innerH}
            fill="#C44E52"
            opacity={0.08}
          />
        ))}
        {pitchData.length > 1 && (
          <path d={pathD} fill="none" stroke="#d1d5db" strokeWidth={1} strokeDasharray="4,3" />
        )}
        {deviationSegments.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={seg.isIssue ? "#C44E52" : "#1B2A4A"}
            strokeWidth={seg.isIssue ? 2 : 1.5}
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}
