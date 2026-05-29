import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
}

export default function Card({ children, className, title, subtitle, headerAction }: CardProps) {
  return (
    <div className={cn(
      'bg-white border border-gray-200 rounded-md shadow-sm transition-all duration-200',
      'hover:border-gray-300 hover:shadow',
      className
    )}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-gray-800">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}
