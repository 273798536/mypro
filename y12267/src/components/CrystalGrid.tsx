import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { PlacedDefect, GridPosition } from '../types/game';
import { DEFECT_CARDS } from '../data/gameConfig';

interface CellProps {
  x: number;
  y: number;
  defect?: PlacedDefect;
  isSelected: boolean;
  onClick: (position: GridPosition) => void;
}

const getDefectColor = (type: string): string => {
  const card = DEFECT_CARDS.find((c) => c.type === type);
  return card?.color || '#666';
};

const getDefectSymbol = (type: string): string => {
  const symbols: Record<string, string> = {
    vacancy: '◯',
    interstitial: '◉',
    dislocation: '◎',
    grain_boundary: '⬡',
  };
  return symbols[type] || '?';
};

const getDefectName = (type: string): string => {
  const names: Record<string, string> = {
    vacancy: '空位',
    interstitial: '间隙',
    dislocation: '位错',
    grain_boundary: '晶界',
  };
  return names[type] || type;
};

const Cell: React.FC<CellProps> = ({ x, y, defect, isSelected, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const defectColor = defect ? getDefectColor(defect.type) : null;
  const defectSymbol = defect ? getDefectSymbol(defect.type) : null;

  return (
    <motion.div
      className={`
        relative w-12 h-12 border border-slate-600 cursor-pointer
        flex items-center justify-center
        transition-all duration-200
        ${isSelected ? 'bg-blue-900/50 border-blue-400' : 'bg-slate-800/50'}
        ${defect ? '' : 'hover:bg-slate-700/50 hover:border-slate-500'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick({ x, y })}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {!defect && (
        <div className="w-3 h-3 rounded-full bg-slate-500/50" />
      )}

      {defect && defectColor && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg"
            style={{
              backgroundColor: defectColor,
              boxShadow: `0 0 20px ${defectColor}80`,
            }}
          >
            {defectSymbol}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs text-white rounded whitespace-nowrap z-10 border border-slate-600"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          >
            ({x}, {y})
            {defect && ` - ${getDefectName(defect.type)}`}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface CrystalGridProps {
  onViolation?: (message: string) => void;
}

const CrystalGrid: React.FC<CrystalGridProps> = ({ onViolation }) => {
  const { gridSize, selectedCard, placedDefects, placeDefect } = useGameStore();

  const getDefectAt = (x: number, y: number): PlacedDefect | undefined => {
    return placedDefects.find((d) => d.position.x === x && d.position.y === y);
  };

  const handleCellClick = (position: GridPosition) => {
    if (!selectedCard) {
      onViolation?.('请先选择一张缺陷卡');
      return;
    }

    const violation = placeDefect(position);
    if (violation) {
      onViolation?.(violation.message);
    }
  };

  const rows = [];
  for (let y = 0; y < gridSize.height; y++) {
    const cells = [];
    for (let x = 0; x < gridSize.width; x++) {
      cells.push(
        <Cell
          key={`${x}-${y}`}
          x={x}
          y={y}
          defect={getDefectAt(x, y)}
          isSelected={false}
          onClick={handleCellClick}
        />
      );
    }
    rows.push(
      <div key={y} className="flex">
        {cells}
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900/80 rounded-xl border border-slate-700 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">晶格网格</h3>
        <span className="text-sm text-slate-400">
          {gridSize.width} × {gridSize.height}
        </span>
      </div>
      <div className="inline-block rounded-lg overflow-hidden border border-slate-600 shadow-2xl">
        {rows}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F53F3F' }} />
          <span className="text-slate-400">空位</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF7D00' }} />
          <span className="text-slate-400">间隙原子</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7B61FF' }} />
          <span className="text-slate-400">位错</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#165DFF' }} />
          <span className="text-slate-400">晶界</span>
        </div>
      </div>
    </div>
  );
};

export default CrystalGrid;
