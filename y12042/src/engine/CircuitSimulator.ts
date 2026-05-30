import type { GridCell, ConnectivityResult } from './types';
import { parseCellId } from './GridSystem';

export function checkCircuitConnectivity(
  grid: GridCell[][],
  powerNodes: string[]
): ConnectivityResult {
  const visited = new Set<string>();
  const poweredCells = new Set<string>();
  const paths = new Map<string, string[]>();
  const queue: { cellId: string; path: string[] }[] = [];

  powerNodes.forEach(nodeId => {
    if (!visited.has(nodeId)) {
      queue.push({ cellId: nodeId, path: [nodeId] });
      visited.add(nodeId);
      poweredCells.add(nodeId);
      paths.set(nodeId, [nodeId]);
    }
  });

  while (queue.length > 0) {
    const { cellId, path } = queue.shift()!;
    const cell = getCellByIdInternal(grid, cellId);
    
    if (!cell) continue;
    
    if (cell.status === 'isolated' || cell.type === 'blocked' || cell.type === 'empty') {
      continue;
    }

    cell.connections.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        const neighbor = getCellByIdInternal(grid, neighborId);
        if (neighbor && neighbor.status !== 'isolated' && neighbor.type !== 'blocked' && neighbor.type !== 'empty') {
          visited.add(neighborId);
          const newPath = [...path, neighborId];
          paths.set(neighborId, newPath);
          poweredCells.add(neighborId);
          queue.push({ cellId: neighborId, path: newPath });
        }
      }
    });
  }

  const connected = Array.from(poweredCells).some(cellId => {
    const cell = getCellByIdInternal(grid, cellId);
    return cell?.type === 'load';
  });

  return {
    connected,
    poweredCells,
    paths,
  };
}

export function updatePoweredState(grid: GridCell[][], poweredCells: Set<string>): GridCell[][] {
  return grid.map(row => row.map(cell => {
    const isPowered = poweredCells.has(cell.id) && cell.status !== 'isolated';
    return {
      ...cell,
      isPowered,
      voltage: isPowered && cell.type !== 'empty' && cell.type !== 'blocked' ? 12 : 0,
      current: isPowered && cell.type !== 'empty' && cell.type !== 'blocked' ? 0.5 : 0,
    };
  }));
}

export function calculatePowerConsumption(
  paths: Map<string, string[]>,
  loadNodes: string[],
  grid: GridCell[][]
): { totalConsumption: number; insufficientLoads: string[] } {
  let totalConsumption = 0;
  const insufficientLoads: string[] = [];
  const wireResistance = 0.1;

  loadNodes.forEach(loadId => {
    const path = paths.get(loadId);
    if (path && path.length > 0) {
      const loadCell = getCellByIdInternal(grid, loadId);
      const loadRequirement = loadCell?.loadRequirement || 1;
      const pathLength = path.length;
      const consumption = pathLength * wireResistance * loadRequirement;
      totalConsumption += consumption;
    } else {
      insufficientLoads.push(loadId);
    }
  });

  return { totalConsumption, insufficientLoads };
}

export function checkLoadPowered(
  grid: GridCell[][],
  loadNodes: string[],
  poweredCells: Set<string>
): { allPowered: boolean; unpoweredLoads: string[] } {
  const unpoweredLoads = loadNodes.filter(loadId => !poweredCells.has(loadId));
  return {
    allPowered: unpoweredLoads.length === 0,
    unpoweredLoads,
  };
}

export function getConnectivityMatrix(grid: GridCell[][]): boolean[][] {
  const height = grid.length;
  const width = grid[0].length;
  const matrix: boolean[][] = [];

  for (let y = 0; y < height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      row.push(
        cell.type !== 'empty' && 
        cell.type !== 'blocked' && 
        cell.status !== 'isolated' &&
        cell.isPowered
      );
    }
    matrix.push(row);
  }

  return matrix;
}

function getCellByIdInternal(grid: GridCell[][], cellId: string): GridCell | null {
  const { x, y } = parseCellId(cellId);
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
    return grid[y][x];
  }
  return null;
}

export function findPowerPath(
  grid: GridCell[][],
  powerNode: string,
  loadNode: string
): string[] | null {
  const visited = new Set<string>();
  const queue: { cellId: string; path: string[] }[] = [
    { cellId: powerNode, path: [powerNode] },
  ];

  while (queue.length > 0) {
    const { cellId, path } = queue.shift()!;
    
    if (cellId === loadNode) {
      return path;
    }
    
    if (visited.has(cellId)) continue;
    visited.add(cellId);

    const cell = getCellByIdInternal(grid, cellId);
    if (!cell || cell.status === 'isolated' || cell.type === 'blocked') continue;

    cell.connections.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        const neighbor = getCellByIdInternal(grid, neighborId);
        if (neighbor && neighbor.status !== 'isolated' && neighbor.type !== 'blocked') {
          queue.push({ cellId: neighborId, path: [...path, neighborId] });
        }
      }
    });
  }

  return null;
}
