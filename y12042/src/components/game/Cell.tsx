import React from 'react';
import { Zap, AlertTriangle, XCircle, Lock, Plug, Battery } from 'lucide-react';
import type { GridCell, CellType, CellStatus } from '../../engine/types';
import { cn } from '../../lib/utils';

interface CellProps {
  cell: GridCell;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  size: number;
}

const getCellColors = (type: CellType, status: CellStatus, isPowered: boolean) => {
  const baseColors: Record<CellType, { bg: string; border: string; glow: string }> = {
    empty: { bg: 'bg-circuit-dark/30', border: 'border-circuit-border/30', glow: '' },
    wire: {
      bg: isPowered ? 'bg-success-green/20' : 'bg-circuit-card',
      border: isPowered ? 'border-success-green' : 'border-circuit-border',
      glow: isPowered ? 'shadow-neon-green' : '',
    },
    power: { bg: 'bg-power-blue/30', border: 'border-power-blue', glow: 'shadow-neon-blue' },
    load: {
      bg: isPowered ? 'bg-success-green/30' : 'bg-warning-amber/20',
      border: isPowered ? 'border-success-green' : 'border-warning-amber',
      glow: isPowered ? 'shadow-neon-green' : 'shadow-neon-amber',
    },
    fault: { bg: 'bg-danger-red/30', border: 'border-danger-red', glow: 'shadow-neon-red' },
    short: { bg: 'bg-danger-red/50', border: 'border-danger-red', glow: 'shadow-neon-red animate-pulse-glow' },
    blocked: { bg: 'bg-gray-800/50', border: 'border-gray-600', glow: '' },
  };

  if (status === 'isolated') {
    return { bg: 'bg-gray-700/50', border: 'border-gray-500', glow: '' };
  }
  if (status === 'damaged') {
    return { bg: 'bg-warning-amber/30', border: 'border-warning-amber', glow: 'shadow-neon-amber' };
  }
  if (status === 'repaired') {
    return {
      bg: isPowered ? 'bg-success-green/20' : 'bg-circuit-card',
      border: 'border-success-green/60',
      glow: isPowered ? 'shadow-neon-green' : '',
    };
  }

  return baseColors[type] || baseColors.empty;
};

const getCellIcon = (type: CellType, status: CellStatus) => {
  if (status === 'isolated') return <Lock className="w-4 h-4 text-gray-400" />;
  if (status === 'damaged') return <AlertTriangle className="w-4 h-4 text-warning-amber" />;
  
  switch (type) {
    case 'power':
      return <Battery className="w-5 h-5 text-power-blue" />;
    case 'load':
      return <Plug className="w-5 h-5 text-success-green" />;
    case 'fault':
      return <AlertTriangle className="w-5 h-5 text-danger-red" />;
    case 'short':
      return <XCircle className="w-5 h-5 text-danger-red animate-pulse" />;
    case 'wire':
      return <Zap className="w-4 h-4 text-success-green/70" />;
    case 'blocked':
      return <XCircle className="w-4 h-4 text-gray-500" />;
    default:
      return null;
  }
};

export const Cell: React.FC<CellProps> = ({ cell, isSelected, isHighlighted, onClick, size }) => {
  const colors = getCellColors(cell.type, cell.status, cell.isPowered);
  const icon = getCellIcon(cell.type, cell.status);

  const showCurrentFlow = cell.isPowered && (cell.type === 'wire' || cell.type === 'power' || cell.type === 'load');

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center cursor-pointer transition-all duration-200',
        'border-2 rounded-lg overflow-hidden',
        colors.bg,
        colors.border,
        colors.glow,
        isSelected && 'ring-2 ring-warning-amber ring-offset-2 ring-offset-circuit-bg',
        isHighlighted && 'ring-2 ring-power-blue',
        cell.type !== 'empty' && cell.type !== 'blocked' && 'hover:scale-105 hover:brightness-110',
        cell.shortCircuitLevel > 0 && 'animate-short-diffuse'
      )}
      style={{
        width: size,
        height: size,
      }}
    >
      {showCurrentFlow && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-30 animate-current-flow"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 136, 0.5) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}

      {cell.type === 'short' && (
        <div className="absolute inset-0 bg-danger-red/20 animate-ping pointer-events-none" />
      )}

      {icon && (
        <div className="relative z-10">
          {icon}
        </div>
      )}

      {cell.shortCircuitLevel > 0 && cell.type !== 'short' && (
        <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-danger-red rounded-full animate-pulse" />
      )}

      {cell.voltage > 0 && (
        <div className="absolute bottom-0.5 left-0.5 text-[8px] font-mono text-text-secondary">
          {cell.voltage.toFixed(0)}V
        </div>
      )}
    </div>
  );
};
