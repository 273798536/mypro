import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameState } from './hooks/useGameState';
import { GameCanvas } from './components/GameCanvas';
import { StatusPanel } from './components/StatusPanel';
import { ControlPanel } from './components/ControlPanel';
import { ResultPanel } from './components/ResultPanel';
import { RecordPanel } from './components/RecordPanel';
import type { FlightRecord } from './types/game';
import { createFlightRecord } from './utils/flightRecorder';

function App() {
  const {
    state,
    rocket,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    setThrust,
    startReplay,
    setReplaySpeed,
    exitReplay,
  } = useGameState();

  const [showResult, setShowResult] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<FlightRecord | null>(null);
  const [flightTime, setFlightTime] = useState(0);

  useEffect(() => {
    if (state.phase === 'playing' && state.flightData.length > 0) {
      const firstFrame = state.flightData[0];
      const lastFrame = state.flightData[state.flightData.length - 1];
      setFlightTime((lastFrame.timestamp - firstFrame.timestamp) / 1000);
    } else if (state.phase === 'idle') {
      setFlightTime(0);
    }
  }, [state.phase, state.flightData]);

  useEffect(() => {
    if (state.phase === 'ended' && !showResult && state.flightData.length > 0) {
      const record = createFlightRecord(
        state.flightData,
        state.environment,
        !state.failureReason,
        state.score,
        state.failureReason
      );
      setCurrentRecord(record);
      setShowResult(true);
    }
  }, [state.phase, state.failureReason, state.score, state.flightData, state.environment, showResult]);

  const handleReplayFromResult = () => {
    if (currentRecord) {
      startReplay(currentRecord);
      setShowResult(false);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
  };

  const thrustInput = rocket.thrust / rocket.maxThrust;

  return (
    <div className="min-h-screen bg-[#0a1628] text-white overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-4">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            🚀 火箭着陆燃料赛
          </h1>
          <p className="text-gray-400 text-sm">
            控制推力，在重力和风扰中安全着陆
          </p>
        </motion.header>

        <div className="flex gap-4 justify-center items-start flex-wrap lg:flex-nowrap">
          <div className="w-64 flex-shrink-0 order-2 lg:order-1">
            <StatusPanel
              rocket={rocket}
              environment={state.environment}
              gamePhase={state.phase}
              flightTime={flightTime}
            />
          </div>

          <div className="flex flex-col gap-4 order-1 lg:order-2">
            <GameCanvas
              rocket={rocket}
              environment={state.environment}
              gamePhase={state.phase}
              width={800}
              height={600}
            />

            <ControlPanel
              gamePhase={state.phase}
              thrust={thrustInput}
              onThrustChange={setThrust}
              onStart={startGame}
              onPause={pauseGame}
              onResume={resumeGame}
              onReset={resetGame}
              onReplaySpeedChange={setReplaySpeed}
              replaySpeed={state.replaySpeed}
            />
          </div>

          <div className="w-72 flex-shrink-0 h-[700px] order-3">
            <RecordPanel onReplay={startReplay} />
          </div>
        </div>

        {state.phase === 'paused' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900/95 rounded-2xl p-8 text-center border border-yellow-500/30"
            >
              <div className="text-6xl mb-4">⏸️</div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">游戏暂停</h2>
              <div className="flex gap-3">
                <button
                  onClick={resumeGame}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold py-3 px-8 rounded-lg transition-all"
                >
                  ▶️ 继续游戏
                </button>
                <button
                  onClick={resetGame}
                  className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-bold py-3 px-8 rounded-lg transition-all"
                >
                  🔄 重新开始
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showResult && (
          <ResultPanel
            success={!state.failureReason}
            score={state.score}
            failureReason={state.failureReason}
            record={currentRecord || undefined}
            onReplay={handleReplayFromResult}
            onClose={handleCloseResult}
          />
        )}

        {state.phase === 'replaying' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-sm rounded-xl px-6 py-3 border border-cyan-500/30 flex items-center gap-4 z-40"
          >
            <span className="text-cyan-400 font-bold flex items-center gap-2">
              <span className="animate-pulse">▶</span> 慢动作回放中
            </span>
            <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-cyan-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${(state.replayFrameIndex / Math.max(state.flightData.length - 1, 1)) * 100}%` 
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <button
              onClick={exitReplay}
              className="text-sm bg-red-500/20 text-red-400 px-3 py-1 rounded hover:bg-red-500/30 transition-all"
            >
              退出回放
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default App;
