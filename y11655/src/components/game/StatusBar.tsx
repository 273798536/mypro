import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { formatTime, getGrade } from '../../utils/export';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const {
    status,
    gameTime,
    gameDuration,
    speed,
    totalScore,
    satisfaction,
    anomalies,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    setSpeed,
  } = useGameStore();

  const { grade, color } = getGrade(totalScore);
  const unresolvedAnomalies = anomalies.filter((a) => !a.resolved).length;

  const progress = (gameTime / gameDuration) * 100;

  return (
    <div className="bg-dispatch-panel border-b border-dispatch-border px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold font-mono" style={{ color }}>
              {grade}
            </div>
            <div>
              <div className="text-xs text-dispatch-text-muted">评级</div>
              <div className="text-lg font-mono font-semibold">{totalScore.toFixed(1)}</div>
            </div>
          </div>

          <div className="h-10 w-px bg-dispatch-border" />

          <div>
            <div className="text-xs text-dispatch-text-muted">游戏时间</div>
            <div className="text-lg font-mono font-semibold">
              {formatTime(gameTime)} / {formatTime(gameDuration)}
            </div>
          </div>

          <div>
            <div className="text-xs text-dispatch-text-muted">乘客满意度</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-dispatch-bg rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${satisfaction}%`,
                    backgroundColor: satisfaction > 70 ? '#10B981' : satisfaction > 40 ? '#F59E0B' : '#EF4444',
                  }}
                />
              </div>
              <span className="text-sm font-mono">{satisfaction.toFixed(0)}%</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-dispatch-text-muted">未处理异常</div>
            <div className={`text-lg font-mono font-semibold ${unresolvedAnomalies > 0 ? 'text-dispatch-danger' : 'text-dispatch-success'}`}>
              {unresolvedAnomalies}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-dispatch-bg rounded-lg p-1">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  speed === s
                    ? 'bg-dispatch-primary text-white'
                    : 'text-dispatch-text-muted hover:text-dispatch-text'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {status === 'idle' && (
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-4 py-2 bg-dispatch-success hover:bg-emerald-600 text-white rounded-lg transition-colors font-mono text-sm"
            >
              <Play size={16} />
              开始
            </button>
          )}

          {status === 'playing' && (
            <button
              onClick={pauseGame}
              className="flex items-center gap-2 px-4 py-2 bg-dispatch-warning hover:bg-amber-600 text-white rounded-lg transition-colors font-mono text-sm"
            >
              <Pause size={16} />
              暂停
            </button>
          )}

          {status === 'paused' && (
            <button
              onClick={resumeGame}
              className="flex items-center gap-2 px-4 py-2 bg-dispatch-success hover:bg-emerald-600 text-white rounded-lg transition-colors font-mono text-sm"
            >
              <Play size={16} />
              继续
            </button>
          )}

          <button
            onClick={restartGame}
            className="flex items-center gap-2 px-4 py-2 bg-dispatch-secondary hover:bg-dispatch-border text-dispatch-text rounded-lg transition-colors font-mono text-sm border border-dispatch-border"
          >
            <RotateCcw size={16} />
            重开
          </button>
        </div>
      </div>

      <div className="mt-3 h-1 bg-dispatch-bg rounded-full overflow-hidden">
        <div
          className="h-full bg-dispatch-primary transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
