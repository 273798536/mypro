import { useState } from 'react';
import { AlertCircle, Info } from 'lucide-react';

interface ReasonTooltipProps {
  reasons: string[];
  status: 'normal' | 'pending' | 'error' | 'incomplete';
}

export function ReasonTooltip({ reasons, status }: ReasonTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const iconColor = status === 'normal' ? 'text-emerald-500' :
    status === 'pending' ? 'text-amber-500' :
    status === 'error' ? 'text-red-500' : 'text-slate-400';

  const Icon = status === 'normal' ? Info : AlertCircle;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className={`p-1 rounded hover:bg-slate-100 transition-colors ${iconColor}`}
      >
        <Icon className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-white rounded-lg shadow-lg border border-slate-200">
          <div className="text-xs font-medium text-slate-700 mb-2">状态说明</div>
          <ul className="space-y-1">
            {reasons.map((reason, index) => (
              <li key={index} className="text-xs text-slate-600 flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
