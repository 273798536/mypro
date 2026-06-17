export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  if (sameDay) return `今天 ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${time}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
};

export const formatDateFull = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

export const sourceTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    online_ticket: "线上工单",
    anomaly: "异常样本",
    supplement: "后补说明",
  };
  return map[type] ?? type;
};

export const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    pending: "待处理",
    confirmed: "已确认",
    revoked: "已撤回",
  };
  return map[status] ?? status;
};

export const actionTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    confirm: "确认改判",
    revoke: "撤回操作",
    modify: "修改摘要",
  };
  return map[type] ?? type;
};

export const uid = (prefix = "id"): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const weightColorClass = (weight: number): string => {
  if (weight >= 1.8) return "bg-crimson-500";
  if (weight >= 1.2) return "bg-amber-500";
  if (weight >= 0.6) return "bg-navy-400";
  return "bg-moss-400";
};

export const weightTextClass = (weight: number): string => {
  if (weight >= 1.8) return "text-crimson-700";
  if (weight >= 1.2) return "text-amber-700";
  if (weight >= 0.6) return "text-navy-700";
  return "text-moss-700";
};

export const diffWords = (
  before: string,
  after: string
): { beforeHtml: string; afterHtml: string } => {
  const a = before.split(/(\s+|[,，。！？!?；;、])/);
  const b = after.split(/(\s+|[,，。！？!?；;、])/);
  const tokenize = (arr: string[]) =>
    arr.filter((t) => t.trim().length > 0 || /^\s+$/.test(t));
  const ta = tokenize(a);
  const tb = tokenize(b);
  const setA = new Set(ta.map((t) => t.trim()));
  const setB = new Set(tb.map((t) => t.trim()));
  const beforeHtml = ta
    .map((t) => {
      const trimmed = t.trim();
      if (!trimmed) return t;
      if (!setB.has(trimmed))
        return `<span class="text-diff-removed">${t}</span>`;
      return t;
    })
    .join("");
  const afterHtml = tb
    .map((t) => {
      const trimmed = t.trim();
      if (!trimmed) return t;
      if (!setA.has(trimmed))
        return `<span class="text-diff-added">${t}</span>`;
      return t;
    })
    .join("");
  return { beforeHtml, afterHtml };
};

export const downloadJSON = (data: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
