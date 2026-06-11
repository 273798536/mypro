import { create } from 'zustand';
import type { AppState, Batch, Sample, ReviewRecord, LineageNode, Anomaly } from '../types';
import { mockBatch, mockAnomalies, mockLineageNodes } from '../data/batchData';

const initialBatch: Batch = JSON.parse(JSON.stringify(mockBatch));
initialBatch.samples = initialBatch.samples.map(s => ({
  ...s,
  qcMetrics: {
    ...s.qcMetrics,
    gcContent: s.id === 'WH-001' ? 44.8 : s.id === 'WH-002' ? 45.2 : 48.0 + Math.random() * 0.4,
  },
}));

export const useAppStore = create<AppState>((set, get) => ({
  currentBatch: initialBatch,
  selectedSampleId: null,
  selectedMutationId: null,
  anomalies: mockAnomalies,
  reviewHistory: [],
  lineageNodes: mockLineageNodes,

  setCurrentBatch: (batch: Batch) => set({ currentBatch: batch }),

  selectSample: (id: string | null) => set({ selectedSampleId: id }),

  selectMutation: (id: string | null) => set({ selectedMutationId: id }),

  updateSample: (sampleId: string, updates: Partial<Sample>) =>
    set((state) => ({
      currentBatch: {
        ...state.currentBatch,
        samples: state.currentBatch.samples.map((s) =>
          s.id === sampleId ? { ...s, ...updates } : s
        ),
      },
      lineageNodes: state.lineageNodes.map((node) =>
        node.sampleId === sampleId
          ? { ...node, ...(updates.lineageInfo ? updates.lineageInfo : {}) }
          : node
      ),
    })),

  resolveAnomaly: (anomalyId: string, updates: Partial<Anomaly>) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === anomalyId ? { ...a, ...updates, resolved: true } : a
      ),
    })),

  addReviewRecord: (record: ReviewRecord) =>
    set((state) => ({
      reviewHistory: [...state.reviewHistory, record],
    })),

  updateLineageNode: (nodeId: string, updates: Partial<LineageNode>) =>
    set((state) => {
      const sample = state.currentBatch.samples.find(
        (s) => s.lineageInfo.id === nodeId
      );
      if (!sample) return state;

      const updatedNode = { ...sample.lineageInfo, ...updates, version: sample.lineageInfo.version + 1 };
      const updatedSamples = state.currentBatch.samples.map((s) =>
        s.id === sample.id ? { ...s, lineageInfo: updatedNode } : s
      );

      const relatedSampleIds = [...updatedNode.childrenIds];
      if (updatedNode.motherId) relatedSampleIds.push(updatedNode.motherId);
      if (updatedNode.fatherId) relatedSampleIds.push(updatedNode.fatherId);

      const finalSamples = updatedSamples.map((s) => {
        if (relatedSampleIds.includes(s.id) && s.id !== sample.id) {
          return {
            ...s,
            lineageInfo: {
              ...s.lineageInfo,
              needsReview: true,
              reviewReason: `关联节点 ${sample.name} 的系谱信息已更新，请确认`,
            },
          };
        }
        return s;
      });

      const updatedLineageNodes = state.lineageNodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, ...updates, version: node.version + 1 };
        }
        if (relatedSampleIds.includes(node.sampleId) && node.sampleId !== sample.id) {
          return {
            ...node,
            needsReview: true,
            reviewReason: `关联节点 ${sample.name} 的系谱信息已更新，请确认`,
          };
        }
        return node;
      });

      return {
        currentBatch: {
          ...state.currentBatch,
          samples: finalSamples,
        },
        lineageNodes: updatedLineageNodes,
      };
    }),
}));

export const selectCurrentBatch = (state: AppState) => state.currentBatch;
export const selectSelectedSample = (state: AppState) =>
  state.currentBatch.samples.find((s) => s.id === state.selectedSampleId) || null;
export const selectSelectedMutation = (state: AppState) => {
  const sample = selectSelectedSample(state);
  if (!sample || !state.selectedMutationId) return null;
  return sample.mutations.find((m) => m.id === state.selectedMutationId) || null;
};
export const selectAnomalies = (state: AppState) => state.anomalies;
export const selectLineageNodes = (state: AppState) => state.lineageNodes;
export const selectUnresolvedAnomaliesBySuggestedAction = (action: string) => (state: AppState) =>
  state.anomalies.filter((a) => a.suggestedAction === action && !a.resolved);
export const selectReviewHistory = (state: AppState) => state.reviewHistory;
export const selectActions = (state: AppState) => ({
  selectSample: state.selectSample,
  selectMutation: state.selectMutation,
  updateSample: state.updateSample,
  resolveAnomaly: state.resolveAnomaly,
  addReviewRecord: state.addReviewRecord,
  updateLineageNode: state.updateLineageNode,
});
