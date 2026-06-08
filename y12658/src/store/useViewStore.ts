import { create } from 'zustand';
import type { ViewpointSnapshot } from '@/types';
import { generateMockViewpoints } from '@/data/mockEddyData';
import { uid } from '@/utils/hash';

const LS_KEY = 'ocean-eddy-viewpoints';

function loadFromStorage(): ViewpointSnapshot[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function saveToStorage(vps: ViewpointSnapshot[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(vps));
  } catch {
    /* ignore */
  }
}

interface ViewState {
  viewpoints: ViewpointSnapshot[];
  activeViewpointId: string | null;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  autoRotate: boolean;
  setCamera: (pos: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) => void;
  setAutoRotate: (v: boolean) => void;
  saveViewpoint: (name: string, remark?: string) => ViewpointSnapshot;
  restoreViewpoint: (id: string) => void;
  deleteViewpoint: (id: string) => void;
  loadInitialViewpoints: () => void;
}

export const useViewStore = create<ViewState>((set, get) => ({
  viewpoints: [],
  activeViewpointId: null,
  cameraPosition: { x: 8, y: 6, z: 10 },
  cameraTarget: { x: 0, y: 0, z: 0 },
  autoRotate: false,

  setCamera: (pos, target) => set({ cameraPosition: pos, cameraTarget: target }),
  setAutoRotate: (v) => set({ autoRotate: v }),

  saveViewpoint: (name, remark) => {
    const { cameraPosition: camera, cameraTarget: target } = get();
    const vp: ViewpointSnapshot = {
      id: uid(),
      name,
      camera,
      target,
      remark,
      createdAt: new Date().toISOString(),
    };
    const next = [...get().viewpoints, vp];
    saveToStorage(next);
    set({ viewpoints: next, activeViewpointId: vp.id });
    return vp;
  },

  restoreViewpoint: (id) => {
    const vp = get().viewpoints.find((v) => v.id === id);
    if (!vp) return;
    set({
      cameraPosition: vp.camera,
      cameraTarget: vp.target,
      activeViewpointId: id,
    });
  },

  deleteViewpoint: (id) => {
    const next = get().viewpoints.filter((v) => v.id !== id);
    saveToStorage(next);
    set({ viewpoints: next, activeViewpointId: get().activeViewpointId === id ? null : get().activeViewpointId });
  },

  loadInitialViewpoints: () => {
    let stored = loadFromStorage();
    if (stored.length === 0) {
      stored = generateMockViewpoints();
      saveToStorage(stored);
    }
    set({ viewpoints: stored });
  },
}));
