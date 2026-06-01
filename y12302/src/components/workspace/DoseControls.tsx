import { Eye, EyeOff, Radiation } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getSourceLabel, getSourceColor } from '../../utils/colorUtils';
import { cn } from '../../lib/utils';

export function DoseControls() {
  const {
    doses,
    organs,
    selectedDoseId,
    selectDose,
    toggleDoseVisibility,
    setDoseOpacity,
    setDoseThreshold,
  } = useAppStore();

  const getOrganName = (organId: string) => {
    return organs.find((o) => o.id === organId)?.name || '未知';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-300 mb-4">
        <Radiation size={18} />
        <h3 className="font-semibold text-sm">剂量分布</h3>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
        <div className="text-xs text-slate-400 mb-2">剂量色标</div>
        <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 via-green-400 via-yellow-400 to-red-500" />
        <div className="flex justify-between mt-1 text-xs text-slate-500">
          <span>低</span>
          <span>高</span>
        </div>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {doses.map((dose) => (
          <div
            key={dose.id}
            className={cn(
              'p-3 rounded-lg border transition-all cursor-pointer',
              selectedDoseId === dose.id
                ? 'border-teal-500 bg-teal-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            )}
            onClick={() => selectDose(dose.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Radiation size={14} className="text-amber-400" />
                <span className="text-sm font-medium text-white">
                  {dose.name}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDoseVisibility(dose.id);
                }}
                className="p-1 rounded hover:bg-slate-700 transition-colors"
              >
                {dose.visible ? (
                  <Eye size={14} className="text-teal-400" />
                ) : (
                  <EyeOff size={14} className="text-slate-500" />
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400">{getOrganName(dose.organId)}</span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">{dose.version}</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full text-white',
                getSourceColor(dose.source)
              )}>
                {getSourceLabel(dose.source)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-1.5 bg-slate-700/50 rounded">
                  <div className="text-slate-400">最小</div>
                  <div className="text-white font-medium">{dose.minDose.toFixed(1)}Gy</div>
                </div>
                <div className="text-center p-1.5 bg-slate-700/50 rounded">
                  <div className="text-slate-400">平均</div>
                  <div className="text-white font-medium">{dose.meanDose.toFixed(1)}Gy</div>
                </div>
                <div className="text-center p-1.5 bg-slate-700/50 rounded">
                  <div className="text-slate-400">最大</div>
                  <div className={dose.maxDose > dose.threshold ? 'text-red-400 font-medium' : 'text-white font-medium'}>
                    {dose.maxDose.toFixed(1)}Gy
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>阈值</span>
                  <span>{dose.threshold.toFixed(1)}Gy</span>
                </div>
                <input
                  type="range"
                  min={dose.minDose}
                  max={dose.maxDose}
                  step="0.5"
                  value={dose.threshold}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDoseThreshold(dose.id, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>透明度</span>
                  <span>{Math.round(dose.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={dose.opacity}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDoseOpacity(dose.id, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
