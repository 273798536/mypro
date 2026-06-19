import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function Card({ children, className, title, subtitle, action }: CardProps) {
  return (
    <div
      className={cn(
        'bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
