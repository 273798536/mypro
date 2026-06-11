import { create } from 'zustand';
import type { Sample, SampleStatus } from '@/types';
import { MOCK_SAMPLES } from '@/data/mockSamples';
import { checkBarcodeDuplicate } from '@/utils/barcodeValidator';

interface SampleStore {
  samples: Sample[];
  selectedSampleId: string | null;
  selectedCreatedAt: Date | null;
  filterStatus: SampleStatus | 'all';
  searchKeyword: string;
  currentOperator: string;

  setSelectedSample: (barcode: string, createdAt: Date) => void;
  setSelectedSampleId: (barcode: string | null) => void;
  setFilterStatus: (status: SampleStatus | 'all') => void;
  setSearchKeyword: (keyword: string) => void;
  addSample: (sample: Omit<Sample, 'createdAt' | 'runCount' | 'isBarcodeDuplicate'>) => {
    success: boolean;
    error?: string;
    studentExplanation?: string;
  };
  updateSampleStatus: (barcode: string, createdAt: Date, status: SampleStatus) => void;
  incrementRunCount: (barcode: string, createdAt: Date) => void;
  getSelectedSample: () => Sample | undefined;
  getFilteredSamples: () => Sample[];
  checkBarcode: (barcode: string) => ReturnType<typeof checkBarcodeDuplicate>;
}

export const useSampleStore = create<SampleStore>((set, get) => ({
  samples: [...MOCK_SAMPLES],
  selectedSampleId: null,
  selectedCreatedAt: null,
  filterStatus: 'all',
  searchKeyword: '',
  currentOperator: '当前检验师',

  setSelectedSample: (barcode: string, createdAt: Date) => {
    set({ selectedSampleId: barcode, selectedCreatedAt: createdAt });
  },

  setSelectedSampleId: (barcode: string | null) => {
    set({ selectedSampleId: barcode, selectedCreatedAt: null });
  },

  setFilterStatus: (status: SampleStatus | 'all') => {
    set({ filterStatus: status });
  },

  setSearchKeyword: (keyword: string) => {
    set({ searchKeyword: keyword });
  },

  addSample: (sampleData) => {
    const state = get();
    const existingSamples = state.samples.filter(s => !s.isBarcodeDuplicate);

    const checkResult = checkBarcodeDuplicate(sampleData.barcode, existingSamples);

    if (checkResult.isDuplicate) {
      const newSample: Sample = {
        ...sampleData,
        createdAt: new Date(),
        runCount: 0,
        isBarcodeDuplicate: true,
        duplicateWith: checkResult.matchedBarcode,
        status: 'blocked'
      };
      set(state => ({ samples: [...state.samples, newSample] }));
      return {
        success: false,
        error: checkResult.message,
        studentExplanation: checkResult.studentExplanation
      };
    }

    if (!checkResult.isDuplicate && checkResult.message !== '条码有效') {
      return {
        success: false,
        error: checkResult.message,
        studentExplanation: checkResult.studentExplanation
      };
    }

    const newSample: Sample = {
      ...sampleData,
      createdAt: new Date(),
      runCount: 0,
      isBarcodeDuplicate: false
    };

    set(state => ({ samples: [...state.samples, newSample] }));
    return { success: true };
  },

  updateSampleStatus: (barcode: string, createdAt: Date, status: SampleStatus) => {
    set(state => ({
      samples: state.samples.map(s =>
        s.barcode === barcode && s.createdAt.getTime() === createdAt.getTime()
          ? { ...s, status }
          : s
      )
    }));
  },

  incrementRunCount: (barcode: string, createdAt: Date) => {
    set(state => ({
      samples: state.samples.map(s =>
        s.barcode === barcode && s.createdAt.getTime() === createdAt.getTime()
          ? { ...s, runCount: s.runCount + 1 }
          : s
      )
    }));
  },

  getSelectedSample: () => {
    const state = get();
    if (!state.selectedSampleId || !state.selectedCreatedAt) return undefined;
    return state.samples.find(
      s => s.barcode === state.selectedSampleId &&
        s.createdAt.getTime() === state.selectedCreatedAt!.getTime()
    );
  },

  getFilteredSamples: () => {
    const state = get();
    let filtered = [...state.samples];

    if (state.filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === state.filterStatus);
    }

    if (state.searchKeyword) {
      const keyword = state.searchKeyword.toLowerCase();
      filtered = filtered.filter(s =>
        s.barcode.toLowerCase().includes(keyword) ||
        s.cellType.toLowerCase().includes(keyword) ||
        s.patientId.toLowerCase().includes(keyword)
      );
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  checkBarcode: (barcode: string) => {
    const state = get();
    const existingSamples = state.samples.filter(s => !s.isBarcodeDuplicate);
    return checkBarcodeDuplicate(barcode, existingSamples);
  }
}));
