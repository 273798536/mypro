import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export function DataGapNotice() {
  const { dataGaps } = useAppStore();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || dataGaps.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 right-4 z-20">
      <div className="bg-amber-900/80 backdrop-blur-sm border border-amber-600/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-amber-300 font-semibold text-sm mb-2">
              数据说明
            </h4>
            <ul className="space-y-1">
              {dataGaps.map((gap, index) => (
                <li key={index} className="text-amber-200/80 text-xs flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
