import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  bordered = true,
  ...props
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm',
        bordered && 'border border-slate-200',
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn('pb-4 mb-4 border-b border-slate-200', className)}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className }) => {
  return (
    <h3 className={cn('text-lg font-semibold text-slate-900', className)}>
      {children}
    </h3>
  );
};

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className }) => {
  return (
    <p className={cn('text-sm text-slate-500 mt-1', className)}>
      {children}
    </p>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => {
  return <div className={cn('', className)}>{children}</div>;
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('pt-4 mt-4 border-t border-slate-200', className)}>
      {children}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: { value: number; isPositive: boolean; direction?: string };
  color?: 'blue' | 'green' | 'amber' | 'red';
  action?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  trend,
  color = 'blue',
  action,
  className,
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  const iconBgClass = iconBg || colorClasses[color];
  const iconColorClass = iconColor || '';

  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <p
              className={cn(
                'text-xs mt-2 font-medium',
                trend.isPositive ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {icon && (
            <div className={cn('p-3 rounded-lg', iconBgClass, iconColorClass)}>
              {icon}
            </div>
          )}
          {action}
        </div>
      </div>
    </Card>
  );
};
