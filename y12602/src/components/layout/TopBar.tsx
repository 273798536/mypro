import React from 'react';
import { Play, Pause, RotateCcw, Flag, History, Undo2, Redo2, Clock, Hash } from 'lucide-react';
import { useGameFlow } from '@/hooks/useGameFlow';
import { useActionLog } from '@/hooks/useActionLog';
import { useAppStore } from '@/store/useAppStore';

export const TopBar: React.FC = () => {
  const gameFlow = useGameFlow();
  const actionLog = useActionLog();
  const startReplay = useAppStore(state => state.startReplay);

  return (
    <div className="bg-primary text-white px-6 py-3 flex items-center justify-between shadow-medium">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏫</span>
          <h1 className="text-xl font-bold">校园逃生路线板</h1>
        </div>
        
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
          <Hash size={16} />
          <span className="text-sm">第 {gameFlow.currentRound} 局</span>
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
          <Clock size={16} />
          <span className="text-sm font-mono">{gameFlow.formattedTime}</span>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${gameFlow.statusColor.replace('text-', 'bg-').replace('success', 'success/20 text-success').replace('warning', 'warning/20 text-warning').replace('primary', 'primary-light/30 text-white')}`}>
          <span className={`w-2 h-2 rounded-full ${gameFlow.status === 'playing' ? 'bg-success animate-pulse' : gameFlow.status === 'paused' ? 'bg-warning' : 'bg-neutral-400'}`} />
          <span className="text-sm font-medium">{gameFlow.statusText}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={actionLog.undo}
          disabled={!actionLog.canUndo}
          className="btn btn-ghost !text-white !bg-white/10 hover:!bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 size={18} />
          <span className="text-sm">撤销</span>
        </button>

        <button
          onClick={actionLog.redo}
          disabled={!actionLog.canRedo}
          className="btn btn-ghost !text-white !bg-white/10 hover:!bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
          title="重做 (Ctrl+Y)"
        >
          <Redo2 size={18} />
          <span className="text-sm">重做</span>
        </button>

        <div className="w-px h-8 bg-white/20 mx-1" />

        {gameFlow.canStart && (
          <button onClick={gameFlow.start} className="btn btn-success">
            <Play size={18} />
            <span>开始审核</span>
          </button>
        )}

        {gameFlow.canPause && (
          <button onClick={gameFlow.pause} className="btn btn-outline !border-white !text-white hover:!bg-white/10">
            <Pause size={18} />
            <span>暂停</span>
          </button>
        )}

        {gameFlow.canResume && (
          <button onClick={gameFlow.resume} className="btn btn-success">
            <Play size={18} />
            <span>继续</span>
          </button>
        )}

        {gameFlow.canFinish && (
          <button onClick={gameFlow.finish} className="btn btn-accent">
            <Flag size={18} />
            <span>结算</span>
          </button>
        )}

        {(gameFlow.status === 'finished' || actionLog.logs.length > 0) && (
          <button onClick={startReplay} className="btn btn-outline !border-white !text-white hover:!bg-white/10">
            <History size={18} />
            <span>复盘</span>
          </button>
        )}

        {gameFlow.canReset && (
          <button onClick={gameFlow.reset} className="btn btn-danger !border-danger !text-white hover:!bg-danger/20">
            <RotateCcw size={18} />
            <span>重开</span>
          </button>
        )}
      </div>
    </div>
  );
};
