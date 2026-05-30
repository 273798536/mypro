import { AlertTriangle, CheckCircle, Navigation, Anchor, Crosshair } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { RecordStatus } from '../../types';

const statusConfig: Record<RecordStatus | 'all', { label: string; color: string; bgColor: string }> = {
  normal: { label: '正常', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  warning: { label: '预警', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  danger: { label: '危险', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  all: { label: '全部', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

export function StabilityPanel() {
  const selectedRecord = useAppStore((state) => state.getSelectedRecord());

  if (!selectedRecord) return null;

  const { stability } = selectedRecord;
  const status = statusConfig[selectedRecord.status];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">稳性计算</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
          {stability.isStable ? (
            <span className="flex items-center gap-1">
              <CheckCircle size={12} />
              稳性良好
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertTriangle size={12} />
              不稳
            </span>
          )}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
          <div className="p-2 bg-slate-700 rounded-lg">
            <Crosshair size={16} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-400">重心坐标 (m)</div>
            <div className="font-mono text-sm text-slate-200">
              X: {stability.centerOfGravity.x.toFixed(2)} | 
              Y: {stability.centerOfGravity.y.toFixed(2)} | 
              Z: {stability.centerOfGravity.z.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Navigation size={14} className="text-amber-400" />
              <span className="text-xs text-slate-400">横倾角</span>
            </div>
            <div className={`font-mono text-lg ${Math.abs(stability.heelAngle) > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
              {stability.heelAngle.toFixed(1)}°
            </div>
            <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${Math.abs(stability.heelAngle) > 5 ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(Math.abs(stability.heelAngle) / 10 * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Anchor size={14} className="text-blue-400" />
              <span className="text-xs text-slate-400">纵倾角</span>
            </div>
            <div className={`font-mono text-lg ${Math.abs(stability.trimAngle) > 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {stability.trimAngle.toFixed(1)}°
            </div>
            <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${Math.abs(stability.trimAngle) > 3 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(Math.abs(stability.trimAngle) / 5 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">初稳性高度 GM</span>
            <span className={`font-mono text-lg ${stability.metacentricHeight < 0.5 ? 'text-red-400' : stability.metacentricHeight < 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {stability.metacentricHeight.toFixed(2)} m
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden relative">
            <div className="absolute left-0 top-0 h-full w-1/3 bg-red-500/30" />
            <div className="absolute left-1/3 top-0 h-full w-1/3 bg-amber-500/30" />
            <div className="absolute left-2/3 top-0 h-full w-1/3 bg-emerald-500/30" />
            <div 
              className="absolute top-0 h-full w-1 bg-white rounded-full transition-all"
              style={{ left: `${Math.min(stability.metacentricHeight / 2 * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>危险</span>
            <span>安全</span>
          </div>
        </div>

        {stability.warnings.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-red-400">
              <AlertTriangle size={14} />
              <span className="text-sm font-medium">预警信息</span>
            </div>
            <ul className="space-y-1">
              {stability.warnings.map((warning, index) => (
                <li key={index} className="text-xs text-red-300 flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
