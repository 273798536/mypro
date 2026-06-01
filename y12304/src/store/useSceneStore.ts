import { create } from 'zustand';
import { SelectedObject, ObjectType } from '../types';

interface SceneStore {
  selectedObject: SelectedObject | null;
  hoveredObject: SelectedObject | null;
  focusPosition: [number, number, number] | null;
  isDetailModalOpen: boolean;
  screenshotMode: boolean;

  setSelectedObject: (obj: SelectedObject | null) => void;
  setHoveredObject: (obj: SelectedObject | null) => void;
  setFocusPosition: (pos: [number, number, number] | null) => void;
  setDetailModalOpen: (open: boolean) => void;
  setScreenshotMode: (mode: boolean) => void;
  focusOnObject: (type: ObjectType, id: string, name: string, position: [number, number, number]) => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  selectedObject: null,
  hoveredObject: null,
  focusPosition: null,
  isDetailModalOpen: false,
  screenshotMode: false,

  setSelectedObject: (obj) => set({ selectedObject: obj }),
  setHoveredObject: (obj) => set({ hoveredObject: obj }),
  setFocusPosition: (pos) => set({ focusPosition: pos }),
  setDetailModalOpen: (open) => set({ isDetailModalOpen: open }),
  setScreenshotMode: (mode) => set({ screenshotMode: mode }),

  focusOnObject: (type, id, name, position) => {
    set({
      selectedObject: { type, id, name },
      focusPosition: position,
      isDetailModalOpen: true,
    });
  },
}));
