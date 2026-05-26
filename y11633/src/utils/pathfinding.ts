import type { Position, Obstacle } from '../types';

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(node: Position, gridSize: number): Position[] {
  const neighbors: Position[] = [];
  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  for (const dir of directions) {
    const newX = node.x + dir.x;
    const newY = node.y + dir.y;
    if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
      neighbors.push({ x: newX, y: newY });
    }
  }

  return neighbors;
}

function isBlocked(pos: Position, obstacles: Obstacle[], gridSize: number): boolean {
  if (pos.x < 0 || pos.x >= gridSize || pos.y < 0 || pos.y >= gridSize) {
    return true;
  }
  return obstacles.some(o => o.position.x === pos.x && o.position.y === pos.y);
}

function posEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function findPath(
  start: Position,
  end: Position,
  obstacles: Obstacle[],
  gridSize: number
): Position[] {
  if (posEqual(start, end)) {
    return [start];
  }

  if (isBlocked(end, obstacles, gridSize)) {
    return [];
  }

  const openList: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
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
      const path: Position[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closedSet.add(`${current.x},${current.y}`);

    const neighbors = getNeighbors({ x: current.x, y: current.y }, gridSize);

    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(key) || isBlocked(neighbor, obstacles, gridSize)) {
        continue;
      }

      const g = current.g + 1;
      const h = heuristic(neighbor, end);
      const f = g + h;

      const existingNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);
      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openList.push({
          x: neighbor.x,
          y: neighbor.y,
          g,
          h,
          f,
          parent: current,
        });
      }
    }
  }

  return [];
}

export function findNearestCharger(
  position: Position,
  chargers: { position: Position }[]
): Position | null {
  if (chargers.length === 0) return null;

  let nearest = chargers[0].position;
  let minDist = heuristic(position, nearest);

  for (const charger of chargers.slice(1)) {
    const dist = heuristic(position, charger.position);
    if (dist < minDist) {
      minDist = dist;
      nearest = charger.position;
    }
  }

  return nearest;
}
