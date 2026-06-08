import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MeasurementRecord, Viewpoint, ImportResult, ValidationError } from '@/types';
import { getInitialRecords } from '@/utils/mockData';

interface AppState {
  records: MeasurementRecord[];
  selectedRecordId: string | null;
  selectedSliceId: string | null;
  viewpoints: Viewpoint[];
  selectedViewpointId: string | null;
  filter: 'all' | 'valid' | 'invalid' | 'review';
  statusMessage: string | null;
  importDialogVisible: boolean;
  lastImportResult: ImportResult | null;
  setRecords: (records: MeasurementRecord[]) => void;
  addRecord: (record: MeasurementRecord) => void;
  addRecords: (records: MeasurementRecord[]) => void;
  updateRecord: (id: string, updates: Partial<MeasurementRecord>) => void;
  deleteRecord: (id: string) => void;
  selectRecord: (id: string | null) => void;
  selectSlice: (id: string | null) => void;
  addViewpoint: (viewpoint: Viewpoint) => void;
  deleteViewpoint: (id: string) => void;
  selectViewpoint: (id: string | null) => void;
  setFilter: (filter: 'all' | 'valid' | 'invalid' | 'review') => void;
  setStatusMessage: (message: string | null) => void;
  setImportDialogVisible: (visible: boolean) => void;
  setLastImportResult: (result: ImportResult | null) => void;
  pushValidationErrors: (recordId: string, errors: ValidationError[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      records: [],
      selectedRecordId: null,
      selectedSliceId: null,
      viewpoints: [],
      selectedViewpointId: null,
      filter: 'all',
      statusMessage: null,
      importDialogVisible: false,
      lastImportResult: null,

      setRecords: (records) => set({ records }),

      addRecord: (record) =>
        set((state) => ({
          records: [...state.records, record],
        })),

      addRecords: (newRecords) =>
        set((state) => ({
          records: [...state.records, ...newRecords],
        })),

      updateRecord: (id, updates) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      deleteRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
          selectedRecordId: state.selectedRecordId === id ? null : state.selectedRecordId,
          selectedSliceId: state.selectedRecordId === id ? null : state.selectedSliceId,
          viewpoints: state.viewpoints.filter((v) => v.recordId !== id),
        })),

      selectRecord: (id) => set({ selectedRecordId: id, selectedSliceId: null, selectedViewpointId: null }),

      selectSlice: (id) => set({ selectedSliceId: id }),

      addViewpoint: (viewpoint) =>
        set((state) => ({
          viewpoints: [...state.viewpoints, viewpoint],
        })),

      deleteViewpoint: (id) =>
        set((state) => ({
          viewpoints: state.viewpoints.filter((v) => v.id !== id),
          selectedViewpointId: state.selectedViewpointId === id ? null : state.selectedViewpointId,
        })),

      selectViewpoint: (id) => {
        set((state) => {
          const vp = state.viewpoints.find((v) => v.id === id);
          if (vp && vp.recordId && vp.recordId !== state.selectedRecordId) {
            return {
              selectedViewpointId: id,
              selectedRecordId: vp.recordId,
              selectedSliceId: vp.sliceId || null,
            };
          }
          return {
            selectedViewpointId: id,
            selectedSliceId: vp?.sliceId || null,
          };
        });
      },

      setFilter: (filter) => set({ filter }),

      setStatusMessage: (message) => set({ statusMessage: message }),

      setImportDialogVisible: (visible) => set({ importDialogVisible: visible }),

      setLastImportResult: (result) => set({ lastImportResult: result }),

      pushValidationErrors: (recordId, errors) =>
        set((state) => ({
          records: state.records.map((r) => {
            if (r.id !== recordId) return r;
            const allErrors = [...r.errors, ...errors];
            const hasErrors = allErrors.some((e) => e.severity === 'error');
            const hasWarnings = allErrors.some((e) => e.severity === 'warning');
            let status: 'valid' | 'invalid' | 'review' = 'valid';
            if (hasErrors) status = 'invalid';
            else if (hasWarnings) status = 'review';
            return { ...r, errors: allErrors, status };
          }),
        })),
    }),
    {
      name: 'nmr-slicer-storage',
      onRehydrateStorage: () => (state) => {
        if (state && state.records.length === 0) {
          state.setRecords(getInitialRecords());
        }
      },
    }
  )
);
