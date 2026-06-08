import { create } from 'zustand';
import type { Sandbox, HistoryRecord, CameraView, Screenshot } from '@/types';
import { storage } from '@/utils/storage';
import { generateId } from '@/utils/helpers';
import { deepDiff } from '@/utils/diff';
import { mockSandboxes, mockHistory } from '@/data/mockData';

interface SandboxState {
  sandboxes: Sandbox[];
  history: HistoryRecord[];
  currentUser: string;
  initialized: boolean;

  init: () => void;
  getSandbox: (id: string) => Sandbox | undefined;
  getSandboxHistory: (sandboxId: string) => HistoryRecord[];
  getNextVersion: (sandboxId: string) => number;
  getHistoryRecord: (historyId: string) => HistoryRecord | undefined;

  createSandbox: (data: Partial<Sandbox>, changeReason: string) => Sandbox;
  updateSandbox: (
    id: string,
    updates: Partial<Sandbox>,
    changeReason: string,
    modifiedBy?: string
  ) => Sandbox | undefined;
  deleteSandbox: (id: string) => void;

  setCurrentUser: (name: string) => void;

  addScreenshot: (sandboxId: string, screenshot: Omit<Screenshot, 'id' | 'timestamp'>, changeReason: string) => void;
  updateScreenshot: (sandboxId: string, screenshotId: string, updates: Partial<Screenshot>, changeReason: string) => void;
  removeScreenshot: (sandboxId: string, screenshotId: string, changeReason: string) => void;

  updateCameraView: (sandboxId: string, cameraView: CameraView, changeReason: string) => void;

  exportSandbox: (id: string) => string;
  importSandbox: (jsonStr: string, changeReason: string) => Sandbox | null;
}

function seedDataIfEmpty() {
  const existing = storage.getSandboxes<Sandbox[]>();
  if (!existing || existing.length === 0) {
    storage.setSandboxes(mockSandboxes);
    storage.setHistory(mockHistory);
  }
}

export const useSandboxStore = create<SandboxState>((set, get) => ({
  sandboxes: [],
  history: [],
  currentUser: storage.getCurrentUser(),
  initialized: false,

  init: () => {
    seedDataIfEmpty();
    set({
      sandboxes: storage.getSandboxes<Sandbox[]>(),
      history: storage.getHistory<HistoryRecord[]>(),
      currentUser: storage.getCurrentUser(),
      initialized: true,
    });
  },

  getSandbox: (id: string) => get().sandboxes.find((s) => s.id === id),

  getSandboxHistory: (sandboxId: string) =>
    get()
      .history.filter((h) => h.sandboxId === sandboxId)
      .sort((a, b) => a.version - b.version),

  getNextVersion: (sandboxId: string) => {
    const records = get().getSandboxHistory(sandboxId);
    return records.length === 0 ? 1 : records[records.length - 1].version + 1;
  },

  getHistoryRecord: (historyId: string) => get().history.find((h) => h.id === historyId),

  createSandbox: (data, changeReason) => {
    const now = new Date().toISOString();
    const newSandbox: Sandbox = {
      id: generateId(),
      name: data.name || '未命名沙盘',
      status: data.status || 'draft',
      inclination: data.inclination ?? 0,
      unit: data.unit || 'degree',
      cameraView: data.cameraView || { x: 0, y: 10, z: 25, zoom: 1 },
      screenshots: data.screenshots || [],
      modelOverlap: data.modelOverlap ?? false,
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    const version = get().getNextVersion(newSandbox.id);
    const historyRecord: HistoryRecord = {
      id: generateId(),
      sandboxId: newSandbox.id,
      version,
      data: JSON.parse(JSON.stringify(newSandbox)),
      modifiedBy: get().currentUser,
      changeReason: changeReason || '初次创建沙盘',
      createdAt: now,
      fieldsChanged: Object.keys(newSandbox),
    };

    const newSandboxes = [...get().sandboxes, newSandbox];
    const newHistory = [...get().history, historyRecord];

    storage.setSandboxes(newSandboxes);
    storage.setHistory(newHistory);
    set({ sandboxes: newSandboxes, history: newHistory });

    return newSandbox;
  },

  updateSandbox: (id, updates, changeReason, modifiedBy) => {
    const sandbox = get().getSandbox(id);
    if (!sandbox) return undefined;

    const now = new Date().toISOString();
    const updated: Sandbox = {
      ...sandbox,
      ...updates,
      updatedAt: now,
    };

    const diffs = deepDiff(sandbox, updated);
    const fieldsChanged = diffs.map((d) => d.path);

    if (fieldsChanged.length === 0) return sandbox;

    const version = get().getNextVersion(id);
    const historyRecord: HistoryRecord = {
      id: generateId(),
      sandboxId: id,
      version,
      data: JSON.parse(JSON.stringify(updated)),
      modifiedBy: modifiedBy || get().currentUser,
      changeReason: changeReason || '未说明修改原因',
      createdAt: now,
      fieldsChanged,
    };

    const newSandboxes = get().sandboxes.map((s) => (s.id === id ? updated : s));
    const newHistory = [...get().history, historyRecord];

    storage.setSandboxes(newSandboxes);
    storage.setHistory(newHistory);
    set({ sandboxes: newSandboxes, history: newHistory });

    return updated;
  },

  deleteSandbox: (id) => {
    const newSandboxes = get().sandboxes.filter((s) => s.id !== id);
    const newHistory = get().history.filter((h) => h.sandboxId !== id);
    storage.setSandboxes(newSandboxes);
    storage.setHistory(newHistory);
    set({ sandboxes: newSandboxes, history: newHistory });
  },

  setCurrentUser: (name) => {
    storage.setCurrentUser(name);
    set({ currentUser: name });
  },

  addScreenshot: (sandboxId, screenshot, changeReason) => {
    const newScreenshot: Screenshot = {
      ...screenshot,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    const sandbox = get().getSandbox(sandboxId);
    if (!sandbox) return;
    get().updateSandbox(
      sandboxId,
      { screenshots: [...sandbox.screenshots, newScreenshot] },
      changeReason || `新增截图：${screenshot.description || '未命名'}`
    );
  },

  updateScreenshot: (sandboxId, screenshotId, updates, changeReason) => {
    const sandbox = get().getSandbox(sandboxId);
    if (!sandbox) return;
    const screenshots = sandbox.screenshots.map((sc) =>
      sc.id === screenshotId ? { ...sc, ...updates } : sc
    );
    get().updateSandbox(sandboxId, { screenshots }, changeReason || '修改截图信息');
  },

  removeScreenshot: (sandboxId, screenshotId, changeReason) => {
    const sandbox = get().getSandbox(sandboxId);
    if (!sandbox) return;
    const target = sandbox.screenshots.find((s) => s.id === screenshotId);
    const screenshots = sandbox.screenshots.filter((sc) => sc.id !== screenshotId);
    get().updateSandbox(
      sandboxId,
      { screenshots },
      changeReason || `删除截图：${target?.description || '未命名'}`
    );
  },

  updateCameraView: (sandboxId, cameraView, changeReason) => {
    get().updateSandbox(sandboxId, { cameraView }, changeReason || '调整视角参数');
  },

  exportSandbox: (id) => {
    const sandbox = get().getSandbox(id);
    if (!sandbox) return '';
    const history = get().getSandboxHistory(id);
    return JSON.stringify({ sandbox, history }, null, 2);
  },

  importSandbox: (jsonStr, changeReason) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const sandboxData = parsed.sandbox || parsed;
      return get().createSandbox(sandboxData, changeReason || `导入沙盘：${sandboxData.name || '未命名'}`);
    } catch (e) {
      console.error('Import failed:', e);
      return null;
    }
  },
}));
