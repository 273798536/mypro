import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw } from 'lucide-react';
import RiverCanvas from '@/components/RiverCanvas';
import GateControl from '@/components/GateControl';
import RainfallCards from '@/components/RainfallCards';
import WaterGauge from '@/components/WaterGauge';
import WarningButton from '@/components/WarningButton';
import { useGameStore } from '@/store/gameStore';
import { allScenarios } from '@/data/scenarios';

export default function Game() {
  const navigate = useNavigate();
  const {
    scenario,
    status,
    currentRound,
    upstreamLevel,
    downstreamFlow,
    selectedGate,
    warningIssuedThisRound,
    loadScenario,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    selectGate,
    toggleWarning,
    confirmRound,
  } = useGameStore();

  useEffect(() => {
    if (status === 'finished') {
      navigate('/result');
    }
  }, [status, navigate]);

  const scenarioLoaded = scenario !== null;
  const isPlaying = status === 'playing';
  const isPaused = status === 'paused';
  const isIdle = status === 'idle';

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
        <h1 className="font-serif-sc font-bold text-lg tracking-wide">河道防洪闸门局</h1>
        {scenarioLoaded && (
          <span className="text-sm text-slate-400">{scenario.name}</span>
        )}
        <div className="flex gap-2">
          <button
            onClick={isIdle ? startGame : isPaused ? resumeGame : pauseGame}
            disabled={!scenarioLoaded || status === 'finished'}
            className="flex items-center gap-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? '暂停' : isPaused ? '继续' : '开始'}
          </button>
          <button
            onClick={resetGame}
            disabled={!scenarioLoaded}
            className="flex items-center gap-1 px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            <RotateCcw size={14} />
            重开
          </button>
        </div>
      </header>

      {!scenarioLoaded && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <p className="text-slate-400 text-lg">选择场景开始游戏</p>
          <div className="flex gap-6">
            {allScenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => loadScenario(s)}
                className="w-64 rounded-xl bg-slate-800 border border-slate-700 p-6 text-left hover:border-blue-500 hover:bg-slate-750 transition-colors cursor-pointer"
              >
                <h2 className="font-serif-sc font-bold text-xl mb-2">{s.name}</h2>
                <p className="text-sm text-slate-400 leading-relaxed">{s.description}</p>
                <p className="mt-3 text-xs text-slate-500">{s.totalRounds} 回合 · 及格 {s.passingScore} 分</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {scenarioLoaded && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-[55%] shrink-0 bg-slate-950">
            <RiverCanvas
              upstreamLevel={upstreamLevel}
              reservoirCapacity={scenario.initialState.reservoirCapacity}
              gateOpenPercent={selectedGate}
              downstreamFlow={downstreamFlow}
              downstreamSafeThreshold={scenario.initialState.downstreamSafeThreshold}
            />
          </div>
          <div className="h-[45%] flex min-h-0 shrink-0">
            <div className="w-1/2 p-3 flex flex-col gap-3 overflow-auto">
              <GateControl
                selectedGate={selectedGate}
                upstreamLevel={upstreamLevel}
                onSelect={selectGate}
                disabled={!isPlaying}
              />
              <div className="flex items-center gap-4">
                <WarningButton
                  warningIssued={warningIssuedThisRound}
                  onToggle={toggleWarning}
                  disabled={!isPlaying}
                />
                <button
                  onClick={confirmRound}
                  disabled={!isPlaying}
                  className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  确认本回合
                </button>
              </div>
            </div>
            <div className="w-1/2 p-3 flex flex-col gap-3 overflow-auto">
              <RainfallCards
                cards={scenario.rainfallCards}
                currentRound={currentRound}
              />
              <WaterGauge
                upstreamLevel={upstreamLevel}
                reservoirCapacity={scenario.initialState.reservoirCapacity}
                downstreamFlow={downstreamFlow}
                downstreamSafeThreshold={scenario.initialState.downstreamSafeThreshold}
              />
            </div>
          </div>
        </div>
      )}

      {scenarioLoaded && (
        <div className="flex items-center justify-center gap-4 px-4 py-2 bg-slate-800 border-t border-slate-700 text-sm text-slate-300 shrink-0">
          <span>回合 {currentRound} / {scenario!.totalRounds}</span>
          <span className="px-2 py-0.5 rounded text-xs bg-slate-700">
            {isIdle ? '等待开始' : isPlaying ? '进行中' : isPaused ? '已暂停' : '已结束'}
          </span>
        </div>
      )}
    </div>
  );
}
