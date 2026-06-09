import { create } from 'zustand';
import type {
  WaterLevelState,
  DeviceCoord,
  AnomalyConclusion,
  CameraView,
  SectionPlaneState,
  Axis,
  PanelTab,
} from '@/types';
import { initialWaterLevel } from '@/data/waterLevel';
import { devices as initialDevices } from '@/data/devices';
import { initialAnomalies } from '@/data/anomalies';
import { presetViews } from '@/data/views';

interface SceneState {
  waterLevel: WaterLevelState;
  devices: DeviceCoord[];
  anomalies: AnomalyConclusion[];
  savedViews: CameraView[];
  activeTab: PanelTab;
  selectedAnomalyId: string | null;
  selectedDeviceId: string | null;
  panelCollapsed: boolean;
  sectionPlanes: Record<Axis, SectionPlaneState>;
  waterLevelAnimating: boolean;

  setWaterLevel: (level: Partial<WaterLevelState>) => void;
  animateWaterLevel: (target: number, duration?: number) => void;
  selectAnomaly: (id: string | null) => void;
  selectDevice: (id: string | null) => void;
  setActiveTab: (tab: PanelTab) => void;
  togglePanel: () => void;
  setPanelCollapsed: (v: boolean) => void;
  saveView: (view: Omit<CameraView, 'id' | 'createdAt'>) => void;
  deleteView: (id: string) => void;
  setSectionPlane: (axis: Axis, patch: Partial<SectionPlaneState>) => void;
  toggleSectionPlane: (axis: Axis) => void;
  verifyAnomaly: (id: string) => void;
  setWaterLevelAnimating: (v: boolean) => void;
  applyBoundaryState: (waterLevel: WaterLevelState, anomalies: AnomalyConclusion[]) => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  waterLevel: initialWaterLevel,
  devices: initialDevices,
  anomalies: initialAnomalies,
  savedViews: presetViews,
  activeTab: 'section',
  selectedAnomalyId: null,
  selectedDeviceId: null,
  panelCollapsed: false,
  waterLevelAnimating: false,
  sectionPlanes: {
    x: { axis: 'x', position: 0, enabled: false, invert: false },
    y: { axis: 'y', position: 5, enabled: false, invert: false },
    z: { axis: 'z', position: 0, enabled: false, invert: false },
  },

  setWaterLevel: (level) =>
    set((s) => ({ waterLevel: { ...s.waterLevel, ...level } })),

  animateWaterLevel: (target, duration = 1500) => {
    const start = get().waterLevel.currentLevel;
    const startTime = performance.now();
    set({ waterLevelAnimating: true });

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      set((s) => ({ waterLevel: { ...s.waterLevel, currentLevel: current } }));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        set({ waterLevelAnimating: false });
      }
    };
    requestAnimationFrame(step);
  },

  selectAnomaly: (id) => set({ selectedAnomalyId: id }),
  selectDevice: (id) => set({ selectedDeviceId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  togglePanel: () => set((s) => ({ panelCollapsed: !s.panelCollapsed })),
  setPanelCollapsed: (v) => set({ panelCollapsed: v }),

  saveView: (view) =>
    set((s) => ({
      savedViews: [
        ...s.savedViews,
        { ...view, id: `view-${Date.now()}`, createdAt: Date.now() },
      ],
    })),

  deleteView: (id) =>
    set((s) => ({ savedViews: s.savedViews.filter((v) => v.id !== id) })),

  setSectionPlane: (axis, patch) =>
    set((s) => ({
      sectionPlanes: {
        ...s.sectionPlanes,
        [axis]: { ...s.sectionPlanes[axis], ...patch },
      },
    })),

  toggleSectionPlane: (axis) =>
    set((s) => ({
      sectionPlanes: {
        ...s.sectionPlanes,
        [axis]: { ...s.sectionPlanes[axis], enabled: !s.sectionPlanes[axis].enabled },
      },
    })),

  verifyAnomaly: (id) =>
    set((s) => ({
      anomalies: s.anomalies.map((a) =>
        a.id === id ? { ...a, verified: true } : a
      ),
    })),

  setWaterLevelAnimating: (v) => set({ waterLevelAnimating: v }),

  applyBoundaryState: (waterLevel, anomalies) =>
    set({ waterLevel, anomalies }),
}));
