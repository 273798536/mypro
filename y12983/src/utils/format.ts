export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN');
};

export const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    fixed: '已修正',
    ignored: '已忽略',
  };
  return map[status] || status;
};

export const severityLabel = (severity: string): string => {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  };
  return map[severity] || severity;
};

export const gapTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    sampling: '采样缺口',
    migration: '迁移问题',
    other: '其他',
  };
  return map[type] || type;
};

export const actionLabel = (action: string): string => {
  const map: Record<string, string> = {
    created: '创建',
    status_changed: '状态变更',
    fixed: '修正',
    concluded: '结论确认',
    snapshot_added: '添加快照',
    permission_added: '添加权限',
    duplicate_detected: '检测到重复',
    merged: '合并记录',
  };
  return map[action] || action;
};

export const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};
