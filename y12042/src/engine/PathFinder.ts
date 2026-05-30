import type { GridCell } from './types';
import { parseCellId, createCellId } from './GridSystem';

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export function findRepairPath(
  grid: GridCell[][],
  start: { x: number; y: number },
  end: { x: number; y: number },
  blockedCells: Set<string> = new Set()
): { x: number; y: number }[] | null {
  const height = grid.length;
  const width = grid[0].length;

  const heuristic = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  };

  const isWalkable = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const cellId = createCellId(x, y);
    if (blockedCells.has(cellId)) return false;
    const cell = grid[y][x];
    return cell.type !== 'blocked' && cell.type !== 'empty' && cell.status !== 'isolated';
  };

  const openList: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  };

  openList.push(startNode);

  while (openList.length > 0) {
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    if (current.x === end.x && current.y === end.y) {
      const path: { x: number; y: number }[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closedSet.add(`${current.x},${current.y}`);

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    directions.forEach(({ dx, dy }) => {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (!isWalkable(nx, ny)) return;
      if (closedSet.has(`${nx},${ny}`)) return;

      const movementCost = grid[ny][nx].type === 'fault' ? 3 : 1;
      const g = current.g + movementCost;
      const h = heuristic({ x: nx, y: ny }, end);
      const f = g + h;

      const existingNode = openList.find(n => n.x === nx && n.y === ny);
      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openList.push({
          x: nx,
          y: ny,
          g,
          h,
          f,
          parent: current,
        });
      }
    });
  }

  return null;
}

export function findAlternativePath(
  grid: GridCell[][],
  start: { x: number; y: number },
  end: { x: number; y: number },
  avoidCells: string[]
): { x: number; y: number }[] | null {
  const blocked = new Set(avoidCells);
  return findRepairPath(grid, start, end, blocked);
}

export function checkPathBlocked(
  grid: GridCell[][],
  path: { x: number; y: number }[]
): { blocked: boolean; blockedAt: { x: number; y: number } | null } {
  for (const point of path) {
    const cell = grid[point.y]?.[point.x];
    if (!cell || cell.type === 'blocked' || cell.status === 'isolated' || cell.type === 'short') {
      return { blocked: true, blockedAt: point };
    }
  }
  return { blocked: false, blockedAt: null };
}

export function getPathCellIds(path: { x: number; y: number }[]): string[] {
  return path.map(p => createCellId(p.x, p.y));
}

export function calculatePathLength(path: { x: number; y: number }[]): number {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

export function findNearestRepairTarget(
  grid: GridCell[][],
  start: { x: number; y: number },
  targetType: 'fault' | 'damaged'
): { x: number; y: number } | null {
  const targets: { x: number; y: number }[] = [];
  
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      const cell = grid[y][x];
      if (targetType === 'fault' && cell.type === 'fault') {
        targets.push({ x, y });
      } else if (targetType === 'damaged' && cell.status === 'damaged') {
        targets.push({ x, y });
      }
    }
  }

  if (targets.length === 0) return null;

  let nearest = targets[0];
  let minDist = Infinity;

  targets.forEach(t => {
    const dist = Math.abs(t.x - start.x) + Math.abs(t.y - start.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = t;
    }
  });

  return nearest;
}

export function getPathEfficiency(
  grid: GridCell[][],
  path: { x: number; y: number }[]
): { efficiency: number; faultCount: number; shortCount: number } {
  let faultCount = 0;
  let shortCount = 0;

  path.forEach(p => {
    const cell = grid[p.y]?.[p.x];
    if (cell) {
      if (cell.type === 'fault' || cell.status === 'damaged') faultCount++;
      if (cell.type === 'short') shortCount++;
    }
  });

  const baseCost = path.length;
  const extraCost = faultCount * 2 + shortCount * 5;
  const efficiency = baseCost / (baseCost + extraCost);

  return { efficiency, faultCount, shortCount };
}
