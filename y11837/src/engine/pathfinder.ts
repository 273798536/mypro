import type { Position, GridCell, WarehouseMap } from './types';

interface PathNode {
  pos: Position;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

function posEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

const DIRECTIONS: Position[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export function findPath(
  map: WarehouseMap,
  start: Position,
  end: Position,
  occupiedPositions: Position[],
  maxIterations: number = 500
): Position[] | null {
  if (posEqual(start, end)) return [start];

  const occupiedSet = new Set(occupiedPositions.filter(p => !posEqual(p, end)).map(posKey));

  const openMap = new Map<string, PathNode>();
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    pos: start,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  };

  openMap.set(posKey(start), startNode);

  let iterations = 0;

  while (openMap.size > 0 && iterations < maxIterations) {
    iterations++;

    let current: PathNode | null = null;
    for (const node of openMap.values()) {
      if (!current || node.f < current.f || (node.f === current.f && node.h < current.h)) {
        current = node;
      }
    }

    if (!current) break;

    if (posEqual(current.pos, end)) {
      const path: Position[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift(node.pos);
        node = node.parent;
      }
      return path;
    }

    openMap.delete(posKey(current.pos));
    closedSet.add(posKey(current.pos));

    for (const dir of DIRECTIONS) {
      const nx = current.pos.x + dir.x;
      const ny = current.pos.y + dir.y;
      const neighbor: Position = { x: nx, y: ny };

      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;

      const key = posKey(neighbor);
      if (closedSet.has(key)) continue;
      if (occupiedSet.has(key)) continue;

      const cell: GridCell = map.cells[ny][nx];
      if (cell.blocked || cell.type === 'shelf') continue;

      const isOccupied = occupiedPositions.some(p => posEqual(p, neighbor));
      const moveCost = isOccupied ? 5 : 1;

      const g = current.g + moveCost;
      const h = heuristic(neighbor, end);
      const f = g + h;

      const existing = openMap.get(key);
      if (existing && g >= existing.g) continue;

      const neighborNode: PathNode = {
        pos: neighbor,
        g,
        h,
        f,
        parent: current,
      };

      openMap.set(key, neighborNode);
    }
  }

  return null;
}

export function findNearestCharger(
  map: WarehouseMap,
  start: Position,
  occupiedPositions: Position[]
): Position | null {
  let bestPos: Position | null = null;
  let bestDist = Infinity;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.cells[y][x].type === 'charger') {
        const dist = heuristic(start, { x, y });
        if (dist < bestDist) {
          const path = findPath(map, start, { x, y }, occupiedPositions, 200);
          if (path) {
            bestDist = dist;
            bestPos = { x, y };
          }
        }
      }
    }
  }

  return bestPos;
}
