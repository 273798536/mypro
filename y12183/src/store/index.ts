import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v5 as uuidv5 } from 'uuid';
import type {
  DrumScore,
  Measure,
  SpeedLadder,
  SpeedTier,
  PracticeSample,
  PracticeSession,
  TierResult,
  FailureMark,
  MissCorrection,
  ImpactEntry,
  PracticeSuggestion,
  ChangeLogEntry,
  EvaluationInput,
} from '../types';
import { evaluate, generateSpeedTiers } from '../engine/evaluate';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

interface StoreState {
  scores: DrumScore[];
  measures: Measure[];
  ladders: SpeedLadder[];
  tiers: SpeedTier[];
  samples: PracticeSample[];
  sessions: PracticeSession[];
  tierResults: TierResult[];
  failures: FailureMark[];
  corrections: MissCorrection[];
  impacts: ImpactEntry[];
  suggestions: PracticeSuggestion[];
  changeLog: ChangeLogEntry[];
  selectedSampleId: string | null;
  selectedSessionId: string | null;
  currentBpmIndex: number;
  addScore: (score: DrumScore, measures: Measure[]) => void;
  removeScore: (id: string) => void;
  addLadder: (ladder: SpeedLadder) => void;
  removeLadder: (id: string) => void;
  updateLadder: (id: string, updates: Partial<SpeedLadder>) => void;
  generateTiersForLadder: (ladderId: string) => void;
  addSample: (sample: PracticeSample) => void;
  removeSample: (id: string) => void;
  selectSample: (id: string | null) => void;
  addSession: (session: PracticeSession) => void;
  selectSession: (id: string | null) => void;
  recordTierResult: (result: TierResult) => void;
  addFailure: (failure: FailureMark) => void;
  removeFailure: (id: string) => void;
  setCurrentBpmIndex: (index: number) => void;
  nextTier: () => void;
  markTierPass: (sessionId: string, bpm: number) => void;
  markTierFail: (sessionId: string, bpm: number, failures: FailureMark[]) => void;
  addCorrection: (correction: MissCorrection) => void;
  updateSuggestions: (sampleId: string) => void;
  getSessionsForSample: (sampleId: string) => PracticeSession[];
  getTierResultsForSession: (sessionId: string) => TierResult[];
  getFailuresForTierResult: (tierResultId: string) => FailureMark[];
  getCorrectionsForSession: (sessionId: string) => MissCorrection[];
  getImpactsForCorrection: (correctionId: string) => ImpactEntry[];
  loadDemoData: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      scores: [],
      measures: [],
      ladders: [],
      tiers: [],
      samples: [],
      sessions: [],
      tierResults: [],
      failures: [],
      corrections: [],
      impacts: [],
      suggestions: [],
      changeLog: [],
      selectedSampleId: null,
      selectedSessionId: null,
      currentBpmIndex: 0,
      addScore: (score, measures) =>
        set((state) => ({
          scores: [...state.scores, score],
          measures: [...state.measures, ...measures],
        })),
      removeScore: (id) =>
        set((state) => ({
          scores: state.scores.filter((s) => s.id !== id),
          measures: state.measures.filter((m) => m.scoreId !== id),
        })),
      addLadder: (ladder) =>
        set((state) => ({
          ladders: [...state.ladders, ladder],
        })),
      removeLadder: (id) =>
        set((state) => ({
          ladders: state.ladders.filter((l) => l.id !== id),
          tiers: state.tiers.filter((t) => t.ladderId !== id),
        })),
      updateLadder: (id, updates) =>
        set((state) => ({
          ladders: state.ladders.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),
      generateTiersForLadder: (ladderId) => {
        const state = get();
        const ladder = state.ladders.find((l) => l.id === ladderId);
        if (!ladder) return;
        const newTiers = generateSpeedTiers(ladder);
        set({
          tiers: [...state.tiers.filter((t) => t.ladderId !== ladderId), ...newTiers],
        });
      },
      addSample: (sample) =>
        set((state) => ({
          samples: [...state.samples, sample],
          selectedSampleId: sample.id,
        })),
      removeSample: (id) =>
        set((state) => ({
          samples: state.samples.filter((s) => s.id !== id),
          selectedSampleId: state.selectedSampleId === id ? null : state.selectedSampleId,
        })),
      selectSample: (id) =>
        set({
          selectedSampleId: id,
          selectedSessionId: null,
          currentBpmIndex: 0,
        }),
      addSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
          selectedSessionId: session.id,
        })),
      selectSession: (id) =>
        set({
          selectedSessionId: id,
        }),
      recordTierResult: (result) =>
        set((state) => {
          const existing = state.tierResults.find(
            (r) => r.sessionId === result.sessionId && r.bpm === result.bpm,
          );
          if (existing) {
            return {
              tierResults: state.tierResults.map((r) => (r.id === existing.id ? result : r)),
            };
          }
          return { tierResults: [...state.tierResults, result] };
        }),
      addFailure: (failure) =>
        set((state) => ({
          failures: [...state.failures, failure],
        })),
      removeFailure: (id) =>
        set((state) => ({
          failures: state.failures.filter((f) => f.id !== id),
        })),
      setCurrentBpmIndex: (index) =>
        set({
          currentBpmIndex: index,
        }),
      nextTier: () =>
        set((state) => ({
          currentBpmIndex: state.currentBpmIndex + 1,
        })),
      markTierPass: (sessionId, bpm) => {
        const state = get();
        const existingResult = state.tierResults.find(
          (r) => r.sessionId === sessionId && r.bpm === bpm,
        );
        const resultId = existingResult?.id || uuidv5(sessionId + ':' + bpm, UUID_NAMESPACE);
        const result: TierResult = {
          id: resultId,
          sessionId,
          bpm,
          passStatus: 'pass',
          duration: 0,
        };
        set((s) => ({
          tierResults: existingResult
            ? s.tierResults.map((r) => (r.id === resultId ? result : r))
            : [...s.tierResults, result],
        }));
        get().updateSuggestions('');
      },
      markTierFail: (sessionId, bpm, failures) => {
        const state = get();
        const existingResult = state.tierResults.find(
          (r) => r.sessionId === sessionId && r.bpm === bpm,
        );
        const resultId = existingResult?.id || uuidv5(sessionId + ':' + bpm, UUID_NAMESPACE);
        const result: TierResult = {
          id: resultId,
          sessionId,
          bpm,
          passStatus: 'fail',
          duration: 0,
        };
        const newFailures = failures.map((f) => ({
          ...f,
          tierResultId: resultId,
        }));
        set((s) => ({
          tierResults: existingResult
            ? s.tierResults.map((r) => (r.id === resultId ? result : r))
            : [...s.tierResults, result],
          failures: [
            ...s.failures.filter((f) => f.tierResultId !== resultId),
            ...newFailures,
          ],
        }));
        get().updateSuggestions('');
      },
      addCorrection: (correction) => {
        const state = get();
        const session = state.sessions.find((s) => s.id === correction.sessionId);
        if (!session) {
          set({ corrections: [...state.corrections, correction] });
          return;
        }
        const sample = state.samples.find((s) => s.id === session.sampleId);
        const ladder = sample ? state.ladders.find((l) => l.id === sample.ladderId) : null;
        const sessionCorrections = state.getCorrectionsForSession(session.id);
        const sessionTierResults = state.getTierResultsForSession(session.id);
        const sessionFailures = sessionTierResults.flatMap((tr) =>
          state.getFailuresForTierResult(tr.id),
        );
        let beforeSuggestions: PracticeSuggestion[] = [];
        if (ladder) {
          const beforeInput: EvaluationInput = {
            failures: sessionFailures,
            ladder,
            corrections: sessionCorrections,
            tierResults: sessionTierResults,
          };
          const beforeEval = evaluate(beforeInput);
          beforeSuggestions = beforeEval.suggestions;
        }
        set({ corrections: [...state.corrections, correction] });
        if (ladder) {
          const afterInput: EvaluationInput = {
            failures: sessionFailures,
            ladder,
            corrections: [...sessionCorrections, correction],
            tierResults: sessionTierResults,
          };
          const afterEval = evaluate(afterInput);
          const newImpacts: ImpactEntry[] = [];
          const newChangeLog: ChangeLogEntry[] = [];
          for (const tr of sessionTierResults) {
            const beforeStatus = tr.passStatus;
            const afterStatus = afterEval.tierStatuses[tr.id] || beforeStatus;
            if (beforeStatus !== afterStatus) {
              const impact: ImpactEntry = {
                id: uuidv5('impact:' + correction.id + ':' + tr.id, UUID_NAMESPACE),
                correctionId: correction.id,
                targetType: 'tier_result',
                targetId: tr.id,
                beforeValue: beforeStatus,
                afterValue: afterStatus,
              };
              newImpacts.push(impact);
              const log: ChangeLogEntry = {
                id: uuidv5('log:' + impact.id, UUID_NAMESPACE),
                correctionId: correction.id,
                field: 'status',
                before: beforeStatus,
                after: afterStatus,
                timestamp: Date.now(),
              };
              newChangeLog.push(log);
            }
          }
          if (beforeSuggestions.length > 0 && afterEval.suggestions.length > 0) {
            const before = beforeSuggestions[0];
            const after = afterEval.suggestions[0];
            if (before.recommendedBpm !== after.recommendedBpm) {
              const impact: ImpactEntry = {
                id: uuidv5('impact:suggestion-bpm:' + correction.id, UUID_NAMESPACE),
                correctionId: correction.id,
                targetType: 'practice_suggestion',
                targetId: after.id,
                beforeValue: String(before.recommendedBpm),
                afterValue: String(after.recommendedBpm),
              };
              newImpacts.push(impact);
            }
          }
          set((s) => ({
            impacts: [...s.impacts, ...newImpacts],
            changeLog: [...s.changeLog, ...newChangeLog],
            suggestions: afterEval.suggestions.map((sugg) => ({
              ...sugg,
              sampleId: sample?.id || '',
              updatedAt: Date.now(),
            })),
          }));
        }
      },
      updateSuggestions: (sampleId) => {
        const state = get();
        const targetSampleId = sampleId || state.selectedSampleId;
        if (!targetSampleId) return;
        const sample = state.samples.find((s) => s.id === targetSampleId);
        if (!sample) return;
        const ladder = state.ladders.find((l) => l.id === sample.ladderId);
        if (!ladder) return;
        const sessions = state.getSessionsForSample(targetSampleId);
        const allTierResults = sessions.flatMap((s) => state.getTierResultsForSession(s.id));
        const allFailures = allTierResults.flatMap((tr) => state.getFailuresForTierResult(tr.id));
        const allCorrections = sessions.flatMap((s) => state.getCorrectionsForSession(s.id));
        const input: EvaluationInput = {
          failures: allFailures,
          ladder,
          corrections: allCorrections,
          tierResults: allTierResults,
        };
        const result = evaluate(input);
        set({
          suggestions: result.suggestions.map((s) => ({
            ...s,
            sampleId: targetSampleId,
            updatedAt: Date.now(),
          })),
        });
      },
      getSessionsForSample: (sampleId) => {
        return get().sessions.filter((s) => s.sampleId === sampleId);
      },
      getTierResultsForSession: (sessionId) => {
        return get().tierResults.filter((r) => r.sessionId === sessionId);
      },
      getFailuresForTierResult: (tierResultId) => {
        return get().failures.filter((f) => f.tierResultId === tierResultId);
      },
      getCorrectionsForSession: (sessionId) => {
        return get().corrections.filter((c) => c.sessionId === sessionId);
      },
      getImpactsForCorrection: (correctionId) => {
        return get().impacts.filter((i) => i.correctionId === correctionId);
      },
      loadDemoData: () => {
        const now = Date.now();
        const scoreId = uuidv5('demo-score', UUID_NAMESPACE);
        const demoScore: DrumScore = {
          id: scoreId,
          name: '演示鼓谱 - 基础节奏',
          totalMeasures: 16,
          beatsPerMeasure: 4,
          metadata: {},
          createdAt: now,
        };
        const demoMeasures: Measure[] = Array.from({ length: 16 }, (_, i) => ({
          id: uuidv5('measure:' + scoreId + ':' + (i + 1), UUID_NAMESPACE),
          scoreId,
          measureNumber: i + 1,
          beatPattern: [1, 0, 1, 0],
        }));
        const ladderId = uuidv5('demo-ladder', UUID_NAMESPACE);
        const demoLadder: SpeedLadder = {
          id: ladderId,
          name: '标准速度阶梯',
          startBpm: 60,
          endBpm: 140,
          interval: 10,
          customTiers: null,
          jumpStrategy: 'stepwise',
        };
        const sampleId = uuidv5('demo-sample', UUID_NAMESPACE);
        const demoSample: PracticeSample = {
          id: sampleId,
          scoreId,
          ladderId,
          studentName: '张三',
          date: now,
        };
        const sessionId = uuidv5('demo-session', UUID_NAMESPACE);
        const demoSession: PracticeSession = {
          id: sessionId,
          sampleId,
          version: 1,
          createdAt: now,
          snapshotHash: 'demo-hash-123',
        };
        const demoTierResults: TierResult[] = [];
        const demoFailures: FailureMark[] = [];
        const bpms = [60, 70, 80, 90, 100, 110, 120];
        bpms.forEach((bpm, idx) => {
          const trId = uuidv5('tr:' + sessionId + ':' + bpm, UUID_NAMESPACE);
          const isFail = bpm >= 100;
          demoTierResults.push({
            id: trId,
            sessionId,
            bpm,
            passStatus: isFail ? 'fail' : 'pass',
            duration: 30,
          });
          if (isFail) {
            demoFailures.push({
              id: uuidv5('fail:' + trId + ':1', UUID_NAMESPACE),
              tierResultId: trId,
              measureNumber: 5,
              failureType: 'rhythm',
              correctedAt: null,
            });
            demoFailures.push({
              id: uuidv5('fail:' + trId + ':2', UUID_NAMESPACE),
              tierResultId: trId,
              measureNumber: 12,
              failureType: 'miss',
              correctedAt: null,
            });
          }
        });
        set({
          scores: [demoScore],
          measures: demoMeasures,
          ladders: [demoLadder],
          samples: [demoSample],
          sessions: [demoSession],
          tierResults: demoTierResults,
          failures: demoFailures,
          selectedSampleId: sampleId,
          selectedSessionId: sessionId,
        });
        get().generateTiersForLadder(ladderId);
        get().updateSuggestions(sampleId);
      },
    }),
    {
      name: 'drum-ladder-store',
      version: 1,
    },
  ),
);
