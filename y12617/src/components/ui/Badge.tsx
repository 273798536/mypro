import React from 'react';
import type { AnnotationType, AnnotationStatus } from '../../types/annotation';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-orange-100 text-orange-700',
    danger: 'bg-red-100 text-red-700',
    neutral: 'bg-neutral-100 text-neutral-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

const ANNOTATION_TYPE_VARIANTS: Record<AnnotationType, BadgeProps['variant']> = {
  boundary_error: 'danger',
  collision_miss: 'warning',
  missing_unit: 'warning',
  duplicate: 'info',
  normal: 'success',
  other: 'neutral',
};

const ANNOTATION_TYPE_LABELS: Record<AnnotationType, string> = {
  boundary_error: '边界误判',
  collision_miss: '碰撞漏标',
  missing_unit: '单位缺失',
  duplicate: '重复标注',
  normal: '正常标注',
  other: '其他问题',
};

const STATUS_VARIANTS: Record<AnnotationStatus, BadgeProps['variant']> = {
  draft: 'warning',
  confirmed: 'success',
  pending_review: 'primary',
  merged: 'neutral',
};

const STATUS_LABELS: Record<AnnotationStatus, string> = {
  draft: '草稿',
  confirmed: '已确认',
  pending_review: '待审核',
  merged: '已合并',
};

export const AnnotationTypeBadge: React.FC<{ type: AnnotationType }> = ({ type }) => (
  <Badge variant={ANNOTATION_TYPE_VARIANTS[type]}>
    {ANNOTATION_TYPE_LABELS[type]}
  </Badge>
);

export const AnnotationStatusBadge: React.FC<{ status: AnnotationStatus }> = ({ status }) => (
  <Badge variant={STATUS_VARIANTS[status]}>
    {STATUS_LABELS[status]}
  </Badge>
);
