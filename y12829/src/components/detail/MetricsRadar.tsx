import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PrimerSample, QualityMetric, SampleStatus } from "@/types";
import { statusColor } from "@/utils/boundaryCheck";

interface MetricsRadarProps {
  sample: PrimerSample;
}

function normalizeMetric(m: QualityMetric): number {
  const mid = (m.thresholdMin + m.thresholdMax) / 2;
  const rangeHalf = (m.thresholdMax - m.thresholdMin) / 2;
  if (rangeHalf === 0) return 50;
  const raw = 50 + ((m.value - mid) / rangeHalf) * 50;
  if (m.isOutOfRange) return Math.max(0, Math.min(100, raw));
  return Math.max(15, Math.min(100, raw));
}

function metricLevel(m: QualityMetric): "normal" | "boundary" | "abnormal" {
  if (m.isOutOfRange) return "abnormal";
  if (m.isBoundary) return "boundary";
  return "normal";
}

const levelColorMap: Record<"normal" | "boundary" | "abnormal", { bar: string; bg: string; text: string; dot: string }> = {
  normal: {
    bar: "bg-lab-teal",
    bg: "bg-lab-teal/10",
    text: "text-lab-teal",
    dot: "bg-lab-teal",
  },
  boundary: {
    bar: "bg-lab-amber",
    bg: "bg-lab-amber/15",
    text: "text-lab-amber",
    dot: "bg-lab-amber",
  },
  abnormal: {
    bar: "bg-lab-danger",
    bg: "bg-lab-danger/10",
    text: "text-lab-danger",
    dot: "bg-lab-danger",
  },
};

const levelLabelMap = {
  normal: "正常",
  boundary: "边界",
  abnormal: "越界",
};

function MetricRow({ metric }: { metric: QualityMetric }) {
  const level = metricLevel(metric);
  const colors = levelColorMap[level];
  const mid = (metric.thresholdMin + metric.thresholdMax) / 2;
  const safeRange = metric.thresholdMax - metric.thresholdMin;
  const progressRaw = safeRange === 0
    ? 50
    : Math.max(0, Math.min(100, ((metric.value - metric.thresholdMin) / safeRange) * 100));
  const devText = `${metric.deviationPercent}%`;
  const DevIcon = metric.deviationPercent === 0
    ? Minus
    : metric.value > mid
    ? TrendingUp
    : TrendingDown;

  return (
    <div className="group rounded-xl border border-primary-100 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-white", colors.dot)} />
            <h4 className="truncate text-sm font-bold text-primary-900">
              {metric.name}
              <span className="ml-1 text-xs font-medium text-primary-400">
                ({metric.shortName})
              </span>
            </h4>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                colors.bg,
                colors.text
              )}
            >
              {levelLabelMap[level]}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div>
              <span className="text-2xl font-extrabold tabular-nums text-primary-900">
                {metric.value}
              </span>
              <span className="ml-1 text-sm font-medium text-primary-500">
                {metric.unit}
              </span>
            </div>
            <div className="text-xs text-primary-500">
              阈值：
              <span className="font-semibold text-primary-700">
                {metric.thresholdMin}
                <span className="mx-0.5 text-primary-400">~</span>
                {metric.thresholdMax}
                {metric.unit}
              </span>
            </div>
            <div className={cn("flex items-center gap-1 text-xs font-semibold", colors.text)}>
              <DevIcon className="h-3 w-3" />
              偏差 {devText}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className={cn("relative h-2.5 w-full overflow-hidden rounded-full", colors.bg)}>
          <div className="absolute inset-y-0 left-[15%] w-px border-l border-dashed border-primary-300/70" />
          <div className="absolute inset-y-0 left-[85%] w-px border-l border-dashed border-primary-300/70" />
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
              colors.bar
            )}
            style={{ width: `${progressRaw}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-primary-400">
          <span>{metric.thresholdMin}{metric.unit}</span>
          <span className="text-primary-500">安全区间</span>
          <span>{metric.thresholdMax}{metric.unit}</span>
        </div>
      </div>

      <div className="mt-3 flex gap-2 rounded-lg bg-primary-50/70 p-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
        <p className="text-xs leading-relaxed text-primary-600">
          {metric.explanation}
        </p>
      </div>
    </div>
  );
}

export default function MetricsRadar({ sample }: MetricsRadarProps) {
  const strokeColor = statusColor(sample.status);
  const radarData = sample.metrics.map((m) => ({
    subject: m.shortName,
    fullName: m.name,
    value: normalizeMetric(m),
    rawValue: m.value,
    unit: m.unit,
    level: metricLevel(m),
    fullMark: 100,
  }));

  return (
    <div className="rounded-2xl border border-primary-100 bg-white p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-primary-900">质量指标雷达图</h3>
          <p className="mt-0.5 text-sm text-primary-500">
            六维度归一化评分（0-100），多边形越饱满代表整体质量越好
          </p>
        </div>
        <div className="hidden gap-4 sm:flex">
          {(["normal", "boundary", "abnormal"] as const).map((l) => (
            <div key={l} className="flex items-center gap-1.5 text-xs text-primary-600">
              <span className={cn("h-2.5 w-2.5 rounded-full", levelColorMap[l].dot)} />
              {levelLabelMap[l]}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="relative h-[380px] w-full rounded-xl bg-gradient-to-br from-primary-50/50 to-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={radarData}
                outerRadius="78%"
                margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
              >
                <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{
                    fill: "#334e68",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: "#9fb3c8", fontSize: 10 }}
                  tickCount={5}
                  axisLine={false}
                />
                <Tooltip
                  content={({ payload, label }) => {
                    if (!payload || payload.length === 0) return null;
                    const d = payload[0].payload as (typeof radarData)[number];
                    return (
                      <div className="rounded-lg border border-primary-100 bg-white p-3 shadow-lg">
                        <div className="mb-1 text-xs font-bold text-primary-500">{d.fullName}</div>
                        <div className="text-lg font-extrabold text-primary-900">
                          {d.rawValue}
                          <span className="ml-0.5 text-sm font-medium text-primary-500">{d.unit}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-primary-500">
                          归一化评分：
                          <span className="font-semibold" style={{ color: strokeColor }}>
                            {d.value.toFixed(0)}
                          </span>
                          /100
                        </div>
                      </div>
                    );
                  }}
                />
                <Radar
                  name="质量评分"
                  dataKey="value"
                  stroke={strokeColor}
                  fill={strokeColor}
                  fillOpacity={0.18}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: "#fff",
                    stroke: strokeColor,
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 6, strokeWidth: 2.5 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-primary-50 p-2">
              <div className="text-xs text-primary-500">越界</div>
              <div className="text-xl font-extrabold text-lab-danger">
                {sample.metrics.filter((m) => m.isOutOfRange).length}
              </div>
            </div>
            <div className="rounded-lg bg-primary-50 p-2">
              <div className="text-xs text-primary-500">边界</div>
              <div className="text-xl font-extrabold text-lab-amber">
                {sample.metrics.filter((m) => m.isBoundary).length}
              </div>
            </div>
            <div className="rounded-lg bg-primary-50 p-2">
              <div className="text-xs text-primary-500">正常</div>
              <div className="text-xl font-extrabold text-lab-teal">
                {sample.metrics.filter((m) => !m.isOutOfRange && !m.isBoundary).length}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 lg:col-span-3">
          {sample.metrics.map((m) => (
            <MetricRow key={m.shortName} metric={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
