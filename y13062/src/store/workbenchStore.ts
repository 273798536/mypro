import { create } from 'zustand';
import type {
  CollisionAnomaly,
  AnomalyStatus,
  FilterState,
  ViewState,
  ViewSnapshot,
  TimelineEvent,
  MaterialRecord,
  ConfirmRecord,
  ExportRecord,
} from '@/types';
import {
  getMockAnomalies,
  mockTimeline,
  mockViewSnapshots,
  mockExportRecords,
  mockWells,
  mockObstacles,
} from '@/data/mockData';
import { parseCadFile, type ParsedLayer, type ParsedWell, type ParsedObstacle, type ParseResult } from '@/utils/cadParser';
import {
  calculateCollisions,
  recalculateWithNewLayer,
  DEFAULT_CONFIG,
  type RecalculateResult,
  type CalculateResult,
} from '@/utils/collisionEngine';

export interface UploadMaterialResult {
  success: boolean;
  parseResult?: ParseResult;
  recalcResult?: RecalculateResult & { mergedWells: ParsedWell[]; mergedObstacles: ParsedObstacle[]; warnings: string[] };
  material?: MaterialRecord;
  errors?: string[];
  warnings?: string[];
}

export interface RerunResult {
  success: boolean;
  calcResult?: CalculateResult;
  event?: TimelineEvent;
}

interface WorkbenchStore {
  taskId: string | null;
  anomalies: CollisionAnomaly[];
  wells: ParsedWell[];
  obstacles: ParsedObstacle[];
  selectedAnomalyId: string | null;
  hoveredAnomalyId: string | null;
  filterState: FilterState;
  viewState: ViewState;
  viewSnapshots: ViewSnapshot[];
  timeline: TimelineEvent[];
  exportRecords: ExportRecord[];
  calcStats: CalculateResult['stats'] | null;
  isCalculating: boolean;
  lastCalculatedAt: string | null;

  initTask: (taskId: string) => void;
  setSelectedAnomalyId: (id: string | null) => void;
  setHoveredAnomalyId: (id: string | null) => void;
  setFilterState: (filter: Partial<FilterState>) => void;
  setViewState: (view: Partial<ViewState>) => void;
  resetViewState: () => void;
  saveViewSnapshot: (name: string, anomalyId?: string) => ViewSnapshot;
  applyViewSnapshot: (snapshotId: string) => void;
  updateAnomalyStatus: (anomalyId: string, newStatus: AnomalyStatus, remark: string, operator: string) => void;
  addMaterial: (anomalyId: string, material: Omit<MaterialRecord, 'id' | 'anomalyId' | 'uploadedAt' | 'version'>) => void;
  addMaterialWithParse: (
    anomalyId: string,
    fileName: string,
    fileContent: string,
    options: { isSupplement: boolean; source: string; operator: string; remark?: string; fileSize: number; fileType: string; fileData: string },
  ) => Promise<UploadMaterialResult>;
  rerunCollisionCalculation: (operator: string) => Promise<RerunResult>;
  getNextLayerVersion: (anomalyId: string) => number;
  addExportRecord: (record: Omit<ExportRecord, 'id' | 'exportedAt'>) => void;

  getFilteredAnomalies: () => CollisionAnomaly[];
  getAnomaly: (id: string) => CollisionAnomaly | undefined;
}

const defaultFilter: FilterState = {
  types: [],
  levels: [],
  statuses: [],
  keyword: '',
};

const defaultView: ViewState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  centerX: 450,
  centerY: 320,
};

export const useWorkbenchStore = create<WorkbenchStore>((set, get) => ({
  taskId: null,
  anomalies: [],
  wells: [],
  obstacles: [],
  selectedAnomalyId: null,
  hoveredAnomalyId: null,
  filterState: defaultFilter,
  viewState: defaultView,
  viewSnapshots: [],
  timeline: [],
  exportRecords: [],
  calcStats: null,
  isCalculating: false,
  lastCalculatedAt: null,

  initTask: (taskId) => {
    if (get().taskId === taskId) return;
    const initialAnomalies = getMockAnomalies(taskId);
    const initWells = mockWells.map(w => ({ id: w.id, name: w.name, x: w.x, y: w.y }));
    const initObstacles = mockObstacles.map(o => ({
      id: o.id,
      type: o.type,
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      color: o.color,
      bufferZone: o.type.includes('管线') || o.type.includes('燃气') ? 30 : 50,
    }));

    const initialCalc = calculateCollisions(initWells, initObstacles, DEFAULT_CONFIG, initialAnomalies);

    set({
      taskId,
      anomalies: initialCalc.anomalies,
      wells: initWells,
      obstacles: initObstacles,
      selectedAnomalyId: null,
      hoveredAnomalyId: null,
      filterState: defaultFilter,
      viewState: defaultView,
      viewSnapshots: mockViewSnapshots.filter(s => s.taskId === taskId),
      timeline: mockTimeline.filter(t => t.taskId === taskId),
      exportRecords: mockExportRecords.filter(r => r.taskId === taskId),
      calcStats: initialCalc.stats,
      lastCalculatedAt: initialCalc.processedAt,
      isCalculating: false,
    });
  },

  setSelectedAnomalyId: (id) => set({ selectedAnomalyId: id }),

  setHoveredAnomalyId: (id) => set({ hoveredAnomalyId: id }),

  setFilterState: (filter) => set(state => ({
    filterState: { ...state.filterState, ...filter },
  })),

  setViewState: (view) => set(state => ({
    viewState: { ...state.viewState, ...view },
  })),

  resetViewState: () => set({ viewState: defaultView }),

  saveViewSnapshot: (name, anomalyId) => {
    const state = get();
    const snapshot: ViewSnapshot = {
      id: `view-${Date.now()}`,
      taskId: state.taskId!,
      anomalyId,
      name,
      viewState: { ...state.viewState },
      filterState: { ...state.filterState },
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      operator: '阿乔',
    };
    set(st => ({ viewSnapshots: [snapshot, ...st.viewSnapshots] }));
    return snapshot;
  },

  applyViewSnapshot: (snapshotId) => {
    const snapshot = get().viewSnapshots.find(s => s.id === snapshotId);
    if (snapshot) {
      set({
        viewState: { ...snapshot.viewState },
        filterState: snapshot.filterState ? (snapshot.filterState as unknown as FilterState) : get().filterState,
      });
    }
  },

  updateAnomalyStatus: (anomalyId, newStatus, remark, operator) => {
    const state = get();
    const anomaly = state.anomalies.find(a => a.id === anomalyId);
    if (!anomaly) return;

    const record: ConfirmRecord = {
      id: `conf-${Date.now()}`,
      anomalyId,
      fromStatus: anomaly.status,
      toStatus: newStatus,
      remark,
      operator,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
    };

    const event: TimelineEvent = {
      id: `tl-${Date.now()}`,
      taskId: state.taskId!,
      type: 'status_change',
      anomalyId,
      anomalyName: anomaly.wellName,
      description: `异常状态变更：${anomaly.status} → ${newStatus}`,
      timestamp: record.timestamp,
      operator,
      snapshot: { from: anomaly.status, to: newStatus, remark },
    };

    set(st => ({
      anomalies: st.anomalies.map(a =>
        a.id === anomalyId
          ? {
              ...a,
              status: newStatus,
              updatedAt: record.timestamp,
              confirmHistory: [...a.confirmHistory, record],
            }
          : a
      ),
      timeline: [event, ...st.timeline],
    }));
  },

  addMaterial: (anomalyId, material) => {
    const state = get();
    const anomaly = state.anomalies.find(a => a.id === anomalyId);
    if (!anomaly) return;

    const version = get().getNextLayerVersion(anomalyId);

    const mat: MaterialRecord = {
      ...material,
      id: `mat-${Date.now()}`,
      anomalyId,
      uploadedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      version,
    };

    const event: TimelineEvent = {
      id: `tl-${Date.now() + 1}`,
      taskId: state.taskId!,
      type: 'material_upload',
      anomalyId,
      anomalyName: anomaly.wellName,
      description: material.isSupplement
        ? `补录CAD图层：${material.name}（不覆盖原判断，原结论维持）`
        : `上传材料：${material.name}（版本v${version}）`,
      timestamp: mat.uploadedAt,
      operator: material.operator,
      snapshot: { fileName: material.name, isSupplement: material.isSupplement, version },
    };

    set(st => ({
      anomalies: st.anomalies.map(a =>
        a.id === anomalyId
          ? { ...a, materials: [...a.materials, mat], updatedAt: mat.uploadedAt }
          : a
      ),
      timeline: [event, ...st.timeline],
    }));
  },

  addMaterialWithParse: async (anomalyId, fileName, fileContent, options) => {
    const state = get();
    const anomaly = state.anomalies.find(a => a.id === anomalyId);
    if (!anomaly) {
      return { success: false, errors: ['异常不存在'] };
    }

    set({ isCalculating: true });

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const parseResult = parseCadFile(fileContent, fileName);
      if (!parseResult.success || !parseResult.layer) {
        set({ isCalculating: false });
        return { success: false, errors: parseResult.errors, warnings: parseResult.warnings };
      }

      const layer = parseResult.layer;
      const version = state.getNextLayerVersion(anomalyId);

      const recalcResult = recalculateWithNewLayer(
        state.wells,
        state.obstacles,
        state.anomalies,
        layer,
        options.isSupplement,
        DEFAULT_CONFIG,
      );

      const mat: MaterialRecord = {
        id: `mat-${Date.now()}`,
        anomalyId,
        name: fileName,
        source: options.source,
        isSupplement: options.isSupplement,
        uploadedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        operator: options.operator,
        remark: options.remark || `解析结果：${layer.featureCount.wells}口井，${layer.featureCount.obstacles}个障碍`,
        fileSize: options.fileSize,
        fileType: options.fileType,
        version,
        fileData: options.fileData,
      };

      const parseInfo = `解析成功：${layer.featureCount.wells}口井、${layer.featureCount.obstacles}个障碍`;
      const versionInfo = options.isSupplement ? '（后补材料，不覆盖原判断）' : `（版本v${version}）`;
      const changeInfo = recalcResult.changes.added > 0 || recalcResult.changes.removed > 0 || recalcResult.changes.upgraded > 0 || recalcResult.changes.downgraded > 0
        ? `，重算后：新增${recalcResult.changes.added}处、解除${recalcResult.changes.removed}处、升级${recalcResult.changes.upgraded}处、降级${recalcResult.changes.downgraded}处`
        : '，无异常变化';

      const event: TimelineEvent = {
        id: `tl-${Date.now() + 1}`,
        taskId: state.taskId!,
        type: 'material_upload',
        anomalyId,
        anomalyName: anomaly.wellName,
        description: `上传CAD图层：${fileName}${versionInfo} · ${parseInfo}${changeInfo}`,
        timestamp: mat.uploadedAt,
        operator: options.operator,
        snapshot: {
          fileName,
          isSupplement: options.isSupplement,
          version,
          parsedFeatures: layer.featureCount,
          changes: recalcResult.changes,
        },
      };

      const updatedAnomalies = recalcResult.anomalies.map(a => {
        if (a.id === anomalyId) {
          return { ...a, materials: [...a.materials, mat], updatedAt: mat.uploadedAt };
        }
        return a;
      });

      set(st => ({
        anomalies: updatedAnomalies,
        wells: recalcResult.mergedWells,
        obstacles: recalcResult.mergedObstacles,
        calcStats: recalcResult.stats,
        lastCalculatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        timeline: [event, ...st.timeline],
        isCalculating: false,
      }));

      const allWarnings = [...(parseResult.warnings || []), ...recalcResult.warnings];

      return {
        success: true,
        parseResult,
        recalcResult,
        material: mat,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
      };
    } catch (e) {
      set({ isCalculating: false });
      return {
        success: false,
        errors: [`处理失败：${e instanceof Error ? e.message : String(e)}`],
      };
    }
  },

  rerunCollisionCalculation: async (operator) => {
    const state = get();
    if (!state.taskId) {
      return { success: false };
    }

    set({ isCalculating: true });

    try {
      await new Promise(resolve => setTimeout(resolve, 1200));

      const calcResult = calculateCollisions(state.wells, state.obstacles, DEFAULT_CONFIG, state.anomalies);

      const now = new Date().toLocaleString('zh-CN', { hour12: false });

      const event: TimelineEvent = {
        id: `tl-${Date.now()}`,
        taskId: state.taskId!,
        type: 'task_rerun',
        description: `重跑碰撞检测：共${state.wells.length}口井、${state.obstacles.length}个障碍，检出${calcResult.anomalies.length}处异常（高${calcResult.stats.high}/中${calcResult.stats.medium}/低${calcResult.stats.low}）`,
        timestamp: now,
        operator,
        snapshot: {
          wells: state.wells.length,
          obstacles: state.obstacles.length,
          anomalies: calcResult.anomalies.length,
          stats: calcResult.stats,
          rule: DEFAULT_CONFIG.rule.version,
        },
      };

      set(st => ({
        anomalies: calcResult.anomalies,
        calcStats: calcResult.stats,
        lastCalculatedAt: calcResult.processedAt,
        timeline: [event, ...st.timeline],
        isCalculating: false,
      }));

      return { success: true, calcResult, event };
    } catch (e) {
      set({ isCalculating: false });
      return { success: false };
    }
  },

  getNextLayerVersion: (anomalyId) => {
    const anomaly = get().anomalies.find(a => a.id === anomalyId);
    if (!anomaly) return 1;
    const versions = anomaly.materials
      .filter(m => !m.isSupplement)
      .map(m => m.version || 1);
    return versions.length > 0 ? Math.max(...versions) + 1 : 1;
  },

  getFilteredAnomalies: () => {
    const state = get();
    const { types, levels, statuses, keyword } = state.filterState;
    return state.anomalies.filter(a => {
      if (types.length > 0 && !types.includes(a.type)) return false;
      if (levels.length > 0 && !levels.includes(a.level)) return false;
      if (statuses.length > 0 && !statuses.includes(a.status)) return false;
      if (keyword && !a.wellName.includes(keyword) && !a.wellId.includes(keyword)) return false;
      return true;
    });
  },

  getAnomaly: (id) => get().anomalies.find(a => a.id === id),

  addExportRecord: (record) => {
    const state = get();
    const newRecord: ExportRecord = {
      ...record,
      id: `export-${Date.now()}`,
      exportedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    };

    const event: TimelineEvent = {
      id: `tl-${Date.now() + 2}`,
      taskId: state.taskId!,
      type: 'rule_changed',
      description: `导出${record.type === 'summary' ? '摘要' : record.type === 'detail' ? '详情' : '完整档案'}报告：${record.anomalyCount} 条异常`,
      timestamp: newRecord.exportedAt,
      operator: record.operator,
      snapshot: { type: record.type, filterMark: record.filterMark, count: record.anomalyCount },
    };

    set(st => ({
      exportRecords: [newRecord, ...st.exportRecords],
      timeline: [event, ...st.timeline],
    }));
  },
}));

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as unknown as { __workbenchStore: typeof useWorkbenchStore }).__workbenchStore = useWorkbenchStore;
}
