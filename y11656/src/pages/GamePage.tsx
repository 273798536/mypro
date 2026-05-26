import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameBoard } from '@/components/game/GameBoard';
import { FeedbackToast } from '@/components/game/FeedbackToast';
import { useGameStore } from '@/store/useGameStore';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameLogic } from '@/hooks/useGameLogic';
import { getLevelById } from '@/data/levels';
import { generateBookItems } from '@/data/books';
import { generateBookItems as generateBooks } from '@/data/books';

export function GamePage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  
  const { startGame, currentLevel, items, processedItems, score, status, currentRecordId } = useGameStore();
  const { startTimer, timeRemaining } = useGameTimer();
  const { toasts, draggedItem, handleDragStart, handleDragEnd, handleDrop } = useGameLogic();

  const handleDropWithNavigation = useCallback((target: any) => {
    handleDrop(target);
  }, [handleDrop]);

  useEffect(() => {
    if (!levelId) return;
    
    const level = getLevelById(parseInt(levelId));
    if (!level) {
      navigate('/');
      return;
    }

    if (status === 'idle' || currentLevel?.id !== level.id) {
      const bookItems = generateBookItems(level.itemCount);
      startGame(level, bookItems);
      startTimer();
    }
  }, [levelId, status, currentLevel, startGame, startTimer, navigate]);

  useEffect(() => {
    if (status === 'completed' && currentRecordId) {
      navigate(`/result/${currentRecordId}`);
    }
  }, [status, currentRecordId, navigate]);

  if (!currentLevel || items.length === 0) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-700 text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <GameBoard
        items={items}
        processedItems={processedItems}
        timeRemaining={timeRemaining}
        totalTime={currentLevel.timeLimit}
        score={score}
        levelName={currentLevel.name}
        draggedItem={draggedItem}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDrop={handleDropWithNavigation}
      />
      <FeedbackToast toasts={toasts} />
    </>
  );
}
