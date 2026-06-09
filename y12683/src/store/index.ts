import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Tank,
  PointCloudSlice,
  MeasurementRecord,
  Conclusion,
  ImportRecord,
  DuplicateCheckResult,
} from '@/types';
import {
  sampleTanks,
  sampleSlices,
  sampleMeasurements,
  sampleConclusions,
  sampleImportRecords,
} from '@/data/sampleData';
import {
  checkDuplicate,
  mergeSlices,
  replaceSlice,
  generateSliceId,
  generateMeasurementId,
  generateConclusionId,
  generateImportId,
  generateFingerprint,
} from '@/utils/deduplication';

interface AppState {
  tanks: Tank[];
  slices: PointCloudSlice[];
  measurements: MeasurementRecord[];
  conclusions: Conclusion[];
  importRecords: ImportRecord[];
  selectedSliceId: string | null;
  selectedMeasurementId: string | null;
  selectedConclusionId: string | null;
  duplicateCheckResult: DuplicateCheckResult | null;
  pendingSlice: PointCloudSlice | null;

  selectSlice: (id: string | null) => void;
  selectMeasurement: (id: string | null) => void;
  selectConclusion: (id: string | null) => void;

  importSlice: (slice: Omit<PointCloudSlice, 'id' | 'fingerprint' | 'importStatus'>) => {
    status: 'imported' | 'duplicate';
    sliceId?: string;
  };

  resolveDuplicate: (action: 'merge' | 'replace' | 'cancel') => string | null;
  clearDuplicateCheck: () => void;

  addMeasurement: (
    measurement: Omit<MeasurementRecord, 'id' | 'createdAt' | 'updatedAt'>
  ) => string;

  updateMeasurement: (id: string, updates: Partial<MeasurementRecord>) => void;

  addConclusion: (
    conclusion: Omit<Conclusion, 'id' | 'createdAt' | 'updatedAt'>
  ) => string;

  updateConclusion: (id: string, updates: Partial<Conclusion>) => void;

  getMeasurementsBySlice: (sliceId: string) => MeasurementRecord[];
  getConclusionsByMeasurement: (measurementId: string) => Conclusion[];
  getSliceById: (sliceId: string) => PointCloudSlice | undefined;
  getMeasurementById: (measurementId: string) => MeasurementRecord | undefined;
  getConclusionById: (conclusionId: string) => Conclusion | undefined;
  getTankById: (tankId: string) => Tank | undefined;

  resetToSampleData: () => void;
  clearAllData: () => void;
}

const STORAGE_KEY = 'ballast-water-monitoring-store';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tanks: sampleTanks,
      slices: sampleSlices,
      measurements: sampleMeasurements,
      conclusions: sampleConclusions,
      importRecords: sampleImportRecords,
      selectedSliceId: sampleSlices[0]?.id || null,
      selectedMeasurementId: null,
      selectedConclusionId: null,
      duplicateCheckResult: null,
      pendingSlice: null,

      selectSlice: (id) => set({ selectedSliceId: id, selectedMeasurementId: null, selectedConclusionId: null }),
      selectMeasurement: (id) => set({ selectedMeasurementId: id }),
      selectConclusion: (id) => set({ selectedConclusionId: id }),

      importSlice: (sliceData) => {
        const fingerprint = generateFingerprint(
          sliceData.tankId,
          sliceData.timestamp,
          sliceData.pointCount
        );

        const newSlice: PointCloudSlice = {
          ...sliceData,
          id: generateSliceId(),
          fingerprint,
          importStatus: 'new',
        };

        const state = get();
        const duplicateResult = checkDuplicate(newSlice, state.slices);

        if (duplicateResult.isDuplicate) {
          set({
            duplicateCheckResult: duplicateResult,
            pendingSlice: newSlice,
          });
          return { status: 'duplicate' };
        }

        const importRecord: ImportRecord = {
          id: generateImportId(),
          timestamp: new Date().toISOString(),
          fingerprint,
          tankId: sliceData.tankId,
          status: 'success',
          sliceCount: 1,
        };

        set({
          slices: [...state.slices, newSlice],
          importRecords: [importRecord, ...state.importRecords],
          selectedSliceId: newSlice.id,
        });

        return { status: 'imported', sliceId: newSlice.id };
      },

      resolveDuplicate: (action) => {
        const state = get();
        const { pendingSlice, duplicateCheckResult } = state;

        if (!pendingSlice || !duplicateCheckResult?.existingSlice) {
          return null;
        }

        if (action === 'cancel') {
          set({ duplicateCheckResult: null, pendingSlice: null });
          return null;
        }

        let finalSlice: PointCloudSlice;
        let importStatus: 'success' | 'duplicate_detected' = 'success';
        let mergedWith: string | undefined;

        if (action === 'merge') {
          finalSlice = mergeSlices(duplicateCheckResult.existingSlice, pendingSlice);
          importStatus = 'success';
          mergedWith = duplicateCheckResult.existingId;
        } else {
          finalSlice = replaceSlice(duplicateCheckResult.existingSlice, pendingSlice);
        }

        const importRecord: ImportRecord = {
          id: generateImportId(),
          timestamp: new Date().toISOString(),
          fingerprint: pendingSlice.fingerprint,
          tankId: pendingSlice.tankId,
          status: importStatus,
          sliceCount: 1,
          mergedWith,
          message: action === 'merge' ? '合并到已有数据' : '覆盖已有数据',
        };

        set({
          slices: state.slices.map((s) =>
            s.id === duplicateCheckResult.existingId ? finalSlice : s
          ),
          importRecords: [importRecord, ...state.importRecords],
          duplicateCheckResult: null,
          pendingSlice: null,
          selectedSliceId: finalSlice.id,
        });

        return finalSlice.id;
      },

      clearDuplicateCheck: () => set({ duplicateCheckResult: null, pendingSlice: null }),

      addMeasurement: (measurementData) => {
        const now = new Date().toISOString();
        const newMeasurement: MeasurementRecord = {
          ...measurementData,
          id: generateMeasurementId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          measurements: [newMeasurement, ...state.measurements],
          selectedMeasurementId: newMeasurement.id,
        }));

        return newMeasurement.id;
      },

      updateMeasurement: (id, updates) => {
        set((state) => ({
          measurements: state.measurements.map((m) =>
            m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
          ),
        }));

        const relatedConclusions = get().conclusions.filter((c) => c.relatedMeasurementId === id);
        if (relatedConclusions.length > 0) {
          set((state) => ({
            conclusions: state.conclusions.map((c) =>
              c.relatedMeasurementId === id
                ? { ...c, updatedAt: new Date().toISOString() }
                : c
            ),
          }));
        }
      },

      addConclusion: (conclusionData) => {
        const now = new Date().toISOString();
        const newConclusion: Conclusion = {
          ...conclusionData,
          id: generateConclusionId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          conclusions: [newConclusion, ...state.conclusions],
          selectedConclusionId: newConclusion.id,
        }));

        return newConclusion.id;
      },

      updateConclusion: (id, updates) => {
        set((state) => ({
          conclusions: state.conclusions.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      getMeasurementsBySlice: (sliceId) =>
        get().measurements.filter((m) => m.relatedSliceId === sliceId),

      getConclusionsByMeasurement: (measurementId) =>
        get().conclusions.filter((c) => c.relatedMeasurementId === measurementId),

      getSliceById: (sliceId) => get().slices.find((s) => s.id === sliceId),

      getMeasurementById: (measurementId) =>
        get().measurements.find((m) => m.id === measurementId),

      getConclusionById: (conclusionId) =>
        get().conclusions.find((c) => c.id === conclusionId),

      getTankById: (tankId) => get().tanks.find((t) => t.id === tankId),

      resetToSampleData: () =>
        set({
          tanks: sampleTanks,
          slices: sampleSlices,
          measurements: sampleMeasurements,
          conclusions: sampleConclusions,
          importRecords: sampleImportRecords,
          selectedSliceId: sampleSlices[0]?.id || null,
          selectedMeasurementId: null,
          selectedConclusionId: null,
          duplicateCheckResult: null,
          pendingSlice: null,
        }),

      clearAllData: () =>
        set({
          tanks: [],
          slices: [],
          measurements: [],
          conclusions: [],
          importRecords: [],
          selectedSliceId: null,
          selectedMeasurementId: null,
          selectedConclusionId: null,
          duplicateCheckResult: null,
          pendingSlice: null,
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        tanks: state.tanks,
        slices: state.slices,
        measurements: state.measurements,
        conclusions: state.conclusions,
        importRecords: state.importRecords,
      }),
    }
  )
);
