import React from 'react';

interface SourceTooltipProps {
  sourceMaterial: string;
  sourceLine?: string;
  hasIssue?: boolean;
  children: React.ReactNode;
}

export const SourceTooltip: React.FC<SourceTooltipProps> = ({
  sourceMaterial,
  sourceLine,
  hasIssue = false,
  children,
}) => {
  return (
    <div className="relative group inline-block">
      {children}
      <div className={`
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded text-xs
        opacity-0 group-hover:opacity-100 transition-opacity duration-150
        pointer-events-none whitespace-nowrap z-50
        ${hasIssue 
          ? 'bg-red-50 border-2 border-red-500 text-red-800' 
          : 'bg-gray-100 border border-gray-300 text-gray-700'
        }
      `}>
        <div className="font-mono font-bold">来源：{sourceMaterial}</div>
        {sourceLine && <div className="font-mono">{sourceLine}</div>}
        <div className={`
          absolute top-full left-1/2 -translate-x-1/2
          border-4 border-transparent
          ${hasIssue ? 'border-t-red-500' : 'border-t-gray-300'}
        `} />
      </div>
    </div>
  );
};
