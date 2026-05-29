import React, { useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getLevelById } from '../../data/levels';
import type { CargoBox, Compartment } from '../../data/types';
import CargoBoxItem from './CargoBoxItem';
import CompartmentSlot from './CompartmentSlot';
import Timer from './Timer';
import TemperatureGauge from './TemperatureGauge';
import FeedbackToast from './FeedbackToast';
import { cn } from '@/lib/utils';

const GameBoard: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();

  const {
    status,
    placements,
    placeCargoBox,
    initGame,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    completeGame,
    tickTimer,
    setDraggedCargoBox,
    failureReasons,
  } = useGameStore();

  const level = levelId ? getLevelById(levelId) : undefined;

  useEffect(() => {
    if (levelId) {
      initGame(levelId);
    }
  }, [levelId, initGame]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'playing') {
      interval = setInterval(() => {
        tickTimer();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, tickTimer]);

  const handleDragStart = useCallback((_e: React.DragEvent, cargoBox: CargoBox) => {
    setDraggedCargoBox(cargoBox);
  }, [setDraggedCargoBox]);

  const handleDragEnd = useCallback(() => {
    setDraggedCargoBox(null);
  }, [setDraggedCargoBox]);

  const handleDrop = useCallback((cargoBox: CargoBox, compartment: Compartment) => {
    placeCargoBox(cargoBox, compartment);
    setDraggedCargoBox(null);
  }, [placeCargoBox, setDraggedCargoBox]);

  const handleComplete = () => {
    if (!level) return;
    const allPlaced = level.cargoBoxes.every(box =>
      placements.some(p => p.cargoBoxId === box.id)
    );

    if (!allPlaced) {
      useGameStore.getState().addFeedback('warning', '还有货箱未放置，请确认是否完成装车');
      return;
    }

    completeGame();
    navigate(`/result/${levelId}`);
  };

  if (!level) {
    return (
      <div className="min-h-screen bg-cold-chain-dark flex items-center justify-center">
        <p className="text-white font-mono">关卡不存在</p>
      </div>
    );
  }

  const zoneFailures = failureReasons.filter(f => f.type === 'zone_mismatch');
  const allPlaced = level.cargoBoxes.every(box =>
    placements.some(p => p.cargoBoxId === box.id)
  );

  const groupedCompartments = level.compartments.reduce((acc, comp) => {
    if (!acc[comp.temperatureZone]) {
      acc[comp.temperatureZone] = [];
    }
    acc[comp.temperatureZone].push(comp);
    return acc;
  }, {} as Record<string, Compartment[]>);

  const zoneOrder = ['frozen', 'chilled', 'normal'];

  return (
    <div className="min-h-screen bg-cold-chain-dark text-white">
      <FeedbackToast />

      <header className="sticky top-0 z-40 bg-cold-chain-dark/95 backdrop-blur-sm border-b border-cold-chain-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-cold-chain-panel rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display font-bold text-lg">{level.originalName}</h1>
                <p className="text-xs text-gray-400 font-mono">{level.originalTimeLimit}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Timer />
              <div className="flex items-center gap-2">
                {status === 'idle' && (
                  <button
                    onClick={startGame}
                    className="flex items-center gap-2 px-4 py-2 bg-cold-chain-success hover:bg-cold-chain-success/80 rounded-lg font-mono text-sm transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    开始装车
                  </button>
                )}
                {status === 'playing' && (
                  <>
                    <button
                      onClick={pauseGame}
                      className="flex items-center gap-2 px-4 py-2 bg-cold-chain-warning hover:bg-cold-chain-warning/80 rounded-lg font-mono text-sm transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      暂停
                    </button>
                    <button
                      onClick={resetGame}
                      className="flex items-center gap-2 px-4 py-2 bg-cold-chain-panel hover:bg-cold-chain-panel/80 border border-cold-chain-border rounded-lg font-mono text-sm transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      重置
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={!allPlaced}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-colors',
                        allPlaced
                          ? 'bg-cold-chain-primary hover:bg-cold-chain-primary/80'
                          : 'bg-cold-chain-panel/50 text-gray-500 cursor-not-allowed'
                      )}
                    >
                      <CheckCircle className="w-4 h-4" />
                      完成装车
                    </button>
                  </>
                )}
                {status === 'paused' && (
                  <button
                    onClick={resumeGame}
                    className="flex items-center gap-2 px-4 py-2 bg-cold-chain-success hover:bg-cold-chain-success/80 rounded-lg font-mono text-sm transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    继续
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5">
            <div className="sticky top-24">
              <div className="bg-cold-chain-panel rounded-xl border-2 border-cold-chain-border p-4 mb-4">
                <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-cold-chain-primary rounded text-xs">规则</span>
                </h2>
                <p className="text-sm text-gray-300 font-mono whitespace-pre-line">
                  {level.originalRules}
                </p>
              </div>

              <TemperatureGauge />

              <div className="mt-4 bg-cold-chain-panel rounded-xl border-2 border-cold-chain-border p-4">
                <h2 className="font-display font-bold text-lg mb-3">
                  待装货箱 ({level.cargoBoxes.length - placements.filter(p => p.isCorrectZone).length}/{level.cargoBoxes.length})
                </h2>
                {zoneFailures.length > 0 && (
                  <div className="mb-3 p-2 bg-cold-chain-danger/20 border border-cold-chain-danger/50 rounded-lg">
                    <p className="text-xs text-cold-chain-danger font-mono">
                      ⚠️ 已发现 {zoneFailures.length} 处温层混放
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                  {level.cargoBoxes.map(cargoBox => (
                    <CargoBoxItem
                      key={cargoBox.id}
                      cargoBox={cargoBox}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDraggable={status === 'playing'}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-7">
            <div className="bg-cold-chain-panel rounded-xl border-2 border-cold-chain-border p-4">
              <h2 className="font-display font-bold text-lg mb-4">车厢格位布局</h2>
              <p className="text-xs text-gray-400 font-mono mb-4">
                提示：格位列号越大越靠近车门。先卸货的货物应放在列号较大的格位。
              </p>

              <div className="space-y-6">
                {zoneOrder.map(zone => {
                  const compartments = groupedCompartments[zone] || [];
                  if (compartments.length === 0) return null;

                  const sortedCompartments = [...compartments].sort((a, b) => {
                    if (a.position.row !== b.position.row) return a.position.row - b.position.row;
                    return a.position.col - b.position.col;
                  });

                  const maxCols = Math.max(...sortedCompartments.map(c => c.position.col)) + 1;

                  return (
                    <div key={zone}>
                      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}>
                        {sortedCompartments.map(compartment => (
                          <CompartmentSlot
                            key={compartment.id}
                            compartment={compartment}
                            onDrop={handleDrop}
                            cargoBoxes={level.cargoBoxes}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-cold-chain-border">
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>← 车厢内侧</span>
                  <span>车厢车门 →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
