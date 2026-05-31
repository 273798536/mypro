import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Scene,
  Robot,
  Order,
  Position,
  GameState,
  GameStep,
  GameRecord,
  GameResult,
  Decision,
  PathFindingRecord,
  PauseRecord,
} from '../types/game';
import { findPath, getObstaclePositions, getRobotPositions } from '../utils/pathfinding';
import {
  detectCollisions,
  checkOrderTimeouts,
  updateRobotBattery,
  calculateGameResult,
  canRobotAcceptOrder,
} from '../utils/gameLogic';
import { saveGameRecord } from '../utils/storage';
import { presetScenes } from '../data/presetScenes';

interface GameStore {
  currentScene: Scene | null;
  gameState: GameState | null;
  steps: GameStep[];
  currentStep: number;
  decisions: Decision[];
  pathFindingTriggers: PathFindingRecord[];
  pauseRecords: PauseRecord[];
  gameResult: GameResult | null;
  playerName: string;
  isPlaying: boolean;

  setPlayerName: (name: string) => void;
  selectScene: (scene: Scene) => void;
  startGame: () => void;
  pauseGame: (reason?: string) => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;

  assignOrder: (orderId: string, robotId: string) => void;
  sendToCharge: (robotId: string) => void;
  reRouteRobot: (robotId: string, targetPosition: Position) => void;
  executeStep: () => void;

  getAvailableScenes: () => Scene[];
  getCurrentGameRecord: () => GameRecord | null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentScene: null,
  gameState: null,
  steps: [],
  currentStep: 0,
  decisions: [],
  pathFindingTriggers: [],
  pauseRecords: [],
  gameResult: null,
  playerName: '玩家',
  isPlaying: false,

  setPlayerName: (name) => set({ playerName: name }),

  selectScene: (scene) =>
    set({
      currentScene: scene,
      gameState: null,
      steps: [],
      currentStep: 0,
      decisions: [],
      pathFindingTriggers: [],
      pauseRecords: [],
      gameResult: null,
      isPlaying: false,
    }),

  startGame: () => {
    const { currentScene } = get();
    if (!currentScene) return;

    const initialState: GameState = {
      robots: JSON.parse(JSON.stringify(currentScene.robots)),
      orders: JSON.parse(JSON.stringify(currentScene.orders)),
      currentTime: 0,
      maxTime: 100,
      score: 0,
      isGameOver: false,
      isPaused: false,
      isWin: false,
    };

    const initialStep: GameStep = {
      stepNumber: 0,
      timestamp: Date.now(),
      decisions: [],
      pathFindings: [],
      stateSnapshot: JSON.parse(JSON.stringify(initialState)),
    };

    set({
      gameState: initialState,
      steps: [initialStep],
      currentStep: 0,
      decisions: [],
      pathFindingTriggers: [],
      pauseRecords: [],
      gameResult: null,
      isPlaying: true,
    });
  },

  pauseGame: (reason) => {
    const { gameState, pauseRecords } = get();
    if (!gameState || gameState.isPaused) return;

    const pauseRecord: PauseRecord = {
      id: uuidv4(),
      pauseTime: Date.now(),
      reason,
    };

    set({
      gameState: { ...gameState, isPaused: true },
      pauseRecords: [...pauseRecords, pauseRecord],
    });
  },

  resumeGame: () => {
    const { gameState, pauseRecords } = get();
    if (!gameState || !gameState.isPaused) return;

    const lastPause = pauseRecords[pauseRecords.length - 1];
    if (lastPause && !lastPause.resumeTime) {
      const resumeTime = Date.now();
      const duration = Math.floor((resumeTime - lastPause.pauseTime) / 1000);
      lastPause.resumeTime = resumeTime;
      lastPause.duration = duration;
    }

    set({
      gameState: { ...gameState, isPaused: false },
      pauseRecords: [...pauseRecords],
    });
  },

  endGame: () => {
    const {
      gameState,
      steps,
      pauseRecords,
      pathFindingTriggers,
      decisions,
      currentScene,
      playerName,
    } = get();

    if (!gameState || !currentScene) return;

    const result = calculateGameResult(
      gameState.robots,
      gameState.orders,
      pauseRecords,
      pathFindingTriggers,
      decisions,
      gameState.currentTime,
      gameState.maxTime
    );

    const record: GameRecord = {
      id: uuidv4(),
      sceneId: currentScene.id,
      sceneName: currentScene.name,
      playerName,
      startTime: steps[0]?.timestamp || Date.now(),
      endTime: Date.now(),
      result,
      steps,
      pauseRecords,
      initialScene: currentScene,
    };

    saveGameRecord(record);

    set({
      gameState: { ...gameState, isGameOver: true, isWin: result.isWin },
      gameResult: result,
      isPlaying: false,
    });
  },

  resetGame: () =>
    set({
      gameState: null,
      steps: [],
      currentStep: 0,
      decisions: [],
      pathFindingTriggers: [],
      pauseRecords: [],
      gameResult: null,
      isPlaying: false,
    }),

  assignOrder: (orderId, robotId) => {
    const { gameState, decisions, pathFindingTriggers, currentScene, currentStep } = get();
    if (!gameState || !currentScene) return;

    const robot = gameState.robots.find((r) => r.id === robotId);
    const order = gameState.orders.find((o) => o.id === orderId);

    if (!robot || !order) return;
    if (!canRobotAcceptOrder(robot)) return;
    if (order.status !== 'pending') return;

    const shelf = currentScene.shelves.find((s) => s.goodsType === order.goodsType);
    if (!shelf) return;

    const obstacles = getObstaclePositions(currentScene.obstacles);
    const otherRobots = getRobotPositions(gameState.robots, robotId);
    const path = findPath(
      robot.position,
      shelf.position,
      obstacles,
      currentScene.gridWidth,
      currentScene.gridHeight,
      otherRobots
    );

    if (!path) {
      return;
    }

    const pathFindingRecord: PathFindingRecord = {
      id: uuidv4(),
      robotId,
      robotName: robot.name,
      path,
      triggerStep: currentStep,
      triggerReason: `分配订单 ${order.name}`,
      startPosition: robot.position,
      endPosition: shelf.position,
    };

    const decision: Decision = {
      id: uuidv4(),
      type: 'assign-order',
      targetId: orderId,
      targetName: order.name,
      description: `将 ${order.name} 分配给 ${robot.name}`,
      impact: `机器人将前往货架取货，预计消耗 ${path.length} 电量`,
    };

    const updatedRobots = gameState.robots.map((r) =>
      r.id === robotId
        ? {
            ...r,
            status: 'delivering' as const,
            currentOrderId: orderId,
            currentPath: path,
            pathIndex: 0,
          }
        : r
    );

    const updatedOrders = gameState.orders.map((o) =>
      o.id === orderId
        ? { ...o, status: 'assigned' as const, assignedRobotId: robotId }
        : o
    );

    set({
      gameState: {
        ...gameState,
        robots: updatedRobots,
        orders: updatedOrders,
      },
      decisions: [...decisions, decision],
      pathFindingTriggers: [...pathFindingTriggers, pathFindingRecord],
    });
  },

  sendToCharge: (robotId) => {
    const { gameState, decisions, pathFindingTriggers, currentScene, currentStep } = get();
    if (!gameState || !currentScene) return;

    const robot = gameState.robots.find((r) => r.id === robotId);
    if (!robot || robot.status === 'charging') return;

    const chargingStation = currentScene.obstacles.find((o) => o.type === 'charging');
    if (!chargingStation) return;

    const obstacles = getObstaclePositions(currentScene.obstacles.filter((o) => o.type !== 'charging'));
    const otherRobots = getRobotPositions(gameState.robots, robotId);
    const path = findPath(
      robot.position,
      chargingStation.position,
      obstacles,
      currentScene.gridWidth,
      currentScene.gridHeight,
      otherRobots
    );

    if (!path) return;

    const pathFindingRecord: PathFindingRecord = {
      id: uuidv4(),
      robotId,
      robotName: robot.name,
      path,
      triggerStep: currentStep,
      triggerReason: `前往充电`,
      startPosition: robot.position,
      endPosition: chargingStation.position,
    };

    const decision: Decision = {
      id: uuidv4(),
      type: 'charge',
      targetId: robotId,
      targetName: robot.name,
      description: `派遣 ${robot.name} 前往充电`,
      impact: `机器人将前往充电桩，电量将逐渐恢复`,
    };

    const updatedRobots = gameState.robots.map((r) =>
      r.id === robotId
        ? {
            ...r,
            status: 'moving' as const,
            currentPath: path,
            pathIndex: 0,
            currentOrderId: undefined,
          }
        : r
    );

    set({
      gameState: { ...gameState, robots: updatedRobots },
      decisions: [...decisions, decision],
      pathFindingTriggers: [...pathFindingTriggers, pathFindingRecord],
    });
  },

  reRouteRobot: (robotId, targetPosition) => {
    const { gameState, decisions, pathFindingTriggers, currentScene, currentStep } = get();
    if (!gameState || !currentScene) return;

    const robot = gameState.robots.find((r) => r.id === robotId);
    if (!robot) return;

    const obstacles = getObstaclePositions(currentScene.obstacles);
    const otherRobots = getRobotPositions(gameState.robots, robotId);
    const path = findPath(
      robot.position,
      targetPosition,
      obstacles,
      currentScene.gridWidth,
      currentScene.gridHeight,
      otherRobots
    );

    if (!path) return;

    const pathFindingRecord: PathFindingRecord = {
      id: uuidv4(),
      robotId,
      robotName: robot.name,
      path,
      triggerStep: currentStep,
      triggerReason: '重新规划路径',
      startPosition: robot.position,
      endPosition: targetPosition,
    };

    const decision: Decision = {
      id: uuidv4(),
      type: 're-route',
      targetId: robotId,
      targetName: robot.name,
      description: `重新规划 ${robot.name} 的路径`,
      impact: `机器人将前往新的目标位置`,
    };

    const updatedRobots = gameState.robots.map((r) =>
      r.id === robotId
        ? { ...r, currentPath: path, pathIndex: 0 }
        : r
    );

    set({
      gameState: { ...gameState, robots: updatedRobots },
      decisions: [...decisions, decision],
      pathFindingTriggers: [...pathFindingTriggers, pathFindingRecord],
    });
  },

  executeStep: () => {
    const { gameState, currentScene, steps, currentStep, decisions, pathFindingTriggers } = get();
    if (!gameState || !currentScene || gameState.isPaused || gameState.isGameOver) return;

    const nextPositions = new Map<string, Position>();
    let updatedRobots = [...gameState.robots];

    updatedRobots = updatedRobots.map((robot) => {
      if (robot.currentPath && robot.pathIndex !== undefined) {
        if (robot.pathIndex < robot.currentPath.length - 1) {
          const nextPos = robot.currentPath[robot.pathIndex + 1];
          nextPositions.set(robot.id, nextPos);
          return {
            ...robot,
            position: nextPos,
            pathIndex: robot.pathIndex + 1,
          };
        } else {
          if (robot.status === 'delivering') {
            return robot;
          }
          const chargingStation = currentScene.obstacles.find((o) => o.type === 'charging');
          if (
            chargingStation &&
            robot.position.x === chargingStation.position.x &&
            robot.position.y === chargingStation.position.y
          ) {
            return { ...robot, status: 'charging' as const, currentPath: undefined, pathIndex: undefined };
          }
          return { ...robot, status: 'idle' as const, currentPath: undefined, pathIndex: undefined };
        }
      }
      return robot;
    });

    const collisions = detectCollisions(updatedRobots, nextPositions);
    if (collisions.length > 0) {
      console.warn('碰撞检测:', collisions);
    }

    updatedRobots = updatedRobots.map(updateRobotBattery);

    updatedRobots = updatedRobots.map((robot) => {
      if (robot.status === 'delivering' && robot.currentOrderId && robot.currentPath && robot.pathIndex !== undefined) {
        if (robot.pathIndex >= robot.currentPath.length - 1) {
          const order = gameState.orders.find((o) => o.id === robot.currentOrderId);
          if (order) {
            return {
              ...robot,
              status: 'idle' as const,
              currentOrderId: undefined,
              currentPath: undefined,
              pathIndex: undefined,
            };
          }
        }
      }
      return robot;
    });

    let updatedOrders = gameState.orders.map((order) => {
      if (order.status === 'assigned' && order.assignedRobotId) {
        const robot = updatedRobots.find((r) => r.id === order.assignedRobotId);
        if (robot && !robot.currentOrderId) {
          return { ...order, status: 'completed' as const, completedAt: gameState.currentTime + 1 };
        }
      }
      return order;
    });

    updatedOrders = checkOrderTimeouts(updatedOrders, gameState.currentTime + 1);

    const newTime = gameState.currentTime + 1;

    const completedOrders = updatedOrders.filter((o) => o.status === 'completed');
    const timeoutOrders = updatedOrders.filter((o) => o.status === 'timeout');
    const baseScore = completedOrders.reduce((sum, o) => sum + o.reward, 0);
    const timeoutPenalty = timeoutOrders.reduce((sum, o) => sum + Math.floor(o.reward * 0.5), 0);
    const newScore = Math.max(0, baseScore - timeoutPenalty);

    const allOrdersCompleted = updatedOrders.every((o) => o.status === 'completed' || o.status === 'timeout');
    const hasTooManyTimeouts = timeoutOrders.length >= Math.ceil(updatedOrders.length * 0.5);
    const isGameOver = allOrdersCompleted || hasTooManyTimeouts || newTime >= gameState.maxTime;

    const newState: GameState = {
      ...gameState,
      robots: updatedRobots,
      orders: updatedOrders,
      currentTime: newTime,
      score: newScore,
      isGameOver,
    };

    const newStep: GameStep = {
      stepNumber: currentStep + 1,
      timestamp: Date.now(),
      decisions: [],
      pathFindings: [],
      stateSnapshot: JSON.parse(JSON.stringify(newState)),
    };

    set({
      gameState: newState,
      steps: [...steps, newStep],
      currentStep: currentStep + 1,
    });

    if (isGameOver) {
      setTimeout(() => get().endGame(), 100);
    }
  },

  getAvailableScenes: () => {
    return [...presetScenes];
  },

  getCurrentGameRecord: () => {
    const {
      currentScene,
      steps,
      pauseRecords,
      gameResult,
      playerName,
    } = get();

    if (!currentScene || !gameResult) return null;

    return {
      id: uuidv4(),
      sceneId: currentScene.id,
      sceneName: currentScene.name,
      playerName,
      startTime: steps[0]?.timestamp || Date.now(),
      endTime: Date.now(),
      result: gameResult,
      steps,
      pauseRecords,
      initialScene: currentScene,
    };
  },
}));
