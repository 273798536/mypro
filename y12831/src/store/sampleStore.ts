import { create } from 'zustand';
import type { Sample, ReviewRecord, HistoryVersion, BoundaryNote, QualityStatus, ReviewStatus, OperationType, BoundaryType } from '@/types';
import { samples as initialSamples, currentUser } from '@/data/samples';
import { reviewRecords as initialRecords, historyVersions as initialVersions, boundaryNotes as initialNotes } from '@/data/reviewRecords';
import { diffAnalysisData, diffImpactSummary } from '@/data/diffAnalysis';
import { generateId } from '@/utils/formatters';

interface SampleStore {
  samples: Sample[];
  reviewRecords: ReviewRecord[];
  historyVersions: HistoryVersion[];
  boundaryNotes: BoundaryNote[];
  
  getSampleById: (id: string) => Sample | undefined;
  getReviewRecordsBySampleId: (sampleId: string) => ReviewRecord[];
  getHistoryVersionsBySampleId: (sampleId: string) => HistoryVersion[];
  getBoundaryNotesBySampleId: (sampleId: string) => BoundaryNote[];
  getDiffAnalysis: (sampleId: string) => { before: typeof diffAnalysisData[0] | undefined; after: typeof diffAnalysisData[0] | undefined; impact: typeof diffImpactSummary[string] | undefined };
  
  modifyGroup: (sampleId: string, newGroup: string, reason: string, comment: string) => void;
  modifyQualityStatus: (sampleId: string, newStatus: QualityStatus, reason: string, comment: string) => void;
  modifyReviewStatus: (sampleId: string, newStatus: ReviewStatus, reason: string, comment: string) => void;
  addBoundaryNote: (sampleId: string, boundaryType: BoundaryType, explanation: string) => void;
  confirmSample: (sampleId: string, comment: string) => void;
  rejectSample: (sampleId: string, comment: string) => void;
  revertToVersion: (sampleId: string, versionId: string, reason: string) => void;
  
  getSamplesByBatchId: (batchId: string) => Sample[];
  filterSamples: (filters: { batchId?: string; qualityStatus?: QualityStatus; reviewStatus?: ReviewStatus; modifier?: string }) => Sample[];
}

export const useSampleStore = create<SampleStore>((set, get) => ({
  samples: initialSamples,
  reviewRecords: initialRecords,
  historyVersions: initialVersions,
  boundaryNotes: initialNotes,
  
  getSampleById: (id) => get().samples.find(s => s.id === id),
  
  getReviewRecordsBySampleId: (sampleId) => 
    get().reviewRecords.filter(r => r.sampleId === sampleId).sort((a, b) => 
      new Date(b.operateTime).getTime() - new Date(a.operateTime).getTime()
    ),
  
  getHistoryVersionsBySampleId: (sampleId) => 
    get().historyVersions.filter(v => v.sampleId === sampleId).sort((a, b) => b.version - a.version),
  
  getBoundaryNotesBySampleId: (sampleId) => 
    get().boundaryNotes.filter(n => n.sampleId === sampleId),
  
  getDiffAnalysis: (sampleId) => {
    const before = diffAnalysisData.find(d => d.sampleId === sampleId && d.versionTag === 'before');
    const after = diffAnalysisData.find(d => d.sampleId === sampleId && d.versionTag === 'after');
    const impact = diffImpactSummary[sampleId as keyof typeof diffImpactSummary];
    return { before, after, impact };
  },
  
  modifyGroup: (sampleId, newGroup, reason, comment) => {
    const sample = get().getSampleById(sampleId);
    if (!sample) return;
    
    const oldGroup = sample.groupName;
    if (oldGroup === newGroup) return;
    
    const record: ReviewRecord = {
      id: generateId('r'),
      sampleId,
      operationType: 'modify_group' as OperationType,
      operator: currentUser.name,
      operateTime: new Date(),
      reason,
      oldGroup,
      newGroup,
      comment,
    };
    
    const updatedSample: Sample = {
      ...sample,
      groupName: newGroup,
      reviewStatus: 'reviewing' as ReviewStatus,
      lastModified: new Date(),
      lastModifier: currentUser.name,
    };
    
    const versions = get().getHistoryVersionsBySampleId(sampleId);
    const newVersion: HistoryVersion = {
      id: generateId('v'),
      sampleId,
      reviewRecordId: record.id,
      version: versions.length > 0 ? versions[0].version + 1 : 1,
      snapshotTime: new Date(),
      snapshotData: updatedSample,
    };
    
    set(state => ({
      samples: state.samples.map(s => s.id === sampleId ? updatedSample : s),
      reviewRecords: [...state.reviewRecords, record],
      historyVersions: [...state.historyVersions, newVersion],
    }));
  },
  
  modifyQualityStatus: (sampleId, newStatus, reason, comment) => {
    const sample = get().getSampleById(sampleId);
    if (!sample) return;
    
    const oldStatus = sample.qualityStatus;
    if (oldStatus === newStatus) return;
    
    const record: ReviewRecord = {
      id: generateId('r'),
      sampleId,
      operationType: 'modify_quality' as OperationType,
      operator: currentUser.name,
      operateTime: new Date(),
      reason,
      oldStatus,
      newStatus,
      comment,
    };
    
    const updatedSample: Sample = {
      ...sample,
      qualityStatus: newStatus,
      reviewStatus: 'reviewing' as ReviewStatus,
      lastModified: new Date(),
      lastModifier: currentUser.name,
    };
    
    const versions = get().getHistoryVersionsBySampleId(sampleId);
    const newVersion: HistoryVersion = {
      id: generateId('v'),
      sampleId,
      reviewRecordId: record.id,
      version: versions.length > 0 ? versions[0].version + 1 : 1,
      snapshotTime: new Date(),
      snapshotData: updatedSample,
    };
    
    set(state => ({
      samples: state.samples.map(s => s.id === sampleId ? updatedSample : s),
      reviewRecords: [...state.reviewRecords, record],
      historyVersions: [...state.historyVersions, newVersion],
    }));
  },
  
  modifyReviewStatus: (sampleId, newStatus, reason, comment) => {
    const sample = get().getSampleById(sampleId);
    if (!sample) return;
    
    const oldStatus = sample.reviewStatus;
    if (oldStatus === newStatus) return;
    
    const record: ReviewRecord = {
      id: generateId('r'),
      sampleId,
      operationType: 'add_note' as OperationType,
      operator: currentUser.name,
      operateTime: new Date(),
      reason,
      oldStatus,
      newStatus,
      comment,
    };
    
    const updatedSample: Sample = {
      ...sample,
      reviewStatus: newStatus,
      lastModified: new Date(),
      lastModifier: currentUser.name,
    };
    
    set(state => ({
      samples: state.samples.map(s => s.id === sampleId ? updatedSample : s),
      reviewRecords: [...state.reviewRecords, record],
    }));
  },
  
  addBoundaryNote: (sampleId, boundaryType, explanation) => {
    const sample = get().getSampleById(sampleId);
    if (!sample) return;
    
    const note: BoundaryNote = {
      id: generateId('b'),
      sampleId,
      boundaryType,
      explanation,
      creator: currentUser.name,
      createTime: new Date(),
    };
    
    const record: ReviewRecord = {
      id: generateId('r'),
      sampleId,
      operationType: 'add_note' as OperationType,
      operator: currentUser.name,
      operateTime: new Date(),
      reason: '添加边界情况标注',
      comment: `标记为"${boundaryType}"边界情况，已添加解释说明。`,
    };
    
    const updatedSample: Sample = {
      ...sample,
      hasBoundary: true,
      lastModified: new Date(),
      lastModifier: currentUser.name,
    };
    
    const versions = get().getHistoryVersionsBySampleId(sampleId);
    const newVersion: HistoryVersion = {
      id: generateId('v'),
      sampleId,
      reviewRecordId: record.id,
      version: versions.length > 0 ? versions[0].version + 1 : 1,
      snapshotTime: new Date(),
      snapshotData: updatedSample,
    };
    
    set(state => ({
      samples: state.samples.map(s => s.id === sampleId ? updatedSample : s),
      reviewRecords: [...state.reviewRecords, record],
      boundaryNotes: [...state.boundaryNotes, note],
      historyVersions: [...state.historyVersions, newVersion],
    }));
  },
  
  confirmSample: (sampleId, comment) => {
    const sample = get().getSampleById(sampleId);
    if (!sample) return;
    
    const oldStatus = sample.reviewStatus;
    
    const record: ReviewRecord = {
      id: generateId('r'),
      sampleId,
      operationType: 'confirm' as OperationType,
      operator: currentUser.name,
      operateTime: new Date(),
      reason: '复核通过，确认最终分组',
      oldStatus,
      newStatus: 'confirmed' as ReviewStatus,
      comment,
    };
    
    const updatedSample: Sample = {
      ...sample,
      reviewStatus: 'confirmed' as ReviewStatus,
      finalGroup: sample.groupName,
      lastModified: new Date(),
      lastModifier: currentUser.name,
    };
    
    const versions = get().getHistoryVersionsBySampleId(sampleId);
    const newVersion: HistoryVersion = {
      id: generateId('v'),
      sampleId,
      reviewRecordId: record.id,
      version: versions.length > 0 ? versions[0].version + 1 : 1,
      snapshotTime: new Date(),
      snapshotData: updatedSample,
    };
    
    set(state => ({
      samples: state.samples.map(s => s.id === sampleId ? updatedSample : s),
      reviewRecords: [...state.reviewRecords, record],
      historyVersions: [...state.historyVersions, newVersion],
    }));
  },
  
  rejectSample: (sampleId, comment) => {
    const sample = get().getSampleById(sampleId);
    if (!sample) return;
    
    const oldStatus = sample.reviewStatus;
    
    const record: ReviewRecord = {
      id: generateId('r'),
      sampleId,
      operationType: 'reject' as OperationType,
      operator: currentUser.name,
      operateTime: new Date(),
      reason: '复核驳回，需要重新处理',
      oldStatus,
      newStatus: 'rejected' as ReviewStatus,
      comment,
    };
    
    const updatedSample: Sample = {
      ...sample,
      reviewStatus: 'rejected' as ReviewStatus,
      lastModified: new Date(),
      lastModifier: currentUser.name,
    };
    
    set(state => ({
      samples: state.samples.map(s => s.id === sampleId ? updatedSample : s),
      reviewRecords: [...state.reviewRecords, record],
    }));
  },
  
  revertToVersion: (sampleId, versionId, reason) => {
    const version = get().historyVersions.find(v => v.id === versionId);
    if (!version) return;
    
    const sample = get().getSampleById(sampleId);
    if (!sample) return;
    
    const record: ReviewRecord = {
      id: generateId('r'),
      sampleId,
      operationType: 'revert' as OperationType,
      operator: currentUser.name,
      operateTime: new Date(),
      reason,
      oldGroup: sample.groupName,
      newGroup: version.snapshotData.groupName,
      oldStatus: sample.qualityStatus,
      newStatus: version.snapshotData.qualityStatus,
      comment: `回退到版本 ${version.version}`,
    };
    
    const updatedSample: Sample = {
      ...version.snapshotData,
      lastModified: new Date(),
      lastModifier: currentUser.name,
    };
    
    const versions = get().getHistoryVersionsBySampleId(sampleId);
    const newVersion: HistoryVersion = {
      id: generateId('v'),
      sampleId,
      reviewRecordId: record.id,
      version: versions.length > 0 ? versions[0].version + 1 : 1,
      snapshotTime: new Date(),
      snapshotData: updatedSample,
    };
    
    set(state => ({
      samples: state.samples.map(s => s.id === sampleId ? updatedSample : s),
      reviewRecords: [...state.reviewRecords, record],
      historyVersions: [...state.historyVersions, newVersion],
    }));
  },
  
  getSamplesByBatchId: (batchId) => get().samples.filter(s => s.batchId === batchId),
  
  filterSamples: (filters) => {
    let result = [...get().samples];
    if (filters.batchId) {
      result = result.filter(s => s.batchId === filters.batchId);
    }
    if (filters.qualityStatus) {
      result = result.filter(s => s.qualityStatus === filters.qualityStatus);
    }
    if (filters.reviewStatus) {
      result = result.filter(s => s.reviewStatus === filters.reviewStatus);
    }
    if (filters.modifier) {
      result = result.filter(s => s.lastModifier.includes(filters.modifier!));
    }
    return result;
  },
}));
