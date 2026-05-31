import {
  Robot,
  Order,
  Position,
  Collision,
  ScoreBreakdown,
  GameResult,
  PauseRecord,
  PathFindingRecord,
  Decision,
} from '../types/game';

function positionEquals(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function detectCollisions(
  robots: Robot[],
  nextPositions: Map<string, Position>
): Collision[] {
  const collisions: Collision[] = [];
  const robotArray = Array.from(robots);

  for (let i = 0; i < robotArray.length; i++) {
    for (let j = i + 1; j < robotArray.length; j++) {
      const r1 = robotArray[i];
      const r2 = robotArray[j];
      const p1 = nextPositions.get(r1.id) || r1.position;
      const p2 = nextPositions.get(r2.id) || r2.position;

      if (positionEquals(p1, p2)) {
        collisions.push({
          type: 'robot-robot',
          robotId1: r1.id,
          robotId2: r2.id,
          position: p1,
          description: `机器人 ${r1.name} 与 ${r2.name} 在 (${p1.x}, ${p1.y}) 发生碰撞`,
        });
      }

      if (positionEquals(p1, r2.position) && positionEquals(p2, r1.position)) {
        collisions.push({
          type: 'path-conflict',
          robotId1: r1.id,
          robotId2: r2.id,
          position: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
          description: `机器人 ${r1.name} 与 ${r2.name} 路径交叉冲突`,
        });
      }
    }
  }

  return collisions;
}

export function checkOrderTimeouts(
  orders: Order[],
  currentTime: number
): Order[] {
  return orders.map((order) => {
    if (
      order.status === 'pending' ||
      order.status === 'assigned'
    ) {
      if (currentTime >= order.deadline) {
        return { ...order, status: 'timeout' as const };
      }
    }
    return order;
  });
}

export function calculateScore(
  completedOrders: Order[],
  timeoutOrders: Order[],
  totalPauseTime: number,
  currentTime: number,
  maxTime: number
): { score: number; breakdown: ScoreBreakdown } {
  const baseScore = completedOrders.reduce((sum, order) => sum + order.reward, 0);
  const timeoutPenalty = timeoutOrders.reduce((sum, order) => sum + Math.floor(order.reward * 0.5), 0);
  
  const timeBonus = Math.max(0, Math.floor((maxTime - currentTime) * 2));
  
  const pausePenalty = Math.floor(totalPauseTime * 0.5);

  const total = Math.max(0, baseScore - timeoutPenalty + timeBonus - pausePenalty);

  return {
    score: total,
    breakdown: {
      completedOrders: completedOrders.length,
      timeoutOrders: timeoutOrders.length,
      baseScore,
      timeBonus,
      pausePenalty,
      total,
    },
  };
}

export function calculateGameResult(
  robots: Robot[],
  orders: Order[],
  pauseRecords: PauseRecord[],
  pathFindingTriggers: PathFindingRecord[],
  decisions: Decision[],
  currentTime: number,
  maxTime: number
): GameResult {
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const timeoutOrders = orders.filter((o) => o.status === 'timeout');
  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'assigned');

  const totalPauseTime = pauseRecords.reduce((sum, pr) => sum + (pr.duration || 0), 0);

  const { score, breakdown } = calculateScore(
    completedOrders,
    timeoutOrders,
    totalPauseTime,
    currentTime,
    maxTime
  );

  const allOrdersCompleted = orders.every((o) => o.status === 'completed');
  const hasTooManyTimeouts = timeoutOrders.length >= Math.ceil(orders.length * 0.5);
  const isWin = allOrdersCompleted && !hasTooManyTimeouts;

  let reason = '';
  if (isWin) {
    reason = `恭喜！成功完成所有 ${completedOrders.length} 个订单。`;
  } else if (hasTooManyTimeouts) {
    reason = `失败：${timeoutOrders.length} 个订单超时，超过半数。`;
  } else if (pendingOrders.length > 0) {
    reason = `失败：仍有 ${pendingOrders.length} 个订单未完成。`;
  }

  const keyDecisions = decisions
    .slice(-5)
    .map((d) => `${d.description} - ${d.impact}`);

  return {
    isWin,
    finalScore: score,
    reason,
    keyDecisions,
    pauseImpact: {
      totalPauseTime,
      scoreReduction: breakdown.pausePenalty,
      details: `暂停总时长 ${totalPauseTime} 秒，扣除 ${breakdown.pausePenalty} 分。每暂停1秒扣除0.5分。`,
    },
    pathFindingTriggers,
    scoreBreakdown: breakdown,
  };
}

export function updateRobotBattery(robot: Robot): Robot {
  if (robot.status === 'charging') {
    const newBattery = Math.min(robot.maxBattery, robot.battery + 5);
    return {
      ...robot,
      battery: newBattery,
      status: newBattery >= robot.maxBattery ? 'idle' : 'charging',
    };
  }

  if (robot.status === 'moving' || robot.status === 'delivering') {
    const newBattery = Math.max(0, robot.battery - 1);
    return {
      ...robot,
      battery: newBattery,
      status: newBattery <= 10 ? 'low-battery' : robot.status,
    };
  }

  return robot;
}

export function getRobotNextPosition(robot: Robot): Position | null {
  if (!robot.currentPath || robot.pathIndex === undefined) {
    return null;
  }

  if (robot.pathIndex >= robot.currentPath.length - 1) {
    return null;
  }

  return robot.currentPath[robot.pathIndex + 1];
}

export function canRobotAcceptOrder(robot: Robot): boolean {
  return (
    (robot.status === 'idle' || robot.status === 'low-battery') &&
    robot.battery > 10
  );
}
