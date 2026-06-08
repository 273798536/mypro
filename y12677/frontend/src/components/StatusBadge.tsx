import type { RecordStatus } from '../types';

const STATUS_MAP: Record<RecordStatus, { label: string; className: string }> = {
  pending: {
    label: '待复核',
    className: 'bg-warning/15 text-warning border-warning/30'
  },
  reviewed: {
    label: '已复核',
    className: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  approved: {
    label: '已通过',
    className: 'bg-green-100 text-green-700 border-green-300'
  }
};

interface Props {
  status: RecordStatus;
}

export default function StatusBadge({ status }: Props) {
  const cfg = STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'pending' ? 'bg-warning' :
        status === 'reviewed' ? 'bg-blue-500' : 'bg-green-500'
      }`}></span>
      {cfg.label}
    </span>
  );
}
