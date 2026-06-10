import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Sample,
  SampleStatus,
  AuditLog,
  ReviewHistory,
  LocationChange,
  StatSnapshot,
  ActionType,
} from '../../shared/types';
import {
  getInitialSamples,
  getInitialAuditLogs,
  getInitialReviewHistories,
  getInitialLocationChanges,
  getInitialStatSnapshots,
  calculateStats,
} from '../data/mockData';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface SampleStore {
  samples: Sample[];
  auditLogs: AuditLog[];
  reviewHistories: ReviewHistory[];
  locationChanges: LocationChange[];
  statSnapshots: StatSnapshot[];
  currentOperator: string;
  currentBatchNumber: string;
  
  setCurrentOperator: (operator: string) => void;
  
  addAuditLog: (
    sampleId: string,
    action: ActionType,
    fieldChanged: string,
    oldValue: string,
    newValue: string,
    reason: string
  ) => void;
  
  reviewSample: (
    sampleId: string,
    newStatus: SampleStatus,
    opinion: string,
    reason: string
  ) => void;
  
  updateSamplingLocation: (
    sampleId: string,
    newLocation: string,
    reason: string
  ) => void;
  
  manualConfirm: (
    sampleId: string,
    newStatus: SampleStatus,
    reason: string
  ) => void;
  
  rerunBatch: () => void;
  
  supplementSample: (sample: Omit<Sample, 'id' | 'createdAt' | 'updatedAt' | 'batchNumber'>, reason: string) => void;
  
  createStatSnapshot: (runType: 'initial' | 'rerun' | 'supplement') => void;
  
  getSampleById: (id: string) => Sample | undefined;
  getReviewHistoriesBySampleId: (sampleId: string) => ReviewHistory[];
  getLocationChangesBySampleId: (sampleId: string) => LocationChange[];
  
  resetStore: () => void;
}

const getCurrentBatch = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `BATCH-${year}-${month}-001`;
};

export const useSampleStore = create<SampleStore>()(
  persist(
    (set, get) => ({
      samples: getInitialSamples(),
      auditLogs: getInitialAuditLogs(),
      reviewHistories: getInitialReviewHistories(),
      locationChanges: getInitialLocationChanges(),
      statSnapshots: getInitialStatSnapshots(),
      currentOperator: '张管理员',
      currentBatchNumber: getCurrentBatch(),

      setCurrentOperator: (operator) => set({ currentOperator: operator }),

      addAuditLog: (sampleId, action, fieldChanged, oldValue, newValue, reason) => {
        const { currentOperator, auditLogs } = get();
        const newLog: AuditLog = {
          id: generateId(),
          sampleId,
          operator: currentOperator,
          operateTime: new Date().toISOString(),
          action,
          fieldChanged,
          oldValue,
          newValue,
          reason,
        };
        set({ auditLogs: [newLog, ...auditLogs] });
      },

      reviewSample: (sampleId, newStatus, opinion, reason) => {
        const { samples, reviewHistories, addAuditLog } = get();
        const sample = samples.find((s) => s.id === sampleId);
        if (!sample) return;

        const oldStatus = sample.status;
        
        const updatedSamples = samples.map((s) =>
          s.id === sampleId
            ? {
                ...s,
                status: newStatus,
                manualJudge: newStatus,
                updatedAt: new Date().toISOString(),
              }
            : s
        );

        const newHistory: ReviewHistory = {
          id: generateId(),
          sampleId,
          reviewer: get().currentOperator,
          reviewDate: new Date().toISOString(),
          oldStatus,
          newStatus,
          opinion,
          reason,
        };

        set({
          samples: updatedSamples,
          reviewHistories: [newHistory, ...reviewHistories],
        });

        addAuditLog(
          sampleId,
          'review',
          'status',
          oldStatus,
          newStatus,
          reason + (opinion ? ` | 复核意见：${opinion}` : '')
        );

        get().createStatSnapshot('rerun');
      },

      updateSamplingLocation: (sampleId, newLocation, reason) => {
        const { samples, locationChanges, addAuditLog } = get();
        const sample = samples.find((s) => s.id === sampleId);
        if (!sample || sample.samplingLocation === newLocation) return;

        const oldLocation = sample.samplingLocation;
        const oldConclusion = sample.status;

        let newConclusion: SampleStatus = sample.status;
        if (newLocation === '检疫区' && sample.status === 'normal') {
          newConclusion = 'borderline';
        } else if (newLocation === 'SPF区' && sample.status === 'borderline') {
          newConclusion = 'normal';
        }

        const oldStats = calculateStats(samples);
        const updatedSamples = samples.map((s) =>
          s.id === sampleId
            ? {
                ...s,
                samplingLocation: newLocation,
                status: newConclusion,
                updatedAt: new Date().toISOString(),
              }
            : s
        );
        const newStats = calculateStats(updatedSamples);

        const oldGroupStats: Record<string, number> = {
          [oldLocation]: oldStats.byLocation[oldLocation]?.[oldConclusion] || 0,
        };
        const newGroupStats: Record<string, number> = {
          [newLocation]: (newStats.byLocation[newLocation]?.[newConclusion] || 0),
          [oldLocation]: (newStats.byLocation[oldLocation]?.[oldConclusion] || 0),
        };

        const newChange: LocationChange = {
          id: generateId(),
          sampleId,
          oldLocation,
          newLocation,
          oldConclusion,
          newConclusion,
          operator: get().currentOperator,
          changeTime: new Date().toISOString(),
          reason,
          affectedStats: {
            oldGroupStats,
            newGroupStats,
          },
        };

        set({
          samples: updatedSamples,
          locationChanges: [newChange, ...locationChanges],
        });

        addAuditLog(
          sampleId,
          'update_location',
          'samplingLocation',
          oldLocation,
          newLocation,
          reason + (oldConclusion !== newConclusion ? ` | 结论变更：${oldConclusion} → ${newConclusion}` : '')
        );

        get().createStatSnapshot('rerun');
      },

      manualConfirm: (sampleId, newStatus, reason) => {
        const { samples, addAuditLog } = get();
        const sample = samples.find((s) => s.id === sampleId);
        if (!sample) return;

        const oldStatus = sample.status;

        const updatedSamples = samples.map((s) =>
          s.id === sampleId
            ? {
                ...s,
                status: newStatus,
                manualJudge: newStatus,
                updatedAt: new Date().toISOString(),
              }
            : s
        );

        set({ samples: updatedSamples });

        addAuditLog(
          sampleId,
          'manual_confirm',
          'status',
          oldStatus,
          newStatus,
          '人工强制确认：' + reason
        );

        get().createStatSnapshot('rerun');
      },

      rerunBatch: () => {
        const { samples, addAuditLog } = get();
        const newBatchNumber = getCurrentBatch();
        
        const updatedSamples = samples.map((s) => ({
          ...s,
          batchNumber: newBatchNumber,
          updatedAt: new Date().toISOString(),
        }));

        set({
          samples: updatedSamples,
          currentBatchNumber: newBatchNumber,
        });

        samples.forEach((sample) => {
          addAuditLog(
            sample.id,
            'rerun',
            'batchNumber',
            sample.batchNumber,
            newBatchNumber,
            '重复运行提醒批次'
          );
        });

        get().createStatSnapshot('rerun');
      },

      supplementSample: (sampleData, reason) => {
        const { samples, currentBatchNumber, addAuditLog } = get();
        const newSample: Sample = {
          ...sampleData,
          id: generateId(),
          batchNumber: currentBatchNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set({ samples: [...samples, newSample] });

        addAuditLog(
          newSample.id,
          'supplement',
          '样本补录',
          '-',
          sampleData.strainCode,
          reason
        );

        get().createStatSnapshot('supplement');
      },

      createStatSnapshot: (runType) => {
        const { samples, statSnapshots, currentOperator, currentBatchNumber } = get();
        const statsData = calculateStats(samples);
        const previousSnapshot = statSnapshots[0];

        const newSnapshot: StatSnapshot = {
          id: generateId(),
          batchNumber: currentBatchNumber,
          snapshotTime: new Date().toISOString(),
          statsData,
          operator: currentOperator,
          runType,
          previousSnapshotId: previousSnapshot?.id,
        };

        set({ statSnapshots: [newSnapshot, ...statSnapshots] });
      },

      getSampleById: (id) => get().samples.find((s) => s.id === id),
      
      getReviewHistoriesBySampleId: (sampleId) =>
        get().reviewHistories.filter((h) => h.sampleId === sampleId),
      
      getLocationChangesBySampleId: (sampleId) =>
        get().locationChanges.filter((c) => c.sampleId === sampleId),

      resetStore: () => {
        set({
          samples: getInitialSamples(),
          auditLogs: getInitialAuditLogs(),
          reviewHistories: getInitialReviewHistories(),
          locationChanges: getInitialLocationChanges(),
          statSnapshots: getInitialStatSnapshots(),
          currentBatchNumber: getCurrentBatch(),
        });
      },
    }),
    {
      name: 'sample-storage',
      partialize: (state) => ({
        samples: state.samples,
        auditLogs: state.auditLogs,
        reviewHistories: state.reviewHistories,
        locationChanges: state.locationChanges,
        statSnapshots: state.statSnapshots,
        currentBatchNumber: state.currentBatchNumber,
      }),
    }
  )
);
