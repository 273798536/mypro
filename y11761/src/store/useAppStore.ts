import { create } from 'zustand';
import {
  AppState,
  WaveParams,
  Obstacle,
  SamplePoint,
  DisplayOptions,
  HistoryRecord,
  AnomalyRecord,
  ScoreRecord,
  DEFAULT_WAVE_PARAMS,
  DEFAULT_DISPLAY_OPTIONS,
  Measurement,
} from '@/types';
import { detectAnomalies } from '@/utils/anomalyDetector';
import { calculateScore } from '@/utils/scoring';
import { generateWaveGrid } from '@/utils/physicsEngine';

interface AppStore extends AppState {
  setWaveParams: (params: Partial<WaveParams>) => void;
  updateWaveSource: (
    source: 'source1' | 'source2',
    params: Partial<WaveParams['source1']>
  ) => void;
  addObstacle: (obstacle: Omit<Obstacle, 'id'>) => void;
  updateObstacle: (id: string, updates: Partial<Obstacle>) => void;
  removeObstacle: (id: string) => void;
  addSamplePoint: (position: { x: number; y: number }) => void;
  removeSamplePoint: (id: string) => void;
  updateSamplePointMeasurement: (id: string, measurement: Measurement) => void;
  setDisplayOptions: (options: Partial<DisplayOptions>) => void;
  togglePlay: () => void;
  reset: () => void;
  setTime: (time: number) => void;
  setFps: (fps: number) => void;
  setGridResolution: (resolution: number) => void;
  setActiveAnomaly: (anomaly: AnomalyRecord | null) => void;
  addAnomaly: (anomaly: AnomalyRecord) => void;
  clearAnomalies: () => void;
  addScore: (score: ScoreRecord) => void;
  calculateAndAddScore: () => void;
  runAnomalyDetection: () => AnomalyRecord[];
  getWaveData: () => ReturnType<typeof generateWaveGrid>;
}

const initialState: Omit<AppState, 'activeAnomaly'> = {
  isPlaying: true,
  time: 0,
  gridResolution: 96,
  waveParams: { ...DEFAULT_WAVE_PARAMS },
  obstacles: [],
  samplePoints: [],
  displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  history: [],
  anomalies: [],
  scores: [],
  fps: 60,
  isPerformanceMode: false,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,
  activeAnomaly: null,

  setWaveParams: (params) => {
    const oldParams = get().waveParams;
    const newParams = { ...oldParams, ...params };

    const { anomalies, correctedParams } = detectAnomalies(
      newParams,
      get().obstacles,
      get().fps
    );

    if (anomalies.length > 0) {
      anomalies.forEach((a) => get().addAnomaly(a));
    }

    const historyRecord: HistoryRecord = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action: '修改波动参数',
      before: oldParams,
      after: correctedParams,
      anomalyId: anomalies.length > 0 ? anomalies[0].id : undefined,
    };

    set((state) => ({
      waveParams: correctedParams,
      history: [...state.history, historyRecord],
    }));
  },

  updateWaveSource: (source, params) => {
    const oldParams = get().waveParams;
    const oldSource = oldParams[source];
    const newSource = { ...oldSource, ...params };
    const newParams = { ...oldParams, [source]: newSource };

    const { anomalies, correctedParams } = detectAnomalies(
      newParams,
      get().obstacles,
      get().fps
    );

    if (anomalies.length > 0) {
      anomalies.forEach((a) => get().addAnomaly(a));
    }

    const historyRecord: HistoryRecord = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action: `修改${source === 'source1' ? '波源1' : '波源2'}参数`,
      before: oldSource,
      after: correctedParams[source],
      anomalyId: anomalies.length > 0 ? anomalies[0].id : undefined,
    };

    set((state) => ({
      waveParams: correctedParams,
      history: [...state.history, historyRecord],
    }));
  },

  addObstacle: (obstacle) => {
    const newObstacle: Obstacle = {
      ...obstacle,
      id: `obstacle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const { anomalies } = detectAnomalies(
      get().waveParams,
      [...get().obstacles, newObstacle],
      get().fps
    );

    if (anomalies.length > 0) {
      anomalies.forEach((a) => get().addAnomaly(a));
    }

    const historyRecord: HistoryRecord = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action: `添加障碍物: ${obstacle.type}`,
      before: null,
      after: newObstacle,
      anomalyId: anomalies.length > 0 ? anomalies[0].id : undefined,
    };

    set((state) => ({
      obstacles: [...state.obstacles, newObstacle],
      history: [...state.history, historyRecord],
    }));
  },

  updateObstacle: (id, updates) => {
    const oldObstacle = get().obstacles.find((o) => o.id === id);
    if (!oldObstacle) return;

    const newObstacles = get().obstacles.map((o) =>
      o.id === id ? { ...o, ...updates } : o
    );

    const { anomalies } = detectAnomalies(
      get().waveParams,
      newObstacles,
      get().fps
    );

    if (anomalies.length > 0) {
      anomalies.forEach((a) => get().addAnomaly(a));
    }

    const historyRecord: HistoryRecord = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action: `修改障碍物`,
      before: oldObstacle,
      after: newObstacles.find((o) => o.id === id),
      anomalyId: anomalies.length > 0 ? anomalies[0].id : undefined,
    };

    set((state) => ({
      obstacles: newObstacles,
      history: [...state.history, historyRecord],
    }));
  },

  removeObstacle: (id) => {
    const obstacle = get().obstacles.find((o) => o.id === id);
    if (!obstacle) return;

    const historyRecord: HistoryRecord = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action: `移除障碍物: ${obstacle.type}`,
      before: obstacle,
      after: null,
    };

    set((state) => ({
      obstacles: state.obstacles.filter((o) => o.id !== id),
      history: [...state.history, historyRecord],
    }));
  },

  addSamplePoint: (position) => {
    const newSamplePoint: SamplePoint = {
      id: `sample_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position,
      measurements: [],
    };

    const historyRecord: HistoryRecord = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action: '添加采样点',
      before: null,
      after: newSamplePoint,
    };

    set((state) => ({
      samplePoints: [...state.samplePoints, newSamplePoint],
      history: [...state.history, historyRecord],
    }));
  },

  removeSamplePoint: (id) => {
    const samplePoint = get().samplePoints.find((sp) => sp.id === id);
    if (!samplePoint) return;

    const historyRecord: HistoryRecord = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action: '移除采样点',
      before: samplePoint,
      after: null,
    };

    set((state) => ({
      samplePoints: state.samplePoints.filter((sp) => sp.id !== id),
      history: [...state.history, historyRecord],
    }));
  },

  updateSamplePointMeasurement: (id, measurement) => {
    set((state) => ({
      samplePoints: state.samplePoints.map((sp) =>
        sp.id === id
          ? { ...sp, measurements: [...sp.measurements, measurement] }
          : sp
      ),
    }));
  },

  setDisplayOptions: (options) => {
    set((state) => ({
      displayOptions: { ...state.displayOptions, ...options },
    }));
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  reset: () => {
    const historyRecord: HistoryRecord = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action: '重置场景',
      before: get().waveParams,
      after: DEFAULT_WAVE_PARAMS,
    };

    set({
      ...initialState,
      history: [...get().history, historyRecord],
      activeAnomaly: null,
    });
  },

  setTime: (time) => {
    set({ time });
  },

  setFps: (fps) => {
    set({ fps });
  },

  setGridResolution: (resolution) => {
    set({ gridResolution: resolution, isPerformanceMode: resolution < 96 });
  },

  setActiveAnomaly: (anomaly) => {
    set({ activeAnomaly: anomaly });
  },

  addAnomaly: (anomaly) => {
    set((state) => ({
      anomalies: [...state.anomalies, anomaly],
      activeAnomaly: state.activeAnomaly || anomaly,
    }));
  },

  clearAnomalies: () => {
    set({ anomalies: [], activeAnomaly: null });
  },

  addScore: (score) => {
    set((state) => ({
      scores: [...state.scores, score],
    }));
  },

  calculateAndAddScore: () => {
    const state = get();
    const waveData = generateWaveGrid(
      10,
      32,
      state.time,
      state.waveParams,
      state.obstacles
    );
    const score = calculateScore(
      state.waveParams,
      waveData.amplitudes,
      state.anomalies,
      state.samplePoints,
      Date.now()
    );
    get().addScore(score);
    return score;
  },

  runAnomalyDetection: () => {
    const state = get();
    const { anomalies } = detectAnomalies(
      state.waveParams,
      state.obstacles,
      state.fps
    );
    if (anomalies.length > 0) {
      anomalies.forEach((a) => get().addAnomaly(a));
    }
    return anomalies;
  },

  getWaveData: () => {
    const state = get();
    return generateWaveGrid(
      10,
      state.gridResolution,
      state.time,
      state.waveParams,
      state.obstacles
    );
  },
}));
