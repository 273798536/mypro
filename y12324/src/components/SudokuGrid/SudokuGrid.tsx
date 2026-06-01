import React, { useMemo } from 'react';
import { SudokuCell } from './SudokuCell';
import { usePuzzleStore } from '../../stores/usePuzzleStore';
import { calculateHeatmapScore } from '../../engine/conflictDetector';

interface SudokuGridProps {
  showLabels?: boolean;
}

export const SudokuGrid: React.FC<SudokuGridProps> = ({ showLabels = true }) => {
  const { puzzle, getCurrentBoard, getCurrentCandidates, errors, showHeatmap } = usePuzzleStore();
  
  const board = getCurrentBoard();
  const candidates = getCurrentCandidates();
  
  const heatmapScores = useMemo(() => {
    if (showHeatmap) {
      return calculateHeatmapScore(board, candidates);
    }
    return null;
  }, [board, candidates, showHeatmap]);
  
  const errorMap = useMemo(() => {
    const map = new Map<string, { severity: string }>();
    errors.forEach((error) => {
      const key = `${error.triggerCell.row},${error.triggerCell.col}`;
      map.set(key, { severity: error.severity });
    });
    return map;
  }, [errors]);

  const isInitialCell = (row: number, col: number) => {
    return puzzle.initialBoard[row][col] !== null;
  };

  return (
    <div className="inline-block">
      {showLabels && (
        <div className="flex ml-6 mb-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => (
            <div
              key={col}
              className="w-12 sm:w-14 text-center text-xs text-gray-400 font-medium"
            >
              {col}
            </div>
          ))}
        </div>
      )}
      
      <div className="flex">
        {showLabels && (
          <div className="flex flex-col justify-around mr-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((row) => (
              <div
                key={row}
                className="h-12 sm:h-14 flex items-center text-xs text-gray-400 font-medium"
              >
                {row}
              </div>
            ))}
          </div>
        )}
        
        <div className="grid grid-cols-9 border-2 border-sudoku-primary rounded-sm overflow-hidden shadow-lg">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const cellKey = `${rowIndex},${colIndex}`;
              const errorInfo = errorMap.get(cellKey);
              
              return (
                <SudokuCell
                  key={cellKey}
                  row={rowIndex}
                  col={colIndex}
                  value={cell}
                  candidates={candidates[rowIndex][colIndex]}
                  isInitial={isInitialCell(rowIndex, colIndex)}
                  heatmapScore={heatmapScores?.[rowIndex][colIndex]}
                  hasError={!!errorInfo}
                  errorSeverity={errorInfo?.severity}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
