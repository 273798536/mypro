import type { Vector2, Charge, Ball, Maze, CellType, Obstacle, PreviewWarning } from './types';
import { GAME_CONFIG, clamp } from './config';

const { PHYSICS, PREVIEW } = GAME_CONFIG;

export const calculateFieldFromCharge = (point: Vector2, charge: Charge): Vector2 => {
  const dx = point.x - charge.position.x;
  const dy = point.y - charge.position.y;
  const r2 = dx * dx + dy * dy;
  const r = Math.sqrt(r2);

  if (r < PHYSICS.SINGULARITY_RADIUS) {
    return { x: 0, y: 0 };
  }

  const magnitude = (PHYSICS.COULOMB_CONSTANT * charge.magnitude * charge.strength) / r2;
  return {
    x: magnitude * (dx / r),
    y: magnitude * (dy / r),
  };
};

export const calculateTotalField = (point: Vector2, charges: Charge[]): Vector2 => {
  return charges.reduce(
    (total, charge) => {
      const field = calculateFieldFromCharge(point, charge);
      return {
        x: total.x + field.x,
        y: total.y + field.y,
      };
    },
    { x: 0, y: 0 }
  );
};

export const calculateFieldStrength = (field: Vector2): number => {
  return Math.sqrt(field.x * field.x + field.y * field.y);
};

export const getMaxFieldStrength = (charges: Charge[], maze: Maze): number => {
  let maxStrength = 0;
  const step = 20;

  for (let x = 0; x < maze.width * maze.cellSize; x += step) {
    for (let y = 0; y < maze.height * maze.cellSize; y += step) {
      const field = calculateTotalField({ x, y }, charges);
      const strength = calculateFieldStrength(field);
      if (strength > maxStrength) {
        maxStrength = strength;
      }
    }
  }

  return maxStrength;
};

export const updateBallPhysics = (
  ball: Ball,
  charges: Charge[],
  obstacles: Obstacle[],
  dt: number
): { ball: Ball; collided: boolean; collisionPoint?: Vector2 } => {
  const field = calculateTotalField(ball.position, charges);
  const fieldStrength = calculateFieldStrength(field);

  if (fieldStrength > PHYSICS.MAX_FIELD_STRENGTH) {
    const scale = PHYSICS.MAX_FIELD_STRENGTH / fieldStrength;
    field.x *= scale;
    field.y *= scale;
  }

  const force = {
    x: field.x * ball.charge,
    y: field.y * ball.charge,
  };

  const acceleration = {
    x: force.x / PHYSICS.BALL_MASS,
    y: force.y / PHYSICS.BALL_MASS,
  };

  ball.velocity.x = (ball.velocity.x + acceleration.x * dt) * PHYSICS.FRICTION;
  ball.velocity.y = (ball.velocity.y + acceleration.y * dt) * PHYSICS.FRICTION;

  const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
  if (speed > PHYSICS.MAX_VELOCITY) {
    const scale = PHYSICS.MAX_VELOCITY / speed;
    ball.velocity.x *= scale;
    ball.velocity.y *= scale;
  }

  if (speed < PHYSICS.MIN_VELOCITY) {
    ball.velocity.x = 0;
    ball.velocity.y = 0;
  }

  const newPosition = {
    x: ball.position.x + ball.velocity.x * dt,
    y: ball.position.y + ball.velocity.y * dt,
  };

  for (const obstacle of obstacles) {
    if (checkCircleRectCollision(newPosition, ball.radius, obstacle)) {
      return {
        ball: { ...ball, position: newPosition },
        collided: true,
        collisionPoint: { ...newPosition },
      };
    }
  }

  ball.position = newPosition;

  return { ball, collided: false };
};

export const checkCircleRectCollision = (
  circlePos: Vector2,
  circleRadius: number,
  rect: { position: Vector2; width: number; height: number }
): boolean => {
  const closestX = clamp(circlePos.x, rect.position.x, rect.position.x + rect.width);
  const closestY = clamp(circlePos.y, rect.position.y, rect.position.y + rect.height);

  const dx = circlePos.x - closestX;
  const dy = circlePos.y - closestY;

  return dx * dx + dy * dy < circleRadius * circleRadius;
};

export const getCellAtPosition = (position: Vector2, maze: Maze): CellType | null => {
  const cellX = Math.floor(position.x / maze.cellSize);
  const cellY = Math.floor(position.y / maze.cellSize);

  if (cellX < 0 || cellX >= maze.width || cellY < 0 || cellY >= maze.height) {
    return null;
  }

  return maze.grid[cellY][cellX];
};

export const checkWallCollision = (position: Vector2, radius: number, maze: Maze): boolean => {
  const checkPoints = [
    { x: position.x - radius, y: position.y },
    { x: position.x + radius, y: position.y },
    { x: position.x, y: position.y - radius },
    { x: position.x, y: position.y + radius },
  ];

  for (const point of checkPoints) {
    const cell = getCellAtPosition(point, maze);
    if (cell === 'wall' || cell === 'obstacle') {
      return true;
    }
  }

  return false;
};

export const checkReachedEnd = (position: Vector2, maze: Maze, tolerance: number = 20): boolean => {
  const dx = position.x - (maze.endPos.x * maze.cellSize + maze.cellSize / 2);
  const dy = position.y - (maze.endPos.y * maze.cellSize + maze.cellSize / 2);
  return Math.sqrt(dx * dx + dy * dy) < tolerance;
};

export const predictPath = (
  startPos: Vector2,
  startVelocity: Vector2,
  ballCharge: number,
  ballRadius: number,
  charges: Charge[],
  maze: Maze,
  obstacles: Obstacle[]
): { path: Vector2[]; warnings: PreviewWarning[]; reachesEnd: boolean } => {
  const path: Vector2[] = [{ ...startPos }];
  const warnings: PreviewWarning[] = [];
  let position = { ...startPos };
  let velocity = { ...startVelocity };
  let reachesEnd = false;

  const maxFieldStrength = getMaxFieldStrength(charges, maze);
  if (maxFieldStrength > PHYSICS.FIELD_WARNING_THRESHOLD) {
    warnings.push({
      type: 'field_too_strong',
      message: `电场强度过高 (${Math.round(maxFieldStrength)})，可能导致运动不稳定`,
    });
  }

  for (let step = 0; step < PREVIEW.MAX_STEPS; step++) {
    const field = calculateTotalField(position, charges);
    const fieldStrength = calculateFieldStrength(field);

    if (fieldStrength > PHYSICS.MAX_FIELD_STRENGTH) {
      warnings.push({
        type: 'field_too_strong',
        message: `检测到超强度电场 (${Math.round(fieldStrength)})，路径可能失控`,
        position: { ...position },
      });
      break;
    }

    const force = {
      x: field.x * ballCharge,
      y: field.y * ballCharge,
    };

    const acceleration = {
      x: force.x / PHYSICS.BALL_MASS,
      y: force.y / PHYSICS.BALL_MASS,
    };

    velocity.x = (velocity.x + acceleration.x * PREVIEW.STEP_SIZE * PHYSICS.TIME_STEP) * PHYSICS.FRICTION;
    velocity.y = (velocity.y + acceleration.y * PREVIEW.STEP_SIZE * PHYSICS.TIME_STEP) * PHYSICS.FRICTION;

    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    if (speed > PHYSICS.MAX_VELOCITY) {
      const scale = PHYSICS.MAX_VELOCITY / speed;
      velocity.x *= scale;
      velocity.y *= scale;
    }

    const newPosition = {
      x: position.x + velocity.x * PREVIEW.STEP_SIZE * PHYSICS.TIME_STEP,
      y: position.y + velocity.y * PREVIEW.STEP_SIZE * PHYSICS.TIME_STEP,
    };

    if (step % PREVIEW.COLLISION_CHECK_STEPS === 0) {
      if (checkWallCollision(newPosition, ballRadius, maze)) {
        warnings.push({
          type: 'path_wall',
          message: '预测路径将穿过迷宫墙壁',
          position: { ...newPosition },
        });
        path.push({ ...newPosition });
        break;
      }

      for (const obstacle of obstacles) {
        if (checkCircleRectCollision(newPosition, ballRadius, obstacle)) {
          warnings.push({
            type: 'path_wall',
            message: '预测路径将碰撞障碍物',
            position: { ...newPosition },
          });
          path.push({ ...newPosition });
          break;
        }
      }
    }

    if (checkReachedEnd(newPosition, maze, 25)) {
      reachesEnd = true;
      path.push({ ...newPosition });
      break;
    }

    if (
      newPosition.x < -50 ||
      newPosition.x > maze.width * maze.cellSize + 50 ||
      newPosition.y < -50 ||
      newPosition.y > maze.height * maze.cellSize + 50
    ) {
      break;
    }

    position = newPosition;
    path.push({ ...position });
  }

  return { path, warnings, reachesEnd };
};

export const generateFieldLines = (
  charges: Charge[],
  maze: Maze,
  count: number = 8
): { start: Vector2; points: Vector2[]; isPositive: boolean }[] => {
  const lines: { start: Vector2; points: Vector2[]; isPositive: boolean }[] = [];

  for (const charge of charges) {
    const isPositive = charge.magnitude > 0;
    const lineCount = Math.min(count, Math.ceil(charge.strength * 2));

    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const start = {
        x: charge.position.x + Math.cos(angle) * PHYSICS.SINGULARITY_RADIUS,
        y: charge.position.y + Math.sin(angle) * PHYSICS.SINGULARITY_RADIUS,
      };

      const points: Vector2[] = [{ ...start }];
      let pos = { ...start };
      const stepSize = isPositive ? GAME_CONFIG.RENDERING.FIELD_LINE_STEP : -GAME_CONFIG.RENDERING.FIELD_LINE_STEP;

      for (let j = 0; j < GAME_CONFIG.RENDERING.FIELD_LINE_MAX_LENGTH / Math.abs(stepSize); j++) {
        const field = calculateTotalField(pos, charges);
        const strength = calculateFieldStrength(field);

        if (strength < 1) break;

        const normalizedField = {
          x: (field.x / strength) * Math.abs(stepSize),
          y: (field.y / strength) * Math.abs(stepSize),
        };

        pos = {
          x: pos.x + (isPositive ? normalizedField.x : -normalizedField.x),
          y: pos.y + (isPositive ? normalizedField.y : -normalizedField.y),
        };

        if (checkWallCollision(pos, 1, maze)) break;

        if (
          pos.x < 0 ||
          pos.x > maze.width * maze.cellSize ||
          pos.y < 0 ||
          pos.y > maze.height * maze.cellSize
        ) {
          break;
        }

        points.push({ ...pos });
      }

      if (points.length > 3) {
        lines.push({ start, points, isPositive });
      }
    }
  }

  return lines;
};
