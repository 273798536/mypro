import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
  tone?: 'default' | 'primary';
}

export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  children,
  actions,
  defaultOpen = true,
  className = '',
  bodyClassName = '',
  tone = 'default',
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const headerBg = tone === 'primary' ? 'bg-primary-50/60 border-b-primary-200' : 'bg-gray-50 border-b-gray-200';

  return (
    <div className={['data-card overflow-hidden', className].join(' ')}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-2.5 border-b ${headerBg} transition-colors hover:bg-opacity-80`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {open ? (
            <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">{title}</div>
            {subtitle && <div className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="flex-shrink-0 ml-3">{actions}</div>}
      </button>
      {open && <div className={`p-4 ${bodyClassName}`}>{children}</div>}
    </div>
  );
};
