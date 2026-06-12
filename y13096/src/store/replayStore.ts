import { create } from 'zustand';
import type {
  MaterialItem,
  TimelineGap,
  FilterSnapshot,
  AnomalySummary,
  SavedView,
  CameraState,
  ProcessStatus,
  MaterialType,
  AnomalyTag
} from '../../shared/types';
import {
  demoMaterials,
  demoTimelineGaps,
  defaultFilter,
  buildAnomalySummary,
  DEMO_DATE
} from '../data/demoData';

const LS_VIEWS = 'aero-replay:saved-views';
const LS_STATUS = 'aero-replay:process-status';

interface ReplayState {
  // ==== 回放核心 ====
  isPlaying: boolean;
  currentTime: string;
  speed: number;

  // ==== 材料与异常（含持久化的处理状态）====
  allMaterials: MaterialItem[];
  timelineGaps: TimelineGap[];
  anomalySummary: AnomalySummary;

  // ==== 筛选（FilterSnapshot会随接口返回——此处前端模拟）====
  filter: FilterSnapshot;

  // ==== 选中与UI ====
  selectedMaterialId: string | null;
  sidebarTab: 'points' | 'attachments' | 'orals' | 'anomalies';
  showCaliberDrawer: boolean;
  showExportDialog: boolean;

  // ==== 相机视角（2D模式）====
  camera: CameraState;

  // ==== 保存的视图列表（LocalStorage）====
  savedViews: SavedView[];

  // ====== 派生：筛选后的材料 ======
  filteredMaterials: () => MaterialItem[];

  // ====== Actions: 回放控制 ======
  togglePlay: () => void;
  setCurrentTime: (t: string) => void;
  setSpeed: (s: number) => void;
  tickTime: () => void;

  // ====== Actions: 筛选 ======
  setDateRange: (start: string, end: string) => void;
  toggleAnomalyStatus: (tag: AnomalyTag) => void;
  toggleMaterialType: (t: MaterialType) => void;
  setModifiedCaliberOnly: (v: boolean | null) => void;
  toggleProcessStatus: (s: ProcessStatus) => void;
  resetFilter: () => void;

  // ====== Actions: 选中与UI ======
  selectMaterial: (id: string | null) => void;
  setSidebarTab: (t: 'points' | 'attachments' | 'orals' | 'anomalies') => void;
  toggleCaliberDrawer: (v?: boolean) => void;
  toggleExportDialog: (v?: boolean) => void;

  // ====== Actions: 相机 ======
  setCamera: (c: Partial<CameraState>) => void;
  focusMaterial: (id: string) => void;

  // ====== Actions: 处理状态 ======
  setProcessStatus: (id: string, status: ProcessStatus, note?: string) => void;

  // ====== Actions: 保存/复原视图 ======
  saveView: (name: string) => string;
  restoreView: (id: string) => boolean;
  deleteView: (id: string) => void;
}

function timeToMs(ts: string): number {
  return new Date(ts).getTime();
}
function msToTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${DEMO_DATE} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function rebuildRawSql(f: FilterSnapshot) {
  const s = f.dateRange.start.slice(11, 16);
  const e = f.dateRange.end.slice(11, 16);
  const parts: string[] = [`time BETWEEN '${s}' AND '${e}'`];
  if (f.anomalyStatus.length < 4) parts.push(`异常 IN [${f.anomalyStatus.join(',')}]`);
  if (f.materialTypes.length < 3) parts.push(`类型 IN [${f.materialTypes.join(',')}]`);
  if (f.hasModifiedCaliber === true) parts.push('口径修改=是');
  if (f.hasModifiedCaliber === false) parts.push('口径修改=否');
  if (f.processStatuses.length < 4) parts.push(`状态 IN [${f.processStatuses.join(',')}]`);
  return parts.join(' · ');
}
function loadStatusOverrides(): Record<string, { status: ProcessStatus; note?: string }> {
  try {
    const raw = localStorage.getItem(LS_STATUS);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveStatusOverrides(o: Record<string, { status: ProcessStatus; note?: string }>) {
  try { localStorage.setItem(LS_STATUS, JSON.stringify(o)); } catch {}
}
function applyStatusOverrides(items: MaterialItem[]): MaterialItem[] {
  const overrides = loadStatusOverrides();
  return items.map(m => overrides[m.id]
    ? { ...m, processStatus: overrides[m.id].status, processNote: overrides[m.id].note }
    : m);
}
function loadSavedViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(LS_VIEWS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function persistViews(views: SavedView[]) {
  try { localStorage.setItem(LS_VIEWS, JSON.stringify(views)); } catch {}
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  // ==== 初始值 ====
  isPlaying: false,
  currentTime: `${DEMO_DATE} 09:30:00`,
  speed: 1,
  allMaterials: applyStatusOverrides(demoMaterials),
  timelineGaps: demoTimelineGaps,
  anomalySummary: buildAnomalySummary(applyStatusOverrides(demoMaterials), demoTimelineGaps),
  filter: { ...defaultFilter, rawSqlLike: rebuildRawSql(defaultFilter) },
  selectedMaterialId: null,
  sidebarTab: 'anomalies',
  showCaliberDrawer: false,
  showExportDialog: false,
  camera: { mode: '2D', center: { lng: 121.58, lat: 31.275 }, zoom: 12 },
  savedViews: loadSavedViews(),

  filteredMaterials: () => {
    const { allMaterials, filter } = get();
    return allMaterials.filter(m => {
      const t = m.timestamp;
      if (t < filter.dateRange.start || t > filter.dateRange.end) return false;
      if (!filter.materialTypes.includes(m.type)) return false;
      if (filter.hasModifiedCaliber !== null && m.hasModifiedCaliber !== filter.hasModifiedCaliber) return false;
      if (!filter.processStatuses.includes(m.processStatus)) return false;
      const tags: AnomalyTag[] = ['normal'];
      if (m.attachmentMeta?.isLate) tags.push('late');
      if (m.hasModifiedCaliber) tags.push('modified');
      if (m.fillsGapId) tags.push('gap');
      const match = tags.some(tag => filter.anomalyStatus.includes(tag));
      if (!match) return false;
      return true;
    });
  },

  // ====== 回放控制 ======
  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),
  setCurrentTime: (t) => set({ currentTime: t }),
  setSpeed: (s) => set({ speed: s }),
  tickTime: () => {
    const { currentTime, speed, filter } = get();
    const step = 15_000 * speed; // 每tick 15秒 × 倍速
    let next = timeToMs(currentTime) + step;
    const end = timeToMs(filter.dateRange.end);
    if (next >= end) { next = end; set({ isPlaying: false }); }
    set({ currentTime: msToTime(next) });
  },

  // ====== 筛选 ======
  setDateRange: (start, end) => set(s => {
    const f = { ...s.filter, dateRange: { start, end } };
    return { filter: { ...f, rawSqlLike: rebuildRawSql(f) } };
  }),
  toggleAnomalyStatus: (tag) => set(s => {
    const has = s.filter.anomalyStatus.includes(tag);
    const next = has ? s.filter.anomalyStatus.filter(x => x !== tag) : [...s.filter.anomalyStatus, tag];
    const f = { ...s.filter, anomalyStatus: next as AnomalyTag[] };
    return { filter: { ...f, rawSqlLike: rebuildRawSql(f) } };
  }),
  toggleMaterialType: (t) => set(s => {
    const has = s.filter.materialTypes.includes(t);
    const next = has ? s.filter.materialTypes.filter(x => x !== t) : [...s.filter.materialTypes, t];
    const f = { ...s.filter, materialTypes: next as MaterialType[] };
    return { filter: { ...f, rawSqlLike: rebuildRawSql(f) } };
  }),
  setModifiedCaliberOnly: (v) => set(s => {
    const f = { ...s.filter, hasModifiedCaliber: v };
    return { filter: { ...f, rawSqlLike: rebuildRawSql(f) } };
  }),
  toggleProcessStatus: (st) => set(s => {
    const has = s.filter.processStatuses.includes(st);
    const next = has ? s.filter.processStatuses.filter(x => x !== st) : [...s.filter.processStatuses, st];
    const f = { ...s.filter, processStatuses: next as ProcessStatus[] };
    return { filter: { ...f, rawSqlLike: rebuildRawSql(f) } };
  }),
  resetFilter: () => set({
    filter: { ...defaultFilter, rawSqlLike: rebuildRawSql(defaultFilter) }
  }),

  // ====== 选中与UI ======
  selectMaterial: (id) => set({ selectedMaterialId: id, showCaliberDrawer: !!id }),
  setSidebarTab: (t) => set({ sidebarTab: t }),
  toggleCaliberDrawer: (v) => set(s => ({
    showCaliberDrawer: v === undefined ? !s.showCaliberDrawer : v
  })),
  toggleExportDialog: (v) => set(s => ({
    showExportDialog: v === undefined ? !s.showExportDialog : v
  })),

  // ====== 相机 ======
  setCamera: (c) => set(s => ({ camera: { ...s.camera, ...c } })),
  focusMaterial: (id) => {
    const m = get().allMaterials.find(x => x.id === id);
    if (m?.position) {
      set({
        camera: { mode: '2D', center: { lng: m.position!.lng, lat: m.position!.lat }, zoom: 14 },
        selectedMaterialId: id,
        showCaliberDrawer: true,
        currentTime: m.timestamp
      });
    }
  },

  // ====== 处理状态 ======
  setProcessStatus: (id, status, note) => {
    const overrides = loadStatusOverrides();
    overrides[id] = { status, note };
    saveStatusOverrides(overrides);
    const applied = applyStatusOverrides(demoMaterials);
    set({
      allMaterials: applied,
      anomalySummary: buildAnomalySummary(applied, demoTimelineGaps)
    });
  },

  // ====== 保存/复原视图 ======
  saveView: (name) => {
    const id = 'VIEW-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const now = new Date().toISOString();
    const s = get();
    const view: SavedView = {
      id,
      name: name || `视图 ${new Date(now).toLocaleString('zh-CN', { hour12: false }).slice(5, 16)}`,
      viewState: {
        camera: s.camera,
        filter: s.filter,
        currentTime: s.currentTime,
        ui: { selectedMaterialId: s.selectedMaterialId ?? undefined, sidebarTab: s.sidebarTab },
        createdAt: now
      }
    };
    const next = [view, ...s.savedViews].slice(0, 20);
    persistViews(next);
    set({ savedViews: next });
    return id;
  },
  restoreView: (id) => {
    const v = get().savedViews.find(x => x.id === id);
    if (!v) return false;
    set({
      camera: v.viewState.camera,
      filter: v.viewState.filter,
      currentTime: v.viewState.currentTime,
      selectedMaterialId: v.viewState.ui.selectedMaterialId ?? null,
      sidebarTab: v.viewState.ui.sidebarTab,
      showCaliberDrawer: !!v.viewState.ui.selectedMaterialId
    });
    return true;
  },
  deleteView: (id) => {
    const next = get().savedViews.filter(x => x.id !== id);
    persistViews(next);
    set({ savedViews: next });
  }
}));
