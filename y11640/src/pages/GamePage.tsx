import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { StationMap } from '@/components/StationMap';
import { ControlPanel } from '@/components/ControlPanel';
import { ScorePanel } from '@/components/ScorePanel';
import { ActionLogPanel } from '@/components/ActionLog';
import { getDefaultLevelConfig, generatePassenger, updatePassengerPosition, checkCongestion, calculatePath } from '@/engine/gameEngine';
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
  const setCongestionZones = useGameStore(state => state.setCongestionZones);
  const checkBroadcastMissed = useGameStore(state => state.checkBroadcastMissed);
  const addDetourWarning = useGameStore(state => state.addDetourWarning);

  const startNewGame = useCallback(() => {
    const level = getDefaultLevelConfig();
    startGame(level);
  }, [startGame]);

  const handleEndGame = useCallback(() => {
    endGame();
    const gameData = {
      score,
      timeRemaining,
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
  }, [endGame, score, timeRemaining, passengers, actionLogs, navigate]);

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
        
        const newTime = Math.max(0, timeRemaining - 1);
        setTimeRemaining(newTime);

        if (currentLevel && currentLevel.timeLimit > 0) {
          const elapsed = currentLevel.timeLimit - newTime;
          currentLevel.emergencyEvents.forEach(event => {
            if (!event.triggered && elapsed >= event.triggerTime) {
              triggerEmergencyEvent(event);
            }
          });
        }

        checkBroadcastMissed();

        if (newTime <= 0) {
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
        setCongestionZones(congestionZones);
        
        const updatedPassengers = passengers.map(passenger => {
          const newPassenger = updatePassengerPosition(
            passenger,
            currentLevel.exits,
            areas,
            congestionZones
          );

          if (newPassenger.status !== 'exited' && newPassenger.status !== 'stuck') {
            const exit = currentLevel.exits.find(e => e.id === newPassenger.targetExit);
            if (exit) {
              const straightPath = calculatePath(
                passenger.x, passenger.y, exit.x, exit.y, []
              );
              const blockedPath = calculatePath(
                passenger.x, passenger.y, exit.x, exit.y, areas
              );
              
              if (straightPath.length > 1 && blockedPath.length > 1) {
                let straightDist = 0;
                let blockedDist = 0;
                for (let i = 1; i < straightPath.length; i++) {
                  straightDist += Math.sqrt(
                    Math.pow(straightPath[i].x - straightPath[i-1].x, 2) +
                    Math.pow(straightPath[i].y - straightPath[i-1].y, 2)
                  );
                }
                for (let i = 1; i < blockedPath.length; i++) {
                  blockedDist += Math.sqrt(
                    Math.pow(blockedPath[i].x - blockedPath[i-1].x, 2) +
                    Math.pow(blockedPath[i].y - blockedPath[i-1].y, 2)
                  );
                }
                
                if (straightDist > 0 && blockedDist > straightDist * 1.5) {
                  const detourPercent = Math.round((blockedDist - straightDist) / straightDist * 100);
                  addDetourWarning(passenger.id, detourPercent);
                }
              }
            }
          }

          return newPassenger;
        });

        updatedPassengers.forEach(p => {
          const original = passengers.find(orig => orig.id === p.id);
          if (original && p.status !== original.status) {
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
  }, [isPlaying, isPaused, isGameOver, timeRemaining, currentLevel, passengers, gates, areas, addPassenger, updatePassenger, setTimeRemaining, triggerEmergencyEvent, addActionLog, handleEndGame, setCongestionZones, checkBroadcastMissed, addDetourWarning]);

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
