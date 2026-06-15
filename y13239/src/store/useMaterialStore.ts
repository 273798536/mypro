import { create } from 'zustand';
import type {
  Material,
  Lesson,
  MaterialVersion,
  Annotation,
  OperationLog,
  FilterState,
} from '../types';
import {
  mockMaterials,
  mockLessons,
  mockVersions,
  mockAnnotations,
  mockOperationLogs,
} from '../data/mockData';

interface MaterialStore {
  materials: Material[];
  lessons: Lesson[];
  versions: MaterialVersion[];
  annotations: Annotation[];
  operationLogs: OperationLog[];
  filters: FilterState;

  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  getFilteredMaterials: () => Material[];
  getLessonsByMaterialId: (materialId: string) => Lesson[];
  getVersionsByMaterialId: (materialId: string) => MaterialVersion[];
  getAnnotationsByMaterialId: (materialId: string) => Annotation[];
  getLogsByMaterialId: (materialId: string) => OperationLog[];
  getMaterialById: (materialId: string) => Material | undefined;

  addAnnotation: (materialId: string, content: string, operator: string, overridesOld: boolean, oldJudgment?: string) => void;
  updateMaterialStatus: (materialId: string, status: Material['status']) => void;
  addOperationLog: (materialId: string, action: OperationLog['action'], operator: string, description: string, beforeChange?: string, afterChange?: string) => void;
}

const initialFilters: FilterState = {
  search: '',
  teacher: '',
  student: '',
  status: '',
  source: '',
  dateRange: {
    start: '',
    end: '',
  },
};

export const useMaterialStore = create<MaterialStore>((set, get) => ({
  materials: mockMaterials,
  lessons: mockLessons,
  versions: mockVersions,
  annotations: mockAnnotations,
  operationLogs: mockOperationLogs,
  filters: initialFilters,

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  resetFilters: () => set({ filters: initialFilters }),

  getFilteredMaterials: () => {
    const { materials, filters } = get();
    return materials.filter((material) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !material.name.toLowerCase().includes(searchLower) &&
          !material.teacher.toLowerCase().includes(searchLower) &&
          !material.student.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (filters.teacher && material.teacher !== filters.teacher) {
        return false;
      }
      if (filters.student && !material.student.includes(filters.student)) {
        return false;
      }
      if (filters.status && material.status !== filters.status) {
        return false;
      }
      if (filters.source && material.source !== filters.source) {
        return false;
      }
      if (filters.dateRange.start) {
        if (material.uploadDate < filters.dateRange.start) {
          return false;
        }
      }
      if (filters.dateRange.end) {
        if (material.uploadDate > filters.dateRange.end) {
          return false;
        }
      }
      return true;
    });
  },

  getLessonsByMaterialId: (materialId) => {
    return get().lessons.filter((lesson) => lesson.materialId === materialId);
  },

  getVersionsByMaterialId: (materialId) => {
    return get()
      .versions.filter((v) => v.materialId === materialId)
      .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
  },

  getAnnotationsByMaterialId: (materialId) => {
    return get()
      .annotations.filter((a) => a.materialId === materialId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getLogsByMaterialId: (materialId) => {
    return get()
      .operationLogs.filter((log) => log.materialId === materialId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  getMaterialById: (materialId) => {
    return get().materials.find((m) => m.id === materialId);
  },

  addAnnotation: (materialId, content, operator, overridesOld, oldJudgment) => {
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      materialId,
      content,
      operator,
      createdAt: new Date().toLocaleString('zh-CN'),
      overridesOld,
      oldJudgment,
    };

    set((state) => ({
      annotations: [...state.annotations, newAnnotation],
      materials: state.materials.map((m) =>
        m.id === materialId ? { ...m, hasManualAnnotation: true, status: 'annotated' } : m
      ),
    }));

    get().addOperationLog(
      materialId,
      'annotate',
      operator,
      '添加人工批注',
      overridesOld ? oldJudgment : undefined,
      overridesOld ? content.substring(0, 50) + '...' : undefined
    );
  },

  updateMaterialStatus: (materialId, status) => {
    const material = get().getMaterialById(materialId);
    const oldStatus = material?.status;

    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === materialId ? { ...m, status } : m
      ),
    }));

    if (oldStatus && oldStatus !== status) {
      get().addOperationLog(
        materialId,
        'status_change',
        '演出统筹-阿蓝',
        `状态从${oldStatus}变更为${status}`,
        oldStatus,
        status
      );
    }
  },

  addOperationLog: (materialId, action, operator, description, beforeChange, afterChange) => {
    const newLog: OperationLog = {
      id: `log-${Date.now()}`,
      materialId,
      action,
      operator,
      timestamp: new Date().toLocaleString('zh-CN'),
      description,
      beforeChange,
      afterChange,
    };

    set((state) => ({
      operationLogs: [...state.operationLogs, newLog],
    }));
  },
}));
