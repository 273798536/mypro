import { useGameStore } from '../../store/useGameStore';
import { getJudgeResultColor, getJudgeResultLabel } from '../../utils/judgeUtils';
import { useEffect, useState } from 'react';

export function JudgeEffect() {
  const { lastJudgeResult } = useGameStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lastJudgeResult) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [lastJudgeResult]);

  if (!lastJudgeResult || !visible) return null;

  const color = getJudgeResultColor(lastJudgeResult.result);
  const label = getJudgeResultLabel(lastJudgeResult.result);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      <div
        className="animate-bounce-in text-center"
        style={{
          animation: 'bounceIn 0.5s ease-out',
        }}
      >
        <div
          className="text-5xl font-black mb-2"
          style={{
            color,
            textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
          }}
        >
          {label}
        </div>
        <div className="text-lg text-slate-300">
          {lastJudgeResult.partName}
        </div>
        {lastJudgeResult.result !== 'perfect' && lastJudgeResult.result !== 'missed' && (
          <div className="text-sm text-slate-400 mt-1">
            偏差: {lastJudgeResult.offset > 0 ? '+' : ''}{lastJudgeResult.offset}ms
          </div>
        )}
      </div>
      <style>{`
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.1);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
