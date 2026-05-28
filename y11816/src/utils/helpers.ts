export function formatDate(timestamp: number, format: string = "YYYY-MM-DD HH:mm:ss"): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return format
    .replace("YYYY", String(year))
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
}

export function formatCurrency(amount: number, currency: string = "¥"): string {
  return `${currency}${amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateId(prefix: string = ""): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

export function formatTicketType(type: string): string {
  const map: Record<string, string> = {
    group_buy: "团购券",
    membership: "会员券",
    channel: "渠道券",
  };
  return map[type] || type;
}

export function formatAnomalyType(type: string): string {
  const map: Record<string, string> = {
    duplicate_redemption: "重复核销",
    cross_cinema: "跨影院使用",
    fee_version_mismatch: "服务费版本错",
  };
  return map[type] || type;
}

export function formatAnomalyStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "待处理",
    confirmed: "确认异常",
    released: "已放行",
  };
  return map[status] || status;
}

export function formatImportSource(source: string): string {
  const map: Record<string, string> = {
    ticket_code: "票券码",
    redemption_record: "核销记录",
    channel_contract: "渠道合同",
  };
  return map[source] || source;
}

export function formatBatchStatus(status: string): string {
  const map: Record<string, string> = {
    imported: "已导入",
    processing: "处理中",
    reviewing: "复核中",
    exported: "已导出",
  };
  return map[status] || status;
}

export function formatSeverity(severity: string): string {
  const map: Record<string, string> = {
    high: "高",
    medium: "中",
    low: "低",
  };
  return map[severity] || severity;
}

export function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const result: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] ?? "";
    });
    result.push(obj);
  }

  return result;
}

export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16);
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function getMonthPeriod(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getMonthStartEnd(yearMonth: string): [number, number] {
  const [year, month] = yearMonth.split("-").map(Number);
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
  return [start, end];
}
