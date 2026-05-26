export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getLedgerTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    recharge: '充值',
    consume: '消费',
    refund: '退卡',
    bonus: '赠送金',
    adjust: '调整',
    reverse: '撤销',
  };
  return labels[type] || type;
}

export function getLedgerTypeColor(type: string): string {
  const colors: Record<string, string> = {
    recharge: 'text-emerald-600',
    consume: 'text-red-600',
    refund: 'text-orange-600',
    bonus: 'text-gold-600',
    adjust: 'text-blue-600',
    reverse: 'text-purple-600',
  };
  return colors[type] || 'text-gray-600';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: '正常',
    frozen: '冻结',
    refunded: '已退卡',
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    frozen: 'bg-gray-100 text-gray-800',
    refunded: 'bg-orange-100 text-orange-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getExceptionWarning(type: string): string {
  const warnings: Record<string, string> = {
    consume_after_refund: '退卡后消费',
    cross_store_reverse: '跨店撤单',
    bonus_over_limit: '赠送金超限',
  };
  return warnings[type] || '异常操作';
}

export function getPriorityLabel(priority: string): string {
  return priority === 'bonus_first' ? '先扣赠送金' : '先扣本金';
}
