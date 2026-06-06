import { create } from "zustand";
import type {
  Annotation,
  AnnotationType,
  FilterOptions,
  GridConfig,
  Operation,
  OperationType,
  Point,
  ScaleConfig,
  ToolMode,
  TrajectoryRecord,
  FlipType,
} from "@/types";
import { generateId, snapCoordsToGrid, transformCoords } from "@/utils/gridUtils";
import { getFlipExplanation } from "@/utils/flipExplanations";

interface HistoryState {
  past: TrajectoryRecord[];
  future: TrajectoryRecord[];
}

interface AnnotationState {
  record: TrajectoryRecord;
  toolMode: ToolMode;
  selectedId: string | null;
  filter: FilterOptions;
  imageSize: { width: number; height: number };
  isDrawing: boolean;
  drawingPoints: Point[];
  history: HistoryState;
  currentColor: string;
  currentLabel: string;

  setToolMode: (mode: ToolMode) => void;
  setSelectedId: (id: string | null) => void;
  setFilter: (filter: Partial<FilterOptions>) => void;
  setCurrentColor: (c: string) => void;
  setCurrentLabel: (l: string) => void;

  setImageSize: (w: number, h: number) => void;

  startDrawing: (startPoint: Point) => void;
  updateDrawing: (point: Point) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;

  addPolygonPoint: (point: Point) => void;

  addAnnotation: (
    type: AnnotationType,
    coords: Point[],
    color: string,
    label: string
  ) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  deleteAllAnnotations: () => void;

  updateGridConfig: (config: Partial<GridConfig>) => void;
  updateScale: (scale: Partial<ScaleConfig>) => void;

  applyFlip: (flipType: FlipType, reason?: string) => void;

  updateRecordName: (name: string) => void;
  updateImage: (imageUrl: string, imageName?: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  loadRecord: (record: TrajectoryRecord) => void;
  resetRecord: () => void;

  getFilteredAnnotations: () => Annotation[];

  pushHistory: () => void;
}

function createEmptyRecord(): TrajectoryRecord {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: "未命名轨迹",
    imageUrl: "",
    imageName: "",
    scale: { value: 1, unit: "mm", referencePoints: null },
    isFlipped: false,
    flipType: null,
    annotations: [],
    operations: [],
    gridConfig: {
      enabled: false,
      size: 20,
      color: "#E5E7EB",
      snapThreshold: 8,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function addOperation(
  record: TrajectoryRecord,
  type: OperationType,
  beforeState: unknown,
  afterState: unknown,
  description: string
): Operation {
  return {
    id: generateId(),
    type,
    beforeState,
    afterState,
    timestamp: new Date().toISOString(),
    description,
  };
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  record: createEmptyRecord(),
  toolMode: "select",
  selectedId: null,
  filter: { types: [], colors: [], labels: [] },
  imageSize: { width: 800, height: 600 },
  isDrawing: false,
  drawingPoints: [],
  history: { past: [], future: [] },
  currentColor: "#3B82F6",
  currentLabel: "",

  setToolMode: (mode) => set({ toolMode: mode, selectedId: null }),
  setSelectedId: (id) => set({ selectedId: id }),
  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),
  setCurrentColor: (c) => set({ currentColor: c }),
  setCurrentLabel: (l) => set({ currentLabel: l }),

  setImageSize: (w, h) => set({ imageSize: { width: w, height: h } }),

  startDrawing: (startPoint) => {
    const { toolMode } = get();
    if (toolMode === "select" || toolMode === "pan" || toolMode === "zoom")
      return;

    const sp =
      toolMode === "freehand" || toolMode === "polygon"
        ? [startPoint]
        : [startPoint, startPoint];
    set({ isDrawing: true, drawingPoints: sp });
  },

  updateDrawing: (point) => {
    const { toolMode, isDrawing, drawingPoints } = get();
    if (!isDrawing) return;

    if (toolMode === "freehand") {
      set({ drawingPoints: [...drawingPoints, point] });
    } else if (toolMode === "rectangle" || toolMode === "circle") {
      set({ drawingPoints: [drawingPoints[0], point] });
    }
  },

  finishDrawing: () => {
    const { record, toolMode, drawingPoints, isDrawing, currentColor, currentLabel } = get();
    if (!isDrawing || drawingPoints.length < 2) {
      set({ isDrawing: false, drawingPoints: [] });
      return;
    }

    if (toolMode === "polygon") return;

    const { coords, wasSnapped } = snapCoordsToGrid(
      drawingPoints,
      record.gridConfig
    );

    const originalCoords = drawingPoints.map((p) => ({ ...p }));
    const typeLabel: Record<string, string> = {
      rectangle: "矩形",
      circle: "圆形",
      freehand: "自由手绘",
    };

    const annotation: Annotation = {
      id: generateId(),
      type: toolMode as AnnotationType,
      coordinates: coords,
      color: currentColor,
      label: currentLabel,
      isSnapped: wasSnapped,
      originalCoords,
      createdAt: new Date().toISOString(),
    };

    const op = addOperation(
      record,
      "add",
      null,
      annotation,
      `添加${typeLabel[toolMode] || ""}标注${currentLabel ? `【${currentLabel}】` : ""}`
    );

    const prevRecord = JSON.parse(JSON.stringify(record));
    set((state) => ({
      record: {
        ...state.record,
        annotations: [...state.record.annotations, annotation],
        operations: [...state.record.operations, op],
        updatedAt: new Date().toISOString(),
      },
      isDrawing: false,
      drawingPoints: [],
      toolMode: "select",
      history: {
        past: [...state.history.past, prevRecord],
        future: [],
      },
    }));
  },

  cancelDrawing: () => set({ isDrawing: false, drawingPoints: [] }),

  addPolygonPoint: (point) => {
    const { record, toolMode, drawingPoints, isDrawing, currentColor, currentLabel } = get();
    if (toolMode !== "polygon") return;

    if (!isDrawing) {
      set({ isDrawing: true, drawingPoints: [point] });
      return;
    }

    if (drawingPoints.length > 2) {
      const first = drawingPoints[0];
      const dist = Math.sqrt(
        Math.pow(point.x - first.x, 2) + Math.pow(point.y - first.y, 2)
      );
      if (dist < 15) {
        const { coords, wasSnapped } = snapCoordsToGrid(
          drawingPoints,
          record.gridConfig
        );
        const annotation: Annotation = {
          id: generateId(),
          type: "polygon",
          coordinates: coords,
          color: currentColor,
          label: currentLabel,
          isSnapped: wasSnapped,
          originalCoords: drawingPoints.map((p) => ({ ...p })),
          createdAt: new Date().toISOString(),
        };
        const op = addOperation(
          record,
          "add",
          null,
          annotation,
          `添加多边形标注${currentLabel ? `【${currentLabel}】` : ""}`
        );
        const prevRecord = JSON.parse(JSON.stringify(record));
        set((state) => ({
          record: {
            ...state.record,
            annotations: [...state.record.annotations, annotation],
            operations: [...state.record.operations, op],
            updatedAt: new Date().toISOString(),
          },
          isDrawing: false,
          drawingPoints: [],
          toolMode: "select",
          history: {
            past: [...state.history.past, prevRecord],
            future: [],
          },
        }));
        return;
      }
    }

    set({ drawingPoints: [...drawingPoints, point] });
  },

  addAnnotation: (type, coords, color, label) => {
    const { record } = get();
    const { coords: snapped, wasSnapped } = snapCoordsToGrid(
      coords,
      record.gridConfig
    );
    const annotation: Annotation = {
      id: generateId(),
      type,
      coordinates: snapped,
      color,
      label,
      isSnapped: wasSnapped,
      originalCoords: coords.map((p) => ({ ...p })),
      createdAt: new Date().toISOString(),
    };
    const op = addOperation(record, "add", null, annotation, "添加标注");
    const prevRecord = JSON.parse(JSON.stringify(record));
    set((state) => ({
      record: {
        ...state.record,
        annotations: [...state.record.annotations, annotation],
        operations: [...state.record.operations, op],
        updatedAt: new Date().toISOString(),
      },
      history: { past: [...state.history.past, prevRecord], future: [] },
    }));
  },

  updateAnnotation: (id, updates) => {
    const { record } = get();
    const ann = record.annotations.find((a) => a.id === id);
    if (!ann) return;
    const updated = { ...ann, ...updates };
    const op = addOperation(record, "update", ann, updated, "更新标注");
    const prevRecord = JSON.parse(JSON.stringify(record));
    set((state) => ({
      record: {
        ...state.record,
        annotations: state.record.annotations.map((a) =>
          a.id === id ? updated : a
        ),
        operations: [...state.record.operations, op],
        updatedAt: new Date().toISOString(),
      },
      history: { past: [...state.history.past, prevRecord], future: [] },
    }));
  },

  deleteAnnotation: (id) => {
    const { record } = get();
    const ann = record.annotations.find((a) => a.id === id);
    if (!ann) return;
    const op = addOperation(record, "delete", ann, null, "删除标注");
    const prevRecord = JSON.parse(JSON.stringify(record));
    set((state) => ({
      record: {
        ...state.record,
        annotations: state.record.annotations.filter((a) => a.id !== id),
        operations: [...state.record.operations, op],
        updatedAt: new Date().toISOString(),
      },
      history: { past: [...state.history.past, prevRecord], future: [] },
      selectedId: null,
    }));
  },

  deleteAllAnnotations: () => {
    const { record } = get();
    if (record.annotations.length === 0) return;
    const op = addOperation(
      record,
      "delete",
      record.annotations,
      [],
      `删除全部 ${record.annotations.length} 个标注`
    );
    const prevRecord = JSON.parse(JSON.stringify(record));
    set((state) => ({
      record: {
        ...state.record,
        annotations: [],
        operations: [...state.record.operations, op],
        updatedAt: new Date().toISOString(),
      },
      history: { past: [...state.history.past, prevRecord], future: [] },
      selectedId: null,
    }));
  },

  updateGridConfig: (config) => {
    set((state) => ({
      record: {
        ...state.record,
        gridConfig: { ...state.record.gridConfig, ...config },
      },
    }));
  },

  updateScale: (scale) => {
    const { record } = get();
    const op = addOperation(
      record,
      "scale",
      record.scale,
      { ...record.scale, ...scale },
      "更新比例尺"
    );
    set((state) => ({
      record: {
        ...state.record,
        scale: { ...state.record.scale, ...scale },
        operations: [...state.record.operations, op],
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  applyFlip: (flipType, reason) => {
    const { record, imageSize } = get();
    if (!flipType) return;
    const explanation = getFlipExplanation(flipType);
    const op = addOperation(
      record,
      "flip",
      { isFlipped: record.isFlipped, flipType: record.flipType },
      { isFlipped: !record.isFlipped, flipType },
      `应用${explanation?.title || flipType}`
    );

    const prevRecord = JSON.parse(JSON.stringify(record));

    const transformedAnnotations = record.annotations.map((ann) => ({
      ...ann,
      coordinates: transformCoords(
        ann.coordinates,
        flipType,
        imageSize.width,
        imageSize.height
      ),
    }));

    set((state) => ({
      record: {
        ...state.record,
        isFlipped: !state.record.isFlipped,
        flipType,
        flipReason: reason,
        flipExplanation: explanation?.copyText,
        annotations: transformedAnnotations,
        operations: [...state.record.operations, op],
        updatedAt: new Date().toISOString(),
      },
      history: {
        past: [...state.history.past, prevRecord],
        future: [],
      },
    }));
  },

  updateRecordName: (name) =>
    set((state) => ({
      record: { ...state.record, name, updatedAt: new Date().toISOString() },
    })),

  updateImage: (imageUrl, imageName) =>
    set((state) => ({
      record: {
        ...state.record,
        imageUrl,
        imageName: imageName || state.record.imageName,
        updatedAt: new Date().toISOString(),
      },
    })),

  undo: () => {
    const { history, record } = get();
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    set({
      record: previous,
      history: {
        past: newPast,
        future: [record, ...history.future],
      },
    });
  },

  redo: () => {
    const { history, record } = get();
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    set({
      record: next,
      history: {
        past: [...history.past, record],
        future: newFuture,
      },
    });
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  loadRecord: (rec) => {
    set({
      record: JSON.parse(JSON.stringify(rec)),
      history: { past: [], future: [] },
    });
  },

  resetRecord: () =>
    set({
      record: createEmptyRecord(),
      history: { past: [], future: [] },
      toolMode: "select",
      selectedId: null,
      isDrawing: false,
      drawingPoints: [],
    }),

  getFilteredAnnotations: () => {
    const { record, filter } = get();
    return record.annotations.filter((ann) => {
      if (filter.types.length > 0 && !filter.types.includes(ann.type))
        return false;
      if (filter.colors.length > 0 && !filter.colors.includes(ann.color))
        return false;
      if (filter.labels.length > 0 && !filter.labels.includes(ann.label))
        return false;
      return true;
    });
  },

  pushHistory: () => {
    const { record, history } = get();
    const prev = JSON.parse(JSON.stringify(record));
    set({
      history: {
        past: [...history.past, prev],
        future: [],
      },
    });
  },
}));
