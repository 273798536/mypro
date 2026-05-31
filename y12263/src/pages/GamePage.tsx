
import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Drones } from '@/constants';
import { generateId, getWindAtPosition, calculateEnergyConsumption, calculateActualSpeed, calculateDistance, calculateReturnEnergyRequired, checkHeadwindExposure, checkPathEfficiency } from '@/utils/gameEngine';
import GameMap from '@/components/GameMap';
import ControlPanel from '@/components/ControlPanel';
import EnergyPanel from '@/components/EnergyPanel';
import ViolationTag from '@/components/ViolationTag';
import { Waypoint, EnergyLog, Violation } from '@/types';

export default function GamePage() {
  const {
    windZones,
    waypoints,
    gameState,
    currentFlightId,
    selectedDroneId,
    pilotName,
    setGameState,
    setSelectedDroneId,
    setPilotName,
    addWaypoint,
    removeWaypoint,
    startFlight,
    endFlight,
    resetGame,
    updateFlightRecord,
    addViolation
  } = useGameStore();

  const [currentConsumption, setCurrentConsumption] = useState(0);
  const [returnMargin, setReturnMargin] = useState(50);
  const [requiredMargin, setRequiredMargin] = useState(20);
  const [showViolations, setShowViolations] = useState<Violation[]>([]);
  const [flightEnergyLogs, setFlightEnergyLogs] = useState<EnergyLog[]>([]);

  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);

  const selectedDrone = Drones.find(d => d.id === selectedDroneId)!;
  const isInHeadwind = gameState.currentWind === 'headwind' && gameState.windSpeed >= 3;

  const handleAddWaypoint = useCallback(() => {
    const newWaypoint: Waypoint = {
      id: generateId(),
      x: 400 + Math.random() * 200 - 100,
      y: 300 + Math.random() * 200 - 100,
      name: `检查点${String.fromCharCode(64 + waypoints.length)}`,
      type: 'checkpoint',
      order: waypoints.length - 1
    };
    addWaypoint(newWaypoint);
  }, [waypoints.length, addWaypoint]);

  const handleMapClick = useCallback((position: { x: number; y: number }) => {
    if (gameState.isFlying || waypoints.length >= 8) return;
    
    const newWaypoint: Waypoint = {
      id: generateId(),
      x: position.x,
      y: position.y,
      name: `检查点${String.fromCharCode(64 + waypoints.length)}`,
      type: 'checkpoint',
      order: waypoints.length - 1
    };
    addWaypoint(newWaypoint);
  }, [gameState.isFlying, waypoints.length, addWaypoint]);

  const gameLoop = useCallback((timestamp: number) => {
    if (!gameState.isFlying) return;

    const deltaTime = timestamp - lastUpdateRef.current;
    if (deltaTime < 50) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    lastUpdateRef.current = timestamp;
    gameTimeRef.current += deltaTime;

    const currentPos = gameState.currentPosition;
    const currentWaypointIndex = gameState.currentWaypointIndex;
    const targetWaypoint = waypoints[currentWaypointIndex + 1];

    if (!targetWaypoint) {
      endFlight();
      return;
    }

    const windInfo = getWindAtPosition(currentPos, windZones);
    const actualSpeed = calculateActualSpeed(selectedDrone.cruiseSpeed, windInfo.type, windInfo.speed);
    const consumption = calculateEnergyConsumption(selectedDrone.baseConsumption, windInfo.type, gameState.speed, windInfo.speed);

    const distToTarget = calculateDistance(currentPos, targetWaypoint);
    const moveDistance = actualSpeed * (deltaTime / 1000) * 5;

    let newPos = { ...currentPos };
    let newWaypointIndex = currentWaypointIndex;

    if (distToTarget <= moveDistance) {
      newPos = { x: targetWaypoint.x, y: targetWaypoint.y };
      newWaypointIndex = currentWaypointIndex + 1;
    } else {
      const ratio = moveDistance / distToTarget;
      newPos = {
        x: currentPos.x + (targetWaypoint.x - currentPos.x) * ratio,
        y: currentPos.y + (targetWaypoint.y - currentPos.y) * ratio
      };
    }

    const newBattery = Math.max(0, gameState.currentBattery - consumption * (deltaTime / 1000));

    const returnInfo = calculateReturnEnergyRequired(
      newPos,
      waypoints[0],
      windZones,
      selectedDrone.baseConsumption,
      selectedDrone.cruiseSpeed
    );
    const currentReturnMargin = (newBattery / selectedDrone.maxBattery) * 100;
    
    setReturnMargin(currentReturnMargin);
    setRequiredMargin(returnInfo.safetyMargin);
    setCurrentConsumption(consumption);

    const newEnergyLog: EnergyLog = {
      timestamp: gameTimeRef.current,
      battery: newBattery,
      consumption,
      windType: windInfo.type,
      windSpeed: windInfo.speed,
      position: { ...newPos }
    };
    setFlightEnergyLogs(prev => [...prev, newEnergyLog]);

    if (currentFlightId) {
      updateFlightRecord(currentFlightId, {
        energyLogs: flightEnergyLogs
      });
    }

    if (newBattery <= returnInfo.energy) {
      const violation: Violation = {
        id: generateId(),
        type: 'insufficient_return',
        description: `返航电量不足！当前余量${currentReturnMargin.toFixed(1)}%，需要${returnInfo.safetyMargin}%${returnInfo.hasHeadwindRisk ? '(逆风条件)' : ''}`,
        penalty: 20,
        ruleReference: 'R002',
        timestamp: Date.now(),
        highlighted: false
      };
      addViolation(currentFlightId!, violation);
      setShowViolations(prev => [...prev, violation]);
    }

    setGameState({
      currentPosition: newPos,
      currentBattery: newBattery,
      currentWaypointIndex: newWaypointIndex,
      currentWind: windInfo.type,
      windSpeed: windInfo.speed
    });

    if (newBattery <= 0) {
      endFlight();
      return;
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, waypoints, windZones, selectedDrone, currentFlightId, flightEnergyLogs, endFlight, updateFlightRecord, addViolation, setGameState]);

  const handleStartFlight = () => {
    gameTimeRef.current = 0;
    setFlightEnergyLogs([]);
    setShowViolations([]);
    
    const pathCheck = checkPathEfficiency(waypoints);
    if (!pathCheck.isEfficient) {
      pathCheck.violations.forEach(v => setShowViolations(prev => [...prev, v]));
    }
    
    startFlight();
  };

  const handleEndFlight = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const headwindCheck = checkHeadwindExposure(flightEnergyLogs);
    if (headwindCheck.hasExcessiveHeadwind && currentFlightId) {
      headwindCheck.violations.forEach(v => {
        addViolation(currentFlightId, v);
        setShowViolations(prev => [...prev, v]);
      });
    }
    
    endFlight();
  };

  const handleReset = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setFlightEnergyLogs([]);
    setShowViolations([]);
    resetGame();
  };

  useEffect(() => {
    if (gameState.isFlying) {
      lastUpdateRef.current = performance.now();
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.isFlying, gameLoop]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-4">
            <ControlPanel
              selectedDroneId={selectedDroneId}
              pilotName={pilotName}
              waypoints={waypoints}
              isFlying={gameState.isFlying}
              onDroneChange={setSelectedDroneId}
              onPilotNameChange={setPilotName}
              onStartFlight={handleStartFlight}
              onEndFlight={handleEndFlight}
              onReset={handleReset}
              onAddWaypoint={handleAddWaypoint}
              onRemoveWaypoint={removeWaypoint}
            />
          </div>

          <div className="col-span-6">
            <GameMap
              windZones={windZones}
              waypoints={waypoints}
              dronePosition={gameState.currentPosition}
              isFlying={gameState.isFlying}
              onMapClick={handleMapClick}
              highlightHeadwind={isInHeadwind}
            />
            
            {showViolations.length > 0 && (
              <div className="mt-4 bg-slate-800/80 rounded-xl p-4 border border-red-500/30">
                <h4 className="text-sm font-medium text-red-400 mb-2">检测到违规</h4>
                <div className="flex flex-wrap gap-2">
                  {showViolations.map(v => (
                    <ViolationTag 
                      key={v.id} 
                      type={v.type} 
                      highlighted={v.highlighted}
                    />
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-400 space-y-1">
                  {showViolations.map(v => (
                    <div key={v.id} className="flex items-start gap-2">
                      <span className="text-red-400">-{v.penalty}分</span>
                      <span>{v.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="col-span-3 space-y-4">
            <EnergyPanel
              currentBattery={gameState.currentBattery}
              maxBattery={selectedDrone.maxBattery}
              currentConsumption={currentConsumption}
              currentWind={gameState.currentWind}
              windSpeed={gameState.windSpeed}
              isInHeadwind={isInHeadwind}
              returnMargin={returnMargin}
              requiredMargin={requiredMargin}
            />

            <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-lg font-bold text-cyan-400 mb-3">飞行状态</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">当前航点</span>
                  <span className="text-white">
                    {gameState.currentWaypointIndex + 1} / {waypoints.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">飞行速度</span>
                  <span className="text-white">{gameState.speed} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">飞行时间</span>
                  <span className="text-white font-mono">
                    {Math.floor(gameTimeRef.current / 1000)}s
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-300 mb-2">💡 操作提示</h3>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>• 点击地图添加航点</li>
                <li>• 红色区域为逆风区，能耗较高</li>
                <li>• 绿色区域为顺风区，节省电量</li>
                <li>• 合理规划航线，平衡距离与能耗</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
