import type { ReactNode } from 'react';

export type BadgeSourceType = 'old-revision' | 'normal' | 'remark';
export type BadgeCitationStatus = 'complete' | 'missing' | 'partial';
export type BadgeWorkflowStatus =
  | 'pending'
  | 'in-progress'
  | 'reviewing'
  | 'approved'
  | 'rejected';
export type BadgeRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type BadgeVariant =
  | BadgeSourceType
  | BadgeCitationStatus
  | BadgeWorkflowStatus
  | BadgeRiskLevel;

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  'old-revision': 'bg-industrial-50 text-industrial border-industrial-200',
  normal: 'bg-success-50 text-success border-success-200',
  remark: 'bg-purple-50 text-purple-700 border-purple-200',

  complete: 'bg-success-50 text-success border-success-200',
  missing: 'bg-danger-50 text-danger border-danger-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',

  pending: 'bg-gray-50 text-gray-600 border-gray-200',
  'in-progress': 'bg-industrial-50 text-industrial border-industrial-200',
  reviewing: 'bg-warning-50 text-warning border-warning-200',
  approved: 'bg-success-50 text-success border-success-200',
  rejected: 'bg-danger-50 text-danger border-danger-200',

  low: 'bg-success-50 text-success border-success-200',
  medium: 'bg-warning-50 text-warning border-warning-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-danger-50 text-danger border-danger-200',
};

const variantLabels: Record<BadgeVariant, string> = {
  'old-revision': '旧版修正',
  normal: '正常',
  remark: '口头备注',

  complete: '引用完整',
  missing: '引用缺失',
  partial: '部分引用',

  pending: '待处理',
  'in-progress': '处理中',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '已驳回',

  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '严重风险',
};

const Badge = ({ variant = 'normal', children, className = '' }: BadgeProps) => {
  const styles = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${styles} ${className}`}
      title={variantLabels[variant]}
    >
      {children || variantLabels[variant]}
    </span>
  );
};

export const SourceBadge = ({
  type,
  children,
}: {
  type: BadgeSourceType;
  children?: ReactNode;
}) => <Badge variant={type}>{children}</Badge>;

export const CitationBadge = ({
  status,
  children,
}: {
  status: BadgeCitationStatus;
  children?: ReactNode;
}) => <Badge variant={status}>{children}</Badge>;

export const WorkflowBadge = ({
  status,
  children,
}: {
  status: BadgeWorkflowStatus;
  children?: ReactNode;
}) => <Badge variant={status}>{children}</Badge>;

export const RiskBadge = ({
  level,
  children,
}: {
  level: BadgeRiskLevel;
  children?: ReactNode;
}) => <Badge variant={level}>{children}</Badge>;

export default Badge;
