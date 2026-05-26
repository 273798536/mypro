import { create } from 'zustand';
import { Charge, ExperimentState, Snapshot, Warning, HistoryEntry, Vec3 } from '@/types';
import { getChargeColor } from '@/utils/physics';

interface StoreState extends ExperimentState {
  snapshots: Snapshot[];
  warnings: Warning[];
  history: HistoryEntry[];
  historyIndex: number;
  selectedSamplePoint: Vec3 | null;
  
  addCharge: (position: Vec3, charge: number) => void;
  removeCharge: (id: string) => void;
  updateChargePosition: (id: string, position: Vec3) => void;
  updateChargeValue: (id: string, charge: number) => void;
  selectCharge: (id: string | null) => void;
  setSelectedSamplePoint: (point: Vec3 | null) => void;
  
  toggleFieldLines: () => void;
  toggleEquipotential: () => void;
  
  addWarning: (warning: Warning) => void;
  dismissWarning: (id: string) => void;
  clearWarnings: () => void;
  
  saveSnapshot: (name: string, note: string) => void;
  loadSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  
  pushHistory: (action: string, description: string) => void;
  undo: () => void;
  redo: () => void;
  
  resetScene: () => void;
  loadPreset: (preset: 'monopole' | 'dipole' | 'quadrupole') => void;
}

const initialState: ExperimentState = {
  charges: [
    {
      id: 'charge-1',
      position: { x: -1, y: 0, z: 0 },
      charge: 1,
      color: getChargeColor(1),
      preset: 'dipole'
    },
    {
      id: 'charge-2',
      position: { x: 1, y: 0, z: 0 },
      charge: -1,
      color: getChargeColor(-1),
      preset: 'dipole'
    }
  ],
  showFieldLines: true,
  showEquipotential: false,
  selectedChargeId: null,
  cameraPosition: { x: 0, y: 2, z: 6 }
};

let chargeCounter = 3;
let historyCounter = 0;

export const useStore = create<StoreState>((set, get) => ({
  ...initialState,
  snapshots: [],
  warnings: [],
  history: [],
  historyIndex: -1,
  selectedSamplePoint: null,

  addCharge: (position, charge) => {
    const id = `charge-${chargeCounter++}`;
    const newCharge: Charge = {
      id,
      position,
      charge,
      color: getChargeColor(charge)
    };
    set(state => ({ charges: [...state.charges, newCharge] }));
    get().pushHistory('add', `添加电荷 ${id}`);
  },

  removeCharge: (id) => {
    set(state => ({ charges: state.charges.filter(c => c.id !== id) }));
    get().pushHistory('remove', `删除电荷 ${id}`);
  },

  updateChargePosition: (id, position) => {
    set(state => ({
      charges: state.charges.map(c =>
        c.id === id ? { ...c, position } : c
      )
    }));
  },

  updateChargeValue: (id, charge) => {
    set(state => ({
      charges: state.charges.map(c =>
        c.id === id ? { ...c, charge, color: getChargeColor(charge) } : c
      )
    }));
    get().pushHistory('update', `更新电荷 ${id} 电量为 ${charge}`);
  },

  selectCharge: (id) => {
    set({ selectedChargeId: id });
  },

  setSelectedSamplePoint: (point) => {
    set({ selectedSamplePoint: point });
  },

  toggleFieldLines: () => {
    set(state => ({ showFieldLines: !state.showFieldLines }));
  },

  toggleEquipotential: () => {
    set(state => ({ showEquipotential: !state.showEquipotential }));
  },

  addWarning: (warning) => {
    set(state => ({ warnings: [...state.warnings.filter(w => w.id !== warning.id), warning] }));
  },

  dismissWarning: (id) => {
    set(state => ({
      warnings: state.warnings.map(w =>
        w.id === id ? { ...w, dismissed: true } : w
      )
    }));
  },

  clearWarnings: () => {
    set({ warnings: [] });
  },

  saveSnapshot: (name, note) => {
    const snapshot: Snapshot = {
      id: `snapshot-${Date.now()}`,
      timestamp: Date.now(),
      state: {
        charges: JSON.parse(JSON.stringify(get().charges)),
        showFieldLines: get().showFieldLines,
        showEquipotential: get().showEquipotential,
        selectedChargeId: get().selectedChargeId,
        cameraPosition: get().cameraPosition
      },
      name,
      note
    };
    set(state => ({ snapshots: [...state.snapshots, snapshot] }));
  },

  loadSnapshot: (id) => {
    const snapshot = get().snapshots.find(s => s.id === id);
    if (snapshot) {
      set({
        charges: JSON.parse(JSON.stringify(snapshot.state.charges)),
        showFieldLines: snapshot.state.showFieldLines,
        showEquipotential: snapshot.state.showEquipotential,
        selectedChargeId: snapshot.state.selectedChargeId,
        cameraPosition: snapshot.state.cameraPosition
      });
    }
  },

  deleteSnapshot: (id) => {
    set(state => ({ snapshots: state.snapshots.filter(s => s.id !== id) }));
  },

  pushHistory: (action, description) => {
    const entry: HistoryEntry = {
      id: `history-${historyCounter++}`,
      timestamp: Date.now(),
      action,
      description,
      state: {
        charges: JSON.parse(JSON.stringify(get().charges)),
        showFieldLines: get().showFieldLines,
        showEquipotential: get().showEquipotential,
        selectedChargeId: get().selectedChargeId,
        cameraPosition: get().cameraPosition
      }
    };
    
    set(state => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(entry);
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const prevState = state.history[state.historyIndex - 1].state;
      set({
        ...prevState,
        historyIndex: state.historyIndex - 1
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const nextState = state.history[state.historyIndex + 1].state;
      set({
        ...nextState,
        historyIndex: state.historyIndex + 1
      });
    }
  },

  resetScene: () => {
    set({ ...initialState, charges: JSON.parse(JSON.stringify(initialState.charges)) });
    get().pushHistory('reset', '重置场景');
  },

  loadPreset: (preset) => {
    let charges: Charge[] = [];
    
    switch (preset) {
      case 'monopole':
        charges = [
          {
            id: `charge-${chargeCounter++}`,
            position: { x: 0, y: 0, z: 0 },
            charge: 1,
            color: getChargeColor(1),
            preset: 'monopole'
          }
        ];
        break;
      case 'dipole':
        charges = [
          {
            id: `charge-${chargeCounter++}`,
            position: { x: -1, y: 0, z: 0 },
            charge: 1,
            color: getChargeColor(1),
            preset: 'dipole'
          },
          {
            id: `charge-${chargeCounter++}`,
            position: { x: 1, y: 0, z: 0 },
            charge: -1,
            color: getChargeColor(-1),
            preset: 'dipole'
          }
        ];
        break;
      case 'quadrupole':
        charges = [
          {
            id: `charge-${chargeCounter++}`,
            position: { x: -1, y: -1, z: 0 },
            charge: 1,
            color: getChargeColor(1),
            preset: 'quadrupole'
          },
          {
            id: `charge-${chargeCounter++}`,
            position: { x: 1, y: -1, z: 0 },
            charge: -1,
            color: getChargeColor(-1),
            preset: 'quadrupole'
          },
          {
            id: `charge-${chargeCounter++}`,
            position: { x: -1, y: 1, z: 0 },
            charge: -1,
            color: getChargeColor(-1),
            preset: 'quadrupole'
          },
          {
            id: `charge-${chargeCounter++}`,
            position: { x: 1, y: 1, z: 0 },
            charge: 1,
            color: getChargeColor(1),
            preset: 'quadrupole'
          }
        ];
        break;
    }

    set({ charges });
    get().pushHistory('preset', `加载预设: ${preset}`);
  }
}));
