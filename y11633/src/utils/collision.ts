import type { Position, Robot } from '../types';

export function checkCollision(
  robot1: Robot,
  robot2: Robot,
  nextPos1: Position,
  nextPos2: Position
): boolean {
  if (nextPos1.x === nextPos2.x && nextPos1.y === nextPos2.y) {
    return true;
  }
  if (
    nextPos1.x === robot2.position.x &&
    nextPos1.y === robot2.position.y &&
    nextPos2.x === robot1.position.x &&
    nextPos2.y === robot1.position.y
  ) {
    return true;
  }
  return false;
}

export function findCollisions(
  robots: Robot[],
  nextPositions: Map<string, Position>
): string[][] {
  const collisions: string[][] = [];
  const robotArray = robots.filter(r => r.status === 'moving');

  for (let i = 0; i < robotArray.length; i++) {
    for (let j = i + 1; j < robotArray.length; j++) {
      const r1 = robotArray[i];
      const r2 = robotArray[j];
      const pos1 = nextPositions.get(r1.id) || r1.position;
      const pos2 = nextPositions.get(r2.id) || r2.position;

      if (checkCollision(r1, r2, pos1, pos2)) {
        collisions.push([r1.id, r2.id]);
      }
    }
  }

  return collisions;
}

export function willCollideWithRobot(
  position: Position,
  robots: Robot[],
  excludeId?: string
): Robot | null {
  for (const robot of robots) {
    if (robot.id === excludeId) continue;
    if (robot.position.x === position.x && robot.position.y === position.y) {
      return robot;
    }
  }
  return null;
}
