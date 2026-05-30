import { useGameStore } from '@/store/gameStore';
import { windowQuality } from '@/engine/windowChecker';
import { MISSION_SEQUENCE } from '@/data/scenarioData';
import { Play, Pause, RotateCcw, SkipForward, Rocket, Target } from 'lucide-react';

const QUALITY_COLORS: Record<string, string> = {
  optimal: 'bg-green-500/20 border-green-500 text-green-400',
  good: 'bg-blue-500/20 border-blue-500 text-blue-400',
  marginal: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
  poor: 'bg-red-500/20 border-red-500 text-red-400',
};

const QUALITY_DOTS: Record<string, string> = {
  optimal: 'bg-green-400',
  good: 'bg-blue-400',
  marginal: 'bg-yellow-400',
  poor: 'bg-red-400',
};

export default function ControlPanel() {
  const {
    phase,
    currentStep,
    score,
    planets,
    availableWindows,
    selectedWindowId,
    currentTargetIndex,
    selectWindow,
    executeTransfer,
    skipTurn,
    pauseGame,
    resumeGame,
    restartGame,
  } = useGameStore();

  const currentTargetId = MISSION_SEQUENCE[currentTargetIndex];
  const currentTargetPlanet = planets.find(p => p.id === currentTargetId);
  const hasSelection = selectedWindowId !== null;
  const isPlaying = phase === 'playing';

  return (
    <div className="bg-space-800/90 backdrop-blur-md rounded-xl p-4 flex flex-col gap-3 w-72 border border-white/5">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span className="flex items-center gap-1">
          <Target size={12} />
          第 {currentStep} 步
        </span>
        <span className="font-display text-orbit-gold">{score} 分</span>
      </div>

      {currentTargetPlanet && (
        <div className="text-xs text-white/80 flex items-center gap-1.5">
          <Rocket size={12} className="text-orbit-gold" />
          目标: <span className="font-display text-white">{currentTargetPlanet.name}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-white/40">转移窗口</span>
        <div className="flex flex-col gap-1">
          {availableWindows.map(w => {
            const q = windowQuality(w, currentStep);
            const isSelected = selectedWindowId === w.id;
            const isMissed = w.isMissed;

            if (isMissed) {
              return (
                <button
                  key={w.id}
                  disabled
                  className="flex items-center justify-between px-2.5 py-1.5 rounded bg-red-900/30 border border-red-800/50 text-red-400/50 text-xs cursor-not-allowed"
                >
                  <span>{w.targetPlanetName}</span>
                  <span className="text-[10px]">窗口错过</span>
                </button>
              );
            }

            return (
              <button
                key={w.id}
                onClick={() => selectWindow(w.id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-xs transition-all ${
                  isSelected
                    ? 'border-orbit-gold bg-orbit-gold/10 shadow-[0_0_8px_rgba(240,192,64,0.3)]'
                    : `${QUALITY_COLORS[q.quality]} border-opacity-50 hover:shadow-[0_0_6px_rgba(255,255,255,0.1)]`
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${QUALITY_DOTS[q.quality]}`} />
                  {w.targetPlanetName}
                </span>
                <span className="text-white/50">{w.fuelCost.toFixed(1)}</span>
              </button>
            );
          })}
          {availableWindows.length === 0 && (
            <span className="text-[10px] text-white/30 px-1">无可用窗口</span>
          )}
        </div>
      </div>

      <button
        onClick={executeTransfer}
        disabled={!hasSelection || !isPlaying}
        className="w-full py-2 rounded-lg bg-orbit-gold text-space-900 font-bold text-sm transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        执行转移
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={skipTurn}
          disabled={!isPlaying}
          className="flex-1 py-1.5 rounded bg-space-600 text-white/70 text-xs hover:bg-space-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          <SkipForward size={12} />
          等待一回合
        </button>

        <button
          onClick={isPlaying ? pauseGame : phase === 'paused' ? resumeGame : undefined}
          disabled={phase === 'finished' || phase === 'setup'}
          className="p-1.5 rounded bg-space-600 text-white/70 hover:bg-space-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>

      <button
        onClick={restartGame}
        className="flex items-center justify-center gap-1 text-red-400/70 text-xs hover:text-red-400 transition-colors"
      >
        <RotateCcw size={12} />
        重新开始
      </button>
    </div>
  );
}
