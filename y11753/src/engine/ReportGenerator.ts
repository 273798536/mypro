import { GameState, InspectionReport, ReportItem, RESOURCE_CONFIG, FAULT_TYPE_CONFIG } from '../types';
import { generateId, calculateRating } from '../utils/helpers';
import { ScoreEngine } from './ScoreEngine';

export class ReportGenerator {
  static generateReport(state: GameState): InspectionReport {
    const scoreResult = ScoreEngine.calculateScore(state);
    const unhandledItems = this.getUnhandledItems(state);
    const correctedItems = this.getCorrectedItems(state);
    const needConfirmItems = this.getNeedConfirmItems(state);
    const efficiency = this.calculateEfficiency(state);
    const batteryManagement = this.evaluateBatteryManagement(state);
    const rating = calculateRating(scoreResult.totalScore);

    return {
      gameId: generateId(),
      levelName: state.level?.name || '未知关卡',
      startTime: state.operations[0]?.timestamp || 0,
      endTime: state.currentTime,
      totalScore: scoreResult.totalScore,
      scoreBreakdown: scoreResult.breakdown,
      unhandledItems,
      correctedItems,
      needConfirmItems,
      efficiency,
      batteryManagement,
      operationLogs: [...state.operations],
      rating
    };
  }

  private static getUnhandledItems(state: GameState): ReportItem[] {
    return state.faults
      .filter(f => f.status === 'missed' || f.status === 'pending')
      .map(f => {
        const area = state.level?.mapLayout.find(a => a.id === f.areaId);
        return {
          id: f.id,
          type: FAULT_TYPE_CONFIG[f.type].name,
          description: f.description,
          areaId: f.areaId,
          areaName: area?.name || '未知区域',
          discoveredAt: f.discoveredAt,
          priority: f.priority,
          source: f.source
        };
      });
  }

  private static getCorrectedItems(state: GameState): ReportItem[] {
    return state.faults
      .filter(f => f.status === 'fixed')
      .map(f => {
        const area = state.level?.mapLayout.find(a => a.id === f.areaId);
        const handler = state.resources.find(r => r.id === f.handledBy);
        return {
          id: f.id,
          type: FAULT_TYPE_CONFIG[f.type].name,
          description: f.description,
          areaId: f.areaId,
          areaName: area?.name || '未知区域',
          discoveredAt: f.discoveredAt,
          priority: f.priority,
          source: f.source,
          handler: handler ? RESOURCE_CONFIG[handler.type].name : '未知',
          remarks: `于 ${this.formatTime(f.handledAt!)} 处理完成`
        };
      });
  }

  private static getNeedConfirmItems(state: GameState): ReportItem[] {
    const needConfirm: ReportItem[] = [];

    state.operations
      .filter(op => op.corrections && op.corrections.length > 0)
      .forEach(op => {
        const area = state.level?.mapLayout.find(a => a.id === op.targetAreaId);
        needConfirm.push({
          id: op.id,
          type: op.action === 'inspect' ? '巡检' : op.action === 'clean' ? '清洁' : '维修',
          description: `${RESOURCE_CONFIG[op.resourceType].name} 执行${op.action === 'inspect' ? '巡检' : op.action === 'clean' ? '清洁' : '维修'}`,
          areaId: op.targetAreaId,
          areaName: area?.name || '未知区域',
          discoveredAt: op.timestamp,
          priority: 'medium',
          source: op.source,
          handler: RESOURCE_CONFIG[op.resourceType].name,
          remarks: `存在 ${op.corrections!.length} 条修正记录，需人工复核`
        });
      });

    state.faults
      .filter(f => f.type === 'unknown' && f.status === 'fixed')
      .forEach(f => {
        const area = state.level?.mapLayout.find(a => a.id === f.areaId);
        needConfirm.push({
          id: `confirm-${f.id}`,
          type: '未知故障确认',
          description: `未知故障已处理，需确认处理结果`,
          areaId: f.areaId,
          areaName: area?.name || '未知区域',
          discoveredAt: f.discoveredAt,
          priority: 'low',
          source: f.source,
          handler: f.handledBy || '未知',
          remarks: '故障类型原为未知，建议人工复核处理结果'
        });
      });

    return needConfirm;
  }

  private static calculateEfficiency(state: GameState): number {
    const { resources, operations, totalTime } = state;
    if (resources.length === 0 || totalTime === 0) return 0;

    const successfulOps = operations.filter(op => op.result === 'success');
    const totalWorkTime = successfulOps.reduce((sum, op) => {
      const config = RESOURCE_CONFIG[op.resourceType];
      return sum + config.workTime;
    }, 0);

    const maxPossibleWork = resources.length * totalTime * 0.5;
    return maxPossibleWork > 0 ? Math.min(100, (totalWorkTime / maxPossibleWork) * 100) : 0;
  }

  private static evaluateBatteryManagement(state: GameState): number {
    const { battery } = state;
    if (battery >= 60) return 100;
    if (battery >= 40) return 75;
    if (battery >= 20) return 50;
    return 25;
  }

  private static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
