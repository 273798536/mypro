import React from 'react';
import { Wrench, Link2, Ban, Pause, Play, RotateCcw, Save, Package } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { cn } from '../../lib/utils';
import type { OperationMode } from '../../engine/types';

export const ControlPanel: React.FC = () => {
  const {
    gameState,
    setOperationMode,
    pauseGame,
    resumeGame,
    restartGame,
    saveGame,
    currentLevel,
  } = useGameStore();

  const { operationMode, isPaused, isGameOver, repairKits } = gameState;

  const modeButtons: { mode: OperationMode; icon: React.ReactNode; label: string; description: string }[] = [
    {
      mode: 'repair',
      icon: <Wrench className="w-5 h-5" />,
      label: '修复',
      description: '点击故障单元进行修复',
    },
    {
      mode: 'connect',
      icon: <Link2 className="w-5 h-5" />,
      label: '连接',
      description: '选择两个单元建立连接',
    },
    {
      mode: 'isolate',
      icon: <Ban className="w-5 h-5" />,
      label: '隔离',
      description: '切断单元与电路的连接',
    },
  ];

  return (
    <div className="bg-circuit-card/80 rounded-xl border border-circuit-border p-4 backdrop-blur-sm">
      <h3 className="font-display text-lg text-text-primary mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-power-blue" />
        控制面板
      </h3>

      <div className="space-y-4">
        <div>
          <p className="text-xs text-text-secondary mb-2 font-mono">操作模式</p>
          <div className="grid grid-cols-3 gap-2">
            {modeButtons.map(({ mode, icon, label, description }) => (
              <button
                key={mode}
                onClick={() => !isGameOver && !isPaused && setOperationMode(mode)}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200',
                  'hover:brightness-110 active:scale-95',
                  operationMode === mode
                    ? 'bg-power-blue/20 border-power-blue shadow-neon-blue'
                    : 'bg-circuit-dark/50 border-circuit-border hover:border-power-blue/50',
                  (isGameOver || isPaused) && 'opacity-50 cursor-not-allowed'
                )}
                title={description}
              >
                <div className={cn(
                  'mb-1',
                  operationMode === mode ? 'text-power-blue' : 'text-text-secondary'
                )}>
                  {icon}
                </div>
                <span className={cn(
                  'text-xs font-mono',
                  operationMode === mode ? 'text-power-blue' : 'text-text-secondary'
                )}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-circuit-dark/50 rounded-lg p-3 border border-circuit-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary font-mono">维修工具</span>
            <span className={cn(
              'font-display text-lg',
              repairKits > 2 ? 'text-success-green' : repairKits > 0 ? 'text-warning-amber' : 'text-danger-red'
            )}>
              {repairKits}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-circuit-border rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                repairKits > 2 ? 'bg-success-green' : repairKits > 0 ? 'bg-warning-amber' : 'bg-danger-red'
              )}
              style={{ width: `${(repairKits / (currentLevel?.repairKits || 5)) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <p className="text-xs text-text-secondary mb-2 font-mono">游戏控制</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={isPaused ? resumeGame : pauseGame}
              disabled={isGameOver}
              className={cn(
                'flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-all',
                'font-mono text-sm',
                isPaused
                  ? 'bg-success-green/20 border-success-green text-success-green hover:bg-success-green/30'
                  : 'bg-warning-amber/20 border-warning-amber text-warning-amber hover:bg-warning-amber/30',
                isGameOver && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? '继续' : '暂停'}
            </button>

            <button
              onClick={restartGame}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-circuit-border bg-circuit-dark/50 text-text-secondary hover:border-power-blue hover:text-power-blue transition-all font-mono text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              重开
            </button>
          </div>

          <button
            onClick={saveGame}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-power-blue/50 bg-power-blue/10 text-power-blue hover:bg-power-blue/20 transition-all font-mono text-sm"
          >
            <Save className="w-4 h-4" />
            保存游戏
          </button>
        </div>

        {currentLevel && (
          <div className="bg-circuit-dark/50 rounded-lg p-3 border border-circuit-border">
            <p className="text-xs font-display text-power-blue mb-1">{currentLevel.name}</p>
            <p className="text-xs text-text-secondary">{currentLevel.description}</p>
            <div className="mt-2 flex gap-2">
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-mono',
                currentLevel.difficulty === 'easy' && 'bg-success-green/20 text-success-green',
                currentLevel.difficulty === 'medium' && 'bg-warning-amber/20 text-warning-amber',
                currentLevel.difficulty === 'hard' && 'bg-danger-red/20 text-danger-red'
              )}>
                {currentLevel.difficulty === 'easy' ? '初级' : currentLevel.difficulty === 'medium' ? '中级' : '高级'}
              </span>
              <span className="text-xs text-text-muted font-mono">
                {currentLevel.gridSize.width}×{currentLevel.gridSize.height}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
