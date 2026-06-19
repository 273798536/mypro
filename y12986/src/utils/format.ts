export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(2) + 's';
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const remainSec = sec % 60;
  return `${min}m${remainSec}s`;
}

export function getSeverityLabel(severity: string): string {
  const map: Record<string, string> = {
    high: '高风险',
    medium: '中风险',
    low: '低风险',
  };
  return map[severity] || severity;
}

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return map[severity] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getExceptionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    index_invalid: '索引失效',
    permission_missing: '权限缺失',
    schema_changed: '表结构变更',
    data_inconsistent: '数据不一致',
  };
  return map[type] || type;
}

export function getExceptionTypeColor(type: string): string {
  const map: Record<string, string> = {
    index_invalid: 'bg-orange-100 text-orange-700 border-orange-200',
    permission_missing: 'bg-rose-100 text-rose-700 border-rose-200',
    schema_changed: 'bg-violet-100 text-violet-700 border-violet-200',
    data_inconsistent: 'bg-sky-100 text-sky-700 border-sky-200',
  };
  return map[type] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getRecordStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    reviewing: '复核中',
    confirmed: '已确认',
  };
  return map[status] || status;
}

export function getRecordStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600 border-gray-200',
    reviewing: 'bg-blue-100 text-blue-700 border-blue-200',
    confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return map[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getStatusDotColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-gray-400',
    reviewing: 'bg-blue-500',
    confirmed: 'bg-emerald-500',
  };
  return map[status] || 'bg-gray-400';
}

export function getIndexStatusLabel(status: string): string {
  const map: Record<string, string> = {
    valid: '正常',
    invalid: '失效',
    missing: '缺失',
  };
  return map[status] || status;
}

export function getIndexStatusColor(status: string): string {
  const map: Record<string, string> = {
    valid: 'text-emerald-600',
    invalid: 'text-orange-600',
    missing: 'text-rose-600',
  };
  return map[status] || 'text-gray-600';
}

export function getReviewActionLabel(type: string): string {
  const map: Record<string, string> = {
    rerun: '重复运行',
    backfill: '补录数据',
    manual_confirm: '人工确认',
  };
  return map[type] || type;
}

export function getTaskStatusLabel(status: string): string {
  const map: Record<string, string> = {
    processing: '处理中',
    completed: '已完成',
    pending: '待处理',
  };
  return map[status] || status;
}

export function getTaskStatusColor(status: string): string {
  const map: Record<string, string> = {
    processing: 'text-blue-600',
    completed: 'text-emerald-600',
    pending: 'text-gray-500',
  };
  return map[status] || 'text-gray-500';
}

export function getChangeTypeLabel(type: string): string {
  const map: Record<string, string> = {
    add: '新增',
    remove: '删除',
    modify: '修改',
  };
  return map[type] || type;
}

export function getChangeTypeBadgeClass(type: string): string {
  const map: Record<string, string> = {
    add: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    remove: 'bg-red-100 text-red-700 border-red-200',
    modify: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return map[type] || 'bg-gray-100';
}

export function shortId(id: string, len: number = 8): string {
  return id.length > len ? id.substring(0, len) + '...' : id;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(-4);
}
