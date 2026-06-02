const anomalyTypeLabels: Record<string, string> = {
  threshold: '阈值异常',
  trend: '趋势异常',
  spike: '突增异常',
  drop: '突降异常',
  pattern: '模式异常',
  correlation: '关联异常',
};

const severityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
};

const statusLabels: Record<string, string> = {
  open: '待处理',
  investigating: '调查中',
  confirmed: '已确认',
  resolved: '已解决',
  dismissed: '已忽略',
};

const severityColors: Record<string, string> = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
};

export function getAnomalyTypeLabel(type: string): string {
  return anomalyTypeLabels[type] || type;
}

export function getSeverityLabel(severity: string): string {
  return severityLabels[severity] || severity;
}

export function getStatusLabel(status: string): string {
  return statusLabels[status] || status;
}

export function getSeverityColor(severity: string): string {
  return severityColors[severity] || 'text-gray-600 bg-gray-50';
}

export function generateImpactExplanation(anomaly: any): string {
  const type = getAnomalyTypeLabel(anomaly.type);
  const severity = getSeverityLabel(anomaly.severity);
  const param = anomaly.parameter || '未知参数';
  return `检测到${severity}级别的${type}，影响参数：${param}。建议立即进行调查和处理。`;
}
