import { create } from 'zustand';
import type { ReviewTask, WaterQualityAlert, GapItem, SupplementEntry, ProcessOpinion, BuoyRecord, TideRecord, WeatherRecord } from '@/types';
import { createMockReviewTask, computeWithPartialTide, computeSalinityAlert, computeTempAnomalyAlert, generateOpinion } from '@/utils/dataEngine';

interface ReviewStore {
  tasks: ReviewTask[];
  activeTaskId: string | null;
  currentTask: ReviewTask | null;

  createTask: () => string;
  rerunTask: (taskId: string) => void;
  confirmTask: (taskId: string) => void;
  rejectTask: (taskId: string, reason: string) => void;
  supplementGap: (taskId: string, gapId: string, value: number) => void;
  supplementBuoyField: (taskId: string, recordId: string, field: string, value: string) => void;
  setActiveTask: (taskId: string) => void;
  exportReport: (taskId: string) => WaterQualityAlert[];
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  tasks: [],
  activeTaskId: null,
  currentTask: null,

  createTask: () => {
    const task = createMockReviewTask();
    set(state => ({
      tasks: [task, ...state.tasks],
      activeTaskId: task.id,
      currentTask: task,
    }));
    return task.id;
  },

  rerunTask: (taskId: string) => {
    const task = createMockReviewTask();
    const oldTask = get().tasks.find(t => t.id === taskId);
    task.id = taskId;
    task.runCount = (oldTask?.runCount || 0) + 1;
    task.opinion = task.opinion ? { ...task.opinion, runCount: task.runCount } : null;
    set(state => ({
      tasks: state.tasks.map(t => t.id === taskId ? task : t),
      currentTask: state.activeTaskId === taskId ? task : state.currentTask,
    }));
  },

  confirmTask: (taskId: string) => {
    set(state => {
      const updated = state.tasks.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: 'confirmed' as const,
          confirmedAt: new Date().toISOString(),
          opinion: t.opinion ? { ...t.opinion, confirmed: true, confirmedAt: new Date().toISOString() } : null,
        };
      });
      const current = state.activeTaskId === taskId ? updated.find(t => t.id === taskId) || null : state.currentTask;
      return { tasks: updated, currentTask: current };
    });
  },

  rejectTask: (taskId: string, reason: string) => {
    set(state => {
      const updated = state.tasks.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          opinion: t.opinion ? { ...t.opinion, rejected: true, rejectReason: reason } : null,
        };
      });
      const current = state.activeTaskId === taskId ? updated.find(t => t.id === taskId) || null : state.currentTask;
      return { tasks: updated, currentTask: current };
    });
  },

  supplementGap: (taskId: string, gapId: string, value: number) => {
    set(state => {
      const updated = state.tasks.map(t => {
        if (t.id !== taskId) return t;
        const gapItem = t.gapItems.find(g => g.id === gapId);
        const supplementEntry: SupplementEntry = {
          id: `sup-${Date.now()}`,
          timestamp: new Date().toISOString(),
          field: gapItem?.field || 'tideLevel',
          oldValue: '缺失',
          newValue: String(value),
          operator: '运维工程师',
        };

        const newGapItems = t.gapItems.map(g =>
          g.id === gapId ? { ...g, status: 'filled' as const, filledValue: value } : g
        );

        const newTideRecords: TideRecord[] = t.tideRecords.map(tr => {
          const gap = t.gapItems.find(g => g.id === gapId && tr.timestamp === g.timestamp);
          if (gap) return { ...tr, tideLevel: value, isGap: false };
          return tr;
        });

        const newOpinion = generateOpinion(t.weatherRecords, t.buoyRecords, newGapItems.filter(g => g.status === 'pending'), t.alerts);

        return {
          ...t,
          tideRecords: newTideRecords,
          gapItems: newGapItems,
          supplementLog: [...t.supplementLog, supplementEntry],
          opinion: { ...newOpinion, runCount: t.opinion?.runCount || 1 },
        };
      });
      const current = state.activeTaskId === taskId ? updated.find(t => t.id === taskId) || null : state.currentTask;
      return { tasks: updated, currentTask: current };
    });
  },

  supplementBuoyField: (taskId: string, recordId: string, field: string, value: string) => {
    set(state => {
      const updated = state.tasks.map(t => {
        if (t.id !== taskId) return t;

        const supplementEntry: SupplementEntry = {
          id: `sup-${Date.now()}`,
          timestamp: new Date().toISOString(),
          field,
          oldValue: '(异常)',
          newValue: value,
          operator: '运维工程师',
        };

        const newBuoyRecords: BuoyRecord[] = t.buoyRecords.map(br => {
          if (br.id !== recordId) return br;
          if (field === 'waterTemp') {
            const numVal = parseFloat(value);
            return { ...br, waterTemp: numVal, waterTempRaw: `${value}°C`, isAnomaly: false, anomalyReason: undefined };
          }
          return br;
        });

        const newWeatherRecords: WeatherRecord[] = t.weatherRecords.map(wr => {
          if (wr.id !== recordId) return wr;
          if (field === 'windSpeed') {
            const numVal = parseFloat(value);
            return { ...wr, windSpeed: numVal, windSpeedRaw: `${value}m/s`, isAnomaly: false, anomalyReason: undefined, rawNote: undefined };
          }
          return wr;
        });

        const salinityAlert = computeSalinityAlert(newBuoyRecords);
        const tempAlert = computeTempAnomalyAlert(newBuoyRecords);
        const newAlerts: WaterQualityAlert[] = [salinityAlert, tempAlert].filter(Boolean) as WaterQualityAlert[];
        const newOpinion = generateOpinion(newWeatherRecords, newBuoyRecords, t.gapItems.filter(g => g.status === 'pending'), newAlerts);

        return {
          ...t,
          buoyRecords: newBuoyRecords,
          weatherRecords: newWeatherRecords,
          alerts: newAlerts,
          supplementLog: [...t.supplementLog, supplementEntry],
          opinion: { ...newOpinion, runCount: t.opinion?.runCount || 1 },
        };
      });
      const current = state.activeTaskId === taskId ? updated.find(t => t.id === taskId) || null : state.currentTask;
      return { tasks: updated, currentTask: current };
    });
  },

  setActiveTask: (taskId: string) => {
    const task = get().tasks.find(t => t.id === taskId) || null;
    set({ activeTaskId: taskId, currentTask: task });
  },

  exportReport: (taskId: string) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return [];

    const originalAlerts = [...task.alerts];
    const validBuoy = task.buoyRecords.filter(r => !r.isAnomaly);
    const salinityAlert = computeSalinityAlert(validBuoy);
    const tempAlert = computeTempAnomalyAlert(validBuoy);
    const exportAlerts: WaterQualityAlert[] = [salinityAlert, tempAlert].filter(Boolean) as WaterQualityAlert[];

    const mergedAlerts = exportAlerts.map(ea => {
      const original = originalAlerts.find(oa => oa.indicator === ea.indicator);
      if (original && (original.beforeJudgment !== ea.afterJudgment || original.beforeValue !== ea.afterValue)) {
        return {
          ...ea,
          beforeValue: original.beforeValue,
          beforeJudgment: original.beforeJudgment,
          changedByExport: true,
          reason: `报告导出后判断变化：${original.beforeJudgment === 'normal' ? '正常' : original.beforeJudgment === 'warning' ? '预警' : '严重'} → ${ea.afterJudgment === 'normal' ? '正常' : ea.afterJudgment === 'warning' ? '预警' : '严重'}`,
        };
      }
      return ea;
    });

    set(state => {
      const updated = state.tasks.map(t => {
        if (t.id !== taskId) return t;
        return { ...t, alerts: mergedAlerts };
      });
      const current = state.activeTaskId === taskId ? updated.find(t => t.id === taskId) || null : state.currentTask;
      return { tasks: updated, currentTask: current };
    });

    return mergedAlerts;
  },
}));
