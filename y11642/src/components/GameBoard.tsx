import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { CELL_COLORS } from '../data/constants';
import { CROP_TYPES } from '../data/constants';
import type { Cell as CellType, Valve, Plot } from '../types';

interface CellProps {
  cell: CellType;
  valve?: Valve;
  plot?: Plot;
  pendingState?: 'open' | 'closed';
  onClick?: () => void;
}

const Cell: React.FC<CellProps> = ({ cell, valve, plot, pendingState, onClick }) => {
  const getCellContent = () => {
    switch (cell.type) {
      case 'source':
        return (
          <div className="w-full h-full flex items-center justify-center bg-blue-500 rounded-lg">
            <span className="text-2xl">💧</span>
          </div>
        );
      case 'canal':
        return (
          <div
            className={`w-full h-full rounded-lg transition-all duration-500 ${
              cell.hasWater ? 'bg-cyan-400' : 'bg-cyan-100'
            }`}
          >
            {cell.hasWater && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            )}
          </div>
        );
      case 'valve': {
        const displayState = pendingState || valve?.state || 'closed';
        return (
          <button
            onClick={onClick}
            className={`w-full h-full rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105 ${
              displayState === 'open'
                ? 'bg-green-500 shadow-lg shadow-green-300'
                : 'bg-red-500 shadow-lg shadow-red-300'
            }`}
          >
            <span className="text-xl font-bold text-white">
              {displayState === 'open' ? '开' : '关'}
            </span>
          </button>
        );
      }
      case 'plot': {
        if (!plot) return null;
        const waterRatio = plot.waterCurrent / plot.waterRequired;
        const cropInfo = CROP_TYPES.find(c => c.name === plot.cropType);
        const isOverwatered = plot.overwateredCount > 0;
        const isDrought = waterRatio < 0.5;
        
        return (
          <div
            className={`w-full h-full rounded-lg p-1 flex flex-col items-center justify-center transition-all duration-500 ${
              isDrought
                ? 'bg-yellow-300 animate-pulse'
                : isOverwatered
                ? 'bg-blue-300'
                : 'bg-green-400'
            }`}
          >
            <span className="text-lg">{cropInfo?.icon || '🌱'}</span>
            <div className="w-full mt-1">
              <div className="h-1.5 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, waterRatio * 100)}%` }}
                />
              </div>
            </div>
            <span className="text-xs mt-0.5 font-medium text-gray-700">
              {plot.waterCurrent}/{plot.waterRequired}
            </span>
          </div>
        );
      }
      default:
        return (
          <div className="w-full h-full bg-amber-50 rounded-lg border border-amber-200" />
        );
    }
  };

  return (
    <div
      className={`w-full aspect-square p-0.5 transition-all duration-300 ${
        cell.type === 'valve' ? 'cursor-pointer' : ''
      }`}
    >
      {getCellContent()}
    </div>
  );
};

export const GameBoard: React.FC = () => {
  const { state, pendingValveChanges, toggleValve } = useGameStore();
  const { board, valves, plots, phase } = state;

  const handleValveClick = (valveId: string) => {
    if (phase === 'playing') {
      toggleValve(valveId);
    }
  };

  const getValveAtPosition = (row: number, col: number) => {
    return valves.find(v => v.position.row === row && v.position.col === col);
  };

  const getPlotAtPosition = (row: number, col: number) => {
    return plots.find(p => p.position.row === row && p.position.col === col);
  };

  return (
    <div className="bg-amber-100 p-4 rounded-2xl shadow-xl">
      <div className="grid grid-cols-6 gap-1">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const valve = getValveAtPosition(rowIndex, colIndex);
            const plot = getPlotAtPosition(rowIndex, colIndex);
            const pendingState = valve ? pendingValveChanges.get(valve.id) : undefined;

            return (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                cell={cell}
                valve={valve}
                plot={plot}
                pendingState={pendingState}
                onClick={valve ? () => handleValveClick(valve.id) : undefined}
              />
            );
          })
        )}
      </div>
      
      <div className="mt-4 flex gap-4 justify-center text-sm">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span>水源</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-cyan-400 rounded" />
          <span>水渠(有水)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span>阀门开</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-500 rounded" />
          <span>阀门关</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-400 rounded" />
          <span>地块</span>
        </div>
      </div>
    </div>
  );
};
