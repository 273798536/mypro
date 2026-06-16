import { statusLabelMap, actionLabelMap, exceptionTypeLabelMap } from '@/data/mockData';
import type { LedgerStatus, ActionType, ExceptionType } from '@/types';

interface StatusBadgeProps {
  status: LedgerStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusLabelMap[status] || statusLabelMap.pending;
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

interface ActionBadgeProps {
  action: ActionType;
}

export function ActionBadge({ action }: ActionBadgeProps) {
  const colorMap: Record<ActionType, string> = {
    merge: 'bg-blue-100 text-blue-700',
    withdraw: 'bg-red-100 text-red-700',
    confirm: 'bg-green-100 text-green-700',
    skip: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorMap[action]}`}>
      {actionLabelMap[action]}
    </span>
  );
}

interface ExceptionTypeBadgeProps {
  type: ExceptionType;
}

export function ExceptionTypeBadge({ type }: ExceptionTypeBadgeProps) {
  const colorMap: Record<ExceptionType, string> = {
    old_override_new: 'bg-orange-100 text-orange-700',
    same_street_complaints: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorMap[type]}`}>
      {exceptionTypeLabelMap[type]}
    </span>
  );
}
