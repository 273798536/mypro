import { create } from 'zustand';
import {
  AppDataState,
  ChangeLog,
  DEFAULT_FILTER,
  FilterState,
  Note,
  NoteSourceType,
  Screenshot,
  SplitRecord,
  SplitStatus,
  TraceNode,
  TrackVersion,
} from '@/types';
import {
  clearAppState,
  isAuthExpired,
  loadAppState,
  loadFilter,
  saveAppState,
  saveFilter,
  uid,
} from '@/utils/storage';
import { generateSampleData } from '@/data/sampleData';
import { buildHumanReason, getLatestVersion } from '@/utils/reason';
import { shallowDiff } from '@/utils/diff';

const EMPTY_STATE: AppDataState = {
  trackVersions: [],
  splitRecords: [],
  notes: [],
  screenshots: [],
  changeLogs: [],
  traceNodes: [],
  filterState: { ...DEFAULT_FILTER },
  currentUser: '琴房前台小温',
  sampleLoaded: false,
};

interface AppActions {
  init: () => void;
  loadSample: () => void;
  resetAll: () => void;

  setFilter: (patch: Partial<FilterState>) => void;
  resetFilter: () => void;

  addTrackVersion: (
    data: Omit<TrackVersion, 'id' | 'uploadedAt' | 'isLatest'>
  ) => void;
  markVersionLatest: (versionId: string) => void;

  addSplitRecord: (
    data: Omit<SplitRecord, 'id' | 'status' | 'humanReason'>
  ) => void;
  updateSplitRecord: (
    id: string,
    patch: Partial<SplitRecord>,
    reason: string
  ) => void;
  setSplitStatus: (
    id: string,
    status: SplitStatus,
    reason: string
  ) => void;
  unlockSuspended: (id: string, confirmer: string) => void;
  confirmAligned: (id: string) => void;

  addNote: (
    splitRecordId: string,
    sourceType: NoteSourceType,
    content: string
  ) => void;
  addScreenshot: (
    splitRecordId: string,
    description: string,
    dataUrl: string
  ) => void;
  addTraceNode: (
    splitRecordId: string,
    influenceType: TraceNode['influenceType'],
    description: string
  ) => void;

  recomputeDerived: () => void;
}

export type AppStore = AppDataState & AppActions;

function rebuildHumanReason(state: AppDataState): AppDataState {
  const versionMap = new Map(
    state.trackVersions.map((v) => [v.id, v]) as [string, TrackVersion][]
  );
  const verbalMap = new Map<string, number>();
  state.notes.forEach((n) => {
    if (n.sourceType === 'verbal') {
      verbalMap.set(n.splitRecordId, (verbalMap.get(n.splitRecordId) ?? 0) + 1);
    }
  });

  const records = state.splitRecords.map((r) => {
    const v = versionMap.get(r.trackVersionId);
    const latest = v
      ? getLatestVersion(state.trackVersions, v.trackName)
      : undefined;
    const humanReason = buildHumanReason(r.status, {
      authExpiryDate: r.authExpiryDate,
      isLatestVersion: v?.isLatest,
      latestVersionTag: latest?.versionTag,
      currentVersionTag: v?.versionTag,
      hasVerbalNotes: (verbalMap.get(r.id) ?? 0) > 0,
      missingConfirm: !r.confirmedBy,
    });
    return { ...r, humanReason };
  });
  return { ...state, splitRecords: records };
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...EMPTY_STATE,

  init: () => {
    const existing = loadAppState();
    const filter = loadFilter();
    let base: AppDataState;
    if (existing && existing.splitRecords.length > 0) {
      base = { ...existing, filterState: { ...DEFAULT_FILTER, ...filter } };
    } else {
      const sample = generateSampleData();
      base = { ...sample, filterState: { ...DEFAULT_FILTER, ...filter } };
      saveAppState(base);
    }
    const derived = rebuildHumanReason(base);
    set(derived);
  },

  loadSample: () => {
    const sample = generateSampleData();
    const filter = loadFilter();
    const base = { ...sample, filterState: { ...DEFAULT_FILTER, ...filter } };
    const derived = rebuildHumanReason(base);
    saveAppState(derived);
    set(derived);
  },

  resetAll: () => {
    clearAppState();
    set({ ...EMPTY_STATE, filterState: { ...DEFAULT_FILTER } });
  },

  setFilter: (patch) => {
    const merged = { ...get().filterState, ...patch };
    saveFilter(merged);
    set({ filterState: merged });
  },

  resetFilter: () => {
    const fresh = { ...DEFAULT_FILTER };
    saveFilter(fresh);
    set({ filterState: fresh });
  },

  addTrackVersion: (data) => {
    const state = get();
    const sameNameVersions = state.trackVersions.filter(
      (v) => v.trackName === data.trackName
    );
    const nextMajor = sameNameVersions.length + 1;
    const tag = data.versionTag || `v${nextMajor}.0`;
    const othersUpdated = state.trackVersions.map((v) =>
      v.trackName === data.trackName ? { ...v, isLatest: false } : v
    );
    const newVersion: TrackVersion = {
      ...data,
      versionTag: tag,
      id: uid('tv'),
      uploadedAt: new Date().toISOString(),
      isLatest: true,
    };
    const next: AppDataState = {
      ...state,
      trackVersions: [...othersUpdated, newVersion],
    };
    saveAppState(next);
    set(rebuildHumanReason(next));
  },

  markVersionLatest: (versionId) => {
    const state = get();
    const target = state.trackVersions.find((v) => v.id === versionId);
    if (!target) return;
    const updated = state.trackVersions.map((v) => {
      if (v.trackName === target.trackName) {
        return { ...v, isLatest: v.id === versionId };
      }
      return v;
    });
    let traceNodes = [...state.traceNodes];
    const changeLogs = [...state.changeLogs];
    state.splitRecords.forEach((sr) => {
      if (sr.trackVersionId === versionId) {
        traceNodes.push({
          id: uid('tn'),
          splitRecordId: sr.id,
          influenceType: 'manual_add',
          description: `人工将 ${target.versionTag} 切换为最新版曲目表`,
          orderIndex: traceNodes.filter((n) => n.splitRecordId === sr.id).length + 1,
        });
        changeLogs.push({
          id: uid('cl'),
          splitRecordId: sr.id,
          fieldName: 'trackVersion.isLatest',
          oldValue: false,
          newValue: true,
          changedBy: state.currentUser,
          changedAt: new Date().toISOString(),
          changeReason: `指定 ${target.versionTag} 为最新版`,
        });
      }
    });
    const next: AppDataState = {
      ...state,
      trackVersions: updated,
      traceNodes,
      changeLogs,
    };
    saveAppState(next);
    set(rebuildHumanReason(next));
  },

  addSplitRecord: (data) => {
    const state = get();
    const version = state.trackVersions.find((v) => v.id === data.trackVersionId);
    let status: SplitStatus = 'pending';
    if (version && !version.isLatest) status = 'conflicted';
    if (isAuthExpired(data.authExpiryDate)) status = 'suspended';

    const record: SplitRecord = {
      ...data,
      id: uid('sr'),
      status,
      humanReason: '',
    };
    const records = [...state.splitRecords, record];
    const traceNodes = [
      ...state.traceNodes,
      {
        id: uid('tn'),
        splitRecordId: record.id,
        influenceType: 'system_check',
        description: `新建分账记录，初始状态：${status}`,
        orderIndex: 1,
      },
    ];
    if (status === 'suspended') {
      traceNodes.push({
        id: uid('tn'),
        splitRecordId: record.id,
        influenceType: 'system_check',
        description: '系统检测到授权已到期，自动挂起',
        orderIndex: 2,
      });
    }
    if (status === 'conflicted') {
      traceNodes.push({
        id: uid('tn'),
        splitRecordId: record.id,
        influenceType: 'old_version',
        description: '引用的曲目表不是最新版，标记为版本冲突',
        orderIndex: 2,
      });
    }
    const next: AppDataState = { ...state, splitRecords: records, traceNodes };
    saveAppState(next);
    set(rebuildHumanReason(next));
  },

  updateSplitRecord: (id, patch, reason) => {
    const state = get();
    const idx = state.splitRecords.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const old = state.splitRecords[idx];
    const updated = { ...old, ...patch };
    const diffs = shallowDiff(
      old as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>
    );
    const changeLogs = [...state.changeLogs];
    diffs.forEach((d) => {
      changeLogs.push({
        id: uid('cl'),
        splitRecordId: id,
        fieldName: d.field,
        oldValue: d.oldValue,
        newValue: d.newValue,
        changedBy: state.currentUser,
        changedAt: new Date().toISOString(),
        changeReason: reason || '人工编辑',
      });
    });
    const records = [...state.splitRecords];
    records[idx] = updated;
    const next: AppDataState = { ...state, splitRecords: records, changeLogs };
    saveAppState(next);
    set(rebuildHumanReason(next));
  },

  setSplitStatus: (id, status, reason) => {
    const state = get();
    const idx = state.splitRecords.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const old = state.splitRecords[idx];
    const updated = { ...old, status };
    const changeLog: ChangeLog = {
      id: uid('cl'),
      splitRecordId: id,
      fieldName: 'status',
      oldValue: old.status,
      newValue: status,
      changedBy: state.currentUser,
      changedAt: new Date().toISOString(),
      changeReason: reason || '状态更新',
    };
    const trace: TraceNode = {
      id: uid('tn'),
      splitRecordId: id,
      influenceType: 'manual_add',
      description: reason || `状态由 ${old.status} 变更为 ${status}`,
      orderIndex: state.traceNodes.filter((n) => n.splitRecordId === id).length + 1,
    };
    const records = [...state.splitRecords];
    records[idx] = updated;
    const next: AppDataState = {
      ...state,
      splitRecords: records,
      changeLogs: [...state.changeLogs, changeLog],
      traceNodes: [...state.traceNodes, trace],
    };
    saveAppState(next);
    set(rebuildHumanReason(next));
  },

  unlockSuspended: (id, confirmer) => {
    const state = get();
    const idx = state.splitRecords.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const old = state.splitRecords[idx];
    const updated: SplitRecord = {
      ...old,
      status: 'pending',
      confirmedBy: confirmer,
      confirmedAt: new Date().toISOString(),
    };
    const changeLog: ChangeLog = {
      id: uid('cl'),
      splitRecordId: id,
      fieldName: 'status',
      oldValue: 'suspended',
      newValue: 'pending',
      changedBy: confirmer,
      changedAt: new Date().toISOString(),
      changeReason: '接手同事确认：授权事宜已沟通，可继续处理',
    };
    const trace: TraceNode = {
      id: uid('tn'),
      splitRecordId: id,
      influenceType: 'manual_add',
      description: `接手同事「${confirmer}」确认解锁，授权事宜已沟通`,
      orderIndex: state.traceNodes.filter((n) => n.splitRecordId === id).length + 1,
    };
    const records = [...state.splitRecords];
    records[idx] = updated;
    const next: AppDataState = {
      ...state,
      splitRecords: records,
      changeLogs: [...state.changeLogs, changeLog],
      traceNodes: [...state.traceNodes, trace],
    };
    saveAppState(next);
    set(rebuildHumanReason(next));
  },

  confirmAligned: (id) => {
    const state = get();
    const idx = state.splitRecords.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const old = state.splitRecords[idx];
    const verbalCount = state.notes.filter(
      (n) => n.splitRecordId === id && n.sourceType === 'verbal'
    ).length;
    if (old.status === 'suspended') return;
    let finalStatus: SplitStatus = 'aligned';
    let reasonText = '琴房前台人工确认对齐';
    if (verbalCount > 0 && state.notes.filter((n) => n.splitRecordId === id).length === 1) {
      finalStatus = 'missing_note';
      reasonText = '存在口头备注尚未补充完整';
    }
    const updated: SplitRecord = {
      ...old,
      status: finalStatus,
      confirmedBy: state.currentUser,
      confirmedAt: new Date().toISOString(),
    };
    const changeLog: ChangeLog = {
      id: uid('cl'),
      splitRecordId: id,
      fieldName: 'status',
      oldValue: old.status,
      newValue: finalStatus,
      changedBy: state.currentUser,
      changedAt: new Date().toISOString(),
      changeReason: reasonText,
    };
    const trace: TraceNode = {
      id: uid('tn'),
      splitRecordId: id,
      influenceType: 'manual_add',
      description: `${state.currentUser}人工确认：${reasonText}`,
      orderIndex: state.traceNodes.filter((n) => n.splitRecordId === id).length + 1,
    };
    const records = [...state.splitRecords];
    records[idx] = updated;
    const next: AppDataState = {
      ...state,
      splitRecords: records,
      changeLogs: [...state.changeLogs, changeLog],
      traceNodes: [...state.traceNodes, trace],
    };
    saveAppState(next);
    set(rebuildHumanReason(next));
  },

  addNote: (splitRecordId, sourceType, content) => {
    const state = get();
    const note: Note = {
      id: uid('nt'),
      splitRecordId,
      sourceType,
      content,
      createdBy: state.currentUser,
      createdAt: new Date().toISOString(),
    };
    const sourceMap: Record<NoteSourceType, TraceNode['influenceType']> = {
      old_version: 'old_version',
      manual_add: 'manual_add',
      verbal: 'verbal',
    };
    const labels: Record<NoteSourceType, string> = {
      old_version: '新增旧版曲目表带入备注',
      manual_add: '新增后补人工备注',
      verbal: '转录口头备注',
    };
    const trace: TraceNode = {
      id: uid('tn'),
      splitRecordId,
      influenceType: sourceMap[sourceType],
      description: `${labels[sourceType]}：${content.slice(0, 40)}${content.length > 40 ? '…' : ''}`,
      orderIndex: state.traceNodes.filter((n) => n.splitRecordId === splitRecordId).length + 1,
    };
    const next: AppDataState = {
      ...state,
      notes: [...state.notes, note],
      traceNodes: [...state.traceNodes, trace],
    };
    saveAppState(next);
    set(rebuildHumanReason(next));
  },

  addScreenshot: (splitRecordId, description, dataUrl) => {
    const state = get();
    const shot: Screenshot = {
      id: uid('ss'),
      splitRecordId,
      description,
      dataUrl,
      createdAt: new Date().toISOString(),
    };
    const trace: TraceNode = {
      id: uid('tn'),
      splitRecordId,
      influenceType: 'manual_add',
      description: `上传截图：${description}`,
      orderIndex: state.traceNodes.filter((n) => n.splitRecordId === splitRecordId).length + 1,
    };
    const next: AppDataState = {
      ...state,
      screenshots: [...state.screenshots, shot],
      traceNodes: [...state.traceNodes, trace],
    };
    saveAppState(next);
    set(rebuildHumanReason(next));
  },

  addTraceNode: (splitRecordId, influenceType, description) => {
    const state = get();
    const trace: TraceNode = {
      id: uid('tn'),
      splitRecordId,
      influenceType,
      description,
      orderIndex: state.traceNodes.filter((n) => n.splitRecordId === splitRecordId).length + 1,
    };
    const next: AppDataState = {
      ...state,
      traceNodes: [...state.traceNodes, trace],
    };
    saveAppState(next);
    set(next);
  },

  recomputeDerived: () => {
    const state = get();
    const derived = rebuildHumanReason(state);
    set(derived);
  },
}));
