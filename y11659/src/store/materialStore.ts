import { create } from 'zustand';
import type { Material, Vehicle, ImportConfig, MaterialStoreState } from '../types';
import { generateMockMaterials, mockVehicles } from '../data/mockData';

interface MaterialStore extends MaterialStoreState {
  loadMockData: () => void;
  getMaterialsByType: (type: Material['type']) => Material[];
  getVehicleById: (id: string) => Vehicle | undefined;
}

export const useMaterialStore = create<MaterialStore>((set, get) => ({
  materials: [],
  vehicles: [],
  importHistory: [],

  loadMockData: () => {
    set({
      materials: generateMockMaterials(),
      vehicles: mockVehicles,
    });
  },

  addMaterials: (newMaterials, config) => {
    const state = get();
    let added = 0;
    let skipped = 0;
    let updated = 0;

    const existingIds = new Set(state.materials.map(m => m.id));
    const finalMaterials: Material[] = [...state.materials];

    newMaterials.forEach((material) => {
      const materialWithBatch = {
        ...material,
        importBatch: config.batchName,
        importTime: Date.now(),
      };

      if (existingIds.has(material.id)) {
        switch (config.strategy) {
          case 'ignore':
            skipped++;
            break;
          case 'overwrite':
            const idx = finalMaterials.findIndex(m => m.id === material.id);
            if (idx !== -1) {
              finalMaterials[idx] = materialWithBatch;
              updated++;
            }
            break;
          case 'append':
            finalMaterials.push({
              ...materialWithBatch,
              id: `${material.id}_${Date.now()}`,
            });
            added++;
            break;
        }
      } else {
        finalMaterials.push(materialWithBatch);
        added++;
      }
    });

    set({
      materials: finalMaterials,
      importHistory: [
        {
          batchName: config.batchName,
          time: Date.now(),
          count: added + updated,
        },
        ...state.importHistory,
      ],
    });

    return { added, skipped, updated };
  },

  generateVehicles: (count, difficulty) => {
    const state = get();
    let filtered = state.vehicles;
    
    if (difficulty !== 'mixed') {
      filtered = state.vehicles.filter(v => v.difficulty === difficulty);
    }

    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  },

  getMaterialsByType: (type) => {
    return get().materials.filter(m => m.type === type);
  },

  getVehicleById: (id) => {
    return get().vehicles.find(v => v.id === id);
  },

  clearAll: () => {
    set({
      materials: [],
      vehicles: [],
      importHistory: [],
    });
  },
}));
