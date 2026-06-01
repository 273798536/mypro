import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { placeBlock, removeBlock, checkFailurePath } from '../utils/gameLogic';
import { getLevelById } from '../data/levels';
import TransformBlockComponent from './TransformBlock';
import MatrixDisplay from './MatrixDisplay';
import StepLogger from './StepLogger';
import type { GameState, TransformBlock } from '../types/matrix';

interface GameBoardProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
  onComplete: (state: GameState) => void;
  onBack: () => void;
}

export default function GameBoard({
  gameState,
  onGameStateChange,
  onComplete,
  onBack
}: GameBoardProps) {
  const [draggedBlock, setDraggedBlock] = useState<TransformBlock | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ x: number; y: number } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [failurePathMessage, setFailurePathMessage] = useState<string | null>(null);

  const level = getLevelById(gameState.levelId);

  useEffect(() => {
    if (gameState.isComplete) {
      const timer = setTimeout(() => {
        onComplete(gameState);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.isComplete, onComplete]);

  useEffect(() => {
    if (level) {
      const failurePath = checkFailurePath(gameState, level.failurePaths);
      if (failurePath) {
        setFailurePathMessage(failurePath.explanation);
        const timer = setTimeout(() => setFailurePathMessage(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState, level]);

  const handleDragStart = (block: TransformBlock) => {
    setDraggedBlock(block);
  };

  const handleDragEnd = () => {
    setDraggedBlock(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    setDragOverCell({ x, y });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (x: number, y: number) => {
    if (draggedBlock) {
      const newState = placeBlock(gameState, draggedBlock.id, { x, y });
      onGameStateChange(newState);
    }
    setDraggedBlock(null);
    setDragOverCell(null);
  };

  const handleCellClick = (x: number, y: number) => {
    const cell = gameState.grid[y]?.[x];
    if (cell?.blockId) {
      const newState = removeBlock(gameState, { x, y });
      onGameStateChange(newState);
    }
  };

  const getBlockById = (blockId: string) => {
    return gameState.availableBlocks.find(b => b.id === blockId);
  };

  const getAvailableBlocks = () => {
    const placedIds = gameState.grid.flat().filter(c => c.blockId).map(c => c.blockId!);
    return gameState.availableBlocks.filter(b => !placedIds.includes(b.id));
  };

  if (!level) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回关卡列表
        </button>
        
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold">{level.name}</h2>
          <p className="text-purple-200 text-sm">{level.description}</p>
        </div>

        <button
          onClick={() => setShowHint(!showHint)}
          className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
        >
          {showHint ? '隐藏提示' : '💡 提示'}
        </button>
      </div>

      {showHint && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <p className="text-yellow-800">{level.hint}</p>
        </div>
      )}

      {gameState.errorMessage && (
        <div className={clsx(
          'p-4 rounded-lg',
          gameState.errorMessage.includes('警告') 
            ? 'bg-orange-50 border-l-4 border-orange-400 text-orange-800'
            : 'bg-red-50 border-l-4 border-red-400 text-red-800 animate-shake'
        )}>
          <p>{gameState.errorMessage}</p>
        </div>
      )}

      {failurePathMessage && (
        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg animate-pulse-success">
          <p className="text-purple-800 font-medium">💡 学习提示：{failurePathMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">矩阵变换拼图区</h3>
            <p className="text-gray-500 text-sm mb-4">
              将变换块拖入下方网格，按照正确的顺序组合矩阵变换
            </p>
            
            <div className="inline-block bg-gray-50 rounded-xl p-6 mb-6">
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${level.gridSize.cols}, minmax(0, 1fr))`
                }}
              >
                {gameState.grid.map((row, y) =>
                  row.map((cell, x) => {
                  const block = cell.blockId ? getBlockById(cell.blockId) : null;
                  const isDragOver = dragOverCell?.x === x && dragOverCell?.y === y;
                  
                  return (
                    <div
                      key={cell.id}
                      className={clsx(
                        'puzzle-cell w-32 h-24 border-2 border-dashed rounded-xl flex items-center justify-center',
                        isDragOver && 'drag-over',
                        block && 'occupied border-solid border-green-300',
                        !block && 'border-gray-300'
                      )}
                      onDragOver={(e) => handleDragOver(e, x, y)}
                      onDragLeave={handleDragLeave}
                      onDrop={() => handleDrop(x, y)}
                      onClick={() => handleCellClick(x, y)}
                    >
                      {block ? (
                        <TransformBlockComponent
                          block={block}
                          size="small"
                          draggable={false}
                        />
                      ) : (
                        <span className="text-gray-400 text-sm">
                          拖放变换块到这里
                        </span>
                      )}
                    </div>
                  );
                })
              )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">可用变换块</h4>
              <div className="flex flex-wrap gap-3">
                {getAvailableBlocks().map((block) => (
                  <TransformBlockComponent
                  key={block.id}
                  block={block}
                  onDragStart={() => handleDragStart(block)}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedBlock?.id === block.id}
                />
              ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">目标矩阵</h3>
            <MatrixDisplay matrix={gameState.targetMatrix} label="目标" />
          </div>

          <div className={clsx(
            'bg-white rounded-2xl shadow-xl p-6',
            gameState.isComplete && 'animate-pulse-success ring-4 ring-green-400'
          )}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">当前矩阵</h3>
            <MatrixDisplay
              matrix={gameState.currentMatrix}
              label="当前"
              isCorrect={gameState.isComplete}
            />
          </div>

          {gameState.isComplete && (
            <div className="bg-green-500 text-white p-4 rounded-xl text-center">
              <p className="text-lg font-bold">🎉 恭喜完成！</p>
              <p className="text-sm opacity-80">正在跳转到复盘页面...</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <StepLogger steps={gameState.steps} />
      </div>
    </div>
  );
}
