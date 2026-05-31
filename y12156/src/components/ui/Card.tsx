import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      'bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden',
      className
    )}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function CardHeader({ children, className, onClick }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-b border-slate-200 flex items-center justify-between',
        onClick && 'cursor-pointer hover:bg-slate-50 transition-colors',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn(
      'text-lg font-semibold text-slate-800',
      className
    )}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn(
      'text-sm text-slate-500 mt-1',
      className
    )}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn(
      'px-6 py-4 border-t border-slate-200 bg-slate-50',
      className
    )}>
      {children}
    </div>
  );
}
