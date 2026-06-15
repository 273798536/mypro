import type { BoothSettlement, ExceptionQueueItem, ExceptionType } from '../types';
import { settlementStore, exceptionStore, boothStore, trackStore } from './storage';

export interface ShareConfig {
  studentRatio: number;
  teacherRatio: number;
  boothRatio: number;
  platformRatio: number;
}

const DEFAULT_SHARE_CONFIG: ShareConfig = {
  studentRatio: 0.40,
  teacherRatio: 0.30,
  boothRatio: 0.20,
  platformRatio: 0.10,
};

export function calculateSystemShare(
  actualRevenue: number,
  config: ShareConfig = DEFAULT_SHARE_CONFIG
): { totalShare: number; studentShare: number; teacherShare: number; boothShare: number; platformShare: number } {
  const totalShare = actualRevenue * 0.30;
  return {
    totalShare: round2(totalShare),
    studentShare: round2(totalShare * config.studentRatio),
    teacherShare: round2(totalShare * config.teacherRatio),
    boothShare: round2(totalShare * config.boothRatio),
    platformShare: round2(totalShare * config.platformRatio),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface AlignmentResult {
  settlementId: string;
  isAligned: boolean;
  diffAmount: number;
  diffPercentage: number;
  reason?: string;
}

export function checkSettlementAlignment(settlement: BoothSettlement): AlignmentResult {
  const diff = round2(settlement.actualShare - settlement.systemCalculatedShare);
  const diffPct = settlement.systemCalculatedShare === 0 ? 0 : (diff / settlement.systemCalculatedShare) * 100;

  const TOLERANCE_AMOUNT = 1;
  const TOLERANCE_PCT = 0.5;

  const isAligned =
    Math.abs(diff) <= TOLERANCE_AMOUNT || Math.abs(diffPct) <= TOLERANCE_PCT;

  let reason: string | undefined;
  if (!isAligned) {
    if (Math.abs(diff) > 1000) {
      reason = `实际分账和系统计算相差 ${Math.abs(diff).toFixed(2)} 元，偏差较大`;
    } else if (settlement.actualShare > settlement.systemCalculatedShare) {
      reason = `实际分账比系统多算了 ${diff.toFixed(2)} 元`;
    } else {
      reason = `实际分账比系统少算了 ${Math.abs(diff).toFixed(2)} 元`;
    }
  }

  return {
    settlementId: settlement.id,
    isAligned,
    diffAmount: diff,
    diffPercentage: round2(diffPct),
    reason,
  };
}

export type ExceptionCheckResult = {
  type: ExceptionType;
  humanReason: string;
  severity: 'low' | 'medium' | 'high';
  nextStep: string;
} | null;

export function detectSettlementExceptions(
  settlement: BoothSettlement,
  filterSnapshot: Record<string, any>
): ExceptionCheckResult[] {
  const results: ExceptionCheckResult[] = [];
  const alignment = checkSettlementAlignment(settlement);
  const booth = boothStore.getById(settlement.boothId);
  const track = trackStore.getById(settlement.trackId);

  if (!alignment.isAligned) {
    const studentCount = track?.studentIds.length ?? 0;
    const diffAbs = Math.abs(alignment.diffAmount);
    const severity: 'low' | 'medium' | 'high' =
      diffAbs > 500 ? 'high' : diffAbs > 100 ? 'medium' : 'low';

    let type: ExceptionType = 'revenue_mismatch';
    let nextStep = '';

    if (alignment.diffAmount < -200 && studentCount > 2) {
      type = 'student_count_mismatch';
    } else if (diffAbs > 300 && !booth?.boothFee) {
      type = 'fee_calculation_error';
    } else if (settlement.status === 'manual_review') {
      type = 'manual_adjustment';
    }

    if (type === 'revenue_mismatch') {
      nextStep = `请核对${booth?.name || '该摊位'}当日${track?.name || '对应场次'}的营收小票，确认实际营收后重新提交分账`;
    } else if (type === 'student_count_mismatch') {
      nextStep = `请确认${track?.name || '该曲目'}的实际参演学生人数，当前系统按${studentCount}人计算学生分成`;
    } else if (type === 'fee_calculation_error') {
      nextStep = `赞助摊位${booth?.name || ''}的分成比例需要和主办方重新确认，建议联系冠名商对接人`;
    } else if (type === 'manual_adjustment') {
      nextStep = '这是一笔人工改判的分账记录，请复核签字确认后锁定，后续会在导出清单中保留人工改判标记';
    }

    results.push({
      type,
      humanReason: alignment.reason || '分账金额存在差异',
      severity,
      nextStep,
    });
  }

  if (settlement.actualRevenue === 0) {
    results.push({
      type: 'data_incomplete',
      humanReason: `${booth?.name || '该摊位'}该场次的实际营收数据还没录入，当前为0`,
      severity: 'high',
      nextStep: '请尽快补充该摊位当日的实际营收数据，否则分账无法继续推进',
    });
  }

  return results;
}

export function runFullAlignmentForFestival(festivalId: string, filterSnapshot: Record<string, any> = {}
): { updatedSettlements: BoothSettlement[];
newExceptions: ExceptionQueueItem[];
} {
  const settlements = settlementStore.getByFestivalId(festivalId);
  const updatedSettlements: BoothSettlement[] = [];
  const newExceptions: ExceptionQueueItem[] = [];

  const existingExceptions = exceptionStore.getByFestivalId(festivalId);
  const existingSettlementIds = new Set(existingExceptions.map(e => e.settlementId));

  settlements.forEach(s => {
    const alignment = checkSettlementAlignment(s);
    const exceptionChecks = detectSettlementExceptions(s, filterSnapshot);

    let newStatus = s.status;
    if (s.status === 'manual_review') {
      newStatus = 'manual_review';
    } else if (exceptionChecks.length > 0) {
      newStatus = 'exception';
    } else {
      newStatus = alignment.isAligned ? 'aligned' : 'exception';
    }

    const updated = { ...s, status: newStatus };
    updatedSettlements.push(updated);

    if (exceptionChecks.length > 0 && !existingSettlementIds.has(s.id)) {
      exceptionChecks.forEach((check, idx) => {
        const exId = `ex_auto_${s.id}_${idx}`;
        newExceptions.push({
          id: exId,
          festivalId,
          settlementId: s.id,
          type: check!.type,
          humanReason: check!.humanReason,
          severity: check!.severity,
          status: 'open',
          reportedBy: '系统自动检测',
          reportedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          nextStep: check!.nextStep,
          needsManualConfirm: check!.type === 'manual_adjustment',
          isManualOverride: s.status === 'manual_review',
          filterSnapshot,
        });
      });
    }
  });

  settlementStore.setAll(
    settlementStore.getAll().map(
      orig => updatedSettlements.find(u => u.id === orig.id) || orig
    )
  );

  if (newExceptions.length > 0) {
    exceptionStore.setAll([...exceptionStore.getAll(), ...newExceptions]);
  }

  return { updatedSettlements, newExceptions };
}

export function confirmManualAdjustment(
  settlementId: string,
  newActualShare: number,
  reason: string,
  confirmer: string
): { settlement: BoothSettlement; exception: ExceptionQueueItem } {
  const settlement = settlementStore.getById(settlementId);
  if (!settlement) throw new Error('分账记录不存在');

  const booth = boothStore.getById(settlement.boothId);
  const sysShare = calculateSystemShare(settlement.actualRevenue);

  const diff = newActualShare - sysShare.totalShare;
  const ratio = newActualShare > 0 ? {
    studentShare: round2(newActualShare * DEFAULT_SHARE_CONFIG.studentRatio),
    teacherShare: round2(newActualShare * DEFAULT_SHARE_CONFIG.teacherRatio),
    boothShare: round2(newActualShare * DEFAULT_SHARE_CONFIG.boothRatio),
    platformShare: round2(newActualShare * DEFAULT_SHARE_CONFIG.platformRatio),
  } : sysShare;

  const updated: BoothSettlement = {
    ...settlement,
    actualShare: round2(newActualShare),
    ...ratio,
    status: 'confirmed',
  };
  settlementStore.update(settlementId, updated);

  const newEx: ExceptionQueueItem = {
    id: `ex_manual_${Date.now()}`,
    festivalId: settlement.festivalId,
    settlementId,
    type: 'manual_adjustment',
    humanReason: `人工改判：${reason}（系统计算${sysShare.totalShare.toFixed(2)}元 → 实际确认${newActualShare.toFixed(2)}元，差额${diff >= 0 ? '+' : ''}${diff.toFixed(2)}元，确认人：${confirmer}）`,
    severity: 'medium',
    status: 'resolved',
    reportedBy: `${confirmer}（人工改判）`,
    reportedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    assignedTo: confirmer,
    resolution: `已确认人工调整分账金额${diff >= 0 ? '增加' : '减少'}${Math.abs(diff).toFixed(2)}元`,
    resolvedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    resolvedBy: confirmer,
    nextStep: '本次人工改判已生效，后续导出时会附带人工改判标记和原因说明',
    needsManualConfirm: true,
    isManualOverride: true,
    filterSnapshot: {},
  };

  exceptionStore.setAll([...exceptionStore.getAll(), newEx]);

  return { settlement: updated, exception: newEx };
}
