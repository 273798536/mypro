import { History, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function CorrectionLog() {
  const { corrections, buildings } = useAppStore();

  if (corrections.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500">
        <History size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无修正记录</p>
      </div>
    );
  }

  const getTargetName = (targetType: string, targetId: string) => {
    if (targetType === 'building') {
      const building = buildings.find(b => b.id === targetId);
      return building?.name || targetId;
    }
    return targetId;
  };

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
      {[...corrections].reverse().map((correction) => (
        <div
          key={correction.id}
          className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="text-xs text-slate-400">
              {getTargetName(correction.targetType, correction.targetId)}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {new Date(correction.timestamp).toLocaleString()}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-300 font-mono">{correction.field}</span>
            <ArrowRight size={12} className="text-slate-500" />
            <span className="text-red-400 font-mono line-through">{correction.oldValue}</span>
            <span className="text-green-400 font-mono">{correction.newValue}</span>
          </div>
          
          <div className="mt-1 text-xs text-slate-500">
            原因: {correction.reason}
          </div>
        </div>
      ))}
    </div>
  );
}
