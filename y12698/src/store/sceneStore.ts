import { create } from 'zustand';
import type { CameraState, DataRecord, Viewpoint } from '../types';
import { DEFAULT_VIEWPOINTS } from '../data/sampleRecords';

interface SceneState {
  camera: CameraState;
  selectedRecordId: string | null;
  showSectionPlane: boolean;
  sectionPlaneY: number;
  viewpoints: Viewpoint[];
  isAnimatingCamera: boolean;
  setCamera: (camera: CameraState) => void;
  setSelectedRecordId: (id: string | null) => void;
  selectRecord: (record: DataRecord) => void;
  toggleSectionPlane: () => void;
  setSectionPlaneY: (y: number) => void;
  saveViewpoint: (name: string, camera: CameraState, thumbnail?: string) => void;
  deleteViewpoint: (id: string) => void;
  loadViewpoint: (id: string) => CameraState | null;
  setAnimatingCamera: (v: boolean) => void;
}

const STORAGE_KEY = 'hydrothermal-viewpoints';

function loadViewpoints(): Viewpoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_VIEWPOINTS;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  camera: {
    position: { x: 80, y: 60, z: 80 },
    target: { x: 0, y: -30, z: 0 },
  },
  selectedRecordId: null,
  showSectionPlane: false,
  sectionPlaneY: -30,
  viewpoints: loadViewpoints(),
  isAnimatingCamera: false,

  setCamera: (camera) => set({ camera }),
  setSelectedRecordId: (id) => set({ selectedRecordId: id }),
  selectRecord: (record) => set({ selectedRecordId: record.id }),
  toggleSectionPlane: () => set({ showSectionPlane: !get().showSectionPlane }),
  setSectionPlaneY: (y) => set({ sectionPlaneY: y }),

  saveViewpoint: (name, camera, thumbnail) => {
    const vp: Viewpoint = {
      id: `vp-${Date.now()}`,
      name,
      camera,
      thumbnail,
      savedAt: new Date().toISOString(),
    };
    const viewpoints = [...get().viewpoints, vp];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(viewpoints));
    set({ viewpoints });
  },

  deleteViewpoint: (id) => {
    const viewpoints = get().viewpoints.filter((v) => v.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(viewpoints));
    set({ viewpoints });
  },

  loadViewpoint: (id) => {
    const vp = get().viewpoints.find((v) => v.id === id);
    return vp ? vp.camera : null;
  },

  setAnimatingCamera: (v) => set({ isAnimatingCamera: v }),
}));
