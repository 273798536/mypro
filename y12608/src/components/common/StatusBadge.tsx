import { AnnotationType, AnnotationStatus } from '../../types';

interface StatusBadgeProps {
  type: AnnotationType;
  size?: 'sm' | 'md';
}

export function StatusBadge({ type, size = 'md' }: StatusBadgeProps) {
  const configs = {
    normal: {
      bg: 'bg-status-normal/10',
      text: 'text-status-normal',
      label: '正常'
    },
    abnormal: {
      bg: 'bg-status-abnormal/10',
      text: 'text-status-abnormal',
      label: '异常'
    },
    pending: {
      bg: 'bg-status-pending/10',
      text: 'text-status-pending',
      label: '待确认'
    }
  };

  const config = configs[type];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      <span className={`w-2 h-2 rounded-full mr-1.5 ${type === 'normal' ? 'bg-status-normal' : type === 'abnormal' ? 'bg-status-abnormal' : 'bg-status-pending'}`}></span>
      {config.label}
    </span>
  );
}

interface AnnotationStatusBadgeProps {
  status: AnnotationStatus;
}

export function AnnotationStatusBadge({ status }: AnnotationStatusBadgeProps) {
  const configs = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: '草稿' },
    confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: '已确认' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '已拒绝' }
  };

  const config = configs[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
