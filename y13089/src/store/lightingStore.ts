import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  PointCoordinate, 
  ExceptionItem, 
  ManualRemark, 
  FilterState, 
  ViewMode,
  MergedPointGroup,
  ProcessingStatus
} from '@/types';
import { samplePoints, sampleExceptions, sampleRemarks } from '@/data/sampleData';
import { mergeAdjacentPoints } from '@/utils/mergePoints';

interface LightingStore {
  points: PointCoordinate[];
  exceptions: ExceptionItem[];
  remarks: ManualRemark[];
  mergedGroups: MergedPointGroup[];
  filters: FilterState;
  viewMode: ViewMode;
  selectedPointId: string | null;
  selectedExceptionId: string | null;
  selectedGroupId: string | null;
  adjacentThreshold: number;
  processedPointIds: string[];

  setPoints: (points: PointCoordinate[]) => void;
  setExceptions: (exceptions: ExceptionItem[]) => void;
  setRemarks: (remarks: ManualRemark[]) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedPointId: (id: string | null) => void;
  setSelectedExceptionId: (id: string | null) => void;
  setSelectedGroupId: (id: string | null) => void;
  setAdjacentThreshold: (threshold: number) => void;
  addRemark: (remark: Omit<ManualRemark, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExceptionStatus: (id: string, status: ExceptionItem['status'], resolution?: string) => void;
  togglePointProcessed: (pointId: string) => void;
  recalculateMergedGroups: () => void;
  exportException: (exceptionId: string) => string;
  getProcessingStatus: () => ProcessingStatus;
  getFilteredPoints: () => PointCoordinate[];
  getPointRemarks: (pointId: string) => ManualRemark[];
  getExceptionRemarks: (exceptionId: string) => ManualRemark[];
  resetAllData: () => void;
}

const defaultFilters: FilterState = {
  scheme: [],
  showcase: [],
  luxRange: [0, 300],
  criRange: [70, 100],
  colorTempRange: [2700, 6500],
  searchKeyword: '',
  showOnlyInconsistent: false,
  showOnlyExceptions: false
};

export const useLightingStore = create<LightingStore>()(
  persist(
    (set, get) => ({
      points: samplePoints,
      exceptions: sampleExceptions,
      remarks: sampleRemarks,
      mergedGroups: mergeAdjacentPoints(samplePoints, 1.0),
      filters: defaultFilters,
      viewMode: 'list',
      selectedPointId: null,
      selectedExceptionId: null,
      selectedGroupId: null,
      adjacentThreshold: 1.0,
      processedPointIds: [],

      setPoints: (points) => set({ points }),
      setExceptions: (exceptions) => set({ exceptions }),
      setRemarks: (remarks) => set({ remarks }),

      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),

      resetFilters: () => set({ filters: defaultFilters }),

      setViewMode: (mode) => set({ viewMode: mode }),
      setSelectedPointId: (id) => set({ selectedPointId: id }),
      setSelectedExceptionId: (id) => set({ selectedExceptionId: id }),
      setSelectedGroupId: (id) => set({ selectedGroupId: id }),
      setAdjacentThreshold: (threshold) => {
        set({ adjacentThreshold: threshold });
        get().recalculateMergedGroups();
      },

      addRemark: (remark) => {
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const newRemark: ManualRemark = {
          ...remark,
          id: `RM-${Date.now()}`,
          createdAt: now,
          updatedAt: now
        };
        set((state) => ({
          remarks: [...state.remarks, newRemark]
        }));
      },

      updateExceptionStatus: (id, status, resolution) => {
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        set((state) => ({
          exceptions: state.exceptions.map((ex) =>
            ex.id === id
              ? {
                  ...ex,
                  status,
                  resolvedAt: status === 'resolved' ? now : undefined,
                  resolution: resolution || ex.resolution
                }
              : ex
          )
        }));
      },

      togglePointProcessed: (pointId) => {
        set((state) => ({
          processedPointIds: state.processedPointIds.includes(pointId)
            ? state.processedPointIds.filter((id) => id !== pointId)
            : [...state.processedPointIds, pointId]
        }));
      },

      recalculateMergedGroups: () => {
        const { points, adjacentThreshold } = get();
        set({ mergedGroups: mergeAdjacentPoints(points, adjacentThreshold) });
      },

      exportException: (exceptionId) => {
        const { exceptions, points, remarks } = get();
        const exception = exceptions.find((e) => e.id === exceptionId);
        if (!exception) return '';

        const relatedPoints = points.filter((p) =>
          exception.relatedPointIds.includes(p.id)
        );
        const relatedRemarks = remarks.filter((r) =>
          r.targetId === exceptionId && r.targetType === 'exception'
        );

        const exportData = {
          异常编号: exception.id,
          异常类型: exception.type,
          严重程度: exception.severity,
          状态: exception.status,
          标题: exception.title,
          描述: exception.description,
          处理人: exception.assignee,
          创建时间: exception.createdAt,
          解决时间: exception.resolvedAt || '',
          解决方案: exception.resolution || '',
          空间位置: {
            相关点位: relatedPoints.map((p) => ({
              点位ID: p.id,
              点位名称: p.name,
              原始名称: p.originalName,
              坐标: `X:${p.x} Y:${p.y} Z:${p.z}`,
              展柜: p.showcaseName,
              灯光方案: p.lightingScheme
            }))
          },
          原始证据: exception.originalEvidence.map((ev) => ({
            点位名称: ev.pointName,
            原始坐标: `X:${ev.coordinate.x} Y:${ev.coordinate.y} Z:${ev.coordinate.z}`,
            来源文件: ev.sourceFile,
            行号: ev.rowNumber,
            原始值: ev.originalValue
          })),
          人工备注: relatedRemarks.map((r) => ({
            作者: r.author,
            内容: r.content,
            时间: r.createdAt
          }))
        };

        return JSON.stringify(exportData, null, 2);
      },

      getProcessingStatus: () => {
        const { points, exceptions, processedPointIds } = get();
        const totalPoints = points.length;
        const processedPoints = processedPointIds.length;
        const pendingPoints = totalPoints - processedPoints;
        const totalExceptions = exceptions.length;
        const resolvedExceptions = exceptions.filter((e) => e.status === 'resolved').length;
        const pendingExceptions = exceptions.filter((e) => e.status === 'pending').length;
        const evidenceNeededExceptions = exceptions.filter((e) => e.status === 'evidence_needed').length;

        return {
          totalPoints,
          processedPoints,
          pendingPoints,
          totalExceptions,
          resolvedExceptions,
          pendingExceptions,
          evidenceNeededExceptions
        };
      },

      getFilteredPoints: () => {
        const { points, filters, exceptions } = get();
        const exceptionPointIds = new Set(exceptions.flatMap((e) => e.relatedPointIds));

        return points.filter((point) => {
          if (filters.scheme.length > 0 && !filters.scheme.includes(point.lightingScheme)) {
            return false;
          }
          if (filters.showcase.length > 0 && !filters.showcase.includes(point.showcaseId)) {
            return false;
          }
          if (point.lux < filters.luxRange[0] || point.lux > filters.luxRange[1]) {
            return false;
          }
          if (point.cri < filters.criRange[0] || point.cri > filters.criRange[1]) {
            return false;
          }
          if (point.colorTemperature < filters.colorTempRange[0] || point.colorTemperature > filters.colorTempRange[1]) {
            return false;
          }
          if (filters.searchKeyword) {
            const keyword = filters.searchKeyword.toLowerCase();
            if (
              !point.name.toLowerCase().includes(keyword) &&
              !point.originalName.toLowerCase().includes(keyword) &&
              !point.showcaseName.toLowerCase().includes(keyword) &&
              !point.id.toLowerCase().includes(keyword)
            ) {
              return false;
            }
          }
          if (filters.showOnlyInconsistent && point.name === point.originalName) {
            return false;
          }
          if (filters.showOnlyExceptions && !exceptionPointIds.has(point.id)) {
            return false;
          }
          return true;
        });
      },

      getPointRemarks: (pointId) => {
        const { remarks } = get();
        return remarks.filter((r) => r.targetId === pointId && r.targetType === 'point');
      },

      getExceptionRemarks: (exceptionId) => {
        const { remarks } = get();
        return remarks.filter((r) => r.targetId === exceptionId && r.targetType === 'exception');
      },

      resetAllData: () => {
        set({
          points: samplePoints,
          exceptions: sampleExceptions,
          remarks: sampleRemarks,
          mergedGroups: mergeAdjacentPoints(samplePoints, 1.0),
          filters: defaultFilters,
          viewMode: 'list',
          selectedPointId: null,
          selectedExceptionId: null,
          selectedGroupId: null,
          processedPointIds: []
        });
      }
    }),
    {
      name: 'lighting-scheme-store',
      partialize: (state) => ({
        filters: state.filters,
        remarks: state.remarks,
        exceptions: state.exceptions,
        processedPointIds: state.processedPointIds,
        selectedPointId: state.selectedPointId,
        selectedExceptionId: state.selectedExceptionId,
        adjacentThreshold: state.adjacentThreshold,
        viewMode: state.viewMode
      })
    }
  )
);
