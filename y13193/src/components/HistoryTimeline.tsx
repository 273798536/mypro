import { useAppStore } from '../store/useAppStore';
import { History, CheckCircle, Plus, Settings, RotateCcw, Upload, GitCompare } from 'lucide-react';

export function HistoryTimeline() {
  const { history, actions: { confirmVersion, revertToHistory } } = useAppStore();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'import': return <Upload className="w-3.5 h-3.5" />;
      case 'add_sample': return <Plus className="w-3.5 h-3.5" />;
      case 'param_change': return <Settings className="w-3.5 h-3.5" />;
      case 'confirm': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'revert': return <RotateCcw className="w-3.5 h-3.5" />;
      case 'compare': return <GitCompare className="w-3.5 h-3.5" />;
      default: return <History className="w-3.5 h-3.5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'import': return 'bg-blue-500 text-blue-100';
      case 'add_sample': return 'bg-orange-500 text-orange-100';
      case 'param_change': return 'bg-cyan-500 text-cyan-100';
      case 'confirm': return 'bg-emerald-500 text-emerald-100';
      case 'revert': return 'bg-amber-500 text-amber-100';
      case 'compare': return 'bg-violet-500 text-violet-100';
      default: return 'bg-slate-500 text-slate-100';
    }
  };

  const handleConfirm = () => {
    confirmVersion('评审会前确认：当前归因结果有效');
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          变更历史
        </h3>
        <button
          onClick={handleConfirm}
          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300
            border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors
            flex items-center gap-1.5"
        >
          <CheckCircle className="w-3 h-3" />
          确认版本
        </button>
      </div>

      <div className="p-4 max-h-64 overflow-y-auto">
        <div className="relative">
          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-slate-700" />

          <div className="space-y-4">
            {[...history].reverse().map((record) => (
              <div key={record.id} className="relative flex gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                  getTypeColor(record.type)
                }`}>
                  {getTypeIcon(record.type)}
                </div>

                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm text-slate-200 font-medium">
                        {record.description}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {record.timestamp} · {record.operator}
                      </div>
                    </div>

                    {record.afterSnapshot && record.type !== 'confirm' && (
                      <button
                        onClick={() => revertToHistory(record.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg text-slate-400
                          hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                        title="回退到此版本"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {record.afterSnapshot && (
                    <div className="mt-2 p-2 rounded-lg bg-slate-900/50 border border-slate-700/30">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500">总误差</span>
                        <span className={`font-mono font-medium ${
                          record.afterSnapshot.isWithinTolerance
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}>
                          {record.afterSnapshot.totalError >= 0 ? '+' : ''}
                          {record.afterSnapshot.totalError.toFixed(3)} mΩ
                        </span>
                        <span className={`text-[11px] font-mono ${
                          record.afterSnapshot.isWithinTolerance
                            ? 'text-emerald-400/70'
                            : 'text-rose-400/70'
                        }`}>
                          ({record.afterSnapshot.totalErrorPercentage >= 0 ? '+' : ''}
                          {record.afterSnapshot.totalErrorPercentage.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
