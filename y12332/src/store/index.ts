import { create } from 'zustand';
import {
  DataBatch,
  TemperatureReading,
  CargoBatch,
  MaintenanceNote,
  AnomalyEvent,
  DiagnosisResult,
  ProcessingLog,
  SensorInfo,
  PlaybackState,
  TimeRange,
  ReportOptions,
  ReportData,
  SourceFile,
} from '@/types';
import { generateId, addHours } from '@/utils/helpers';
import { generateMockDataBatch, generateProcessedData } from '@/utils/mockData';
import { runFullDetection } from '@/utils/anomalyDetector';
import { ReportGenerator } from '@/utils/reportGenerator';

interface AppState {
  currentBatchId: string | null;
  batches: DataBatch[];
  temperatureData: TemperatureReading[];
  processedData: TemperatureReading[];
  cargoBatches: CargoBatch[];
  maintenanceNotes: MaintenanceNote[];
  anomalies: AnomalyEvent[];
  diagnoses: DiagnosisResult[];
  processingLogs: ProcessingLog[];
  sensors: SensorInfo[];
  selectedTimeRange: TimeRange | null;
  selectedSensors: string[];
  playbackState: PlaybackState;
  currentReport: ReportData | null;
  isLoading: boolean;
  error: string | null;

  setCurrentBatch: (batchId: string) => void;
  loadMockData: () => void;
  runDetection: () => void;
  selectTimeRange: (range: TimeRange) => void;
  toggleSensor: (sensorId: string) => void;
  setPlaybackState: (state: Partial<PlaybackState>) => void;
  importFiles: (files: SourceFile[]) => Promise<void>;
  generateReport: (options: ReportOptions) => void;
  downloadReport: (format: 'pdf' | 'excel') => void;
  logProcessing: (action: string, details: Record<string, unknown>) => void;
  clearError: () => void;
}

const initialPlaybackState: PlaybackState = {
  isPlaying: false,
  currentTime: new Date(),
  speed: 1,
};

export const useAppStore = create<AppState>((set, get) => ({
  currentBatchId: null,
  batches: [],
  temperatureData: [],
  processedData: [],
  cargoBatches: [],
  maintenanceNotes: [],
  anomalies: [],
  diagnoses: [],
  processingLogs: [],
  sensors: [],
  selectedTimeRange: null,
  selectedSensors: [],
  playbackState: initialPlaybackState,
  currentReport: null,
  isLoading: false,
  error: null,

  setCurrentBatch: (batchId: string) => {
    const { batches } = get();
    const batch = batches.find((b) => b.batchId === batchId);

    if (!batch) {
      set({ error: `未找到数据批次: ${batchId}` });
      return;
    }

    set({
      currentBatchId: batchId,
      selectedSensors: [],
      selectedTimeRange: null,
      playbackState: {
        ...initialPlaybackState,
        currentTime: batch.importedAt,
      },
    });

    get().logProcessing('切换数据批次', { batchId, batchName: batch.name });
  },

  loadMockData: () => {
    set({ isLoading: true, error: null });

    try {
      const mockData = generateMockDataBatch();
      const processedData = generateProcessedData(mockData.readings);

      set({
        currentBatchId: mockData.batch.batchId,
        batches: [mockData.batch],
        temperatureData: mockData.readings,
        processedData,
        cargoBatches: mockData.cargoBatches,
        maintenanceNotes: mockData.maintenanceNotes,
        sensors: mockData.sensors,
        selectedSensors: mockData.sensors.map((s) => s.sensorId),
        selectedTimeRange: {
          start: addHours(new Date(), -48),
          end: new Date(),
        },
        playbackState: {
          ...initialPlaybackState,
          currentTime: mockData.batch.importedAt,
        },
      });

      get().runDetection();
      get().logProcessing('加载模拟数据', {
        batchId: mockData.batch.batchId,
        readingCount: mockData.readings.length,
        anomalyCount: get().anomalies.length,
      });

      set({ isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载模拟数据失败',
        isLoading: false,
      });
    }
  },

  runDetection: () => {
    const { currentBatchId, temperatureData, maintenanceNotes, cargoBatches } = get();

    if (!currentBatchId || temperatureData.length === 0) {
      set({ error: '请先加载数据' });
      return;
    }

    set({ isLoading: true });

    try {
      const { anomalies, diagnoses } = runFullDetection(
        currentBatchId,
        temperatureData,
        maintenanceNotes,
        cargoBatches
      );

      set({
        anomalies,
        diagnoses,
        isLoading: false,
      });

      get().logProcessing('执行异常检测', {
        anomalyCount: anomalies.length,
        criticalCount: anomalies.filter((a) => a.severity === 'critical').length,
        highCount: anomalies.filter((a) => a.severity === 'high').length,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '异常检测失败',
        isLoading: false,
      });
    }
  },

  selectTimeRange: (range: TimeRange) => {
    set({ selectedTimeRange: range });
  },

  toggleSensor: (sensorId: string) => {
    const { selectedSensors } = get();
    const isSelected = selectedSensors.includes(sensorId);

    set({
      selectedSensors: isSelected
        ? selectedSensors.filter((id) => id !== sensorId)
        : [...selectedSensors, sensorId],
    });
  },

  setPlaybackState: (state: Partial<PlaybackState>) => {
    set((prev) => ({
      playbackState: { ...prev.playbackState, ...state },
    }));
  },

  importFiles: async (files: SourceFile[]) => {
    set({ isLoading: true, error: null });

    try {
      const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
      const newBatch: DataBatch = {
        batchId,
        name: `导入批次_${new Date().toLocaleDateString('zh-CN')}`,
        importedAt: new Date(),
        importedBy: '当前用户',
        sourceFiles: files,
        completeness: 100,
        status: 'completed',
      };

      const mockData = generateMockDataBatch();

      set((state) => ({
        batches: [...state.batches, newBatch],
        currentBatchId: batchId,
        temperatureData: mockData.readings.map((r) => ({ ...r, batchId })),
        processedData: generateProcessedData(mockData.readings).map((r) => ({ ...r, batchId })),
        cargoBatches: mockData.cargoBatches.map((c) => ({ ...c, batchId })),
        maintenanceNotes: mockData.maintenanceNotes.map((m) => ({ ...m, batchId })),
        sensors: mockData.sensors,
        selectedSensors: mockData.sensors.map((s) => s.sensorId),
        selectedTimeRange: {
          start: addHours(new Date(), -48),
          end: new Date(),
        },
        isLoading: false,
      }));

      get().runDetection();
      get().logProcessing('导入数据文件', {
        batchId,
        fileCount: files.length,
        files: files.map((f) => f.fileName),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '文件导入失败',
        isLoading: false,
      });
    }
  },

  generateReport: (options: ReportOptions) => {
    const {
      batches,
      currentBatchId,
      anomalies,
      diagnoses,
      temperatureData,
      cargoBatches,
      maintenanceNotes,
    } = get();

    if (!currentBatchId) {
      set({ error: '请先选择数据批次' });
      return;
    }

    const batch = batches.find((b) => b.batchId === currentBatchId);
    if (!batch) {
      set({ error: '未找到数据批次' });
      return;
    }

    try {
      const report = ReportGenerator.generateReport(
        batch,
        anomalies,
        diagnoses,
        temperatureData,
        cargoBatches,
        maintenanceNotes,
        options
      );

      set({ currentReport: report });
      get().logProcessing('生成检测报告', {
        batchId: currentBatchId,
        includeRawData: options.includeRawData,
        includeAnomalyDetails: options.includeAnomalyDetails,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '生成报告失败',
      });
    }
  },

  downloadReport: (format: 'pdf' | 'excel') => {
    const { currentReport, batches, currentBatchId } = get();

    if (!currentReport) {
      set({ error: '请先生成报告' });
      return;
    }

    const batch = batches.find((b) => b.batchId === currentBatchId);
    if (!batch) {
      set({ error: '未找到数据批次' });
      return;
    }

    try {
      ReportGenerator.downloadReport(currentReport, format, batch.name);
      get().logProcessing('下载检测报告', {
        batchId: currentBatchId,
        format,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '下载报告失败',
      });
    }
  },

  logProcessing: (action: string, details: Record<string, unknown>) => {
    const { currentBatchId } = get();

    const log: ProcessingLog = {
      id: generateId(),
      batchId: currentBatchId || 'system',
      action,
      timestamp: new Date(),
      operator: '当前用户',
      details,
    };

    set((state) => ({
      processingLogs: [...state.processingLogs, log],
    }));
  },

  clearError: () => {
    set({ error: null });
  },
}));
