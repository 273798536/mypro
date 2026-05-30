import type { ScoreDetail, PowerToScoreChain, OperationRecord, AnomalyRecord, ShortCircuitEvent } from '../engine/types';
import { exportToCSV, exportToJSON } from './csvParser';

export function exportScoreReport(
  score: ScoreDetail,
  levelName: string,
  gameId: string,
  format: 'csv' | 'json'
): void {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `score_report_${levelName}_${gameId}_${timestamp}`;

  if (format === 'csv') {
    const csvData = formatScoreForCSV(score, levelName, gameId);
    exportToCSV(csvData, `${filename}.csv`);
  } else {
    const jsonData = formatScoreForJSON(score, levelName, gameId);
    exportToJSON(jsonData, `${filename}.json`);
  }
}

export function exportFullChainReport(
  chain: PowerToScoreChain,
  levelName: string,
  gameId: string,
  format: 'csv' | 'json'
): void {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `full_chain_report_${levelName}_${gameId}_${timestamp}`;

  if (format === 'csv') {
    const csvData = formatChainForCSV(chain, levelName, gameId);
    exportToCSV(csvData, `${filename}.csv`);
  } else {
    const jsonData = {
      gameId,
      levelName,
      exportTime: new Date().toISOString(),
      ...chain,
    };
    exportToJSON(jsonData, `${filename}.json`);
  }
}

function formatScoreForCSV(score: ScoreDetail, levelName: string, gameId: string): any[] {
  const data: any[] = [];

  data.push({
    type: 'summary',
    gameId,
    levelName,
    exportTime: new Date().toISOString(),
    baseScore: score.baseScore,
    totalDeductions: score.deductions.reduce((s, d) => s + d.amount, 0),
    totalBonuses: score.bonuses.reduce((s, b) => s + b.amount, 0),
    totalScore: score.totalScore,
  });

  score.deductions.forEach((deduction, index) => {
    data.push({
      type: 'deduction',
      gameId,
      itemIndex: index + 1,
      reason: deduction.reason,
      amount: deduction.amount,
      affectedCells: deduction.cells.join(';'),
    });
  });

  score.bonuses.forEach((bonus, index) => {
    data.push({
      type: 'bonus',
      gameId,
      itemIndex: index + 1,
      reason: bonus.reason,
      amount: bonus.amount,
    });
  });

  data.push({
    type: 'resource_allocation',
    gameId,
    repairKitsUsed: score.resourceAllocation.repairKits.used,
    repairKitsAllocated: score.resourceAllocation.repairKits.allocated,
    powerUsed: score.resourceAllocation.powerUnits.used,
    powerAllocated: score.resourceAllocation.powerUnits.allocated,
  });

  return data;
}

function formatScoreForJSON(score: ScoreDetail, levelName: string, gameId: string): any {
  return {
    gameId,
    levelName,
    exportTime: new Date().toISOString(),
    score: {
      baseScore: score.baseScore,
      totalScore: score.totalScore,
      deductions: score.deductions,
      bonuses: score.bonuses,
    },
    resourceAllocation: score.resourceAllocation,
  };
}

function formatChainForCSV(chain: PowerToScoreChain, levelName: string, gameId: string): any[] {
  const data: any[] = [];

  data.push({
    type: 'header',
    gameId,
    levelName,
    exportTime: new Date(chain.exportTimestamp).toISOString(),
  });

  chain.powerNodeStates.forEach(node => {
    node.stateHistory.forEach((state, index) => {
      data.push({
        type: 'power_node_state',
        nodeId: node.nodeId,
        timestamp: state.timestamp,
        voltage: state.voltage,
        status: state.status,
      });
    });
  });

  chain.circuitStates.forEach((state, index) => {
    data.push({
      type: 'circuit_state',
      snapshotIndex: index,
      timestamp: state.timestamp,
      poweredCellsCount: state.poweredCells.length,
      poweredCells: state.poweredCells.join(';'),
    });
  });

  chain.shortCircuitEvents.forEach((event, index) => {
    data.push({
      type: 'short_circuit_event',
      eventIndex: index,
      timestamp: event.timestamp,
      startCell: event.startCell,
      diffusionPath: event.diffusionPath.join(';'),
      cellsAffected: event.diffusionPath.length + 1,
    });
  });

  chain.operationChain.forEach((op, index) => {
    data.push({
      type: 'operation',
      operationIndex: index + 1,
      timestamp: op.timestamp,
      operationType: op.type,
      cellId: op.cellId,
      powerSnapshot: op.powerSnapshot,
    });
  });

  chain.anomalyEvents.forEach((anomaly, index) => {
    data.push({
      type: 'anomaly',
      anomalyIndex: index + 1,
      anomalyId: anomaly.id,
      timestamp: anomaly.timestamp,
      anomalyType: anomaly.type,
      description: anomaly.description,
      source: anomaly.source,
      isReviewed: anomaly.isReviewed,
      affectedCells: anomaly.cellIds.join(';'),
    });
  });

  data.push({
    type: 'score_calculation',
    formula: chain.scoreCalculation.formula,
    parameters: JSON.stringify(chain.scoreCalculation.parameters),
    stepResults: chain.scoreCalculation.stepResults.join(' -> '),
  });

  data.push({
    type: 'final_score',
    baseScore: chain.finalScore.baseScore,
    totalScore: chain.finalScore.totalScore,
    rating: getScoreRating(chain.finalScore.totalScore),
  });

  return data;
}

function getScoreRating(totalScore: number): string {
  if (totalScore >= 1500) return 'S';
  if (totalScore >= 1200) return 'A';
  if (totalScore >= 900) return 'B';
  if (totalScore >= 600) return 'C';
  return 'D';
}

export function exportOperationLog(
  operations: OperationRecord[],
  levelName: string,
  gameId: string
): void {
  const csvData = operations.map((op, index) => ({
    operationIndex: index + 1,
    timestamp: op.timestamp,
    type: op.type,
    cellId: op.cellId,
    powerSnapshot: op.powerSnapshot,
    beforeState: JSON.stringify(op.beforeState),
    afterState: JSON.stringify(op.afterState),
  }));

  const filename = `operation_log_${levelName}_${gameId}_${new Date().toISOString().slice(0, 10)}.csv`;
  exportToCSV(csvData, filename);
}

export function exportAnomalyReport(
  anomalies: AnomalyRecord[],
  levelName: string,
  gameId: string
): void {
  const csvData = anomalies.map((a, index) => ({
    anomalyIndex: index + 1,
    anomalyId: a.id,
    timestamp: a.timestamp,
    type: a.type,
    description: a.description,
    source: a.source,
    isReviewed: a.isReviewed,
    affectedCells: a.cellIds.join(';'),
  }));

  const filename = `anomaly_report_${levelName}_${gameId}_${new Date().toISOString().slice(0, 10)}.csv`;
  exportToCSV(csvData, filename);
}

export function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatPowerToScoreChainSummary(chain: PowerToScoreChain): string {
  const lines: string[] = [];
  lines.push('=== 电源节点到成绩导出链路总结 ===');
  lines.push(`导出时间: ${new Date(chain.exportTimestamp).toLocaleString()}`);
  lines.push('');
  lines.push(`电源节点数: ${chain.powerNodeStates.length}`);
  lines.push(`电路状态快照数: ${chain.circuitStates.length}`);
  lines.push(`短路事件数: ${chain.shortCircuitEvents.length}`);
  lines.push(`操作记录数: ${chain.operationChain.length}`);
  lines.push(`异常事件数: ${chain.anomalyEvents.length}`);
  lines.push('');
  lines.push(`最终得分: ${chain.finalScore.totalScore}`);
  lines.push(`计算公式: ${chain.scoreCalculation.formula}`);
  lines.push(`计算过程: ${chain.scoreCalculation.stepResults.join(' → ')}`);
  lines.push('');
  lines.push('=== 资源分配 ===');
  lines.push(`维修工具: ${chain.finalScore.resourceAllocation.repairKits.used}/${chain.finalScore.resourceAllocation.repairKits.allocated}`);
  lines.push(`电量消耗: ${chain.finalScore.resourceAllocation.powerUnits.used}/${chain.finalScore.resourceAllocation.powerUnits.allocated}`);

  return lines.join('\n');
}
