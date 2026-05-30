import React, { useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, History } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { cn } from '../../lib/utils';

export const ReplayTimeline: React.FC = () => {
  const {
    gameState,
    isReplaying,
    replayIndex,
    startReplay,
    stopReplay,
    stepReplay,
    jumpToReplayIndex,
    shortCircuitEvents,
  } = useGameStore();

  const { operationLog, timeElapsed, anomalies } = gameState;

  const keyEvents = useMemo(() => {
    const events: { index: number; type: string; timestamp: number; description: string }[] = [];

    operationLog.forEach((op, index) => {
      const typeLabel = op.type === 'repair' ? '修复' : op.type === 'connect' ? '连接' : '隔离';
      events.push({
        index: index + 1,
        type: op.type,
        timestamp: op.timestamp,
        description: `${typeLabel} - ${op.cellId}`,
      });
    });

    shortCircuitEvents.forEach((event, index) => {
      events.push({
        index: operationLog.length + index + 1,
        type: 'short_circuit',
        timestamp: event.timestamp,
        description: `短路扩散 - ${event.diffusionPath.length}个单元`,
      });
    });

    anomalies.forEach((anomaly, index) => {
      if (anomaly.source === 'game') {
        events.push({
          index: operationLog.length + shortCircuitEvents.length + index + 1,
          type: anomaly.type,
          timestamp: anomaly.timestamp,
          description: `异常: ${anomaly.description}`,
        });
      }
    });

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }, [operationLog, shortCircuitEvents, anomalies]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'repair':
        return 'bg-success-green';
      case 'connect':
        return 'bg-power-blue';
      case 'isolate':
        return 'bg-warning-amber';
      case 'short_circuit':
        return 'bg-danger-red';
      case 'low_power':
        return 'bg-warning-amber';
      case 'path_blocked':
        return 'bg-warning-amber';
      default:
        return 'bg-text-muted';
    }
  };

  if (operationLog.length === 0 && !isReplaying) {
    return null;
  }

  return (
    <div className="bg-circuit-card/80 rounded-xl border border-circuit-border p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm text-text-primary flex items-center gap-2">
          <History className="w-4 h-4 text-power-blue" />
          复盘时间轴
        </h3>
        <button
          onClick={isReplaying ? stopReplay : startReplay}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all',
            isReplaying
              ? 'bg-danger-red/20 border-danger-red text-danger-red hover:bg-danger-red/30'
              : 'bg-power-blue/20 border-power-blue text-power-blue hover:bg-power-blue/30'
          )}
        >
          {isReplaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {isReplaying ? '停止复盘' : '开始复盘'}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => jumpToReplayIndex(0)}
          className="p-1.5 rounded-lg border border-circuit-border text-text-secondary hover:text-power-blue hover:border-power-blue transition-all"
          title="回到开始"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => stepReplay('backward')}
          disabled={replayIndex <= 0}
          className={cn(
            'p-1.5 rounded-lg border transition-all',
            replayIndex > 0
              ? 'border-circuit-border text-text-secondary hover:text-power-blue hover:border-power-blue'
              : 'border-circuit-border/50 text-text-muted cursor-not-allowed'
          )}
          title="上一步"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <div className="flex-1 relative">
          <div className="h-2 bg-circuit-border rounded-full overflow-hidden">
            <div
              className="h-full bg-power-blue transition-all duration-200"
              style={{ width: `${(replayIndex / Math.max(operationLog.length, 1)) * 100}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max={operationLog.length}
            value={replayIndex}
            onChange={(e) => jumpToReplayIndex(parseInt(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        <button
          onClick={() => stepReplay('forward')}
          disabled={replayIndex >= operationLog.length}
          className={cn(
            'p-1.5 rounded-lg border transition-all',
            replayIndex < operationLog.length
              ? 'border-circuit-border text-text-secondary hover:text-power-blue hover:border-power-blue'
              : 'border-circuit-border/50 text-text-muted cursor-not-allowed'
          )}
          title="下一步"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono text-text-secondary min-w-[80px] text-right">
          {replayIndex} / {operationLog.length}
        </span>
      </div>

      <div className="relative h-12 overflow-x-auto scrollbar-thin">
        <div className="absolute top-0 bottom-0 left-0 right-0 flex items-center px-2">
          <div className="relative flex items-center gap-1 min-w-full">
            <div className="absolute left-0 right-0 h-0.5 bg-circuit-border top-1/2 -translate-y-1/2" />

            {keyEvents.map((event, i) => (
              <div
                key={i}
                className="relative flex-shrink-0 group"
                style={{
                  left: `${(event.timestamp / Math.max(timeElapsed, 1)) * 100}%`,
                }}
              >
                <div
                  className={cn(
                    'w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-150',
                    getEventColor(event.type),
                    event.index <= replayIndex && 'ring-2 ring-white ring-offset-1 ring-offset-circuit-card'
                  )}
                  title={`${formatTime(event.timestamp)} - ${event.description}`}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-circuit-dark rounded text-[10px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-circuit-border">
                  <div className="text-text-primary">{event.description}</div>
                  <div className="text-text-muted">{formatTime(event.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isReplaying && operationLog[replayIndex - 1] && (
        <div className="mt-2 p-2 bg-circuit-dark/50 rounded-lg border border-circuit-border">
          <div className="text-xs font-mono text-text-secondary">
            <span className="text-text-muted">操作 #{replayIndex}:</span>{' '}
            <span className={cn(
              operationLog[replayIndex - 1].type === 'repair' && 'text-success-green',
              operationLog[replayIndex - 1].type === 'connect' && 'text-power-blue',
              operationLog[replayIndex - 1].type === 'isolate' && 'text-warning-amber',
            )}>
              {operationLog[replayIndex - 1].type === 'repair' ? '修复' :
               operationLog[replayIndex - 1].type === 'connect' ? '连接' : '隔离'}
            </span>{' '}
            {operationLog[replayIndex - 1].cellId}
          </div>
          <div className="text-[10px] font-mono text-text-muted mt-0.5">
            时间: {formatTime(operationLog[replayIndex - 1].timestamp)} | 
            电量快照: {operationLog[replayIndex - 1].powerSnapshot.toFixed(1)}W
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-success-green" />
          <span className="text-text-secondary">修复</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-power-blue" />
          <span className="text-text-secondary">连接</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-warning-amber" />
          <span className="text-text-secondary">隔离/异常</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-danger-red" />
          <span className="text-text-secondary">短路</span>
        </div>
      </div>
    </div>
  );
};
