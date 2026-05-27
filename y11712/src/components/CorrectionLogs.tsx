import { History, ArrowRight } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';

export default function CorrectionLogs() {
  const { correctionLogs } = useSimulationStore();
  const recentLogs = correctionLogs.slice(-10).reverse();

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        <History size={14} className="text-slate-400" />
        <h3 className="text-sm font-medium text-slate-200">修改痕迹</h3>
      </div>

      {recentLogs.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">暂无修改记录</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentLogs.map((log) => (
            <div key={log.id} className="bg-slate-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                <span className="text-slate-300 font-medium">{log.fieldName}</span>
                <ArrowRight size={10} />
                <span>{new Date(log.correctedAt).toLocaleTimeString('zh-CN')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-400 font-mono">{log.oldValue}</span>
                <ArrowRight size={10} className="text-slate-600" />
                <span className="text-emerald-400 font-mono">{log.newValue}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{log.source}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
