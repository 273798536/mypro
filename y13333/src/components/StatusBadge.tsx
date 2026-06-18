import type { PlaybackStatus } from '@shared/types';

interface StatusBadgeProps {
  status: PlaybackStatus | 'withdrawn';
  showText?: boolean;
}

const statusConfig: Record<PlaybackStatus | 'withdrawn', { label: string; className: string }> = {
  pending: { label: '待处理', className: 'status-pending' },
  processing: { label: '处理中', className: 'status-processing' },
  approved: { label: '已放行', className: 'status-approved' },
  need_evidence: { label: '待补证', className: 'status-need_evidence' },
  withdrawn: { label: '已撤回', className: 'status-withdrawn' },
};

function StatusBadge({ status, showText = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={`status-badge ${config.className}`}>
      {showText && config.label}
    </span>
  );
}

export default StatusBadge;
