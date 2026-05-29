import { CellType, CELL_CONFIG, GRID_SIZE, Position } from '@/types';
import { useGameStore, useChangedCells } from '@/store/useGameStore';

interface GameGridProps {
  customGrid?: CellType[][];
  showChanges?: boolean;
  interactive?: boolean;
  title?: string;
}

export default function GameGrid({ 
  customGrid, 
  showChanges = false, 
  interactive = true,
  title
}: GameGridProps) {
  const { grid: storeGrid, selectedTool, setCell, phase, score } = useGameStore();
  const changedCells = useChangedCells();
  
  const grid = customGrid || storeGrid;
  const isInteractive = interactive && phase === 'planning' && selectedTool !== null;

  const handleCellClick = (row: number, col: number) => {
    if (!isInteractive || selectedTool === null) return;
    setCell(row, col, selectedTool);
  };

  const isChangedCell = (row: number, col: number) => {
    if (!showChanges) return false;
    return changedCells.some(c => c.row === row && c.col === col);
  };

  const getHighlightPositions = (): Set<string> => {
    if (!score || !score.deductions) return new Set();
    const highlights = new Set<string>();
    score.deductions.forEach(d => {
      d.positions.forEach(p => {
        highlights.add(`${p.row},${p.col}`);
      });
    });
    return highlights;
  };

  const highlightedCells = getHighlightPositions();

  return (
    <div className="flex flex-col items-center">
      {title && (
        <h3 className="text-lg font-bold text-slate-700 mb-3">{title}</h3>
      )}
      <div 
        className="inline-grid gap-1 p-3 bg-slate-200 rounded-xl shadow-inner"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const config = CELL_CONFIG[cell];
            const isChanged = isChangedCell(rowIndex, colIndex);
            const isHighlighted = highlightedCells.has(`${rowIndex},${colIndex}`);
            const isEmpty = cell === CellType.EMPTY;
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center
                  transition-all duration-150
                  ${isEmpty ? 'bg-slate-100' : config.bgColor}
                  ${isInteractive ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:scale-105' : ''}
                  ${isChanged ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
                  ${isHighlighted && !isChanged ? 'ring-2 ring-red-400' : ''}
                `}
                title={`${config.name} (${rowIndex}, ${colIndex})`}
              >
                <span className="text-xl sm:text-2xl select-none">
                  {config.emoji}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
