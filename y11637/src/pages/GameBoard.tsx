import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Send,
  ArrowLeft,
  Clock,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getLevelById } from '../utils/storage';
import { formatTime } from '../utils/game';
import { CargoBoxCard } from '../components/CargoBoxCard';
import { CompartmentSlot } from '../components/CompartmentSlot';
import { ZONE_LABELS } from '../types';

export default function GameBoard() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const {
    currentLevel,
    currentSession,
    compartments,
    remainingTime,
    setCurrentLevel,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    placeCargo,
    removeCargo,
    undoLastAction,
    submitGame,
    setRemainingTime,
    addToast,
  } = useGameStore();

  useEffect(() => {
    if (!levelId) {
      navigate('/');
      return;
    }

    const level = getLevelById(levelId);
    if (!level) {
      navigate('/');
      return;
    }

    setCurrentLevel(level);
    if (!currentSession || currentSession.levelId !== levelId) {
      startGame(level);
    }
  }, [levelId]);

  useEffect(() => {
    if (!currentSession || currentSession.status !== 'playing') return;

    const timer = setInterval(() => {
      setRemainingTime(Math.max(0, remainingTime - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentSession, remainingTime, setRemainingTime]);

  useEffect(() => {
    if (remainingTime === 0 && currentSession?.status === 'playing') {
      addToast({
        type: 'error',
        message: '时间到！请尽快提交装载方案',
        duration: 3000,
      });
    }
  }, [remainingTime]);

  const placedCargoIds = useMemo(() => {
    return new Set(compartments.filter((c) => c.occupiedBy).map((c) => c.occupiedBy));
  }, [compartments]);

  const pendingCargos = useMemo(() => {
    if (!currentLevel) return [];
    return currentLevel.cargoBoxes.filter((c) => !placedCargoIds.has(c.id));
  }, [currentLevel, placedCargoIds]);

  const handleDrop = (compartmentId: string, cargoId: string): boolean => {
    if (!currentLevel) return false;
    const cargo = currentLevel.cargoBoxes.find((c) => c.id === cargoId);
    if (!cargo) return false;
    return placeCargo(cargo, compartmentId);
  };

  const handleSubmit = () => {
    if (!currentLevel) return;
    
    const totalCargos = currentLevel.cargoBoxes.length;
    const placedCount = compartments.filter((c) => c.occupiedBy).length;

    if (placedCount < totalCargos) {
      addToast({
        type: 'warning',
        message: `还有 ${totalCargos - placedCount} 个货箱未装载`,
        duration: 3000,
      });
      return;
    }

    submitGame();
    if (currentSession) {
      navigate(`/report/${currentSession.id}`);
    }
  };

  const handleReset = () => {
    if (!currentLevel) return;
    startGame(currentLevel);
  };

  const getCargoById = (id: string) => {
    return currentLevel?.cargoBoxes.find((c) => c.id === id);
  };

  const getStationName = (stationId: string) => {
    return currentLevel?.stations.find((s) => s.id === stationId)?.name || stationId;
  };

  const compartmentsByZone = useMemo(() => {
    if (!currentLevel) return {};
    
    const grouped: Record<string, typeof compartments> = {};
    currentLevel.compartments.forEach((c) => {
      if (!grouped[c.zone]) {
        grouped[c.zone] = [];
      }
      const actualCompartment = compartments.find((ac) => ac.id === c.id) || c;
      grouped[c.zone].push(actualCompartment);
    });
    
    return grouped;
  }, [currentLevel, compartments]);

  if (!currentLevel || !currentSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const isPaused = currentSession.status === 'paused';
  const isPlaying = currentSession.status === 'playing';
  const isTimeWarning = remainingTime <= 10;

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>返回</span>
            </button>

            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-800">{currentLevel.name}</h1>
              <p className="text-sm text-gray-500">来源: {currentLevel.source}</p>
            </div>

            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xl font-bold ${
                isTimeWarning
                  ? 'bg-status-error/10 text-status-error animate-pulse'
                  : 'bg-primary-50 text-primary-600'
              }`}
            >
              <Clock size={24} />
              {formatTime(remainingTime)}
            </div>
          </div>
        </div>
      </div>

      {isPaused && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 text-center shadow-2xl"
          >
            <Pause size={64} className="mx-auto text-primary-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">游戏暂停</h2>
            <p className="text-gray-500 mb-6">点击继续按钮恢复游戏</p>
            <button onClick={resumeGame} className="btn-primary px-8">
              继续游戏
            </button>
          </motion.div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="card p-4 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Info size={20} className="text-primary-500" />
                待装货箱
                <span className="ml-auto text-sm font-normal text-gray-500">
                  {pendingCargos.length} 个
                </span>
              </h2>

              <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide">
                {pendingCargos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">✅</div>
                    <p>所有货箱已装载</p>
                  </div>
                ) : (
                  pendingCargos.map((cargo) => (
                    <CargoBoxCard
                      key={cargo.id}
                      cargo={cargo}
                      isDraggable={isPlaying}
                      stationName={getStationName(cargo.destination)}
                    />
                  ))
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">图例说明</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ZONE_LABELS).map(([zone, label]) => (
                    <span
                      key={zone}
                      className={`text-xs px-2 py-1 rounded text-white ${
                        zone === 'frozen'
                          ? 'bg-zone-frozen'
                          : zone === 'chilled'
                          ? 'bg-zone-chilled'
                          : 'bg-zone-ambient'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">车厢格位</h2>

              {Object.entries(compartmentsByZone).map(([zone, zoneCompartments]) => (
                <div key={zone} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        zone === 'frozen'
                          ? 'bg-zone-frozen'
                          : zone === 'chilled'
                          ? 'bg-zone-chilled'
                          : 'bg-zone-ambient'
                      }`}
                    ></span>
                    <span className="font-medium text-gray-700">
                      {ZONE_LABELS[zone as keyof typeof ZONE_LABELS]}区
                    </span>
                    <span className="text-sm text-gray-400">
                      ({zoneCompartments.filter((c) => c.occupiedBy).length}/
                      {zoneCompartments.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {zoneCompartments.map((compartment) => (
                      <CompartmentSlot
                        key={compartment.id}
                        compartment={compartment}
                        cargo={
                          compartment.occupiedBy
                            ? getCargoById(compartment.occupiedBy)
                            : undefined
                        }
                        onDrop={handleDrop}
                        onRemove={removeCargo}
                        isDisabled={!isPlaying}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {currentSession.errors.length > 0 && (
              <div className="card p-4 mt-4 bg-yellow-50 border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  警告记录 ({currentSession.errors.length})
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {currentSession.errors.slice(-5).map((error, index) => (
                    <p key={index} className="text-sm text-yellow-700">
                      • {error.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              退出
            </button>

            {isPlaying ? (
              <button onClick={pauseGame} className="btn-secondary flex items-center gap-2">
                <Pause size={18} />
                暂停
              </button>
            ) : isPaused ? (
              <button onClick={resumeGame} className="btn-primary flex items-center gap-2">
                <Play size={18} />
                继续
              </button>
            ) : null}

            <button
              onClick={handleReset}
              className="btn-secondary flex items-center gap-2"
            >
              <RotateCcw size={18} />
              重开
            </button>

            <button
              onClick={undoLastAction}
              disabled={!isPlaying}
              className="btn-secondary flex items-center gap-2"
            >
              <Undo2 size={18} />
              撤销
            </button>

            <button
              onClick={handleSubmit}
              disabled={!isPlaying && !isPaused}
              className="btn-primary flex items-center gap-2"
            >
              <Send size={18} />
              提交
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
