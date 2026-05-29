import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { Pause, Play, RotateCcw, Undo2, Flag, Eye, FileText } from 'lucide-react';

const phaseBadge: Record<string, { label: string; color: string }> = {
  playing: { label: '进行中', color: 'bg-green-600/80 text-green-200' },
  paused: { label: '已暂停', color: 'bg-yellow-600/80 text-yellow-200' },
  review: { label: '回顾', color: 'bg-purple-600/80 text-purple-200' },
  finished: { label: '已结束', color: 'bg-gray-600/80 text-gray-300' },
};

export default function GameControls() {
  const navigate = useNavigate();
  const phase = useGameStore((s) => s.phase);
  const score = useGameStore((s) => s.score);
  const history = useGameStore((s) => s.history);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const restart = useGameStore((s) => s.restart);
  const undoLastAction = useGameStore((s) => s.undoLastAction);
  const finishGame = useGameStore((s) => s.finishGame);
  const enterReview = useGameStore((s) => s.enterReview);

  const isPlaying = phase === 'playing';
  const isPaused = phase === 'paused';
  const canUndo = isPlaying && history.length > 0;
  const canReview = phase === 'finished';

  const btnBase =
    'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all border disabled:opacity-30 disabled:cursor-not-allowed';
  const neonBtn = `${btnBase} border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:shadow-[0_0_8px_rgba(0,255,255,0.3)]`;
  const dangerBtn = `${btnBase} border-red-500/40 text-red-300 hover:bg-red-500/20 hover:shadow-[0_0_8px_rgba(255,60,60,0.3)]`;
  const purpleBtn = `${btnBase} border-purple-500/40 text-purple-300 hover:bg-purple-500/20 hover:shadow-[0_0_8px_rgba(180,80,255,0.3)]`;
  const orangeBtn = `${btnBase} border-[#FF6B35]/40 text-[#FF6B35] hover:bg-[#FF6B35]/20 hover:shadow-[0_0_8px_rgba(255,107,53,0.3)]`;

  const badge = phaseBadge[phase] ?? phaseBadge.playing;

  return (
    <div className="bg-[#0F1419] border-t border-gray-800 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
          {badge.label}
        </span>

        {(isPlaying || isPaused) && (
          <button onClick={isPlaying ? pause : resume} className={neonBtn}>
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? '暂停' : '继续'}
          </button>
        )}

        <button onClick={restart} className={dangerBtn}>
          <RotateCcw className="w-3.5 h-3.5" />
          重来
        </button>

        <button onClick={undoLastAction} disabled={!canUndo} className={neonBtn}>
          <Undo2 className="w-3.5 h-3.5" />
          撤销
        </button>

        {(isPlaying || isPaused) && (
          <button onClick={finishGame} className={dangerBtn}>
            <Flag className="w-3.5 h-3.5" />
            结束
          </button>
        )}

        {canReview && (
          <button onClick={enterReview} className={purpleBtn}>
            <Eye className="w-3.5 h-3.5" />
            回顾
          </button>
        )}

        {canReview && (
          <button onClick={() => navigate('/report')} className={orangeBtn}>
            <FileText className="w-3.5 h-3.5" />
            查看报告
          </button>
        )}
      </div>

      <div className="text-right">
        <span className="text-[10px] text-gray-500">得分</span>
        <span className="ml-2 text-lg font-bold text-cyan-400 tabular-nums">{score.total}</span>
      </div>
    </div>
  );
}
