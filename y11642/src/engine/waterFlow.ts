import { BOARD_SIZE, WATER_PER_UNIT } from '../data/constants';
import type { Cell, Valve, Plot, Position, WaterFlowState } from '../types';

export function calculateWaterFlow(
  board: Cell[][],
  valves: Valve[],
  plots: Plot[],
  weatherEvaporationRate: number
): {
  newBoard: Cell[][];
  newPlots: Plot[];
  waterFlowState: WaterFlowState;
  waterUsed: number;
  evaporationLoss: number;
} {
  const newBoard = board.map(row => row.map(cell => ({ ...cell, hasWater: false })));
  const newPlots = plots.map(p => ({ ...p, isWatered: false }));
  
  const source = { row: 0, col: 0 };
  newBoard[source.row][source.col].hasWater = true;
  
  const flowPath: Position[] = [source];
  const visited = new Set<string>();
  const queue: Position[] = [source];
  
  const valveMap = new Map<string, Valve>();
  valves.forEach(v => {
    valveMap.set(`${v.position.row}-${v.position.col}`, v);
  });
  
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 }
  ];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.row}-${current.col}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    for (const dir of directions) {
      const nextRow = current.row + dir.row;
      const nextCol = current.col + dir.col;
      
      if (nextRow < 0 || nextRow >= BOARD_SIZE || nextCol < 0 || nextCol >= BOARD_SIZE) continue;
      
      const nextCell = newBoard[nextRow][nextCol];
      const nextKey = `${nextRow}-${nextCol}`;
      
      if (visited.has(nextKey)) continue;
      
      if (nextCell.type === 'canal' || nextCell.type === 'plot') {
        nextCell.hasWater = true;
        flowPath.push({ row: nextRow, col: nextCol });
        queue.push({ row: nextRow, col: nextCol });
      } else if (nextCell.type === 'valve') {
        const valve = valveMap.get(nextKey);
        if (valve && valve.state === 'open') {
          nextCell.hasWater = true;
          flowPath.push({ row: nextRow, col: nextCol });
          queue.push({ row: nextRow, col: nextCol });
        }
      }
    }
  }
  
  const wateredPlotIds: string[] = [];
  let waterUsed = 0;
  
  newPlots.forEach(plot => {
    const cell = newBoard[plot.position.row][plot.position.col];
    if (cell.hasWater) {
      plot.isWatered = true;
      plot.waterCurrent += WATER_PER_UNIT;
      waterUsed += WATER_PER_UNIT;
      wateredPlotIds.push(plot.id);
      
      if (plot.waterCurrent > plot.waterRequired) {
        plot.overwateredCount += 1;
      }
    }
  });
  
  const evaporationLoss = Math.round(waterUsed * weatherEvaporationRate);
  newPlots.forEach(plot => {
    if (plot.isWatered) {
      plot.waterCurrent = Math.max(0, plot.waterCurrent - Math.round(evaporationLoss / newPlots.filter(p => p.isWatered).length));
    }
  });
  
  return {
    newBoard,
    newPlots,
    waterFlowState: {
      wateredPlots: wateredPlotIds,
      flowPath
    },
    waterUsed,
    evaporationLoss
  };
}
