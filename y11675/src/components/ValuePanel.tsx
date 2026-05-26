import { useMemo } from 'react';
import { Eye, EyeOff, Camera, RotateCcw, Activity, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { calculateFieldAtPoint } from '@/utils/physics';
import { Warning } from '@/types';

export function ValuePanel() {
  const {
    charges,
    showFieldLines,
    showEquipotential,
    toggleFieldLines,
    toggleEquipotential,
    selectedSamplePoint,
    warnings,
    dismissWarning
  } = useStore();

  const sampleFieldValue = useMemo(() => {
    if (!selectedSamplePoint) return null;
    return calculateFieldAtPoint(charges, selectedSamplePoint);
  }, [charges, selectedSamplePoint]);

  return (
    <div className="w-72 bg-slate-900/90 backdrop-blur-sm border-l border-slate-700/50 flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          数值面板
        </h2>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-2 block">显示控制</label>
          <div className="space-y-2">
            <button
              onClick={toggleFieldLines}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded transition-colors"
            >
              <span className="text-sm text-slate-300">电场线</span>
              {showFieldLines ? (
                <Eye className="w-4 h-4 text-cyan-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-slate-500" />
              )}
            </button>
            <button
              onClick={toggleEquipotential}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded transition-colors"
            >
              <span className="text-sm text-slate-300">等势面</span>
              {showEquipotential ? (
                <Eye className="w-4 h-4 text-cyan-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {sampleFieldValue && (
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <h3 className="text-xs text-slate-400 mb-2">采样点数值</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">位置</span>
                <span className="font-mono text-slate-300">
                  ({sampleFieldValue.position.x.toFixed(2)}, {sampleFieldValue.position.y.toFixed(2)}, {sampleFieldValue.position.z.toFixed(2)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">电势 V</span>
                <span className={`font-mono ${
                  sampleFieldValue.potential > 0 ? 'text-red-400' : sampleFieldValue.potential < 0 ? 'text-cyan-400' : 'text-slate-400'
                }`}>
                  {sampleFieldValue.potential.toFixed(3)} V
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">电场强度</span>
                <span className="font-mono text-yellow-400">
                  {sampleFieldValue.fieldMagnitude.toFixed(3)} N/C
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-xs">电场方向</span>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400"
                      style={{ width: `${Math.min(100, sampleFieldValue.electricField.x * 50)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    ({sampleFieldValue.electricField.x.toFixed(2)}, {sampleFieldValue.electricField.y.toFixed(2)}, {sampleFieldValue.electricField.z.toFixed(2)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {warnings.filter(w => !w.dismissed).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              警告提示
            </h3>
            {warnings.filter(w => !w.dismissed).map(warning => (
              <WarningItem key={warning.id} warning={warning} onDismiss={() => dismissWarning(warning.id)} />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="p-4 border-t border-slate-700/50 space-y-2">
        <div>
          <label className="text-xs text-slate-400 mb-2 block">等势面颜色图例</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-3 rounded-full bg-gradient-to-r from-cyan-500 via-slate-500 to-red-500" />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>-V</span>
            <span>0</span>
            <span>+V</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WarningItemProps {
  warning: Warning;
  onDismiss: () => void;
}

function WarningItem({ warning, onDismiss }: WarningItemProps) {
  const typeColors = {
    overlap: 'bg-yellow-500/20 border-yellow-500/50',
    divergence: 'bg-red-500/20 border-red-500/50',
    color_warning: 'bg-blue-500/20 border-blue-500/50'
  };

  return (
    <div className={`p-2 rounded border text-xs ${typeColors[warning.type]}`}>
      <div className="flex justify-between items-start gap-2">
        <span className="text-slate-300">{warning.message}</span>
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 flex-shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  );
}
