import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AnomalyType,
  AvailabilityStatus,
  ImportBatch,
  ImportRawRecord,
  ParamChange,
  ProcessNote,
  SoundRecord,
} from '@/types';
import { mockBatches } from '@/mock/batches';
import { mockRecords } from '@/mock/records';
import { detectAnomaliesForBatch, isSameRecord } from '@/utils/anomalyDetector';
import { parseImportFile } from '@/utils/csvParser';
import { uid } from '@/utils/formatters';
import { generateSoundRays } from '@/mock/hallGeometry';

interface RecordsState {
  initialized: boolean;
  batches: ImportBatch[];
  records: SoundRecord[];
  selectedRecordId: string | null;
  highlightedField: string | null;
  filters: {
    anomalyTypes: AnomalyType[];
    statuses: AvailabilityStatus[];
    onlyWithAnomalies: boolean;
    keyword: string;
    batchIds: string[];
  };
  initializeIfNeeded: () => void;
  importFromFile: (file: File, importName?: string) => Promise<{ batch: ImportBatch; added: number; skipped: number }>;
  importFromRawRecords: (raws: ImportRawRecord[], importName: string) => { batch: ImportBatch; added: number; skipped: number };
  setSelectedRecord: (id: string | null) => void;
  setHighlightedField: (field: string | null) => void;
  toggleAnomalyFilter: (type: AnomalyType) => void;
  toggleStatusFilter: (status: AvailabilityStatus) => void;
  toggleBatchFilter: (batchId: string) => void;
  setOnlyWithAnomalies: (v: boolean) => void;
  setKeyword: (v: string) => void;
  resetFilters: () => void;
  addProcessNote: (recordId: string, note: Omit<ProcessNote, 'id' | 'createdAt'>) => void;
  updateAvailabilityStatus: (recordId: string, status: AvailabilityStatus, reviewer?: string) => void;
  addParamChange: (recordId: string, change: Omit<ParamChange, 'id' | 'changedAt' | 'recordId'>) => void;
  clearAll: () => void;
}

function buildRecordsFromRaw(raws: ImportRawRecord[], batchId: string): SoundRecord[] {
  const list: SoundRecord[] = raws.map((r) => {
    const id = uid('r_');
    return {
      id,
      batchId,
      deviceCode: r.deviceCode,
      deviceCoordinates: r.deviceCoordinates,
      rawRemark: r.rawRemark,
      availabilityStatus: 'review_needed',
      anomalies: [],
      processNotes: [],
      paramChanges: [],
      soundRays: r.soundRays?.length
        ? r.soundRays.map((ray) => ({ ...ray, id: uid('ray_'), recordId: id }))
        : generateSoundRays(id, r.deviceCoordinates.x ?? 0, r.deviceCoordinates.z ?? 0),
      cameraView: r.cameraView ? { ...r.cameraView, id: uid('cv_'), recordId: id } : undefined,
    };
  });
  const anomalyMap = detectAnomaliesForBatch(list);
  return list.map((rec) => ({ ...rec, anomalies: anomalyMap.get(rec.id) ?? [] }));
}

export const useRecordsStore = create<RecordsState>()(
  persist(
    (set, get) => ({
      initialized: false,
      batches: [],
      records: [],
      selectedRecordId: null,
      highlightedField: null,
      filters: {
        anomalyTypes: [],
        statuses: [],
        onlyWithAnomalies: false,
        keyword: '',
        batchIds: [],
      },
      initializeIfNeeded: () => {
        if (get().initialized) return;
        const initialRecords = mockRecords.map((r) => {
          const anomalyMap = detectAnomaliesForBatch(mockRecords);
          return { ...r, anomalies: anomalyMap.get(r.id) ?? r.anomalies };
        });
        set({ initialized: true, batches: mockBatches, records: initialRecords });
      },
      importFromFile: async (file, importName) => {
        const raws = await parseImportFile(file);
        const name = importName ?? file.name.replace(/\.(json|csv)$/i, '');
        return get().importFromRawRecords(raws, name);
      },
      importFromRawRecords: (raws, importName) => {
        const existing = get().records;
        const batchId = uid('b_');
        const candidates = buildRecordsFromRaw(raws, batchId);
        const added: SoundRecord[] = [];
        let skipped = 0;
        candidates.forEach((c) => {
          const dup = existing.find((e) => isSameRecord(e, c));
          if (dup) {
            skipped++;
          } else {
            added.push(c);
          }
        });
        const batch: ImportBatch = {
          id: batchId,
          name: importName,
          importedAt: new Date().toISOString(),
          importedBy: '当前用户',
          recordCount: added.length,
        };
        const allBatches = [batch, ...get().batches];
        const allRecords = [...added, ...existing];
        const anomalyMap = detectAnomaliesForBatch(allRecords);
        const refreshed = allRecords.map((r) => ({ ...r, anomalies: anomalyMap.get(r.id) ?? [] }));
        set({ batches: allBatches, records: refreshed });
        return { batch, added: added.length, skipped };
      },
      setSelectedRecord: (id) => set({ selectedRecordId: id }),
      setHighlightedField: (f) => set({ highlightedField: f }),
      toggleAnomalyFilter: (type) =>
        set((s) => {
          const cur = s.filters.anomalyTypes;
          return { filters: { ...s.filters, anomalyTypes: cur.includes(type) ? cur.filter((t) => t !== type) : [...cur, type] } };
        }),
      toggleStatusFilter: (status) =>
        set((s) => {
          const cur = s.filters.statuses;
          return { filters: { ...s.filters, statuses: cur.includes(status) ? cur.filter((t) => t !== status) : [...cur, status] } };
        }),
      toggleBatchFilter: (batchId) =>
        set((s) => {
          const cur = s.filters.batchIds;
          return { filters: { ...s.filters, batchIds: cur.includes(batchId) ? cur.filter((t) => t !== batchId) : [...cur, batchId] } };
        }),
      setOnlyWithAnomalies: (v) => set((s) => ({ filters: { ...s.filters, onlyWithAnomalies: v } })),
      setKeyword: (v) => set((s) => ({ filters: { ...s.filters, keyword: v } })),
      resetFilters: () =>
        set((s) => ({
          filters: { anomalyTypes: [], statuses: [], onlyWithAnomalies: false, keyword: '', batchIds: [] },
        })),
      addProcessNote: (recordId, note) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  processNotes: [
                    { ...note, id: uid('n_'), createdAt: new Date().toISOString() },
                    ...r.processNotes,
                  ],
                  availabilityStatus: note.statusAfter,
                  reviewedBy: note.author,
                  reviewedAt: new Date().toISOString(),
                }
              : r
          ),
        })),
      updateAvailabilityStatus: (recordId, status, reviewer) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.id === recordId
              ? { ...r, availabilityStatus: status, reviewedBy: reviewer ?? r.reviewedBy, reviewedAt: new Date().toISOString() }
              : r
          ),
        })),
      addParamChange: (recordId, change) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.id === recordId
              ? { ...r, paramChanges: [{ ...change, recordId, id: uid('pc_'), changedAt: new Date().toISOString() }, ...r.paramChanges] }
              : r
          ),
        })),
      clearAll: () =>
        set({
          batches: [],
          records: [],
          selectedRecordId: null,
          highlightedField: null,
          filters: { anomalyTypes: [], statuses: [], onlyWithAnomalies: false, keyword: '', batchIds: [] },
        }),
    }),
    {
      name: 'hall-acoustic-records-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        initialized: state.initialized,
        batches: state.batches,
        records: state.records,
      }),
    }
  )
);
