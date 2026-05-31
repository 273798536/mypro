import type {
  EvaluationInput,
  EvaluationResult,
  FailureMark,
  ImpactEntry,
  MissCorrection,
  PracticeSuggestion,
  SpeedLadder,
  SpeedTier,
  TierResult,
} from '../types/index';
import { deterministicStringify, simpleHash } from './hash';

export function generateSnapshotHash(input: EvaluationInput): string {
  const str = deterministicStringify(input);
  return simpleHash(str);
}

export function generateSpeedTiers(ladder: SpeedLadder): SpeedTier[] {
  const bpms: number[] = [];

  if (ladder.jumpStrategy === 'custom' && ladder.customTiers) {
    bpms.push(...ladder.customTiers);
  } else {
    for (let bpm = ladder.startBpm; bpm <= ladder.endBpm; bpm += ladder.interval) {
      bpms.push(bpm);
    }
  }

  return bpms.map((bpm, index) => ({
    id: ladder.id + '-tier-' + index,
    ladderId: ladder.id,
    bpm,
    order: index,
    status: 'pending' as const,
  }));
}

export function evaluate(input: EvaluationInput): EvaluationResult {
  const { failures, ladder, corrections, tierResults } = input;

  const tierStatuses = computeTierStatuses(tierResults, failures, corrections);

  const suggestions = generateSuggestions(failures, tierResults, ladder);

  const impactMap = generateImpactMap(corrections, tierResults, failures, suggestions);

  const snapshotHash = generateSnapshotHash(input);

  return {
    tierStatuses,
    suggestions,
    impactMap,
    snapshotHash,
  };
}

function computeTierStatuses(
  tierResults: TierResult[],
  failures: FailureMark[],
  corrections: MissCorrection[],
): Record<string, 'pass' | 'fail' | 'review'> {
  const failuresByTierResult = new Map<string, FailureMark[]>();
  for (const f of failures) {
    const list = failuresByTierResult.get(f.tierResultId) ?? [];
    list.push(f);
    failuresByTierResult.set(f.tierResultId, list);
  }

  const correctionsBySession = new Map<string, MissCorrection[]>();
  for (const c of corrections) {
    const list = correctionsBySession.get(c.sessionId) ?? [];
    list.push(c);
    correctionsBySession.set(c.sessionId, list);
  }

  const statuses: Record<string, 'pass' | 'fail' | 'review'> = {};

  for (const tr of tierResults) {
    const sessionCorrections = correctionsBySession.get(tr.sessionId) ?? [];

    if (tr.passStatus === 'pass' && sessionCorrections.length === 0) {
      statuses[tr.id] = 'pass';
      continue;
    }

    const tierFailures = failuresByTierResult.get(tr.id) ?? [];

    if (tr.passStatus === 'fail') {
      if (sessionCorrections.length > 0) {
        const correctedMeasures = new Set(
          sessionCorrections.map((c) => c.measureNumber),
        );
        const hasCorrectedFailure = tierFailures.some(
          (f) => correctedMeasures.has(f.measureNumber),
        );
        if (hasCorrectedFailure) {
          statuses[tr.id] = 'review';
          continue;
        }
      }
      statuses[tr.id] = 'fail';
      continue;
    }

    if (tr.passStatus === 'pending') {
      if (sessionCorrections.length > 0) {
        const correctedMeasures = new Set(
          sessionCorrections.map((c) => c.measureNumber),
        );
        const hasCorrectedFailure = tierFailures.some(
          (f) => correctedMeasures.has(f.measureNumber),
        );
        if (hasCorrectedFailure) {
          statuses[tr.id] = 'review';
          continue;
        }
      }
      statuses[tr.id] = 'fail';
      continue;
    }

    if (sessionCorrections.length > 0) {
      const correctedMeasures = new Set(
        sessionCorrections.map((c) => c.measureNumber),
      );
      const hasCorrectedFailure = tierFailures.some(
        (f) => correctedMeasures.has(f.measureNumber),
      );
      if (hasCorrectedFailure) {
        statuses[tr.id] = 'review';
        continue;
      }
    }

    statuses[tr.id] = tr.passStatus === 'pass' ? 'pass' : 'fail';
  }

  return statuses;
}

function generateSuggestions(
  failures: FailureMark[],
  tierResults: TierResult[],
  ladder: SpeedLadder,
): PracticeSuggestion[] {
  const passedBpms = tierResults
    .filter((tr) => tr.passStatus === 'pass')
    .map((tr) => tr.bpm);

  const recommendedBpm = passedBpms.length > 0 ? Math.max(...passedBpms) : ladder.startBpm;

  const measureFrequency = new Map<number, number>();
  for (const f of failures) {
    measureFrequency.set(f.measureNumber, (measureFrequency.get(f.measureNumber) ?? 0) + 1);
  }

  let focusMeasures: number[] = [];
  if (measureFrequency.size > 0) {
    const maxFreq = Math.max(...measureFrequency.values());
    focusMeasures = Array.from(measureFrequency.entries())
      .filter(([, freq]) => freq === maxFreq)
      .map(([measure]) => measure)
      .sort((a, b) => a - b);
  }

  const failureTypeCounts = new Map<string, number>();
  for (const f of failures) {
    failureTypeCounts.set(f.failureType, (failureTypeCounts.get(f.failureType) ?? 0) + 1);
  }

  let reason = '';
  if (failureTypeCounts.size === 0) {
    reason = '无失败记录，建议继续提速练习';
  } else {
    const parts: string[] = [];
    if (failureTypeCounts.has('rhythm')) {
      parts.push('节奏不稳(' + failureTypeCounts.get('rhythm') + '次)');
    }
    if (failureTypeCounts.has('dynamics')) {
      parts.push('力度控制欠佳(' + failureTypeCounts.get('dynamics') + '次)');
    }
    if (failureTypeCounts.has('miss')) {
      parts.push('漏拍(' + failureTypeCounts.get('miss') + '次)');
    }
    reason = parts.join('、') + '，建议降速巩固';
  }

  return [
    {
      id: ladder.id + '-suggestion',
      sampleId: '',
      recommendedBpm,
      focusMeasures,
      reason,
      updatedAt: 0,
    },
  ];
}

function generateImpactMap(
  corrections: MissCorrection[],
  tierResults: TierResult[],
  failures: FailureMark[],
  suggestions: PracticeSuggestion[],
): Record<string, ImpactEntry[]> {
  const impactMap: Record<string, ImpactEntry[]> = {};

  for (const correction of corrections) {
    const entries: ImpactEntry[] = [];

    for (const tr of tierResults) {
      if (tr.sessionId !== correction.sessionId) {
        continue;
      }

      const tierFailures = failures.filter((f) => f.tierResultId === tr.id);
      const hasMatch = tierFailures.some(
        (f) => f.measureNumber === correction.measureNumber,
      );

      if (hasMatch) {
        const beforeStatus = tr.passStatus;
        const afterStatus: string =
          beforeStatus === 'fail' ? 'review' : beforeStatus === 'pending' ? 'review' : 'review';

        entries.push({
          id: 'impact-' + correction.id + '-' + tr.id,
          correctionId: correction.id,
          targetType: 'tier_result',
          targetId: tr.id,
          beforeValue: beforeStatus,
          afterValue: afterStatus,
        });
      }
    }

    if (suggestions.length > 0) {
      entries.push({
        id: 'impact-' + correction.id + '-suggestion',
        correctionId: correction.id,
        targetType: 'practice_suggestion',
        targetId: suggestions[0].id,
        beforeValue: '',
        afterValue: 'updated',
      });
    }

    impactMap[correction.id] = entries;
  }

  return impactMap;
}
