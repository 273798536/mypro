import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  bodyClassName?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  actions,
  bodyClassName = '',
  noPadding = false,
}) => {
  return (
    <div className={['data-card', className].join(' ')}>
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1 leading-tight">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : `p-4 ${bodyClassName}`}>{children}</div>
    </div>
  );
};
