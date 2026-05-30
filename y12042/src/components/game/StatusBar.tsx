import React, { useMemo } from 'react';
import { Clock, Battery, Zap, AlertTriangle, Activity } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { cn } from '../../lib/utils';
import { checkCircuitConnectivity } from '../../engine/CircuitSimulator';
import { calculateShortCircuitProgress } from '../../engine/ShortCircuit';

export const StatusBar: React.FC = () => {
  const { gameState, shortCircuitEvents, currentLevel } = useGameStore();
  const { grid, powerNodes, loadNodes, totalPower, consumedPower, timeElapsed, shortCircuitTimer, isPaused, isGameOver, gameResult, anomalies } = gameState;

  const connectivity = useMemo(() => {
    if (grid.length === 0) return { connected: false, poweredCount: 0, loadCount: loadNodes.length };
    const result = checkCircuitConnectivity(grid, powerNodes);
    const poweredLoads = loadNodes.filter(id => result.poweredCells.has(id)).length;
    return {
      connected: result.connected,
      poweredCount: poweredLoads,
      loadCount: loadNodes.length,
      poweredCellsCount: result.poweredCells.size,
    };
  }, [grid, powerNodes, loadNodes]);

  const shortCircuitProgress = useMemo(() => {
    const shortCells = shortCircuitEvents.flatMap(e => [e.startCell, ...e.diffusionPath]);
    const uniqueShortCells = [...new Set(shortCells)];
    return calculateShortCircuitProgress(uniqueShortCells, powerNodes, grid.length * grid[0]?.length || 64);
  }, [shortCircuitEvents, powerNodes, grid]);

  const powerPercentage = Math.max(0, Math.min(100, ((totalPower - consumedPower) / totalPower) * 100));
  const shortCircuitPercentage = (shortCircuitTimer / (currentLevel?.shortCircuitInterval || 3)) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const anomalyCount = anomalies.filter(a => !a.isReviewed).length;

  return (
    <div className="bg-circuit-card/80 rounded-xl border border-circuit-border p-4 backdrop-blur-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-circuit-dark/50 rounded-lg p-3 border border-circuit-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              时间
            </span>
            <span className={cn(
              'font-display text-lg',
              isPaused && 'text-text-muted',
              isGameOver && (gameResult === 'win' ? 'text-success-green' : 'text-danger-red')
            )}>
              {formatTime(timeElapsed)}
            </span>
          </div>
          {isPaused && (
            <div className="text-xs text-warning-amber font-mono">已暂停</div>
          )}
          {isGameOver && (
            <div className={cn(
              'text-xs font-mono',
              gameResult === 'win' ? 'text-success-green' : 'text-danger-red'
            )}>
              {gameResult === 'win' ? '任务完成' : '任务失败'}
            </div>
          )}
        </div>

        <div className="bg-circuit-dark/50 rounded-lg p-3 border border-circuit-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary font-mono flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5" />
              电量
            </span>
            <span className={cn(
              'font-display text-lg',
              powerPercentage > 50 ? 'text-success-green' : powerPercentage > 20 ? 'text-warning-amber' : 'text-danger-red'
            )}>
              {Math.round(powerPercentage)}%
            </span>
          </div>
          <div className="h-2 bg-circuit-border rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                powerPercentage > 50 ? 'bg-success-green' : powerPercentage > 20 ? 'bg-warning-amber' : 'bg-danger-red'
              )}
              style={{ width: `${powerPercentage}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-text-muted font-mono">
            {Math.round(totalPower - consumedPower)} / {totalPower} W
          </div>
        </div>

        <div className="bg-circuit-dark/50 rounded-lg p-3 border border-circuit-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary font-mono flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              连通性
            </span>
            <span className={cn(
              'font-display text-lg',
              connectivity.connected ? 'text-success-green' : 'text-warning-amber'
            )}>
              {connectivity.poweredCount}/{connectivity.loadCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className={cn(
              'w-3.5 h-3.5',
              connectivity.connected ? 'text-success-green animate-pulse' : 'text-text-muted'
            )} />
            <span className="text-xs font-mono">
              {connectivity.connected ? (
                <span className="text-success-green">电路已连通</span>
              ) : (
                <span className="text-warning-amber">未连通</span>
              )}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-text-muted font-mono">
            通电单元: {connectivity.poweredCellsCount}
          </div>
        </div>

        <div className="bg-circuit-dark/50 rounded-lg p-3 border border-circuit-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              短路风险
            </span>
            <span className={cn(
              'font-display text-lg',
              shortCircuitProgress < 0.3 ? 'text-success-green' : shortCircuitProgress < 0.7 ? 'text-warning-amber' : 'text-danger-red'
            )}>
              {Math.round(shortCircuitProgress * 100)}%
            </span>
          </div>
          <div className="h-2 bg-circuit-border rounded-full overflow-hidden">
            <div
              className="h-full bg-danger-red/50 transition-all duration-300 relative"
              style={{ width: `${shortCircuitPercentage}%` }}
            >
              <div className="absolute inset-0 bg-danger-red animate-pulse opacity-50" />
            </div>
          </div>
          {anomalyCount > 0 && (
            <div className="mt-1 text-[10px] text-warning-amber font-mono flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {anomalyCount} 条异常待复核
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
