import { useGameStore } from '@/store/gameStore';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { TRACK_KEYS } from '@/types';

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function ControlBar() {
  const phase = useGameStore((s) => s.phase);
  const startGame = useGameStore((s) => s.startGame);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const restartGame = useGameStore((s) => s.restartGame);
  const bpm = useGameStore((s) => s.currentBpm);
  const elapsed = useGameStore((s) => s.elapsedTime);
  const score = useGameStore((s) => s.score);

  const isPlaying = phase === 'playing';
  const isPaused = phase === 'paused';
  const isIdle = phase === 'idle';

  const totalDuration = 120000;
  const progress = Math.min(1, elapsed / totalDuration);

  return (
    <div
      className="flex items-center gap-4 px-4 py-3"
      style={{
        background: 'rgba(26, 29, 46, 0.95)',
        borderTop: '1px solid rgba(240, 168, 48, 0.15)',
        fontFamily: "'Noto Sans SC', sans-serif",
      }}
    >
      <div className="flex items-center gap-2">
        {isIdle && (
          <button
            onClick={startGame}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{ background: 'rgba(240, 168, 48, 0.2)', color: '#f0a830' }}
          >
            <Play size={18} />
          </button>
        )}
        {isPlaying && (
          <button
            onClick={pauseGame}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{ background: 'rgba(61, 193, 211, 0.2)', color: '#3dc1d3' }}
          >
            <Pause size={18} />
          </button>
        )}
        {isPaused && (
          <button
            onClick={resumeGame}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{ background: 'rgba(46, 213, 115, 0.2)', color: '#2ed573' }}
          >
            <Play size={18} />
          </button>
        )}
        {!isIdle && (
          <button
            onClick={restartGame}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <style>{`
          @keyframes bpmPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}</style>
        <span
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: '#f0a830',
            animation: isPlaying ? 'bpmPulse 0.5s ease-in-out infinite' : undefined,
          }}
        >
          {bpm}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>BPM</span>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(to right, #f0a830, #3dc1d3)',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          {formatTime(elapsed)} / {formatTime(totalDuration)}
        </span>
      </div>

      <div
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: '#f0a830',
        }}
      >
        {score.toLocaleString()}
      </div>

      <div className="flex items-center gap-1">
        {TRACK_KEYS.map((key, i) => (
          <span
            key={i}
            className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {key.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
