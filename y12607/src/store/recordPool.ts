import { create } from 'zustand';
import type {
  ScoreRecord,
  LayerRecord,
  HitRecord,
  ProcessNote,
  FilterConditions,
  ImportData,
  AnomalyType,
  RecordStatus,
} from '@/types';
import { mockData } from '@/utils/mockData';
import { detectAnomalies, getAnomalyReason } from '@/utils/anomalyDetector';

interface RecordPoolState {
  scoreRecords: ScoreRecord[];
  layerRecords: LayerRecord[];
  hitRecords: HitRecord[];
  processNotes: ProcessNote[];
  selectedRecordId: string | null;
  filterConditions: FilterConditions;
  isLoaded: boolean;
}

interface Actions {
  loadMockData: () => void;
  importRecords: (data: ImportData) => void;
  setSelectedRecordId: (id: string | null) => void;
  setFilterConditions: (conditions: Partial<FilterConditions>) => void;
  resetFilters: () => void;
  getLayersByRecordId: (recordId: string) => LayerRecord[];
  getHitsByRecordId: (recordId: string) => HitRecord[];
  getProcessNotesByRecordId: (recordId: string) => ProcessNote[];
  getFilteredRecords: () => ScoreRecord[];
  getStatistics: () => {
    total: number;
    anomaly: number;
    materialMissing: number;
    processed: number;
  };
  updateRecordStatus: (recordId: string, status: RecordStatus, note: string) => void;
  runAnomalyDetection: (recordId: string) => AnomalyType[];
}

const defaultFilterConditions: FilterConditions = {
  anomalyType: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
  keyword: '',
};

export const useRecordPool = create<RecordPoolState & Actions>((set, get) => ({
  scoreRecords: [],
  layerRecords: [],
  hitRecords: [],
  processNotes: [],
  selectedRecordId: null,
  filterConditions: defaultFilterConditions,
  isLoaded: false,

  loadMockData: () => {
    const processedRecords = mockData.scoreRecords.map(record => {
      const layers = mockData.layerRecords.filter(l => l.recordId === record.id);
      const anomalies = detectAnomalies(record, layers);
      const reason = getAnomalyReason(anomalies, layers);
      return {
        ...record,
        anomalyType: anomalies.length > 0 ? anomalies[0] : 'none',
        anomalyReason: reason || record.anomalyReason,
      };
    });

    set({
      scoreRecords: processedRecords,
      layerRecords: mockData.layerRecords,
      hitRecords: mockData.hitRecords,
      processNotes: mockData.processNotes,
      isLoaded: true,
    });
  },

  importRecords: (data: ImportData) => {
    const processedRecords = data.scoreRecords.map(record => {
      const layers = data.layerRecords.filter(l => l.recordId === record.id);
      const anomalies = detectAnomalies(record, layers);
      const reason = getAnomalyReason(anomalies, layers);
      return {
        ...record,
        anomalyType: anomalies.length > 0 ? anomalies[0] : 'none',
        anomalyReason: reason || record.anomalyReason,
      };
    });

    set({
      scoreRecords: processedRecords,
      layerRecords: data.layerRecords,
      hitRecords: data.hitRecords,
      processNotes: data.processNotes,
      isLoaded: true,
    });
  },

  setSelectedRecordId: (id) => set({ selectedRecordId: id }),

  setFilterConditions: (conditions) =>
    set((state) => ({
      filterConditions: { ...state.filterConditions, ...conditions },
    })),

  resetFilters: () => set({ filterConditions: defaultFilterConditions }),

  getLayersByRecordId: (recordId) =>
    get().layerRecords.filter((l) => l.recordId === recordId),

  getHitsByRecordId: (recordId) =>
    get().hitRecords.filter((h) => h.recordId === recordId),

  getProcessNotesByRecordId: (recordId) =>
    get().processNotes.filter((n) => n.recordId === recordId),

  getFilteredRecords: () => {
    const { scoreRecords, filterConditions } = get();
    let filtered = [...scoreRecords];

    if (filterConditions.anomalyType !== 'all') {
      filtered = filtered.filter((r) => r.anomalyType === filterConditions.anomalyType);
    }

    if (filterConditions.status !== 'all') {
      filtered = filtered.filter((r) => r.status === filterConditions.status);
    }

    if (filterConditions.dateFrom) {
      filtered = filtered.filter((r) => r.fillTime >= filterConditions.dateFrom);
    }

    if (filterConditions.dateTo) {
      filtered = filtered.filter((r) => r.fillTime <= filterConditions.dateTo + ' 23:59');
    }

    if (filterConditions.keyword) {
      const keyword = filterConditions.keyword.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.patientName.toLowerCase().includes(keyword) ||
          r.patientId.toLowerCase().includes(keyword) ||
          r.scoreItem.toLowerCase().includes(keyword) ||
          r.anomalyReason.toLowerCase().includes(keyword)
      );
    }

    return filtered;
  },

  getStatistics: () => {
    const { scoreRecords } = get();
    return {
      total: scoreRecords.length,
      anomaly: scoreRecords.filter((r) => r.anomalyType !== 'none').length,
      materialMissing: scoreRecords.filter((r) => r.anomalyType === 'material_missing').length,
      processed: scoreRecords.filter((r) => r.status === 'processed').length,
    };
  },

  updateRecordStatus: (recordId, status, note) => {
    const newNote: ProcessNote = {
      id: `NOTE-${recordId}-${Date.now()}`,
      recordId,
      operator: '当前用户',
      operateTime: new Date().toLocaleString('zh-CN'),
      action: status === 'processed' ? '标记已处理' : '重新标记待处理',
      suggestion: note,
    };

    set((state) => ({
      scoreRecords: state.scoreRecords.map((r) =>
        r.id === recordId ? { ...r, status } : r
      ),
      processNotes: [...state.processNotes, newNote],
    }));
  },

  runAnomalyDetection: (recordId) => {
    const { scoreRecords, layerRecords } = get();
    const record = scoreRecords.find((r) => r.id === recordId);
    const layers = layerRecords.filter((l) => l.recordId === recordId);

    if (!record) return [];

    const anomalies = detectAnomalies(record, layers);
    const reason = getAnomalyReason(anomalies, layers);

    set((state) => ({
      scoreRecords: state.scoreRecords.map((r) =>
        r.id === recordId
          ? {
              ...r,
              anomalyType: anomalies.length > 0 ? anomalies[0] : 'none',
              anomalyReason: reason || r.anomalyReason,
            }
          : r
      ),
    }));

    return anomalies;
  },
}));
