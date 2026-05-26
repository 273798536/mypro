import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';

export function StatusBar() {
  const currentTime = useSimulationStore(state => state.currentTime);
  const pendulums = useSimulationStore(state => state.pendulums);
  const corrections = useSimulationStore(state => state.corrections);
  const currentStatus = useSimulationStore(state => state.currentStatus);
  const isRunning = useSimulationStore(state => state.isRunning);

  const autoCorrected = corrections.filter(c => c.autoFixed).length;
  const needReview = corrections.filter(c => !c.autoFixed).length;

  return (
    <div className="bg-slate-900/95 border-b border-slate-700/50 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-sm text-slate-400">
              {isRunning ? '运行中' : '已暂停'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-slate-300">
              {pendulums.length} 个摆
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">模拟时间:</span>
            <span className="text-sm font-mono text-cyan-400">
              {currentTime.toFixed(3)}s
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50">
            {currentStatus === 'normal' && (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">系统正常</span>
              </>
            )}
            {currentStatus === 'corrected' && (
              <>
                <CheckCircle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-400">已自动修正</span>
              </>
            )}
            {currentStatus === 'needs_review' && (
              <>
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">需人工确认</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-400">已修正: {autoCorrected}</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400">待确认: {needReview}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
