export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const formatAmount = (amount: number): string => {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'bg-slate-500 text-slate-50',
    confirmed: 'bg-emerald-500 text-white',
    partial_confirmed: 'bg-amber-500 text-white',
    delayed: 'bg-amber-600 text-white',
    settled: 'bg-emerald-700 text-white',
    reviewing: 'bg-orange-500 text-white',
  };
  return map[status] || 'bg-slate-500 text-white';
};

export const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    pending: '待处理',
    confirmed: '已确认',
    partial_confirmed: '部分确认',
    delayed: '清算顺延',
    settled: '已到账',
    reviewing: '待复核',
  };
  return map[status] || status;
};

export const getSourceTypeText = (type: string): string => {
  const map: Record<string, string> = {
    redemption_application: '赎回申请',
    share_confirmation: '份额确认',
    quota_threshold: '额度阈值',
    settlement_rule: '清算规则',
  };
  return map[type] || type;
};

export const getSourceTypeColor = (type: string): string => {
  const map: Record<string, string> = {
    redemption_application: 'bg-blue-100 text-blue-800 border-blue-200',
    share_confirmation: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    quota_threshold: 'bg-amber-100 text-amber-800 border-amber-200',
    settlement_rule: 'bg-purple-100 text-purple-800 border-purple-200',
  };
  return map[type] || 'bg-slate-100 text-slate-800 border-slate-200';
};

export const getStepStatusIcon = (stepStatus: string): string => {
  const map: Record<string, string> = {
    completed: 'check-circle',
    blocked: 'alert-circle',
    pending: 'circle',
  };
  return map[stepStatus] || 'circle';
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};
