import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type {
  InspectionRecord,
  PipeElement,
  Viewpoint,
  Collision,
  ValidationIssue,
  Vec3,
  RecordStatus,
  ScreenshotItem,
} from '../types';
import { generateMockRecords, validateModel, detectCollisions } from '../utils';

interface AppState {
  records: InspectionRecord[];
  activeRecordId: string | null;
  collisionThreshold: number;
  boundaryMargin: number;
  showCollisions: boolean;
  showBoundaries: boolean;
  cameraPosition: Vec3;
  cameraRotation: Vec3;
  selectedCollisionId: string | null;
  screenshots: ScreenshotItem[];
}

interface AppContextType extends AppState {
  activeRecord: InspectionRecord | null;
  setActiveRecord: (id: string | null) => void;
  importModel: (elements: PipeElement[], sourceName: string) => InspectionRecord;
  updateRecordStatus: (id: string, status: RecordStatus, notes?: string) => void;
  setCollisionThreshold: (v: number) => void;
  setBoundaryMargin: (v: number) => void;
  setShowCollisions: (v: boolean) => void;
  setShowBoundaries: (v: boolean) => void;
  setCameraPosition: (v: Vec3) => void;
  setCameraRotation: (v: Vec3) => void;
  saveViewpoint: (name: string, description?: string) => Viewpoint;
  restoreViewpoint: (vp: Viewpoint) => void;
  selectCollision: (id: string | null) => void;
  runCollisionDetection: () => Collision[];
  exportRecord: (id: string) => { success: boolean; issues: string[] };
  loadDuplicateTestScenario: () => void;
  getValidationIssues: (recordId: string) => ValidationIssue[];
  addScreenshot: (item: ScreenshotItem) => void;
}

const initialState: AppState = {
  records: [],
  activeRecordId: null,
  collisionThreshold: 50,
  boundaryMargin: 100,
  showCollisions: true,
  showBoundaries: true,
  cameraPosition: [15, 12, 18],
  cameraRotation: [-0.5, 0.6, 0],
  selectedCollisionId: null,
  screenshots: [],
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => ({
    ...initialState,
    records: generateMockRecords(),
  }));

  const activeRecord = useMemo(
    () => state.records.find((r) => r.id === state.activeRecordId) ?? state.records[0] ?? null,
    [state.records, state.activeRecordId]
  );

  const setActiveRecord = useCallback((id: string | null) => {
    setState((s) => ({ ...s, activeRecordId: id }));
  }, []);

  const importModel = useCallback((elements: PipeElement[], sourceName: string) => {
    const validation = validateModel(elements);
    const collisions = detectCollisions(elements, state.collisionThreshold);

    const newRecord: InspectionRecord = {
      id: `rec_${Date.now()}`,
      name: sourceName || `导入记录_${new Date().toLocaleString('zh-CN')}`,
      status: validation.issues.some((i) => i.severity === 'critical') ? 'needs_review' : 'valid',
      createdAt: Date.now(),
      hasDuplicates: validation.hasDuplicates,
      hasEmptyValues: validation.hasEmptyValues,
      hasCoordinateIssues: validation.hasCoordinateIssues,
      hasUnitMismatch: validation.hasUnitMismatch,
      viewpoints: [],
      collisions,
      elements,
      modelSource: sourceName,
      timeParams: {
        designTime: Date.now() - 86400000,
        importTime: Date.now(),
        timelineSync: true,
      },
    };

    setState((s) => ({
      ...s,
      records: [newRecord, ...s.records],
      activeRecordId: newRecord.id,
    }));
    return newRecord;
  }, [state.collisionThreshold]);

  const updateRecordStatus = useCallback((id: string, status: RecordStatus, notes?: string) => {
    setState((s) => ({
      ...s,
      records: s.records.map((r) =>
        r.id === id ? { ...r, status, reviewNotes: notes ?? r.reviewNotes } : r
      ),
    }));
  }, []);

  const setCollisionThreshold = useCallback((v: number) => setState((s) => ({ ...s, collisionThreshold: v })), []);
  const setBoundaryMargin = useCallback((v: number) => setState((s) => ({ ...s, boundaryMargin: v })), []);
  const setShowCollisions = useCallback((v: boolean) => setState((s) => ({ ...s, showCollisions: v })), []);
  const setShowBoundaries = useCallback((v: boolean) => setState((s) => ({ ...s, showBoundaries: v })), []);
  const setCameraPosition = useCallback((v: Vec3) => setState((s) => ({ ...s, cameraPosition: v })), []);
  const setCameraRotation = useCallback((v: Vec3) => setState((s) => ({ ...s, cameraRotation: v })), []);

  const saveViewpoint = useCallback((name: string, description?: string) => {
    const vp: Viewpoint = {
      id: `vp_${Date.now()}`,
      name,
      description,
      position: state.cameraPosition,
      rotation: state.cameraRotation,
      fov: 50,
      createdAt: Date.now(),
    };
    setState((s) => ({
      ...s,
      records: s.records.map((r) =>
        r.id === s.activeRecordId
          ? { ...r, viewpoints: [...r.viewpoints, vp] }
          : r
      ),
    }));
    return vp;
  }, [state.cameraPosition, state.cameraRotation, state.activeRecordId]);

  const restoreViewpoint = useCallback((vp: Viewpoint) => {
    setState((s) => ({
      ...s,
      cameraPosition: vp.position,
      cameraRotation: vp.rotation,
    }));
  }, []);

  const selectCollision = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedCollisionId: id }));
  }, []);

  const runCollisionDetection = useCallback(() => {
    if (!activeRecord) return [];
    const collisions = detectCollisions(activeRecord.elements, state.collisionThreshold);
    setState((s) => ({
      ...s,
      records: s.records.map((r) =>
        r.id === s.activeRecordId ? { ...r, collisions } : r
      ),
    }));
    return collisions;
  }, [activeRecord, state.collisionThreshold]);

  const exportRecord = useCallback((id: string) => {
    const record = state.records.find((r) => r.id === id);
    if (!record) return { success: false, issues: ['记录不存在'] };

    const issues: string[] = [];
    if (record.hasEmptyValues) issues.push('存在空值字段未处理');
    if (record.hasDuplicates) issues.push('存在重复构件');
    if (record.hasCoordinateIssues) issues.push('坐标系混用');
    if (record.timeParams.timelineSync === false) issues.push('时间轴不同步');
    if (record.collisions.some(c => c.isCritical)) issues.push('存在严重碰撞未处理');

    const success = issues.length === 0;
    setState((s) => ({
      ...s,
      records: s.records.map((r) =>
        r.id === id ? { ...r, timeParams: { ...r.timeParams, exportTime: Date.now() } } : r
      ),
    }));
    return { success, issues };
  }, [state.records]);

  const loadDuplicateTestScenario = useCallback(() => {
    const testElements: PipeElement[] = [
      { id: 'p1', name: '主管A-001', type: 'pipe', position: [0, 2, 0], size: [8, 0.3, 0.3], unit: 'mm', coordinateSystem: 'world' },
      { id: 'p1_dup', name: '主管A-001', type: 'pipe', position: [0, 2, 0], size: [8, 0.3, 0.3], unit: 'mm', coordinateSystem: 'world', isDuplicate: true },
      { id: 'p2', name: '支管B-002', type: 'pipe', position: [3, 2, 2], size: [0.3, 4, 0.3], unit: 'cm', coordinateSystem: 'world' },
      { id: 'p3', name: ' ', type: 'pipe', position: [5, 3, 0], size: [0.2, 0.2, 5], unit: 'mm', coordinateSystem: 'local', isEmpty: true },
      { id: 'p4', name: '阀门V-003(备注:待确认', type: 'valve', position: [2, 2.5, 0], size: [0.5, 0.5, 0.5], unit: 'm', coordinateSystem: 'world', rawNotes: '名称备注混写', isEmpty: false },
      { id: 'b1', name: '支架S-001', type: 'support', position: [0, 0, 0], size: [0.5, 2, 0.5], unit: 'mm', coordinateSystem: 'world' },
    ];
    importModel(testElements, '重复导入测试场景');
  }, [importModel]);

  const getValidationIssues = useCallback((recordId: string): ValidationIssue[] => {
    const record = state.records.find((r) => r.id === recordId);
    if (!record) return [];
    return validateModel(record.elements).issues;
  }, [state.records]);

  const addScreenshot = useCallback((item: ScreenshotItem) => {
    setState((s) => ({ ...s, screenshots: [...s.screenshots, item] }));
  }, []);

  const value: AppContextType = {
    ...state,
    activeRecord,
    setActiveRecord,
    importModel,
    updateRecordStatus,
    setCollisionThreshold,
    setBoundaryMargin,
    setShowCollisions,
    setShowBoundaries,
    setCameraPosition,
    setCameraRotation,
    saveViewpoint,
    restoreViewpoint,
    selectCollision,
    runCollisionDetection,
    exportRecord,
    loadDuplicateTestScenario,
    getValidationIssues,
    addScreenshot,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
