import { useGameStore } from '../../store/gameStore';
import type { HistorySnapshot } from '../../types';

function conflictColor(count: number) {
  if (count === 0) return 'bg-green-500';
  if (count <= 2) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function ReviewSlider() {
  const phase = useGameStore((s) => s.phase);
  const history = useGameStore((s) => s.history);
  const reviewTick = useGameStore((s) => s.reviewTick);
  const setReviewTick = useGameStore((s) => s.setReviewTick);

  if (phase !== 'review' || history.length === 0) return null;

  const maxTick = history.length - 1;
  const current: HistorySnapshot | undefined = history[reviewTick];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReviewTick(Number(e.target.value));
  };

  return (
    <div className="bg-[#0F1419] border-t border-gray-800 px-4 py-3 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-gray-500 w-10 shrink-0">步骤</span>
        <input
          type="range"
          min={0}
          max={maxTick}
          value={reviewTick}
          onChange={handleChange}
          className="flex-1 accent-cyan-500 h-1.5 cursor-pointer"
        />
        <span className="text-xs text-cyan-400 tabular-nums w-16 text-right">
          {reviewTick}/{maxTick}
        </span>
      </div>

      {current && (
        <div className="flex items-center gap-4 text-[10px] text-gray-400">
          <span>安排 {current.arrangedCount} 位艺人</span>
          <span>冲突 <span className={current.conflicts.length > 0 ? 'text-red-400' : 'text-green-400'}>{current.conflicts.length}</span></span>
          {current.activatedWeather.length > 0 && (
            <span>天气 {current.activatedWeather.length} 项生效</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-0.5 overflow-x-auto py-1">
        {history.map((snap) => (
          <button
            key={snap.tick}
            onClick={() => setReviewTick(snap.tick)}
            className={`
              w-2 h-2 rounded-full shrink-0 transition-transform
              ${conflictColor(snap.conflicts.length)}
              ${snap.tick === reviewTick ? 'scale-150 ring-1 ring-white/50' : 'opacity-60 hover:opacity-100'}
            `}
          />
        ))}
      </div>
    </div>
  );
}
