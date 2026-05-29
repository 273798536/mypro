import { create } from 'zustand';
import type {
  GameState,
  GameLevel,
  Robot,
  Order,
  Shelf,
  Charger,
  Obstacle,
  Anomaly,
  Position,
  OrderPriority,
} from '../types';
import { LEVEL_CONFIGS, ITEM_NAMES, SHELF_NAMES } from '../data/levels';
import { generateId, createScoreItem, calculateOrderReward } from '../utils/scoring';
import { findPath, findNearestCharger } from '../utils/pathfinding';
import { findCollisions } from '../utils/collision';

interface GameStore extends GameState {
  initGame: (level: GameLevel) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  setSpeed: (speed: number) => void;
  selectRobot: (robotId: string | null) => void;
  assignOrderToRobot: (orderId: string, robotId: string) => void;
  sendRobotToCharge: (robotId: string) => void;
  tick: (deltaTime: number) => void;
  addOrder: () => void;
  clearGame: () => void;
}

const initialState: GameState = {
  id: '',
  level: 'easy',
  status: 'ready',
  startTime: 0,
  endTime: 0,
  elapsedTime: 0,
  totalScore: 0,
  speed: 1,
  robots: [],
  orders: [],
  shelves: [],
  chargers: [],
  obstacles: [],
  anomalies: [],
  scoreHistory: [],
  replayData: [],
  selectedRobotId: null,
  gridSize: 10,
  ordersGenerated: 0,
};

function generateRandomPosition(
  gridSize: number,
  occupied: Position[]
): Position {
  let pos: Position;
  let attempts = 0;
  do {
    pos = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
    attempts++;
  } while (
    attempts < 100 &&
    occupied.some(p => p.x === pos.x && p.y === pos.y)
  );
  return pos;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  initGame: (level: GameLevel) => {
    const config = LEVEL_CONFIGS[level];
    const occupiedPositions: Position[] = [];

    const shelves: Shelf[] = [];
    for (let i = 0; i < config.shelfCount; i++) {
      const pos = generateRandomPosition(config.gridSize, occupiedPositions);
      occupiedPositions.push(pos);
      shelves.push({
        id: `shelf-${i}`,
        position: pos,
        name: SHELF_NAMES[i % SHELF_NAMES.length],
      });
    }

    const chargers: Charger[] = [];
    for (let i = 0; i < config.chargerCount; i++) {
      const pos = generateRandomPosition(config.gridSize, occupiedPositions);
      occupiedPositions.push(pos);
      chargers.push({
        id: `charger-${i}`,
        position: pos,
        chargeRate: config.chargeRate,
      });
    }

    const obstacles: Obstacle[] = [];
    for (let i = 0; i < config.obstacleCount; i++) {
      const pos = generateRandomPosition(config.gridSize, occupiedPositions);
      occupiedPositions.push(pos);
      const types: Obstacle['type'][] = ['wall', 'equipment', 'danger'];
      obstacles.push({
        id: `obstacle-${i}`,
        position: pos,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }

    const robots: Robot[] = [];
    for (let i = 0; i < config.robotCount; i++) {
      const pos = generateRandomPosition(config.gridSize, occupiedPositions);
      occupiedPositions.push(pos);
      robots.push({
        id: `robot-${i}`,
        name: `机器人 ${i + 1}`,
        position: pos,
        battery: config.initialBattery,
        status: 'idle',
        currentOrderId: null,
        path: [],
        targetPosition: null,
      });
    }

    const orders: Order[] = [];

    set({
      id: generateId(),
      level,
      status: 'ready',
      startTime: 0,
      endTime: 0,
      elapsedTime: 0,
      totalScore: 0,
      speed: 1,
      robots,
      orders,
      shelves,
      chargers,
      obstacles,
      anomalies: [],
      scoreHistory: [],
      replayData: [],
      selectedRobotId: null,
      gridSize: config.gridSize,
      ordersGenerated: 0,
    });
  },

  startGame: () => {
    set({ status: 'playing', startTime: Date.now() });
  },

  pauseGame: () => {
    set({ status: 'paused' });
  },

  resumeGame: () => {
    set({ status: 'playing' });
  },

  resetGame: () => {
    const { level } = get();
    get().initGame(level);
  },

  setSpeed: (speed: number) => {
    set({ speed });
  },

  selectRobot: (robotId: string | null) => {
    set({ selectedRobotId: robotId });
  },

  assignOrderToRobot: (orderId: string, robotId: string) => {
    const state = get();
    const robot = state.robots.find(r => r.id === robotId);
    const order = state.orders.find(o => o.id === orderId);

    if (!robot || !order) return;
    if (robot.status !== 'idle') return;
    if (order.status !== 'pending') return;

    if (robot.battery < 20) {
      const anomaly: Anomaly = {
        id: generateId(),
        type: 'low_battery',
        timestamp: Date.now(),
        robotId: robot.id,
        orderId: order.id,
        message: `${robot.name}电量过低(${robot.battery.toFixed(0)}%)，无法接单`,
        penalty: LEVEL_CONFIGS[state.level].lowBatteryPenalty,
      };
      set(state => ({
        anomalies: [...state.anomalies, anomaly],
        totalScore: state.totalScore - anomaly.penalty,
        scoreHistory: [
          ...state.scoreHistory,
          createScoreItem('penalty', anomaly.message, -anomaly.penalty, robot.id),
        ],
      }));
      return;
    }

    const shelf = state.shelves.find(s => s.id === order.shelfId);
    if (!shelf) return;

    const path = findPath(
      robot.position,
      shelf.position,
      state.obstacles,
      state.gridSize
    );

    if (path.length === 0) {
      return;
    }

    set(state => ({
      robots: state.robots.map(r =>
        r.id === robotId
          ? { ...r, status: 'moving', currentOrderId: orderId, path, targetPosition: shelf.position }
          : r
      ),
      orders: state.orders.map(o =>
        o.id === orderId ? { ...o, status: 'assigned' } : o
      ),
    }));
  },

  sendRobotToCharge: (robotId: string) => {
    const state = get();
    const robot = state.robots.find(r => r.id === robotId);
    if (!robot || (robot.status !== 'idle' && robot.status !== 'low_battery')) return;

    const nearestChargerPos = findNearestCharger(robot.position, state.chargers);
    if (!nearestChargerPos) return;

    const path = findPath(
      robot.position,
      nearestChargerPos,
      state.obstacles,
      state.gridSize
    );

    if (path.length === 0) return;

    set(state => ({
      robots: state.robots.map(r =>
        r.id === robotId
          ? { ...r, status: 'moving', currentOrderId: null, path, targetPosition: nearestChargerPos }
          : r
      ),
    }));
  },

  tick: (deltaTime: number) => {
    const state = get();
    if (state.status !== 'playing') return;

    const config = LEVEL_CONFIGS[state.level];
    const newRobots = [...state.robots];
    const newOrders = [...state.orders];
    let newScore = state.totalScore;
    const newAnomalies = [...state.anomalies];
    const newScoreHistory = [...state.scoreHistory];
    const nextPositions = new Map<string, Position>();

    for (let i = 0; i < newRobots.length; i++) {
      const robot = newRobots[i];
      if (robot.status === 'moving' && robot.path.length > 1) {
        const nextPos = robot.path[1];
        nextPositions.set(robot.id, nextPos);
      }
    }

    const collisions = findCollisions(newRobots, nextPositions);
    for (const collision of collisions) {
      const [id1, id2] = collision;
      const r1 = newRobots.find(r => r.id === id1);
      const r2 = newRobots.find(r => r.id === id2);
      if (r1 && r2) {
        const anomaly: Anomaly = {
          id: generateId(),
          type: 'collision',
          timestamp: Date.now(),
          robotId: id1,
          message: `${r1.name}与${r2.name}发生碰撞风险，已暂停移动`,
          penalty: config.collisionPenalty,
        };
        newAnomalies.push(anomaly);
        newScore -= anomaly.penalty;
        newScoreHistory.push(
          createScoreItem('penalty', anomaly.message, -anomaly.penalty, `${id1}-${id2}`)
        );

        const idx1 = newRobots.findIndex(r => r.id === id1);
        const idx2 = newRobots.findIndex(r => r.id === id2);
        if (idx1 !== -1) {
          newRobots[idx1] = { ...newRobots[idx1], status: 'blocked', path: [] };
        }
        if (idx2 !== -1) {
          newRobots[idx2] = { ...newRobots[idx2], status: 'blocked', path: [] };
        }
      }
    }

    for (let i = 0; i < newRobots.length; i++) {
      const robot = newRobots[i];

      if (robot.status === 'blocked') {
        newRobots[i] = { ...robot, status: 'idle', targetPosition: null };
        continue;
      }

      if (robot.status === 'charging') {
        const charger = state.chargers.find(
          c => c.position.x === robot.position.x && c.position.y === robot.position.y
        );
        if (charger && robot.battery < 100) {
          const newBattery = Math.min(100, robot.battery + charger.chargeRate * deltaTime);
          newRobots[i] = { ...robot, battery: newBattery };
          if (newBattery >= 100) {
            newRobots[i] = { ...newRobots[i], status: 'idle', targetPosition: null };
          }
        }
        continue;
      }

      if (robot.status === 'moving' && robot.path.length > 0) {
        const nextPos = robot.path[1];
        const willCollide = newRobots.some(
          (r, idx) => idx !== i && r.position.x === nextPos.x && r.position.y === nextPos.y
        );

        if (willCollide) {
          newRobots[i] = { ...robot, status: 'blocked', path: [] };
          continue;
        }

        const newPath = robot.path.slice(1);
        const newBattery = Math.max(0, robot.battery - config.batteryDrainRate);

        if (newPath.length === 1) {
          const targetPos = robot.targetPosition;
          if (targetPos) {
            const isCharger = state.chargers.some(
              c => c.position.x === targetPos.x && c.position.y === targetPos.y
            );

            if (isCharger) {
              newRobots[i] = {
                ...robot,
                position: targetPos,
                path: [],
                battery: newBattery,
                status: 'charging',
              };
            } else {
              const orderIdx = newOrders.findIndex(o => o.id === robot.currentOrderId);
              if (orderIdx !== -1 && newOrders[orderIdx].status === 'assigned') {
                const order = newOrders[orderIdx];
                const { base, efficiency } = calculateOrderReward(
                  order.priority,
                  order.remainingTime,
                  order.timeLimit,
                  config
                );
                newScore += base + efficiency;

                newScoreHistory.push(
                  createScoreItem(
                    'order_complete',
                    `完成订单 ${order.id} - ${order.itemName}`,
                    base,
                    order.id
                  )
                );
                if (efficiency > 0) {
                  newScoreHistory.push(
                    createScoreItem(
                      'efficiency',
                      `效率奖励 - 提前${(order.timeLimit - order.remainingTime).toFixed(0)}秒完成`,
                      efficiency,
                      order.id
                    )
                  );
                }

                newOrders[orderIdx] = { ...order, status: 'completed' };
              }
              newRobots[i] = {
                ...robot,
                position: targetPos,
                path: [],
                targetPosition: null,
                battery: newBattery,
                status: newBattery < 20 ? 'low_battery' : 'idle',
                currentOrderId: null,
              };
            }
          }
        } else {
          newRobots[i] = {
            ...robot,
            position: nextPos,
            path: newPath,
            battery: newBattery,
            status: newBattery < 20 ? 'low_battery' : 'moving',
          };
        }
      }
    }

    for (let i = 0; i < newOrders.length; i++) {
      const order = newOrders[i];
      if (order.status === 'pending' || order.status === 'assigned') {
        const newTime = order.remainingTime - deltaTime;
        if (newTime <= 0) {
          newOrders[i] = { ...order, remainingTime: 0, status: 'timeout' };
          const anomaly: Anomaly = {
            id: generateId(),
            type: 'timeout',
            timestamp: Date.now(),
            orderId: order.id,
            message: `订单 ${order.id}(${order.itemName})超时`,
            penalty: config.timeoutPenalty,
          };
          newAnomalies.push(anomaly);
          newScore -= anomaly.penalty;
          newScoreHistory.push(
            createScoreItem('penalty', anomaly.message, -anomaly.penalty, order.id)
          );

          const robotIdx = newRobots.findIndex(r => r.currentOrderId === order.id);
          if (robotIdx !== -1) {
            newRobots[robotIdx] = {
              ...newRobots[robotIdx],
              status: 'idle',
              currentOrderId: null,
              path: [],
              targetPosition: null,
            };
          }
        } else {
          newOrders[i] = { ...order, remainingTime: newTime };
        }
      }
    }

    const allOrdersGenerated = state.ordersGenerated >= config.orderCount;
    const allOrdersTerminal = newOrders.every(
      o => o.status === 'completed' || o.status === 'timeout'
    );

    let newStatus: GameState['status'] = state.status;
    let newEndTime = state.endTime;

    if (allOrdersGenerated && newOrders.length > 0 && allOrdersTerminal) {
      newStatus = 'finished';
      newEndTime = Date.now();
    }

    const replayFrame = {
      timestamp: Date.now(),
      robots: JSON.parse(JSON.stringify(newRobots)),
      orders: JSON.parse(JSON.stringify(newOrders)),
    };

    set({
      robots: newRobots,
      orders: newOrders,
      totalScore: newScore,
      anomalies: newAnomalies,
      scoreHistory: newScoreHistory,
      elapsedTime: state.elapsedTime + deltaTime,
      status: newStatus,
      endTime: newEndTime,
      replayData: [...state.replayData, replayFrame],
    });
  },

  addOrder: () => {
    const state = get();
    const config = LEVEL_CONFIGS[state.level];

    if (state.ordersGenerated >= config.orderCount) return;

    const priorities: OrderPriority[] = ['high', 'medium', 'low'];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const shelf = state.shelves[Math.floor(Math.random() * state.shelves.length)];
    const itemName = ITEM_NAMES[Math.floor(Math.random() * ITEM_NAMES.length)];

    const order: Order = {
      id: `order-${generateId()}`,
      shelfId: shelf.id,
      priority,
      status: 'pending',
      timeLimit: config.orderTimeLimit[priority],
      remainingTime: config.orderTimeLimit[priority],
      createdAt: Date.now(),
      reward: config.orderReward[priority],
      itemName,
    };

    set(state => ({
      orders: [...state.orders, order],
      ordersGenerated: state.ordersGenerated + 1,
    }));
  },

  clearGame: () => {
    set(initialState);
  },
}));

export function saveGameRecord(gameState: GameState) {
  const records = JSON.parse(localStorage.getItem('warehouse_game_records') || '[]');
  const record = {
    id: gameState.id,
    level: gameState.level,
    totalScore: gameState.totalScore,
    completedOrders: gameState.orders.filter(o => o.status === 'completed').length,
    totalOrders: gameState.orders.length,
    anomalies: gameState.anomalies.length,
    startTime: gameState.startTime,
    endTime: gameState.endTime,
    duration: gameState.elapsedTime,
  };
  records.unshift(record);
  localStorage.setItem('warehouse_game_records', JSON.stringify(records.slice(0, 50)));

  const replays = JSON.parse(localStorage.getItem('warehouse_game_replays') || '{}');
  replays[gameState.id] = {
    state: gameState,
    replayData: gameState.replayData,
  };
  localStorage.setItem('warehouse_game_replays', JSON.stringify(replays));
}

export function getGameRecords() {
  return JSON.parse(localStorage.getItem('warehouse_game_records') || '[]');
}

export function getGameReplay(gameId: string) {
  const replays = JSON.parse(localStorage.getItem('warehouse_game_replays') || '{}');
  return replays[gameId] || null;
}
