import { create } from 'zustand';
import {
  PlanktonSample,
  FilterState,
  SectionState,
  WaterLayer,
  RiskLevel,
  SampleStatus,
  SPECIES_LIST,
} from '@/types';
import { INITIAL_SAMPLES } from '@/utils/mockData';

interface SampleStore {
  samples: PlanktonSample[];
  originalSamples: PlanktonSample[];
  selectedSampleId: string | null;
  hoveredSampleId: string | null;
  filter: FilterState;
  section: SectionState;
  setSamples: (samples: PlanktonSample[]) => void;
  updateSample: (id: string, updates: Partial<PlanktonSample>) => void;
  selectSample: (id: string | null) => void;
  hoverSample: (id: string | null) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  toggleFilterSpecies: (species: string) => void;
  toggleFilterLayer: (layer: WaterLayer) => void;
  toggleFilterRisk: (risk: RiskLevel) => void;
  toggleFilterStatus: (status: SampleStatus) => void;
  setCountRange: (range: [number, number]) => void;
  setSection: (section: Partial<SectionState>) => void;
  resetFilters: () => void;
  getFilteredSamples: () => PlanktonSample[];
}

const DEFAULT_FILTER: FilterState = {
  species: [...SPECIES_LIST],
  waterLayers: ['surface', 'middle', 'deep'],
  countRange: [0, 2000],
  riskLevels: ['none', 'low', 'medium', 'high'],
  statuses: ['pending', 'reviewed', 'confirmed'],
};

const DEFAULT_SECTION: SectionState = {
  horizontalY: null,
  verticalX: null,
  verticalZ: null,
  showSectionPlane: false,
};

export const useSampleStore = create<SampleStore>((set, get) => ({
  samples: INITIAL_SAMPLES,
  originalSamples: JSON.parse(JSON.stringify(INITIAL_SAMPLES)),
  selectedSampleId: null,
  hoveredSampleId: null,
  filter: DEFAULT_FILTER,
  section: DEFAULT_SECTION,

  setSamples: (samples) => set({ samples, originalSamples: JSON.parse(JSON.stringify(samples)) }),

  updateSample: (id, updates) =>
    set((state) => ({
      samples: state.samples.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  selectSample: (id) => set({ selectedSampleId: id }),
  hoverSample: (id) => set({ hoveredSampleId: id }),

  setFilter: (filter) => set((state) => ({ filter: { ...state.filter, ...filter } })),

  toggleFilterSpecies: (species) =>
    set((state) => {
      const current = state.filter.species;
      const next = current.includes(species) ? current.filter((s) => s !== species) : [...current, species];
      return { filter: { ...state.filter, species: next } };
    }),

  toggleFilterLayer: (layer) =>
    set((state) => {
      const current = state.filter.waterLayers;
      const next = current.includes(layer) ? current.filter((l) => l !== layer) : [...current, layer];
      return { filter: { ...state.filter, waterLayers: next } };
    }),

  toggleFilterRisk: (risk) =>
    set((state) => {
      const current = state.filter.riskLevels;
      const next = current.includes(risk) ? current.filter((r) => r !== risk) : [...current, risk];
      return { filter: { ...state.filter, riskLevels: next } };
    }),

  toggleFilterStatus: (status) =>
    set((state) => {
      const current = state.filter.statuses;
      const next = current.includes(status) ? current.filter((s) => s !== status) : [...current, status];
      return { filter: { ...state.filter, statuses: next } };
    }),

  setCountRange: (range) => set((state) => ({ filter: { ...state.filter, countRange: range } })),

  setSection: (section) => set((state) => ({ section: { ...state.section, ...section } })),

  resetFilters: () => set({ filter: DEFAULT_FILTER, section: DEFAULT_SECTION }),

  getFilteredSamples: () => {
    const { samples, filter, section } = get();
    return samples.filter((s) => {
      if (!filter.species.includes(s.species)) return false;
      if (!filter.waterLayers.includes(s.waterLayer)) return false;
      if (!filter.riskLevels.includes(s.riskLevel)) return false;
      if (!filter.statuses.includes(s.status)) return false;
      if (s.count < filter.countRange[0] || s.count > filter.countRange[1]) return false;

      if (section.showSectionPlane) {
        if (section.horizontalY !== null) {
          if (s.y > section.horizontalY) return false;
        }
        if (section.verticalX !== null) {
          if (s.x > section.verticalX) return false;
        }
        if (section.verticalZ !== null) {
          if (s.z > section.verticalZ) return false;
        }
      }

      return true;
    });
  },
}));
