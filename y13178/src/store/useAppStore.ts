import { create } from 'zustand';
import type { ViewMode, SpeckleRecord, ExceptionItem, SceneAnnotation, ExceptionStatus } from '@/types';
import { speckleRecords } from '@/data/records';
import { exceptionItems } from '@/data/exceptions';
import { defaultScene } from '@/data/scenes';

interface AppState {
  viewMode: ViewMode;
  currentScene: SceneAnnotation;
  records: SpeckleRecord[];
  exceptions: ExceptionItem[];
  selectedRecordId: string | null;
  selectedJumpRecord: SpeckleRecord | null;
  showJumpModal: boolean;

  setViewMode: (mode: ViewMode) => void;
  setCurrentScene: (scene: SceneAnnotation) => void;
  selectRecord: (id: string | null) => void;
  updateExceptionStatus: (id: string, status: ExceptionStatus) => void;
  openJumpModal: (record: SpeckleRecord) => void;
  closeJumpModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  viewMode: 'manager',
  currentScene: defaultScene,
  records: speckleRecords,
  exceptions: exceptionItems,
  selectedRecordId: null,
  selectedJumpRecord: null,
  showJumpModal: false,

  setViewMode: (mode) => set({ viewMode: mode }),
  setCurrentScene: (scene) => set({ currentScene: scene }),
  selectRecord: (id) => set({ selectedRecordId: id }),
  updateExceptionStatus: (id, status) =>
    set((state) => ({
      exceptions: state.exceptions.map((e) =>
        e.id === id ? { ...e, status } : e
      ),
    })),
  openJumpModal: (record) =>
    set({ selectedJumpRecord: record, showJumpModal: true }),
  closeJumpModal: () => set({ showJumpModal: false, selectedJumpRecord: null }),
}));
