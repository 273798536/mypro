import React from 'react';
import { usePuzzleStore } from '../../stores/usePuzzleStore';

interface SudokuCellProps {
  row: number;
  col: number;
  value: number | null;
  candidates: Set<number>;
  isInitial: boolean;
  heatmapScore?: number;
  hasError?: boolean;
  errorSeverity?: string;
}

export const SudokuCell: React.FC<SudokuCellProps> = ({
  row,
  col,
  value,
  candidates,
  isInitial,
  heatmapScore = 0,
  hasError = false,
  errorSeverity,
}) => {
  const { selectedCell, setSelectedCell, showCandidates, showHeatmap } = usePuzzleStore();
  const isSelected = selectedCell?.row === row && selectedCell?.col === col;

  const isHighlighted = selectedCell && (
    selectedCell.row === row ||
    selectedCell.col === col ||
    (Math.floor(selectedCell.row / 3) === Math.floor(row / 3) &&
     Math.floor(selectedCell.col / 3) === Math.floor(col / 3))
  );

  const handleClick = () => {
    setSelectedCell({ row, col });
  };

  const getBorderClasses = () => {
    const classes: string[] = ['border', 'border-gray-300'];
    
    if (col % 3 === 0 && col > 0) {
      classes.push('border-l-2', 'border-l-sudoku-primary');
    }
    if (row % 3 === 0 && row > 0) {
      classes.push('border-t-2', 'border-t-sudoku-primary');
    }
    
    return classes.join(' ');
  };

  const getBackgroundClass = () => {
    if (hasError && errorSeverity) {
      if (errorSeverity === 'critical') return 'bg-red-100';
      if (errorSeverity === 'high') return 'bg-orange-100';
      if (errorSeverity === 'medium') return 'bg-amber-100';
      return 'bg-yellow-50';
    }
    
    if (showHeatmap && !value) {
      if (heatmapScore >= 0.8) return 'bg-red-100';
      if (heatmapScore >= 0.5) return 'bg-amber-100';
      if (heatmapScore >= 0.3) return 'bg-yellow-50';
    }
    
    if (isSelected) return 'bg-blue-100';
    if (isHighlighted) return 'bg-blue-50';
    
    return 'bg-white';
  };

  const renderCandidates = () => {
    if (!showCandidates || value !== null) return null;
    
    return (
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-0.5 text-[10px] font-mono-num text-gray-500">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <div
            key={num}
            className={`flex items-center justify-center ${
              candidates.has(num) ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {num}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`sudoku-cell w-12 h-12 sm:w-14 sm:h-14 cursor-pointer ${getBorderClasses()} ${getBackgroundClass()} transition-all duration-150`}
      onClick={handleClick}
    >
      {value !== null ? (
        <span
          className={`text-xl sm:text-2xl font-mono-num font-semibold ${
            isInitial ? 'text-sudoku-primary' : 'text-sudoku-secondary'
          }`}
        >
          {value}
        </span>
      ) : (
        renderCandidates()
      )}
      
      {hasError && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
      )}
    </div>
  );
};
