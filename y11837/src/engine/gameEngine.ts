import type {
  Position, WarehouseMap, Robot, Order, GameEvent,
  ReplayFrame, ScenarioConfig, GamePhase, ConfigDiff,
  RobotConfig, ShelfConfig
} from './types';
import { findPath, findNearestCharger } from './pathfinder';

const BATTERY_MOVE_COST = 2;
const BATTERY_PICK_COST = 5;
const BATTERY_LOW_THRESHOLD = 20;
const BATTERY_CRITICAL_THRESHOLD = 10;
const BATTERY_CHARGE_RATE = 10;
const BATTERY_CHARGE_LEAVE = 80;
const COLLISION_COOLDOWN_TICKS = 2;
const PRIORITY_WEIGHTS: Record<string, number> = { urgent: 3, normal: 2, low: 1 };
const SCORE_COMPLETE_MULTIPLIER = 100;
const SCORE_TIMEOUT_PENALTY = 150;
const SCORE_COLLISION_PENALTY = 50;
const SCORE_DEPLETION_PENALTY = 100;

function posEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

export function createMapFromConfig(config: ScenarioConfig): WarehouseMap {
  const cells: WarehouseMap['cells'] = [];

  for (let y = 0; y < config.mapHeight; y++) {
    const row: WarehouseMap['cells'][0] = [];
    for (let x = 0; x < config.mapWidth; x++) {
      row.push({ x, y, type: 'aisle', blocked: false });
    }
    cells.push(row);
  }

  for (const p of config.shelves.positions) {
    if (p.y < config.mapHeight && p.x < config.mapWidth) {
      cells[p.y][p.x].type = 'shelf';
    }
  }

  for (const p of config.shelves.blockedAisles) {
    if (p.y < config.mapHeight && p.x < config.mapWidth) {
      cells[p.y][p.x].blocked = true;
    }
  }

  for (const p of config.chargerPositions) {
    if (p.y < config.mapHeight && p.x < config.mapWidth) {
      cells[p.y][p.x].type = 'charger';
    }
  }

  for (const p of config.dispatchPositions) {
    if (p.y < config.mapHeight && p.x < config.mapWidth) {
      cells[p.y][p.x].type = 'dispatch';
    }
  }

  return { width: config.mapWidth, height: config.mapHeight, cells };
}

export function createRobotsFromConfig(config: ScenarioConfig): Robot[] {
  return config.robots.map(rc => ({
    id: rc.id,
    name: rc.name,
    color: rc.color,
    position: { x: rc.startX, y: rc.startY },
    battery: rc.maxBattery,
    maxBattery: rc.maxBattery,
    currentOrderId: null,
    path: [],
    pathIndex: 0,
    state: 'idle' as const,
    collisionCooldown: 0,
    lowBatteryWarned: false,
  }));
}

export interface GameState {
  phase: GamePhase;
  tick: number;
  map: WarehouseMap;
  robots: Robot[];
  orders: Order[];
  events: GameEvent[];
  replayLog: ReplayFrame[];
  score: number;
  totalCompleted: number;
  totalTimeout: number;
  totalCollisions: number;
  totalDepletions: number;
  maxTick: number;
  orderInterval: number;
  nextOrderTick: number;
  orderIdCounter: number;
  config: ScenarioConfig;
  timeoutReasonModal: { orderId: string; reason: string; position?: Position } | null;
}

export function createGameState(config: ScenarioConfig): GameState {
  const map = createMapFromConfig(config);
  const robots = createRobotsFromConfig(config);
  return {
    phase: 'setup',
    tick: 0,
    map,
    robots,
    orders: [],
    events: [],
    replayLog: [],
    score: 0,
    totalCompleted: 0,
    totalTimeout: 0,
    totalCollisions: 0,
    totalDepletions: 0,
    maxTick: config.timeLimit,
    orderInterval: config.orderInterval,
    nextOrderTick: config.orderInterval,
    orderIdCounter: 0,
    config,
    timeoutReasonModal: null,
  };
}

function generateOrder(state: GameState): Order {
  const shelfPositions = state.config.shelves.positions;
  const dispatchPositions = state.config.dispatchPositions;
  const shelf = shelfPositions[Math.floor(Math.random() * shelfPositions.length)];
  const dispatch = dispatchPositions[Math.floor(Math.random() * dispatchPositions.length)];
  const priorities: Array<'urgent' | 'normal' | 'low'> = ['urgent', 'normal', 'low'];
  const priority = priorities[Math.floor(Math.random() * priorities.length)];
  const timeLimits: Record<string, number> = { urgent: 30, normal: 50, low: 70 };

  state.orderIdCounter++;
  return {
    id: `ORD-${String(state.orderIdCounter).padStart(3, '0')}`,
    shelfPosition: { ...shelf },
    dispatchPosition: { ...dispatch },
    priority,
    timeLimit: timeLimits[priority],
    elapsed: 0,
    assignedRobotId: null,
    status: 'pending',
    hadCollision: false,
    hadLowBattery: false,
    hadBlockedAisle: false,
  };
}

export function assignOrderToRobot(state: GameState, orderId: string, robotId: string): GameState {
  const order = state.orders.find(o => o.id === orderId);
  const robot = state.robots.find(r => r.id === robotId);

  if (!order || !robot || order.status !== 'pending' || robot.state !== 'idle') return state;

  const newOrder = { ...order, status: 'in_progress' as const, assignedRobotId: robotId };
  const occupied = state.robots.filter(r => r.id !== robotId).map(r => r.position);

  const path = findPath(state.map, robot.position, newOrder.shelfPosition, occupied);

  if (!path) {
    const pathWithBlocked = findPath(
      { ...state.map, cells: state.map.cells.map(row => row.map(c => ({ ...c, blocked: false }))) },
      robot.position, newOrder.shelfPosition, occupied
    );
    if (!pathWithBlocked) {
      newOrder.hadBlockedAisle = true;
    }
  }

  const newRobot: Robot = {
    ...robot,
    state: 'moving_to_shelf',
    currentOrderId: orderId,
    path: path || [],
    pathIndex: 0,
  };

  const estimatedCost = (path ? path.length * BATTERY_MOVE_COST + BATTERY_PICK_COST : 0);
  const lowBatteryWarning = robot.battery < estimatedCost + BATTERY_LOW_THRESHOLD;

  const newEvents = [...state.events];
  if (lowBatteryWarning) {
    newEvents.push({
      tick: state.tick,
      type: 'low_battery_warning',
      details: `机器人 ${robot.name} 电量可能不足以完成订单 ${order.id}`,
      position: robot.position,
    });
  }

  newEvents.push({
    tick: state.tick,
    type: 'order_assigned',
    details: `订单 ${order.id} 分配给 ${robot.name}`,
    position: robot.position,
  });

  return {
    ...state,
    orders: state.orders.map(o => o.id === orderId ? newOrder : o),
    robots: state.robots.map(r => r.id === robotId ? newRobot : r),
    events: newEvents,
  };
}

function analyzeTimeoutReason(order: Order, robot: Robot | undefined): string {
  if (order.hadLowBattery || (robot && robot.battery < BATTERY_CRITICAL_THRESHOLD)) {
    return 'low_battery';
  }
  if (order.hadCollision) {
    return 'path_collision';
  }
  if (order.hadBlockedAisle) {
    return 'blocked_aisle';
  }
  return 'no_available_robot';
}

function getTimeoutDescription(reason: string): string {
  const reasons: Record<string, string> = {
    low_battery: '电量不足：机器人电量过低，无法在时限内完成拣货',
    path_collision: '路径相撞：执行途中与其他机器人发生碰撞，导致延误',
    blocked_aisle: '货道堵塞：货架堵塞导致无可用路径',
    no_available_robot: '无可用机器人：派单时没有空闲机器人可执行',
  };
  return reasons[reason] || '未知原因';
}

export function gameTick(state: GameState): GameState {
  if (state.phase !== 'running') return state;

  let newState = { ...state, tick: state.tick + 1, events: [...state.events] };
  let robots = newState.robots.map(r => ({ ...r }));
  let orders = newState.orders.map(o => ({ ...o }));
  let score = newState.score;
  let totalCompleted = newState.totalCompleted;
  let totalTimeout = newState.totalTimeout;
  let totalCollisions = newState.totalCollisions;
  let totalDepletions = newState.totalDepletions;
  const tickEvents: GameEvent[] = [];

  if (newState.tick >= newState.nextOrderTick && orders.filter(o => o.status === 'pending' || o.status === 'in_progress').length < newState.config.maxOrders) {
    const newOrder = generateOrder(newState);
    orders.push(newOrder);
    newState.nextOrderTick = newState.tick + newState.orderInterval;
    newState.orderIdCounter = newState.orderIdCounter;
  }

  const positionMap = new Map<string, string[]>();
  for (const robot of robots) {
    const key = posKey(robot.position);
    const existing = positionMap.get(key) || [];
    existing.push(robot.id);
    positionMap.set(key, existing);
  }

  for (let i = 0; i < robots.length; i++) {
    const robot = robots[i];
    if (robot.collisionCooldown > 0) {
      robot.collisionCooldown--;
      if (robot.collisionCooldown === 0) {
        robot.state = robot.currentOrderId ? 'moving_to_shelf' : 'idle';
      }
      continue;
    }

    if (robot.state === 'charging') {
      robot.battery = Math.min(robot.maxBattery, robot.battery + BATTERY_CHARGE_RATE);
      if (robot.battery >= BATTERY_CHARGE_LEAVE) {
        robot.state = 'idle';
        robot.battery = Math.min(robot.maxBattery, robot.battery);
        tickEvents.push({
          tick: newState.tick,
          type: 'charging',
          details: `机器人 ${robot.name} 充电完毕 (${Math.round(robot.battery)}%)`,
          position: robot.position,
        });
      }
      continue;
    }

    if (robot.battery < BATTERY_CRITICAL_THRESHOLD) {
      const occupied = robots.filter(r => r.id !== robot.id).map(r => r.position);
      const chargerPos = findNearestCharger(newState.map, robot.position, occupied);

      if (chargerPos) {
        const path = findPath(newState.map, robot.position, chargerPos, occupied);
        if (path) {
          if (robot.currentOrderId) {
            const order = orders.find(o => o.id === robot.currentOrderId);
            if (order) {
              order.hadLowBattery = true;
            }
          }
          robot.path = path;
          robot.pathIndex = 0;
          robot.state = 'charging';
          if (posEqual(robot.position, chargerPos)) {
            continue;
          }
        } else {
          totalDepletions++;
          score -= SCORE_DEPLETION_PENALTY;
          tickEvents.push({
            tick: newState.tick,
            type: 'low_battery_warning',
            details: `机器人 ${robot.name} 电量枯竭，无法到达充电桩`,
            position: robot.position,
          });
          continue;
        }
      }
    }

    if (robot.state === 'moving_to_shelf' && robot.path.length > 0) {
      robot.pathIndex++;
      if (robot.pathIndex < robot.path.length) {
        const nextPos = robot.path[robot.pathIndex];
        const otherAtPos = robots.some(r => r.id !== robot.id && posEqual(r.position, nextPos) && r.collisionCooldown === 0);

        if (otherAtPos) {
          robot.pathIndex--;
          robot.state = 'blocked';
          tickEvents.push({
            tick: newState.tick,
            type: 'collision',
            details: `机器人 ${robot.name} 在 (${nextPos.x},${nextPos.y}) 与其他机器人路径相撞`,
            position: nextPos,
          });
          totalCollisions++;
          score -= SCORE_COLLISION_PENALTY;
        } else {
          robot.position = nextPos;
          robot.battery = Math.max(0, robot.battery - BATTERY_MOVE_COST);

          if (robot.battery < BATTERY_LOW_THRESHOLD && !robot.lowBatteryWarned) {
            robot.lowBatteryWarned = true;
            tickEvents.push({
              tick: newState.tick,
              type: 'low_battery_warning',
              details: `机器人 ${robot.name} 电量低 (${Math.round(robot.battery)}%)`,
              position: robot.position,
            });
          }
        }
      } else {
        const order = orders.find(o => o.id === robot.currentOrderId);
        if (order) {
          robot.state = 'picking';
          robot.battery = Math.max(0, robot.battery - BATTERY_PICK_COST);
        }
      }
    } else if (robot.state === 'picking') {
      const order = orders.find(o => o.id === robot.currentOrderId);
      if (order) {
        const occupied = robots.filter(r => r.id !== robot.id).map(r => r.position);
        const path = findPath(newState.map, robot.position, order.dispatchPosition, occupied);
        if (path) {
          robot.path = path;
          robot.pathIndex = 0;
          robot.state = 'moving_to_dispatch';
        } else {
          order.hadBlockedAisle = true;
          robot.state = 'blocked';
        }
      }
    } else if (robot.state === 'moving_to_dispatch' && robot.path.length > 0) {
      robot.pathIndex++;
      if (robot.pathIndex < robot.path.length) {
        const nextPos = robot.path[robot.pathIndex];
        const otherAtPos = robots.some(r => r.id !== robot.id && posEqual(r.position, nextPos) && r.collisionCooldown === 0);

        if (otherAtPos) {
          robot.pathIndex--;
          robot.state = 'blocked';
          tickEvents.push({
            tick: newState.tick,
            type: 'collision',
            details: `机器人 ${robot.name} 在 (${nextPos.x},${nextPos.y}) 与其他机器人路径相撞`,
            position: nextPos,
          });
          totalCollisions++;
          score -= SCORE_COLLISION_PENALTY;

          const order = orders.find(o => o.id === robot.currentOrderId);
          if (order) {
            order.hadCollision = true;
          }
        } else {
          robot.position = nextPos;
          robot.battery = Math.max(0, robot.battery - BATTERY_MOVE_COST);
        }
      } else {
        robot.state = 'delivering';
      }
    } else if (robot.state === 'delivering') {
      const order = orders.find(o => o.id === robot.currentOrderId);
      if (order) {
        order.status = 'completed';
        const weight = PRIORITY_WEIGHTS[order.priority] || 1;
        score += weight * SCORE_COMPLETE_MULTIPLIER;
        totalCompleted++;
        tickEvents.push({
          tick: newState.tick,
          type: 'order_complete',
          details: `订单 ${order.id} 完成 (+${weight * SCORE_COMPLETE_MULTIPLIER}分)`,
          position: robot.position,
        });
      }
      robot.state = 'idle';
      robot.currentOrderId = null;
      robot.path = [];
      robot.pathIndex = 0;
      robot.lowBatteryWarned = false;
    } else if (robot.state === 'blocked') {
      if (robot.currentOrderId) {
        const order = orders.find(o => o.id === robot.currentOrderId);
        if (order) {
          const target = order.shelfPosition;

          const occupied = robots.filter(r => r.id !== robot.id).map(r => r.position);
          let path = findPath(newState.map, robot.position, target, occupied);
          if (path) {
            robot.path = path;
            robot.pathIndex = 0;
            robot.state = 'moving_to_shelf';
            order.hadBlockedAisle = false;
          } else {
            const dispatchPath = findPath(newState.map, robot.position, order.dispatchPosition, occupied);
            if (dispatchPath) {
              robot.path = dispatchPath;
              robot.pathIndex = 0;
              robot.state = 'moving_to_dispatch';
              order.hadBlockedAisle = false;
            }
          }
        }
      } else {
        robot.state = 'idle';
      }
    }

    if (robot.battery <= 0 && robot.state !== 'charging') {
      totalDepletions++;
      score -= SCORE_DEPLETION_PENALTY;
      robot.state = 'idle';
      robot.currentOrderId = null;
      robot.path = [];
      robot.pathIndex = 0;
      tickEvents.push({
        tick: newState.tick,
        type: 'low_battery_warning',
        details: `机器人 ${robot.name} 电量耗尽`,
        position: robot.position,
      });
    }
  }

  let timeoutReasonModal: GameState['timeoutReasonModal'] = null;
  for (const order of orders) {
    if (order.status === 'in_progress') {
      order.elapsed++;
      if (order.elapsed >= order.timeLimit) {
        order.status = 'timeout';
        const robot = robots.find(r => r.currentOrderId === order.id);
        const reason = analyzeTimeoutReason(order, robot);
        order.timeoutReason = reason as any;
        totalTimeout++;
        score -= SCORE_TIMEOUT_PENALTY;

        if (robot) {
          robot.state = 'idle';
          robot.currentOrderId = null;
          robot.path = [];
          robot.pathIndex = 0;
        }

        tickEvents.push({
          tick: newState.tick,
          type: 'timeout',
          details: `订单 ${order.id} 超时 (${getTimeoutDescription(reason)})`,
          position: order.shelfPosition,
        });

        timeoutReasonModal = {
          orderId: order.id,
          reason: getTimeoutDescription(reason),
          position: order.shelfPosition,
        };
      }
    }
  }

  const allDone = orders.length > 0 && orders.every(o => o.status === 'completed' || o.status === 'timeout');
  const timeUp = newState.tick >= newState.maxTick;
  const settled = allDone || timeUp;

  const replayFrame: ReplayFrame = {
    tick: newState.tick,
    robots: robots.map(r => ({
      id: r.id,
      position: { ...r.position },
      battery: r.battery,
      state: r.state,
      currentOrderId: r.currentOrderId,
    })),
    orders: orders.map(o => ({
      id: o.id,
      status: o.status,
      elapsed: o.elapsed,
    })),
    events: tickEvents,
    score,
  };

  return {
    ...newState,
    robots,
    orders,
    events: [...newState.events, ...tickEvents],
    replayLog: [...newState.replayLog, replayFrame],
    score,
    totalCompleted,
    totalTimeout,
    totalCollisions,
    totalDepletions,
    phase: settled ? 'settled' : newState.phase,
    timeoutReasonModal,
    nextOrderTick: newState.nextOrderTick,
    orderIdCounter: newState.orderIdCounter,
  };
}

export function computeGrade(score: number): string {
  if (score >= 800) return 'S';
  if (score >= 600) return 'A';
  if (score >= 400) return 'B';
  return 'C';
}

export function diffConfigs(robotConfig: RobotConfig[], shelfConfig: ShelfConfig, map: WarehouseMap): ConfigDiff[] {
  const diffs: ConfigDiff[] = [];

  for (const rc of robotConfig) {
    const cell = map.cells[rc.startY]?.[rc.startX];
    if (cell && cell.type === 'shelf') {
      diffs.push({
        key: `${rc.name} 起始位置`,
        path: `robots.${rc.id}.start`,
        robotValue: `(${rc.startX}, ${rc.startY})`,
        shelfValue: `货架位置，不可通行`,
        resolved: null,
      });
    }
  }

  const robotPositions = robotConfig.map(r => `${r.startX},${r.startY}`);
  const shelfSet = new Set(shelfConfig.positions.map(p => `${p.x},${p.y}`));
  const blockedSet = new Set(shelfConfig.blockedAisles.map(p => `${p.x},${p.y}`));

  for (const rp of robotPositions) {
    if (shelfSet.has(rp)) {
      diffs.push({
        key: `起始点与货架重叠`,
        path: `position.${rp}`,
        robotValue: '机器人起始点',
        shelfValue: '货架位置',
        resolved: null,
      });
    }
    if (blockedSet.has(rp)) {
      diffs.push({
        key: `起始点在堵塞货道`,
        path: `position.${rp}`,
        robotValue: '机器人起始点',
        shelfValue: '堵塞货道',
        resolved: null,
      });
    }
  }

  for (const bp of shelfConfig.blockedAisles) {
    const cell = map.cells[bp.y]?.[bp.x];
    if (cell && (cell.type === 'charger' || cell.type === 'dispatch')) {
      diffs.push({
        key: `堵塞与${cell.type === 'charger' ? '充电桩' : '发货点'}重叠`,
        path: `blockedAisle.(${bp.x},${bp.y})`,
        robotValue: `${cell.type === 'charger' ? '充电桩' : '发货点'}`,
        shelfValue: '堵塞货道',
        resolved: null,
      });
    }
  }

  return diffs;
}
