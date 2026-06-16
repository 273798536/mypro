export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getRelativeTime = (isoString: string): string => {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return formatDate(isoString);
};

export const getStatusText = (status: 'pending' | 'merged' | 'abnormal'): string => {
  const map = {
    pending: '待归并',
    merged: '已归并',
    abnormal: '有异常',
  };
  return map[status];
};

export const getDataSourceTypeText = (type: 'meeting_minutes' | 'attachment' | 'verbal_note'): string => {
  const map = {
    meeting_minutes: '会议纪要',
    attachment: '附件材料',
    verbal_note: '口头备注',
  };
  return map[type];
};

export const getAbnormalTypeText = (type: 'old_version' | 'late_arrival' | 'conflict'): string => {
  const map = {
    old_version: '旧版记录',
    late_arrival: '晚到材料',
    conflict: '意见冲突',
  };
  return map[type];
};

export const getFieldText = (field: 'remark' | 'status' | 'mergedFeedback'): string => {
  const map = {
    remark: '归并备注',
    status: '状态',
    mergedFeedback: '归并结论',
  };
  return map[field];
};
