import { create } from 'zustand';
import type {
  AppState,
  RoadNoiseSource,
  SoundBarrier,
  AcousticMaterial,
  ResidentPoint,
  CalculationResult,
} from '@/types';
import { getMockData } from '@/data/mockData';
import { validateAll, createMissingFrequencyScenario } from '@/utils/validation';
import { performFullCalculation } from '@/utils/acoustics';

const mockData = getMockData();

interface Store extends AppState {
  setSelectedRoadNoiseId: (id: string | null) => void;
  setSelectedBarrierId: (id: string | null) => void;
  setSelectedResidentPointId: (id: string | null) => void;

  addRoadNoiseSource: (source: RoadNoiseSource) => void;
  updateRoadNoiseSource: (id: string, updates: Partial<RoadNoiseSource>) => void;
  removeRoadNoiseSource: (id: string) => void;

  addBarrier: (barrier: SoundBarrier) => void;
  updateBarrier: (id: string, updates: Partial<SoundBarrier>) => void;
  removeBarrier: (id: string) => void;

  addMaterial: (material: AcousticMaterial) => void;
  updateMaterial: (id: string, updates: Partial<AcousticMaterial>) => void;
  removeMaterial: (id: string) => void;

  addResidentPoint: (point: ResidentPoint) => void;
  updateResidentPoint: (id: string, updates: Partial<ResidentPoint>) => void;
  removeResidentPoint: (id: string) => void;

  runValidation: () => void;
  clearErrors: () => void;
  runCalculation: (roadNoiseId: string, barrierId: string, residentPointId: string) => CalculationResult | null;
  addMissingFrequencyDemo: () => void;
  clearResults: () => void;
  loadMockData: () => void;
  getSelectedData: () => {
    roadNoise: RoadNoiseSource | null;
    barrier: SoundBarrier | null;
    material: AcousticMaterial | null;
    residentPoint: ResidentPoint | null;
  };
}

export const useAppStore = create<Store>((set, get) => ({
  roadNoiseSources: [],
  barriers: [],
  materials: [],
  residentPoints: [],
  results: [],
  errors: [],
  selectedRoadNoiseId: null,
  selectedBarrierId: null,
  selectedResidentPointId: null,

  setSelectedRoadNoiseId: (id) => set({ selectedRoadNoiseId: id }),
  setSelectedBarrierId: (id) => set({ selectedBarrierId: id }),
  setSelectedResidentPointId: (id) => set({ selectedResidentPointId: id }),

  addRoadNoiseSource: (source) =>
    set((state) => ({ roadNoiseSources: [...state.roadNoiseSources, source] })),
  updateRoadNoiseSource: (id, updates) =>
    set((state) => ({
      roadNoiseSources: state.roadNoiseSources.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  removeRoadNoiseSource: (id) =>
    set((state) => ({
      roadNoiseSources: state.roadNoiseSources.filter((s) => s.id !== id),
      selectedRoadNoiseId: state.selectedRoadNoiseId === id ? null : state.selectedRoadNoiseId,
    })),

  addBarrier: (barrier) => set((state) => ({ barriers: [...state.barriers, barrier] })),
  updateBarrier: (id, updates) =>
    set((state) => ({
      barriers: state.barriers.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),
  removeBarrier: (id) =>
    set((state) => ({
      barriers: state.barriers.filter((b) => b.id !== id),
      selectedBarrierId: state.selectedBarrierId === id ? null : state.selectedBarrierId,
    })),

  addMaterial: (material) => set((state) => ({ materials: [...state.materials, material] })),
  updateMaterial: (id, updates) =>
    set((state) => ({
      materials: state.materials.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  removeMaterial: (id) =>
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    })),

  addResidentPoint: (point) =>
    set((state) => ({ residentPoints: [...state.residentPoints, point] })),
  updateResidentPoint: (id, updates) =>
    set((state) => ({
      residentPoints: state.residentPoints.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
  removeResidentPoint: (id) =>
    set((state) => ({
      residentPoints: state.residentPoints.filter((p) => p.id !== id),
      selectedResidentPointId:
        state.selectedResidentPointId === id ? null : state.selectedResidentPointId,
    })),

  runValidation: () => {
    const { roadNoiseSources, barriers, materials, residentPoints } = get();
    const errors = validateAll(roadNoiseSources, barriers, materials, residentPoints);
    set({ errors });
  },

  clearErrors: () => set({ errors: [] }),

  runCalculation: (roadNoiseId, barrierId, residentPointId) => {
    const { roadNoiseSources, barriers, materials, residentPoints } = get();

    const roadNoise = roadNoiseSources.find((s) => s.id === roadNoiseId);
    const barrier = barriers.find((b) => b.id === barrierId);
    const residentPoint = residentPoints.find((p) => p.id === residentPointId);

    if (!roadNoise || !barrier || !residentPoint) return null;

    const material = materials.find((m) => m.id === barrier.materialId);
    if (!material) return null;

    const result = performFullCalculation(roadNoise, barrier, material, residentPoint);
    set((state) => ({ results: [...state.results, result] }));
    return result;
  },

  addMissingFrequencyDemo: () => {
    const { source, material } = createMissingFrequencyScenario();
    set((state) => ({
      roadNoiseSources: [...state.roadNoiseSources, source],
      materials: [...state.materials, material],
    }));
  },

  clearResults: () => set({ results: [] }),

  loadMockData: () => {
    set({
      roadNoiseSources: mockData.roadNoiseSources,
      barriers: mockData.barriers,
      materials: mockData.materials,
      residentPoints: mockData.residentPoints,
      selectedRoadNoiseId: mockData.roadNoiseSources[0]?.id || null,
      selectedBarrierId: mockData.barriers[0]?.id || null,
      selectedResidentPointId: mockData.residentPoints[0]?.id || null,
    });
    get().runValidation();
  },

  getSelectedData: () => {
    const {
      roadNoiseSources,
      barriers,
      materials,
      residentPoints,
      selectedRoadNoiseId,
      selectedBarrierId,
      selectedResidentPointId,
    } = get();

    return {
      roadNoise: roadNoiseSources.find((s) => s.id === selectedRoadNoiseId) || null,
      barrier: barriers.find((b) => b.id === selectedBarrierId) || null,
      material:
        barriers.find((b) => b.id === selectedBarrierId)?.materialId
          ? materials.find(
              (m) =>
                m.id ===
                barriers.find((b) => b.id === selectedBarrierId)?.materialId
            ) || null
          : null,
      residentPoint: residentPoints.find((p) => p.id === selectedResidentPointId) || null,
    };
  },
}));
