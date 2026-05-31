import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ExperimentRecord,
  Material,
  FilterState,
  Viewpoint,
  ScaleFormData,
  CriterionNode,
  ValidationError,
} from '@/types';
import { mockRecords, mockMaterials } from '@/data/mockData';
import { calculateAndValidate } from '@/utils/validation';

interface StoreState {
  records: ExperimentRecord[];
  materials: Material[];
  filters: FilterState;
  viewpoints: Viewpoint[];
  selectedRecordId: string | null;
  selectedCriterionId: string | null;
  activeTab: 'converter' | 'records' | 'materials';
  scaleFormData: ScaleFormData;
  calculationResult: {
    reynolds: number;
    mach: number;
    scaleRatio: number;
    errors: ValidationError[];
    status: 'valid' | 'error' | 'warning';
  } | null;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
}

interface StoreActions {
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  selectRecord: (id: string | null) => void;
  selectCriterion: (id: string | null) => void;
  setActiveTab: (tab: 'converter' | 'records' | 'materials') => void;
  updateScaleForm: (data: Partial<ScaleFormData>) => void;
  applyMaterialToForm: (material: Material) => void;
  applyRecordToForm: (record: ExperimentRecord) => void;
  recalculate: () => void;
  saveViewpoint: (name: string) => void;
  loadViewpoint: (id: string) => void;
  deleteViewpoint: (id: string) => void;
  resetViewpoint: () => void;
  updateCamera: (position: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) => void;
  getFilteredRecords: () => ExperimentRecord[];
  getCriterionNodes: () => CriterionNode[];
}

const initialScaleForm: ScaleFormData = {
  modelLength: 0.5,
  modelLengthUnit: 'm',
  realLength: 5,
  realLengthUnit: 'm',
  windSpeed: 50,
  windSpeedUnit: 'm/s',
  airDensity: 1.225,
  airDensityUnit: 'kg/m³',
  airViscosity: 1.81e-5,
  airViscosityUnit: 'Pa·s',
  temperature: 288.15,
  temperatureUnit: 'K',
};

const initialFilters: FilterState = {
  experimentNo: '',
  materialType: '',
  dateRange: null,
  status: 'all',
};

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      records: mockRecords,
      materials: mockMaterials,
      filters: initialFilters,
      viewpoints: [],
      selectedRecordId: null,
      selectedCriterionId: null,
      activeTab: 'converter',
      scaleFormData: initialScaleForm,
      calculationResult: null,
      cameraPosition: { x: 6, y: 5, z: 6 },
      cameraTarget: { x: 0, y: 0, z: 0 },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          selectedRecordId: null,
        }));
      },

      resetFilters: () => {
        set({
          filters: initialFilters,
          selectedRecordId: null,
        });
      },

      selectRecord: (id) => {
        set({ selectedRecordId: id });
        if (id) {
          const record = get().records.find((r) => r.id === id);
          if (record) {
            if (record.reynoldsNumber !== null) {
              get().selectCriterion('re');
            } else if (record.machNumber !== null && record.machNumber > 0.3) {
              get().selectCriterion('ma');
            }
          }
        }
      },

      selectCriterion: (id) => {
        set({ selectedCriterionId: id });
      },

      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      updateScaleForm: (data) => {
        set((state) => ({
          scaleFormData: { ...state.scaleFormData, ...data },
        }));
        get().recalculate();
      },

      applyMaterialToForm: (material) => {
        set((state) => ({
          scaleFormData: {
            ...state.scaleFormData,
            airDensity: 1.225,
            airDensityUnit: 'kg/m³',
          },
          activeTab: 'converter',
        }));
        get().recalculate();
      },

      applyRecordToForm: (record) => {
        set({
          scaleFormData: {
            modelLength: record.modelLength,
            modelLengthUnit: record.modelLengthUnit,
            realLength: record.realLength,
            realLengthUnit: record.realLengthUnit,
            windSpeed: record.windSpeed,
            windSpeedUnit: record.windSpeedUnit,
            airDensity: record.airDensity,
            airDensityUnit: record.airDensityUnit,
            airViscosity: record.airViscosity,
            airViscosityUnit: record.airViscosityUnit,
            temperature: record.temperature,
            temperatureUnit: record.temperatureUnit,
          },
          selectedRecordId: record.id,
          activeTab: 'converter',
        });
        get().recalculate();
      },

      recalculate: () => {
        const { scaleFormData } = get();
        const result = calculateAndValidate(scaleFormData);
        set({ calculationResult: result });
      },

      saveViewpoint: (name) => {
        const { cameraPosition, cameraTarget, viewpoints } = get();
        const newViewpoint: Viewpoint = {
          id: `vp-${Date.now()}`,
          name,
          camera: { ...cameraPosition },
          target: { ...cameraTarget },
          createdAt: new Date().toISOString(),
        };
        set({ viewpoints: [...viewpoints, newViewpoint] });
      },

      loadViewpoint: (id) => {
        const viewpoint = get().viewpoints.find((v) => v.id === id);
        if (viewpoint) {
          set({
            cameraPosition: { ...viewpoint.camera },
            cameraTarget: { ...viewpoint.target },
          });
        }
      },

      deleteViewpoint: (id) => {
        set((state) => ({
          viewpoints: state.viewpoints.filter((v) => v.id !== id),
        }));
      },

      resetViewpoint: () => {
        set({
          cameraPosition: { x: 6, y: 5, z: 6 },
          cameraTarget: { x: 0, y: 0, z: 0 },
        });
      },

      updateCamera: (position, target) => {
        set({
          cameraPosition: { ...position },
          cameraTarget: { ...target },
        });
      },

      getFilteredRecords: () => {
        const { records, filters } = get();
        return records.filter((record) => {
          if (filters.experimentNo && !record.experimentNo.toLowerCase().includes(filters.experimentNo.toLowerCase())) {
            return false;
          }
          if (filters.materialType) {
            const material = get().materials.find((m) => m.id === record.materialId);
            if (!material || !material.category.includes(filters.materialType)) {
              return false;
            }
          }
          if (filters.status !== 'all' && record.status !== filters.status) {
            return false;
          }
          return true;
        });
      },

      getCriterionNodes: (): CriterionNode[] => {
        const { selectedRecordId, getFilteredRecords } = get();
        const filteredRecords = getFilteredRecords();
        const selectedRecord = filteredRecords.find((r) => r.id === selectedRecordId);

        const avgReynolds = filteredRecords.length > 0
          ? filteredRecords.reduce((sum, r) => sum + (r.reynoldsNumber || 0), 0) / filteredRecords.length
          : 0;

        const avgMach = filteredRecords.length > 0
          ? filteredRecords.reduce((sum, r) => sum + (r.machNumber || 0), 0) / filteredRecords.length
          : 0;

        const avgScaleRatio = filteredRecords.length > 0
          ? filteredRecords.reduce((sum, r) => sum + (r.scaleRatio || 0), 0) / filteredRecords.length
          : 0;

        const errorRecords = filteredRecords.filter((r) => r.status === 'error');
        const hasReynoldsError = errorRecords.some((r) =>
          r.errors.some((e) => e.type === 'reynolds_mismatch')
        );
        const hasMachError = errorRecords.some((r) =>
          r.errors.some((e) => e.type === 'mach_mismatch')
        );
        const hasUnitError = errorRecords.some((r) =>
          r.errors.some((e) => e.type === 'unit_mismatch')
        );

        const relatedToSelected = (type: 're' | 'ma' | 'lambda' | 'rho' | 'v' | 'l') => {
          if (!selectedRecord) return filteredRecords.map((r) => r.id);
          if (type === 're' && selectedRecord.reynoldsNumber !== null) return [selectedRecord.id];
          if (type === 'ma' && selectedRecord.machNumber !== null) return [selectedRecord.id];
          if (type === 'lambda' && selectedRecord.scaleRatio !== null) return [selectedRecord.id];
          return [selectedRecord.id];
        };

        return [
          {
            id: 're',
            name: '雷诺数',
            symbol: 'Re',
            description: '惯性力与粘性力之比',
            formula: 'Re = ρvL/μ',
            value: selectedRecord?.reynoldsNumber ?? avgReynolds,
            position: [0, 2, 0] as [number, number, number],
            color: '#3B82F6',
            relatedRecordIds: relatedToSelected('re'),
            hasError: hasReynoldsError,
          },
          {
            id: 'ma',
            name: '马赫数',
            symbol: 'Ma',
            description: '流速与声速之比',
            formula: 'Ma = v/c, c = √(γRT)',
            value: selectedRecord?.machNumber ?? avgMach,
            position: [2.5, 1, 1] as [number, number, number],
            color: '#8B5CF6',
            relatedRecordIds: relatedToSelected('ma'),
            hasError: hasMachError,
          },
          {
            id: 'lambda',
            name: '尺度比',
            symbol: 'λ',
            description: '模型尺寸与实机尺寸之比',
            formula: 'λ = L_model / L_real',
            value: selectedRecord?.scaleRatio ?? avgScaleRatio,
            position: [-2.5, 1, 1] as [number, number, number],
            color: '#10B981',
            relatedRecordIds: relatedToSelected('lambda'),
            hasError: hasUnitError,
          },
          {
            id: 'rho',
            name: '空气密度',
            symbol: 'ρ',
            description: '单位体积空气质量',
            formula: 'ρ = m/V',
            value: selectedRecord?.airDensity ?? 1.225,
            position: [-1.5, -1, -2] as [number, number, number],
            color: '#F59E0B',
            relatedRecordIds: relatedToSelected('rho'),
          },
          {
            id: 'v',
            name: '风速',
            symbol: 'v',
            description: '气流速度',
            formula: 'v = dx/dt',
            value: selectedRecord?.windSpeed ?? 50,
            position: [1.5, -1, -2] as [number, number, number],
            color: '#EF4444',
            relatedRecordIds: relatedToSelected('v'),
          },
          {
            id: 'l',
            name: '特征长度',
            symbol: 'L',
            description: '模型特征尺寸',
            formula: 'L = 模型长度',
            value: selectedRecord?.modelLength ?? 0.5,
            position: [0, -1.5, 1.5] as [number, number, number],
            color: '#06B6D4',
            relatedRecordIds: relatedToSelected('l'),
          },
        ];
      },
    }),
    {
      name: 'wind-tunnel-store',
      partialize: (state) => ({
        viewpoints: state.viewpoints,
        scaleFormData: state.scaleFormData,
      }),
    }
  )
);
