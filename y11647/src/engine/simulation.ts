import type {
  TacticsScheme,
  SimulationResult,
  SimulationEvent,
  SimulationFrame,
  Point,
  Robot,
  Obstacle,
  Ball,
  PassPoint,
  Path,
} from './types';
import {
  ROBOT_RADIUS,
  BALL_RADIUS,
  ROBOT_SPEED,
  BALL_SPEED,
  ENERGY_PER_UNIT,
  FIELD_WIDTH,
  FIELD_HEIGHT,
} from './types';
import { generateId, distance, lerp, pathLength } from '../utils/geometry';
import {
  checkRobotObstacleCollision,
  checkRobotRobotCollision,
  checkBallOutOfBounds,
} from './collision';

interface RobotRuntime {
  robot: Robot;
  path: Path | undefined;
  pathProgress: number;
  pathTotalLength: number;
  currentEnergy: number;
  isStopped: boolean;
  stopReason?: string;
  hasCompletedPath: boolean;
}

interface BallRuntime {
  ball: Ball;
  isMoving: boolean;
  passFrom?: Point;
  passTo?: Point;
  passProgress: number;
  passTotalLength: number;
  carrierId?: string;
}

export function runSimulation(scheme: TacticsScheme): SimulationResult {
  const robots = scheme.elements.filter((e) => e.type === 'robot') as Robot[];
  const obstacles = scheme.elements.filter((e) => e.type === 'obstacle') as Obstacle[];
  const balls = scheme.elements.filter((e) => e.type === 'ball') as Ball[];
  const passPoints = scheme.elements.filter((e) => e.type === 'passPoint') as PassPoint[];
  const paths = scheme.paths;

  const robotRuntimes: Map<string, RobotRuntime> = new Map();
  const ballRuntimes: Map<string, BallRuntime> = new Map();

  for (const robot of robots) {
    const path = paths.find((p) => p.elementId === robot.id);
    const totalLength = path ? pathLength(path.points) : 0;
    robotRuntimes.set(robot.id, {
      robot: { ...robot },
      path,
      pathProgress: 0,
      pathTotalLength: totalLength,
      currentEnergy: robot.energy,
      isStopped: false,
      hasCompletedPath: !path || path.points.length < 2,
    });
  }

  for (const ball of balls) {
    ballRuntimes.set(ball.id, {
      ball: { ...ball },
      isMoving: false,
      passProgress: 0,
      passTotalLength: 0,
    });
  }

  const events: SimulationEvent[] = [];
  const frames: SimulationFrame[] = [];
  const startTime = Date.now();

  const maxTime = 30;
  const dt = 1 / 60;
  let currentTime = 0;

  const triggeredEvents = new Set<string>();

  while (currentTime < maxTime) {
    for (const runtime of robotRuntimes.values()) {
      if (runtime.isStopped || !runtime.path || runtime.hasCompletedPath) continue;

      const moveDistance = ROBOT_SPEED * dt;
      const energyConsumed = moveDistance * ENERGY_PER_UNIT;

      if (runtime.currentEnergy < energyConsumed) {
        runtime.isStopped = true;
        runtime.stopReason = 'energy_empty';
        const pos = getPositionOnPath(runtime.path, runtime.pathProgress);
        events.push({
          id: generateId(),
          time: currentTime,
          type: 'energy_empty',
          message: `机器人"${runtime.robot.label}"能量耗尽，已停止移动`,
          position: pos,
          elementIds: [runtime.robot.id],
        });
        continue;
      }

      runtime.currentEnergy -= energyConsumed;
      const progressIncrement = moveDistance / runtime.pathTotalLength;
      runtime.pathProgress = Math.min(1, runtime.pathProgress + progressIncrement);

      if (runtime.pathProgress >= 1) {
        runtime.hasCompletedPath = true;
        const pos = runtime.path.points[runtime.path.points.length - 1];
        events.push({
          id: generateId(),
          time: currentTime,
          type: 'robot_reach_target',
          message: `机器人"${runtime.robot.label}"到达目标位置`,
          position: pos,
          elementIds: [runtime.robot.id],
        });
      }

      const currentPos = getPositionOnPath(runtime.path, runtime.pathProgress);

      for (const obstacle of obstacles) {
        const eventKey = `obs_${runtime.robot.id}_${obstacle.id}`;
        if (triggeredEvents.has(eventKey)) continue;

        if (checkRobotObstacleCollision(currentPos, obstacle)) {
          triggeredEvents.add(eventKey);
          events.push({
            id: generateId(),
            time: currentTime,
            type: 'collision',
            message: `机器人"${runtime.robot.label}"与障碍物"${obstacle.label}"相撞`,
            position: currentPos,
            elementIds: [runtime.robot.id, obstacle.id],
          });
        }
      }
    }

    const robotPositions = new Map<string, Point>();
    for (const [id, runtime] of robotRuntimes) {
      if (runtime.path && !runtime.hasCompletedPath) {
        robotPositions.set(id, getPositionOnPath(runtime.path, runtime.pathProgress));
      } else {
        robotPositions.set(id, runtime.robot.position);
      }
    }

    const robotIds = Array.from(robotRuntimes.keys());
    for (let i = 0; i < robotIds.length; i++) {
      for (let j = i + 1; j < robotIds.length; j++) {
        const eventKey = `robot_${robotIds[i]}_${robotIds[j]}`;
        if (triggeredEvents.has(eventKey)) continue;

        const pos1 = robotPositions.get(robotIds[i])!;
        const pos2 = robotPositions.get(robotIds[j])!;

        if (checkRobotRobotCollision(pos1, pos2)) {
          triggeredEvents.add(eventKey);
          const r1 = robotRuntimes.get(robotIds[i])!;
          const r2 = robotRuntimes.get(robotIds[j])!;
          events.push({
            id: generateId(),
            time: currentTime,
            type: 'collision',
            message: `机器人"${r1.robot.label}"与机器人"${r2.robot.label}"相撞`,
            position: { x: (pos1.x + pos2.x) / 2, y: (pos1.y + pos2.y) / 2 },
            elementIds: [robotIds[i], robotIds[j]],
          });
        }
      }
    }

    for (const ballRuntime of ballRuntimes.values()) {
      if (ballRuntime.isMoving) {
        const moveDistance = BALL_SPEED * dt;
        const progressIncrement = moveDistance / ballRuntime.passTotalLength;
        ballRuntime.passProgress = Math.min(1, ballRuntime.passProgress + progressIncrement);

        const currentPos = lerp(
          ballRuntime.passFrom!,
          ballRuntime.passTo!,
          ballRuntime.passProgress
        );
        ballRuntime.ball.position = currentPos;

        if (checkBallOutOfBounds(currentPos)) {
          const eventKey = `ball_out_${ballRuntime.ball.id}`;
          if (!triggeredEvents.has(eventKey)) {
            triggeredEvents.add(eventKey);
            ballRuntime.isMoving = false;
            events.push({
              id: generateId(),
              time: currentTime,
              type: 'out_of_bounds',
              message: `传球越界！球在坐标(${Math.round(currentPos.x)}, ${Math.round(currentPos.y)})处出界`,
              position: currentPos,
              elementIds: [ballRuntime.ball.id],
            });
          }
        }

        if (ballRuntime.passProgress >= 1 && ballRuntime.isMoving) {
          ballRuntime.isMoving = false;
          const targetPassPoint = passPoints.find(
            (p) => p.targetId === ballRuntime.ball.id
          );
          if (targetPassPoint) {
            const distToTarget = distance(
              ballRuntime.ball.position,
              targetPassPoint.position
            );
            if (distToTarget < 30) {
              events.push({
                id: generateId(),
                time: currentTime,
                type: 'pass_complete',
                message: `传球成功！球到达"${targetPassPoint.label}"，误差${distToTarget.toFixed(1)}px`,
                position: ballRuntime.ball.position,
                elementIds: [ballRuntime.ball.id, targetPassPoint.id],
              });
            } else {
              events.push({
                id: generateId(),
                time: currentTime,
                type: 'pass_fail',
                message: `传球偏差！球距离目标"${targetPassPoint.label}"还有${distToTarget.toFixed(1)}px`,
                position: ballRuntime.ball.position,
                elementIds: [ballRuntime.ball.id, targetPassPoint.id],
              });
            }
          }
        }
      }
    }

    for (const runtime of robotRuntimes.values()) {
      if (runtime.hasCompletedPath && runtime.path) {
        const endPos = runtime.path.points[runtime.path.points.length - 1];
        for (const ballRuntime of ballRuntimes.values()) {
          if (!ballRuntime.isMoving && !ballRuntime.carrierId) {
            const dist = distance(endPos, ballRuntime.ball.position);
            if (dist < ROBOT_RADIUS + BALL_RADIUS + 5) {
              const targetPassPoint = passPoints.find(
                (p) => p.targetId === ballRuntime.ball.id
              );
              if (targetPassPoint) {
                ballRuntime.isMoving = true;
                ballRuntime.passFrom = { ...ballRuntime.ball.position };
                ballRuntime.passTo = { ...targetPassPoint.position };
                ballRuntime.passProgress = 0;
                ballRuntime.passTotalLength = distance(
                  ballRuntime.passFrom,
                  ballRuntime.passTo
                );
                ballRuntime.carrierId = runtime.robot.id;
                events.push({
                  id: generateId(),
                  time: currentTime,
                  type: 'pass_complete',
                  message: `机器人"${runtime.robot.label}"传球给"${targetPassPoint.label}"`,
                  position: ballRuntime.ball.position,
                  elementIds: [runtime.robot.id, ballRuntime.ball.id, targetPassPoint.id],
                });
              }
            }
          }
        }
      }
    }

    const frame: SimulationFrame = {
      time: currentTime,
      elementStates: [],
    };

    for (const [id, runtime] of robotRuntimes) {
      const pos =
        runtime.path && !runtime.hasCompletedPath
          ? getPositionOnPath(runtime.path, runtime.pathProgress)
          : runtime.robot.position;
      frame.elementStates.push({
        elementId: id,
        position: pos,
        energy: runtime.currentEnergy,
      });
    }

    for (const [id, runtime] of ballRuntimes) {
      frame.elementStates.push({
        elementId: id,
        position: runtime.ball.position,
      });
    }

    frames.push(frame);

    const allRobotsDone = Array.from(robotRuntimes.values()).every(
      (r) => r.hasCompletedPath || r.isStopped
    );
    const allBallsDone = Array.from(ballRuntimes.values()).every(
      (b) => !b.isMoving
    );

    if (allRobotsDone && allBallsDone && currentTime > 1) {
      break;
    }

    currentTime += dt;
  }

  const score = calculateScore(events, robotRuntimes, passPoints.length, balls.length);

  const finalElementStates: { elementId: string; position: Point; energy?: number }[] = [];
  for (const [id, runtime] of robotRuntimes) {
    const pos =
      runtime.path && !runtime.hasCompletedPath
        ? getPositionOnPath(runtime.path, runtime.pathProgress)
        : runtime.robot.position;
    finalElementStates.push({
      elementId: id,
      position: pos,
      energy: runtime.currentEnergy,
    });
  }
  for (const [id, runtime] of ballRuntimes) {
    finalElementStates.push({
      elementId: id,
      position: runtime.ball.position,
    });
  }

  return {
    schemeId: scheme.id,
    startTime,
    endTime: Date.now(),
    events,
    score,
    frames,
    finalElementStates,
  };
}

function getPositionOnPath(path: Path, progress: number): Point {
  if (path.points.length === 0) return { x: 0, y: 0 };
  if (path.points.length === 1) return path.points[0];
  if (progress <= 0) return path.points[0];
  if (progress >= 1) return path.points[path.points.length - 1];

  const totalLen = pathLength(path.points);
  const targetLen = totalLen * progress;
  let accumulated = 0;

  for (let i = 1; i < path.points.length; i++) {
    const segLen = distance(path.points[i - 1], path.points[i]);
    if (accumulated + segLen >= targetLen) {
      const t = (targetLen - accumulated) / segLen;
      return lerp(path.points[i - 1], path.points[i], t);
    }
    accumulated += segLen;
  }
  return path.points[path.points.length - 1];
}

function calculateScore(
  events: SimulationEvent[],
  robotRuntimes: Map<string, RobotRuntime>,
  passPointCount: number,
  ballCount: number
): {
  obstacle: number;
  pass: number;
  energy: number;
  completion: number;
  total: number;
} {
  const collisionCount = events.filter((e) => e.type === 'collision').length;
  const obstacleScore = Math.max(0, 30 - collisionCount * 10);

  const passCompleteCount = events.filter((e) => e.type === 'pass_complete').length;
  const passFailCount = events.filter((e) => e.type === 'pass_fail').length;
  const outOfBoundsCount = events.filter((e) => e.type === 'out_of_bounds').length;
  const totalPassAttempts = passCompleteCount + passFailCount + outOfBoundsCount;
  let passScore = 30;
  if (totalPassAttempts > 0) {
    passScore = Math.round(30 * (passCompleteCount / totalPassAttempts));
  } else if (passPointCount > 0 && ballCount > 0) {
    passScore = 0;
  }

  let totalInitialEnergy = 0;
  let totalFinalEnergy = 0;
  for (const runtime of robotRuntimes.values()) {
    totalInitialEnergy += runtime.robot.maxEnergy;
    totalFinalEnergy += runtime.currentEnergy;
  }
  const energyRatio = totalInitialEnergy > 0 ? totalFinalEnergy / totalInitialEnergy : 0;
  const energyScore = energyRatio >= 0.3 ? 20 : Math.round(20 * (energyRatio / 0.3));

  const totalRobots = robotRuntimes.size;
  let completedRobots = 0;
  for (const runtime of robotRuntimes.values()) {
    if (runtime.hasCompletedPath) completedRobots++;
  }
  const completionScore =
    totalRobots > 0 ? Math.round(20 * (completedRobots / totalRobots)) : 20;

  const total = obstacleScore + passScore + energyScore + completionScore;

  return {
    obstacle: obstacleScore,
    pass: passScore,
    energy: energyScore,
    completion: completionScore,
    total,
  };
}
