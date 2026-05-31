import { create } from 'zustand';
import { Magnet, Vector3, ValidationWarning, FieldLine, SamplePoint } from '@/types';
import { generateFieldLines } from '@/utils/magneticField';
import { validateAll } from '@/utils/validation';

interface MagneticState {
  magnets: Magnet[];
  fieldLines: FieldLine[];
  samplePoints: SamplePoint[];
  selectedMagnetId: string | null;
  sampleDensity: number;
  showFieldLines: boolean;
  showStrengthLabels: boolean;
  syncFilters: boolean;
  warnings: ValidationWarning[];
  configVersion: string;
  bounds: { min: Vector3; max: Vector3 };
}

interface MagneticActions {
  addMagnet: (magnet: Omit<Magnet, 'id' | 'createdAt' | 'source' | 'version'>) => void;
  removeMagnet: (id: string) => void;
  updateMagnet: (id: string, updates: Partial<Magnet>) => void;
  updateMagnetPosition: (id: string, position: Vector3) => void;
  reversePoleDirection: (id: string) => void;
  selectMagnet: (id: string | null) => void;
  setSampleDensity: (density: number) => void;
  toggleFieldLines: () => void;
  toggleStrengthLabels: () => void;
  toggleSyncFilters: () => void;
  recalculateField: () => void;
  loadConfig: (config: { magnets: Magnet[]; sampleDensity: number }) => void;
  getConfig: () => { magnets: Magnet[]; sampleDensity: number; version: string };
}

const defaultBounds = {
  min: { x: -3, y: -3, z: -3 },
  max: { x: 3, y: 3, z: 3 }
};

const defaultMagnets: Magnet[] = [
  {
    id: 'magnet-1',
    name: '条形磁体 A',
    position: { x: -1, y: 0, z: 0 },
    poleDirection: { x: 1, y: 0, z: 0 },
    strength: 1000,
    type: 'bar',
    source: '默认配置',
    version: '1.0.0',
    createdAt: new Date().toISOString()
  },
  {
    id: 'magnet-2',
    name: '条形磁体 B',
    position: { x: 1, y: 0, z: 0 },
    poleDirection: { x: 1, y: 0, z: 0 },
    strength: 800,
    type: 'bar',
    source: '默认配置',
    version: '1.0.0',
    createdAt: new Date().toISOString()
  }
];

const initialFieldLines = generateFieldLines(defaultMagnets, 6);
const initialWarnings = validateAll(defaultMagnets, initialFieldLines, 8, defaultBounds);

export const useMagneticStore = create<MagneticState & MagneticActions>((set, get) => ({
  magnets: defaultMagnets,
  fieldLines: initialFieldLines,
  samplePoints: [],
  selectedMagnetId: null,
  sampleDensity: 8,
  showFieldLines: true,
  showStrengthLabels: false,
  syncFilters: true,
  warnings: initialWarnings,
  configVersion: '1.0.0',
  bounds: defaultBounds,

  addMagnet: (magnetData) => {
    const newMagnet: Magnet = {
      ...magnetData,
      id: `magnet-${Date.now()}`,
      createdAt: new Date().toISOString(),
      source: '用户创建',
      version: '1.0.0'
    };
    set((state) => {
      const newMagnets = [...state.magnets, newMagnet];
      const newFieldLines = generateFieldLines(newMagnets, 6);
      const newWarnings = validateAll(newMagnets, newFieldLines, state.sampleDensity, state.bounds);
      return {
        magnets: newMagnets,
        fieldLines: newFieldLines,
        warnings: newWarnings
      };
    });
  },

  removeMagnet: (id) => {
    set((state) => {
      const newMagnets = state.magnets.filter(m => m.id !== id);
      const newFieldLines = generateFieldLines(newMagnets, 6);
      const newWarnings = validateAll(newMagnets, newFieldLines, state.sampleDensity, state.bounds);
      return {
        magnets: newMagnets,
        fieldLines: newFieldLines,
        warnings: newWarnings,
        selectedMagnetId: state.selectedMagnetId === id ? null : state.selectedMagnetId
      };
    });
  },

  updateMagnet: (id, updates) => {
    set((state) => {
      const newMagnets = state.magnets.map(m =>
        m.id === id ? { ...m, ...updates } : m
      );
      const newFieldLines = generateFieldLines(newMagnets, 6);
      const newWarnings = validateAll(newMagnets, newFieldLines, state.sampleDensity, state.bounds);
      return {
        magnets: newMagnets,
        fieldLines: newFieldLines,
        warnings: newWarnings
      };
    });
  },

  updateMagnetPosition: (id, position) => {
    set((state) => {
      const newMagnets = state.magnets.map(m =>
        m.id === id ? { ...m, position } : m
      );
      const newFieldLines = generateFieldLines(newMagnets, 6);
      const newWarnings = validateAll(newMagnets, newFieldLines, state.sampleDensity, state.bounds);
      return {
        magnets: newMagnets,
        fieldLines: newFieldLines,
        warnings: newWarnings
      };
    });
  },

  reversePoleDirection: (id) => {
    set((state) => {
      const newMagnets = state.magnets.map(m =>
        m.id === id
          ? { ...m, poleDirection: { x: -m.poleDirection.x, y: -m.poleDirection.y, z: -m.poleDirection.z } }
          : m
      );
      const newFieldLines = generateFieldLines(newMagnets, 6);
      const newWarnings = validateAll(newMagnets, newFieldLines, state.sampleDensity, state.bounds);
      return {
        magnets: newMagnets,
        fieldLines: newFieldLines,
        warnings: newWarnings
      };
    });
  },

  selectMagnet: (id) => set({ selectedMagnetId: id }),

  setSampleDensity: (density) => {
    set((state) => {
      const newWarnings = validateAll(state.magnets, state.fieldLines, density, state.bounds);
      return {
        sampleDensity: density,
        warnings: newWarnings
      };
    });
  },

  toggleFieldLines: () => set((state) => ({ showFieldLines: !state.showFieldLines })),

  toggleStrengthLabels: () => set((state) => ({ showStrengthLabels: !state.showStrengthLabels })),

  toggleSyncFilters: () => set((state) => ({ syncFilters: !state.syncFilters })),

  recalculateField: () => {
    set((state) => {
      const newFieldLines = generateFieldLines(state.magnets, 6);
      const newWarnings = validateAll(state.magnets, newFieldLines, state.sampleDensity, state.bounds);
      return {
        fieldLines: newFieldLines,
        warnings: newWarnings
      };
    });
  },

  loadConfig: (config) => {
    const newFieldLines = generateFieldLines(config.magnets, 6);
    const newWarnings = validateAll(config.magnets, newFieldLines, config.sampleDensity, get().bounds);
    set({
      magnets: config.magnets,
      sampleDensity: config.sampleDensity,
      fieldLines: newFieldLines,
      warnings: newWarnings
    });
  },

  getConfig: () => ({
    magnets: get().magnets,
    sampleDensity: get().sampleDensity,
    version: get().configVersion
  })
}));
