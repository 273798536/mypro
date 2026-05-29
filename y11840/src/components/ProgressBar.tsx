interface ProgressBarProps {
  current: number;
  total: number;
  score: number;
  totalScore: number;
}

export function ProgressBar({ current, total, score, totalScore }: ProgressBarProps) {
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0;

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-gray-400 text-sm">挑战进度</span>
          <div className="text-white font-mono text-2xl font-bold">
            {current + 1} / {total}
          </div>
        </div>
        <div className="text-right">
          <span className="text-gray-400 text-sm">当前得分</span>
          <div className="font-mono text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            {score}
            <span className="text-gray-500 text-lg ml-1">/ {totalScore}</span>
          </div>
        </div>
      </div>
      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-500 text-right">
        完成 {progress.toFixed(0)}%
      </div>
    </div>
  );
}
