import { create } from 'zustand';
import {
  StationRecord,
  Device,
  RecordStatus,
  CanvasState,
  FilterOptions,
  Annotation,
} from '../types';
import {
  detectCoordinateFlip,
  generateFlipExplanation,
  generateId,
  calculateRecordScore,
} from '../utils/coordinateUtils';
import { historyManager } from '../utils/historyManager';
import { initializeSampleData } from '../data/sampleData';

interface AppState {
  records: StationRecord[];
  devices: Device[];
  selectedRecordId: string | null;
  zoom: number;
  offset: { x: number; y: number };
  filterOptions: FilterOptions;
  lastSyncTime: string;
  undoCount: number;

  selectRecord: (id: string | null) => void;
  moveRecord: (id: string, x: number, y: number) => void;
  changeRecordStatus: (id: string, status: RecordStatus) => void;
  annotateRecord: (id: string, content: string, author: string) => void;
  addRecord: (record: Omit<StationRecord, 'id' | 'createdAt' | 'updatedAt' | 'isFlipped' | 'flipExplanation' | 'score'>) => void;
  deleteRecord: (id: string) => void;

  addDevice: (device: Omit<Device, 'id'>) => void;
  updateDevice: (device: Device) => void;
  assignDeviceToRecord: (recordId: string, deviceId: string | undefined) => void;

  setFilter: (options: Partial<FilterOptions>) => void;
  getFilteredRecords: () => StationRecord[];

  setZoom: (zoom: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  resetToSample: () => void;
}

const sampleData = initializeSampleData();

export const useAppStore = create<AppState>((set, get) => ({
  records: sampleData.records,
  devices: sampleData.devices,
  selectedRecordId: null,
  zoom: 1,
  offset: { x: 0, y: 0 },
  filterOptions: {},
  lastSyncTime: new Date().toISOString(),
  undoCount: 0,

  selectRecord: (id) => set({ selectedRecordId: id }),

  moveRecord: (id, x, y) => {
    const state = get();
    const record = state.records.find((r) => r.id === id);
    if (!record) return;

    const previousState = { records: [...state.records] };
    const isFlipped = detectCoordinateFlip({ xCoordinate: x, yCoordinate: y });

    historyManager.push({
      actionType: 'move',
      actionData: { id, x, y },
      previousState,
      description: `移动「${record.label}」到 (${x.toFixed(0)}, ${y.toFixed(0)})`,
    });

    set((state) => ({
      records: state.records.map((r) =>
        r.id === id
          ? {
              ...r,
              xCoordinate: x,
              yCoordinate: y,
              isFlipped,
              flipExplanation: isFlipped
                ? generateFlipExplanation({ ...r, xCoordinate: x, yCoordinate: y, isFlipped })
                : undefined,
              updatedAt: new Date().toISOString(),
              score: calculateRecordScore({
                ...r,
                xCoordinate: x,
                yCoordinate: y,
                isFlipped,
              }),
            }
          : r
      ),
      lastSyncTime: new Date().toISOString(),
    }));
  },

  changeRecordStatus: (id, status) => {
    const state = get();
    const record = state.records.find((r) => r.id === id);
    if (!record) return;

    const previousState = { records: [...state.records] };

    historyManager.push({
      actionType: 'status_change',
      actionData: { id, status },
      previousState,
      description: `将「${record.label}」状态改为 ${status}`,
    });

    set((state) => ({
      records: state.records.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              updatedAt: new Date().toISOString(),
              score: calculateRecordScore({ ...r, status }),
            }
          : r
      ),
      lastSyncTime: new Date().toISOString(),
    }));
  },

  annotateRecord: (id, content, author) => {
    const state = get();
    const record = state.records.find((r) => r.id === id);
    if (!record) return;

    const previousState = { records: [...state.records] };

    const annotation: Annotation = {
      id: generateId(),
      recordId: id,
      content,
      author,
      createdAt: new Date().toISOString(),
    };

    historyManager.push({
      actionType: 'annotate',
      actionData: { id, annotation },
      previousState,
      description: `为「${record.label}」添加备注`,
    });

    set((state) => ({
      records: state.records.map((r) =>
        r.id === id
          ? {
              ...r,
              annotation,
              updatedAt: new Date().toISOString(),
              score: calculateRecordScore({ ...r, annotation }),
            }
          : r
      ),
      lastSyncTime: new Date().toISOString(),
    }));
  },

  addRecord: (recordData) => {
    const isFlipped = detectCoordinateFlip({
      xCoordinate: recordData.xCoordinate,
      yCoordinate: recordData.yCoordinate,
    });

    const newRecord: StationRecord = {
      ...recordData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFlipped,
      flipExplanation: isFlipped
        ? generateFlipExplanation({ ...recordData, isFlipped, id: '', createdAt: '', updatedAt: '' } as StationRecord)
        : undefined,
    };
    newRecord.score = calculateRecordScore(newRecord);

    set((state) => ({
      records: [...state.records, newRecord],
      lastSyncTime: new Date().toISOString(),
    }));
  },

  deleteRecord: (id) => {
    const state = get();
    const record = state.records.find((r) => r.id === id);
    if (!record) return;

    const previousState = { records: [...state.records] };

    historyManager.push({
      actionType: 'delete',
      actionData: { id },
      previousState,
      description: `删除「${record.label}」`,
    });

    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
      selectedRecordId: state.selectedRecordId === id ? null : state.selectedRecordId,
      lastSyncTime: new Date().toISOString(),
    }));
  },

  addDevice: (device) => {
    const newDevice: Device = {
      ...device,
      id: generateId(),
    };

    set((state) => ({
      devices: [...state.devices, newDevice],
      lastSyncTime: new Date().toISOString(),
    }));
  },

  updateDevice: (device) => {
    const state = get();
    const previousState = { devices: [...state.devices], records: [...state.records] };

    historyManager.push({
      actionType: 'device_update',
      actionData: { device },
      previousState,
      description: `更新设备「${device.name}」`,
    });

    set((state) => {
      const updatedDevices = state.devices.map((d) => (d.id === device.id ? device : d));

      const updatedRecords = state.records.map((record) => {
        if (record.deviceId === device.id && device.status === 'inactive') {
          const newAnnotation: Annotation = {
            id: generateId(),
            recordId: record.id,
            content: `设备「${device.name}」状态变更为停用，需重新确认该记录。`,
            author: '系统同步',
            createdAt: new Date().toISOString(),
          };
          return {
            ...record,
            status: 'pending' as const,
            annotation: newAnnotation,
            updatedAt: new Date().toISOString(),
            score: calculateRecordScore({
              ...record,
              status: 'pending',
              annotation: newAnnotation,
            }),
          };
        }
        return record;
      });

      return {
        devices: updatedDevices,
        records: updatedRecords,
        lastSyncTime: new Date().toISOString(),
      };
    });
  },

  assignDeviceToRecord: (recordId, deviceId) => {
    set((state) => ({
      records: state.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              deviceId,
              updatedAt: new Date().toISOString(),
              score: calculateRecordScore({ ...r, deviceId }),
            }
          : r
      ),
      lastSyncTime: new Date().toISOString(),
    }));
  },

  setFilter: (options) =>
    set((state) => ({
      filterOptions: { ...state.filterOptions, ...options },
    })),

  getFilteredRecords: () => {
    const state = get();
    let result = [...state.records];

    if (state.filterOptions.status) {
      result = result.filter((r) => r.status === state.filterOptions.status);
    }
    if (state.filterOptions.type) {
      result = result.filter((r) => r.type === state.filterOptions.type);
    }
    if (state.filterOptions.isFlipped !== undefined) {
      result = result.filter((r) => r.isFlipped === state.filterOptions.isFlipped);
    }
    if (state.filterOptions.searchText) {
      const text = state.filterOptions.searchText.toLowerCase();
      result = result.filter(
        (r) =>
          r.label.toLowerCase().includes(text) ||
          r.annotation?.content.toLowerCase().includes(text)
      );
    }

    return result;
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),
  setOffset: (offset) => set({ offset }),

  undo: () => {
    const entry = historyManager.undo();
    if (!entry) return;

    if (entry.previousState.records) {
      set({
        records: entry.previousState.records,
        undoCount: get().undoCount + 1,
        lastSyncTime: new Date().toISOString(),
      });
    }
    if (entry.previousState.devices) {
      set({ devices: entry.previousState.devices });
    }
  },

  redo: () => {
    const entry = historyManager.redo();
    if (!entry) return;

    // For redo, we need to re-apply the action
    const state = get();
    switch (entry.actionType) {
      case 'move': {
        const { id, x, y } = entry.actionData;
        const isFlipped = detectCoordinateFlip({ xCoordinate: x, yCoordinate: y });
        set({
          records: state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  xCoordinate: x,
                  yCoordinate: y,
                  isFlipped,
                  flipExplanation: isFlipped
                    ? generateFlipExplanation({ ...r, xCoordinate: x, yCoordinate: y, isFlipped })
                    : undefined,
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
          lastSyncTime: new Date().toISOString(),
        });
        break;
      }
      case 'status_change': {
        const { id, status } = entry.actionData;
        set({
          records: state.records.map((r) =>
            r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
          ),
          lastSyncTime: new Date().toISOString(),
        });
        break;
      }
      case 'annotate': {
        const { id, annotation } = entry.actionData;
        set({
          records: state.records.map((r) =>
            r.id === id ? { ...r, annotation, updatedAt: new Date().toISOString() } : r
          ),
          lastSyncTime: new Date().toISOString(),
        });
        break;
      }
      case 'delete': {
        const deleted = entry.previousState.records.find(
          (r: StationRecord) => r.id === entry.actionData.id
        );
        if (deleted) {
          set({
            records: [...state.records, deleted],
            lastSyncTime: new Date().toISOString(),
          });
        }
        break;
      }
    }
  },

  canUndo: () => historyManager.canUndo(),
  canRedo: () => historyManager.canRedo(),

  resetToSample: () => {
    const fresh = initializeSampleData();
    historyManager.clear();
    set({
      records: fresh.records,
      devices: fresh.devices,
      selectedRecordId: null,
      zoom: 1,
      offset: { x: 0, y: 0 },
      undoCount: 0,
      lastSyncTime: new Date().toISOString(),
    });
  },
}));
