import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  RoomConfig,
  SoundSource,
  AcousticMaterial,
  AbsorberPanel,
  MeasurementPoint,
  ModificationLog,
  ImportMode,
  ValidationError,
} from '../types';
import { defaultMaterials } from '../data/defaultMaterials';
import { validateAll, hasCriticalErrors } from '../utils/validation';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const initialRoom: RoomConfig = {
  width: 8,
  height: 3.5,
  depth: 6,
  unit: 'm',
};

const initialSource: SoundSource = {
  x: 4,
  y: 1.8,
  z: 3,
  frequency: 250,
  amplitude: 1,
};

const initialMeasurementPoints: MeasurementPoint[] = [
  {
    id: 'point-1',
    name: '听音位 1',
    x: 4,
    y: 1.2,
    z: 5,
  },
];

const initialAbsorberPanels: AbsorberPanel[] = [
  {
    id: 'panel-1',
    wall: 'front',
    positionX: 2,
    positionY: 1,
    width: 2,
    height: 1.5,
    materialId: 'mat-001',
  },
];

interface AppState {
  room: RoomConfig;
  soundSource: SoundSource;
  materials: AcousticMaterial[];
  absorberPanels: AbsorberPanel[];
  measurementPoints: MeasurementPoint[];
  selectedPointId: string | null;
  errors: ValidationError[];
  modificationHistory: ModificationLog[];
  importMode: ImportMode;
  showHeatmap: boolean;
  heatmapOpacity: number;
  animationSpeed: number;
  setRoom: (room: Partial<RoomConfig>) => void;
  setSoundSource: (source: Partial<SoundSource>) => void;
  addMaterial: (material: Omit<AcousticMaterial, 'id' | 'createdAt' | 'modifiedAt' | 'version'>) => void;
  updateMaterial: (id: string, updates: Partial<AcousticMaterial>) => void;
  deleteMaterial: (id: string) => void;
  addAbsorberPanel: (panel: Omit<AbsorberPanel, 'id'>) => void;
  updateAbsorberPanel: (id: string, updates: Partial<AbsorberPanel>) => void;
  deleteAbsorberPanel: (id: string) => void;
  addMeasurementPoint: (point: Omit<MeasurementPoint, 'id'>) => void;
  updateMeasurementPoint: (id: string, updates: Partial<MeasurementPoint>) => void;
  deleteMeasurementPoint: (id: string) => void;
  setSelectedPointId: (id: string | null) => void;
  setImportMode: (mode: ImportMode) => void;
  setShowHeatmap: (show: boolean) => void;
  setHeatmapOpacity: (opacity: number) => void;
  setAnimationSpeed: (speed: number) => void;
  addModificationLog: (log: Omit<ModificationLog, 'id' | 'timestamp'>) => void;
  validateState: () => void;
  hasErrors: () => boolean;
  exportConfig: () => unknown;
  importConfig: (config: Partial<AppState> & { materials?: AcousticMaterial[] }) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      room: initialRoom,
      soundSource: initialSource,
      materials: defaultMaterials,
      absorberPanels: initialAbsorberPanels,
      measurementPoints: initialMeasurementPoints,
      selectedPointId: null,
      errors: [],
      modificationHistory: [],
      importMode: 'append',
      showHeatmap: true,
      heatmapOpacity: 0.6,
      animationSpeed: 1,

      setRoom: (room: Partial<RoomConfig>) => {
        const prevRoom = get().room;
        const newRoom = { ...prevRoom, ...room };
        set({ room: newRoom });
        get().addModificationLog({
          action: 'update',
          target: 'room',
          description: '更新房间尺寸',
          previousValue: prevRoom,
          newValue: newRoom,
        });
        get().validateState();
      },

      setSoundSource: (source: Partial<SoundSource>) => {
        const prevSource = get().soundSource;
        const newSource = { ...prevSource, ...source };
        set({ soundSource: newSource });
        get().addModificationLog({
          action: 'update',
          target: 'soundSource',
          description: '更新声源参数',
          previousValue: prevSource,
          newValue: newSource,
        });
        get().validateState();
      },

      addMaterial: (material: Omit<AcousticMaterial, 'id' | 'createdAt' | 'modifiedAt' | 'version'>) => {
        const newMaterial: AcousticMaterial = {
          ...material,
          id: `mat-${generateId()}`,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          version: 1,
        };
        set((state) => ({ materials: [...state.materials, newMaterial] }));
        get().addModificationLog({
          action: 'create',
          target: 'material',
          description: `添加材料: ${material.name}`,
          newValue: newMaterial,
          source: material.source,
        });
        get().validateState();
      },

      updateMaterial: (id: string, updates: Partial<AcousticMaterial>) => {
        const materials = get().materials;
        const index = materials.findIndex((m) => m.id === id);
        if (index >= 0) {
          const prevMaterial = materials[index];
          const newMaterial = {
            ...prevMaterial,
            ...updates,
            modifiedAt: new Date().toISOString(),
            version: prevMaterial.version + 1,
          };
          const newMaterials = [...materials];
          newMaterials[index] = newMaterial;
          set({ materials: newMaterials });
          get().addModificationLog({
            action: 'update',
            target: 'material',
            description: `更新材料: ${prevMaterial.name}`,
            previousValue: prevMaterial,
            newValue: newMaterial,
          });
          get().validateState();
        }
      },

      deleteMaterial: (id: string) => {
        const material = get().materials.find((m) => m.id === id);
        if (material) {
          set((state) => ({
            materials: state.materials.filter((m) => m.id !== id),
            absorberPanels: state.absorberPanels.filter((p) => p.materialId !== id),
          }));
          get().addModificationLog({
            action: 'delete',
            target: 'material',
            description: `删除材料: ${material.name}`,
            previousValue: material,
          });
        }
      },

      addAbsorberPanel: (panel: Omit<AbsorberPanel, 'id'>) => {
        const newPanel: AbsorberPanel = {
          ...panel,
          id: `panel-${generateId()}`,
        };
        set((state) => ({ absorberPanels: [...state.absorberPanels, newPanel] }));
        get().addModificationLog({
          action: 'create',
          target: 'absorberPanel',
          description: '添加吸音板',
          newValue: newPanel,
        });
      },

      updateAbsorberPanel: (id: string, updates: Partial<AbsorberPanel>) => {
        const panels = get().absorberPanels;
        const index = panels.findIndex((p) => p.id === id);
        if (index >= 0) {
          const newPanels = [...panels];
          newPanels[index] = { ...panels[index], ...updates };
          set({ absorberPanels: newPanels });
          get().addModificationLog({
            action: 'update',
            target: 'absorberPanel',
            description: '更新吸音板',
            previousValue: panels[index],
            newValue: newPanels[index],
          });
        }
      },

      deleteAbsorberPanel: (id: string) => {
        const panel = get().absorberPanels.find((p) => p.id === id);
        if (panel) {
          set((state) => ({
            absorberPanels: state.absorberPanels.filter((p) => p.id !== id),
          }));
          get().addModificationLog({
            action: 'delete',
            target: 'absorberPanel',
            description: '删除吸音板',
            previousValue: panel,
          });
        }
      },

      addMeasurementPoint: (point: Omit<MeasurementPoint, 'id'>) => {
        const newPoint: MeasurementPoint = {
          ...point,
          id: `point-${generateId()}`,
        };
        set((state) => ({ measurementPoints: [...state.measurementPoints, newPoint] }));
        get().addModificationLog({
          action: 'create',
          target: 'measurementPoint',
          description: `添加测点: ${point.name}`,
          newValue: newPoint,
        });
        get().validateState();
      },

      updateMeasurementPoint: (id: string, updates: Partial<MeasurementPoint>) => {
        const points = get().measurementPoints;
        const index = points.findIndex((p) => p.id === id);
        if (index >= 0) {
          const newPoints = [...points];
          newPoints[index] = { ...points[index], ...updates };
          set({ measurementPoints: newPoints });
          get().addModificationLog({
            action: 'update',
            target: 'measurementPoint',
            description: `更新测点: ${points[index].name}`,
            previousValue: points[index],
            newValue: newPoints[index],
          });
          get().validateState();
        }
      },

      deleteMeasurementPoint: (id: string) => {
        const point = get().measurementPoints.find((p) => p.id === id);
        if (point) {
          set((state) => ({
            measurementPoints: state.measurementPoints.filter((p) => p.id !== id),
            selectedPointId: state.selectedPointId === id ? null : state.selectedPointId,
          }));
          get().addModificationLog({
            action: 'delete',
            target: 'measurementPoint',
            description: `删除测点: ${point.name}`,
            previousValue: point,
          });
        }
      },

      setSelectedPointId: (id: string | null) => {
        set({ selectedPointId: id });
      },

      setImportMode: (mode: ImportMode) => {
        set({ importMode: mode });
      },

      setShowHeatmap: (show: boolean) => {
        set({ showHeatmap: show });
      },

      setHeatmapOpacity: (opacity: number) => {
        set({ heatmapOpacity: opacity });
      },

      setAnimationSpeed: (speed: number) => {
        set({ animationSpeed: speed });
      },

      addModificationLog: (log: Omit<ModificationLog, 'id' | 'timestamp'>) => {
        const newLog: ModificationLog = {
          ...log,
          id: `log-${generateId()}`,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          modificationHistory: [newLog, ...state.modificationHistory].slice(0, 100),
        }));
      },

      validateState: () => {
        const state = get();
        const errors = validateAll(
          state.room,
          state.soundSource,
          state.materials,
          state.measurementPoints
        );
        set({ errors });
      },

      hasErrors: () => {
        return hasCriticalErrors(get().errors);
      },

      exportConfig: () => {
        const state = get();
        return {
          room: state.room,
          soundSource: state.soundSource,
          materials: state.materials,
          absorberPanels: state.absorberPanels,
          measurementPoints: state.measurementPoints,
          exportedAt: new Date().toISOString(),
          version: '1.0',
        };
      },

      importConfig: (config: Partial<AppState> & { materials?: AcousticMaterial[] }) => {
        const mode = get().importMode;
        const currentMaterials = get().materials;

        if (config.materials) {
          let newMaterials: AcousticMaterial[];
          if (mode === 'overwrite') {
            newMaterials = config.materials;
          } else if (mode === 'append') {
            newMaterials = [...currentMaterials, ...config.materials];
          } else {
            const existingIds = new Set(currentMaterials.map((m) => m.id));
            newMaterials = [
              ...currentMaterials,
              ...config.materials.filter((m) => !existingIds.has(m.id)),
            ];
          }
          set({ materials: newMaterials });
        }

        if (config.room) set({ room: config.room });
        if (config.soundSource) set({ soundSource: config.soundSource });
        if (config.absorberPanels) set({ absorberPanels: config.absorberPanels });
        if (config.measurementPoints) set({ measurementPoints: config.measurementPoints });

        get().addModificationLog({
          action: 'import',
          target: 'config',
          description: `导入配置 (模式: ${mode})`,
          source: '用户导入',
        });

        get().validateState();
      },
    }),
    {
      name: 'acoustic-studio-storage',
      partialize: (state) => ({
        room: state.room,
        soundSource: state.soundSource,
        materials: state.materials,
        absorberPanels: state.absorberPanels,
        measurementPoints: state.measurementPoints,
        modificationHistory: state.modificationHistory,
        showHeatmap: state.showHeatmap,
        heatmapOpacity: state.heatmapOpacity,
        animationSpeed: state.animationSpeed,
      }),
    }
  )
);
