import { create } from 'zustand';
import type {
  BatchRecord,
  Command,
  CommandType,
  Device,
  Layer,
  ReportData,
  CanvasState,
} from '@/types';
import { generateId, generateRunId, getDeviceTypeLabel } from '@/utils/helpers';
import { loadBatchRecord, saveBatchRecord } from '@/utils/storage';
import { mockDevices, mockLayers, mockOperator } from '@/utils/mockData';
import { CoordinateFlipDetector } from '@/services/coordinateDetector';
import { ExportService } from '@/services/exportService';

interface BatchStore {
  currentBatch: BatchRecord;
  devices: Device[];
  layers: Layer[];
  canvasState: CanvasState;
  operator: string;
  highlightedCommandId: string | null;
  executeCommand: <T>(params: {
    type: CommandType;
    description: string;
    payload: T;
    getPreviousState: () => T;
    applyState: (payload: T) => void;
  }) => void;
  undo: () => void;
  redo: () => void;
  importDevices: (newDevices: Device[]) => void;
  getReport: () => ReportData;
  setCanvasState: (state: Partial<CanvasState>) => void;
  toggleLayer: (layerId: string) => void;
  setFilter: (layerId: string, filter: Layer['filter'] | undefined) => void;
  setHighlightedCommand: (id: string | null) => void;
  confirmCoordinateFlip: (deviceId: string) => void;
  resetBatch: () => void;
}

const createInitialBatch = (): BatchRecord => {
  const saved = loadBatchRecord();
  if (saved) {
    return saved;
  }
  return {
    id: generateId(),
    runId: generateRunId(),
    commands: [],
    currentIndex: -1,
    createdAt: Date.now(),
    operator: mockOperator,
  };
};

const applyCommandsToState = (commands: Command[], currentIndex: number): Device[] => {
  let devices = [...mockDevices];

  for (let i = 0; i <= currentIndex && i < commands.length; i++) {
    const cmd = commands[i];
    const payload = cmd.payload as Record<string, unknown>;

    switch (cmd.type) {
      case 'device_import': {
        const imported = payload.devices as Device[];
        devices = CoordinateFlipDetector.deduplicateDevices(imported, devices);
        break;
      }
      case 'device_drag': {
        const { deviceId, newX, newY } = payload as {
          deviceId: string;
          newX: number;
          newY: number;
        };
        devices = devices.map((d) =>
          d.id === deviceId ? { ...d, x: newX, y: newY } : d
        );
        break;
      }
      case 'annotation_add': {
        const { deviceId, annotation } = payload as {
          deviceId: string;
          annotation: Device['annotations'][number];
        };
        devices = devices.map((d) =>
          d.id === deviceId
            ? { ...d, annotations: [...d.annotations, { ...annotation, deviceId }] }
            : d
        );
        break;
      }
      case 'annotation_edit': {
        const { deviceId, annotationId, annotation } = payload as {
          deviceId: string;
          annotationId: string;
          annotation: Partial<Device['annotations'][number]>;
        };
        devices = devices.map((d) =>
          d.id === deviceId
            ? {
                ...d,
                annotations: d.annotations.map((a) =>
                  a.id === annotationId ? { ...a, ...annotation } : a
                ),
              }
            : d
        );
        break;
      }
      case 'annotation_delete': {
        const { deviceId, annotationId } = payload as {
          deviceId: string;
          annotationId: string;
        };
        devices = devices.map((d) =>
          d.id === deviceId
            ? { ...d, annotations: d.annotations.filter((a) => a.id !== annotationId) }
            : d
        );
        break;
      }
      case 'device_delete': {
        const { deviceId } = payload as { deviceId: string };
        devices = devices.filter((d) => d.id !== deviceId);
        break;
      }
      case 'coordinate_correction': {
        const { deviceId, correctedX, correctedY } = payload as {
          deviceId: string;
          correctedX: number;
          correctedY: number;
        };
        devices = devices.map((d) =>
          d.id === deviceId
            ? {
                ...d,
                x: correctedX,
                y: correctedY,
                coordinateFlip: d.coordinateFlip
                  ? { ...d.coordinateFlip, userConfirmed: true }
                  : undefined,
              }
            : d
        );
        break;
      }
    }
  }

  return devices;
};

export const useBatchStore = create<BatchStore>((set, get) => {
  const initialBatch = createInitialBatch();
  const initialDevices = applyCommandsToState(
    initialBatch.commands,
    initialBatch.currentIndex
  );

  return {
    currentBatch: initialBatch,
    devices: initialDevices,
    layers: [...mockLayers],
    canvasState: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      selectedDeviceId: null,
      selectedAnnotationId: null,
    },
    operator: mockOperator,
    highlightedCommandId: null,

    executeCommand: ({ type, description, payload, getPreviousState, applyState }) => {
      const { currentBatch, operator } = get();
      const previousState = getPreviousState();

      const command: Command = {
        id: generateId(),
        type,
        timestamp: Date.now(),
        operator,
        description,
        payload,
        previousState,
      };

      const newCommands = currentBatch.commands.slice(0, currentBatch.currentIndex + 1);
      newCommands.push(command);

      const newBatch = {
        ...currentBatch,
        commands: newCommands,
        currentIndex: newCommands.length - 1,
      };

      applyState(payload);

      set({ currentBatch: newBatch });
      saveBatchRecord(newBatch);

      const devices = applyCommandsToState(newCommands, newCommands.length - 1);
      set({ devices });
    },

    undo: () => {
      const { currentBatch } = get();
      if (currentBatch.currentIndex < 0) return;

      const newIndex = currentBatch.currentIndex - 1;
      const newBatch = { ...currentBatch, currentIndex: newIndex };

      set({ currentBatch: newBatch });
      saveBatchRecord(newBatch);

      const devices = applyCommandsToState(newBatch.commands, newIndex);
      set({ devices });

      const cmd = currentBatch.commands[currentBatch.currentIndex];
      set({ highlightedCommandId: cmd.id });
      setTimeout(() => set({ highlightedCommandId: null }), 1500);
    },

    redo: () => {
      const { currentBatch } = get();
      if (currentBatch.currentIndex >= currentBatch.commands.length - 1) return;

      const newIndex = currentBatch.currentIndex + 1;
      const newBatch = { ...currentBatch, currentIndex: newIndex };

      set({ currentBatch: newBatch });
      saveBatchRecord(newBatch);

      const devices = applyCommandsToState(newBatch.commands, newIndex);
      set({ devices });

      const cmd = currentBatch.commands[newIndex];
      set({ highlightedCommandId: cmd.id });
      setTimeout(() => set({ highlightedCommandId: null }), 1500);
    },

    importDevices: (newDevices) => {
      const { devices: existingDevices, executeCommand } = get();
      const { devices: processed, issues } = CoordinateFlipDetector.processDevices(newDevices);

      let description = `导入${processed.length}个设备`;
      if (issues.length > 0) {
        description += `，检测到${issues.length}个坐标异常并自动修正`;
      }

      const deduped = CoordinateFlipDetector.deduplicateDevices(processed, existingDevices);

      executeCommand({
        type: 'device_import',
        description,
        payload: { devices: deduped, issues },
        getPreviousState: () => ({ devices: existingDevices, issues: [] }),
        applyState: () => {},
      });
    },

    getReport: () => {
      const { currentBatch, devices } = get();
      return ExportService.generateReportData(currentBatch, devices);
    },

    setCanvasState: (state) => {
      set((prev) => ({
        canvasState: { ...prev.canvasState, ...state },
      }));
    },

    toggleLayer: (layerId) => {
      const { layers, executeCommand } = get();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      executeCommand({
        type: 'layer_toggle',
        description: `${layer.visible ? '隐藏' : '显示'}图层：${layer.name}`,
        payload: { layerId, visible: !layer.visible },
        getPreviousState: () => ({ layerId, visible: layer.visible }),
        applyState: (payload) => {
          set((prev) => ({
            layers: prev.layers.map((l) =>
              l.id === layerId ? { ...l, visible: (payload as { visible: boolean }).visible } : l
            ),
          }));
        },
      });
    },

    setFilter: (layerId, filter) => {
      const { layers, executeCommand } = get();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      const desc = filter
        ? `设置筛选：${filter.field} ${filter.operator} ${filter.value}`
        : `清除图层筛选`;

      executeCommand({
        type: 'filter_apply',
        description: desc,
        payload: { layerId, filter },
        getPreviousState: () => ({ layerId, filter: layer.filter }),
        applyState: (payload) => {
          set((prev) => ({
            layers: prev.layers.map((l) =>
              l.id === layerId ? { ...l, filter: (payload as { filter: Layer['filter'] }).filter } : l
            ),
          }));
        },
      });
    },

    setHighlightedCommand: (id) => {
      set({ highlightedCommandId: id });
    },

    confirmCoordinateFlip: (deviceId) => {
      const { devices, executeCommand } = get();
      const device = devices.find((d) => d.id === deviceId);
      if (!device || !device.coordinateFlip) return;

      executeCommand({
        type: 'coordinate_correction',
        description: `确认${device.name}坐标修正：${device.coordinateFlip.reason}`,
        payload: {
          deviceId,
          correctedX: device.coordinateFlip.correctedX,
          correctedY: device.coordinateFlip.correctedY,
          reason: device.coordinateFlip.reason,
        },
        getPreviousState: () => ({
          deviceId,
          correctedX: device.x,
          correctedY: device.y,
          reason: '',
        }),
        applyState: () => {},
      });
    },

    resetBatch: () => {
      const newBatch: BatchRecord = {
        id: generateId(),
        runId: generateRunId(),
        commands: [],
        currentIndex: -1,
        createdAt: Date.now(),
        operator: mockOperator,
      };

      set({
        currentBatch: newBatch,
        devices: [...mockDevices],
        layers: [...mockLayers],
      });
      saveBatchRecord(newBatch);
    },
  };
});
