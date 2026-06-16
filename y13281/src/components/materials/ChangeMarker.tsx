import { Clock } from 'lucide-react';
import { useMaterialChangeLogs } from '../../store/useAppStore';

interface ChangeMarkerProps {
  materialId: string;
}

export function ChangeMarker({ materialId }: ChangeMarkerProps) {
  const changeLogs = useMaterialChangeLogs(materialId);

  if (changeLogs.length === 0) {
    return (
      <div className="text-sm text-slate-400 py-4 text-center">
        暂无变更记录
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-600" />
      <div className="space-y-4">
        {changeLogs.map((log, index) => (
          <div key={log.id} className="relative">
            <div
              className={`
                absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2
                ${index === 0 ? 'bg-rose-500 border-rose-400' : 'bg-slate-600 border-slate-500'}
              `}
            />
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-slate-200 bg-slate-600/80 px-2 py-0.5 rounded">
                  {log.field}
                </span>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{log.changedAt}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-1">旧值</div>
                  <div className="text-slate-300 bg-slate-800/60 px-2 py-1.5 rounded line-through opacity-70">
                    {log.oldValue}
                  </div>
                </div>
                <div className="text-rose-400 font-bold text-lg">→</div>
                <div className="flex-1">
                  <div className="text-xs text-emerald-400 mb-1">新值</div>
                  <div className="text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1.5 rounded">
                    {log.newValue}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
