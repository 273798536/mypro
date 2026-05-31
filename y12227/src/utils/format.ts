export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getExceptionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    missing_tag: '标签缺失',
    cross_project: '资源串项目',
    refund_occupied: '退款占用',
  };
  return labels[type] || type;
};

export const getExceptionStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    ignored: '已忽略',
  };
  return labels[status] || status;
};

export const getImportStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    uploading: '上传中',
    uploaded: '已上传',
    validating: '校验中',
    success: '成功',
    failed: '失败',
  };
  return labels[status] || status;
};

export const getEntryTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    recharge: '充值',
    consume: '消耗',
    refund: '退款',
  };
  return labels[type] || type;
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
