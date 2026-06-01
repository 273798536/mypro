import { Eye, EyeOff, Layers } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getSourceLabel, getSourceColor } from '../../utils/colorUtils';
import { cn } from '../../lib/utils';

export function OrganList() {
  const {
    organs,
    selectedOrganId,
    selectOrgan,
    toggleOrganVisibility,
    setOrganOpacity,
  } = useAppStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-300 mb-4">
        <Layers size={18} />
        <h3 className="font-semibold text-sm">器官模型</h3>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {organs.map((organ) => (
          <div
            key={organ.id}
            className={cn(
              'p-3 rounded-lg border transition-all cursor-pointer',
              selectedOrganId === organ.id
                ? 'border-teal-500 bg-teal-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            )}
            onClick={() => selectOrgan(organ.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: organ.color }}
                />
                <span className="text-sm font-medium text-white">
                  {organ.name}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOrganVisibility(organ.id);
                }}
                className="p-1 rounded hover:bg-slate-700 transition-colors"
              >
                {organ.visible ? (
                  <Eye size={14} className="text-teal-400" />
                ) : (
                  <EyeOff size={14} className="text-slate-500" />
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400">{organ.version}</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full text-white',
                getSourceColor(organ.source)
              )}>
                {getSourceLabel(organ.source)}
              </span>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>透明度</span>
                <span>{Math.round(organ.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={organ.opacity}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setOrganOpacity(organ.id, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
