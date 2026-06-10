import { QualityMetric, SampleStatus } from "@/types";

export function calculateDeviation(
  value: number, min: number, max: number
): { deviationPercent: number; isOutOfRange: boolean; isBoundary: boolean } {
  const mid = (min + max) / 2;
  const rangeHalf = (max - min) / 2;
  if (rangeHalf === 0) {
    return { deviationPercent: 0, isOutOfRange: false, isBoundary: false };
  }
  const deviationPercent = Math.abs(value - mid) / rangeHalf;
  const isOutOfRange = value < min || value > max;
  const isBoundary = !isOutOfRange && deviationPercent >= 0.85;
  return {
    deviationPercent: Math.round(deviationPercent * 100),
    isOutOfRange,
    isBoundary,
  };
}

export function buildMetric(
  name: string,
  shortName: string,
  value: number,
  thresholdMin: number,
  thresholdMax: number,
  unit: string,
  explanation: string
): QualityMetric {
  const { deviationPercent, isOutOfRange, isBoundary } = calculateDeviation(
    value, thresholdMin, thresholdMax
  );
  return {
    name, shortName, value, thresholdMin, thresholdMax, unit,
    deviationPercent, isOutOfRange, isBoundary, explanation,
  };
}

export function classifySample(metrics: QualityMetric[]): SampleStatus {
  const outOfRangeCount = metrics.filter((m) => m.isOutOfRange).length;
  const boundaryCount = metrics.filter((m) => m.isBoundary).length;
  if (outOfRangeCount >= 1) return SampleStatus.ABNORMAL;
  if (outOfRangeCount === 0 && boundaryCount === 0) return SampleStatus.NORMAL;
  return SampleStatus.BORDERLINE;
}

export function generateAutoReason(metrics: QualityMetric[], sigma: number): string {
  const outOfRange = metrics.filter((m) => m.isOutOfRange);
  const boundary = metrics.filter((m) => m.isBoundary);
  const parts: string[] = [];
  if (outOfRange.length > 0) {
    parts.push(
      `${outOfRange.length}项指标严重越界${outOfRange
        .map((m) => `${m.name}${m.value}${m.unit}`)
        .join("、")}`
    );
  }
  if (boundary.length > 0) {
    parts.push(
      `${boundary.length}项触达阈值边缘${boundary
        .map((m) => `${m.name}${m.value}${m.unit}`)
        .join("、")}`
    );
  }
  if (sigma > 3) parts.push(`PCA聚类距离批次中心${sigma.toFixed(1)}σ，明显离群`);
  else if (sigma > 1.5) parts.push(`PCA聚类距离批次中心${sigma.toFixed(1)}σ，介于边界附近`);
  else parts.push(`PCA聚类距离批次中心${sigma.toFixed(1)}σ，正常范围`);
  if (outOfRange.length === 0 && boundary.length === 0) {
    return `全部${metrics.length}项指标均落在安全阈值范围内；${parts[parts.length - 1]}`;
  }
  return parts.join("；");
}

export function statusLabel(s: SampleStatus): string {
  return {
    [SampleStatus.NORMAL]: "正常样本",
    [SampleStatus.BORDERLINE]: "边界样本·待确认",
    [SampleStatus.ABNORMAL]: "异常样本",
  }[s];
}

export function statusColor(s: SampleStatus): string {
  return {
    [SampleStatus.NORMAL]: "#0d9488",
    [SampleStatus.BORDERLINE]: "#f59e0b",
    [SampleStatus.ABNORMAL]: "#dc2626",
  }[s];
}

export function statusBgClass(s: SampleStatus): string {
  return {
    [SampleStatus.NORMAL]: "bg-teal-50 border-teal-200",
    [SampleStatus.BORDERLINE]: "bg-amber-50 border-amber-200",
    [SampleStatus.ABNORMAL]: "bg-red-50 border-red-200",
  }[s];
}

export function statusTextClass(s: SampleStatus): string {
  return {
    [SampleStatus.NORMAL]: "text-teal-700",
    [SampleStatus.BORDERLINE]: "text-amber-700",
    [SampleStatus.ABNORMAL]: "text-red-700",
  }[s];
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
