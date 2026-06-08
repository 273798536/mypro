import type { SandboxStatus } from '@/types';
import { getStatusText, getStatusColor } from '@/utils/helpers';

interface StatusBadgeProps {
  status: SandboxStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colorCls = getStatusColor(status);
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-md border font-medium ${colorCls} ${sizeCls}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
        status === 'confirmed' ? 'bg-emerald-400' : status === 'reviewing' ? 'bg-amber-400' : 'bg-space-300'
      }`} />
      {getStatusText(status)}
    </span>
  );
}
