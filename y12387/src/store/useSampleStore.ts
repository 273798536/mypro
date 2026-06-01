import { create } from 'zustand';
import { Sample } from '@/types';
import { initialSamples } from '@/mock/initialData';

interface SampleState {
  samples: Sample[];
  selectedSample: Sample | null;
  setSelectedSample: (sample: Sample | null) => void;
  addSample: (sample: Sample) => void;
  updateSample: (id: string, sample: Partial<Sample>) => void;
  deleteSample: (id: string) => void;
  getSampleById: (id: string) => Sample | undefined;
}

export const useSampleStore = create<SampleState>((set, get) => ({
  samples: initialSamples,
  selectedSample: null,
  setSelectedSample: (sample) => set({ selectedSample: sample }),
  addSample: (sample) =>
    set((state) => ({ samples: [...state.samples, sample] })),
  updateSample: (id, sample) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === id ? { ...s, ...sample, updatedAt: new Date().toISOString() } : s
      ),
    })),
  deleteSample: (id) =>
    set((state) => ({
      samples: state.samples.filter((s) => s.id !== id),
    })),
  getSampleById: (id) => get().samples.find((s) => s.id === id),
}));
