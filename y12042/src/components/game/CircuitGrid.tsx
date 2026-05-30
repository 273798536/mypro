import React, { useMemo } from 'react';
import { Cell } from './Cell';
import type { GridCell } from '../../engine/types';
import { useGameStore } from '../../store/useGameStore';
import { cn } from '../../lib/utils';

interface CircuitGridProps {
  className?: string;
  showLabels?: boolean;
  interactive?: boolean;
}

export const CircuitGrid: React.FC<CircuitGridProps> = ({ className, showLabels = true, interactive = true }) => {
  const { gameState, handleCellClick, shortCircuitEvents, replayIndex, isReplaying } = useGameStore();
  const { grid, selectedCell, anomalies, operationLog } = gameState;

  const gridSize = useMemo(() => {
    if (grid.length === 0) return { width: 8, height: 8 };
    return { width: grid[0].length, height: grid.length };
  }, [grid]);

  const cellSize = useMemo(() => {
    const maxWidth = 600;
    const maxHeight = 500;
    const sizeByWidth = Math.floor(maxWidth / gridSize.width) - 4;
    const sizeByHeight = Math.floor(maxHeight / gridSize.height) - 4;
    return Math.min(sizeByWidth, sizeByHeight, 60);
  }, [gridSize]);

  const displayGrid = useMemo(() => {
    if (!isReplaying || replayIndex === 0) return grid;
    
    let tempGrid = grid.map(row => row.map(cell => ({ ...cell })));
    
    for (let i = 0; i < replayIndex; i++) {
      const op = operationLog[i];
      if (op) {
        const { x, y } = parseCellId(op.cellId);
        if (tempGrid[y] && tempGrid[y][x]) {
          Object.assign(tempGrid[y][x], op.afterState);
        }
      }
    }
    
    return tempGrid;
  }, [grid, isReplaying, replayIndex, operationLog]);

  const shortCircuitCells = useMemo(() => {
    const cells = new Set<string>();
    if (isReplaying) {
      for (let i = 0; i <= replayIndex; i++) {
        const event = shortCircuitEvents[i];
        if (event) {
          cells.add(event.startCell);
          event.diffusionPath.forEach(c => cells.add(c));
        }
      }
    } else {
      shortCircuitEvents.forEach(event => {
        cells.add(event.startCell);
        event.diffusionPath.forEach(c => cells.add(c));
      });
    }
    return cells;
  }, [shortCircuitEvents, isReplaying, replayIndex]);

  const anomalyCells = useMemo(() => {
    const cells = new Set<string>();
    anomalies.forEach(a => {
      if (isReplaying && a.timestamp > operationLog[replayIndex]?.timestamp) return;
      a.cellIds.forEach(c => cells.add(c));
    });
    return cells;
  }, [anomalies, isReplaying, replayIndex, operationLog]);

  if (grid.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-text-secondary">
        <div className="text-center">
          <div className="animate-pulse mb-2">⚡</div>
          <p>选择关卡开始游戏</p>
        </div>
      </div>
    );
  }

  const parseCellId = (id: string) => {
    const parts = id.split('_');
    return { x: parseInt(parts[1]), y: parseInt(parts[2]) };
  };

  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
        <div
          className="absolute inset-0 opacity-10 animate-scan-line"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(77, 166, 255, 0.1) 50%, transparent 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(77, 166, 255, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(77, 166, 255, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: `${cellSize + 4}px ${cellSize + 4}px`,
          }}
        />
      </div>

      <div className="relative z-10 p-4 bg-circuit-card/50 rounded-xl border border-circuit-border backdrop-blur-sm">
        {showLabels && (
          <div className="flex mb-2">
            <div style={{ width: cellSize }} className="text-center text-xs text-text-muted font-mono" />
            {Array.from({ length: gridSize.width }, (_, i) => (
              <div
                key={i}
                style={{ width: cellSize + 4 }}
                className="text-center text-xs text-text-muted font-mono"
              >
                {i}
              </div>
            ))}
          </div>
        )}

        {displayGrid.map((row, y) => (
          <div key={y} className="flex items-center">
            {showLabels && (
              <div
                style={{ width: cellSize }}
                className="text-center text-xs text-text-muted font-mono flex items-center justify-center"
              >
                {y}
              </div>
            )}
            {row.map((cell, x) => (
              <div key={cell.id} className="p-0.5">
                <Cell
                  cell={cell}
                  isSelected={selectedCell === cell.id}
                  isHighlighted={shortCircuitCells.has(cell.id) || anomalyCells.has(cell.id)}
                  onClick={() => interactive && handleCellClick(cell.id)}
                  size={cellSize}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-power-blue/30 border border-power-blue" />
          <span className="text-text-secondary">电源</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-success-green/30 border border-success-green" />
          <span className="text-text-secondary">负载</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-circuit-card border border-circuit-border" />
          <span className="text-text-secondary">导线</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-danger-red/30 border border-danger-red" />
          <span className="text-text-secondary">故障</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-danger-red/50 border border-danger-red" />
          <span className="text-text-secondary">短路</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-700/50 border border-gray-500" />
          <span className="text-text-secondary">隔离</span>
        </div>
      </div>
    </div>
  );
};
