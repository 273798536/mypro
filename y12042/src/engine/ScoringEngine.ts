import type { ScoreDetail, GameState, GridCell, OperationRecord, AnomalyRecord, PowerNodeState, CircuitState, ShortCircuitEvent, PowerToScoreChain } from './types';
import { parseCellId } from './GridSystem';
import { getConnectivityMatrix } from './CircuitSimulator';

export function calculateScore(
  gameState: GameState,
  levelConfig: { totalPower: number; repairKits: number }
): ScoreDetail {
  const { grid, powerNodes, loadNodes, totalPower, consumedPower, timeElapsed, operationLog, anomalies, repairKits } = gameState;
  
  let baseScore = 1000;
  const deductions: ScoreDetail['deductions'] = [];
  const bonuses: ScoreDetail['bonuses'] = [];

  const remainingPower = totalPower - consumedPower;
  const powerEfficiency = remainingPower / totalPower;
  if (powerEfficiency < 0.3) {
    deductions.push({
      reason: '电量使用效率过低',
      amount: Math.floor(200 * (1 - powerEfficiency)),
      cells: loadNodes.filter(id => {
        const cell = getCellByIdInternal(grid, id);
        return cell && !cell.isPowered;
      }),
    });
  }

  const poweredLoads = loadNodes.filter(id => {
    const cell = getCellByIdInternal(grid, id);
    return cell?.isPowered;
  }).length;
  const loadCompletion = poweredLoads / loadNodes.length;
  if (loadCompletion < 1) {
    deductions.push({
      reason: '负载未完全通电',
      amount: Math.floor(300 * (1 - loadCompletion)),
      cells: loadNodes.filter(id => {
        const cell = getCellByIdInternal(grid, id);
        return cell && !cell.isPowered;
      }),
    });
  }

  const shortCircuitCount = anomalies.filter(a => a.type === 'short_circuit').length;
  if (shortCircuitCount > 0) {
    deductions.push({
      reason: '短路扩散扣分',
      amount: shortCircuitCount * 50,
      cells: anomalies.filter(a => a.type === 'short_circuit').flatMap(a => a.cellIds),
    });
  }

  const pathBlockedCount = anomalies.filter(a => a.type === 'path_blocked').length;
  if (pathBlockedCount > 0) {
    deductions.push({
      reason: '维修路径堵塞扣分',
      amount: pathBlockedCount * 30,
      cells: anomalies.filter(a => a.type === 'path_blocked').flatMap(a => a.cellIds),
    });
  }

  const lowPowerCount = anomalies.filter(a => a.type === 'low_power').length;
  if (lowPowerCount > 0) {
    deductions.push({
      reason: '电量不足扣分',
      amount: lowPowerCount * 25,
      cells: anomalies.filter(a => a.type === 'low_power').flatMap(a => a.cellIds),
    });
  }

  const repairOperations = operationLog.filter(op => op.type === 'repair').length;
  const allocatedRepairKits = levelConfig.repairKits;
  if (repairOperations > allocatedRepairKits) {
    const overuse = repairOperations - allocatedRepairKits;
    deductions.push({
      reason: `维修工具超额使用 (${overuse}个)`,
      amount: overuse * 40,
      cells: operationLog.filter(op => op.type === 'repair').map(op => op.cellId),
    });
  }

  const targetTime = 120;
  if (timeElapsed < targetTime) {
    const timeBonus = Math.floor((targetTime - timeElapsed) * 2);
    bonuses.push({
      reason: '快速完成奖励',
      amount: timeBonus,
    });
  }

  if (loadCompletion === 1 && powerEfficiency > 0.7) {
    bonuses.push({
      reason: '完美通关奖励',
      amount: 300,
    });
  }

  if (repairOperations <= Math.ceil(allocatedRepairKits * 0.5)) {
    bonuses.push({
      reason: '资源节约奖励',
      amount: 150,
    });
  }

  if (shortCircuitCount === 0) {
    bonuses.push({
      reason: '零短路奖励',
      amount: 200,
    });
  }

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const totalBonuses = bonuses.reduce((sum, b) => sum + b.amount, 0);
  const totalScore = Math.max(0, baseScore - totalDeductions + totalBonuses);

  return {
    baseScore,
    deductions,
    bonuses,
    totalScore,
    resourceAllocation: {
      repairKits: {
        used: repairOperations,
        allocated: allocatedRepairKits,
      },
      powerUnits: {
        used: Math.floor(consumedPower),
        allocated: totalPower,
      },
    },
  };
}

export function buildPowerToScoreChain(
  gameState: GameState,
  scoreDetail: ScoreDetail,
  shortCircuitEvents: ShortCircuitEvent[]
): PowerToScoreChain {
  const { grid, powerNodes, operationLog, anomalies, totalPower, consumedPower } = gameState;

  const powerNodeStates: PowerNodeState[] = powerNodes.map(nodeId => {
    const cell = getCellByIdInternal(grid, nodeId);
    return {
      nodeId,
      stateHistory: [
        {
          timestamp: 0,
          voltage: cell?.voltage || 0,
          status: cell?.status || 'normal',
        },
        ...operationLog
          .filter(op => op.cellId === nodeId)
          .map(op => ({
            timestamp: op.timestamp,
            voltage: op.afterState.voltage ?? cell?.voltage ?? 0,
            status: op.afterState.status ?? cell?.status ?? 'normal',
          })),
      ],
    };
  });

  const circuitStates: CircuitState[] = [
    {
      timestamp: 0,
      connectivityMatrix: getConnectivityMatrix(grid),
      poweredCells: grid.flat().filter(c => c.isPowered).map(c => c.id),
    },
  ];

  operationLog.forEach((op, index) => {
    if (index % 3 === 0) {
      circuitStates.push({
        timestamp: op.timestamp,
        connectivityMatrix: getConnectivityMatrix(grid),
        poweredCells: grid.flat().filter(c => c.isPowered).map(c => c.id),
      });
    }
  });

  const scoreCalculation = {
    formula: '总分 = 基础分 - 扣分总和 + 加成总和',
    parameters: {
      baseScore: scoreDetail.baseScore,
      totalDeductions: scoreDetail.deductions.reduce((s, d) => s + d.amount, 0),
      totalBonuses: scoreDetail.bonuses.reduce((s, b) => s + b.amount, 0),
      totalPower,
      consumedPower,
    },
    stepResults: [
      scoreDetail.baseScore,
      scoreDetail.baseScore - scoreDetail.deductions.reduce((s, d) => s + d.amount, 0),
      scoreDetail.totalScore,
    ],
  };

  return {
    powerNodeStates,
    circuitStates,
    shortCircuitEvents,
    operationChain: operationLog,
    anomalyEvents: anomalies,
    scoreCalculation,
    finalScore: scoreDetail,
    exportTimestamp: Date.now(),
  };
}

export function formatScoreForExport(score: ScoreDetail): Record<string, any> {
  return {
    baseScore: score.baseScore,
    totalDeductions: score.deductions.reduce((s, d) => s + d.amount, 0),
    totalBonuses: score.bonuses.reduce((s, b) => s + b.amount, 0),
    totalScore: score.totalScore,
    deductionDetails: score.deductions.map(d => ({
      reason: d.reason,
      amount: d.amount,
      affectedCells: d.cells.join(';'),
    })),
    bonusDetails: score.bonuses.map(b => ({
      reason: b.reason,
      amount: b.amount,
    })),
    repairKitsUsed: score.resourceAllocation.repairKits.used,
    repairKitsAllocated: score.resourceAllocation.repairKits.allocated,
    powerUsed: score.resourceAllocation.powerUnits.used,
    powerAllocated: score.resourceAllocation.powerUnits.allocated,
  };
}

export function getScoreRating(totalScore: number): { rating: string; color: string } {
  if (totalScore >= 1500) return { rating: 'S', color: 'text-success-green' };
  if (totalScore >= 1200) return { rating: 'A', color: 'text-power-blue' };
  if (totalScore >= 900) return { rating: 'B', color: 'text-warning-amber' };
  if (totalScore >= 600) return { rating: 'C', color: 'text-warning-amber' };
  return { rating: 'D', color: 'text-danger-red' };
}

function getCellByIdInternal(grid: GridCell[][], cellId: string): GridCell | null {
  const { x, y } = parseCellId(cellId);
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
    return grid[y][x];
  }
  return null;
}

export function createLowPowerAnomaly(
  timestamp: number,
  cellIds: string[],
  currentPower: number,
  requiredPower: number
): AnomalyRecord {
  return {
    id: `anomaly_power_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'low_power',
    timestamp,
    cellIds,
    description: `电量不足: 当前 ${currentPower.toFixed(1)}, 需求 ${requiredPower.toFixed(1)}`,
    source: 'game',
    isReviewed: false,
  };
}

export function createPathBlockedAnomaly(
  timestamp: number,
  cellIds: string[],
  blockedAt: string
): AnomalyRecord {
  return {
    id: `anomaly_blocked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'path_blocked',
    timestamp,
    cellIds,
    description: `维修路径在 ${blockedAt} 处堵塞`,
    source: 'game',
    isReviewed: false,
  };
}
