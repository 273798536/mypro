import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface StatusBadgeProps {
  status: 'ready' | 'needs_review' | 'invalid';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const map = {
    ready: { label: '可直接使用', cls: 'bg-success-100 text-success-700 border-success-200', dot: 'bg-success-500' },
    needs_review: { label: '需安全员复核', cls: 'bg-warning-100 text-warning-700 border-warning-200', dot: 'bg-warning-500' },
    invalid: { label: '无效/坏数据', cls: 'bg-danger-100 text-danger-700 border-danger-200', dot: 'bg-danger-500' },
  } as const;
  const cfg = map[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 border rounded-full font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      cfg.cls,
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot, status === 'needs_review' && 'animate-pulse')} />
      {cfg.label}
    </span>
  );
}

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, icon, extra, children, className }: SectionCardProps) {
  return (
    <section className={cn('card p-5', className)}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="section-title mb-0">
          {icon}<span>{title}</span>
        </h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; to: string };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-4 text-lab-400">{icon}</div>}
      <h3 className="font-serif text-lg font-medium text-lab-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-zinc-500 mb-4 max-w-sm">{description}</p>}
      {action && (
        <Link to={action.to} className="btn-primary">{action.label}</Link>
      )}
    </div>
  );
}
