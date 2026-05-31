import { GameState, GameStateSnapshot, TriggerPoint, CauseEffectNode, Operation, Anomaly } from '../types';

export function createSnapshot(state: GameState, stepNumber: number): GameStateSnapshot {
  return {
    stepNumber,
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    wires: JSON.parse(JSON.stringify(state.wires)),
    anomalies: JSON.parse(JSON.stringify(state.anomalies)),
    timestamp: Date.now(),
  };
}

export function restoreFromSnapshot(state: GameState, snapshot: GameStateSnapshot): GameState {
  return {
    ...state,
    nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
    wires: JSON.parse(JSON.stringify(snapshot.wires)),
    anomalies: JSON.parse(JSON.stringify(snapshot.anomalies)),
  };
}

export function addTriggerPoint(
  triggerPoints: TriggerPoint[],
  stepNumber: number,
  type: TriggerPoint['type'],
  description: string
): TriggerPoint[] {
  return [
    ...triggerPoints,
    {
      stepNumber,
      type,
      description,
    },
  ];
}

export function generateCauseEffectChain(
  operations: Operation[],
  anomalies: Anomaly[],
  finalResult: 'won' | 'lost'
): CauseEffectNode {
  const root: CauseEffectNode = {
    id: 'root',
    label: finalResult === 'won' ? '游戏胜利' : '游戏失败',
    type: 'result',
    children: [],
  };

  const anomalyMap = new Map<number, Anomaly[]>();
  anomalies.forEach(a => {
    if (!anomalyMap.has(a.stepNumber)) {
      anomalyMap.set(a.stepNumber, []);
    }
    anomalyMap.get(a.stepNumber)!.push(a);
  });

  const stepNodes = new Map<number, CauseEffectNode>();

  operations.forEach(op => {
    const opNode: CauseEffectNode = {
      id: `op-${op.id}`,
      label: `步骤${op.stepNumber}: ${op.judgment}`,
      type: 'operation',
      children: [],
    };

    const stepAnomalies = anomalyMap.get(op.stepNumber) || [];
    stepAnomalies.forEach(anomaly => {
      const anomalyNode: CauseEffectNode = {
        id: `anomaly-${anomaly.id}`,
        label: `${getAnomalyTypeLabel(anomaly.type)}: ${anomaly.description}`,
        type: 'anomaly',
        children: [],
      };
      opNode.children.push(anomalyNode);
    });

    stepNodes.set(op.stepNumber, opNode);
  });

  const sortedSteps = Array.from(stepNodes.keys()).sort((a, b) => a - b);

  sortedSteps.forEach((step, index) => {
    const node = stepNodes.get(step)!;
    if (index === 0) {
      root.children.push(node);
    } else {
      const prevStep = sortedSteps[index - 1];
      stepNodes.get(prevStep)!.children.push(node);
    }
  });

  return root;
}

function getAnomalyTypeLabel(type: Anomaly['type']): string {
  const labels: Record<Anomaly['type'], string> = {
    short_circuit: '短路',
    overload: '过载',
    path_blockage: '路径堵塞',
    invalid_connection: '无效连接',
  };
  return labels[type];
}

export function getTriggerPointColor(type: TriggerPoint['type']): string {
  const colors: Record<TriggerPoint['type'], string> = {
    connect: '#10B981',
    anomaly: '#EF4444',
    win: '#06B6D4',
    lose: '#EF4444',
  };
  return colors[type];
}

export function exportGameData(state: GameState): string {
  const exportData = {
    gameId: state.id,
    status: state.status,
    score: state.score,
    totalSteps: state.operations.length,
    operations: state.operations.map(op => ({
      step: op.stepNumber,
      type: op.type,
      source: op.source,
      judgment: op.judgment,
      result: op.result,
      isTriggerPoint: op.isTriggerPoint,
    })),
    anomalies: state.anomalies.map(a => ({
      step: a.stepNumber,
      type: a.type,
      severity: a.severity,
      description: a.description,
      resolved: a.resolved,
    })),
    triggerPoints: state.triggerPoints,
    causeEffectChain: state.causeEffectChain,
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(exportData, null, 2);
}

export function saveGameToStorage(state: GameState): void {
  try {
    const games = JSON.parse(localStorage.getItem('circuit-rescue-games') || '[]');
    const gameIndex = games.findIndex((g: { id: string }) => g.id === state.id);

    const saveData = {
      id: state.id,
      status: state.status,
      score: state.score,
      operations: state.operations,
      anomalies: state.anomalies,
      triggerPoints: state.triggerPoints,
      snapshots: state.snapshots,
      causeEffectChain: state.causeEffectChain,
      finishedAt: state.status !== 'playing' ? new Date().toISOString() : null,
    };

    if (gameIndex >= 0) {
      games[gameIndex] = saveData;
    } else {
      games.push(saveData);
    }

    localStorage.setItem('circuit-rescue-games', JSON.stringify(games));
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

export function loadGameFromStorage(gameId: string): GameState | null {
  try {
    const games = JSON.parse(localStorage.getItem('circuit-rescue-games') || '[]');
    const game = games.find((g: { id: string }) => g.id === gameId);
    return game || null;
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
}

export function getReplaySpeedOptions(): { label: string; value: number }[] {
  return [
    { label: '0.5x', value: 0.5 },
    { label: '1x', value: 1 },
    { label: '2x', value: 2 },
    { label: '4x', value: 4 },
  ];
}
