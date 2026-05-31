import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Timer() {
  const elapsedTime = useGameStore((s) => s.elapsedTime);
  const totalTime = useGameStore((s) => s.totalTime);
  const status = useGameStore((s) => s.status);

  const isPaused = status === 'paused';
  const isPlaying = status === 'playing';
  const remaining = Math.max(0, totalTime - elapsedTime);
  const progress = totalTime > 0 ? Math.min(1, elapsedTime / totalTime) : 0;
  const isUrgent = remaining <= 60 && isPlaying;

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'relative w-28 h-28 rounded-full flex items-center justify-center',
          'border-4 border-amber-600/80',
          'bg-gradient-to-br from-[#2a1a0e] to-[#1a0f06]',
          'shadow-lg shadow-amber-900/30',
          isPaused && 'opacity-70',
          isUrgent && 'border-red-500/80 shadow-red-900/30'
        )}
      >
        <div
          className={cn(
            'absolute inset-1.5 rounded-full',
            'border border-amber-700/30'
          )}
        />

        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="rgba(120,80,30,0.2)"
            strokeWidth="3"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke={isUrgent ? '#ef4444' : '#d97706'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={276.46}
            animate={{ strokeDashoffset: 276.46 * (1 - progress) }}
            transition={{ duration: 0.5 }}
          />
        </svg>

        <div className="relative z-10 flex flex-col items-center">
          <Clock
            className={cn(
              'h-3.5 w-3.5 mb-0.5',
              isUrgent ? 'text-red-400' : 'text-amber-500'
            )}
          />
          <span
            className={cn(
              'text-lg font-bold tracking-widest',
              isUrgent ? 'text-red-300' : 'text-amber-100',
              isPaused && 'text-amber-300'
            )}
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {formatTime(remaining)}
          </span>
          <span
            className="text-[8px] text-amber-600 tracking-wider uppercase"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            剩余
          </span>
        </div>

        {isPaused && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-amber-950/40">
            <span
              className="text-amber-400 text-[10px] font-bold tracking-widest"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              暂停
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px] text-amber-600">
        <span>
          已用{' '}
          <span
            className="text-amber-400 font-semibold"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {formatTime(elapsedTime)}
          </span>
        </span>
        <span className="text-amber-800">|</span>
        <span>
          总计{' '}
          <span
            className="text-amber-400 font-semibold"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {formatTime(totalTime)}
          </span>
        </span>
      </div>
    </div>
  );
}
