import type { Point, Path, Obstacle, Robot, Ball } from './types';
import {
  lineIntersectsRect,
  lineIntersectsLine,
  circleIntersectsRect,
  distance,
} from '../utils/geometry';
import { ROBOT_RADIUS, BALL_RADIUS, FIELD_WIDTH, FIELD_HEIGHT } from './types';

export interface CollisionWarning {
  type: 'path_obstacle' | 'path_path' | 'out_of_bounds';
  message: string;
  position: Point;
  elementIds: string[];
}

export function checkPathAgainstObstacles(
  path: Path,
  obstacles: Obstacle[]
): CollisionWarning[] {
  const warnings: CollisionWarning[] = [];
  const points = path.points;

  if (points.length < 2) return warnings;

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];

    for (const obstacle of obstacles) {
      if (
        lineIntersectsRect(p1, p2, {
          x: obstacle.position.x - obstacle.width / 2,
          y: obstacle.position.y - obstacle.height / 2,
          width: obstacle.width,
          height: obstacle.height,
        })
      ) {
        warnings.push({
          type: 'path_obstacle',
          message: `路径与障碍物"${obstacle.label}"相撞`,
          position: {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
          },
          elementIds: [path.elementId, obstacle.id],
        });
      }
    }
  }

  return warnings;
}

export function checkPathAgainstPaths(
  path1: Path,
  path2: Path
): CollisionWarning | null {
  const points1 = path1.points;
  const points2 = path2.points;

  if (points1.length < 2 || points2.length < 2) return null;

  for (let i = 1; i < points1.length; i++) {
    for (let j = 1; j < points2.length; j++) {
      if (lineIntersectsLine(points1[i - 1], points1[i], points2[j - 1], points2[j])) {
        return {
          type: 'path_path',
          message: `两条路径存在相撞风险`,
          position: {
            x: (points1[i - 1].x + points1[i].x) / 2,
            y: (points1[i - 1].y + points1[i].y) / 2,
          },
          elementIds: [path1.elementId, path2.elementId],
        };
      }
    }
  }

  return null;
}

export function checkOutOfBounds(
  path: Path
): CollisionWarning[] {
  const warnings: CollisionWarning[] = [];
  const points = path.points;

  for (const point of points) {
    if (
      point.x < ROBOT_RADIUS ||
      point.x > FIELD_WIDTH - ROBOT_RADIUS ||
      point.y < ROBOT_RADIUS ||
      point.y > FIELD_HEIGHT - ROBOT_RADIUS
    ) {
      warnings.push({
        type: 'out_of_bounds',
        message: `路径超出场地边界`,
        position: point,
        elementIds: [path.elementId],
      });
      break;
    }
  }

  return warnings;
}

export function checkAllCollisions(
  paths: Path[],
  obstacles: Obstacle[]
): CollisionWarning[] {
  const warnings: CollisionWarning[] = [];

  for (const path of paths) {
    warnings.push(...checkPathAgainstObstacles(path, obstacles));
    warnings.push(...checkOutOfBounds(path));
  }

  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      const collision = checkPathAgainstPaths(paths[i], paths[j]);
      if (collision) {
        warnings.push(collision);
      }
    }
  }

  return warnings;
}

export function checkRobotObstacleCollision(
  robotPos: Point,
  obstacle: Obstacle
): boolean {
  return circleIntersectsRect(
    { x: robotPos.x, y: robotPos.y, radius: ROBOT_RADIUS },
    {
      x: obstacle.position.x - obstacle.width / 2,
      y: obstacle.position.y - obstacle.height / 2,
      width: obstacle.width,
      height: obstacle.height,
    }
  );
}

export function checkRobotRobotCollision(
  pos1: Point,
  pos2: Point
): boolean {
  return distance(pos1, pos2) < ROBOT_RADIUS * 2;
}

export function checkBallOutOfBounds(pos: Point): boolean {
  return (
    pos.x < BALL_RADIUS ||
    pos.x > FIELD_WIDTH - BALL_RADIUS ||
    pos.y < BALL_RADIUS ||
    pos.y > FIELD_HEIGHT - BALL_RADIUS
  );
}

export function checkRobotOutOfBounds(pos: Point): boolean {
  return (
    pos.x < ROBOT_RADIUS ||
    pos.x > FIELD_WIDTH - ROBOT_RADIUS ||
    pos.y < ROBOT_RADIUS ||
    pos.y > FIELD_HEIGHT - ROBOT_RADIUS
  );
}
