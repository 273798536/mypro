interface StatusBadgeProps {
  status: 'active' | 'expired' | 'expiring_soon' | 'normal' | 'warning' | 'danger';
  label?: string;
}

const statusConfig = {
  active: { bg: 'bg-success/20', text: 'text-success', label: '正常' },
  expired: { bg: 'bg-danger/20', text: 'text-danger', label: '已过期' },
  expiring_soon: { bg: 'bg-warning/20', text: 'text-warning', label: '即将过期' },
  normal: { bg: 'bg-success/20', text: 'text-success', label: '正常' },
  warning: { bg: 'bg-warning/20', text: 'text-warning', label: '警告' },
  danger: { bg: 'bg-danger/20', text: 'text-danger', label: '危险' },
};

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {label || config.label}
    </span>
  );
};
