import { create } from 'zustand';
import { ReviewEntry, ReviewBatch, ConsistencyReport, ExportOptions } from '../types/review';
import { DataStatus, NextStep, ReviewEntryType, QualityIssueType, QUALITY_ISSUE_LABELS, TaskStatus } from '../types/common';
import { useTaskStore } from './useTaskStore';
import { checkTideDataQuality, checkWaterDataQuality } from '../core/dataQuality';
import { generateMockTideData } from '../data/mockTideData';
import { generateMockWaterData } from '../data/mockWaterData';
import { generateConsistencyReport, checkTideDataConsistency } from '../core/consistency';

interface ReviewState {
  reviewBatch: ReviewBatch | null;
  consistencyReport: ConsistencyReport | null;
  isLoading: boolean;
  exportOptions: ExportOptions;

  loadReviewBatch: (taskId: string) => void;
  updateEntryStatus: (entryId: string, status: DataStatus, note?: string) => void;
  getNextStepSuggestion: (issueType: QualityIssueType) => NextStep;
  completeReview: (taskId: string) => void;
  runConsistencyCheck: (taskId: string) => void;
  resolveConsistencyIssue: (issueId: string, resolution: 'use_display' | 'use_calculated') => void;
  setExportOption: <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => void;
}

let entryIdCounter = 0;

function generateEntryId(): string {
  return `review_entry_${Date.now()}_${++entryIdCounter}`;
}

export const useReviewStore = create<ReviewState>((set) => ({
  reviewBatch: null,
  consistencyReport: null,
  isLoading: false,
  exportOptions: {
    includeRawData: true,
    includeCalculatedData: true,
    includeQualityReport: true,
    includeReviewLogs: true,
    format: 'excel',
  },

  loadReviewBatch: (taskId) => {
    const tideData = generateMockTideData(taskId);
    const waterData = generateMockWaterData(taskId);
    const tideQuality = checkTideDataQuality(tideData);
    const waterQuality = checkWaterDataQuality(waterData);

    const allIssues = [...tideQuality.issues, ...waterQuality.issues];

    const riskAlerts: ReviewEntry[] = allIssues
      .filter(i => i.severity === DataStatus.NEED_REVIEW || i.severity === DataStatus.RECOLLECT)
      .slice(0, 3)
      .map(issue => ({
        id: generateEntryId(),
        taskId,
        issueId: issue.id,
        type: ReviewEntryType.RISK_ALERT,
        status: issue.severity,
        data: { issueType: issue.type, description: issue.description },
        issue,
        nextStep: issue.nextStep,
      }));

    const waterRecords: ReviewEntry[] = waterData
      .filter(w => w.overallStatus !== DataStatus.AVAILABLE)
      .slice(0, 5)
      .map(record => ({
        id: generateEntryId(),
        taskId,
        issueId: `water_${record.id}`,
        type: ReviewEntryType.WATER_RECORD,
        status: record.overallStatus,
        data: {
          pointId: record.pointId,
          time: record.recordTime,
          salinity: record.salinity,
          ph: record.ph,
          dissolvedOxygen: record.dissolvedOxygen,
        },
        nextStep: NextStep.SUPPLEMENT_DATA,
      }));

    const duplicates: ReviewEntry[] = tideData
      .filter(t => t.isDuplicate)
      .map(record => ({
        id: generateEntryId(),
        taskId,
        issueId: `dup_${record.id}`,
        type: ReviewEntryType.DUPLICATE,
        status: record.status,
        data: {
          pointId: record.pointId,
          time: record.recordTime,
          tideLevel: record.tideLevel,
          duplicateOf: record.duplicateOf,
        },
        nextStep: NextStep.ADJUST_PARAMS,
      }));

    const allEntries = [...riskAlerts, ...waterRecords, ...duplicates];

    const batch: ReviewBatch = {
      taskId,
      entries: allEntries,
      riskAlerts,
      waterRecords,
      duplicates,
      createdAt: new Date(),
    };

    set({
      reviewBatch: batch,
    });

    useTaskStore.getState().updateTaskStatus(taskId, TaskStatus.PENDING_REVIEW);
  },

  updateEntryStatus: (entryId, status, note) => {
    set(state => {
      if (!state.reviewBatch) return {};

      const updatedEntries = state.reviewBatch.entries.map(e =>
        e.id === entryId
          ? { ...e, status, reviewerNote: note, reviewedAt: new Date(), reviewedBy: '陈场长' }
          : e
      );

      return {
        reviewBatch: {
          ...state.reviewBatch,
          entries: updatedEntries,
          riskAlerts: state.reviewBatch.riskAlerts.map(e =>
            e.id === entryId ? { ...e, status, reviewerNote: note, reviewedAt: new Date(), reviewedBy: '陈场长' } : e
          ),
          waterRecords: state.reviewBatch.waterRecords.map(e =>
            e.id === entryId ? { ...e, status, reviewerNote: note, reviewedAt: new Date(), reviewedBy: '陈场长' } : e
          ),
          duplicates: state.reviewBatch.duplicates.map(e =>
            e.id === entryId ? { ...e, status, reviewerNote: note, reviewedAt: new Date(), reviewedBy: '陈场长' } : e
          ),
        },
      };
    });
  },

  getNextStepSuggestion: (issueType) => {
    return QUALITY_ISSUE_LABELS[issueType]?.defaultNextStep || NextStep.NO_ACTION;
  },

  completeReview: (taskId) => {
    set({ isLoading: true });
    setTimeout(() => {
      set({ isLoading: false });
      useTaskStore.getState().updateTaskStatus(taskId, TaskStatus.REVIEWED);
    }, 300);
  },

  runConsistencyCheck: (taskId) => {
    const tideRecords = generateMockTideData(taskId);
    const displayRecords = tideRecords
      .filter(r => r.tideLevel !== null)
      .map(r => ({ id: r.id, tideLevel: r.tideLevel as number, time: r.recordTime }));
    const calcRecords = displayRecords.map(r => ({ ...r, tideLevel: Math.round(r.tideLevel * 100) / 100 }));

    calcRecords[5].tideLevel = calcRecords[5].tideLevel + 0.01;
    calcRecords[12].tideLevel = calcRecords[12].tideLevel - 0.02;

    const issues = checkTideDataConsistency(displayRecords, calcRecords);
    const report = generateConsistencyReport(issues, displayRecords.length * 2);

    set({ consistencyReport: report });
  },

  resolveConsistencyIssue: (issueId, resolution) => {
    set(state => {
      if (!state.consistencyReport) return {};
      const updatedIssues = state.consistencyReport.issues.map(i =>
        i.id === issueId ? { ...i, resolution, resolved: true } : i
      );
      const report = generateConsistencyReport(updatedIssues, state.consistencyReport.totalChecked);
      return { consistencyReport: report };
    });
  },

  setExportOption: (key, value) => {
    set(state => ({
      exportOptions: { ...state.exportOptions, [key]: value }
    }));
  },
}));
