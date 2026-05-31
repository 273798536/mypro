import {
  GameState,
  Node,
  Wire,
  Operation,
  Anomaly,
  LogicChain,
  ToolType,
  GameStatus,
} from '../types';
import {
  calculatePowerFlow,
  checkWinCondition,
  checkLoseCondition,
  checkConnectivity,
} from './circuitAnalyzer';
import { runAllDetectors, detectInvalidConnection, resolveAnomaly } from './anomalyDetector';
import { createSnapshot, addTriggerPoint, generateCauseEffectChain, saveGameToStorage } from './replayRecorder';
import { createInitialState } from '../data/initialNodes';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function createInitialGameState(): GameState {
  return {
    id: generateId(),
    status: 'playing',
    currentStage: 1,
    nodes: createInitialState(),
    wires: [],
    operations: [],
    anomalies: [],
    logicChains: [],
    unlockedTools: ['power_station'],
    selectedTool: null,
    selectedNode: null,
    score: 0,
    timeRemaining: 300,
    snapshots: [],
    triggerPoints: [],
  };
}

export function placePowerStation(state: GameState, nodeId: string): GameState {
  const stepNumber = state.operations.length + 1;
  const node = state.nodes.find(n => n.id === nodeId);

  if (!node || node.isPowerSource) return state;

  const updatedNodes = state.nodes.map(n =>
    n.id === nodeId ? { ...n, isPowerSource: true, type: 'power_station' as const, powered: true } : n
  );

  const { nodes: poweredNodes, wires: poweredWires } = calculatePowerFlow(updatedNodes, state.wires);

  const operation: Operation = {
    id: generateId(),
    stepNumber,
    type: 'place_power',
    source: '工具箱: 电源站',
    judgment: `${node.label}是${node.type === 'substation' ? '变电站' : '核心节点'}，适合放置电源`,
    result: `电源站已放置在${node.label}`,
    timestamp: Date.now(),
    nodeIds: [nodeId],
  };

  const logicChain: LogicChain = {
    id: generateId(),
    operationId: operation.id,
    sourceElement: { type: 'node', id: nodeId },
    judgment: '电源站→变电站',
    resultElement: { type: 'node', id: nodeId },
    color: '#F59E0B',
  };

  const newAnomalies = runAllDetectors(poweredNodes, poweredWires, stepNumber);
  const allAnomalies = [...state.anomalies, ...newAnomalies];

  const powerSources = poweredNodes.filter(n => n.isPowerSource);
  const hasMultiplePower = powerSources.length >= 1;
  const shouldUnlockWire = hasMultiplePower || powerSources.length >= 1;

  const newUnlockedTools = [...state.unlockedTools];
  if (shouldUnlockWire && !newUnlockedTools.includes('wire')) {
    newUnlockedTools.push('wire');
  }

  let triggerPoints = state.triggerPoints;
  if (newAnomalies.length > 0) {
    newAnomalies.forEach(a => {
      triggerPoints = addTriggerPoint(
        triggerPoints,
        stepNumber,
        'anomaly',
        a.description
      );
    });
  }

  let newStatus: GameStatus = state.status;
  if (checkWinCondition(poweredNodes, poweredWires)) {
    newStatus = 'won';
    triggerPoints = addTriggerPoint(triggerPoints, stepNumber, 'win', '所有用户区已通电，游戏胜利！');
    operation.isTriggerPoint = true;
  }
  if (checkLoseCondition(allAnomalies)) {
    newStatus = 'lost';
    triggerPoints = addTriggerPoint(triggerPoints, stepNumber, 'lose', '检测到严重异常，游戏失败！');
  }

  const newState: GameState = {
    ...state,
    nodes: poweredNodes,
    wires: poweredWires,
    operations: [...state.operations, operation],
    anomalies: allAnomalies,
    logicChains: [...state.logicChains, logicChain],
    unlockedTools: newUnlockedTools,
    selectedTool: null,
    selectedNode: null,
    score: state.score + 100,
    currentStage: shouldUnlockWire ? 2 : state.currentStage,
    snapshots: [...state.snapshots, createSnapshot(state, stepNumber)],
    triggerPoints,
    status: newStatus,
  };

  if (newStatus !== 'playing') {
    newState.causeEffectChain = generateCauseEffectChain(newState.operations, newState.anomalies, newStatus);
    saveGameToStorage(newState);
  }

  return newState;
}

export function placeWire(state: GameState, fromNodeId: string, toNodeId: string): GameState {
  const stepNumber = state.operations.length + 1;
  const fromNode = state.nodes.find(n => n.id === fromNodeId);
  const toNode = state.nodes.find(n => n.id === toNodeId);

  if (!fromNode || !toNode) return state;

  const invalidConn = detectInvalidConnection(fromNode, toNode, state.wires);
  if (invalidConn) {
    invalidConn.stepNumber = stepNumber;
    return {
      ...state,
      anomalies: [...state.anomalies, invalidConn],
      selectedTool: null,
      selectedNode: null,
    };
  }

  const existingWire = state.wires.find(
    w =>
      (w.fromNodeId === fromNodeId && w.toNodeId === toNodeId) ||
      (w.fromNodeId === toNodeId && w.toNodeId === fromNodeId)
  );

  if (existingWire) return state;

  const poweredNodesBefore = checkConnectivity(state.nodes, state.wires);
  const fromPowered = poweredNodesBefore.has(fromNodeId);
  const toPowered = poweredNodesBefore.has(toNodeId);

  const newWire: Wire = {
    id: `wire-${generateId()}`,
    fromNodeId,
    toNodeId,
    active: true,
    hasCurrent: false,
    resistance: 1,
    isParallel: fromPowered && toPowered,
  };

  const newWires = [...state.wires, newWire];
  const { nodes: poweredNodes, wires: poweredWires } = calculatePowerFlow(state.nodes, newWires);

  const poweredNodesAfter = checkConnectivity(poweredNodes, poweredWires);
  const consumerNodes = poweredNodes.filter(n => n.type === 'consumer');
  const newlyPowered = consumerNodes.filter(n => poweredNodesAfter.has(n.id) && !poweredNodesBefore.has(n.id));

  let judgment = '';
  let result = '';
  let source = '';

  if (fromPowered && !toPowered) {
    source = `节点${fromNode.label}已通电`;
    judgment = `${fromNode.label}→${toNode.label}是串联路径，应该先连接`;
    result = `导线${fromNode.label}-${toNode.label}已连接，${toNode.label}获得电力`;
  } else if (!fromPowered && toPowered) {
    source = `节点${toNode.label}已通电`;
    judgment = `${toNode.label}→${fromNode.label}是串联路径，应该先连接`;
    result = `导线${toNode.label}-${fromNode.label}已连接，${fromNode.label}获得电力`;
  } else if (fromPowered && toPowered) {
    source = `两条独立线路已建立`;
    judgment = `${fromNode.label}→${toNode.label}形成并联，提高整体可靠性`;
    result = `导线${fromNode.label}-${toNode.label}已连接，形成并联电路`;
    newWire.isParallel = true;
  } else {
    source = '尝试连接';
    judgment = `连接${fromNode.label}→${toNode.label}`;
    result = `导线已连接，但两端暂无电力`;
  }

  if (newlyPowered.length > 0) {
    result += `，${newlyPowered.map(n => n.label).join('、')}获得电力`;
  }

  const operation: Operation = {
    id: generateId(),
    stepNumber,
    type: 'place_wire',
    source,
    judgment,
    result,
    timestamp: Date.now(),
    nodeIds: [fromNodeId, toNodeId],
    wireId: newWire.id,
  };

  const logicChain: LogicChain = {
    id: generateId(),
    operationId: operation.id,
    sourceElement: { type: 'node', id: fromNodeId },
    judgment,
    resultElement: { type: 'node', id: toNodeId },
    color: newWire.isParallel ? '#8B5CF6' : '#F59E0B',
  };

  const newAnomalies = runAllDetectors(poweredNodes, poweredWires, stepNumber);
  const allAnomalies = [...state.anomalies, ...newAnomalies];

  const hasAnomalies = allAnomalies.filter(a => !a.resolved && a.severity !== 'warning').length > 0;
  const newUnlockedTools = [...state.unlockedTools];
  if (hasAnomalies && !newUnlockedTools.includes('repair_team')) {
    newUnlockedTools.push('repair_team');
  }

  let triggerPoints = state.triggerPoints;

  if (newAnomalies.length > 0) {
    newAnomalies.forEach(a => {
      triggerPoints = addTriggerPoint(
        triggerPoints,
        stepNumber,
        'anomaly',
        a.description
      );
      if (a.type === 'path_blockage') {
        operation.isTriggerPoint = true;
        const blockedNodes = poweredNodes.map(n =>
          newAnomalies.some(anomaly => anomaly.relatedNodeIds.includes(n.id))
            ? { ...n, status: 'blocked' as const }
            : n
        );
        Object.assign(poweredNodes, blockedNodes);
      }
    });
  }

  const winCondition = checkWinCondition(poweredNodes, poweredWires);
  let newStatus: GameStatus = state.status;

  if (winCondition) {
    newStatus = 'won';
    triggerPoints = addTriggerPoint(triggerPoints, stepNumber, 'win', '所有用户区已通电，游戏胜利！');
    operation.isTriggerPoint = true;
  }
  if (checkLoseCondition(allAnomalies)) {
    newStatus = 'lost';
    triggerPoints = addTriggerPoint(triggerPoints, stepNumber, 'lose', '检测到严重异常，游戏失败！');
  }

  const scoreGained = newWire.isParallel ? 150 : 100;

  const newState: GameState = {
    ...state,
    nodes: poweredNodes,
    wires: poweredWires,
    operations: [...state.operations, operation],
    anomalies: allAnomalies,
    logicChains: [...state.logicChains, logicChain],
    unlockedTools: newUnlockedTools,
    selectedTool: null,
    selectedNode: null,
    score: state.score + scoreGained,
    currentStage: hasAnomalies ? 3 : state.currentStage,
    snapshots: [...state.snapshots, createSnapshot(state, stepNumber)],
    triggerPoints,
    status: newStatus,
  };

  if (newStatus !== 'playing') {
    newState.causeEffectChain = generateCauseEffectChain(newState.operations, newState.anomalies, newStatus);
    saveGameToStorage(newState);
  }

  return newState;
}

export function repairAnomaly(state: GameState, anomalyId: string): GameState {
  const stepNumber = state.operations.length + 1;
  const anomaly = state.anomalies.find(a => a.id === anomalyId);

  if (!anomaly || anomaly.resolved) return state;

  let updatedWires = state.wires;
  let updatedNodes = state.nodes;

  if (anomaly.relatedWireIds.length > 0) {
    updatedWires = state.wires.map(w =>
      anomaly.relatedWireIds.includes(w.id) ? { ...w, active: false } : w
    );
  }

  if (anomaly.relatedNodeIds.length > 0) {
    updatedNodes = state.nodes.map(n =>
      anomaly.relatedNodeIds.includes(n.id) && n.status === 'blocked'
        ? { ...n, status: 'normal' as const }
        : n
    );
  }

  const { nodes: poweredNodes, wires: poweredWires } = calculatePowerFlow(updatedNodes, updatedWires);
  const resolvedAnomalies = resolveAnomaly(state.anomalies, anomalyId, stepNumber);

  const operation: Operation = {
    id: generateId(),
    stepNumber,
    type: 'place_repair',
    source: `异常清单: ${anomaly.type}`,
    judgment: `需要修复${anomaly.description}`,
    result: `维修队已修复故障，${anomaly.relatedWireIds.length > 0 ? '问题导线已移除' : '节点已恢复'}`,
    timestamp: Date.now(),
    nodeIds: anomaly.relatedNodeIds,
    wireId: anomaly.relatedWireIds[0],
  };

  const logicChain: LogicChain = {
    id: generateId(),
    operationId: operation.id,
    sourceElement: { type: 'wire', id: anomaly.relatedWireIds[0] || anomaly.relatedNodeIds[0] },
    judgment: '维修队→故障点',
    resultElement: { type: 'node', id: anomaly.relatedNodeIds[0] },
    color: '#8B5CF6',
  };

  const newAnomalies = runAllDetectors(poweredNodes, poweredWires, stepNumber);
  const allAnomalies = [...resolvedAnomalies, ...newAnomalies];

  let triggerPoints = state.triggerPoints;
  if (newAnomalies.length > 0) {
    newAnomalies.forEach(a => {
      triggerPoints = addTriggerPoint(
        triggerPoints,
        stepNumber,
        'anomaly',
        a.description
      );
    });
  }

  let newStatus: GameStatus = state.status;
  if (checkWinCondition(poweredNodes, poweredWires)) {
    newStatus = 'won';
    triggerPoints = addTriggerPoint(triggerPoints, stepNumber, 'win', '所有用户区已通电，游戏胜利！');
  }

  const newState: GameState = {
    ...state,
    nodes: poweredNodes,
    wires: poweredWires,
    operations: [...state.operations, operation],
    anomalies: allAnomalies,
    logicChains: [...state.logicChains, logicChain],
    selectedTool: null,
    selectedNode: null,
    score: state.score + 200,
    snapshots: [...state.snapshots, createSnapshot(state, stepNumber)],
    triggerPoints,
    status: newStatus,
  };

  if (newStatus !== 'playing') {
    newState.causeEffectChain = generateCauseEffectChain(newState.operations, newState.anomalies, newStatus);
    saveGameToStorage(newState);
  }

  return newState;
}

export function selectTool(state: GameState, tool: ToolType | null): GameState {
  return {
    ...state,
    selectedTool: tool,
    selectedNode: null,
  };
}

export function selectNode(state: GameState, nodeId: string | null): GameState {
  return {
    ...state,
    selectedNode: nodeId,
  };
}

export function resetGame(): GameState {
  return createInitialGameState();
}

export function getUsedTools(operations: Operation[]): Set<ToolType> {
  const used = new Set<ToolType>();
  operations.forEach(op => {
    if (op.type === 'place_power') used.add('power_station');
    if (op.type === 'place_wire') used.add('wire');
    if (op.type === 'place_repair') used.add('repair_team');
  });
  return used;
}
