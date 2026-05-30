import { create } from 'zustand';
import type { ScanParams, SettlementResult, ReviewCase, UserRole, RawParamRow, ParseResult } from '@/types';
import { levels } from '@/data/levels';
import { parseRawTemplate } from '@/utils/paramParser';
import { checkConflicts, checkTimeBudget, checkArtifactMisjudgment, getImageQuality } from '@/utils/conflictDetector';
import { calculateSettlement } from '@/utils/scoreCalculator';

interface GameState {
  userRole: UserRole;
  currentLevelId: string | null;
  params: ScanParams;
  parseResult: ParseResult | null;
  conflicts: ReturnType<typeof checkConflicts>;
  timeInfo: ReturnType<typeof checkTimeBudget>;
  lastSettlement: SettlementResult | null;
  reviewCases: ReviewCase[];
  history: SettlementResult[];
  setRole: (role: UserRole) => void;
  selectLevel: (levelId: string) => void;
  updateParam: (key: keyof ScanParams, value: number) => void;
  submitSettlement: () => SettlementResult | null;
  resetParams: () => void;
  approveCase: (caseId: string, note?: string) => void;
  rejectCase: (caseId: string, note: string) => void;
  addDemoReviewCases: () => void;
}

const defaultParams: ScanParams = {
  TR: 500,
  TE: 15,
  sliceThickness: 5,
  FOV: 24,
  matrix: 256,
  NEX: 2,
};

export const useGameStore = create<GameState>((set, get) => ({
  userRole: 'student',
  currentLevelId: null,
  params: { ...defaultParams },
  parseResult: null,
  conflicts: [],
  timeInfo: { exceeded: false, scanTime: 0 },
  lastSettlement: null,
  reviewCases: [],
  history: [],

  setRole: (role) => set({ userRole: role }),

  selectLevel: (levelId) => {
    const level = levels.find((l) => l.id === levelId);
    if (!level) return;

    const parseResult = parseRawTemplate(level.rawTemplate);
    const initialParams: ScanParams = { ...level.optimalParams };
    for (const key of Object.keys(level.optimalParams) as (keyof ScanParams)[]) {
      if (parseResult.validParams[key] !== undefined) {
        initialParams[key] = parseResult.validParams[key] as number;
      }
    }

    const conflicts = checkConflicts(initialParams, level);
    const timeInfo = checkTimeBudget(initialParams, level.timeBudget);

    set({
      currentLevelId: levelId,
      params: initialParams,
      parseResult,
      conflicts,
      timeInfo,
      lastSettlement: null,
    });
  },

  updateParam: (key, value) => {
    const state = get();
    const newParams = { ...state.params, [key]: value };
    const level = levels.find((l) => l.id === state.currentLevelId);
    if (!level) return;

    const conflicts = checkConflicts(newParams, level);
    const timeInfo = checkTimeBudget(newParams, level.timeBudget);

    set({ params: newParams, conflicts, timeInfo });
  },

  submitSettlement: () => {
    const state = get();
    const level = levels.find((l) => l.id === state.currentLevelId);
    if (!level) return null;

    const { conflicts, params, timeInfo, parseResult } = state;

    if (conflicts.some((c) => c.severity === 'fatal')) {
      const fatalConflicts = conflicts.filter((c) => c.severity === 'fatal');
      const result: SettlementResult = {
        totalScore: 0,
        maxScore: 100,
        scoreItems: [],
        scanTime: timeInfo.scanTime,
        timeBudget: level.timeBudget,
        isTimeExceeded: timeInfo.exceeded,
        conflicts,
        badRows: parseResult?.badRows ?? [],
        artifactTypes: [],
        params: { ...params },
        timestamp: Date.now(),
        imageQuality: getImageQuality(params, level),
      };
      set({ lastSettlement: result, history: [...state.history, result] });
      return result;
    }

    const result = calculateSettlement(
      params,
      level,
      conflicts,
      timeInfo.scanTime,
      timeInfo.exceeded,
      parseResult?.badRows ?? []
    );

    const misjudgments = checkArtifactMisjudgment(result.imageQuality);

    if (misjudgments.length > 0) {
      result.artifactTypes = [...result.artifactTypes, ...misjudgments];
    }

    set({ lastSettlement: result, history: [...state.history, result] });
    return result;
  },

  resetParams: () => {
    const state = get();
    const level = levels.find((l) => l.id === state.currentLevelId);
    if (!level) return;
    const conflicts = checkConflicts(level.optimalParams, level);
    const timeInfo = checkTimeBudget(level.optimalParams, level.timeBudget);
    set({
      params: { ...level.optimalParams },
      conflicts,
      timeInfo,
      lastSettlement: null,
    });
  },

  approveCase: (caseId, note) => {
    set((state) => ({
      reviewCases: state.reviewCases.map((c) =>
        c.id === caseId
          ? { ...c, reviewStatus: 'approved' as const, reviewNote: note, reviewTimestamp: Date.now() }
          : c
      ),
    }));
  },

  rejectCase: (caseId, note) => {
    set((state) => ({
      reviewCases: state.reviewCases.map((c) =>
        c.id === caseId
          ? { ...c, reviewStatus: 'rejected' as const, reviewNote: note, reviewTimestamp: Date.now() }
          : c
      ),
    }));
  },

  addDemoReviewCases: () => {
    const state = get();
    const existingIds = new Set(state.reviewCases.map((c) => c.id));
    const newCases: ReviewCase[] = [];

    const case1Params: ScanParams = { TR: 10, TE: 80, sliceThickness: 5, FOV: 24, matrix: 256, NEX: 2 };
    const case1Level = levels[0];
    const case1Conflicts = checkConflicts(case1Params, case1Level);
    const case1Time = checkTimeBudget(case1Params, case1Level.timeBudget);
    const case1Result = calculateSettlement(case1Params, case1Level, case1Conflicts, case1Time.scanTime, case1Time.exceeded, []);
    newCases.push({
      id: 'demo-conflict-1',
      levelId: case1Level.id,
      levelName: case1Level.name,
      params: case1Params,
      result: case1Result,
      studentName: '学员A',
      reviewStatus: 'pending',
    });

    const case2Params: ScanParams = { TR: 5000, TE: 90, sliceThickness: 5, FOV: 24, matrix: 512, NEX: 8 };
    const case2Level = levels[1];
    const case2Conflicts = checkConflicts(case2Params, case2Level);
    const case2Time = checkTimeBudget(case2Params, case2Level.timeBudget);
    const case2Result = calculateSettlement(case2Params, case2Level, case2Conflicts, case2Time.scanTime, case2Time.exceeded, []);
    newCases.push({
      id: 'demo-overtime-1',
      levelId: case2Level.id,
      levelName: case2Level.name,
      params: case2Params,
      result: case2Result,
      studentName: '学员B',
      reviewStatus: 'pending',
    });

    const case3Params: ScanParams = { TR: 3000, TE: 120, sliceThickness: 3, FOV: 14, matrix: 320, NEX: 2 };
    const case3Level = levels[2];
    const case3Conflicts = checkConflicts(case3Params, case3Level);
    const case3Time = checkTimeBudget(case3Params, case3Level.timeBudget);
    const case3Result = calculateSettlement(case3Params, case3Level, case3Conflicts, case3Time.scanTime, case3Time.exceeded, []);
    newCases.push({
      id: 'demo-misjudge-1',
      levelId: case3Level.id,
      levelName: case3Level.name,
      params: case3Params,
      result: case3Result,
      studentName: '学员C',
      reviewStatus: 'pending',
    });

    const filtered = newCases.filter((c) => !existingIds.has(c.id));
    set({ reviewCases: [...state.reviewCases, ...filtered] });
  },
}));
