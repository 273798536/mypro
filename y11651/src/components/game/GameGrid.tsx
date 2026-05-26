import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, MapPin, AlertTriangle, Radio } from 'lucide-react';
import type { Cell, Point } from '../../types/game';
import { getEchoColor } from '../../utils/sonarUtils';

interface GameGridProps {
  grid: Cell[][];
  gridSize: number;
  onCellClick: (position: Point) => void;
  onCellRightClick: (position: Point) => void;
  isScanning: boolean;
  scanPosition: Point | null;
  showActualPosition?: boolean;
  actualPosition?: Point | null;
  guessPosition?: Point | null;
  trajectory?: Point[];
  disabled?: boolean;
}

export const GameGrid: React.FC<GameGridProps> = ({
  grid,
  gridSize,
  onCellClick,
  onCellRightClick,
  isScanning,
  scanPosition,
  showActualPosition = false,
  actualPosition = null,
  guessPosition = null,
  trajectory = [],
  disabled = false
}) => {
  const [hoveredCell, setHoveredCell] = useState<Point | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, position: Point) => {
    e.preventDefault();
    if (!disabled) {
      onCellRightClick(position);
    }
  }, [onCellRightClick, disabled]);

  const getCellSize = () => {
    if (gridSize <= 8) return 'w-12 h-12';
    if (gridSize <= 10) return 'w-10 h-10';
    return 'w-8 h-8';
  };

  const renderCellContent = (cell: Cell) => {
    const isScanPosition = scanPosition && scanPosition.x === cell.x && scanPosition.y === cell.y;
    const isActual = showActualPosition && actualPosition && actualPosition.x === cell.x && actualPosition.y === cell.y;
    const isGuess = guessPosition && guessPosition.x === cell.x && guessPosition.y === cell.y;
    const isInTrajectory = trajectory.some(p => p.x === cell.x && p.y === cell.y);

    if (isActual) {
      return <Target className="w-5 h-5 text-red-400" />;
    }

    if (isGuess) {
      return <MapPin className="w-5 h-5 text-blue-400" />;
    }

    if (cell.marked) {
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }

    if (cell.scanned && cell.echoStrength > 0) {
      return (
        <div className="text-xs font-mono text-white/80">
          {cell.echoStrength}
        </div>
      );
    }

    return null;
  };

  const getCellStyle = (cell: Cell) => {
    const isHovered = hoveredCell && hoveredCell.x === cell.x && hoveredCell.y === cell.y;
    const isScanPosition = scanPosition && scanPosition.x === cell.x && scanPosition.y === cell.y;
    const isInTrajectory = trajectory.some(p => p.x === cell.x && p.y === cell.y);
    
    let bgColor = 'bg-slate-800/50';
    
    if (cell.scanned) {
      bgColor = getEchoColor(cell.echoStrength, cell.hasNoise);
    }
    
    if (isInTrajectory && showActualPosition) {
      bgColor = 'rgba(239, 68, 68, 0.2)';
    }

    return {
      backgroundColor: bgColor,
      boxShadow: isScanPosition && isScanning ? '0 0 20px rgba(34, 197, 94, 0.6)' : 'none'
    };
  };

  return (
    <div className="relative">
      <div 
        className="grid gap-1 p-4 bg-slate-900/80 rounded-xl border border-slate-700"
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <motion.div
              key={`${x}-${y}`}
              className={`
                ${getCellSize()}
                flex items-center justify-center
                rounded-md cursor-pointer
                border border-slate-600/50
                transition-all duration-200
                ${disabled ? 'cursor-not-allowed' : 'hover:border-cyan-400/50 hover:bg-slate-700/50'}
                ${cell.hasNoise ? 'animate-pulse' : ''}
              `}
              style={getCellStyle(cell)}
              onClick={() => !disabled && onCellClick({ x, y })}
              onContextMenu={(e) => handleContextMenu(e, { x, y })}
              onMouseEnter={() => setHoveredCell({ x, y })}
              onMouseLeave={() => setHoveredCell(null)}
              whileHover={!disabled ? { scale: 1.05 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
            >
              {renderCellContent(cell)}
              
              {cell.hasNoise && cell.scanned && (
                <div className="absolute inset-0 bg-red-500/10 rounded-md pointer-events-none" />
              )}
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {scanPosition && isScanning && (
          <motion.div
            className="absolute pointer-events-none"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 2 }}
            transition={{ duration: 0.5 }}
            style={{
              left: `${(scanPosition.x + 0.5) * (100 / gridSize)}%`,
              top: `${(scanPosition.y + 0.5) * (100 / gridSize)}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="w-16 h-16 rounded-full border-2 border-green-400 animate-ping opacity-75" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2 text-xs text-slate-400 flex gap-4 justify-center">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500/60 rounded" />
          强回波
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500/60 rounded" />
          弱回波
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500/40 rounded" />
          噪声干扰
        </span>
      </div>
    </div>
  );
};
