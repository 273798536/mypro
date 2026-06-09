export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatRiskLevel(risk: 'low' | 'medium' | 'high'): string {
  const map = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };
  return map[risk] || risk;
}

export function formatResult(result: 'pass' | 'fail' | 'warning'): string {
  const map = {
    pass: '通过',
    fail: '未通过',
    warning: '警告',
  };
  return map[result] || result;
}

export function formatImportStatus(status: string): string {
  const map: Record<string, string> = {
    new: '新导入',
    duplicate: '重复',
    merged: '已合并',
    success: '成功',
    duplicate_detected: '检测到重复',
    failed: '失败',
  };
  return map[status] || status;
}
