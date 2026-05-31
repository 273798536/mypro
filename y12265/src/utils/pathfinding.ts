import { Position, PathNode, Obstacle, Robot } from '../types/game';

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function positionEquals(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function getNeighbors(
  position: Position,
  gridWidth: number,
  gridHeight: number
): Position[] {
  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  return directions
    .map((d) => ({ x: position.x + d.x, y: position.y + d.y }))
    .filter(
      (p) =>
        p.x >= 0 && p.x < gridWidth && p.y >= 0 && p.y < gridHeight
    );
}

function isBlocked(
  position: Position,
  obstacles: Position[],
  excludePositions: Position[] = []
): boolean {
  if (obstacles.some((o) => positionEquals(o, position))) {
    return true;
  }
  if (excludePositions.some((p) => positionEquals(p, position))) {
    return true;
  }
  return false;
}

export function findPath(
  start: Position,
  end: Position,
  obstacles: Position[],
  gridWidth: number,
  gridHeight: number,
  excludePositions: Position[] = []
): Position[] | null {
  if (positionEquals(start, end)) {
    return [start];
  }

  if (isBlocked(end, obstacles, excludePositions)) {
    return null;
  }

  const openList: PathNode[] = [];
  const closedList: Set<string> = new Set();

  const startNode: PathNode = {
    position: start,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
  };

  openList.push(startNode);

  while (openList.length > 0) {
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    if (positionEquals(current.position, end)) {
      const path: Position[] = [];
      let node: PathNode | undefined = current;
      while (node) {
        path.unshift(node.position);
        node = node.parent;
      }
      return path;
    }

    closedList.add(`${current.position.x},${current.position.y}`);

    const neighbors = getNeighbors(current.position, gridWidth, gridHeight);

    for (const neighborPos of neighbors) {
      if (closedList.has(`${neighborPos.x},${neighborPos.y}`)) {
        continue;
      }

      if (isBlocked(neighborPos, obstacles, excludePositions)) {
        continue;
      }

      const g = current.g + 1;
      const h = heuristic(neighborPos, end);
      const f = g + h;

      const existingNode = openList.find((n) =>
        positionEquals(n.position, neighborPos)
      );

      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openList.push({
          position: neighborPos,
          g,
          h,
          f,
          parent: current,
        });
      }
    }
  }

  return null;
}

export function getObstaclePositions(obstacles: Obstacle[]): Position[] {
  return obstacles.map((o) => o.position);
}

export function getRobotPositions(robots: Robot[], excludeId?: string): Position[] {
  return robots
    .filter((r) => r.id !== excludeId)
    .map((r) => r.position);
}
