import type { MaterialType, SampleStatus } from "@/types";

export const STATUS_META: Record<
  SampleStatus,
  { label: string; dot: string; text: string; chip: string; ring: string }
> = {
  clean: {
    label: "干净",
    dot: "bg-signal-400",
    text: "text-signal-300",
    chip: "border-signal-500/30 bg-signal-500/10 text-signal-300",
    ring: "ring-signal-500/30",
  },
  dirty: {
    label: "脏数据",
    dot: "bg-warn-400",
    text: "text-warn-400",
    chip: "border-warn-400/30 bg-warn-400/10 text-warn-300",
    ring: "ring-warn-400/30",
  },
  fixed: {
    label: "已修正",
    dot: "bg-info-300",
    text: "text-info-300",
    chip: "border-info-400/30 bg-info-400/10 text-info-300",
    ring: "ring-info-400/30",
  },
  leak: {
    label: "训练验证泄漏",
    dot: "bg-danger-400",
    text: "text-danger-400",
    chip: "border-danger-400/30 bg-danger-400/10 text-danger-300",
    ring: "ring-danger-400/30",
  },
};

export const MATERIAL_META: Record<
  MaterialType,
  { label: string; tag: string; chip: string; accent: string }
> = {
  old_table: {
    label: "旧表",
    tag: "OLD_TABLE",
    chip: "border-warn-400/30 bg-warn-400/10 text-warn-300",
    accent: "text-warn-400",
  },
  supplementary: {
    label: "补录备注",
    tag: "SUPPLEMENT",
    chip: "border-info-400/30 bg-info-400/10 text-info-300",
    accent: "text-info-300",
  },
  missing_unit: {
    label: "漏填单位",
    tag: "MISSING_UNIT",
    chip: "border-danger-400/30 bg-danger-400/10 text-danger-300",
    accent: "text-danger-400",
  },
  clean: {
    label: "干净材料",
    tag: "CLEAN",
    chip: "border-signal-500/30 bg-signal-500/10 text-signal-300",
    accent: "text-signal-300",
  },
};

export const REMEDIATION_META: Record<
  "rerun" | "supplementary" | "manualConfirm",
  { label: string; short: string; hint: string }
> = {
  rerun: { label: "重复运行", short: "重复运行", hint: "用相同配置重跑评测，确认泄漏是否稳定复现" },
  supplementary: { label: "补录", short: "补录", hint: "补录缺失标注 / 修正数据，重算离线指标" },
  manualConfirm: { label: "人工确认", short: "人工确认", hint: "工程师人工复核并确认结论" },
};

export function fmtPct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtMetric(v: number): string {
  return v.toFixed(2);
}

export function gapSeverity(gap: number): { label: string; color: string } {
  const g = Math.abs(gap);
  if (g <= 0.02) return { label: "对齐", color: "text-signal-300" };
  if (g <= 0.06) return { label: "轻微偏离", color: "text-warn-400" };
  return { label: "明显偏离", color: "text-danger-400" };
}
