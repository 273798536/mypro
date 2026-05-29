import { Layers, AlertTriangle, Box, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useYardStore } from '@/store/yardStore';

export function StatusBar() {
  const { rehandleCount, conflicts, containers, jobs, isImpactMode, impactAnalysis } = useYardStore();

  const openConflicts = conflicts.filter(c => c.status === 'open').length;
  const criticalConflicts = conflicts.filter(c => c.status === 'open' && c.severity === 'critical').length;
  const hazardousContainers = containers.filter(c => c.isHazardous).length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const totalJobs = jobs.length;
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  return (
    <div className="h-10 bg-yard-darker/95 border-t border-yard-light/30 flex items-center px-4 gap-6 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-accent-orange" />
        <span className="text-xs text-neutral-gray">翻箱次数:</span>
        <span className="text-sm text-neutral-light font-mono font-bold">
          {rehandleCount}
        </span>
        {isImpactMode && impactAnalysis && (
          <span className={`text-xs font-mono ${
            impactAnalysis.rehandleCountChange > 0 ? 'text-accent-red' : 
            impactAnalysis.rehandleCountChange < 0 ? 'text-accent-green' : 'text-neutral-gray'
          }`}>
            ({impactAnalysis.rehandleCountChange > 0 ? '+' : ''}{impactAnalysis.rehandleCountChange})
          </span>
        )}
      </div>

      <div className="h-5 w-px bg-yard-light/30" />

      <div className="flex items-center gap-2">
        <AlertTriangle className={`w-4 h-4 ${criticalConflicts > 0 ? 'text-accent-red animate-pulse' : 'text-neutral-gray'}`} />
        <span className="text-xs text-neutral-gray">冲突:</span>
        <span className={`text-sm font-mono font-bold ${
          criticalConflicts > 0 ? 'text-accent-red' : 'text-neutral-light'
        }`}>
          {openConflicts}
        </span>
        {criticalConflicts > 0 && (
          <span className="text-xs text-accent-red">
            (严重 {criticalConflicts})
          </span>
        )}
      </div>

      <div className="h-5 w-px bg-yard-light/30" />

      <div className="flex items-center gap-2">
        <Box className="w-4 h-4 text-accent-red" />
        <span className="text-xs text-neutral-gray">危险品:</span>
        <span className="text-sm text-accent-red font-mono font-bold">
          {hazardousContainers}
        </span>
      </div>

      <div className="h-5 w-px bg-yard-light/30" />

      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-accent-green" />
        <span className="text-xs text-neutral-gray">作业完成率:</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-yard-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-green transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <span className="text-sm text-neutral-light font-mono font-bold">
            {completionRate}%
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {isImpactMode && (
        <div className="flex items-center gap-2 bg-accent-orange/20 px-3 py-1 rounded">
          <TrendingUp className="w-4 h-4 text-accent-orange" />
          <span className="text-xs text-accent-orange font-medium">
            影响分析模式
          </span>
          {impactAnalysis && (
            <span className="text-xs text-neutral-gray">
              影响 {impactAnalysis.affectedContainers.length} 个集装箱
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-accent-green" />
        <span className="text-xs text-neutral-gray">数据同步:</span>
        <span className="text-xs text-accent-green font-mono">
          正常
        </span>
      </div>
    </div>
  );
}
