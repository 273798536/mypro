import { create } from 'zustand';
import type {
  PipelineSegment,
  Obstacle,
  SavedView,
  PipelineRecord,
  CollisionResult,
  AlertMessage,
  AlertType,
  CameraView,
  RecordStatus,
} from './types';
import { checkCollisions } from './utils/collision';
import { convertToWorld, generateId, isDuplicateRecord } from './utils/helpers';

interface AppState {
  pipelines: PipelineSegment[];
  obstacles: Obstacle[];
  savedViews: SavedView[];
  records: PipelineRecord[];
  alerts: AlertMessage[];
  activeTab: 'params' | 'views' | 'records' | 'import';
  statusFilter: 'all' | RecordStatus;
  safeDistance: number;
  collisions: CollisionResult[];
  showCollisionZones: boolean;
  selectedPipelineId: string | null;
  currentCamera: CameraView;
  pendingRestoreCamera: CameraView | null;

  addPipeline: (p: PipelineSegment) => void;
  updatePipeline: (id: string, updates: Partial<PipelineSegment>) => void;
  removePipeline: (id: string) => void;
  addObstacle: (o: Obstacle) => void;
  updateObstacle: (id: string, updates: Partial<Obstacle>) => void;
  removeObstacle: (id: string) => void;

  saveView: (name: string, note: string, sourceImage?: string, sourceRow?: number, thumbnail?: string) => void;
  restoreView: (id: string) => CameraView | null;
  deleteView: (id: string) => void;
  setCurrentCamera: (cam: CameraView) => void;
  clearPendingRestoreCamera: () => void;

  addRecord: (record: PipelineRecord) => { status: RecordStatus; issues: string[] };
  updateRecordStatus: (id: string, status: RecordStatus) => void;
  removeRecord: (id: string) => void;
  setStatusFilter: (f: 'all' | RecordStatus) => void;
  clearRecords: () => void;

  addAlert: (type: AlertType, message: string) => void;
  removeAlert: (id: string) => void;

  setActiveTab: (tab: 'params' | 'views' | 'records' | 'import') => void;
  setSafeDistance: (d: number) => void;
  setShowCollisionZones: (v: boolean) => void;
  setSelectedPipelineId: (id: string | null) => void;
  recomputeCollisions: () => void;

  initDemoData: () => void;
}

const initialCamera: CameraView = {
  position: { x: 80, y: 60, z: 80 },
  target: { x: 0, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  fov: 50,
};

export const useAppStore = create<AppState>((set, get) => ({
  pipelines: [],
  obstacles: [],
  savedViews: [],
  records: [],
  alerts: [],
  activeTab: 'params',
  statusFilter: 'all',
  safeDistance: 3,
  collisions: [],
  showCollisionZones: true,
  selectedPipelineId: null,
  currentCamera: initialCamera,
  pendingRestoreCamera: null,

  addPipeline: (p) => {
    set((s) => ({ pipelines: [...s.pipelines, p] }));
    get().recomputeCollisions();
  },
  updatePipeline: (id, updates) => {
    set((s) => ({
      pipelines: s.pipelines.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    }));
    get().recomputeCollisions();
  },
  removePipeline: (id) => {
    set((s) => ({ pipelines: s.pipelines.filter((p) => p.id !== id) }));
    get().recomputeCollisions();
  },
  addObstacle: (o) => {
    set((s) => ({ obstacles: [...s.obstacles, o] }));
    get().recomputeCollisions();
  },
  updateObstacle: (id, updates) => {
    set((s) => ({
      obstacles: s.obstacles.map((o) =>
        o.id === id ? { ...o, ...updates } : o,
      ),
    }));
    get().recomputeCollisions();
  },
  removeObstacle: (id) => {
    set((s) => ({ obstacles: s.obstacles.filter((o) => o.id !== id) }));
    get().recomputeCollisions();
  },

  saveView: (name, note, sourceImage, sourceRow, thumbnail) => {
    const cam = get().currentCamera;
    const saved: SavedView = {
      id: generateId(),
      name,
      camera: { ...cam },
      note,
      sourceImage,
      sourceRow,
      createdAt: Date.now(),
      thumbnail,
    };
    set((s) => ({ savedViews: [saved, ...s.savedViews] }));
    get().addAlert('info', `视角 "${name}" 已保存`);
  },
  restoreView: (id) => {
    const view = get().savedViews.find((v) => v.id === id);
    if (!view) return null;
    set({ pendingRestoreCamera: { ...view.camera } });
    get().addAlert('info', `已恢复视角: ${view.name}`);
    return view.camera;
  },
  deleteView: (id) => {
    set((s) => ({ savedViews: s.savedViews.filter((v) => v.id !== id) }));
  },
  setCurrentCamera: (cam) => set({ currentCamera: cam }),
  clearPendingRestoreCamera: () => set({ pendingRestoreCamera: null }),

  addRecord: (record) => {
    const { records } = get();
    const issues: string[] = [];
    let status: RecordStatus = 'ok';

    if (record.coordinateSystem !== 'world') {
      issues.push(`坐标系为 ${record.coordinateSystem}，需复核转换参数`);
      status = 'review-required';
    }

    const dup = isDuplicateRecord(record, records);
    if (dup) {
      issues.push(`与已有记录 "${dup.name}" (行 ${dup.source.rowNumber}) 重复`);
      status = 'duplicate';
      record.duplicateOf = dup.id;
    }

    record.status = status;
    record.issues = issues;

    set((s) => ({ records: [record, ...s.records] }));

    if (status === 'duplicate') {
      get().addAlert('danger', `记录 "${record.name}" 检测为重复数据`);
    } else if (status === 'review-required') {
      get().addAlert('warning', `记录 "${record.name}" 需工程评审员复核`);
    } else {
      get().addAlert('info', `记录 "${record.name}" 已导入，状态正常`);
    }

    return { status, issues };
  },
  updateRecordStatus: (id, status) => {
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
  },
  removeRecord: (id) => {
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
  },
  setStatusFilter: (f) => set({ statusFilter: f }),
  clearRecords: () => set({ records: [] }),

  addAlert: (type, message) => {
    const alert: AlertMessage = {
      id: generateId(),
      type,
      message,
      timestamp: Date.now(),
    };
    set((s) => ({ alerts: [...s.alerts, alert] }));
    setTimeout(() => {
      get().removeAlert(alert.id);
    }, 4000);
  },
  removeAlert: (id) => {
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) }));
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSafeDistance: (d) => {
    set({ safeDistance: d });
    get().recomputeCollisions();
  },
  setShowCollisionZones: (v) => set({ showCollisionZones: v }),
  setSelectedPipelineId: (id) => set({ selectedPipelineId: id }),

  recomputeCollisions: () => {
    const { pipelines, obstacles, safeDistance } = get();
    const allResults: CollisionResult[] = [];

    for (const pipe of pipelines) {
      const start = convertToWorld(pipe.start.position, pipe.start.coordinateSystem);
      const end = convertToWorld(pipe.end.position, pipe.end.coordinateSystem);
      const results = checkCollisions(start, end, obstacles, safeDistance);
      allResults.push(...results);
    }

    const violations = allResults.filter((r) => r.isViolation);
    if (violations.length > 0) {
      set({ collisions: allResults });
      if (violations.length >= 1 && get().collisions.filter(c => c.isViolation).length !== violations.length) {
        get().addAlert('danger', `检测到 ${violations.length} 处越界碰撞！`);
      }
    } else {
      set({ collisions: allResults });
    }
  },

  initDemoData: () => {
    const demoPipelines: PipelineSegment[] = [
      {
        id: generateId(),
        name: '海管 A-01',
        diameter: 0.6,
        start: {
          id: generateId(),
          position: { x: -60, y: -2, z: -40 },
          coordinateSystem: 'world',
        },
        end: {
          id: generateId(),
          position: { x: 40, y: -1, z: 20 },
          coordinateSystem: 'world',
        },
      },
      {
        id: generateId(),
        name: '海管 A-02',
        diameter: 0.4,
        start: {
          id: generateId(),
          position: { x: -20, y: -3, z: 30 },
          coordinateSystem: 'local',
        },
        end: {
          id: generateId(),
          position: { x: 50, y: -2, z: -10 },
          coordinateSystem: 'local',
        },
      },
    ];

    const demoObstacles: Obstacle[] = [
      {
        id: generateId(),
        name: '平台桩腿 P1',
        type: 'pile',
        position: { x: 10, y: 0, z: 5 },
        size: { x: 3, y: 15, z: 3 },
        coordinateSystem: 'world',
      },
      {
        id: generateId(),
        name: '海底结构物 S1',
        type: 'structure',
        position: { x: -10, y: -3, z: -10 },
        size: { x: 8, y: 6, z: 8 },
        coordinateSystem: 'world',
      },
      {
        id: generateId(),
        name: '礁石 R1',
        type: 'rock',
        position: { x: 25, y: -3, z: 25 },
        size: { x: 5, y: 3, z: 5 },
        coordinateSystem: 'world',
      },
    ];

    set({ pipelines: demoPipelines, obstacles: demoObstacles });

    const saved: SavedView = {
      id: generateId(),
      name: '整体俯视图',
      camera: {
        position: { x: 0, y: 120, z: 0.1 },
        target: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 1, z: 0 },
        fov: 50,
      },
      note: '工程评审第 3 次会议，整体视角，来源：图册-002.png',
      sourceImage: '图册-002.png',
      sourceRow: 15,
      createdAt: Date.now() - 86400000,
    };
    const saved2: SavedView = {
      id: generateId(),
      name: '碰撞点近景',
      camera: {
        position: { x: 20, y: 15, z: 20 },
        target: { x: 10, y: 0, z: 5 },
        up: { x: 0, y: 1, z: 0 },
        fov: 50,
      },
      note: 'A-01 与 P1 间距越界，来源：评审记录表第 7 行',
      sourceRow: 7,
      createdAt: Date.now() - 3600000,
    };
    set({ savedViews: [saved, saved2] });

    const now = Date.now();
    const records: PipelineRecord[] = [
      {
        id: generateId(),
        name: 'A-01 海管坐标',
        pipeline: demoPipelines[0],
        coordinateSystem: 'world',
        source: { fileName: '海管坐标-2025Q4.xlsx', rowNumber: 3, remark: '设计单位提交 v2.1' },
        status: 'ok',
        issues: [],
        createdAt: now - 7200000,
      },
      {
        id: generateId(),
        name: 'A-02 海管坐标',
        pipeline: demoPipelines[1],
        coordinateSystem: 'local',
        source: { fileName: '现场测量-11月.csv', rowNumber: 12, remark: '施工队坐标系需确认转换参数' },
        status: 'review-required',
        issues: ['坐标系为 local，需复核转换参数'],
        createdAt: now - 3600000,
      },
      {
        id: generateId(),
        name: 'A-01 海管坐标（重复）',
        pipeline: demoPipelines[0],
        coordinateSystem: 'world',
        source: { fileName: '海管坐标-2025Q4-副本.xlsx', rowNumber: 3, remark: '疑似重复提交' },
        status: 'duplicate',
        issues: ['与已有记录重复'],
        duplicateOf: '',
        createdAt: now - 1800000,
      },
    ];
    set({ records });

    get().recomputeCollisions();
  },
}));
