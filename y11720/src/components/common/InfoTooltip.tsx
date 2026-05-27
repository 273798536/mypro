import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function InfoTooltip({ content, position = 'top' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg max-w-xs whitespace-normal`}
        >
          {content}
          <div
            className={`absolute ${
              position === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 border-t-gray-900'
                : position === 'bottom'
                ? 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900'
                : position === 'left'
                ? 'left-full top-1/2 -translate-y-1/2 border-l-gray-900'
                : 'right-full top-1/2 -translate-y-1/2 border-r-gray-900'
            } border-4 border-transparent`}
          />
        </div>
      )}
    </div>
  );
}
