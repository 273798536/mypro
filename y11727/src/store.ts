import { create } from 'zustand';
import type { CLIEntry, FilterStatus, Sample } from '@/types';

interface State {
  samples: Sample[];
  selectedId: string | null;
  filter: FilterStatus;
  cliEntries: CLIEntry[];
  banner: { level: 'warn' | 'error'; text: string } | null;

  addSamples: (samples: Sample[]) => void;
  selectSample: (id: string | null) => void;
  setFilter: (f: FilterStatus) => void;
  pushCLI: (entry: Omit<CLIEntry, 'id' | 'ts'>) => void;
  clearSamples: () => void;
  clearCLI: () => void;
  setBanner: (b: State['banner']) => void;
}

export const useStore = create<State>((set) => ({
  samples: [],
  selectedId: null,
  filter: 'all',
  cliEntries: [],
  banner: null,

  addSamples: (samples) =>
    set((s) => {
      const combined = [...s.samples, ...samples];
      const selectedId = s.selectedId ?? samples[0]?.id ?? null;
      const firstError = samples.find((x) => x.errors.length > 0);
      return {
        samples: combined,
        selectedId,
        banner: firstError
          ? {
              level: firstError.status === 'boundary' ? 'warn' : 'error',
              text: firstError.errors.join('；'),
            }
          : s.banner,
      };
    }),
  selectSample: (id) => set({ selectedId: id }),
  setFilter: (f) => set({ filter: f }),
  pushCLI: (entry) =>
    set((s) => ({
      cliEntries: [
        ...s.cliEntries,
        { ...entry, id: crypto.randomUUID(), ts: Date.now() },
      ],
    })),
  clearSamples: () => set({ samples: [], selectedId: null, banner: null }),
  clearCLI: () => set({ cliEntries: [] }),
  setBanner: (b) => set({ banner: b }),
}));
