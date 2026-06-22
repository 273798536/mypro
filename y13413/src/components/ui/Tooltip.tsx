import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
  };

  const arrowPosition = {
    top: 'top-full',
    bottom: 'bottom-full',
  };

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <>
          <div
            className={cn(
              'absolute left-1/2 -translate-x-1/2 z-50',
              positionStyles[position]
            )}
          >
            <div className="relative px-3 py-1.5 bg-ink-800 text-white text-xs rounded-sm whitespace-nowrap shadow-parchment-lg animate-fade-in">
              {content}
              <div
                className={cn(
                  'absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-ink-800 rotate-45',
                  arrowPosition[position],
                  position === 'top' ? 'mt-[-4px]' : 'mb-[-4px]'
                )}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Tooltip;
