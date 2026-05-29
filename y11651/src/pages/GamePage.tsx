import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useGame } from '../store/gameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { useSonarSystem } from '../hooks/useSonarSystem';
import { getLevelById } from '../data/levels';
import { GameGrid } from '../components/game/GameGrid';
import { ControlPanel } from '../components/game/ControlPanel';
import { StatusPanel } from '../components/game/StatusPanel';
import { NotificationArea } from '../components/game/NotificationArea';
import { Button } from '../components/ui/Button';
import { getScannedCount, getMarkedCells } from '../utils/gridUtils';

export const GamePage: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const { initGame, handleScan, handleMark, endTurn, submitGuess, resetGame, removeNotification } = useGameEngine();
  const { canScan } = useSonarSystem();

  const [isScanning, setIsScanning] = useState(false);
  const [scanPosition, setScanPosition] = useState<{ x: number; y: number } | null>(null);
  const [isGuessMode, setIsGuessMode] = useState(false);
  const [selectedGuess, setSelectedGuess] = useState<{ x: number; y: number } | null>(null);

  const level = getLevelById(Number(levelId));

  useEffect(() => {
    if (level) {
      initGame(level);
    }
  }, [levelId, initGame]);

  useEffect(() => {
    if (state.status === 'finished') {
      navigate(`/result/${state.currentLevel}`);
    }
  }, [state.status, state.currentLevel, navigate]);

  const handleCellClick = (position: { x: number; y: number }) => {
    if (isGuessMode) {
      setSelectedGuess(position);
      return;
    }

    if (!canScan()) return;

    setIsScanning(true);
    setScanPosition(position);
    
    const result = handleScan(position);
    
    setTimeout(() => {
      setIsScanning(false);
      setScanPosition(null);
    }, 500);
  };

  const handleCellRightClick = (position: { x: number; y: number }) => {
    if (isGuessMode) return;
    handleMark(position);
  };

  const handleSubmitGuess = () => {
    if (!selectedGuess) return;
    submitGuess(selectedGuess);
  };

  const handleEndTurn = () => {
    endTurn();
  };

  const handleReset = () => {
    if (level) {
      resetGame();
      initGame(level);
      setIsGuessMode(false);
      setSelectedGuess(null);
    }
  };

  if (!level || state.status === 'idle') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  const markedCount = getMarkedCells(state.grid);
  const scannedCount = getScannedCount(state.grid);
  const totalCells = state.gridSize * state.gridSize;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <motion.h1 className="text-2xl font-bold text-white">
            关卡 {level.id}: {level.name}
          </motion.h1>
          <div className="w-24" />
        </div>

        <div className="grid lg:grid-cols-[280px_1fr_280px] gap-6">
          <ControlPanel
            energy={state.energy}
            maxEnergy={state.maxEnergy}
            scanCost={state.scanCost}
            cooldown={state.cooldown}
            cooldownTime={state.cooldownTime}
            turn={state.turn}
            maxTurns={state.maxTurns}
            canScan={canScan()}
            onEndTurn={handleEndTurn}
            onReset={handleReset}
            onSubmitGuess={handleSubmitGuess}
            isGuessMode={isGuessMode}
            onToggleGuessMode={() => {
              setIsGuessMode(!isGuessMode);
              setSelectedGuess(null);
            }}
          />

          <div className="flex flex-col items-center">
            <GameGrid
              grid={state.grid}
              gridSize={state.gridSize}
              onCellClick={handleCellClick}
              onCellRightClick={handleCellRightClick}
              isScanning={isScanning}
              scanPosition={scanPosition}
              disabled={state.status !== 'playing'}
            />
            
            {isGuessMode && (
              <div className="mt-4 text-center">
                <p className="text-yellow-400 text-sm mb-2">
                {selectedGuess 
                  ? `已选择位置: (${selectedGuess.x}, ${selectedGuess.y})`
                  : '请点击网格选择目标位置'
                }
                </p>
              </div>
            )}
          </div>

          <StatusPanel
            scanHistory={state.scanHistory}
            submarine={state.submarine}
            markedCells={markedCount.length}
            scannedCells={scannedCount}
            totalCells={totalCells}
            showSubmarineInfo={false}
          />
        </div>
      </div>

      <NotificationArea
        notifications={state.notifications}
        onRemove={removeNotification}
      />
    </div>
  );
};
