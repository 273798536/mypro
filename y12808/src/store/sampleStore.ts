import { create } from 'zustand';
import type {
  Sample,
  CultureRecord,
  Conclusion,
  SourceTrace,
  ImportBatch,
  CorrectionRecord,
  UserRole
} from '@/types';
import { UserRole as UserRoleEnum, SampleStatus } from '@/types';
import {
  mockSamples,
  mockCultureRecords,
  mockConclusions,
  mockSourceTraces,
  mockImportBatches,
  mockCorrectionRecords
} from '@/data/mockData';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '@/utils/storage';

interface SampleStore {
  samples: Sample[];
  cultureRecords: CultureRecord[];
  conclusions: Conclusion[];
  sourceTraces: SourceTrace[];
  importBatches: ImportBatch[];
  correctionRecords: CorrectionRecord[];
  userRole: UserRole;
  selectedSampleId: string | null;
  searchKeyword: string;
  statusFilter: SampleStatus | 'all';

  setUserRole: (role: UserRole) => void;
  setSelectedSampleId: (id: string | null) => void;
  setSearchKeyword: (keyword: string) => void;
  setStatusFilter: (status: SampleStatus | 'all') => void;

  addSamples: (samples: Sample[], sourceTraces: SourceTrace[], batch: ImportBatch) => void;
  updateSample: (id: string, updates: Partial<Sample>) => void;
  addCultureRecord: (record: CultureRecord) => void;
  setConclusion: (conclusion: Conclusion) => void;
  addCorrectionRecord: (record: CorrectionRecord) => void;
  addImportBatch: (batch: ImportBatch) => void;

  getSampleById: (id: string) => Sample | undefined;
  getCultureRecordsBySampleId: (sampleId: string) => CultureRecord[];
  getConclusionBySampleId: (sampleId: string) => Conclusion | undefined;
  getSourceTracesBySampleId: (sampleId: string) => SourceTrace[];
  getFilteredSamples: () => Sample[];

  resetToMock: () => void;
}

const initialSamples = loadFromStorage<Sample[]>(STORAGE_KEYS.SAMPLES, mockSamples);
const initialCultureRecords = loadFromStorage<CultureRecord[]>(
  STORAGE_KEYS.CULTURE_RECORDS,
  mockCultureRecords
);
const initialConclusions = loadFromStorage<Conclusion[]>(
  STORAGE_KEYS.CONCLUSIONS,
  mockConclusions
);
const initialSourceTraces = loadFromStorage<SourceTrace[]>(
  STORAGE_KEYS.SOURCE_TRACES,
  mockSourceTraces
);
const initialImportBatches = loadFromStorage<ImportBatch[]>(
  STORAGE_KEYS.IMPORT_BATCHES,
  mockImportBatches
);
const initialCorrectionRecords = loadFromStorage<CorrectionRecord[]>(
  STORAGE_KEYS.CORRECTION_RECORDS,
  mockCorrectionRecords
);
const initialUserRole = loadFromStorage<UserRole>(STORAGE_KEYS.USER_ROLE, UserRoleEnum.TEACHER);

export const useSampleStore = create<SampleStore>((set, get) => ({
  samples: initialSamples,
  cultureRecords: initialCultureRecords,
  conclusions: initialConclusions,
  sourceTraces: initialSourceTraces,
  importBatches: initialImportBatches,
  correctionRecords: initialCorrectionRecords,
  userRole: initialUserRole,
  selectedSampleId: null,
  searchKeyword: '',
  statusFilter: 'all',

  setUserRole: (role) => {
    set({ userRole: role });
    saveToStorage(STORAGE_KEYS.USER_ROLE, role);
  },

  setSelectedSampleId: (id) => set({ selectedSampleId: id }),

  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  setStatusFilter: (status) => set({ statusFilter: status }),

  addSamples: (samples, sourceTraces, batch) => {
    const { samples: existingSamples, sourceTraces: existingTraces, importBatches: existingBatches } = get();
    
    const newSamples = [...existingSamples];
    const newTraces = [...existingTraces];
    
    samples.forEach((sample) => {
      const existingIndex = newSamples.findIndex(
        (s) => s.barcode === sample.barcode && s.batchNo === sample.batchNo
      );
      if (existingIndex >= 0) {
        newSamples[existingIndex] = { ...newSamples[existingIndex], ...sample, updatedAt: new Date().toISOString() };
      } else {
        newSamples.push(sample);
      }
    });

    newTraces.push(...sourceTraces);

    const newBatches = [...existingBatches, batch];

    set({ samples: newSamples, sourceTraces: newTraces, importBatches: newBatches });
    saveToStorage(STORAGE_KEYS.SAMPLES, newSamples);
    saveToStorage(STORAGE_KEYS.SOURCE_TRACES, newTraces);
    saveToStorage(STORAGE_KEYS.IMPORT_BATCHES, newBatches);
  },

  updateSample: (id, updates) => {
    const { samples } = get();
    const updatedSamples = samples.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    set({ samples: updatedSamples });
    saveToStorage(STORAGE_KEYS.SAMPLES, updatedSamples);
  },

  addCultureRecord: (record) => {
    const { cultureRecords } = get();
    const newRecords = [...cultureRecords, record];
    set({ cultureRecords: newRecords });
    saveToStorage(STORAGE_KEYS.CULTURE_RECORDS, newRecords);
  },

  setConclusion: (conclusion) => {
    const { conclusions } = get();
    const existingIndex = conclusions.findIndex((c) => c.sampleId === conclusion.sampleId);
    let newConclusions: Conclusion[];
    if (existingIndex >= 0) {
      newConclusions = [...conclusions];
      newConclusions[existingIndex] = conclusion;
    } else {
      newConclusions = [...conclusions, conclusion];
    }
    set({ conclusions: newConclusions });
    saveToStorage(STORAGE_KEYS.CONCLUSIONS, newConclusions);
  },

  addCorrectionRecord: (record) => {
    const { correctionRecords } = get();
    const newRecords = [...correctionRecords, record];
    set({ correctionRecords: newRecords });
    saveToStorage(STORAGE_KEYS.CORRECTION_RECORDS, newRecords);
  },

  addImportBatch: (batch) => {
    const { importBatches } = get();
    const newBatches = [...importBatches, batch];
    set({ importBatches: newBatches });
    saveToStorage(STORAGE_KEYS.IMPORT_BATCHES, newBatches);
  },

  getSampleById: (id) => {
    return get().samples.find((s) => s.id === id);
  },

  getCultureRecordsBySampleId: (sampleId) => {
    return get()
      .cultureRecords.filter((r) => r.sampleId === sampleId)
      .sort((a, b) => new Date(a.recordTime).getTime() - new Date(b.recordTime).getTime());
  },

  getConclusionBySampleId: (sampleId) => {
    return get().conclusions.find((c) => c.sampleId === sampleId);
  },

  getSourceTracesBySampleId: (sampleId) => {
    return get().sourceTraces.filter((t) => t.sampleId === sampleId);
  },

  getFilteredSamples: () => {
    const { samples, searchKeyword, statusFilter } = get();
    return samples.filter((s) => {
      const matchSearch =
        !searchKeyword ||
        s.barcode.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (s.name && s.name.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        s.batchNo.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  },

  resetToMock: () => {
    set({
      samples: mockSamples,
      cultureRecords: mockCultureRecords,
      conclusions: mockConclusions,
      sourceTraces: mockSourceTraces,
      importBatches: mockImportBatches,
      correctionRecords: mockCorrectionRecords
    });
    saveToStorage(STORAGE_KEYS.SAMPLES, mockSamples);
    saveToStorage(STORAGE_KEYS.CULTURE_RECORDS, mockCultureRecords);
    saveToStorage(STORAGE_KEYS.CONCLUSIONS, mockConclusions);
    saveToStorage(STORAGE_KEYS.SOURCE_TRACES, mockSourceTraces);
    saveToStorage(STORAGE_KEYS.IMPORT_BATCHES, mockImportBatches);
    saveToStorage(STORAGE_KEYS.CORRECTION_RECORDS, mockCorrectionRecords);
  }
}));
