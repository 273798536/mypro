export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 30) {
    return formatDate(dateString);
  }
  if (diffDays > 0) {
    return `${diffDays}天前`;
  }
  if (diffHours > 0) {
    return `${diffHours}小时前`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}分钟前`;
  }
  return '刚刚';
};

export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    approved: '已放行',
    rejected: '已驳回',
    leak_suspected: '疑似泄漏',
    active: '进行中',
    reverted: '已回退',
    resolved: '已解决',
  };
  return statusMap[status] || status;
};

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    approved: 'bg-status-success/10 text-status-success border-status-success/30',
    rejected: 'bg-status-error/10 text-status-error border-status-error/30',
    leak_suspected: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    active: 'bg-status-error/10 text-status-error border-status-error/30',
    reverted: 'bg-status-info/10 text-status-info border-status-info/30',
    resolved: 'bg-status-success/10 text-status-success border-status-success/30',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-600 border-gray-200';
};

export const getImpactLabel = (level: string): string => {
  const labelMap: Record<string, string> = {
    high: '高影响',
    medium: '中影响',
    low: '低影响',
  };
  return labelMap[level] || level;
};

export const getImpactColor = (level: string): string => {
  const colorMap: Record<string, string> = {
    high: 'bg-status-error/10 text-status-error',
    medium: 'bg-status-warning/10 text-status-warning',
    low: 'bg-status-info/10 text-status-info',
  };
  return colorMap[level] || 'bg-gray-100 text-gray-600';
};

export const getPriorityLabel = (priority: string): string => {
  const labelMap: Record<string, string> = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级',
  };
  return labelMap[priority] || priority;
};

export const getPriorityColor = (priority: string): string => {
  const colorMap: Record<string, string> = {
    high: 'text-status-error',
    medium: 'text-status-warning',
    low: 'text-status-info',
  };
  return colorMap[priority] || 'text-gray-500';
};

export const getEventTypeLabel = (type: string): string => {
  const labelMap: Record<string, string> = {
    sample_version: '样本版本',
    withdrawal: '撤回记录',
    note: '备注',
    status_change: '状态变更',
    report: '报告',
  };
  return labelMap[type] || type;
};

export const getEventTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    sample_version: 'bg-accent-blue-500',
    withdrawal: 'bg-status-error',
    note: 'bg-status-info',
    status_change: 'bg-status-warning',
    report: 'bg-deep-blue-500',
  };
  return colorMap[type] || 'bg-gray-400';
};
