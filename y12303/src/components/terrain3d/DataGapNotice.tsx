import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function DataGapNotice() {
  const [isExpanded, setIsExpanded] = useState(true);
  const dataGaps = useAppStore((state) => state.dataGaps);
  const cracks = useAppStore((state) => state.cracks);

  const threeDIssues = dataGaps.filter((gap) => gap.affects3D);
  const hasIssues = threeDIssues.length > 0;

  if (!hasIssues || !isExpanded) {
    return (
      <div className="absolute top-4 right-4 z-10">
        {hasIssues && (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 bg-status-gap/20 border border-status-gap/50 rounded-lg text-status-gap hover:bg-status-gap/30 transition-colors"
          >
            <AlertTriangle className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-10 w-72 bg-status-gap/10 border border-status-gap/50 rounded-lg overflow-hidden backdrop-blur-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-status-gap/20 border-b border-status-gap/30">
        <div className="flex items-center gap-2 text-status-gap">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">数据缺口警告</span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 hover:bg-status-gap/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
        <p className="text-xs text-slate-400 mb-2">
          以下数据问题可能影响3D地形显示的准确性：
        </p>
        {threeDIssues.map((gap) => {
          const crack = cracks.find((c) => c.id === gap.crackId);
          return (
            <div
              key={gap.id}
              className="p-2 bg-slate-800/50 rounded border border-status-gap/30"
            >
              <p className="text-xs text-status-gap font-medium">{gap.description}</p>
              {crack && (
                <p className="text-xs text-slate-500 mt-1">
                  影响: {crack.name} (高程: {crack.z}m)
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 bg-slate-800/30 border-t border-status-gap/30">
        <p className="text-xs text-slate-500">
          ⚠️ 3D画面已保留原始数据，未进行修正渲染
        </p>
      </div>
    </div>
  );
}
