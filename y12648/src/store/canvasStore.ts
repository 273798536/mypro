import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  CanvasState,
  Annotation,
  RoutePoint,
  ScoreTable,
  ColorRule,
  UndoState,
  ErrorContext,
  SampleData,
  ImportResult,
  ConflictResolution,
  ExportReport,
  ScoreItem,
} from '../types';

interface StoreSnapshot {
  routePoints: RoutePoint[];
  annotations: Annotation[];
  scoreTable: ScoreTable | null;
  canvasState: CanvasState;
}

interface CanvasStore extends CanvasState {
  routePoints: RoutePoint[];
  annotations: Annotation[];
  scoreTable: ScoreTable | null;
  undoStack: UndoState[];
  redoStack: UndoState[];
  error: ErrorContext | null;
  showSampleData: boolean;
  snapshotStack: StoreSnapshot[];
  redoSnapshotStack: StoreSnapshot[];
  reviewIssues: ReviewIssue[];

  setCanvasState: (state: Partial<CanvasState>) => void;
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  undo: () => void;
  redo: () => void;
  setScoreTable: (table: ScoreTable) => void;
  setScoreItem: (itemId: string, updates: Partial<ScoreItem>) => void;
  setError: (error: ErrorContext | null) => void;
  clearError: () => void;
  importData: (data: Partial<SampleData>, mode: 'merge' | 'replace') => ImportResult;
  exportReport: () => ExportReport;
  validateBeforeExport: () => { valid: boolean; errors: ErrorContext[] };
  resolveConflict: (resolution: ConflictResolution) => void;
  dismissSampleData: () => void;
  loadSampleData: () => void;
  applyColorRules: (annotation: Annotation) => Annotation;
  setColorRules: (rules: ColorRule[]) => void;
  syncWithScoreTable: () => void;
  runReviewCheck: () => ReviewIssue[];
  clearReviewIssues: () => void;
}

export interface ReviewIssue {
  id: string;
  type: 'score_table_missing' | 'color_mismatch' | 'undo_desync' | 'duplicate_annotation' | 'status_mismatch' | 'coordinate_flipped';
  severity: 'error' | 'warning' | 'info';
  message: string;
  actionableMessage: string;
  relatedIds?: string[];
}

const initialColorRules: ColorRule[] = [
  { id: '1', category: 'safety', color: '#ef4444', label: '安全警示', priority: 1 },
  { id: '2', category: 'technique', color: '#3b82f6', label: '技术要点', priority: 2 },
  { id: '3', category: 'strategy', color: '#10b981', label: '战术建议', priority: 3 },
  { id: '4', category: 'general', color: '#6b7280', label: '一般备注', priority: 4 },
];

const initialCanvasState: CanvasState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedAnnotationIds: [],
  filterCategories: [],
  filterAuthors: [],
  timeRange: null,
  viewMode: 'edit',
  colorRules: initialColorRules,
};

const takeSnapshot = (state: CanvasStore): StoreSnapshot => ({
  routePoints: JSON.parse(JSON.stringify(state.routePoints)),
  annotations: JSON.parse(JSON.stringify(state.annotations)),
  scoreTable: state.scoreTable ? JSON.parse(JSON.stringify(state.scoreTable)) : null,
  canvasState: {
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    selectedAnnotationIds: [...state.selectedAnnotationIds],
    filterCategories: [...state.filterCategories],
    filterAuthors: [...state.filterAuthors],
    timeRange: state.timeRange ? [state.timeRange[0], state.timeRange[1]] as [number, number] : null,
    viewMode: state.viewMode,
    colorRules: JSON.parse(JSON.stringify(state.colorRules)),
  },
});

const applySnapshot = (snapshot: StoreSnapshot): Partial<CanvasStore> => ({
  routePoints: snapshot.routePoints,
  annotations: snapshot.annotations,
  scoreTable: snapshot.scoreTable,
  zoom: snapshot.canvasState.zoom,
  panX: snapshot.canvasState.panX,
  panY: snapshot.canvasState.panY,
  selectedAnnotationIds: snapshot.canvasState.selectedAnnotationIds,
  filterCategories: snapshot.canvasState.filterCategories,
  filterAuthors: snapshot.canvasState.filterAuthors,
  timeRange: snapshot.canvasState.timeRange,
  viewMode: snapshot.canvasState.viewMode,
  colorRules: snapshot.canvasState.colorRules,
});

const generateSampleData = (): SampleData => {
  const now = Date.now();
  const baseTs = now - 3600_000;

  const routePoints: RoutePoint[] = [
    { id: 'rp1', lat: 46.5, lng: 7.8, timestamp: baseTs, altitude: 2800, speed: 15, direction: 180 },
    { id: 'rp2', lat: 46.498, lng: 7.802, timestamp: baseTs + 8000, altitude: 2720, speed: 32, direction: 190 },
    { id: 'rp3', lat: 46.495, lng: 7.801, timestamp: baseTs + 16000, altitude: 2640, speed: 45, direction: 200 },
    { id: 'rp4_flip', lat: 7.803, lng: 46.492, timestamp: baseTs + 24000, altitude: 2560, speed: 38, direction: 210 },
    { id: 'rp5', lat: 46.489, lng: 7.805, timestamp: baseTs + 32000, altitude: 2480, speed: 28, direction: 205 },
    { id: 'rp6', lat: 46.486, lng: 7.808, timestamp: baseTs + 40000, altitude: 2400, speed: 22, direction: 200 },
  ];

  const annotations: Annotation[] = [
    {
      id: 'ann1',
      routePointId: 'rp2',
      type: 'marker',
      content: '出发后注意控制速度，前方有急弯',
      category: 'safety',
      color: '#ef4444',
      startTime: baseTs + 8000,
      createdAt: now,
      updatedAt: now,
      author: '教研老师',
      isActive: true,
    },
    {
      id: 'ann2',
      routePointId: 'rp3',
      type: 'segment',
      content: '此处切入角度佳，保持重心前移',
      category: 'technique',
      color: '#3b82f6',
      startTime: baseTs + 16000,
      endTime: baseTs + 24000,
      createdAt: now,
      updatedAt: now,
      author: '教研老师',
      isActive: true,
    },
    {
      id: 'ann3',
      routePointId: 'rp4_flip',
      type: 'comment',
      content: '坐标疑似翻转（经纬度颠倒），请核对原始记录',
      category: 'safety',
      color: '#ef4444',
      startTime: baseTs + 24000,
      createdAt: now,
      updatedAt: now,
      author: '教研老师',
      isActive: true,
    },
    {
      id: 'ann4',
      routePointId: 'rp6',
      type: 'marker',
      content: '终点前减速区控制良好',
      category: 'strategy',
      color: '#10b981',
      startTime: baseTs + 40000,
      createdAt: now,
      updatedAt: now,
      author: '教研老师',
      isActive: true,
    },
  ];

  const scoreTable: ScoreTable = {
    id: 'st_sample',
    name: '2026年6月训练赛评分表',
    items: [
      { id: 'si1', name: '出发技术', score: 18, maxScore: 20, criteria: '出发姿势、反应速度', comment: '反应迅速，姿势标准' },
      { id: 'si2', name: '转弯控制', score: 22, maxScore: 30, criteria: '切入角度、身体姿态', comment: '中等坡度转弯稳定，急弯需加强' },
      { id: 'si3', name: '速度管理', score: 24, maxScore: 25, criteria: '分区速度控制', comment: '整体控制优秀' },
      { id: 'si4', name: '路线选择', score: 20, maxScore: 25, criteria: '最优路线判断', comment: '主线路线合理，备选路线训练不足' },
    ],
    totalScore: 84,
    maxScore: 100,
    status: 'completed',
    feedback: '整体表现良好，重点加强急弯技术和备选路线训练。',
  };

  return {
    routePoints,
    annotations,
    scoreTable,
    canvasState: { ...initialCanvasState, colorRules: initialColorRules },
  };
};

const detectFlippedCoordinates = (points: RoutePoint[]): string[] => {
  return points
    .filter((p) => {
      const latOutOfRange = p.lat < -90 || p.lat > 90;
      const lngOutOfRange = p.lng < -180 || p.lng > 180;
      const likelyFlipped =
        (p.lat > 180 || p.lat < -180) && p.lng >= -90 && p.lng <= 90;
      return latOutOfRange || lngOutOfRange || likelyFlipped;
    })
    .map((p) => p.id);
};

const MAX_STACK = 50;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  routePoints: [],
  annotations: [],
  scoreTable: null,
  undoStack: [],
  redoStack: [],
  error: null,
  showSampleData: true,
  snapshotStack: [],
  redoSnapshotStack: [],
  reviewIssues: [],
  zoom: initialCanvasState.zoom,
  panX: initialCanvasState.panX,
  panY: initialCanvasState.panY,
  selectedAnnotationIds: initialCanvasState.selectedAnnotationIds,
  filterCategories: initialCanvasState.filterCategories,
  filterAuthors: initialCanvasState.filterAuthors,
  timeRange: initialCanvasState.timeRange,
  viewMode: initialCanvasState.viewMode,
  colorRules: initialCanvasState.colorRules,

  setCanvasState: (state) => {
    const snapshot = takeSnapshot(get());
    set({
      ...state,
      snapshotStack: [...get().snapshotStack.slice(-(MAX_STACK - 1)), snapshot],
      redoSnapshotStack: [],
      undoStack: [
        ...get().undoStack.slice(-(MAX_STACK - 1)),
        {
          timestamp: Date.now(),
          action: 'canvas_state_change',
          previousState: {
            zoom: snapshot.canvasState.zoom,
            panX: snapshot.canvasState.panX,
            panY: snapshot.canvasState.panY,
            selectedAnnotationIds: snapshot.canvasState.selectedAnnotationIds,
            filterCategories: snapshot.canvasState.filterCategories,
            filterAuthors: snapshot.canvasState.filterAuthors,
            timeRange: snapshot.canvasState.timeRange,
          },
          affectedAnnotationIds: [],
        },
      ],
      redoStack: [],
    });
  },

  addAnnotation: (annotation) => {
    const now = Date.now();
    const snapshot = takeSnapshot(get());
    const newAnnotation: Annotation = {
      ...annotation,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    const coloredAnnotation = get().applyColorRules(newAnnotation);

    set({
      annotations: [...get().annotations, coloredAnnotation],
      snapshotStack: [...get().snapshotStack.slice(-(MAX_STACK - 1)), snapshot],
      redoSnapshotStack: [],
      undoStack: [
        ...get().undoStack.slice(-(MAX_STACK - 1)),
        {
          timestamp: now,
          action: 'add_annotation',
          previousState: {},
          affectedAnnotationIds: [newAnnotation.id],
        },
      ],
      redoStack: [],
    });

    get().syncWithScoreTable();
    get().runReviewCheck();
  },

  updateAnnotation: (id, updates) => {
    const now = Date.now();
    const snapshot = takeSnapshot(get());

    set({
      annotations: get().annotations.map((a) =>
        a.id === id ? get().applyColorRules({ ...a, ...updates, updatedAt: now }) : a
      ),
      snapshotStack: [...get().snapshotStack.slice(-(MAX_STACK - 1)), snapshot],
      redoSnapshotStack: [],
      undoStack: [
        ...get().undoStack.slice(-(MAX_STACK - 1)),
        {
          timestamp: now,
          action: 'update_annotation',
          previousState: {},
          affectedAnnotationIds: [id],
        },
      ],
      redoStack: [],
    });

    get().syncWithScoreTable();
    get().runReviewCheck();
  },

  deleteAnnotation: (id) => {
    const snapshot = takeSnapshot(get());

    set({
      annotations: get().annotations.filter((a) => a.id !== id),
      selectedAnnotationIds: get().selectedAnnotationIds.filter((aid) => aid !== id),
      snapshotStack: [...get().snapshotStack.slice(-(MAX_STACK - 1)), snapshot],
      redoSnapshotStack: [],
      undoStack: [
        ...get().undoStack.slice(-(MAX_STACK - 1)),
        {
          timestamp: Date.now(),
          action: 'delete_annotation',
          previousState: {},
          affectedAnnotationIds: [id],
        },
      ],
      redoStack: [],
    });

    get().syncWithScoreTable();
    get().runReviewCheck();
  },

  undo: () => {
    const { snapshotStack, undoStack } = get();
    if (snapshotStack.length === 0) return;

    const currentSnapshot = takeSnapshot(get());
    const previousSnapshot = snapshotStack[snapshotStack.length - 1];
    const lastUndoMeta = undoStack[undoStack.length - 1];

    set({
      ...applySnapshot(previousSnapshot),
      snapshotStack: snapshotStack.slice(0, -1),
      redoSnapshotStack: [...get().redoSnapshotStack, currentSnapshot],
      undoStack: undoStack.slice(0, -1),
      redoStack: lastUndoMeta
        ? [...get().redoStack, { ...lastUndoMeta, timestamp: Date.now() }]
        : get().redoStack,
    });

    get().runReviewCheck();
  },

  redo: () => {
    const { redoSnapshotStack, redoStack } = get();
    if (redoSnapshotStack.length === 0) return;

    const currentSnapshot = takeSnapshot(get());
    const nextSnapshot = redoSnapshotStack[redoSnapshotStack.length - 1];
    const lastRedoMeta = redoStack[redoStack.length - 1];

    set({
      ...applySnapshot(nextSnapshot),
      snapshotStack: [...get().snapshotStack, currentSnapshot],
      redoSnapshotStack: redoSnapshotStack.slice(0, -1),
      undoStack: lastRedoMeta
        ? [...get().undoStack, { ...lastRedoMeta, timestamp: Date.now() }]
        : get().undoStack,
      redoStack: redoStack.slice(0, -1),
    });

    get().runReviewCheck();
  },

  setScoreTable: (table) => {
    const snapshot = takeSnapshot(get());
    set({
      scoreTable: { ...table },
      snapshotStack: [...get().snapshotStack.slice(-(MAX_STACK - 1)), snapshot],
      redoSnapshotStack: [],
      undoStack: [
        ...get().undoStack.slice(-(MAX_STACK - 1)),
        {
          timestamp: Date.now(),
          action: 'set_score_table',
          previousState: {},
          affectedAnnotationIds: [],
        },
      ],
      redoStack: [],
    });
    get().syncWithScoreTable();
    get().runReviewCheck();
  },

  setScoreItem: (itemId, updates) => {
    const state = get();
    if (!state.scoreTable) {
      state.setError({
        code: 'SCORE_TABLE_MISSING',
        message: '评分表不存在',
        actionableMessage: '请先创建或导入评分表后再修改评分项。',
        missingData: { type: 'score_table', description: '当前画布未关联评分表' },
        suggestedAction: '可通过"导入数据"加载评分表，或在属性面板中新建评分表。',
      });
      return;
    }

    const snapshot = takeSnapshot(state);
    const updatedItems = state.scoreTable.items.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    const totalScore = updatedItems.reduce((sum, it) => sum + it.score, 0);
    const maxScore = updatedItems.reduce((sum, it) => sum + it.maxScore, 0);

    set({
      scoreTable: {
        ...state.scoreTable,
        items: updatedItems,
        totalScore,
        maxScore,
      },
      snapshotStack: [...state.snapshotStack.slice(-(MAX_STACK - 1)), snapshot],
      redoSnapshotStack: [],
      undoStack: [
        ...state.undoStack.slice(-(MAX_STACK - 1)),
        {
          timestamp: Date.now(),
          action: 'update_score_item',
          previousState: {},
          affectedAnnotationIds: [],
        },
      ],
      redoStack: [],
    });

    get().syncWithScoreTable();
    get().runReviewCheck();
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  importData: (data, mode) => {
    const result: ImportResult = {
      success: true,
      importedCount: 0,
      duplicateCount: 0,
      errorMessages: [],
      mergedAnnotations: [],
      resolvedConflicts: [],
    };

    const state = get();
    const snapshot = takeSnapshot(state);

    const annotationSignature = (a: Annotation) =>
      `${a.routePointId}-${a.type}-${a.category}-${a.content.trim().slice(0, 50)}`;
    const existingSigs = new Set(state.annotations.map(annotationSignature));
    const existingRouteIds = new Set(state.routePoints.map((r) => r.id));

    let finalRoutePoints = state.routePoints;
    let finalAnnotations = state.annotations;
    let finalScoreTable = state.scoreTable;

    if (mode === 'replace') {
      if (data.routePoints) {
        finalRoutePoints = data.routePoints;
        result.importedCount += data.routePoints.length;
      }
      if (data.annotations) {
        finalAnnotations = data.annotations.map((a) => state.applyColorRules(a));
        result.importedCount += data.annotations.length;
      }
      if (data.scoreTable) {
        finalScoreTable = { ...data.scoreTable };
      }
    } else {
      if (data.routePoints) {
        const newRoutePoints: RoutePoint[] = [];
        data.routePoints.forEach((point) => {
          if (!existingRouteIds.has(point.id)) {
            newRoutePoints.push(point);
            result.importedCount++;
          } else {
            result.duplicateCount++;
            result.resolvedConflicts.push({
              type: 'skip',
              originalId: point.id,
              resolvedId: point.id,
              reason: '路线点ID已存在，已自动跳过',
            });
          }
        });
        finalRoutePoints = [...state.routePoints, ...newRoutePoints];
      }

      if (data.annotations) {
        const newAnnotations: Annotation[] = [];
        data.annotations.forEach((annotation) => {
          const sig = annotationSignature(annotation);
          if (annotation.id && existingSigs.has(sig)) {
            result.duplicateCount++;
            result.resolvedConflicts.push({
              type: 'duplicate',
              originalId: annotation.id,
              resolvedId: annotation.id,
              reason: '检测到相同路线点+类型+分类+内容的重复标注，已自动跳过避免重复结论',
            });
          } else if (annotation.id && state.annotations.some((a) => a.id === annotation.id)) {
            result.duplicateCount++;
            result.resolvedConflicts.push({
              type: 'skip',
              originalId: annotation.id,
              resolvedId: annotation.id,
              reason: '标注ID已存在，已自动跳过',
            });
          } else {
            newAnnotations.push(state.applyColorRules(annotation));
            result.mergedAnnotations.push(annotation);
            result.importedCount++;
          }
        });
        finalAnnotations = [...state.annotations, ...newAnnotations];
      }

      if (data.scoreTable) {
        if (!state.scoreTable) {
          finalScoreTable = { ...data.scoreTable };
        } else {
          const mergedItems = [...state.scoreTable.items];
          data.scoreTable.items.forEach((incoming) => {
            const idx = mergedItems.findIndex((it) => it.name === incoming.name);
            if (idx >= 0) {
              result.duplicateCount++;
              result.resolvedConflicts.push({
                type: 'skip',
                originalId: incoming.id,
                resolvedId: mergedItems[idx].id,
                reason: `评分项"${incoming.name}"已存在，保留原有评分避免同一评分项出现两个结论`,
              });
            } else {
              mergedItems.push(incoming);
              result.importedCount++;
            }
          });
          const totalScore = mergedItems.reduce((s, it) => s + it.score, 0);
          const maxScore = mergedItems.reduce((s, it) => s + it.maxScore, 0);
          finalScoreTable = {
            ...state.scoreTable,
            items: mergedItems,
            totalScore,
            maxScore,
            status: data.scoreTable.status === 'completed' ? 'completed' : state.scoreTable.status,
          };
        }
      }
    }

    set({
      routePoints: finalRoutePoints,
      annotations: finalAnnotations,
      scoreTable: finalScoreTable,
      showSampleData: false,
      snapshotStack: [...state.snapshotStack.slice(-(MAX_STACK - 1)), snapshot],
      redoSnapshotStack: [],
      undoStack: [
        ...state.undoStack.slice(-(MAX_STACK - 1)),
        {
          timestamp: Date.now(),
          action: `import_data_${mode}`,
          previousState: {},
          affectedAnnotationIds: result.mergedAnnotations.map((a) => a.id),
        },
      ],
      redoStack: [],
    });

    if (result.duplicateCount > 0) {
      get().setError({
        code: 'IMPORT_DUPLICATES',
        message: `导入完成，但检测到 ${result.duplicateCount} 条重复记录`,
        actionableMessage: `重复记录已自动跳过，以避免同一件事出现两份结论。共处理 ${result.resolvedConflicts.length} 个冲突。`,
        suggestedAction: '请在右侧"复核面板"查看冲突明细，确认是否需要手动覆盖。',
      });
    }

    get().syncWithScoreTable();
    get().runReviewCheck();
    return result;
  },

  validateBeforeExport: () => {
    const state = get();
    const errors: ErrorContext[] = [];

    if (!state.scoreTable) {
      errors.push({
        code: 'EXPORT_NO_SCORE_TABLE',
        message: '缺少评分表，无法导出完整报告',
        actionableMessage: '请先创建或导入评分表后再导出。',
        missingData: { type: 'score_table', description: '导出报告需要关联评分表' },
        suggestedAction: '可点击"导入数据"加载评分表，或在属性面板中新建。',
      });
    } else if (state.scoreTable.status === 'pending') {
      errors.push({
        code: 'EXPORT_SCORE_PENDING',
        message: '评分表状态为"待确认"',
        actionableMessage: `当前评分表 "${state.scoreTable.name}" 尚未完成评分，请确认评分后再导出。`,
        missingData: { type: 'score_table', description: `评分表 ${state.scoreTable.name} 状态为 pending` },
        suggestedAction: '请补全所有评分项，或在属性面板中将状态标记为已完成。',
      });
    }

    const flipped = detectFlippedCoordinates(state.routePoints);
    if (flipped.length > 0) {
      errors.push({
        code: 'EXPORT_FLIPPED_COORDS',
        message: `检测到 ${flipped.length} 个坐标疑似翻转`,
        actionableMessage: `路线点 ${flipped.join('、')} 的经纬度范围异常，可能存在坐标翻转。`,
        suggestedAction: '请在画布中核对这些坐标点，修正后再导出给学生。',
      });
    }

    const uiStatus = state.scoreTable?.status;
    if (state.scoreTable) {
      const ratio = state.scoreTable.maxScore > 0 ? state.scoreTable.totalScore / state.scoreTable.maxScore : 0;
      const derivedStatus = ratio >= 0.6 ? 'completed' : 'failed';
      if (uiStatus && uiStatus !== derivedStatus && uiStatus !== 'pending') {
        errors.push({
          code: 'EXPORT_STATUS_MISMATCH',
          message: '界面评分状态与导出计算结果不一致',
          actionableMessage: `界面显示 ${uiStatus}，但按分数计算应为 ${derivedStatus}。`,
          suggestedAction: '请更新评分表状态，使其与分数一致后再导出。',
        });
      }
    }

    return { valid: errors.length === 0, errors };
  },

  exportReport: () => {
    const state = get();
    const validation = state.validateBeforeExport();
    if (!validation.valid) {
      const primary = validation.errors[0];
      state.setError(primary);
      throw primary;
    }

    const scoreRatio =
      state.scoreTable && state.scoreTable.maxScore > 0
        ? state.scoreTable.totalScore / state.scoreTable.maxScore
        : 0;
    let derivedStatus: 'pass' | 'pending' | 'failed';
    if (state.scoreTable?.status === 'pending') {
      derivedStatus = 'pending';
    } else if (state.scoreTable?.status === 'failed') {
      derivedStatus = 'failed';
    } else if (state.scoreTable?.status === 'completed') {
      derivedStatus = scoreRatio >= 0.6 ? 'pass' : 'failed';
    } else {
      derivedStatus = scoreRatio >= 0.6 ? 'pass' : 'failed';
    }

    const colorDistribution = state.annotations.reduce((acc, ann) => {
      acc[ann.color] = (acc[ann.color] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summary: ExportReport['summary'] = {
      status: derivedStatus,
      totalAnnotations: state.annotations.length,
      totalScore: state.scoreTable?.totalScore || 0,
      maxScore: state.scoreTable?.maxScore || 0,
      colorDistribution,
    };

    return {
      routeId: uuidv4(),
      exportTime: Date.now(),
      summary,
      annotations: JSON.parse(JSON.stringify(state.annotations)),
      scoreTable: state.scoreTable
        ? (JSON.parse(JSON.stringify(state.scoreTable)) as ScoreTable)
        : ({
            id: uuidv4(),
            name: '未评分',
            items: [],
            totalScore: 0,
            maxScore: 0,
            status: 'pending' as const,
          } as ScoreTable),
      canvasState: {
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
        selectedAnnotationIds: [...state.selectedAnnotationIds],
        filterCategories: [...state.filterCategories],
        filterAuthors: [...state.filterAuthors],
        timeRange: state.timeRange ? [state.timeRange[0], state.timeRange[1]] as [number, number] : null,
        viewMode: state.viewMode,
        colorRules: JSON.parse(JSON.stringify(state.colorRules)),
      },
      metadata: {
        author: '教研老师',
        reviewStatus: 'exported' as const,
        version: 1,
      },
    };
  },

  resolveConflict: (resolution) => {
    const state = get();
    if (resolution.type === 'overwrite') {
      get().setError({
        code: 'CONFLICT_OVERWRITE_WARNING',
        message: `即将覆盖原记录 ${resolution.originalId}`,
        actionableMessage: `覆盖原因：${resolution.reason}`,
        suggestedAction: '覆盖后旧结论将被替换，撤销栈保留历史版本可回滚。',
      });
    }
  },

  dismissSampleData: () => set({ showSampleData: false }),

  loadSampleData: () => {
    const sample = generateSampleData();
    const snapshot = takeSnapshot(get());

    set({
      routePoints: sample.routePoints,
      annotations: sample.annotations.map((a) => get().applyColorRules(a)),
      scoreTable: sample.scoreTable,
      showSampleData: true,
      snapshotStack: [...get().snapshotStack.slice(-(MAX_STACK - 1)), snapshot],
      redoSnapshotStack: [],
      undoStack: [
        ...get().undoStack.slice(-(MAX_STACK - 1)),
        {
          timestamp: Date.now(),
          action: 'load_sample_data',
          previousState: {},
          affectedAnnotationIds: sample.annotations.map((a) => a.id),
        },
      ],
      redoStack: [],
    });

    get().syncWithScoreTable();
    get().runReviewCheck();
  },

  applyColorRules: (annotation) => {
    const rules = get().colorRules;
    const matchingRule = rules.find((rule) => rule.category === annotation.category);

    if (matchingRule) {
      return { ...annotation, color: matchingRule.color };
    }

    return annotation;
  },

  setColorRules: (rules) => {
    const snapshot = takeSnapshot(get());
    const reAnnotated = get().annotations.map((a) => {
      const matchingRule = rules.find((r) => r.category === a.category);
      return matchingRule ? { ...a, color: matchingRule.color, updatedAt: Date.now() } : a;
    });

    set({
      colorRules: rules,
      annotations: reAnnotated,
      snapshotStack: [...get().snapshotStack.slice(-(MAX_STACK - 1)), snapshot],
      redoSnapshotStack: [],
      undoStack: [
        ...get().undoStack.slice(-(MAX_STACK - 1)),
        {
          timestamp: Date.now(),
          action: 'set_color_rules',
          previousState: {},
          affectedAnnotationIds: reAnnotated.map((a) => a.id),
        },
      ],
      redoStack: [],
    });

    get().runReviewCheck();
  },

  syncWithScoreTable: () => {
    const state = get();
    const scoreTable = state.scoreTable;

    if (!scoreTable) {
      if (state.annotations.length > 0) {
        state.setError({
          code: 'SYNC_NO_SCORE_TABLE',
          message: '已有标注但未关联评分表',
          actionableMessage: `当前画布有 ${state.annotations.length} 条标注，但未关联评分表，评分状态无法同步。`,
          missingData: { type: 'score_table', description: '缺少与当前标注匹配的评分表' },
          suggestedAction: '请导入或新建评分表后再进行评分同步。',
        });
      }
      return;
    }

    const hasAnnotations = state.annotations.length > 0;
    const hasItems = scoreTable.items.length > 0;
    const ratio = scoreTable.maxScore > 0 ? scoreTable.totalScore / scoreTable.maxScore : 0;

    let nextStatus: ScoreTable['status'] = scoreTable.status;
    if (!hasItems && !hasAnnotations) {
      nextStatus = 'pending';
    } else if (scoreTable.status !== 'pending') {
      nextStatus = ratio >= 0.6 ? 'completed' : 'failed';
    }

    set({
      scoreTable: {
        ...scoreTable,
        status: nextStatus,
      },
    });
  },

  runReviewCheck: () => {
    const state = get();
    const issues: ReviewIssue[] = [];

    if (!state.scoreTable) {
      issues.push({
        id: 'ri_' + uuidv4(),
        type: 'score_table_missing',
        severity: 'error',
        message: '缺少评分表',
        actionableMessage: '请导入或创建评分表后再让学生查看。',
      });
    } else {
      state.annotations.forEach((ann) => {
        const matching = state.scoreTable?.items.find((it) =>
          it.comment?.includes(ann.content.slice(0, 20))
        );
      });
    }

    const mismatched = state.annotations.filter((ann) => {
      const rule = state.colorRules.find((r) => r.category === ann.category);
      return rule && rule.color !== ann.color;
    });
    if (mismatched.length > 0) {
      issues.push({
        id: 'ri_' + uuidv4(),
        type: 'color_mismatch',
        severity: 'warning',
        message: `${mismatched.length} 条标注颜色与当前颜色规则不同步`,
        actionableMessage: '重新应用颜色规则可将标注颜色统一。',
        relatedIds: mismatched.map((a) => a.id),
      });
    }

    if (state.snapshotStack.length === 0 && state.annotations.length > 0) {
      issues.push({
        id: 'ri_' + uuidv4(),
        type: 'undo_desync',
        severity: 'warning',
        message: '撤销栈为空，无法回滚当前标注修改',
        actionableMessage: '新的修改会自动进入撤销栈，但历史数据修改无法追溯。',
      });
    }

    const flippedIds = detectFlippedCoordinates(state.routePoints);
    if (flippedIds.length > 0) {
      issues.push({
        id: 'ri_' + uuidv4(),
        type: 'coordinate_flipped',
        severity: 'error',
        message: `检测到 ${flippedIds.length} 个坐标疑似翻转`,
        actionableMessage: '请核对原始记录，确认是否经纬度颠倒。',
        relatedIds: flippedIds,
      });
    }

    const seenSignatures = new Map<string, string[]>();
    state.annotations.forEach((ann) => {
      const sig = `${ann.routePointId}-${ann.type}-${ann.category}`;
      if (!seenSignatures.has(sig)) seenSignatures.set(sig, []);
      seenSignatures.get(sig)!.push(ann.id);
    });
    const duplicateGroups = [...seenSignatures.entries()].filter(([, ids]) => ids.length > 1);
    if (duplicateGroups.length > 0) {
      const dupIds = duplicateGroups.flatMap(([, ids]) => ids);
      issues.push({
        id: 'ri_' + uuidv4(),
        type: 'duplicate_annotation',
        severity: 'warning',
        message: `发现 ${duplicateGroups.length} 组可能的重复标注`,
        actionableMessage: '同一位置、同一分类出现多条标注可能让学生看到两个不同结论。',
        relatedIds: dupIds,
      });
    }

    if (state.scoreTable) {
      const ratio = state.scoreTable.maxScore > 0 ? state.scoreTable.totalScore / state.scoreTable.maxScore : 0;
      const expected = ratio >= 0.6 ? 'completed' : 'failed';
      if (state.scoreTable.status !== 'pending' && state.scoreTable.status !== expected) {
        issues.push({
          id: 'ri_' + uuidv4(),
          type: 'status_mismatch',
          severity: 'error',
          message: `评分表状态(${state.scoreTable.status})与得分计算结果(${expected})不一致`,
          actionableMessage: '请在复核中统一状态，避免界面与导出报告出现通过/待确认矛盾。',
        });
      }
    }

    set({ reviewIssues: issues });
    return issues;
  },

  clearReviewIssues: () => set({ reviewIssues: [] }),
}));
