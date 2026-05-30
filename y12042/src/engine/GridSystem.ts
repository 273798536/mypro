import type { GridCell, CellType, CellStatus, LevelConfig } from './types';

export function createCellId(x: number, y: number): string {
  return `cell_${x}_${y}`;
}

export function parseCellId(id: string): { x: number; y: number } {
  const parts = id.split('_');
  return { x: parseInt(parts[1]), y: parseInt(parts[2]) };
}

export function createEmptyGrid(width: number, height: number): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        id: createCellId(x, y),
        x,
        y,
        type: 'empty',
        status: 'normal',
        voltage: 0,
        current: 0,
        connections: [],
        isPowered: false,
        shortCircuitLevel: 0,
      });
    }
    grid.push(row);
  }
  return grid;
}

export function initializeGridFromLevel(level: LevelConfig): {
  grid: GridCell[][];
  powerNodes: string[];
  loadNodes: string[];
} {
  const { width, height } = level.gridSize;
  const grid = createEmptyGrid(width, height);
  const powerNodes: string[] = [];
  const loadNodes: string[] = [];

  level.wireCells.forEach(({ x, y }) => {
    grid[y][x].type = 'wire';
  });

  level.powerNodes.forEach(({ x, y }) => {
    grid[y][x].type = 'power';
    grid[y][x].status = 'normal';
    grid[y][x].voltage = 12;
    grid[y][x].isPowered = true;
    const id = createCellId(x, y);
    powerNodes.push(id);
  });

  level.loadNodes.forEach(({ x, y, requirement }) => {
    grid[y][x].type = 'load';
    grid[y][x].loadRequirement = requirement;
    const id = createCellId(x, y);
    loadNodes.push(id);
  });

  level.faultCells.forEach(({ x, y, severity }) => {
    grid[y][x].type = 'fault';
    grid[y][x].status = 'damaged';
    grid[y][x].shortCircuitLevel = severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
  });

  level.blockedCells.forEach(({ x, y }) => {
    grid[y][x].type = 'blocked';
  });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      if (cell.type !== 'empty' && cell.type !== 'blocked') {
        cell.connections = getAdjacentConnections(grid, x, y);
      }
    }
  }

  return { grid, powerNodes, loadNodes };
}

export function getAdjacentConnections(grid: GridCell[][], x: number, y: number): string[] {
  const connections: string[] = [];
  const height = grid.length;
  const width = grid[0].length;
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  directions.forEach(({ dx, dy }) => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const neighbor = grid[ny][nx];
      if (neighbor.type !== 'empty' && neighbor.type !== 'blocked' && neighbor.status !== 'isolated') {
        connections.push(neighbor.id);
      }
    }
  });

  return connections;
}

export function updateCellConnections(grid: GridCell[][], cellId: string): GridCell[][] {
  const { x, y } = parseCellId(cellId);
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  
  const cell = newGrid[y][x];
  if (cell.status === 'isolated') {
    cell.connections = [];
    const height = grid.length;
    const width = grid[0].length;
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    directions.forEach(({ dx, dy }) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const neighbor = newGrid[ny][nx];
        neighbor.connections = neighbor.connections.filter(id => id !== cellId);
      }
    });
  } else {
    cell.connections = getAdjacentConnections(newGrid, x, y);
    cell.connections.forEach(neighborId => {
      const { x: nx, y: ny } = parseCellId(neighborId);
      const neighbor = newGrid[ny][nx];
      if (!neighbor.connections.includes(cellId)) {
        neighbor.connections.push(cellId);
      }
    });
  }

  return newGrid;
}

export function repairCell(grid: GridCell[][], cellId: string): GridCell[][] {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  const { x, y } = parseCellId(cellId);
  const cell = newGrid[y][x];
  
  if (cell.type === 'fault' || cell.status === 'damaged') {
    cell.type = 'wire';
    cell.status = 'repaired';
    cell.shortCircuitLevel = 0;
  }
  
  return updateCellConnections(newGrid, cellId);
}

export function isolateCell(grid: GridCell[][], cellId: string): GridCell[][] {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  const { x, y } = parseCellId(cellId);
  const cell = newGrid[y][x];
  
  cell.status = 'isolated';
  cell.isPowered = false;
  cell.voltage = 0;
  cell.current = 0;
  
  return updateCellConnections(newGrid, cellId);
}

export function connectCells(grid: GridCell[][], cellId1: string, cellId2: string): GridCell[][] {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  const { x: x1, y: y1 } = parseCellId(cellId1);
  const { x: x2, y: y2 } = parseCellId(cellId2);
  
  const cell1 = newGrid[y1][x1];
  const cell2 = newGrid[y2][x2];
  
  if (cell1.type === 'empty') {
    cell1.type = 'wire';
    cell1.status = 'normal';
  }
  if (cell2.type === 'empty') {
    cell2.type = 'wire';
    cell2.status = 'normal';
  }
  
  if (!cell1.connections.includes(cellId2)) {
    cell1.connections.push(cellId2);
  }
  if (!cell2.connections.includes(cellId1)) {
    cell2.connections.push(cellId1);
  }
  
  return newGrid;
}

export function getCellById(grid: GridCell[][], cellId: string): GridCell | null {
  const { x, y } = parseCellId(cellId);
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
    return grid[y][x];
  }
  return null;
}

export function cloneGrid(grid: GridCell[][]): GridCell[][] {
  return grid.map(row => row.map(cell => ({
    ...cell,
    connections: [...cell.connections],
  })));
}

export function areCellsAdjacent(cell1: GridCell, cell2: GridCell): boolean {
  const dx = Math.abs(cell1.x - cell2.x);
  const dy = Math.abs(cell1.y - cell2.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}
