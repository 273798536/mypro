import { create } from 'zustand';
import { nanoid } from 'nanoid';
import Dexie, { Table } from 'dexie';

export interface FittingSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: 'normal' | 'warning' | 'critical';
  rSquared: number;
  rmse: number;
  sampleCount: number;
  temperatureMin: number;
  temperatureMax: number;
  samplingIntervalMs: number;
}

export interface DataSource {
  id: string;
  sessionId: string;
  type: 'voltage' | 'current' | 'temperature' | 'sampling_interval' | 'initial_params' | 'report';
  sourceLabel: string;
  fileName?: string;
  timestamp: number;
  rawData: string;
  correctionLog: string;
}

export interface FittingParameter {
  id: string;
  sessionId: string;
  name: string;
  value: number;
  lowerBound: number;
  upperBound: number;
  stdError: number;
  isWithinBound: boolean;
  iteration: number;
}

export interface Alert {
  id: string;
  sessionId: string;
  category: 'sampling_gap' | 'temperature_drift' | 'parameter_divergence';
  severity: 'warning' | 'severe' | 'fatal';
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface CorrectionTrace {
  id: string;
  sessionId: string;
  field: string;
  beforeValue: string;
  afterValue: string;
  reason: string;
  timestamp: number;
}

export interface InitialParams {
  ocv: number;
  R0: number;
  R1: number;
  C1: number;
  tau1: number;
}

export interface ParameterBounds {
  ocv: { min: number; max: number };
  R0: { min: number; max: number };
  R1: { min: number; max: number };
  C1: { min: number; max: number };
  tau1: { min: number; max: number };
}

export interface FitResult {
  params: FittingParameter[];
  residuals: number[];
  rSquared: number;
  rmse: number;
  iterations: number;
}

export interface RawDataRecord {
  time: number;
  voltage: number;
  current: number;
  temperature: number;
}

class FittingDatabase extends Dexie {
  sessions!: Table<FittingSession>;
  dataSources!: Table<DataSource>;
  parameters!: Table<FittingParameter>;
  alerts!: Table<Alert>;
  corrections!: Table<CorrectionTrace>;

  constructor() {
    super('BatteryFittingDB');
    this.version(1).stores({
      sessions: 'id, createdAt, status',
      dataSources: 'id, sessionId, type',
      parameters: 'id, sessionId, name',
      alerts: 'id, sessionId, severity',
      corrections: 'id, sessionId, field',
    });
  }
}

const db = new FittingDatabase();

export const lmFit = (
  times: number[],
  voltages: number[],
  currents: number[],
  initialParams: InitialParams,
  bounds: ParameterBounds,
  onProgress?: (iteration: number, params: InitialParams) => void
): FitResult => {
  const params = { ...initialParams };
  const residuals: number[] = [];
  let lambda = 0.01;
  let iteration = 0;
  const maxIterations = 100;
  const tolerance = 1e-6;
  let prevChiSq = Infinity;

  const model = (t: number, i: number, p: InitialParams): number => {
    return p.tau1 > 0
      ? 3.7 - i * p.R0 - i * p.R1 * (1 - Math.exp(-t / p.tau1))
      : 3.7 - i * p.R0 - i * p.R1;
  };

  const calculateResiduals = (p: InitialParams): number[] => {
    return times.map((t, idx) => voltages[idx] - model(t, currents[idx], p));
  };

  const calculateChiSq = (res: number[]): number => {
    return res.reduce((sum, r) => sum + r * r, 0);
  };

  const clampParams = (p: InitialParams): InitialParams => ({
    ocv: Math.max(bounds.ocv.min, Math.min(bounds.ocv.max, p.ocv)),
    R0: Math.max(bounds.R0.min, Math.min(bounds.R0.max, p.R0)),
    R1: Math.max(bounds.R1.min, Math.min(bounds.R1.max, p.R1)),
    C1: Math.max(bounds.C1.min, Math.min(bounds.C1.max, p.C1)),
    tau1: Math.max(bounds.tau1.min, Math.min(bounds.tau1.max, p.tau1)),
  });

  while (iteration < maxIterations) {
    const res = calculateResiduals(params);
    const chiSq = calculateChiSq(res);

    if (iteration > 0 && Math.abs((prevChiSq - chiSq) / prevChiSq) < tolerance) {
      break;
    }

    prevChiSq = chiSq;

    const jacobian: number[][] = times.map((t, idx) => {
      const i = currents[idx];
      const expTerm = params.tau1 > 0 ? Math.exp(-t / params.tau1) : 0;
      const dR0 = -i;
      const dR1 = -i * (1 - expTerm);
      const dTau1 = params.tau1 > 0 ? -i * params.R1 * t * expTerm / (params.tau1 * params.tau1) : 0;
      const dC1 = params.C1 > 0 ? dTau1 * params.R1 : 0;
      return [dR0, dR1, dC1, dTau1];
    });

    const jtj: number[][] = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const jtr: number[] = [0, 0, 0, 0];

    for (let i = 0; i < times.length; i++) {
      for (let r = 0; r < 4; r++) {
        jtr[r] += jacobian[i][r] * res[i];
        for (let c = 0; c < 4; c++) {
          jtj[r][c] += jacobian[i][r] * jacobian[i][c];
        }
      }
    }

    for (let i = 0; i < 4; i++) {
      jtj[i][i] *= 1 + lambda;
    }

    const det =
      jtj[0][0] * (jtj[1][1] * (jtj[2][2] * jtj[3][3] - jtj[2][3] * jtj[3][2]) -
        jtj[1][2] * (jtj[2][1] * jtj[3][3] - jtj[2][3] * jtj[3][1]) +
        jtj[1][3] * (jtj[2][1] * jtj[3][2] - jtj[2][2] * jtj[3][1])) -
      jtj[0][1] * (jtj[1][0] * (jtj[2][2] * jtj[3][3] - jtj[2][3] * jtj[3][2]) -
        jtj[1][2] * (jtj[2][0] * jtj[3][3] - jtj[2][3] * jtj[3][0]) +
        jtj[1][3] * (jtj[2][0] * jtj[3][2] - jtj[2][2] * jtj[3][0])) +
      jtj[0][2] * (jtj[1][0] * (jtj[2][1] * jtj[3][3] - jtj[2][3] * jtj[3][1]) -
        jtj[1][1] * (jtj[2][0] * jtj[3][3] - jtj[2][3] * jtj[3][0]) +
        jtj[1][3] * (jtj[2][0] * jtj[3][1] - jtj[2][1] * jtj[3][0])) -
      jtj[0][3] * (jtj[1][0] * (jtj[2][1] * jtj[3][2] - jtj[2][2] * jtj[3][1]) -
        jtj[1][1] * (jtj[2][0] * jtj[3][2] - jtj[2][2] * jtj[3][0]) +
        jtj[1][2] * (jtj[2][0] * jtj[3][1] - jtj[2][1] * jtj[3][0]));

    if (Math.abs(det) < 1e-15) {
      lambda *= 10;
      iteration++;
      continue;
    }

    const inv = (m: number[][]): number[][] => {
      const n = m.length;
      const aug = m.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))]);
      for (let i = 0; i < n; i++) {
        let pivot = i;
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(aug[j][i]) > Math.abs(aug[pivot][i])) pivot = j;
        }
        [aug[i], aug[pivot]] = [aug[pivot], aug[i]];
        const div = aug[i][i];
        for (let j = i; j < 2 * n; j++) aug[i][j] /= div;
        for (let j = 0; j < n; j++) {
          if (j !== i) {
            const factor = aug[j][i];
            for (let k = i; k < 2 * n; k++) aug[j][k] -= factor * aug[i][k];
          }
        }
      }
      return aug.map(row => row.slice(n));
    };

    const jtjInv = inv(jtj);
    const delta = jtjInv.map((row, i) => row.reduce((sum, val, j) => sum + val * jtr[j], 0));

    const newParams = clampParams({
      ocv: params.ocv,
      R0: params.R0 + delta[0],
      R1: params.R1 + delta[1],
      C1: params.C1 + delta[2],
      tau1: params.tau1 + delta[3],
    });

    const newRes = calculateResiduals(newParams);
    const newChiSq = calculateChiSq(newRes);

    if (newChiSq < chiSq) {
      Object.assign(params, newParams);
      lambda /= 10;
    } else {
      lambda *= 10;
    }

    iteration++;
    onProgress?.(iteration, { ...params });
  }

  const finalResiduals = calculateResiduals(params);
  const ssTotal = voltages.reduce((sum, v) => {
    const mean = voltages.reduce((a, b) => a + b, 0) / voltages.length;
    return sum + (v - mean) ** 2;
  }, 0);
  const ssRes = calculateChiSq(finalResiduals);
  const rSquared = 1 - ssRes / ssTotal;
  const rmse = Math.sqrt(ssRes / times.length);

  const paramNames: (keyof InitialParams)[] = ['R0', 'R1', 'C1', 'tau1'];
  const fittedParams: FittingParameter[] = paramNames.map(name => ({
    id: nanoid(),
    sessionId: '',
    name,
    value: params[name],
    lowerBound: bounds[name].min,
    upperBound: bounds[name].max,
    stdError: Math.sqrt(Math.abs(ssRes / (times.length - 4))) * 0.01,
    isWithinBound: params[name] >= bounds[name].min && params[name] <= bounds[name].max,
    iteration,
  }));

  return {
    params: fittedParams,
    residuals: finalResiduals,
    rSquared,
    rmse,
    iterations: iteration,
  };
};

interface FittingState {
  currentSession: FittingSession | null;
  times: number[];
  voltages: number[];
  currents: number[];
  temperatures: number[];
  rawData: RawDataRecord[];
  samplingIntervalMs: number;
  initialParams: InitialParams;
  parameterBounds: ParameterBounds;
  fittedParams: FittingParameter[];
  residuals: number[];
  alerts: Alert[];
  corrections: CorrectionTrace[];
  dataSources: DataSource[];
  isFitting: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';

  importData: (data: RawDataRecord[], sourceLabel: string, fileName?: string) => void;
  setSamplingInterval: (interval: number, reason: string) => void;
  setInitialParams: (params: Partial<InitialParams>, reason: string) => void;
  setParameterBounds: (bounds: Partial<ParameterBounds>) => void;
  runFitting: () => Promise<void>;
  saveCurrentSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  clearAlerts: () => void;
  resetState: () => void;
}

const defaultInitialParams: InitialParams = {
  ocv: 3.7,
  R0: 0.01,
  R1: 0.02,
  C1: 1000,
  tau1: 20,
};

const defaultParameterBounds: ParameterBounds = {
  ocv: { min: 2.5, max: 4.2 },
  R0: { min: 0.001, max: 0.1 },
  R1: { min: 0.001, max: 0.1 },
  C1: { min: 100, max: 10000 },
  tau1: { min: 1, max: 100 },
};

export const useFittingStore = create<FittingState>((set, get) => ({
  currentSession: null,
  times: [],
  voltages: [],
  currents: [],
  temperatures: [],
  rawData: [],
  samplingIntervalMs: 1000,
  initialParams: { ...defaultInitialParams },
  parameterBounds: { ...defaultParameterBounds },
  fittedParams: [],
  residuals: [],
  alerts: [],
  corrections: [],
  dataSources: [],
  isFitting: false,
  status: 'idle',

  importData: (data, sourceLabel, fileName) => {
    const sessionId = nanoid();
    const times = data.map(d => d.time);
    const voltages = data.map(d => d.voltage);
    const currents = data.map(d => d.current);
    const temperatures = data.map(d => d.temperature);

    const dataSource: DataSource = {
      id: nanoid(),
      sessionId,
      type: 'voltage',
      sourceLabel,
      fileName,
      timestamp: Date.now(),
      rawData: JSON.stringify(data),
      correctionLog: '原始数据导入',
    };

    const newAlerts: Alert[] = [];

    for (let i = 1; i < times.length; i++) {
      const gap = times[i] - times[i - 1];
      const expectedGap = get().samplingIntervalMs / 1000;
      if (gap > 2 * expectedGap) {
        newAlerts.push({
          id: nanoid(),
          sessionId,
          category: 'sampling_gap',
          severity: gap > 5 * expectedGap ? 'severe' : 'warning',
          message: `采样缺口检测: 第${i}点间隔${gap.toFixed(2)}s, 预期${expectedGap}s`,
          timestamp: Date.now(),
          resolved: false,
        });
      }
    }

    const windowSize = 30;
    for (let i = windowSize; i < temperatures.length; i++) {
      const windowTemps = temperatures.slice(i - windowSize, i);
      const tempChange = Math.abs(windowTemps[windowTemps.length - 1] - windowTemps[0]);
      const timeSpan = times[i] - times[i - windowSize];
      const rate = tempChange / (timeSpan / 60);
      if (rate > 0.5) {
        newAlerts.push({
          id: nanoid(),
          sessionId,
          category: 'temperature_drift',
          severity: rate > 1.0 ? 'severe' : 'warning',
          message: `温度漂移检测: 第${i}点附近变化率${rate.toFixed(2)}°C/min`,
          timestamp: Date.now(),
          resolved: false,
        });
      }
    }

    const session: FittingSession = {
      id: sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: newAlerts.length === 0 ? 'normal' : newAlerts.some(a => a.severity === 'severe') ? 'critical' : 'warning',
      rSquared: 0,
      rmse: 0,
      sampleCount: data.length,
      temperatureMin: Math.min(...temperatures),
      temperatureMax: Math.max(...temperatures),
      samplingIntervalMs: get().samplingIntervalMs,
    };

    set({
      currentSession: session,
      times,
      voltages,
      currents,
      temperatures,
      rawData: data,
      alerts: newAlerts,
      dataSources: [dataSource],
      status: 'success',
    });
  },

  setSamplingInterval: (interval, reason) => {
    const state = get();
    const correction: CorrectionTrace = {
      id: nanoid(),
      sessionId: state.currentSession?.id || nanoid(),
      field: 'samplingIntervalMs',
      beforeValue: String(state.samplingIntervalMs),
      afterValue: String(interval),
      reason,
      timestamp: Date.now(),
    };
    set({
      samplingIntervalMs: interval,
      corrections: [...state.corrections, correction],
    });
  },

  setInitialParams: (params, reason) => {
    const state = get();
    const newParams = { ...state.initialParams, ...params };
    const corrections: CorrectionTrace[] = Object.entries(params).map(([key, value]) => ({
      id: nanoid(),
      sessionId: state.currentSession?.id || nanoid(),
      field: `initialParams.${key}`,
      beforeValue: String(state.initialParams[key as keyof InitialParams]),
      afterValue: String(value),
      reason,
      timestamp: Date.now(),
    }));
    set({
      initialParams: newParams,
      corrections: [...state.corrections, ...corrections],
    });
  },

  setParameterBounds: (bounds) => {
    const state = get();
    set({
      parameterBounds: { ...state.parameterBounds, ...bounds },
    });
  },

  runFitting: async () => {
    const state = get();
    if (state.times.length === 0) {
      set({ status: 'error' });
      return;
    }

    set({ isFitting: true, status: 'loading' });

    try {
      const result = await new Promise<FitResult>((resolve) => {
        setTimeout(() => {
          const fitResult = lmFit(
            state.times,
            state.voltages,
            state.currents,
            state.initialParams,
            state.parameterBounds
          );
          resolve(fitResult);
        }, 100);
      });

      const sessionId = state.currentSession?.id || nanoid();
      const paramsWithSessionId = result.params.map(p => ({ ...p, sessionId }));

      const divergenceAlerts: Alert[] = paramsWithSessionId
        .filter(p => !p.isWithinBound)
        .map(p => ({
          id: nanoid(),
          sessionId,
          category: 'parameter_divergence' as const,
          severity: 'fatal' as const,
          message: `参数${p.name}超出边界: 值${p.value.toExponential(4)}, 边界[${p.lowerBound}, ${p.upperBound}]`,
          timestamp: Date.now(),
          resolved: false,
        }));

      const allAlerts = [...state.alerts, ...divergenceAlerts];
      const newStatus = allAlerts.length === 0
        ? 'normal'
        : allAlerts.some(a => a.severity === 'fatal' || a.severity === 'severe')
          ? 'critical'
          : 'warning';

      const updatedSession: FittingSession = {
        ...state.currentSession!,
        id: sessionId,
        updatedAt: Date.now(),
        status: newStatus,
        rSquared: result.rSquared,
        rmse: result.rmse,
        samplingIntervalMs: state.samplingIntervalMs,
      };

      set({
        currentSession: updatedSession,
        fittedParams: paramsWithSessionId,
        residuals: result.residuals,
        alerts: allAlerts,
        isFitting: false,
        status: 'success',
      });

      await get().saveCurrentSession();
    } catch (error) {
      set({
        isFitting: false,
        status: 'error',
      });
    }
  },

  saveCurrentSession: async () => {
    const state = get();
    if (!state.currentSession) return;

    try {
      await db.transaction('rw', [db.sessions, db.dataSources, db.parameters, db.alerts, db.corrections], async () => {
        await db.sessions.put(state.currentSession!);
        await db.dataSources.bulkPut(state.dataSources);
        await db.parameters.bulkPut(state.fittedParams);
        await db.alerts.bulkPut(state.alerts);
        await db.corrections.bulkPut(state.corrections);
      });
    } catch (error) {
      console.error('保存会话失败:', error);
    }
  },

  loadSession: async (sessionId: string) => {
    set({ status: 'loading' });

    try {
      const [session, dataSources, parameters, alerts, corrections] = await Promise.all([
        db.sessions.get(sessionId),
        db.dataSources.where('sessionId').equals(sessionId).toArray(),
        db.parameters.where('sessionId').equals(sessionId).toArray(),
        db.alerts.where('sessionId').equals(sessionId).toArray(),
        db.corrections.where('sessionId').equals(sessionId).toArray(),
      ]);

      if (!session) {
        set({ status: 'error' });
        return;
      }

      const rawData = dataSources.length > 0
        ? JSON.parse(dataSources[0].rawData) as RawDataRecord[]
        : [];

      set({
        currentSession: session,
        times: rawData.map(d => d.time),
        voltages: rawData.map(d => d.voltage),
        currents: rawData.map(d => d.current),
        temperatures: rawData.map(d => d.temperature),
        rawData,
        samplingIntervalMs: session.samplingIntervalMs,
        fittedParams: parameters,
        residuals: [],
        alerts,
        corrections,
        dataSources,
        status: 'success',
      });
    } catch (error) {
      console.error('加载会话失败:', error);
      set({ status: 'error' });
    }
  },

  clearAlerts: () => {
    set({ alerts: [] });
  },

  resetState: () => {
    set({
      currentSession: null,
      times: [],
      voltages: [],
      currents: [],
      temperatures: [],
      rawData: [],
      samplingIntervalMs: 1000,
      initialParams: { ...defaultInitialParams },
      parameterBounds: { ...defaultParameterBounds },
      fittedParams: [],
      residuals: [],
      alerts: [],
      corrections: [],
      dataSources: [],
      isFitting: false,
      status: 'idle',
    });
  },
}));

export { db };
