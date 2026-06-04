import { cn } from '@/lib/utils';
import type { SampleStatus, DetectionResultType, DeviceStatus } from '@/types';

interface StatusBadgeProps {
  status: SampleStatus | DetectionResultType | DeviceStatus;
  type?: 'sample' | 'detection' | 'device';
}

export function StatusBadge({ status, type = 'sample' }: StatusBadgeProps) {
  const getStyles = {
    sample: {
      success: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      bad: 'bg-red-100 text-red-800 border-red-200'
    },
    detection: {
      pass: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      fail: 'bg-red-100 text-red-800 border-red-200'
    },
    device: {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      maintenance: 'bg-orange-100 text-orange-800 border-orange-200'
    }
  };

  const getLabels = {
    sample: {
      success: '顺利',
      pending: '待确认',
      bad: '坏数据'
    },
    detection: {
      pass: '通过',
      warning: '待确认',
      fail: '不通过'
    },
    device: {
      active: '运行中',
      inactive: '停用',
      maintenance: '维护中'
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getStyles[type][status as keyof typeof getStyles[typeof type]]
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
      {getLabels[type][status as keyof typeof getLabels[typeof type]]}
    </span>
  );
}
