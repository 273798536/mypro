import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import type {
  Student,
  KnowledgePoint,
  WrongQuestion,
  ScoringRecord,
  ConstraintRule,
  DPTransitionTable,
  Conclusion,
  ConstraintValidationResult,
  ExtrapolationResult,
  SampleDataset,
} from '../types';
import { storage } from '../data/storage';
import { allSampleDatasets } from '../data/samples';
import { computeTransitionTable } from '../engine/dpEngine';
import { validateConstraints } from '../engine/constraintEngine';
import {
  detectLateScorings,
  generateConclusions,
  computeLateImpactAnalysis,
  type LateScoringImpact,
} from '../engine/conclusionEngine';

interface AppState {
  student: Student | null;
  knowledgePoints: KnowledgePoint[];
  wrongQuestions: WrongQuestion[];
  scoringRecords: ScoringRecord[];
  constraintRules: ConstraintRule[];
  transitionTable: DPTransitionTable | null;
  conclusions: Conclusion[];
  validationResult: ConstraintValidationResult | null;
  lateScorings: ScoringRecord[];
  lateImpacts: LateScoringImpact[];
  currentSampleId: string | null;
  latestExtrapolation: ExtrapolationResult | null;
}

type Action =
  | { type: 'LOAD_STATE'; payload: Partial<AppState> }
  | { type: 'LOAD_SAMPLE'; payload: SampleDataset }
  | { type: 'COMPUTE_TABLE' }
  | { type: 'UPDATE_RULES'; payload: ConstraintRule[] }
  | { type: 'UPDATE_SCORING'; payload: ScoringRecord[] }
  | { type: 'SET_EXTRAPOLATION'; payload: ExtrapolationResult | null }
  | { type: 'RECOMPUTE_ALL' }
  | { type: 'CLEAR' };

const initialState: AppState = {
  student: null,
  knowledgePoints: [],
  wrongQuestions: [],
  scoringRecords: [],
  constraintRules: [],
  transitionTable: null,
  conclusions: [],
  validationResult: null,
  lateScorings: [],
  lateImpacts: [],
  currentSampleId: null,
  latestExtrapolation: null,
};

function recomputeDerived(state: AppState): AppState {
  if (!state.student) return state;
  const table = state.transitionTable
    ? state.transitionTable
    : computeTransitionTable(
        state.student.id,
        state.knowledgePoints,
        state.wrongQuestions,
        state.scoringRecords
      );
  const validation = validateConstraints(state.constraintRules, table);
  const lateS = detectLateScorings(state.scoringRecords, 3);
  let conclusions = state.conclusions.length > 0
    ? state.conclusions
    : generateConclusions(table, state.scoringRecords, lateS);
  const impacts = computeLateImpactAnalysis(conclusions, lateS, state.wrongQuestions);
  return {
    ...state,
    transitionTable: table,
    validationResult: validation,
    lateScorings: lateS,
    conclusions,
    lateImpacts: impacts,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return recomputeDerived({ ...state, ...action.payload });
    case 'LOAD_SAMPLE': {
      storage.loadSample(action.payload);
      const next: AppState = {
        ...initialState,
        student: action.payload.student,
        knowledgePoints: action.payload.knowledgePoints,
        wrongQuestions: action.payload.wrongQuestions,
        scoringRecords: action.payload.scoringRecords,
        constraintRules: action.payload.constraintRules,
        currentSampleId: action.payload.id,
      };
      return recomputeDerived(next);
    }
    case 'COMPUTE_TABLE': {
      if (!state.student) return state;
      const table = computeTransitionTable(
        state.student.id,
        state.knowledgePoints,
        state.wrongQuestions,
        state.scoringRecords,
        state.transitionTable
      );
      storage.setTransitionTable(table);
      const validation = validateConstraints(state.constraintRules, table);
      const lateS = detectLateScorings(state.scoringRecords, 3);
      const conclusions = generateConclusions(table, state.scoringRecords, lateS);
      storage.setConclusions(conclusions);
      const impacts = computeLateImpactAnalysis(conclusions, lateS, state.wrongQuestions);
      return {
        ...state,
        transitionTable: table,
        validationResult: validation,
        lateScorings: lateS,
        conclusions,
        lateImpacts: impacts,
      };
    }
    case 'UPDATE_RULES': {
      storage.setConstraintRules(action.payload);
      const validation = state.transitionTable
        ? validateConstraints(action.payload, state.transitionTable)
        : null;
      return { ...state, constraintRules: action.payload, validationResult: validation };
    }
    case 'UPDATE_SCORING': {
      storage.setScoringRecords(action.payload);
      return recomputeDerived({ ...state, scoringRecords: action.payload });
    }
    case 'SET_EXTRAPOLATION':
      return { ...state, latestExtrapolation: action.payload };
    case 'RECOMPUTE_ALL':
      return recomputeDerived(state);
    case 'CLEAR':
      storage.clear();
      return { ...initialState };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  loadSample: (sample: SampleDataset) => void;
  recomputeAll: () => void;
  updateRules: (rules: ConstraintRule[]) => void;
  updateScoring: (records: ScoringRecord[]) => void;
  setExtrapolation: (r: ExtrapolationResult | null) => void;
  sampleDatasets: SampleDataset[];
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const loaded: Partial<AppState> = {
      student: storage.getStudent(),
      knowledgePoints: storage.getKnowledgePoints(),
      wrongQuestions: storage.getWrongQuestions(),
      scoringRecords: storage.getScoringRecords(),
      constraintRules: storage.getConstraintRules(),
      transitionTable: storage.getTransitionTable(),
      conclusions: storage.getConclusions(),
      currentSampleId: storage.getCurrentSampleId(),
    };
    if (loaded.student) {
      dispatch({ type: 'LOAD_STATE', payload: loaded });
    }
  }, []);

  const loadSample = useCallback((sample: SampleDataset) => {
    dispatch({ type: 'LOAD_SAMPLE', payload: sample });
  }, []);

  const recomputeAll = useCallback(() => {
    dispatch({ type: 'COMPUTE_TABLE' });
  }, []);

  const updateRules = useCallback((rules: ConstraintRule[]) => {
    dispatch({ type: 'UPDATE_RULES', payload: rules });
  }, []);

  const updateScoring = useCallback((records: ScoringRecord[]) => {
    dispatch({ type: 'UPDATE_SCORING', payload: records });
  }, []);

  const setExtrapolation = useCallback((r: ExtrapolationResult | null) => {
    dispatch({ type: 'SET_EXTRAPOLATION', payload: r });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        loadSample,
        recomputeAll,
        updateRules,
        updateScoring,
        setExtrapolation,
        sampleDatasets: allSampleDatasets,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
