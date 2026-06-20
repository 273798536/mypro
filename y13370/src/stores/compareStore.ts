import { create } from 'zustand';
import type { ModelVersion, SampleRecord, ManualCorrection, VersionCompareReport } from '@/types';
import { mockVersions, mockSamples, mockCorrections } from '@/data/sampleData';
import { buildCompareReport } from '@/utils/diffComparator';

interface CompareState {
  versions: ModelVersion[];
  samples: SampleRecord[];
  corrections: ManualCorrection[];
  selectedPrevId: string | null;
  selectedCurrId: string | null;
  report: VersionCompareReport | null;
  init: () => void;
  setPrev: (id: string) => void;
  setCurr: (id: string) => void;
  buildReport: () => void;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  versions: [],
  samples: [],
  corrections: [],
  selectedPrevId: null,
  selectedCurrId: null,
  report: null,
  init: () => {
    if (get().versions.length > 0) return;
    const sortedV = [...mockVersions].sort((a, b) => new Date(a.releaseTime).getTime() - new Date(b.releaseTime).getTime());
    const samples = [...mockSamples];
    const corrections = [...mockCorrections];
    set({
      versions: sortedV,
      samples,
      corrections,
      selectedPrevId: sortedV.length >= 2 ? sortedV[0].id : sortedV[0]?.id || null,
      selectedCurrId: sortedV.length >= 2 ? sortedV[1].id : sortedV[0]?.id || null
    });
    setTimeout(() => get().buildReport(), 0);
  },
  setPrev: (id) => {
    set({ selectedPrevId: id });
    get().buildReport();
  },
  setCurr: (id) => {
    set({ selectedCurrId: id });
    get().buildReport();
  },
  buildReport: () => {
    const { selectedPrevId, selectedCurrId, versions, samples, corrections } = get();
    if (!selectedPrevId || !selectedCurrId) return;
    const prev = versions.find(v => v.id === selectedPrevId);
    const curr = versions.find(v => v.id === selectedCurrId);
    if (!prev || !curr) return;
    const prevSamples = samples.filter(s => s.versionId === prev.id);
    const currSamples = samples.filter(s => s.versionId === curr.id);
    const prevCorrs = corrections.filter(c => {
      const n = parseInt(c.id.replace('cor_', ''));
      return n >= 1 && n <= 1;
    });
    const currCorrs = corrections;
    set({ report: buildCompareReport(prev, curr, prevSamples, currSamples, prevCorrs, currCorrs) });
  }
}));
