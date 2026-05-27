import {
  GameState,
  PipeNode,
  PipeConnection,
  ValveState,
  LeakState,
  UserZone,
  OperationStep,
  Alert,
  WarningType,
  SceneConfig,
  Score,
  ReportItem,
  RepairReport,
} from './types';
import { calculateConnectivity, findAffectedUserZones, getValveDownstreamImpact } from './connectivity';
import { calculatePressures, PressureResult, checkLowPressureRisk } from './pressure';
import { calculateScore, ScoreBreakdown, generateFailureAnalysis } from './scoring';

export interface GameEngineResult {
  connectivity: ReturnType<typeof calculateConnectivity>;
  pressure: PressureResult;
  userZones: UserZone[];
  leaks: Map<string, LeakState>;
  score: ScoreBreakdown;
}

export function createInitialState(scene: SceneConfig): GameState {
  const valves = new Map<string, ValveState>();
  scene.initialValves.forEach((v) => {
    valves.set(v.nodeId, {
      nodeId: v.nodeId,
      isOpen: v.isOpen,
      operatedAt: 0,
      operator: 'system',
    });
  });

  const leaks = new Map<string, LeakState>();
  scene.leaks.forEach((l) => {
    leaks.set(l.nodeId, {
      nodeId: l.nodeId,
      isControlled: false,
      flowRate: l.flowRate,
    });
  });

  return {
    status: 'idle',
    startTime: null,
    endTime: null,
    currentStepIndex: -1,
    nodes: scene.nodes,
    connections: scene.connections,
    valves,
    leaks,
    userZones: scene.userZones.map((z) => ({ ...z, hasWater: true })),
    operations: [],
    alerts: [],
    score: {
      total: 0,
      leakControl: 0,
      userImpact: 0,
      operationEfficiency: 0,
      compliance: 0,
      level: 'C',
    },
    pendingOperation: null,
  };
}

export function toggleValve(
  state: GameState,
  valveId: string,
  timestamp: number
): { newState: GameState; needsConfirmation: boolean; warningType?: WarningType } {
  const valve = state.valves.get(valveId);
  if (!valve) return { newState: state, needsConfirmation: false };

  const newIsOpen = !valve.isOpen;
  const node = state.nodes.find((n) => n.id === valveId);

  let warningType: WarningType | undefined;
  let isHighRisk = false;

  if (node?.isMainValve && !newIsOpen) {
    warningType = 'main_valve';
    isHighRisk = true;
  }

  if (!warningType && !newIsOpen) {
    const currentConnectivity = calculateConnectivity(state.nodes, state.connections, state.valves);
    if (checkLowPressureRisk(valveId, state.nodes, state.connections, state.valves, state.leaks, currentConnectivity)) {
      warningType = 'low_pressure';
      isHighRisk = true;
    }
  }

  if (!warningType && !newIsOpen) {
    const impact = getValveDownstreamImpact(
      valveId,
      state.nodes,
      state.connections,
      state.valves,
      state.userZones
    );
    const alreadyAffected = state.userZones.filter((z) => !z.hasWater).map((z) => z.name);
    const duplicateZones = impact.affectedZones.filter((z) => alreadyAffected.includes(z));
    if (duplicateZones.length > 0) {
      warningType = 'duplicate_zone';
      isHighRisk = true;
    }
  }

  const operation: OperationStep = {
    id: `op-${Date.now()}`,
    timestamp,
    type: 'valve_toggle',
    valveId,
    previousState: valve.isOpen,
    newState: newIsOpen,
    isHighRisk,
    warningType,
    confirmed: !isHighRisk,
  };

  if (isHighRisk && !warningType) {
    return { newState: state, needsConfirmation: true, warningType };
  }

  if (isHighRisk && warningType) {
    return {
      newState: { ...state, pendingOperation: operation },
      needsConfirmation: true,
      warningType,
    };
  }

  return executeOperation(state, operation);
}

export function confirmOperation(state: GameState): GameState {
  if (!state.pendingOperation) return state;

  const operation = { ...state.pendingOperation, confirmed: true };
  const { newState } = executeOperation(state, operation);
  return { ...newState, pendingOperation: null };
}

export function cancelOperation(state: GameState): GameState {
  return { ...state, pendingOperation: null };
}

function executeOperation(
  state: GameState,
  operation: OperationStep
): { newState: GameState; needsConfirmation: boolean } {
  const newValves = new Map(state.valves);
  newValves.set(operation.valveId, {
    nodeId: operation.valveId,
    isOpen: operation.newState,
    operatedAt: operation.timestamp,
    operator: 'player',
  });

  const connectivity = calculateConnectivity(state.nodes, state.connections, newValves);
  const newUserZones = findAffectedUserZones(connectivity, state.userZones);

  const newLeaks = new Map(state.leaks);
  state.leaks.forEach((leak, leakId) => {
    const isIsolated = connectivity.isolatedNodes.has(leakId);
    newLeaks.set(leakId, { ...leak, isControlled: isIsolated });
  });

  const pressure = calculatePressures(
    state.nodes,
    state.connections,
    newValves,
    newLeaks,
    connectivity
  );

  const newAlerts: Alert[] = [...state.alerts];
  if (operation.warningType) {
    newAlerts.push({
      id: `alert-${Date.now()}`,
      timestamp: operation.timestamp,
      type: operation.warningType,
      message: getAlertMessage(operation.warningType, operation.valveId, state.nodes),
      valveId: operation.valveId,
      acknowledged: false,
    });
  }

  const newOperations = [...state.operations, operation];

  const nodesWithPressure = state.nodes.map((node) => ({
    ...node,
    pressure: pressure.nodePressures.get(node.id) ?? 0,
  }));

  return {
    newState: {
      ...state,
      nodes: nodesWithPressure,
      valves: newValves,
      leaks: newLeaks,
      userZones: newUserZones,
      operations: newOperations,
      alerts: newAlerts,
      currentStepIndex: newOperations.length - 1,
    },
    needsConfirmation: false,
  };
}

function getAlertMessage(type: WarningType, valveId: string, nodes: PipeNode[]): string {
  const node = nodes.find((n) => n.id === valveId);
  const valveName = node?.name ?? valveId;

  switch (type) {
    case 'main_valve':
      return `主阀 ${valveName} 已关闭，所有下游区域停水`;
    case 'low_pressure':
      return `关阀 ${valveName} 导致管网压力过低`;
    case 'duplicate_zone':
      return `关阀 ${valveName} 影响已停水区域`;
    default:
      return `操作阀门 ${valveName}`;
  }
}

export function calculateGameState(state: GameState, scene: SceneConfig): GameEngineResult {
  const connectivity = calculateConnectivity(state.nodes, state.connections, state.valves);
  const pressure = calculatePressures(
    state.nodes,
    state.connections,
    state.valves,
    state.leaks,
    connectivity
  );
  const userZones = findAffectedUserZones(connectivity, state.userZones);

  const leaks = new Map(state.leaks);
  state.leaks.forEach((leak, leakId) => {
    const isIsolated = connectivity.isolatedNodes.has(leakId);
    leaks.set(leakId, { ...leak, isControlled: isIsolated });
  });

  const duration = state.startTime && state.endTime
    ? (state.endTime - state.startTime) / 1000
    : 0;

  const score = calculateScore(leaks, userZones, state.operations, duration, scene.targetTime);

  return {
    connectivity,
    pressure,
    userZones,
    leaks,
    score,
  };
}

export function finishGame(state: GameState, endTime: number): GameState {
  return {
    ...state,
    status: 'finished',
    endTime,
  };
}

export function startGame(state: GameState, startTime: number): GameState {
  return {
    ...state,
    status: 'playing',
    startTime,
  };
}

export function resetGame(scene: SceneConfig): GameState {
  return createInitialState(scene);
}

export function generateReport(
  state: GameState,
  scene: SceneConfig,
  scoreBreakdown: ScoreBreakdown
): RepairReport {
  const duration = state.startTime && state.endTime
    ? Math.round((state.endTime - state.startTime) / 1000)
    : 0;

  const unhandled: ReportItem[] = [];
  const corrected: ReportItem[] = [];
  const needConfirmation: ReportItem[] = [];

  state.leaks.forEach((leak, leakId) => {
    const node = state.nodes.find((n) => n.id === leakId);
    if (!leak.isControlled) {
      unhandled.push({
        id: `unhandled-leak-${leakId}`,
        type: 'leak',
        description: `漏点 ${node?.name ?? leakId} 未控制`,
        source: '管网监测系统',
        timestamp: state.startTime ?? Date.now(),
      });
    } else {
      corrected.push({
        id: `corrected-leak-${leakId}`,
        type: 'leak',
        description: `漏点 ${node?.name ?? leakId} 已控制`,
        source: '管网监测系统',
        timestamp: state.startTime ?? Date.now(),
      });
    }
  });

  state.userZones.forEach((zone) => {
    if (!zone.hasWater) {
      unhandled.push({
        id: `unhandled-zone-${zone.id}`,
        type: 'user_zone',
        description: `用户区 ${zone.name} (${zone.population}人) 停水`,
        source: '用户服务系统',
        timestamp: state.startTime ?? Date.now(),
      });
    }
  });

  state.operations.forEach((op, index) => {
    const node = state.nodes.find((n) => n.id === op.valveId);
    const action = op.newState ? '开启' : '关闭';
    const item: ReportItem = {
      id: `op-${op.id}`,
      type: 'valve_operation',
      description: `${action}阀门 ${node?.name ?? op.valveId}`,
      source: '操作员操作记录',
      timestamp: op.timestamp,
      stepIndex: index,
    };

    if (op.isHighRisk && !op.confirmed) {
      needConfirmation.push(item);
    } else if (op.warningType) {
      needConfirmation.push({
        ...item,
        description: `${item.description} [${op.warningType}警告]`,
      });
    } else {
      corrected.push(item);
    }
  });

  state.alerts.forEach((alert) => {
    if (!alert.acknowledged) {
      needConfirmation.push({
        id: `alert-${alert.id}`,
        type: 'alert',
        description: alert.message,
        source: '安全监测系统',
        timestamp: alert.timestamp,
      });
    }
  });

  const failureAnalysis = generateFailureAnalysis(scoreBreakdown, state.operations);

  return {
    gameId: `game-${Date.now()}`,
    generatedAt: Date.now(),
    duration,
    totalScore: scoreBreakdown.score,
    unhandled,
    corrected,
    needConfirmation,
    operationTrail: state.operations,
    failureAnalysis,
  };
}

export function getStateAtStep(
  state: GameState,
  stepIndex: number,
  scene: SceneConfig
): GameState {
  if (stepIndex < 0 || stepIndex >= state.operations.length) {
    return state;
  }

  let tempState = createInitialState(scene);
  tempState.startTime = state.startTime;

  for (let i = 0; i <= stepIndex; i++) {
    const op = state.operations[i];
    const { newState } = executeOperation(tempState, op);
    tempState = newState;
  }

  return tempState;
}
