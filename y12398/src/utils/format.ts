export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getStatusText(status: string): string {
  const map: Record<string, string> = {
    'in_stock': '在库',
    'borrowed': '借出中',
    'damaged': '损坏待修',
    'anomaly': '异常'
  };
  return map[status] || status;
}

export function getRecordStatusText(status: string): string {
  const map: Record<string, string> = {
    'borrowed': '借出中',
    'returned': '已归还',
    'overdue': '已逾期'
  };
  return map[status] || status;
}

export function getAnomalyTypeText(type: string): string {
  const map: Record<string, string> = {
    'duplicate_borrow': '重复借出',
    'damage_unrecorded': '损坏未记',
    'overdue_return': '归还超时',
    'inventory_mismatch': '账实不符'
  };
  return map[type] || type;
}

export function getEvidenceTypeText(type: string): string {
  const map: Record<string, string> = {
    'device_note': '设备备注',
    'borrow_record': '借出记录',
    'return_record': '归还记录',
    'damage_photo': '损坏照片',
    'inventory_snapshot': '盘点快照'
  };
  return map[type] || type;
}

export function getSeverityText(severity: string): string {
  const map: Record<string, string> = {
    'high': '高',
    'medium': '中',
    'low': '低'
  };
  return map[severity] || severity;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    'in_stock': 'bg-emerald-100 text-emerald-800',
    'borrowed': 'bg-blue-100 text-blue-800',
    'damaged': 'bg-rose-100 text-rose-800',
    'anomaly': 'bg-amber-100 text-amber-800'
  };
  return map[status] || 'bg-slate-100 text-slate-800';
}

export function getRecordStatusColor(status: string): string {
  const map: Record<string, string> = {
    'borrowed': 'bg-blue-100 text-blue-800',
    'returned': 'bg-emerald-100 text-emerald-800',
    'overdue': 'bg-rose-100 text-rose-800'
  };
  return map[status] || 'bg-slate-100 text-slate-800';
}

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    'high': 'bg-rose-500',
    'medium': 'bg-amber-500',
    'low': 'bg-blue-500'
  };
  return map[severity] || 'bg-slate-500';
}

export function getSeverityBgColor(severity: string): string {
  const map: Record<string, string> = {
    'high': 'bg-rose-50 border-rose-200',
    'medium': 'bg-amber-50 border-amber-200',
    'low': 'bg-blue-50 border-blue-200'
  };
  return map[severity] || 'bg-slate-50 border-slate-200';
}

export function getAnomalyTypeColor(type: string): string {
  const map: Record<string, string> = {
    'duplicate_borrow': 'bg-rose-100 text-rose-800',
    'damage_unrecorded': 'bg-orange-100 text-orange-800',
    'overdue_return': 'bg-amber-100 text-amber-800',
    'inventory_mismatch': 'bg-purple-100 text-purple-800'
  };
  return map[type] || 'bg-slate-100 text-slate-800';
}
