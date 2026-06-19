import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(s?: string | null) {
  if (!s) return "-";
  try {
    return format(parseISO(s), "yyyy-MM-dd HH:mm:ss", { locale: zhCN });
  } catch {
    return s;
  }
}

export function formatDateOnly(s?: string | null) {
  if (!s) return "-";
  try {
    return format(parseISO(s), "MM-dd HH:mm", { locale: zhCN });
  } catch {
    return s;
  }
}

export const CATEGORY_LABEL: Record<string, { label: string; color: string }> = {
  permission_override: { label: "权限越权", color: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  data_missing: { label: "数据缺失", color: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  format_error: { label: "格式错误", color: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  duplicate_key: { label: "重复主键", color: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  range_violation: { label: "值域违规", color: "bg-orange-50 text-orange-700 ring-orange-600/20" },
};

export const STATUS_LABEL: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "待复核", color: "bg-zinc-100 text-zinc-700 ring-zinc-600/20", dot: "bg-zinc-400" },
  approved: { label: "复核通过", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  rejected: { label: "已驳回", color: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500" },
  escalated: { label: "已升级", color: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
};

export const SEVERITY_LABEL: Record<string, { label: string; color: string }> = {
  high: { label: "高危", color: "bg-rose-100 text-rose-700" },
  medium: { label: "中危", color: "bg-amber-100 text-amber-700" },
  low: { label: "低危", color: "bg-sky-100 text-sky-700" },
};

export const MODE_LABEL: Record<string, { label: string; color: string }> = {
  full: { label: "全量", color: "bg-indigo-50 text-indigo-700" },
  incremental: { label: "增量", color: "bg-teal-50 text-teal-700" },
};

export function shortText(s: string, len = 80) {
  return s.length > len ? s.slice(0, len) + "…" : s;
}

export function buildExportFileName(params: {
  type: "dirty_rows" | "slow_queries" | "batch_report" | "compare";
  batchNo: string;
  secondBatchNo?: string;
  ext?: "csv" | "json" | "txt";
}) {
  const { type, batchNo, secondBatchNo, ext = "csv" } = params;
  const typeMap: Record<string, string> = {
    dirty_rows: "脏行明细",
    slow_queries: "慢查询归因",
    batch_report: "批次报告",
    compare: "备份对比",
  };
  const batchPart = secondBatchNo ? `${batchNo}_vs_${secondBatchNo}` : batchNo;
  const ts = format(new Date(), "yyyyMMdd_HHmmss");
  return `数据质量_${typeMap[type]}_${batchPart}_${ts}.${ext}`;
}
