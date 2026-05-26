import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  headerRight?: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ children, title, className = '', headerRight }) => {
  return (
    <div className={`bg-dispatch-panel border border-dispatch-border rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-dispatch-border flex items-center justify-between">
          <h3 className="font-mono font-semibold text-dispatch-text text-sm">{title}</h3>
          {headerRight}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
};
