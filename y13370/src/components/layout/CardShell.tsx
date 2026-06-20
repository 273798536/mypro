import React from 'react';

interface CardShellProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: 'amber' | 'danger' | 'emerald' | 'info' | 'none';
  glow?: boolean;
}

const accentStyles: Record<string, string> = {
  amber: 'before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-amber before:via-amber/60 before:to-transparent',
  danger: 'before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-danger before:via-danger/60 before:to-transparent',
  emerald: 'before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-emerald before:via-emerald/60 before:to-transparent',
  info: 'before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-gradient-to-r before:from-info before:via-info/60 before:to-transparent',
  none: ''
};

export const CardShell: React.FC<CardShellProps> = ({
  children, title, subtitle, actions, className = '', bodyClassName = '', accent = 'none', glow = false
}) => {
  return (
    <div
      className={`card-surface relative ${accentStyles[accent]} ${glow ? 'glow-ring-amber' : ''} ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-border-default">
          <div className="min-w-0">
            {typeof title === 'string' ? (
              <h3 className="text-[14px] font-bold text-primary tracking-wide">{title}</h3>
            ) : title}
            {subtitle && <p className="text-[11px] text-muted mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </div>
  );
};
