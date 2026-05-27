import { useState, useMemo } from "react";
import type { DepreciationLog, Maintenance, Equipment } from "../types";
import { formatCurrency } from "../utils/depreciation";

interface DepreciationChartProps {
  equipment: Equipment;
  logs: DepreciationLog[];
  maintenances: Maintenance[];
  height?: number;
}

export default function DepreciationChart({
  equipment,
  logs,
  maintenances,
  height = 220,
}: DepreciationChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 40, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = equipment.originalValue;
  const minValue = equipment.originalValue * equipment.residualRate;
  const valueRange = maxValue - minValue;

  const xScale = (month: number) =>
    padding.left + (month / equipment.depreciationMonths) * chartWidth;
  const yScale = (value: number) =>
    padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;

  const maintenanceMarkers = useMemo(() => {
    return maintenances
      .filter((m) => m.equipmentId === equipment.id && m.valueAdjustment !== 0)
      .map((m) => {
        const start = new Date(equipment.startDate);
        const mDate = new Date(m.maintenanceDate);
        const month =
          (mDate.getFullYear() - start.getFullYear()) * 12 +
          (mDate.getMonth() - start.getMonth()) +
          1;
        return { ...m, month };
      })
      .filter((m) => m.month >= 1 && m.month <= equipment.depreciationMonths);
  }, [maintenances, equipment]);

  const linePath = useMemo(() => {
    if (logs.length === 0) return "";
    return logs
      .map((l, i) => {
        const x = xScale(l.month);
        const y = yScale(l.bookValue);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [logs]);

  const areaPath = useMemo(() => {
    if (logs.length === 0) return "";
    const firstX = xScale(logs[0].month);
    const lastX = xScale(logs[logs.length - 1].month);
    const bottomY = padding.top + chartHeight;
    return `M ${firstX} ${bottomY} ${linePath.replace(/M/g, "L")} L ${lastX} ${bottomY} Z`;
  }, [logs, linePath]);

  const yTicks = useMemo(() => {
    const ticks: { value: number; y: number }[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const value = minValue + (valueRange / steps) * i;
      ticks.push({ value, y: yScale(value) });
    }
    return ticks;
  }, []);

  const xTickCount = Math.min(equipment.depreciationMonths, 12);
  const xTickStep = Math.ceil(equipment.depreciationMonths / xTickCount);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseLeave={() => setHoveredMonth(null)}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4a843" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d4a843" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke="#e5e7eb"
              strokeDasharray="3,3"
            />
            <text
              x={padding.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-navy-400 text-[10px]"
            >
              {(tick.value / 10000).toFixed(0)}万
            </text>
          </g>
        ))}

        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          stroke="#94a3b8"
        />

        {Array.from({ length: xTickCount + 1 }, (_, i) => i * xTickStep)
          .filter((m) => m <= equipment.depreciationMonths)
          .map((month) => (
            <text
              key={month}
              x={xScale(month)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="fill-navy-400 text-[10px]"
            >
              第{month}月
            </text>
          ))}

        <path d={areaPath} fill="url(#areaGradient)" />
        <path d={linePath} fill="none" stroke="#d4a843" strokeWidth="2" />

        {maintenanceMarkers.map((m, i) => {
          const x = xScale(m.month);
          return (
            <g key={i}>
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={padding.top + chartHeight}
                stroke="#e74c3c"
                strokeDasharray="4,4"
                strokeWidth="1"
              />
              <circle cx={x} cy={padding.top + 5} r="4" fill="#e74c3c" />
              <text
                x={x}
                y={padding.top + 20}
                textAnchor="middle"
                className="fill-danger-400 text-[9px] font-medium"
              >
                维修
              </text>
            </g>
          );
        })}

        {logs.map((l) => {
          const x = xScale(l.month);
          const y = yScale(l.bookValue);
          return (
            <circle
              key={l.id}
              cx={x}
              cy={y}
              r={l.isAbnormal ? 5 : 3}
              fill={l.isAbnormal ? "#e74c3c" : "#d4a843"}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredMonth(l.month)}
            />
          );
        })}

        {hoveredMonth && (() => {
          const log = logs.find((l) => l.month === hoveredMonth);
          if (!log) return null;
          const x = xScale(hoveredMonth);
          const y = yScale(log.bookValue);
          const boxWidth = 140;
          const boxHeight = 68;
          const boxX = Math.min(
            Math.max(x - boxWidth / 2, padding.left),
            width - padding.right - boxWidth
          );
          const boxY = Math.max(y - boxHeight - 10, padding.top);
          return (
            <g>
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={padding.top + chartHeight}
                stroke="#1e3a5f"
                strokeWidth="1"
                opacity="0.5"
              />
              <rect
                x={boxX}
                y={boxY}
                width={boxWidth}
                height={boxHeight}
                rx="6"
                fill="#1e3a5f"
                opacity="0.95"
              />
              <text x={boxX + 10} y={boxY + 18} className="fill-white text-[11px] font-medium">
                第{log.month}月
              </text>
              <text x={boxX + 10} y={boxY + 36} className="fill-navy-200 text-[10px]">
                月折旧: {formatCurrency(log.monthlyDepreciation)}
              </text>
              <text x={boxX + 10} y={boxY + 52} className="fill-amber-400 text-[10px] font-medium">
                净值: {formatCurrency(log.bookValue)}
              </text>
              {log.isAbnormal && (
                <text x={boxX + 10} y={boxY + 65} className="fill-danger-400 text-[9px]">
                  ⚠ {log.abnormalReason?.slice(0, 18)}
                </text>
              )}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
