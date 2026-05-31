import {
  JUDGE_WINDOWS,
  SCORE_VALUES,
  DEDUCTION_VALUES,
  type JudgmentResult,
  type JudgmentRecord,
  type BeatNote,
  type ConflictDetail,
  type TimedEvent,
  type ErrorDeduction,
} from '@/types';

let judgmentIdCounter = 0;
let conflictIdCounter = 0;
let eventIdCounter = 0;
let deductionIdCounter = 0;

export function resetJudgmentIds(): void {
  judgmentIdCounter = 0;
  conflictIdCounter = 0;
  eventIdCounter = 0;
  deductionIdCounter = 0;
}

function nextJudgmentId(): string {
  return `jdg_${++judgmentIdCounter}`;
}

function nextConflictId(): string {
  return `conflict_${++conflictIdCounter}`;
}

function nextEventId(): string {
  return `evt_${++eventIdCounter}`;
}

function nextDeductionId(): string {
  return `ded_${++deductionIdCounter}`;
}

export function judgeTiming(deviation: number): JudgmentResult {
  const abs = Math.abs(deviation);
  if (abs <= JUDGE_WINDOWS.perfect) return 'perfect';
  if (abs <= JUDGE_WINDOWS.great) return 'great';
  if (abs <= JUDGE_WINDOWS.good) return 'good';
  return 'miss';
}

export function detectConflicts(note: BeatNote): ConflictDetail[] {
  const conflicts: ConflictDetail[] = [];
  const { sourceBeat, sourceTrain, sourcePlatform } = note;

  if (sourceTrain.actualTrack !== sourceBeat.expectedTrack) {
    conflicts.push({
      id: nextConflictId(),
      timestamp: note.targetTime,
      sourceA: '节拍轨',
      sourceB: '列车',
      field: '轨道',
      valueA: `${sourceBeat.expectedTrack}`,
      valueB: `${sourceTrain.actualTrack}`,
      resolution: '以节拍轨为准，列车偏差记入留痕',
      relatedNoteId: note.id,
    });
  }

  if (sourcePlatform.designatedTrack !== sourceBeat.expectedTrack) {
    conflicts.push({
      id: nextConflictId(),
      timestamp: note.targetTime,
      sourceA: '节拍轨',
      sourceB: '站台',
      field: '轨道',
      valueA: `${sourceBeat.expectedTrack}`,
      valueB: `${sourcePlatform.designatedTrack}`,
      resolution: '以节拍轨为准，站台偏差记入留痕',
      relatedNoteId: note.id,
    });
  }

  if (
    sourceTrain.actualTrack !== sourceBeat.expectedTrack &&
    sourcePlatform.designatedTrack !== sourceBeat.expectedTrack
  ) {
    conflicts.push({
      id: nextConflictId(),
      timestamp: note.targetTime,
      sourceA: '列车',
      sourceB: '站台',
      field: '轨道',
      valueA: `${sourceTrain.actualTrack}`,
      valueB: `${sourcePlatform.designatedTrack}`,
      resolution: '双重冲突标记，均以节拍轨为准',
      relatedNoteId: note.id,
    });
  }

  return conflicts;
}

export function createJudgment(
  note: BeatNote,
  deviation: number,
  currentCombo: number,
  pendingComboMisjudge: boolean,
  prevBpm: number
): JudgmentRecord {
  const result = judgeTiming(deviation);
  const conflicts = detectConflicts(note);
  const hasConflict = conflicts.length > 0;

  const events: TimedEvent[] = [];
  let eventOrder = 0;

  if (hasConflict) {
    events.push({
      id: nextEventId(),
      timestamp: note.targetTime,
      type: 'conflict',
      description: `三源冲突: ${conflicts.map((c) => `${c.sourceA}与${c.sourceB}在${c.field}上不一致`).join('; ')}`,
      relatedJudgmentId: note.id,
      order: eventOrder++,
    });
  }

  const isSpeedChange = Math.abs(note.bpm - prevBpm) > prevBpm * 0.1;
  const isSyncopationMiss = note.isSyncopation && result === 'miss';

  if (isSpeedChange) {
    events.push({
      id: nextEventId(),
      timestamp: note.targetTime,
      type: 'speed_change',
      description: `速度突变: BPM ${prevBpm} → ${note.bpm}`,
      relatedJudgmentId: note.id,
      order: eventOrder++,
    });
  }

  if (isSyncopationMiss) {
    events.push({
      id: nextEventId(),
      timestamp: note.targetTime,
      type: 'syncopation_miss',
      description: '切分音漏拍',
      relatedJudgmentId: note.id,
      order: eventOrder++,
    });
  }

  const comboMisjudge = isSyncopationMiss && isSpeedChange;
  if (comboMisjudge) {
    events.push({
      id: nextEventId(),
      timestamp: note.targetTime + 50,
      type: 'combo_misjudge',
      description: '切分音漏拍+速度突变 → 连击误判晚到',
      relatedJudgmentId: note.id,
      order: eventOrder++,
    });
  }

  if (pendingComboMisjudge) {
    events.push({
      id: nextEventId(),
      timestamp: note.targetTime,
      type: 'combo_misjudge',
      description: '上一拍连击误判结果到达',
      relatedJudgmentId: note.id,
      order: eventOrder++,
    });
  }

  const deductions: ErrorDeduction[] = [];

  if (result !== 'perfect') {
    const timingDeduction = SCORE_VALUES.perfect - SCORE_VALUES[result];
    if (timingDeduction > 0) {
      deductions.push({
        id: nextDeductionId(),
        judgmentId: note.id,
        errorType: 'timing_deviation',
        description: `时值偏差 ${Math.abs(deviation)}ms → ${result.toUpperCase()}`,
        deduction: timingDeduction,
        source: '判定引擎',
      });
    }
  }

  if (hasConflict) {
    deductions.push({
      id: nextDeductionId(),
      judgmentId: note.id,
      errorType: 'conflict_misjudge',
      description: `三源冲突(${conflicts.length}处)影响判定`,
      deduction: DEDUCTION_VALUES.conflict_misjudge,
      source: '三源仲裁器',
    });
  }

  if (isSyncopationMiss) {
    deductions.push({
      id: nextDeductionId(),
      judgmentId: note.id,
      errorType: 'syncopation_miss',
      description: '切分音符未击中',
      deduction: DEDUCTION_VALUES.syncopation_miss,
      source: '节拍轨',
    });
  }

  if (isSpeedChange && result === 'miss') {
    deductions.push({
      id: nextDeductionId(),
      judgmentId: note.id,
      errorType: 'speed_change_combo_break',
      description: `速度突变(BPM ${prevBpm}→${note.bpm})导致连击断裂`,
      deduction: DEDUCTION_VALUES.speed_change_combo_break,
      source: '轨道调度引擎',
    });
  }

  if (comboMisjudge) {
    deductions.push({
      id: nextDeductionId(),
      judgmentId: note.id,
      errorType: 'combo_misjudge_late',
      description: '切分音漏拍+速度突变 → 连击误判晚到',
      deduction: DEDUCTION_VALUES.combo_misjudge_late,
      source: '判定引擎',
    });
  }

  let finalBasis = '节拍轨主信息';
  if (hasConflict) {
    finalBasis = `节拍轨为主，${conflicts.map((c) => c.sourceB).join('与')}冲突已留痕`;
  }

  return {
    id: nextJudgmentId(),
    beatNoteId: note.id,
    judgmentTime: note.targetTime,
    result,
    deviation,
    sources: {
      beatTrack: note.sourceBeat,
      train: note.sourceTrain,
      platform: note.sourcePlatform,
    },
    hasConflict,
    conflictDetails: conflicts,
    finalBasis,
    scoreChange: SCORE_VALUES[result],
    comboAtTime: currentCombo,
    events,
    errorDeductions: deductions,
  };
}
