import { ReactNode, MouseEvent } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  headerAction?: ReactNode;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

export default function Card({ children, title, subtitle, className = '', headerAction, onClick }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {(title || headerAction) && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            {title && <h3 className="font-serif-title font-semibold text-lg text-neutral-dark">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
