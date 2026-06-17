import type { TicketStatus, EvaluationType, JudgmentResult } from '../types';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: TicketStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    pending: { label: '待处理', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    processed: { label: '已处理', className: 'bg-green-100 text-green-700 border-green-200' },
    need_evidence: { label: '需补证据', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    duplicate: { label: '重复评测', className: 'bg-red-100 text-red-700 border-red-200' },
  };

  const { label, className } = config[status];

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      className
    )}>
      {label}
    </span>
  );
}

interface EvaluationTypeBadgeProps {
  type: EvaluationType;
}

export function EvaluationTypeBadge({ type }: EvaluationTypeBadgeProps) {
  const config = {
    normal: { label: '正常评测', className: 'bg-blue-100 text-blue-700' },
    supplementary: { label: '后补备注', className: 'bg-purple-100 text-purple-700' },
    duplicate: { label: '重复提交', className: 'bg-red-100 text-red-700' },
    version_update: { label: '版本更新', className: 'bg-cyan-100 text-cyan-700' },
  };

  const { label, className } = config[type];

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
      className
    )}>
      {label}
    </span>
  );
}

interface JudgmentBadgeProps {
  judgment: JudgmentResult;
}

export function JudgmentBadge({ judgment }: JudgmentBadgeProps) {
  const config = {
    correct: { label: '正确', className: 'bg-green-500 text-white' },
    incorrect: { label: '错误', className: 'bg-red-500 text-white' },
    uncertain: { label: '待确认', className: 'bg-amber-500 text-white' },
  };

  const { label, className } = config[judgment];

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium",
      className
    )}>
      {label}
    </span>
  );
}
