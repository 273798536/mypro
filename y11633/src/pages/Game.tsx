import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameMap } from '../components/game/GameMap';
import { RobotPanel } from '../components/game/RobotPanel';
import { OrderPanel } from '../components/game/OrderPanel';
import { StatusBar } from '../components/game/StatusBar';
import { GameControls } from '../components/game/GameControls';
import { AnomalyPanel } from '../components/game/AnomalyPanel';
import { useGameStore, saveGameRecord } from '../store/gameStore';
import { LEVEL_CONFIGS } from '../data/levels';

export default function Game() {
  const navigate = useNavigate();
  const gameState = useGameStore();
  const lastTimeRef = useRef<number>(0);
  const orderTimerRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const [showAnomalies, setShowAnomalies] = useState(false);
  const prevAnomalyCountRef = useRef(0);

  const {
    status,
    robots,
    orders,
    shelves,
    chargers,
    obstacles,
    anomalies,
    totalScore,
    elapsedTime,
    speed,
    selectedRobotId,
    gridSize,
    level,
  } = gameState;

  const tick = useGameStore(state => state.tick);
  const addOrder = useGameStore(state => state.addOrder);
  const setSpeed = useGameStore(state => state.setSpeed);
  const selectRobot = useGameStore(state => state.selectRobot);

  const config = LEVEL_CONFIGS[level];

  const gameLoop = useCallback(
    (currentTime: number) => {
      if (status !== 'playing') {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      const adjustedDelta = deltaTime * speed;
      tick(adjustedDelta);

      orderTimerRef.current += adjustedDelta * 1000;
      if (orderTimerRef.current >= config.orderInterval) {
        addOrder();
        orderTimerRef.current = 0;
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [status, speed, tick, addOrder, config.orderInterval]
  );

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameLoop]);

  useEffect(() => {
    if (anomalies.length > prevAnomalyCountRef.current) {
      setShowAnomalies(true);
      prevAnomalyCountRef.current = anomalies.length;
    }
  }, [anomalies.length]);

  useEffect(() => {
    if (status === 'finished') {
      saveGameRecord(gameState);
      navigate(`/result/${gameState.id}`);
    }
  }, [status, navigate, gameState]);

  useEffect(() => {
    if (robots.length === 0) {
      navigate('/');
    }
  }, [robots.length, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <StatusBar
          status={status}
          totalScore={totalScore}
          elapsedTime={elapsedTime}
          orders={orders}
          anomalies={anomalies}
        />

        <GameControls
          status={status}
          speed={speed}
          onSpeedChange={setSpeed}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <GameMap
              gridSize={gridSize}
              robots={robots}
              shelves={shelves}
              chargers={chargers}
              obstacles={obstacles}
              selectedRobotId={selectedRobotId}
            />
          </div>
          <div className="space-y-4">
            <RobotPanel
              robots={robots}
              selectedRobotId={selectedRobotId}
              onSelectRobot={selectRobot}
            />
            <OrderPanel
              orders={orders}
              shelves={shelves}
              selectedRobotId={selectedRobotId}
            />
          </div>
        </div>
      </div>

      {showAnomalies && (
        <AnomalyPanel
          anomalies={anomalies}
          onClose={() => setShowAnomalies(false)}
        />
      )}
    </div>
  );
}
