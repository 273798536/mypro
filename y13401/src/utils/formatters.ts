import type { ParameterStatus, OperationType, BatchResultType, ValueType } from "@/types";

export function formatValue(value: number | null, valueType: ValueType, unit?: string): string {
  if (valueType === "empty_set") {
    return "∅";
  }
  if (valueType === "zero") {
    return `0${unit ? ` ${unit}` : ""}`;
  }
  if (value === null || value === undefined) {
    return "—";
  }
  return `${value}${unit ? ` ${unit}` : ""}`;
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStatusLabel(status: ParameterStatus): string {
  const labels: Record<ParameterStatus, string> = {
    pending: "待复核",
    approved: "已通过",
    rejected: "已驳回",
    needs_review: "需重点复核",
    duplicate: "重复样本",
  };
  return labels[status];
}

export function getValueTypeName(valueType: ValueType): string {
  const names: Record<ValueType, string> = {
    normal: "正常值",
    empty_set: "空集合",
    zero: "零值",
    null: "空值",
    undefined: "未定义",
  };
  return names[valueType];
}

export function getOperationLabel(op: OperationType): string {
  const labels: Record<OperationType, string> = {
    create: "创建",
    update: "更新",
    supplement: "补录",
    withdraw: "撤回",
    rejudge: "改判",
    approve: "通过",
    reject: "驳回",
  };
  return labels[op];
}

export function getBatchResultLabel(type: BatchResultType): string {
  const labels: Record<BatchResultType, string> = {
    new: "新增",
    skipped: "跳过",
    updated: "更新",
    error: "异常",
  };
  return labels[type];
}

export function getRelativeTime(isoString: string): string {
  const now = Date.now();
  const time = new Date(isoString).getTime();
  const diff = now - time;

  const minute = 60000;
  const hour = 3600000;
  const day = 86400000;

  if (diff < minute) {
    return "刚刚";
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)} 分钟前`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)} 小时前`;
  }
  if (diff < 7 * day) {
    return `${Math.floor(diff / day)} 天前`;
  }
  return formatDate(isoString);
}
