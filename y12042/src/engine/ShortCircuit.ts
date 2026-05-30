import type { GridCell, ShortCircuitResult, AnomalyRecord } from './types';
import { parseCellId, createCellId, getCellById } from './GridSystem';

export function simulateShortCircuit(
  grid: GridCell[][],
  shortCells: string[],
  powerNodes: string[],
  deltaTime: number,
  diffusionInterval: number = 3
): ShortCircuitResult {
  const newShortCells: string[] = [...shortCells];
  const diffusionPath: string[] = [];
  const height = grid.length;
  const width = grid[0].length;

  if (shortCells.length === 0) {
    return { newShortCells: [], diffusionPath: [], shouldGameOver: false };
  }

  const shouldDiffuse = deltaTime >= diffusionInterval;
  if (!shouldDiffuse) {
    return { newShortCells, diffusionPath: [], shouldGameOver: false };
  }

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  const cellsToProcess = [...shortCells];
  const processed = new Set<string>();

  while (cellsToProcess.length > 0) {
    const cellId = cellsToProcess.shift()!;
    if (processed.has(cellId)) continue;
    processed.add(cellId);

    const { x, y } = parseCellId(cellId);
    const cell = grid[y]?.[x];
    if (!cell) continue;

    if (cell.type === 'power') {
      return {
        newShortCells,
        diffusionPath,
        shouldGameOver: true,
      };
    }

    if (cell.status === 'isolated' || cell.type === 'blocked') {
      continue;
    }

    directions.forEach(({ dx, dy }) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const neighborId = createCellId(nx, ny);
        const neighbor = grid[ny][nx];
        
        if (neighbor.type === 'power') {
          newShortCells.push(neighborId);
          diffusionPath.push(neighborId);
          return;
        }

        if (
          !newShortCells.includes(neighborId) &&
          neighbor.type !== 'empty' &&
          neighbor.type !== 'blocked' &&
          neighbor.status !== 'isolated'
        ) {
          const spreadChance = getSpreadChance(cell, neighbor);
          if (Math.random() < spreadChance) {
            newShortCells.push(neighborId);
            diffusionPath.push(neighborId);
            cellsToProcess.push(neighborId);
          }
        }
      }
    });
  }

  const powerNodeShortCircuited = powerNodes.some(nodeId => 
    newShortCells.includes(nodeId)
  );

  return {
    newShortCells: [...new Set(newShortCells)],
    diffusionPath,
    shouldGameOver: powerNodeShortCircuited,
  };
}

function getSpreadChance(fromCell: GridCell, toCell: GridCell): number {
  let baseChance = 0.6;

  baseChance += fromCell.shortCircuitLevel * 0.1;

  if (toCell.type === 'wire') baseChance += 0.1;
  if (toCell.type === 'fault' || toCell.status === 'damaged') baseChance += 0.2;
  if (toCell.type === 'load') baseChance -= 0.1;
  if (toCell.status === 'repaired') baseChance -= 0.2;

  return Math.min(0.95, Math.max(0.1, baseChance));
}

export function applyShortCircuitToGrid(
  grid: GridCell[][],
  shortCellIds: string[]
): GridCell[][] {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  
  shortCellIds.forEach(cellId => {
    const { x, y } = parseCellId(cellId);
    const cell = newGrid[y]?.[x];
    if (cell && cell.type !== 'empty' && cell.type !== 'blocked') {
      cell.type = 'short';
      cell.status = 'short_circuited';
      cell.shortCircuitLevel = Math.min(3, cell.shortCircuitLevel + 1);
      cell.isPowered = false;
      cell.voltage = 0;
      cell.current = 0;
    }
  });

  return newGrid;
}

export function createShortCircuitAnomaly(
  timestamp: number,
  startCell: string,
  diffusionPath: string[]
): AnomalyRecord {
  return {
    id: `anomaly_short_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'short_circuit',
    timestamp,
    cellIds: [startCell, ...diffusionPath],
    description: `短路从 ${startCell} 扩散至 ${diffusionPath.length} 个单元格`,
    source: 'game',
    isReviewed: false,
  };
}

export function findShortCircuitOrigins(grid: GridCell[][]): string[] {
  const origins: string[] = [];
  
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      const cell = grid[y][x];
      if (cell.type === 'fault' && cell.shortCircuitLevel >= 2) {
        origins.push(cell.id);
      }
    }
  }
  
  return origins;
}

export function calculateShortCircuitProgress(
  shortCells: string[],
  powerNodes: string[],
  totalCells: number
): number {
  if (powerNodes.length === 0) return 0;
  
  const minDistance = Math.min(
    ...powerNodes.map(nodeId => {
      const node = parseCellId(nodeId);
      return Math.min(
        ...shortCells.map(shortId => {
          const short = parseCellId(shortId);
          return Math.abs(node.x - short.x) + Math.abs(node.y - short.y);
        })
      );
    })
  );
  
  const maxPossibleDistance = 20;
  const progress = 1 - (minDistance / maxPossibleDistance);
  return Math.max(0, Math.min(1, progress));
}

export function isShortCircuitSpreading(
  previousShortCells: string[],
  currentShortCells: string[]
): boolean {
  return currentShortCells.length > previousShortCells.length;
}

export function getShortCircuitPath(
  grid: GridCell[][],
  fromCell: string,
  toCell: string
): string[] | null {
  const visited = new Set<string>();
  const queue: { cellId: string; path: string[] }[] = [
    { cellId: fromCell, path: [fromCell] },
  ];

  while (queue.length > 0) {
    const { cellId, path } = queue.shift()!;
    
    if (cellId === toCell) {
      return path;
    }
    
    if (visited.has(cellId)) continue;
    visited.add(cellId);

    const cell = getCellById(grid, cellId);
    if (!cell || cell.type === 'blocked') continue;

    const { x, y } = parseCellId(cellId);
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    directions.forEach(({ dx, dy }) => {
      const nx = x + dx;
      const ny = y + dy;
      const neighborId = createCellId(nx, ny);
      const neighbor = getCellById(grid, neighborId);
      
      if (
        neighbor &&
        !visited.has(neighborId) &&
        neighbor.type !== 'blocked' &&
        neighbor.type !== 'empty' &&
        neighbor.status !== 'isolated'
      ) {
        queue.push({ cellId: neighborId, path: [...path, neighborId] });
      }
    });
  }

  return null;
}
