import { useState } from 'react';
import { AlertTriangle, X, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useSandboxStore } from '../../store/useSandboxStore';

export function DataGapWarning() {
  const { dataGaps, showDataGaps, toggleDataGaps } = useSandboxStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!showDataGaps || dataGaps.length === 0) {
    return (
      <button
        onClick={toggleDataGaps}
        className="absolute top-4 right-4 z-10 p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-600/50 transition-colors"
        title="显示数据缺口提示"
      >
        <Info className="w-4 h-4 text-slate-400" />
      </button>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-10 w-72 bg-amber-500/10 border border-amber-500/30 rounded-lg backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-amber-500/5 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300">数据缺口提示</span>
          <span className="px-1.5 py-0.5 bg-amber-500/20 rounded text-xs text-amber-400">
            {dataGaps.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-amber-500/10 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-amber-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-400" />
            )}
          </button>
          <button
            onClick={toggleDataGaps}
            className="p-1 hover:bg-amber-500/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
          <p className="text-xs text-amber-200/70 mb-2">
            以下数据缺口可能影响3D渲染的准确性，请在复核时注意：
          </p>
          {dataGaps.map((gap) => (
            <div
              key={gap.id}
              className={`p-2 rounded border ${
                gap.severity === 'error'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle
                  className={`w-3 h-3 ${
                    gap.severity === 'error' ? 'text-red-400' : 'text-amber-400'
                  }`}
                />
                <span className="text-xs font-medium text-amber-300">
                  {gap.type}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mb-1">{gap.description}</p>
              <div className="flex flex-wrap gap-1">
                {gap.affectedAreas.map((area) => (
                  <span
                    key={area}
                    className="px-1.5 py-0.5 bg-amber-500/10 rounded text-xs text-amber-400 font-mono"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isExpanded && (
        <div className="p-2">
          <p className="text-xs text-amber-200/60 truncate">
            {dataGaps[0]?.description}
            {dataGaps.length > 1 && ` 及其他 ${dataGaps.length - 1} 项`}
          </p>
        </div>
      )}
    </div>
  );
}
