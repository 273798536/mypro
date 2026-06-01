import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AnomalyType, AnomalySeverity } from '@/types';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'blue' | 'orange' | 'red' | 'green' | 'purple' | 'yellow';
  size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', ...props }, ref) => {
    const variants = {
      default: 'bg-industrial-border text-industrial-text border border-industrial-border-light',
      blue: 'anomaly-badge anomaly-badge-speed',
      orange: 'anomaly-badge anomaly-badge-temp',
      red: 'anomaly-badge anomaly-badge-power',
      green: 'bg-green-500/20 text-green-400 border border-green-500/50',
      purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/50',
      yellow: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
    };

    return (
      <span
        ref={ref}
        className={cn('anomaly-badge', variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

interface AnomalyBadgeProps extends BadgeProps {
  type: AnomalyType;
}

export const AnomalyBadge = React.forwardRef<HTMLSpanElement, AnomalyBadgeProps>(
  ({ type, className, ...props }, ref) => {
    const variantMap: Record<AnomalyType, BadgeProps['variant']> = {
      speed_missing: 'blue',
      temp_overlimit: 'orange',
      power_reverse: 'red',
    };

    const labelMap: Record<AnomalyType, string> = {
      speed_missing: '转速缺采',
      temp_overlimit: '温升超限',
      power_reverse: '功率反号',
    };

    return (
      <Badge ref={ref} variant={variantMap[type]} className={className} {...props}>
        {labelMap[type]}
      </Badge>
    );
  }
);

AnomalyBadge.displayName = 'AnomalyBadge';

interface SeverityBadgeProps extends BadgeProps {
  severity: AnomalySeverity;
}

export const SeverityBadge = React.forwardRef<HTMLSpanElement, SeverityBadgeProps>(
  ({ severity, className, ...props }, ref) => {
    const variantMap: Record<AnomalySeverity, BadgeProps['variant']> = {
      warning: 'yellow',
      error: 'orange',
      critical: 'red',
    };

    const labelMap: Record<AnomalySeverity, string> = {
      warning: '警告',
      error: '错误',
      critical: '严重',
    };

    return (
      <Badge ref={ref} variant={variantMap[severity]} className={className} {...props}>
        {labelMap[severity]}
      </Badge>
    );
  }
);

SeverityBadge.displayName = 'SeverityBadge';
