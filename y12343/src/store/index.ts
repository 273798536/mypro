import { create } from 'zustand';
import type {
  Coil,
  MagneticSequence,
  Report,
  HistoryRecord,
  MagneticDataPoint,
  SupplementImpact,
  StoreState,
  StoreActions,
} from '@/types';
import {
  coilStorage,
  magneticStorage,
  reportStorage,
  historyStorage,
} from '@/utils/storage';
import {
  performFullCalculation,
  calculateSupplementImpact,
} from '@/utils/calculator';

type Store = StoreState & StoreActions;

export const useStore = create<Store>((set, get) => ({
  coils: [],
  magneticSequences: [],
  reports: [],
  history: [],
  loading: false,
  error: null,

  loadData: () => {
    try {
      set({ loading: true });
      const coils = coilStorage.getAll();
      const magneticSequences = magneticStorage.getAll();
      const reports = reportStorage.getAll();
      const history = historyStorage.getAll();
      set({ coils, magneticSequences, reports, history, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载数据失败', loading: false });
    }
  },

  addCoil: (coil) => {
    try {
      if (!coil.name?.trim()) {
        throw new Error('线圈名称不能为空');
      }
      if (!coil.turns || coil.turns <= 0) {
        throw new Error('线圈匝数必须大于 0');
      }
      if (!Number.isInteger(coil.turns)) {
        throw new Error('线圈匝数必须是整数');
      }
      if (!coil.crossSection || coil.crossSection <= 0) {
        throw new Error('线圈截面积必须大于 0');
      }
      const newCoil = coilStorage.add(coil);
      set(state => ({ coils: [...state.coils, newCoil] }));
      get().addHistoryRecord({
        operationType: 'create',
        operationDetail: `创建线圈: ${coil.name}（${coil.turns}匝）`,
        affectedItems: ['线圈参数'],
        operator: '当前用户',
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加线圈失败' });
    }
  },

  updateCoil: (id, updates) => {
    try {
      if (updates.name !== undefined && !updates.name.trim()) {
        throw new Error('线圈名称不能为空');
      }
      if (updates.turns !== undefined) {
        if (!updates.turns || updates.turns <= 0) {
          throw new Error('线圈匝数必须大于 0');
        }
        if (!Number.isInteger(updates.turns)) {
          throw new Error('线圈匝数必须是整数');
        }
      }
      if (updates.crossSection !== undefined && (!updates.crossSection || updates.crossSection <= 0)) {
        throw new Error('线圈截面积必须大于 0');
      }
      const updated = coilStorage.update(id, updates);
      if (updated) {
        set(state => ({
          coils: state.coils.map(c => (c.id === id ? updated : c)),
        }));
        const turnChange = updates.turns !== undefined ? `（匝数调整为 ${updates.turns}）` : '';
        get().addHistoryRecord({
          operationType: 'update',
          operationDetail: `更新线圈: ${updates.name || updated.name}${turnChange}`,
          affectedItems: ['线圈参数'],
          operator: '当前用户',
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新线圈失败' });
    }
  },

  deleteCoil: (id) => {
    try {
      const coil = get().coils.find(c => c.id === id);
      const success = coilStorage.delete(id);
      if (success) {
        set(state => ({ coils: state.coils.filter(c => c.id !== id) }));
        get().addHistoryRecord({
          operationType: 'delete',
          operationDetail: `删除线圈: ${coil?.name || id}`,
          affectedItems: ['线圈参数'],
          operator: '当前用户',
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除线圈失败' });
    }
  },

  addMagneticSequence: (sequence) => {
    try {
      const newSequence = magneticStorage.add(sequence);
      set(state => ({ magneticSequences: [...state.magneticSequences, newSequence] }));
      get().addHistoryRecord({
        operationType: 'create',
        operationDetail: `创建磁场序列: ${sequence.name}`,
        affectedItems: ['磁场数据'],
        operator: '当前用户',
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加磁场序列失败' });
    }
  },

  updateMagneticSequence: (id, updates) => {
    try {
      const updated = magneticStorage.update(id, updates);
      if (updated) {
        set(state => ({
          magneticSequences: state.magneticSequences.map(s => (s.id === id ? updated : s)),
        }));
        get().addHistoryRecord({
          operationType: 'update',
          operationDetail: `更新磁场序列: ${updates.name || updated.name}`,
          affectedItems: ['磁场数据'],
          operator: '当前用户',
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新磁场序列失败' });
    }
  },

  deleteMagneticSequence: (id) => {
    try {
      const sequence = get().magneticSequences.find(s => s.id === id);
      const success = magneticStorage.delete(id);
      if (success) {
        set(state => ({ magneticSequences: state.magneticSequences.filter(s => s.id !== id) }));
        get().addHistoryRecord({
          operationType: 'delete',
          operationDetail: `删除磁场序列: ${sequence?.name || id}`,
          affectedItems: ['磁场数据'],
          operator: '当前用户',
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除磁场序列失败' });
    }
  },

  supplementMagneticData: (sequenceId, newPoints) => {
    try {
      const sequence = get().magneticSequences.find(s => s.id === sequenceId);
      if (!sequence) return null;

      const markedPoints = newPoints.map(p => ({ ...p, isSupplemented: true }));
      const allPoints = [...sequence.dataPoints, ...markedPoints].sort(
        (a, b) => a.time - b.time
      );

      const updated = magneticStorage.update(sequenceId, {
        dataPoints: allPoints,
        isSupplemented: true,
        status: allPoints.length > 0 ? 'complete' : 'partial',
      });

      if (!updated) return null;

      set(state => ({
        magneticSequences: state.magneticSequences.map(s => (s.id === sequenceId ? updated : s)),
      }));

      const affectedReports = get().reports.filter(r => r.magneticId === sequenceId);
      const supplementImpacts: SupplementImpact[] = [];

      affectedReports.forEach(report => {
        const coil = get().coils.find(c => c.id === report.coilId);
        if (!coil) return;

        const newCalc = performFullCalculation(coil, updated, report.emfUnit);

        const impacts = calculateSupplementImpact(
          report.calculationResults,
          newCalc.calculationResults
        );

        impacts.forEach(imp => {
          supplementImpacts.push({
            dataPointIndex: imp.index,
            previousEmf: imp.previous,
            newEmf: imp.current,
            deltaEmf: imp.delta,
            affectedReportIds: [report.id],
          });
        });

        get().updateReport(report.id, {
          calculationResults: newCalc.calculationResults,
          anomalies: newCalc.anomalies,
          boundaryCheck: newCalc.boundaryCheck,
          hasMissingTurns: newCalc.hasMissingTurns,
          hasTimeUnitError: newCalc.hasTimeUnitError,
          hasFluxReversal: newCalc.hasFluxReversal,
        });
      });

      get().addHistoryRecord({
        operationType: 'supplement',
        operationDetail: `补录磁场数据点 ${newPoints.length} 个到序列: ${sequence.name}`,
        affectedItems: [`补录影响 ${supplementImpacts.length} 个数据点`],
        operator: '当前用户',
      });

      return supplementImpacts;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '补录数据失败' });
      return null;
    }
  },

  addReport: (report) => {
    try {
      const newReport = reportStorage.add(report);
      set(state => ({ reports: [...state.reports, newReport] }));
      get().addHistoryRecord({
        operationType: 'create',
        operationDetail: `创建测算报告: ${report.name}`,
        affectedItems: ['测算报告'],
        operator: '当前用户',
        reportId: newReport.id,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加报告失败' });
    }
  },

  updateReport: (id, updates) => {
    try {
      const updated = reportStorage.update(id, updates);
      if (updated) {
        set(state => ({
          reports: state.reports.map(r => (r.id === id ? updated : r)),
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新报告失败' });
    }
  },

  deleteReport: (id) => {
    try {
      const report = get().reports.find(r => r.id === id);
      const success = reportStorage.delete(id);
      if (success) {
        set(state => ({ reports: state.reports.filter(r => r.id !== id) }));
        get().addHistoryRecord({
          operationType: 'delete',
          operationDetail: `删除测算报告: ${report?.name || id}`,
          affectedItems: ['测算报告'],
          operator: '当前用户',
          reportId: id,
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除报告失败' });
    }
  },

  recalculateReport: (reportId) => {
    try {
      const report = get().reports.find(r => r.id === reportId);
      if (!report) return;

      const coil = get().coils.find(c => c.id === report.coilId);
      const sequence = get().magneticSequences.find(s => s.id === report.magneticId);
      
      if (!coil || !sequence) {
        set({ error: '找不到关联数据不完整，无法重新计算' });
        return;
      }

      const newCalc = performFullCalculation(coil, sequence, report.emfUnit);

      get().updateReport(reportId, {
        calculationResults: newCalc.calculationResults,
        anomalies: newCalc.anomalies,
        boundaryCheck: newCalc.boundaryCheck,
        hasMissingTurns: newCalc.hasMissingTurns,
        hasTimeUnitError: newCalc.hasTimeUnitError,
        hasFluxReversal: newCalc.hasFluxReversal,
      });

      get().addHistoryRecord({
        operationType: 'recalculate',
        operationDetail: `重新计算报告: ${report.name}`,
        affectedItems: ['测算报告'],
        operator: '当前用户',
        reportId,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '重新计算失败' });
    }
  },

  addHistoryRecord: (record) => {
    try {
      const newRecord = historyStorage.add(record);
      set(state => ({ history: [newRecord, ...state.history].slice(0, 500) }));
    } catch (error) {
      console.error('添加历史记录失败', error);
    }
  },

  clearError: () => set({ error: null }),
}));
