import { ArrowDown, ArrowUp, Minus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { QualityMetric } from "@/types";

interface MetricComparisonProps {
  metrics: QualityMetric[];
}

export default function MetricComparison({ metrics }: MetricComparisonProps) {
  return (
    <div className="bg-white rounded-xl border border-primary-200 shadow-card overflow-hidden print:shadow-none print:border-2 print:rounded-lg">
      <div className="bg-gradient-to-r from-primary-700 to-primary-800 px-6 py-4 print:px-5 print:py-3">
        <h2 className="text-xl font-bold text-white tracking-wide print:text-lg">
          六项关键指标对比图
        </h2>
        <p className="mt-1.5 text-sm text-white/90 print:text-xs">
          灰色区间为正常范围，圆点为实测值，超出区间即标红告警
        </p>
      </div>

      <div className="p-6 space-y-6 print:p-5 print:space-y-5">
        <div className="grid grid-cols-12 gap-4 px-2 pb-2 border-b border-primary-100 text-xs font-semibold text-primary-500 uppercase tracking-wider print:grid-cols-12 print:gap-3 print:text-[10px]">
          <div className="col-span-3">指标名称</div>
          <div className="col-span-7">正常范围 vs 实测值</div>
          <div className="col-span-2 text-right">偏差</div>
        </div>

        {metrics.map((metric, idx) => (
          <MetricRow key={idx} metric={metric} />
        ))}

        <div className="pt-4 border-t border-primary-100">
          <div className="flex flex-wrap items-center gap-6 text-xs text-primary-600 print:gap-4 print:text-[10px]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-3 bg-gray-300 rounded" />
              <span>正常区间</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-teal-500 ring-2 ring-teal-200" />
              <span>正常（范围内）</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500 ring-2 ring-amber-200" />
              <span>临界（边缘）</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 ring-2 ring-red-200" />
              <span>异常（越界）</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ metric }: { metric: QualityMetric }) {
  const { thresholdMin, thresholdMax, value, isOutOfRange, isBoundary, deviationPercent, name, unit, shortName, explanation } = metric;

  const range = thresholdMax - thresholdMin;
  const extendedMin = thresholdMin - range * 0.5;
  const extendedMax = thresholdMax + range * 0.5;
  const extendedRange = extendedMax - extendedMin;

  const minPos = ((thresholdMin - extendedMin) / extendedRange) * 100;
  const maxPos = ((thresholdMax - extendedMin) / extendedRange) * 100;
  const valuePos = Math.max(2, Math.min(98, ((value - extendedMin) / extendedRange) * 100));

  let pointColor = "bg-teal-500 ring-teal-200";
  let textColor = "text-teal-700";
  let bgTint = "bg-teal-50";
  let borderTint = "border-teal-200";
  let statusIcon = <CheckCircle2 className="w-4 h-4 text-teal-500" />;

  if (isOutOfRange) {
    pointColor = "bg-red-500 ring-red-200";
    textColor = "text-red-700";
    bgTint = "bg-red-50";
    borderTint = "border-red-200";
    statusIcon = <AlertTriangle className="w-4 h-4 text-red-500" />;
  } else if (isBoundary) {
    pointColor = "bg-amber-500 ring-amber-200";
    textColor = "text-amber-700";
    bgTint = "bg-amber-50";
    borderTint = "border-amber-200";
    statusIcon = <AlertTriangle className="w-4 h-4 text-amber-500" />;
  }

  const below = value < thresholdMin;
  const above = value > thresholdMax;
  let diffText = `${deviationPercent}%`;
  let DiffIcon = Minus;
  if (isOutOfRange) {
    if (below) {
      const diff = ((thresholdMin - value) / thresholdMin * 100).toFixed(1);
      diffText = `↓${diff}%`;
      DiffIcon = ArrowDown;
    } else if (above) {
      const diff = ((value - thresholdMax) / thresholdMax * 100).toFixed(1);
      diffText = `↑${diff}%`;
      DiffIcon = ArrowUp;
    }
  } else if (isBoundary) {
    DiffIcon = Minus;
  }

  return (
    <div className={`grid grid-cols-12 gap-4 items-center p-3 rounded-lg ${bgTint} border ${borderTint} print:grid-cols-12 print:gap-3 print:p-2.5`}>
      <div className="col-span-3">
        <div className="flex items-center gap-2 mb-0.5">
          {statusIcon}
          <span className={`font-bold text-sm ${textColor} print:text-xs`}>{name}</span>
        </div>
        <div className="text-[11px] text-primary-500 font-mono ml-6 print:text-[9px]">
          {shortName} · {unit}
        </div>
        <div className="text-[10px] text-primary-400 mt-0.5 ml-6 line-clamp-2 print:hidden">
          {explanation.length > 40 ? explanation.slice(0, 40) + "..." : explanation}
        </div>
      </div>

      <div className="col-span-7 relative">
        <div className="relative h-10 flex items-center print:h-8">
          <div
            className="absolute h-6 bg-gray-300/70 rounded-lg border border-gray-400/40 print:h-5"
            style={{
              left: `${minPos}%`,
              width: `${maxPos - minPos}%`,
            }}
          />
          <div
            className="absolute left-0 w-px h-10 bg-gray-200"
            style={{ left: `${minPos}%` }}
          />
          <div
            className="absolute left-0 w-px h-10 bg-gray-200"
            style={{ left: `${maxPos}%` }}
          />

          {isOutOfRange && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
            >
              <line
                x1={`${valuePos}%`}
                y1="50%"
                x2={below ? `${minPos}%` : `${maxPos}%`}
                y2="50%"
                stroke={below ? "#dc2626" : "#dc2626"}
                strokeWidth="2"
                strokeDasharray="4 2"
                className="print:hidden"
              />
            </svg>
          )}

          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full ${pointColor} ring-4 shadow-lg transform transition-all print:w-5 print:h-5 print:ring-2 z-10`}
            style={{ left: `${valuePos}%` }}
          >
            <div className="absolute inset-0 rounded-full bg-white/25" />
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-primary-400 mt-1 font-mono px-1 print:text-[9px]">
          <span>{thresholdMin}{unit}</span>
          <span className="text-primary-500 font-semibold">
            {((thresholdMin + thresholdMax) / 2).toFixed(1)}{unit}
          </span>
          <span>{thresholdMax}{unit}</span>
        </div>

        <div className="absolute -bottom-1 left-0 right-0 flex justify-center pointer-events-none print:hidden">
          <div
            className={`transform -translate-y-2 text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
              isOutOfRange ? "bg-red-100 text-red-700 border border-red-300" :
              isBoundary ? "bg-amber-100 text-amber-700 border border-amber-300" :
              "bg-teal-100 text-teal-700 border border-teal-300"
            } shadow-sm whitespace-nowrap`}
            style={{
              position: "absolute",
              left: `${valuePos}%`,
              transform: `translateX(-50%) translateY(-24px)`,
            }}
          >
            {value}{unit}
          </div>
        </div>
      </div>

      <div className="col-span-2 text-right">
        <div className="flex items-center justify-end gap-1 mb-1">
          <DiffIcon className={`w-4 h-4 ${textColor} print:w-3 print:h-3`} />
          <span className={`text-lg font-bold font-mono ${textColor} print:text-base`}>
            {diffText}
          </span>
        </div>
        <div className={`text-[11px] ${textColor} font-semibold print:text-[9px]`}>
          {isOutOfRange ? "越界" : isBoundary ? "临界" : "正常"}
        </div>
      </div>
    </div>
  );
}
