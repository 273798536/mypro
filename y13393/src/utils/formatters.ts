export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const formatCurrency = (num: number): string => {
  return `¥${formatNumber(num)}`;
};

export const formatPercent = (num: number): string => {
  return `${num.toFixed(1)}%`;
};

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return formatDate(isoString);
};

export const getStatusColor = (status: 'normal' | 'warning' | 'error'): string => {
  const colors: Record<string, string> = {
    normal: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-red-400'
  };
  return colors[status] || colors.normal;
};

export const getStatusBgColor = (status: 'normal' | 'warning' | 'error'): string => {
  const colors: Record<string, string> = {
    normal: 'bg-emerald-500/10 border-emerald-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    error: 'bg-red-500/10 border-red-500/30'
  };
  return colors[status] || colors.normal;
};

export const getStatusLabel = (status: 'normal' | 'warning' | 'error'): string => {
  const labels: Record<string, string> = {
    normal: '正常',
    warning: '警告',
    error: '异常'
  };
  return labels[status] || status;
};

export const getDecisionLabel = (decision: 'approve' | 'reject' | 'pending'): string => {
  const labels: Record<string, string> = {
    approve: '通过',
    reject: '驳回',
    pending: '待处理'
  };
  return labels[decision] || decision;
};

export const getDecisionColor = (decision: 'approve' | 'reject' | 'pending'): string => {
  const colors: Record<string, string> = {
    approve: 'text-emerald-400',
    reject: 'text-red-400',
    pending: 'text-amber-400'
  };
  return colors[decision] || colors.pending;
};
