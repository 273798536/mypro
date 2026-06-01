import { create } from 'zustand';
import {
  MaterialBatch,
  RadiationReading,
  EstimationResult,
  AnomalyRecord,
  AuditTrail,
  SystemConfig,
  EstimationRun,
  FilterCondition,
  ComparisonSummary,
  AnomalyType,
} from '../types';
import { db } from '../db';
import {
  estimateTemperature,
  detectSensorDrift,
  compareRuns,
  validateReading,
} from '../utils/algorithms';
import { DEFAULT_CONFIGS } from '../constants';
import { seedBatches, seedReadings, generateDriftReadings } from '../data/seedData';

interface AppState {
  batches: MaterialBatch[];
  readings: RadiationReading[];
  results: EstimationResult[];
  anomalies: AnomalyRecord[];
  auditTrails: AuditTrail[];
  configs: SystemConfig[];
  runs: EstimationRun[];
  currentRunId: string | null;
  baseRunId: string | null;
  filters: FilterCondition;
  comparisonSummary: ComparisonSummary | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  initData: () => Promise<void>;
  loadAllData: () => Promise<void>;

  addBatch: (batch: Omit<MaterialBatch, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MaterialBatch>;
  updateBatch: (id: string, data: Partial<MaterialBatch>, modifiedBy: string, reason: string) => Promise<MaterialBatch | null>;
  deleteBatch: (id: string) => Promise<void>;

  addReading: (reading: Omit<RadiationReading, 'id' | 'createdAt' | 'updatedAt'>) => Promise<RadiationReading>;
  updateReading: (id: string, data: Partial<RadiationReading>, modifiedBy: string, reason: string) => Promise<RadiationReading | null>;
  bulkAddReadings: (readings: Array<Omit<RadiationReading, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<RadiationReading[]>;
  deleteReading: (id: string) => Promise<void>;

  runEstimation: (runName: string, baseRunId?: string | null, remark?: string) => Promise<EstimationRun | null>;
  setCurrentRun: (runId: string | null) => void;
  setBaseRun: (runId: string | null) => void;
  compareCurrentWithBase: () => Promise<ComparisonSummary | null>;

  reviewAnomaly: (id: string, reviewedBy: string, reviewRemark: string) => Promise<AnomalyRecord | null>;

  updateConfig: (id: string, value: number | string | boolean, modifiedBy: string, reason: string) => Promise<SystemConfig | null>;

  setFilters: (filters: Partial<FilterCondition>) => void;
  resetFilters: () => void;

  getFilteredResults: () => { result: EstimationResult; reading: RadiationReading; batch: MaterialBatch | undefined; anomaly: AnomalyRecord | undefined }[];
  getSensorIds: () => string[];
  getAnomalyTypes: () => AnomalyType[];

  addAuditTrail: (trail: Omit<AuditTrail, 'id' | 'modifiedAt'>) => Promise<AuditTrail>;

  resetAllData: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  batches: [],
  readings: [],
  results: [],
  anomalies: [],
  auditTrails: [],
  configs: [],
  runs: [],
  currentRunId: null,
  baseRunId: null,
  filters: {
    startTime: null,
    endTime: null,
    batchIds: [],
    sensorIds: [],
    anomalyTypes: [],
    showIsolated: true,
  },
  comparisonSummary: null,
  loading: false,
  error: null,
  initialized: false,

  initData: async () => {
    const state = get();
    if (state.initialized) return;

    set({ loading: true, error: null });

    try {
      const [existingConfigs, existingBatches, existingReadings, existingResults, existingRuns] = await Promise.all([
        db.config.getAll(),
        db.batches.getAll(),
        db.readings.getAll(),
        db.results.getAll(),
        db.runs.getAll(),
      ]);

      const resultRunIds = new Set(existingResults.map(r => r.runId));
      const hasValidRun = existingRuns.some(r => resultRunIds.has(r.id));
      const needsReset = (existingRuns.length > 0 && existingResults.length === 0) || 
                         (existingRuns.length > 0 && !hasValidRun) ||
                         (existingResults.length > 0 && existingRuns.length === 0);

      if (needsReset) {
        await Promise.all([
          db.batches.clear(),
          db.readings.clear(),
          db.results.clear(),
          db.anomalies.clear(),
          db.audit.clear(),
          db.runs.clear(),
          db.config.clear(),
        ]);
      }

      const configs = await db.config.getAll();
      if (configs.length === 0) {
        await db.config.bulkCreate(DEFAULT_CONFIGS);
      }

      const batches = await db.batches.getAll();
      let batchMap: Record<string, string> = {};

      if (batches.length === 0) {
        const createdBatches = await Promise.all(
          seedBatches.map((b) => db.batches.create(b))
        );
        batchMap = createdBatches.reduce((acc, b, i) => {
          acc[seedBatches[i].batchNo] = b.id;
          return acc;
        }, {} as Record<string, string>);

        const driftReadings = generateDriftReadings(batchMap['BAT-2024-001'], 30);
        const allReadings = [
          ...driftReadings,
          ...seedReadings.map((r) => ({
            ...r,
            materialBatchId: r.materialBatchId || batchMap[Object.keys(batchMap)[Math.floor(Math.random() * 3)]],
          })),
        ];

        await db.readings.bulkCreate(allReadings);
      }

      await get().loadAllData();

      const runs = get().runs;
      if (runs.length === 0) {
        await get().runEstimation('初始估算运行', null, '系统初始化自动运行');
      }

      set({ initialized: true });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '初始化失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadAllData: async () => {
    set({ loading: true });
    try {
      const [batches, readings, results, anomalies, auditTrails, configs, runs] = await Promise.all([
        db.batches.getAll(),
        db.readings.getAll(),
        db.results.getAll(),
        db.anomalies.getAll(),
        db.audit.getAll(),
        db.config.getAll(),
        db.runs.getAll(),
      ]);

      const resultRunIds = new Set(results.map(r => r.runId));
      const validRun = runs.find(r => resultRunIds.has(r.id));
      const currentRunId = validRun ? validRun.id : (runs.length > 0 ? runs[0].id : null);

      set({
        batches,
        readings,
        results,
        anomalies,
        auditTrails,
        configs,
        runs,
        currentRunId,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载数据失败' });
    } finally {
      set({ loading: false });
    }
  },

  addBatch: async (batch) => {
    const created = await db.batches.create(batch);
    set((state) => ({ batches: [created, ...state.batches] }));
    return created;
  },

  updateBatch: async (id, data, modifiedBy, reason) => {
    const existing = get().batches.find((b) => b.id === id);
    if (!existing) return null;

    const updated = await db.batches.update(id, data);
    if (!updated) return null;

    for (const [key, value] of Object.entries(data)) {
      if (existing[key as keyof MaterialBatch] !== value) {
        await get().addAuditTrail({
          entityType: 'batch',
          entityId: id,
          fieldName: key,
          oldValue: existing[key as keyof MaterialBatch],
          newValue: value,
          modifiedBy,
          reason,
          relatedRunId: get().currentRunId,
        });
      }
    }

    set((state) => ({
      batches: state.batches.map((b) => (b.id === id ? updated : b)),
    }));

    return updated;
  },

  deleteBatch: async (id) => {
    await db.batches.delete(id);
    set((state) => ({
      batches: state.batches.filter((b) => b.id !== id),
    }));
  },

  addReading: async (reading) => {
    const { valid, errors } = validateReading(reading, get().configs);
    if (!valid) {
      throw new Error(errors.join('; '));
    }
    const created = await db.readings.create(reading);
    set((state) => ({ readings: [created, ...state.readings] }));
    return created;
  },

  updateReading: async (id, data, modifiedBy, reason) => {
    const existing = get().readings.find((r) => r.id === id);
    if (!existing) return null;

    const { valid, errors } = validateReading({ ...existing, ...data }, get().configs);
    if (!valid) {
      throw new Error(errors.join('; '));
    }

    const updateData: Partial<RadiationReading> = { ...data };
    if (data.remark && data.remark !== existing.remark) {
      updateData.remarkModifiedAt = new Date();
    }

    const updated = await db.readings.update(id, updateData);
    if (!updated) return null;

    for (const [key, value] of Object.entries(data)) {
      if (existing[key as keyof RadiationReading] !== value) {
        await get().addAuditTrail({
          entityType: 'reading',
          entityId: id,
          fieldName: key,
          oldValue: existing[key as keyof RadiationReading],
          newValue: value,
          modifiedBy,
          reason,
          relatedRunId: get().currentRunId,
        });
      }
    }

    set((state) => ({
      readings: state.readings.map((r) => (r.id === id ? updated : r)),
    }));

    return updated;
  },

  bulkAddReadings: async (readings) => {
    const created = await db.readings.bulkCreate(readings);
    set((state) => ({ readings: [...created, ...state.readings] }));
    return created;
  },

  deleteReading: async (id) => {
    await db.readings.delete(id);
    set((state) => ({
      readings: state.readings.filter((r) => r.id !== id),
    }));
  },

  runEstimation: async (runName, baseRunId = null, remark = '') => {
    set({ loading: true, error: null });

    try {
      const { readings, batches, configs } = get();
      const startTime = new Date();

      const endTime = new Date();
      const run: EstimationRun = await db.runs.create({
        runName,
        startTime,
        endTime,
        recordCount: readings.length,
        anomalyCount: 0,
        parameters: {
          configSnapshot: configs.reduce((acc, c) => {
            acc[c.configKey] = c.configValue;
            return acc;
          }, {} as Record<string, any>),
        },
        baseRunId,
        remark,
      });

      const runId = run.id;

      const resultData: Array<Omit<EstimationResult, 'id' | 'createdAt'>> = [];
      const anomalyData: Array<Omit<AnomalyRecord, 'id' | 'detectedAt' | 'isReviewed' | 'reviewedBy' | 'reviewedAt' | 'reviewRemark'>> = [];

      for (const reading of readings) {
        const batch = batches.find((b) => b.id === reading.materialBatchId);
        const { result, anomaly } = estimateTemperature({
          reading,
          batch,
          runId,
          configs,
        });
        resultData.push(result);

        if (anomaly) {
          anomalyData.push(anomaly);
        }
      }

      const sensorIds = [...new Set(readings.map((r) => r.sensorId))];
      for (const sensorId of sensorIds) {
        const driftAnomaly = detectSensorDrift({ readings, currentSensorId: sensorId, configs });
        if (driftAnomaly) {
          const matchingResult = resultData.find((r) => r.readingId === driftAnomaly.readingId);
          if (matchingResult) {
            matchingResult.anomalyType = driftAnomaly.type;
            matchingResult.isIsolated = true;
            driftAnomaly.resultId = '';
          }

          const existingAnomalyIndex = anomalyData.findIndex(
            (a) => a.readingId === driftAnomaly.readingId
          );
          if (existingAnomalyIndex >= 0) {
            anomalyData[existingAnomalyIndex] = driftAnomaly;
          } else {
            anomalyData.push(driftAnomaly);
          }
        }
      }

      const createdResults = await db.results.bulkCreate(resultData);
      const resultIdMap = new Map(createdResults.map((r, i) => [resultData[i].readingId, r.id]));

      const finalAnomalyData = anomalyData.map((a) => ({
        ...a,
        resultId: resultIdMap.get(a.readingId) || '',
      }));

      await db.anomalies.bulkCreate(finalAnomalyData);

      await db.runs.update(run.id, {
        endTime: new Date(),
        anomalyCount: anomalyData.length,
      });

      await get().loadAllData();
      set({ currentRunId: run.id, baseRunId });

      if (baseRunId) {
        await get().compareCurrentWithBase();
      }

      return run;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '估算运行失败' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  setCurrentRun: (runId) => {
    set({ currentRunId: runId, comparisonSummary: null });
    if (runId) {
      get().compareCurrentWithBase();
    }
  },

  setBaseRun: (runId) => {
    set({ baseRunId: runId, comparisonSummary: null });
    if (runId && get().currentRunId) {
      get().compareCurrentWithBase();
    }
  },

  compareCurrentWithBase: async () => {
    const { currentRunId, baseRunId, results, readings, batches, configs } = get();
    if (!currentRunId || !baseRunId) return null;

    const currentResults = results.filter((r) => r.runId === currentRunId);
    const baseResults = results.filter((r) => r.runId === baseRunId);

    if (currentResults.length === 0 || baseResults.length === 0) return null;

    const summary = compareRuns({
      oldResults: baseResults,
      newResults: currentResults,
      readings,
      batches,
      configs,
    });

    set({ comparisonSummary: summary });
    return summary;
  },

  reviewAnomaly: async (id, reviewedBy, reviewRemark) => {
    const updated = await db.anomalies.review(id, reviewedBy, reviewRemark);
    if (updated) {
      set((state) => ({
        anomalies: state.anomalies.map((a) => (a.id === id ? updated : a)),
      }));
    }
    return updated;
  },

  updateConfig: async (id, value, modifiedBy, reason) => {
    const existing = get().configs.find((c) => c.id === id);
    if (!existing) return null;

    const updated = await db.config.update(id, value, modifiedBy);
    if (!updated) return null;

    await get().addAuditTrail({
      entityType: 'config',
      entityId: id,
      fieldName: existing.configKey,
      oldValue: existing.configValue,
      newValue: value,
      modifiedBy,
      reason,
      relatedRunId: get().currentRunId,
    });

    set((state) => ({
      configs: state.configs.map((c) => (c.id === id ? updated : c)),
    }));

    return updated;
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  resetFilters: () => {
    set({
      filters: {
        startTime: null,
        endTime: null,
        batchIds: [],
        sensorIds: [],
        anomalyTypes: [],
        showIsolated: true,
      },
    });
  },

  getFilteredResults: () => {
    const { currentRunId, results, filters, readings, batches, anomalies } = get();
    if (!currentRunId || results.length === 0) return [];

    const currentResults = results.filter((r) => r.runId === currentRunId);

    return currentResults
      .map((result) => {
        const reading = readings.find((r) => r.id === result.readingId);
        const batch = batches.find((b) => b.id === reading?.materialBatchId);
        const anomaly = anomalies.find((a) => a.resultId === result.id);

        if (!reading) return null;

        if (filters.startTime && new Date(reading.readingTime) < new Date(filters.startTime)) return null;
        if (filters.endTime && new Date(reading.readingTime) > new Date(filters.endTime)) return null;
        if (filters.batchIds.length > 0 && !filters.batchIds.includes(reading.materialBatchId)) return null;
        if (filters.sensorIds.length > 0 && !filters.sensorIds.includes(reading.sensorId)) return null;
        if (filters.anomalyTypes.length > 0) {
          if (!anomaly || !filters.anomalyTypes.includes(anomaly.type)) return null;
        }
        if (!filters.showIsolated && result.isIsolated) return null;

        return { result, reading, batch, anomaly };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => new Date(b.reading.readingTime).getTime() - new Date(a.reading.readingTime).getTime());
  },

  getSensorIds: () => {
    return [...new Set(get().readings.map((r) => r.sensorId))];
  },

  getAnomalyTypes: () => {
    return [...new Set(get().anomalies.map((a) => a.type))];
  },

  addAuditTrail: async (trail) => {
    const created = await db.audit.create(trail);
    set((state) => ({ auditTrails: [created, ...state.auditTrails] }));
    return created;
  },

  resetAllData: async () => {
    set({ loading: true });
    try {
      await Promise.all([
        db.batches.clear(),
        db.readings.clear(),
        db.results.clear(),
        db.anomalies.clear(),
        db.audit.clear(),
        db.config.clear(),
        db.runs.clear(),
      ]);
      set({
        batches: [],
        readings: [],
        results: [],
        anomalies: [],
        auditTrails: [],
        configs: [],
        runs: [],
        currentRunId: null,
        baseRunId: null,
        comparisonSummary: null,
        initialized: false,
      });
      await get().initData();
    } finally {
      set({ loading: false });
    }
  },
}));
