export const formatCurrency = (amount: number, currency: string = 'CNY'): string => {
  const formatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });
  return formatter.format(amount);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    verified: '已审核',
    rejected: '已拒绝',
    supplementary: '待补充',
    completed: '已完成',
    issued: '已开票',
    reversed: '已冲红',
    paid: '已收款',
    active: '有效',
    expired: '已过期',
    terminated: '已终止',
    approved: '已批准',
  };
  return statusMap[status] || status;
};

export const getRecordTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    normal: '正常',
    sales_supplement: '销售补报',
    correction: '金额调整',
  };
  return typeMap[type] || type;
};

export const getVerificationResultLabel = (result: string): string => {
  const resultMap: Record<string, string> = {
    pass: '通过',
    fail: '不通过',
    need_evidence: '需补充材料',
  };
  return resultMap[result] || result;
};

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    verified: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    supplementary: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    issued: 'bg-blue-100 text-blue-800',
    reversed: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-gray-100 text-gray-800',
    terminated: 'bg-red-100 text-red-800',
    approved: 'bg-green-100 text-green-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
};

export const getRecordTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    normal: 'bg-gray-100 text-gray-800',
    sales_supplement: 'bg-purple-100 text-purple-800',
    correction: 'bg-blue-100 text-blue-800',
  };
  return colorMap[type] || 'bg-gray-100 text-gray-800';
};
