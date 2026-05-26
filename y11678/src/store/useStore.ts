import { create } from 'zustand';
import {
  QuadricSurfaceParams,
  SlicePlane,
  Preset,
  ComputationWarning,
  HoverInfo,
  ImportStrategy,
  ImportResult,
} from '../types';
import { getDefaultEquation, getDefaultBounds, generateId } from '../math/presets';

interface AppState {
  surface: QuadricSurfaceParams;
  slicePlane: SlicePlane;
  presets: Preset[];
  warnings: ComputationWarning[];
  hoverInfo: HoverInfo;
  selectedPresetId: string | null;
  cameraPosition: number[];
  cameraTarget: number[];
  isLoading: boolean;
  lastImportSource: string | null;

  setSurface: (surface: Partial<QuadricSurfaceParams>) => void;
  setEquation: (equation: Partial<QuadricSurfaceParams['equation']>) => void;
  setBounds: (bounds: Partial<QuadricSurfaceParams['bounds']>) => void;
  setSampleDensity: (density: number) => void;
  setSlicePlane: (plane: Partial<SlicePlane>) => void;
  addWarning: (warning: ComputationWarning) => void;
  clearWarnings: () => void;
  removeWarning: (id: string) => void;
  setHoverInfo: (info: Partial<HoverInfo>) => void;
  setCameraPosition: (position: number[]) => void;
  setCameraTarget: (target: number[]) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  loadSurfacePreset: (index: number) => void;
  importData: (data: string, strategy: ImportStrategy) => ImportResult;
  exportData: () => string;
  resetSurface: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  surface: {
    id: generateId(),
    name: '自定义曲面',
    source: 'default',
    equation: getDefaultEquation(),
    bounds: getDefaultBounds(),
    sampleDensity: 60,
    modificationHistory: [],
  },
  slicePlane: {
    normal: { x: 0, y: 0, z: 1 },
    distance: 0,
    visible: true,
    showContours: true,
    contourCount: 8,
  },
  presets: [],
  warnings: [],
  hoverInfo: {
    visible: false,
    position: { x: 0, y: 0 },
    worldPosition: { x: 0, y: 0, z: 0 },
    value: 0,
  },
  selectedPresetId: null,
  cameraPosition: [6, 6, 6],
  cameraTarget: [0, 0, 0],
  isLoading: false,
  lastImportSource: null,

  setSurface: (surface) =>
    set((state) => ({
      surface: { ...state.surface, ...surface },
    })),

  setEquation: (equation) =>
    set((state) => ({
      surface: {
        ...state.surface,
        equation: { ...state.surface.equation, ...equation },
        modificationHistory: [
          ...(state.surface.modificationHistory || []),
          {
            timestamp: new Date().toISOString(),
            action: '修改方程参数',
            previousValue: JSON.stringify(state.surface.equation),
            newValue: JSON.stringify({ ...state.surface.equation, ...equation }),
          },
        ],
      },
    })),

  setBounds: (bounds) =>
    set((state) => ({
      surface: {
        ...state.surface,
        bounds: { ...state.surface.bounds, ...bounds },
      },
    })),

  setSampleDensity: (density) =>
    set((state) => ({
      surface: { ...state.surface, sampleDensity: density },
    })),

  setSlicePlane: (plane) =>
    set((state) => ({
      slicePlane: { ...state.slicePlane, ...plane },
    })),

  addWarning: (warning) =>
    set((state) => ({
      warnings: [...state.warnings.filter((w) => w.id !== warning.id), warning],
    })),

  clearWarnings: () => set({ warnings: [] }),

  removeWarning: (id) =>
    set((state) => ({
      warnings: state.warnings.filter((w) => w.id !== id),
    })),

  setHoverInfo: (info) =>
    set((state) => ({
      hoverInfo: { ...state.hoverInfo, ...info },
    })),

  setCameraPosition: (position) => set({ cameraPosition: position }),

  setCameraTarget: (target) => set({ cameraTarget: target }),

  savePreset: (name) => {
    const state = get();
    const newPreset: Preset = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      source: state.surface.source || 'user_created',
      surface: { ...state.surface },
      slicePlane: { ...state.slicePlane },
      camera: {
        position: [...state.cameraPosition],
        target: [...state.cameraTarget],
      },
      modificationHistory: [...(state.surface.modificationHistory || [])],
    };
    set((state) => ({
      presets: [...state.presets, newPreset],
    }));
  },

  loadPreset: (id) => {
    const preset = get().presets.find((p) => p.id === id);
    if (preset) {
      set({
        surface: { ...preset.surface },
        slicePlane: { ...preset.slicePlane },
        cameraPosition: [...preset.camera.position],
        cameraTarget: [...preset.camera.target],
        selectedPresetId: id,
      });
    }
  },

  deletePreset: (id) =>
    set((state) => ({
      presets: state.presets.filter((p) => p.id !== id),
      selectedPresetId: state.selectedPresetId === id ? null : state.selectedPresetId,
    })),

  loadSurfacePreset: (index) => {
    const { SURFACE_PRESETS } = require('../math/presets');
    const preset = SURFACE_PRESETS[index];
    if (preset) {
      set((state) => ({
        surface: {
          id: generateId(),
          name: preset.name,
          source: `preset_${index}`,
          equation: { ...preset.equation },
          bounds: { ...preset.bounds },
          sampleDensity: preset.sampleDensity,
          modificationHistory: [
            ...(state.surface.modificationHistory || []),
            {
              timestamp: new Date().toISOString(),
              action: `加载预设: ${preset.name}`,
            },
          ],
        },
      }));
    }
  },

  importData: (dataString, strategy) => {
    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      overwritten: 0,
      errors: [],
      warnings: [],
    };

    try {
      const data = JSON.parse(dataString);
      const state = get();
      const existingPresets = [...state.presets];

      if (Array.isArray(data)) {
        data.forEach((item: Preset) => {
          const existingIndex = existingPresets.findIndex(
            (p) => p.name === item.name
          );

          if (existingIndex >= 0) {
            if (strategy === 'ignore') {
              result.skipped++;
              result.warnings.push(`已跳过已存在的预设: ${item.name}`);
            } else if (strategy === 'overwrite') {
              existingPresets[existingIndex] = {
                ...item,
                id: existingPresets[existingIndex].id,
                modifiedAt: new Date().toISOString(),
              };
              result.overwritten++;
            } else if (strategy === 'append') {
              let newName = item.name;
              let counter = 2;
              while (existingPresets.some((p) => p.name === newName)) {
                newName = `${item.name}_${counter}`;
                counter++;
              }
              existingPresets.push({
                ...item,
                id: generateId(),
                name: newName,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
              });
              result.imported++;
            }
          } else {
            existingPresets.push({
              ...item,
              id: generateId(),
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
            });
            result.imported++;
          }
        });
      } else {
        result.errors.push('导入数据格式错误，应为JSON数组');
        result.success = false;
      }

      set({
        presets: existingPresets,
        lastImportSource: `import_${Date.now()}`,
      });
    } catch (e) {
      result.success = false;
      result.errors.push(`解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
    }

    return result;
  },

  exportData: () => {
    const state = get();
    return JSON.stringify(state.presets, null, 2);
  },

  resetSurface: () => {
    set({
      surface: {
        id: generateId(),
        name: '自定义曲面',
        source: 'reset',
        equation: getDefaultEquation(),
        bounds: getDefaultBounds(),
        sampleDensity: 60,
        modificationHistory: [
          {
            timestamp: new Date().toISOString(),
            action: '重置为默认曲面',
          },
        ],
      },
      slicePlane: {
        normal: { x: 0, y: 0, z: 1 },
        distance: 0,
        visible: true,
        showContours: true,
        contourCount: 8,
      },
    });
  },
}));
