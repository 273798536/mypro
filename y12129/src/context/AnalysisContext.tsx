import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MeasurementPoint, AnalysisSnapshot, CorrectedPoint } from '../types';
import { performFitting } from '../utils/leastSquares';
import { correctAllMeasurements, calculateStatistics } from '../utils/errorCorrection';
import { markAnomalies } from '../utils/anomalyDetection';
import { calculateDataHash } from '../utils/hash';
import { mockMeasurementPoints, requiredPointNames, mockFileInfo } from '../data/mockData';

interface AnalysisState {
  rawData: MeasurementPoint[];
  snapshot: AnalysisSnapshot | null;
  isAnalyzing: boolean;
  selectedPoint: CorrectedPoint | null;
  isDrawerOpen: boolean;
  error: string | null;
}

type AnalysisAction =
  | { type: 'SET_RAW_DATA'; payload: MeasurementPoint[] }
  | { type: 'START_ANALYSIS' }
  | { type: 'ANALYSIS_COMPLETE'; payload: AnalysisSnapshot }
  | { type: 'ANALYSIS_ERROR'; payload: string }
  | { type: 'SELECT_POINT'; payload: CorrectedPoint | null }
  | { type: 'TOGGLE_DRAWER'; payload: boolean }
  | { type: 'RESET' };

const initialState: AnalysisState = {
  rawData: [],
  snapshot: null,
  isAnalyzing: false,
  selectedPoint: null,
  isDrawerOpen: false,
  error: null,
};

function analysisReducer(
  state: AnalysisState,
  action: AnalysisAction
): AnalysisState {
  switch (action.type) {
    case 'SET_RAW_DATA':
      return { ...state, rawData: action.payload };
    case 'START_ANALYSIS':
      return { ...state, isAnalyzing: true, error: null };
    case 'ANALYSIS_COMPLETE':
      return {
        ...state,
        snapshot: action.payload,
        isAnalyzing: false,
      };
    case 'ANALYSIS_ERROR':
      return { ...state, error: action.payload, isAnalyzing: false };
    case 'SELECT_POINT':
      return { ...state, selectedPoint: action.payload };
    case 'TOGGLE_DRAWER':
      return { ...state, isDrawerOpen: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface AnalysisContextType {
  state: AnalysisState;
  dispatch: React.Dispatch<AnalysisAction>;
  runAnalysis: (data: MeasurementPoint[]) => Promise<void>;
  loadMockData: () => Promise<void>;
  selectPoint: (point: CorrectedPoint | null) => void;
  toggleDrawer: (open: boolean) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(analysisReducer, initialState);

  const runAnalysis = async (data: MeasurementPoint[]) => {
    dispatch({ type: 'START_ANALYSIS' });
    try {
      const markedData = markAnomalies(data, requiredPointNames);

      const fittingResult = performFitting(markedData);

      const correctedPoints = correctAllMeasurements(
        markedData,
        fittingResult
      );

      const statistics = calculateStatistics(correctedPoints);

      const missingPoints = correctedPoints
        .filter((p) => p.isMissing)
        .map((p) => p.pointName);

      const contaminatedPoints = correctedPoints
        .filter((p) => p.isContaminated)
        .map((p) => p.pointName);

      const validPoints = correctedPoints.filter(
        (p) => !p.isMissing && !p.isContaminated
      );

      const timestamp = Date.now();
      const dataHash = await calculateDataHash({
        correctedPoints,
        fittingResult,
        timestamp,
      });

      const snapshot: AnalysisSnapshot = {
        timestamp,
        dataHash,
        sourceFileName: mockFileInfo.fileName,
        batchNo: markedData[0]?.batchNo || 'UNKNOWN',
        totalPoints: markedData.length,
        validPoints: validPoints.length,
        missingPoints,
        contaminatedPoints,
        fittingParams: {
          slope: fittingResult.slope,
          intercept: fittingResult.intercept,
          rSquared: fittingResult.rSquared,
          systematicOffset: fittingResult.systematicOffset,
        },
        statistics,
        correctedPoints,
        rawData: markedData,
      };

      dispatch({ type: 'ANALYSIS_COMPLETE', payload: snapshot });
    } catch (error) {
      dispatch({
        type: 'ANALYSIS_ERROR',
        payload:
          error instanceof Error ? error.message : '分析失败',
      });
    }
  };

  const loadMockData = async () => {
    dispatch({ type: 'SET_RAW_DATA', payload: mockMeasurementPoints });
    await runAnalysis(mockMeasurementPoints);
  };

  const selectPoint = (point: CorrectedPoint | null) => {
    dispatch({ type: 'SELECT_POINT', payload: point });
  };

  const toggleDrawer = (open: boolean) => {
    dispatch({ type: 'TOGGLE_DRAWER', payload: open });
  };

  return (
    <AnalysisContext.Provider
      value={{
        state,
        dispatch,
        runAnalysis,
        loadMockData,
        selectPoint,
        toggleDrawer,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}
