import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { StationMap } from '@/components/StationMap';
import { ControlPanel } from '@/components/ControlPanel';
import { ScorePanel } from '@/components/ScorePanel';
import { ActionLogPanel } from '@/components/ActionLog';
import { getDefaultLevelConfig, generatePassenger, updatePassengerPosition, checkCongestion } from '@/engine/gameEngine';
import { Play, Flag } from 'lucide-react';

export function GamePage() {
  const navigate = useNavigate();
  const gameLoopRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const passengerSpawnRef = useRef<number>(0);

  const isPlaying = useGameStore(state => state.isPlaying);
  const isPaused = useGameStore(state => state.isPaused);
  const isGameOver = useGameStore(state => state.isGameOver);
  const currentLevel = useGameStore(state => state.currentLevel);
  const passengers = useGameStore(state => state.passengers);
  const gates = useGameStore(state => state.gates);
  const areas = useGameStore(state => state.areas);
  const score = useGameStore(state => state.score);
  const timeRemaining = useGameStore(state => state.timeRemaining);
  const actionLogs = useGameStore(state => state.actionLogs);
  
  const startGame = useGameStore(state => state.startGame);
  const endGame = useGameStore(state => state.endGame);
  const addPassenger = useGameStore(state => state.addPassenger);
  const updatePassenger = useGameStore(state => state.updatePassenger);
  const setTimeRemaining = useGameStore(state => state.setTimeRemaining);
  const addActionLog = useGameStore(state => state.addActionLog);
  const triggerEmergencyEvent = useGameStore(state => state.triggerEmergencyEvent);

  const startNewGame = useCallback(() => {
    const level = getDefaultLevelConfig();
    startGame(level);
  }, [startGame]);

  const handleEndGame = useCallback(() => {
    endGame();
    const gameData = {
      score,
      passengers: passengers.map(p => ({
        id: p.id,
        status: p.status,
        waitTime: p.waitTime,
      })),
      actionLogs,
      timestamp: Date.now(),
    };
    localStorage.setItem('lastGameResult', JSON.stringify(gameData));
    navigate('/report');
  }, [endGame, score, passengers, actionLogs, navigate]);

  useEffect(() => {
    if (!isPlaying || isPaused || isGameOver) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      return;
    }

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;

      if (deltaTime >= 1000) {
        lastTimeRef.current = timestamp;
        
        setTimeRemaining(Math.max(0, timeRemaining - 1));

        if (currentLevel) {
          const elapsed = currentLevel.timeLimit - timeRemaining;
          currentLevel.emergencyEvents.forEach(event => {
            if (!event.triggered && elapsed >= event.triggerTime) {
              triggerEmergencyEvent(event);
            }
          });
        }

        if (timeRemaining <= 0) {
          handleEndGame();
          return;
        }
      }

      passengerSpawnRef.current += deltaTime;
      if (passengerSpawnRef.current >= 2000 && currentLevel) {
        passengerSpawnRef.current = 0;
        const maxPassengers = currentLevel.maxPassengers;
        if (passengers.length < maxPassengers) {
          const newPassenger = generatePassenger(
            gates,
            currentLevel.exits,
            800,
            500
          );
          if (newPassenger) {
            addPassenger(newPassenger);
          }
        }
      }

      if (currentLevel) {
        const congestionZones = checkCongestion(passengers);
        
        const updatedPassengers = passengers.map(passenger => 
          updatePassengerPosition(
            passenger,
            currentLevel.exits,
            areas,
            congestionZones
          )
        );

        updatedPassengers.forEach(p => {
          if (p.status !== passengers.find(orig => orig.id === p.id)?.status) {
            if (p.status === 'exited') {
              addActionLog('客流引擎', `乘客 ${p.id} 已疏散`, 'success');
            } else if (p.status === 'stuck') {
              addActionLog('客流引擎', `乘客 ${p.id} 陷入拥堵`, 'warning', `等待时间: ${p.waitTime}`);
            }
          }
          updatePassenger(p.id, p);
        });

        const allExited = passengers.length > 0 && passengers.every(p => p.status === 'exited');
        if (allExited && passengers.length >= 5) {
          addActionLog('游戏引擎', '所有乘客已疏散完成', 'success');
          handleEndGame();
          return;
        }
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPlaying, isPaused, isGameOver, timeRemaining, currentLevel, passengers, gates, areas, addPassenger, updatePassenger, setTimeRemaining, triggerEmergencyEvent, addActionLog, handleEndGame]);

  useEffect(() => {
    if (!currentLevel) {
      startNewGame();
    }
  }, [currentLevel, startNewGame]);

  if (!currentLevel) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <button
          onClick={startNewGame}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xl font-bold flex items-center gap-3"
        >
          <Play className="w-6 h-6" />
          开始游戏
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">
            地铁客流疏散模拟
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">
              关卡: {currentLevel.name}
            </span>
            <button
              onClick={handleEndGame}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm font-medium flex items-center gap-2"
            >
              <Flag className="w-4 h-4" />
              结束游戏
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3">
            <ControlPanel />
          </div>

          <div className="col-span-6">
            <StationMap />
          </div>

          <div className="col-span-3 space-y-4">
            <ScorePanel />
          </div>
        </div>

        <div className="mt-4 h-48">
          <ActionLogPanel />
        </div>
      </div>
    </div>
  );
}
