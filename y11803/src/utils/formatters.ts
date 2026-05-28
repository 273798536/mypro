export function formatCurrency(amount: number, currency: string = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(isoString));
}

export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoString));
}

export function maskPhone(phone: string): string {
  if (phone.length <= 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

export function generateId(prefix: string = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    frozen: '已冻结',
    processed: '已处理',
    failed: '处理失败',
    active: '进行中',
    completed: '已完成',
    suspended: '已暂停',
    reconciled: '已对账',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800 border-blue-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    frozen: 'bg-amber-100 text-amber-800 border-amber-200',
    processed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    active: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    suspended: 'bg-orange-100 text-orange-800 border-orange-200',
    reconciled: 'bg-purple-100 text-purple-800 border-purple-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    create: '创建退款单',
    status_update: '状态更新',
    amount_correction: '金额修正',
    note_add: '添加备注',
    duplicate_mark: '标记重复退款',
    cross_batch_freeze: '跨批次冻结',
    overdraft_warning: '透支预警',
    unfreeze: '解除冻结',
    export: '导出数据',
  };
  return labels[action] || action;
}
