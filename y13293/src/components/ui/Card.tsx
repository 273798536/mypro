import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({ children, className, title, subtitle, action }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-sm shadow-sm',
        className,
      )}
    >
      {(title || action) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="font-serif text-base font-semibold text-slate-800">{title}</h3>
            )}
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
