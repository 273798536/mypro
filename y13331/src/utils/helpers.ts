export const formatDelta = (delta: number): string => {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
};

export const getDeltaColor = (delta: number): string => {
  if (delta > 0) return 'text-accent-green';
  if (delta < 0) return 'text-accent-red';
  return 'text-gray-400';
};

export const getStatusColor = (status: 'active' | 'withdrawn' | 'abnormal'): string => {
  switch (status) {
    case 'active':
      return 'bg-accent-green';
    case 'withdrawn':
      return 'bg-gray-500';
    case 'abnormal':
      return 'bg-accent-red';
    default:
      return 'bg-gray-500';
  }
};

export const getStatusText = (status: 'active' | 'withdrawn' | 'abnormal'): string => {
  switch (status) {
    case 'active':
      return '正常';
    case 'withdrawn':
      return '已撤回';
    case 'abnormal':
      return '异常';
    default:
      return status;
  }
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const cn = (...classes: (string | boolean | undefined)[]): string => {
  return classes.filter(Boolean).join(' ');
};
