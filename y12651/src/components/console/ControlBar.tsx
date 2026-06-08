import { Play, Pause, RotateCcw, Flag, User, Settings } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useNavigate } from 'react-router-dom';
import { USERS } from '@/utils/boundaryScenes';
import { cn } from '@/lib/utils';

export default function ControlBar() {
  const status = useGameStore((s) => s.status);
  const currentUser = useGameStore((s) => s.currentUser);
  const currentRole = useGameStore((s) => s.currentRole);
  const currentFrame = useGameStore((s) => s.currentFrame);
  const totalFrames = useGameStore((s) => s.totalFrames);
  const startTime = useGameStore((s) => s.startTime);
  const startGame = useGameStore((s) => s.startGame);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const resetGame = useGameStore((s) => s.resetGame);
  const finishGame = useGameStore((s) => s.finishGame);
  const setRole = useGameStore((s) => s.setRole);
  const navigate = useNavigate();

  const elapsed = startTime ? Date.now() - startTime : 0;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel clip-chamfer px-4 py-3 flex items-center justify-between gap-4 border-b border-cyber-cyan/20">
      <div className="flex items-center gap-3">
        <div className="hud-text text-sm font-bold tracking-widest text-cyber-cyan flex items-center gap-2">
          <Settings className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
          立体几何截面课堂
        </div>
        <div className="h-6 w-px bg-cyber-cyan/20" />
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className="text-cyan-300/60">帧:</span>
          <span className="text-cyber-cyan font-semibold tabular-nums">
            {currentFrame}/{totalFrames - 1}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className="text-cyan-300/60">进度:</span>
          <span className="text-cyber-cyan font-semibold tabular-nums">
            {status === 'idle' ? '--:--' : fmt(elapsed)}
          </span>
        </div>
        <div className={cn(
          'hud-text text-[10px] px-2 py-0.5 rounded clip-chamfer',
          status === 'playing' && 'bg-success-green/15 text-success-green border border-success-green/30',
          status === 'paused' && 'bg-warn-yellow/15 text-warn-yellow border border-warn-yellow/30',
          status === 'idle' && 'bg-cyber-cyan/10 text-cyber-cyan/70 border border-cyber-cyan/20',
          status === 'finished' && 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30'
        )}>
          {status === 'idle' && '待开始'}
          {status === 'playing' && '运行中'}
          {status === 'paused' && '已暂停'}
          {status === 'finished' && '已结算'}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {status === 'idle' && (
          <button className="cyber-btn cyber-btn-primary flex items-center gap-1.5" onClick={startGame}>
            <Play className="w-3.5 h-3.5" /> 开始训练
          </button>
        )}
        {status === 'playing' && (
          <button className="cyber-btn flex items-center gap-1.5" onClick={pauseGame}>
            <Pause className="w-3.5 h-3.5" /> 暂停
          </button>
        )}
        {status === 'paused' && (
          <button className="cyber-btn cyber-btn-primary flex items-center gap-1.5" onClick={resumeGame}>
            <Play className="w-3.5 h-3.5" /> 继续
          </button>
        )}
        <button
          className="cyber-btn flex items-center gap-1.5"
          onClick={resetGame}
          disabled={status === 'idle'}
        >
          <RotateCcw className="w-3.5 h-3.5" /> 重开
        </button>
        {(status === 'playing' || status === 'paused') && (
          <button
            className="cyber-btn cyber-btn-success flex items-center gap-1.5"
            onClick={() => {
              finishGame();
              navigate('/result');
            }}
          >
            <Flag className="w-3.5 h-3.5" /> 结算
          </button>
        )}

        <div className="h-6 w-px bg-cyber-cyan/20 mx-1" />

        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-cyber-cyan/60" />
          <select
            value={currentRole}
            onChange={(e) => setRole(e.target.value as any)}
            className="bg-space-mid/60 text-cyber-cyan text-[11px] font-mono px-2 py-1 border border-cyber-cyan/30 rounded focus:outline-none focus:border-cyber-cyan cursor-pointer clip-chamfer"
          >
            {USERS.map((u) => (
              <option key={u.role} value={u.role} className="bg-space-dark">
                {u.avatar} · {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
