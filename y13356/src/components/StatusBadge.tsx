import type { SnapshotStatus, ChangeType, JudgmentResult } from '@/types';
import { statusMap, changeTypeMap, judgmentResultMap } from '@/utils/status';
import { AlertTriangle, CheckCircle, Clock, XCircle, Plus, Minus, Edit2 } from 'lucide-react';

interface StatusBadgeProps {
  status: SnapshotStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusMap[status];
  
  const iconMap: Record<SnapshotStatus, React.ReactNode> = {
    pending: <Clock className="w-3.5 h-3.5" />,
    approved: <CheckCircle className="w-3.5 h-3.5" />,
    need_supplement: <AlertTriangle className="w-3.5 h-3.5" />,
    gray_error: <XCircle className="w-3.5 h-3.5" />,
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  };
  
  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
    >
      {iconMap[status]}
      {config.label}
    </span>
  );
};

interface ChangeTypeBadgeProps {
  type: ChangeType;
  size?: 'sm' | 'md';
}

export const ChangeTypeBadge: React.FC<ChangeTypeBadgeProps> = ({ type, size = 'sm' }) => {
  if (type === 'none') {
    return null;
  }
  
  const config = changeTypeMap[type];
  
  const iconMap: Record<ChangeType, React.ReactNode> = {
    none: <Minus className="w-3 h-3" />,
    added: <Plus className="w-3 h-3" />,
    removed: <XCircle className="w-3 h-3" />,
    modified: <Edit2 className="w-3 h-3" />,
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  };
  
  const bgColorMap: Record<ChangeType, string> = {
    none: 'bg-slate-100 text-slate-600',
    added: 'bg-emerald-50 text-emerald-700',
    removed: 'bg-red-50 text-red-700',
    modified: 'bg-blue-50 text-blue-700',
  };
  
  return (
    <span
      className={`inline-flex items-center font-medium rounded-md ${bgColorMap[type]} ${sizeClasses[size]}`}
    >
      {iconMap[type]}
      {config.label}
    </span>
  );
};

interface JudgmentBadgeProps {
  result: JudgmentResult;
  size?: 'sm' | 'md';
}

export const JudgmentBadge: React.FC<JudgmentBadgeProps> = ({ result, size = 'md' }) => {
  const config = judgmentResultMap[result];
  
  const iconMap: Record<JudgmentResult, React.ReactNode> = {
    pass: <CheckCircle className="w-4 h-4" />,
    need_supplement: <AlertTriangle className="w-4 h-4" />,
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1.5 gap-2',
  };
  
  return (
    <span
      className={`inline-flex items-center font-medium rounded-lg border ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
    >
      {iconMap[result]}
      {config.label}
    </span>
  );
};

interface GrayErrorBadgeProps {
  hasError: boolean;
  size?: 'sm' | 'md';
}

export const GrayErrorBadge: React.FC<GrayErrorBadgeProps> = ({ hasError, size = 'sm' }) => {
  if (!hasError) {
    return null;
  }
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };
  
  return (
    <span
      className={`inline-flex items-center font-medium rounded-md bg-red-100 text-red-700 border border-red-200 ${sizeClasses[size]} animate-pulse`}
    >
      <AlertTriangle className="w-3 h-3 mr-1" />
      灰度错误
    </span>
  );
};
