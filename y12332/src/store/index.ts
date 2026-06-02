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
  CompareConfig,
  PlaybackConfig,
  GroupByType,
  TimePeriod,
} from '@/types';
import { generateId, addHours } from '@/utils/helpers';
import { generateMockDataBatch, generateProcessedData } from '@/utils/mockData';
import { runFullDetection } from '@/utils/anomalyDetector';
import { ReportGenerator } from '@/utils/reportGenerator';
import { ParsedData } from '@/utils/fileParser';

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
  compareConfig: CompareConfig;
  playbackConfig: PlaybackConfig | null;

  setCurrentBatch: (batchId: string) => void;
  loadMockData: () => void;
  runDetection: () => void;
  selectTimeRange: (range: TimeRange) => void;
  toggleSensor: (sensorId: string) => void;
  setPlaybackState: (state: Partial<PlaybackState>) => void;
  importFiles: (files: SourceFile[], parsedData: ParsedData) => Promise<void>;
  generateReport: (options: ReportOptions) => void;
  downloadReport: (format: 'pdf' | 'excel') => void;
  logProcessing: (action: string, details: Record<string, unknown>) => void;
  clearError: () => void;
  setCompareConfig: (config: Partial<CompareConfig>) => void;
  setPlaybackConfig: (config: Partial<PlaybackConfig>) => void;
  resetCompareConfig: () => void;
}

const initialPlaybackState: PlaybackState = {
  isPlaying: false,
  currentTime: new Date(),
  speed: 1,
};

const initialCompareConfig: CompareConfig = {
  groupBy: 'sensor',
  selectedGroups: [],
  timePeriod: 'all',
  selectedSensors: [],
  comparisonMetrics: {
    meanTemp: true,
    stdDev: true,
    anomalyRate: true,
    minMax: true,
  },
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
  compareConfig: initialCompareConfig,
  playbackConfig: null,

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

  importFiles: async (files: SourceFile[], parsedData: ParsedData) => {
    set({ isLoading: true, error: null });

    try {
      const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
      const newBatch: DataBatch = {
        batchId,
        name: `导入批次_${new Date().toLocaleDateString('zh-CN')}`,
        importedAt: new Date(),
        importedBy: '当前用户',
        sourceFiles: files,
        completeness: parsedData.completeness,
        status: 'completed',
      };

      const temperatureDataWithBatch = parsedData.temperatureData.map((r) => ({
        ...r,
        batchId,
      }));
      const processedDataWithBatch = generateProcessedData(parsedData.temperatureData).map(
        (r) => ({ ...r, batchId })
      );
      const cargoBatchesWithBatch = parsedData.cargoBatches.map((c) => ({
        ...c,
        batchId,
      }));
      const maintenanceNotesWithBatch = parsedData.maintenanceNotes.map((m) => ({
        ...m,
        batchId,
      }));

      const timestamps = temperatureDataWithBatch.map((t) => new Date(t.timestamp).getTime());
      const minTime = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
      const maxTime = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();

      set((state) => ({
        batches: [...state.batches, newBatch],
        currentBatchId: batchId,
        temperatureData: temperatureDataWithBatch,
        processedData: processedDataWithBatch,
        cargoBatches: cargoBatchesWithBatch,
        maintenanceNotes: maintenanceNotesWithBatch,
        sensors: parsedData.sensors,
        selectedSensors: parsedData.sensors.map((s) => s.sensorId),
        selectedTimeRange: {
          start: minTime,
          end: maxTime,
        },
        isLoading: false,
      }));

      get().runDetection();
      get().logProcessing('导入数据文件', {
        batchId,
        fileCount: files.length,
        files: files.map((f) => f.fileName),
        temperatureCount: temperatureDataWithBatch.length,
        cargoCount: cargoBatchesWithBatch.length,
        maintenanceCount: maintenanceNotesWithBatch.length,
        completeness: parsedData.completeness,
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
        sensors,
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

  setCompareConfig: (config: Partial<CompareConfig>) => {
    set((state) => ({
      compareConfig: { ...state.compareConfig, ...config },
    }));
  },

  setPlaybackConfig: (config: Partial<PlaybackConfig>) => {
    set((state) => ({
      playbackConfig: state.playbackConfig
        ? { ...state.playbackConfig, ...config }
        : (config as PlaybackConfig),
    }));
  },

  resetCompareConfig: () => {
    set({
      compareConfig: { ...initialCompareConfig },
    });
  },
}));
