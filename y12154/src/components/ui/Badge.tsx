import React from 'react';
import { cn } from '../../lib/utils';
import { ABNORMAL_LEVEL_COLORS, ABNORMAL_LEVEL_LABELS } from '../../utils/constants';
import type { AbnormalLevel, BadRowErrorType } from '../../types';
import { BAD_ROW_ERROR_LABELS } from '../../utils/constants';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}) => {
  const variantClasses: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-gray-50 text-gray-600 border-gray-200',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md border',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

interface AbnormalLevelBadgeProps {
  level: AbnormalLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AbnormalLevelBadge: React.FC<AbnormalLevelBadgeProps> = ({
  level,
  showLabel = true,
  size = 'md',
}) => {
  const color = ABNORMAL_LEVEL_COLORS[level];
  const label = ABNORMAL_LEVEL_LABELS[level] || level;

  const variantMap: Record<AbnormalLevel, 'success' | 'warning' | 'danger' | 'danger'> = {
    normal: 'success',
    warning: 'warning',
    serious: 'danger',
    overload: 'danger',
  };

  return (
    <Badge variant={variantMap[level]} size={size}>
      <span
        className={cn('w-2 h-2 rounded-full mr-1.5', size === 'sm' && 'w-1.5 h-1.5', size === 'lg' && 'w-2.5 h-2.5')}
        style={{ backgroundColor: color }}
      />
      {showLabel && label}
    </Badge>
  );
};

interface BadRowTypeBadgeProps {
  types: BadRowErrorType[];
  size?: 'sm' | 'md' | 'lg';
}

export const BadRowTypeBadge: React.FC<BadRowTypeBadgeProps> = ({ types, size = 'sm' }) => {
  const variantMap: Record<BadRowErrorType, 'warning' | 'danger' | 'info' | 'neutral'> = {
    empty: 'neutral',
    missing_col: 'warning',
    invalid_value: 'danger',
    remark: 'info',
  };

  return (
    <div className="flex flex-wrap gap-1">
      {types.map(type => (
        <Badge key={type} variant={variantMap[type]} size={size}>
          {BAD_ROW_ERROR_LABELS[type] || type}
        </Badge>
      ))}
    </div>
  );
};
