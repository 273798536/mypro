import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, RotateCcw, Home } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { getLevelById } from '../data/levels';
import { ResourcePanel } from '../components/game/ResourcePanel';
import { GameMap } from '../components/game/GameMap';
import { StatusBar } from '../components/game/StatusBar';
import { EventLog } from '../components/game/EventLog';
import { OperationRecord } from '../components/game/OperationRecord';
import { EventModal } from '../components/game/EventModal';

export const GameScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const levelId = searchParams.get('level');
  
  const {
    status,
    level,
    currentTime,
    totalTime,
    score,
    battery,
    weather,
    weatherForecast,
    speedMultiplier,
    events,
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    setSpeed,
    acknowledgeEvent
  } = useGameStore();

  const [draggedResource, setDraggedResource] = useState<string | null>(null);
  const [unacknowledgedEvent, setUnacknowledgedEvent] = useState<string | null>(null);

  useGameLoop();

  useEffect(() => {
    if (levelId) {
      const levelData = getLevelById(levelId);
      if (levelData) {
        initializeGame(levelData);
      }
    }
  }, [levelId, initializeGame]);

  useEffect(() => {
    const unacknowledged = events.find(e => !e.acknowledged);
    if (unacknowledged && !unacknowledgedEvent) {
      setUnacknowledgedEvent(unacknowledged.id);
    }
  }, [events, unacknowledgedEvent]);

  useEffect(() => {
    if (status === 'finished') {
      navigate('/result');
    }
  }, [status, navigate]);

  const handleStartPause = () => {
    if (status === 'idle') {
      startGame();
    } else if (status === 'playing') {
      pauseGame();
    } else if (status === 'paused') {
      resumeGame();
    }
  };

  const handleReset = () => {
    resetGame();
    if (levelId) {
      const levelData = getLevelById(levelId);
      if (levelData) {
        initializeGame(levelData);
      }
    }
  };

  const handleCloseEventModal = () => {
    if (unacknowledgedEvent) {
      acknowledgeEvent(unacknowledgedEvent);
      setUnacknowledgedEvent(null);
    }
  };

  const currentEvent = events.find(e => e.id === unacknowledgedEvent);
  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  if (!level) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 text-white overflow-hidden flex flex-col">
      <StatusBar
        levelName={level.name}
        currentTime={currentTime}
        totalTime={totalTime}
        score={score}
        battery={battery}
        weather={weather}
        weatherForecast={weatherForecast}
        progress={progress}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 bg-slate-800/50 border-r border-slate-700 flex flex-col">
          <ResourcePanel
            onDragStart={setDraggedResource}
            onDragEnd={() => setDraggedResource(null)}
          />
          <div className="flex-1 overflow-hidden">
            <OperationRecord />
          </div>
        </div>

        <div className="flex-1 flex flex-col relative">
          <GameMap
            draggedResource={draggedResource}
            onDragEnd={() => setDraggedResource(null)}
          />
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-slate-800/90 backdrop-blur px-6 py-3 rounded-xl border border-slate-700">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleStartPause}
              className="p-3 rounded-lg bg-green-600 hover:bg-green-500 transition-colors"
            >
              {status === 'playing' ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-slate-600" />

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">速度:</span>
              {[1, 2, 3].map(speed => (
                <button
                  key={speed}
                  onClick={() => setSpeed(speed)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    speedMultiplier === speed
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-80 bg-slate-800/50 border-l border-slate-700 flex flex-col">
          <EventLog />
        </div>
      </div>

      <AnimatePresence>
        {currentEvent && (
          <EventModal
            event={currentEvent}
            onClose={handleCloseEventModal}
          />
        )}
      </AnimatePresence>

      {status === 'paused' && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center"
          >
            <Pause className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">游戏暂停</h2>
            <p className="text-slate-400 mb-6">点击继续按钮恢复游戏</p>
            <button
              onClick={resumeGame}
              className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-colors"
            >
              继续游戏
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
