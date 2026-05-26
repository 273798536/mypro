import { useGameStore } from '../store/gameStore';
import { WEATHER_TYPE_LABELS } from '../types/game';
import { calculateMaxScore } from '../utils/gameEngine';

const weatherIcons = {
  typhoon: '🌀',
  rainstorm: '🌧️',
  lightning: '⚡',
  normal: '☀️',
  fog: '🌫️'
};

export function TopBar() {
  const publicState = useGameStore(s => s.publicState);
  const currentLevel = useGameStore(s => s.currentLevel);
  const exitToMenu = useGameStore(s => s.exitToMenu);

  if (!publicState || !currentLevel) return null;

  const progress = ((publicState.currentRound - 1) / publicState.maxRounds) * 100;
  const maxScore = calculateMaxScore(currentLevel);
  const scorePercent = Math.max(0, Math.min(100, (publicState.score / maxScore) * 100));

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-600 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={exitToMenu}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>返回</span>
          </button>

          <div>
            <h1 className="text-lg font-bold text-white">{currentLevel.name}</h1>
            <p className="text-xs text-slate-400">{currentLevel.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1">回合</p>
              <p className="text-2xl font-bold text-white">
                {publicState.currentRound}
                <span className="text-sm text-slate-500">/{publicState.maxRounds}</span>
              </p>
            </div>

            <div className="w-32">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>进度</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-600" />

          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">天气</p>
            <div className="flex items-center gap-1">
              <span className="text-xl">{weatherIcons[publicState.weather.type]}</span>
              <span className="text-sm text-white">{WEATHER_TYPE_LABELS[publicState.weather.type]}</span>
            </div>
            {publicState.weather.cooldownModifier > 0 && (
              <p className="text-xs text-orange-400">冷却+{publicState.weather.cooldownModifier}</p>
            )}
          </div>

          <div className="h-10 w-px bg-slate-600" />

          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">得分</p>
            <p className={`text-2xl font-bold ${
              publicState.score >= maxScore * 0.7
                ? 'text-emerald-400'
                : publicState.score >= maxScore * 0.4
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}>
              {publicState.score}
              <span className="text-sm text-slate-500">/{maxScore}</span>
            </p>
            <div className="w-24 bg-slate-700 rounded-full h-1.5 mt-1">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${scorePercent}%`,
                  backgroundColor: scorePercent >= 70 ? '#10b981' : scorePercent >= 40 ? '#eab308' : '#ef4444'
                }}
              />
            </div>
          </div>

          <div className="h-10 w-px bg-slate-600" />

          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">备件</p>
            <div className="flex gap-2">
              {publicState.spareParts.map(part => (
                <div key={part.id} className="text-center">
                  <span className="text-lg">{part.quantity > 0 ? '📦' : '❌'}</span>
                  <p className="text-xs text-white">
                    {part.name}
                    <span className={`ml-1 ${part.quantity === 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      ×{part.quantity}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}