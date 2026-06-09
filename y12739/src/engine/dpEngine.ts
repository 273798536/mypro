import { v4 as uuidv4 } from 'uuid';
import type {
  WrongQuestion,
  KnowledgePoint,
  ScoringRecord,
  DPTransitionTable,
  DPState,
  DPTransition,
  DPStateValue,
  ExtrapolationRequest,
  ExtrapolationResult,
  ConstraintRule,
} from '../types';

const STATE_VALUES: DPStateValue[] = [0, 0.25, 0.5, 0.75, 1];

const stateLabel = (v: DPStateValue): string => {
  if (v === 0) return '未掌握';
  if (v === 0.25) return '初步了解';
  if (v === 0.5) return '基本掌握';
  if (v === 0.75) return '熟练掌握';
  return '完全掌握';
};

const findScoringForQuestion = (
  questionId: string,
  scoringRecords: ScoringRecord[]
): ScoringRecord | undefined => scoringRecords.find((sr) => sr.questionId === questionId && sr.status === 'scored');

const estimateInitialState = (kpId: string, wrongQuestions: WrongQuestion[], scoringRecords: ScoringRecord[]): DPStateValue => {
  const relatedWrongs = wrongQuestions.filter((wq) => wq.knowledgePointIds.includes(kpId));
  if (relatedWrongs.length === 0) return 0.75;

  let totalWeight = 0;
  let scoreSum = 0;
  relatedWrongs.forEach((wq) => {
    const scoring = findScoringForQuestion(wq.questionId, scoringRecords);
    if (scoring && scoring.fullScore > 0) {
      const ratio = scoring.score / scoring.fullScore;
      const weight = 1 / wq.attemptCount;
      scoreSum += ratio * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) return 0.25;
  const ratio = scoreSum / totalWeight;
  if (ratio >= 0.9) return 1;
  if (ratio >= 0.7) return 0.75;
  if (ratio >= 0.5) return 0.5;
  if (ratio >= 0.25) return 0.25;
  return 0;
};

export const computeTransitionTable = (
  studentId: string,
  knowledgePoints: KnowledgePoint[],
  wrongQuestions: WrongQuestion[],
  scoringRecords: ScoringRecord[],
  existingTable?: DPTransitionTable | null
): DPTransitionTable => {
  const now = new Date().toISOString();
  const version = existingTable ? existingTable.version + 1 : 1;

  const states: DPState[] = knowledgePoints.map((kp) => {
    const value = estimateInitialState(kp.id, wrongQuestions, scoringRecords);
    const relatedWrongs = wrongQuestions.filter((wq) => wq.knowledgePointIds.includes(kp.id));
    const lastUpdated = relatedWrongs.length > 0
      ? relatedWrongs.reduce((a, b) => (a.lastAttemptAt > b.lastAttemptAt ? a : b)).lastAttemptAt
      : now;
    return {
      knowledgePointId: kp.id,
      knowledgePointName: kp.name,
      value,
      label: stateLabel(value),
      lastUpdated,
      sourceQuestionIds: relatedWrongs.map((wq) => wq.questionId),
    };
  });

  const transitions: DPTransition[] = [];

  if (existingTable) {
    existingTable.states.forEach((oldState) => {
      const newState = states.find((s) => s.knowledgePointId === oldState.knowledgePointId);
      if (!newState) return;
      if (oldState.value !== newState.value) {
        const idx = STATE_VALUES.indexOf(newState.value) - STATE_VALUES.indexOf(oldState.value);
        const transitionType = idx > 0 ? 'improve' : idx < 0 ? 'decline' : 'stable';
        const relatedWq = wrongQuestions.find((wq) =>
          wq.knowledgePointIds.includes(oldState.knowledgePointId) &&
          wq.lastAttemptAt > (existingTable?.updatedAt ?? '')
        );
        transitions.push({
          id: uuidv4(),
          fromState: oldState.value,
          toState: newState.value,
          knowledgePointId: oldState.knowledgePointId,
          triggeredByQuestionId: relatedWq?.questionId,
          probability: Math.min(0.9, 0.4 + Math.abs(idx) * 0.2),
          transitionType,
          description: `${oldState.knowledgePointName}: ${stateLabel(oldState.value)} → ${stateLabel(newState.value)}`,
          timestamp: now,
          scoringRecordId: relatedWq
            ? findScoringForQuestion(relatedWq.questionId, scoringRecords)?.id
            : undefined,
        });
      }
    });
  }

  return {
    id: existingTable?.id ?? uuidv4(),
    studentId,
    createdAt: existingTable?.createdAt ?? now,
    updatedAt: now,
    states,
    transitions,
    version,
  };
};

const getExtrapolationLimits = (rules: ConstraintRule[]): { maxForward: number; maxBackward: number } => {
  const extrapolationRule = rules.find((r) => r.type === 'extrapolation' && r.enabled);
  return {
    maxForward: Number(extrapolationRule?.params.maxForwardSteps ?? 3),
    maxBackward: Number(extrapolationRule?.params.maxBackwardSteps ?? 5),
  };
};

export const runExtrapolation = (
  table: DPTransitionTable,
  request: ExtrapolationRequest,
  rules: ConstraintRule[]
): ExtrapolationResult => {
  const limits = getExtrapolationLimits(rules);
  const maxAllowed = request.direction === 'forward' ? limits.maxForward : limits.maxBackward;

  const extrapolationRule = rules.find((r) => r.type === 'extrapolation' && r.enabled);

  if (request.targetSteps > maxAllowed) {
    return {
      request,
      success: false,
      blockedReason: `外推步数 ${request.targetSteps} 超过规则"${extrapolationRule?.name ?? '外推步数上限'}"限定的最大步数 ${maxAllowed}。超过此范围的数据可信度显著下降，为避免误导学生，已拦截本次外推。`,
      blockedByRuleId: extrapolationRule?.id,
      boundaryExceeded: true,
      maxAllowedSteps: maxAllowed,
      actualSteps: request.targetSteps,
    };
  }

  const kpState = table.states.find((s) => s.knowledgePointId === request.knowledgePointId);
  if (!kpState) {
    return {
      request,
      success: false,
      blockedReason: `未找到知识点 ${request.knowledgePointId} 的状态数据`,
      boundaryExceeded: false,
      maxAllowedSteps: maxAllowed,
      actualSteps: 0,
    };
  }

  const projectedStates: DPState[] = [];
  const projectedTransitions: DPTransition[] = [];
  let currentValue = kpState.value;
  const stepDelta = request.direction === 'forward' ? 1 : -1;
  const now = new Date().toISOString();

  for (let i = 1; i <= request.targetSteps; i++) {
    const currentIdx = STATE_VALUES.indexOf(currentValue);
    let nextIdx = currentIdx + stepDelta;
    nextIdx = Math.max(0, Math.min(STATE_VALUES.length - 1, nextIdx));
    const nextValue = STATE_VALUES[nextIdx];

    if (nextValue !== currentValue) {
      const nextState: DPState = {
        knowledgePointId: kpState.knowledgePointId,
        knowledgePointName: kpState.knowledgePointName,
        value: nextValue,
        label: stateLabel(nextValue),
        lastUpdated: now,
        sourceQuestionIds: kpState.sourceQuestionIds,
      };
      projectedStates.push(nextState);

      projectedTransitions.push({
        id: uuidv4(),
        fromState: currentValue,
        toState: nextValue,
        knowledgePointId: kpState.knowledgePointId,
        probability: 0.45,
        transitionType: stepDelta > 0 ? 'improve' : 'decline',
        description: `[${request.direction === 'forward' ? '前推' : '回溯'}第${i}步] ${kpState.knowledgePointName}: ${stateLabel(currentValue)} → ${stateLabel(nextValue)}`,
        timestamp: now,
      });

      currentValue = nextValue;
    }
  }

  return {
    request,
    success: true,
    projectedStates,
    projectedTransitions,
    boundaryExceeded: false,
    maxAllowedSteps: maxAllowed,
    actualSteps: request.targetSteps,
  };
};

export const stateLabelOf = stateLabel;
