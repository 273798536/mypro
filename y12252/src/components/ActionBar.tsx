import { motion } from 'framer-motion';
import { Gavel, Hourglass, RotateCcw, CheckCircle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

interface ActionButton {
  key: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled: boolean;
  variant: 'primary' | 'warning' | 'danger' | 'success';
}

export default function ActionBar() {
  const status = useGameStore((s) => s.status);
  const startGame = useGameStore((s) => s.startGame);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const resetGame = useGameStore((s) => s.resetGame);
  const finishGame = useGameStore((s) => s.finishGame);

  const buttons: ActionButton[] = [
    {
      key: 'start',
      label: '开庭',
      icon: Gavel,
      onClick: startGame,
      disabled: status !== 'idle',
      variant: 'primary',
    },
    {
      key: 'pause',
      label: status === 'paused' ? '继续' : '休庭',
      icon: Hourglass,
      onClick: status === 'paused' ? resumeGame : pauseGame,
      disabled: status !== 'playing' && status !== 'paused',
      variant: 'warning',
    },
    {
      key: 'reset',
      label: '重审',
      icon: RotateCcw,
      onClick: resetGame,
      disabled: status === 'idle',
      variant: 'danger',
    },
    {
      key: 'finish',
      label: '宣判',
      icon: CheckCircle,
      onClick: finishGame,
      disabled: status !== 'playing' && status !== 'paused',
      variant: 'success',
    },
  ];

  const variantStyles = {
    primary:
      'border-amber-500/80 text-amber-200 hover:bg-amber-800/50 active:bg-amber-700/50 shadow-amber-900/30',
    warning:
      'border-amber-600/60 text-amber-300 hover:bg-amber-800/40 active:bg-amber-700/40 shadow-amber-900/20',
    danger:
      'border-red-600/60 text-red-300 hover:bg-red-900/30 active:bg-red-800/30 shadow-red-900/20',
    success:
      'border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/30 active:bg-emerald-800/30 shadow-emerald-900/20',
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {buttons.map((btn) => {
        const Icon = btn.icon;
        return (
          <motion.button
            key={btn.key}
            whileHover={btn.disabled ? {} : { scale: 1.05, y: -1 }}
            whileTap={btn.disabled ? {} : { scale: 0.97, y: 1 }}
            onClick={btn.onClick}
            disabled={btn.disabled}
            className={cn(
              'relative flex flex-col items-center gap-1 px-4 py-2.5 rounded-md',
              'border-2 bg-gradient-to-b from-[#2a1a0e] to-[#1a0f06]',
              'transition-all duration-150 shadow-md',
              'disabled:opacity-30 disabled:cursor-not-allowed disabled:saturate-0',
              variantStyles[btn.variant]
            )}
          >
            <div
              className={cn(
                'absolute inset-x-0 top-0 h-px rounded-t-md',
                'bg-gradient-to-r from-transparent via-amber-400/30 to-transparent'
              )}
            />
            <Icon className="h-5 w-5" />
            <span
              className="text-[10px] font-bold tracking-wider"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              {btn.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
