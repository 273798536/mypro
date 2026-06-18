import type { ChangeType } from '../../shared/types';
import { getChangeTypeBadge } from '../utils/formatters';
import { Plus, Edit3, Trash2, PenLine } from 'lucide-react';

interface ChangeTypeBadgeProps {
  type: ChangeType;
  showIcon?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plus,
  Edit3,
  Trash2,
  PenLine,
};

export function ChangeTypeBadge({ type, showIcon = true }: ChangeTypeBadgeProps) {
  const config = getChangeTypeBadge(type);
  const IconComponent = iconMap[config.icon];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {showIcon && IconComponent && <IconComponent className="w-3 h-3" />}
      {config.label}
    </span>
  );
}
