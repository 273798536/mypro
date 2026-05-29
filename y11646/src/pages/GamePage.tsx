import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { Chemical, ShelfSlot } from '../types';
import { ShelfGrid } from '../components/game/ShelfGrid';
import { ChemicalLibrary } from '../components/game/ChemicalLibrary';
import { ControlPanel } from '../components/game/ControlPanel';
import { RiskIndicator } from '../components/game/RiskIndicator';
import { OperationHistory } from '../components/game/OperationHistory';

export const GamePage: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  
  const {
    currentGame,
    chemicals: allChemicals,
    loadData,
    startGame,
    resumeGame,
    placeChemical,
    removeChemical,
    completeGame,
    pauseGame,
    resumeFromPause,
    resetGame,
    getChemicalById,
    getCurrentRisks,
    getLevelById
  } = useGameStore();

  const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!currentGame && levelId) {
      const resumed = resumeGame();
      if (!resumed || currentGame?.levelId !== levelId) {
        startGame(levelId);
      }
    }
  }, [levelId, currentGame, resumeGame, startGame]);

  useEffect(() => {
    if (!currentGame) return;

    const level = getLevelById(currentGame.levelId);
    if (!level) return;

    const elapsed = Math.floor((Date.now() - currentGame.startTime) / 1000);
    const remaining = Math.max(0, level.timeLimit - elapsed);
    setTimeRemaining(remaining);

    if (remaining <= 0 && !currentGame.isCompleted) {
      handleComplete();
    }
  }, [currentGame]);

  useEffect(() => {
    if (!currentGame || currentGame.isPaused || currentGame.isCompleted) return;

    const timer = setInterval(() => {
      const level = getLevelById(currentGame.levelId);
      if (!level) return;

      const elapsed = Math.floor((Date.now() - currentGame.startTime) / 1000);
      const remaining = Math.max(0, level.timeLimit - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        handleComplete();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentGame?.isPaused, currentGame?.isCompleted, currentGame?.startTime]);

  const level = useMemo(() => {
    if (!currentGame) return null;
    return getLevelById(currentGame.levelId);
  }, [currentGame?.levelId, getLevelById]);

  const availableChemicals = useMemo(() => {
    if (!currentGame) return [];
    return currentGame.remainingChemicals
      .map(id => getChemicalById(id))
      .filter((c): c is Chemical => c !== undefined);
  }, [currentGame?.remainingChemicals, getChemicalById]);

  const allRisks = useMemo(() => getCurrentRisks(), [currentGame?.shelf.slots, getCurrentRisks]);

  const canComplete = useMemo(() => {
    if (!currentGame || !level) return false;
    const placedCount = currentGame.shelf.slots.filter(s => s.chemicalId !== null).length;
    return placedCount >= level.requiredPlacements;
  }, [currentGame, level]);

  const handleChemicalSelect = (chemical: Chemical) => {
    setSelectedChemical(chemical);
  };

  const handleSlotClick = (slot: ShelfSlot) => {
    if (selectedChemical && !slot.chemicalId) {
      handlePlaceChemical(selectedChemical.id, slot.id);
      setSelectedChemical(null);
    } else if (slot.chemicalId) {
      if (confirm('确定要移除此化学品吗？')) {
        removeChemical(slot.id);
      }
    }
  };

  const handlePlaceChemical = (chemicalId: string, slotId: string) => {
    placeChemical(chemicalId, slotId);
  };

  const handleDragStart = (e: React.DragEvent, chemicalId: string) => {
    e.dataTransfer.setData('chemicalId', chemicalId);
  };

  const handleComplete = () => {
    const history = completeGame();
    if (history) {
      navigate(`/result/${history.id}`);
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置游戏吗？所有进度将丢失。')) {
      resetGame();
      if (levelId) {
        startGame(levelId);
      }
    }
  };

  if (!currentGame || !level) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold">{level.name}</h1>
                <p className="text-sm text-gray-400">{level.description}</p>
              </div>
            </div>
            {allRisks.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/50 rounded-lg border border-red-500">
                <AlertTriangle size={16} className="text-red-400" />
                <span className="text-sm text-red-300">
                  检测到 {allRisks.length} 项风险
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <ChemicalLibrary
              chemicals={availableChemicals}
              onChemicalSelect={handleChemicalSelect}
              selectedChemicalId={selectedChemical?.id}
              onDragStart={handleDragStart}
            />
          </div>

          <div className="col-span-6 space-y-4">
            <ShelfGrid
              shelf={currentGame.shelf}
              onSlotClick={handleSlotClick}
              onChemicalPlace={handlePlaceChemical}
            />
            <OperationHistory operations={currentGame.operationLogs} />
          </div>

          <div className="col-span-3 space-y-4">
            <ControlPanel
              currentScore={currentGame.currentScore}
              maxScore={currentGame.maxPossibleScore}
              timeRemaining={timeRemaining}
              isPaused={currentGame.isPaused}
              canComplete={canComplete}
              onPause={pauseGame}
              onResume={resumeFromPause}
              onReset={handleReset}
              onComplete={handleComplete}
              onViewHistory={() => navigate('/history')}
            />
            <RiskIndicator risks={allRisks} />
          </div>
        </div>
      </main>

      {currentGame.isPaused && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md text-center border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">游戏已暂停</h2>
            <p className="text-gray-400 mb-6">点击继续按钮恢复游戏</p>
            <button
              onClick={resumeFromPause}
              className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
            >
              继续游戏
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
