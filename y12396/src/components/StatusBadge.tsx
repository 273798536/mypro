interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  normal: { label: '正常', bg: 'bg-correction-green/15', text: 'text-correction-green', dot: 'bg-correction-green' },
  conflict: { label: '冲突', bg: 'bg-conflict-red/15', text: 'text-conflict-red', dot: 'bg-conflict-red' },
  corrected: { label: '已修正', bg: 'bg-amber-primary/15', text: 'text-amber-primary', dot: 'bg-amber-primary' },
  pending: { label: '待处理', bg: 'bg-pending-yellow/15', text: 'text-pending-yellow', dot: 'bg-pending-yellow' },
  flagged: { label: '已留痕', bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-500' },
  resolved: { label: '已解决', bg: 'bg-correction-green/15', text: 'text-correction-green', dot: 'bg-correction-green' },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
