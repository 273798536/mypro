import { VerificationStatus, STATUS_BG_COLORS, STATUS_TEXT_COLORS, STATUS_LABELS } from '../../types';

interface StatusBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge = ({ status, size = 'md' }: StatusBadgeProps) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${
        STATUS_BG_COLORS[status]
      } ${STATUS_TEXT_COLORS[status]} ${sizeClasses}`}
    >
      <span
        className={`w-2 h-2 rounded-full mr-1.5 ${
          status === 'full'
            ? 'bg-emerald-500'
            : status === 'partial'
            ? 'bg-amber-500'
            : status === 'none'
            ? 'bg-red-500'
            : status === 'adjusted'
            ? 'bg-orange-500'
            : status === 'position_changed'
            ? 'bg-purple-500'
            : 'bg-gray-400'
        }`}
      />
      {STATUS_LABELS[status]}
    </span>
  );
};
