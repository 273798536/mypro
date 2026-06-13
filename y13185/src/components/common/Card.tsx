import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  className?: string;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  footer?: ReactNode;
  bordered?: boolean;
  onClick?: () => void;
}

export const Card = ({
  className,
  children,
  title,
  subtitle,
  icon,
  headerRight,
  footer,
  bordered = true,
  onClick,
}: CardProps) => {
  return (
    <div 
      className={cn(
        'bg-white rounded-lg shadow-sm',
        bordered && 'border border-gray-200',
        'transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {(title || icon || headerRight) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {icon && <div className="text-[#0F3460]">{icon}</div>}
            <div>
              {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerRight}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
      {footer && (
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
};

export const CardGrid = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn('grid gap-4 md:gap-6', className)}>
    {children}
  </div>
);
