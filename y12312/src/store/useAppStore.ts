import { create } from 'zustand';
import {
  Batch,
  AudioFile,
  AudioFileType,
  AnalysisResult,
  ProblemRecord,
  ExportLog,
  FilterParams,
  FFTSpectrum,
  ViewState,
  FFTConfig,
  DEFAULT_FFT_CONFIG,
  FilterType,
} from '../types';
import { computeAverageSpectrum, magnitudeToDB } from '../utils/fft';
import { applyFrequencyDomainFilter, computeWaveformDifference } from '../utils/filters';
import { detectAllProblems } from '../utils/problemDetector';
import { generateMockBatch, generateMockBatchList } from '../mock/sampleData';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

type ViewTab = 'spectrum' | 'waveform' | 'problems' | 'export' | 'trace' | 'guide';

interface AppState {
  batches: Batch[];
  activeBatchId: string | null;
  audioFiles: Record<string, AudioFile>;
  analysisResults: Record<string, AnalysisResult>;
  problems: Record<string, ProblemRecord[]>;
  exportLogs: ExportLog[];
  isProcessing: boolean;
  processingProgress: number;

  filterParams: FilterParams;
  fftConfig: FFTConfig;

  viewState: ViewState;
  activeView: ViewTab;

  spectrumBefore: FFTSpectrum | null;
  spectrumAfter: FFTSpectrum | null;

  traceTarget: {
    resultId: string | null;
    view: 'fft' | 'filter' | 'waveform' | null;
  };

  activeBatch: Batch | null;
  originalFile: AudioFile | null;
  processedFile: AudioFile | null;
  analysisResult: AnalysisResult | null;
}

interface AppActions {
  initializeWithMockData: () => void;
  setActiveBatch: (batchId: string | null) => void;
  setActiveView: (view: ViewTab) => void;
  addAudioFile: (file: Partial<AudioFile> & { name: string; sampleRate: number; channelData: Float32Array[]; sourceType: AudioFileType }) => void;
  updateFilterParams: (params: Partial<FilterParams>) => void;
  updateFFTConfig: (config: Partial<FFTConfig>) => void;
  updateViewState: (state: Partial<ViewState>) => void;

  analyzeAudio: () => Promise<void>;
  applyFilter: () => Promise<void>;

  runProblemDetection: () => void;

  setTraceTarget: (resultId: string | null, view: 'fft' | 'filter' | 'waveform' | null) => void;

  addExportLog: (log: ExportLog) => void;

  getActiveBatch: () => Batch | null;
  getActiveAudioFiles: () => AudioFile[];
  getActiveProblems: () => ProblemRecord[];
  getActiveAnalysisResult: () => AnalysisResult | null;
  getAnalysisResultByBatchId: (batchId: string) => AnalysisResult | null;

  createNewBatch: (name: string, sourceNote?: string, listenerNote?: string) => Batch;
}

function computeDerivedState(state: {
  activeBatchId: string | null;
  batches: Batch[];
  audioFiles: Record<string, AudioFile>;
  analysisResults: Record<string, AnalysisResult>;
}) {
  const activeBatch = state.batches.find(b => b.batchId === state.activeBatchId) || null;
  const activeFiles = state.activeBatchId
    ? Object.values(state.audioFiles).filter(f => f.batchId === state.activeBatchId)
    : [];
  const originalFile = activeFiles.find(f => f.type === 'original') || null;
  const processedFile = activeFiles.find(f => f.type === 'processed') || null;

  const analysisResult = Object.values(state.analysisResults).find(
    r => r.batchId === state.activeBatchId
  ) || null;

  const spectrumBefore = analysisResult?.spectrumBefore || null;
  const spectrumAfter = analysisResult?.spectrumAfter || null;

  return { activeBatch, originalFile, processedFile, analysisResult, spectrumBefore, spectrumAfter };
}

export const useAppStore = create<AppState & AppActions>((set, get) => {
  const mockData = generateMockBatch();
  const mockList = generateMockBatchList();

  const initialAudioFiles: Record<string, AudioFile> = {};
  mockData.audioFiles.forEach(f => {
    initialAudioFiles[f.fileId] = { ...f, sourceType: f.type };
  });

  const allBatches = [
    mockData.batch,
    ...mockList.slice(1).map(item => item.batch),
  ];

  const derived = computeDerivedState({
    activeBatchId: mockData.batch.batchId,
    batches: allBatches,
    audioFiles: initialAudioFiles,
    analysisResults: {
      [mockData.analysisResult.resultId]: mockData.analysisResult,
    },
  });

  const initialState: AppState = {
    batches: allBatches,
    activeBatchId: mockData.batch.batchId,
    audioFiles: initialAudioFiles,
    analysisResults: {
      [mockData.analysisResult.resultId]: mockData.analysisResult,
    },
    problems: {
      [mockData.batch.batchId]: mockData.problems,
    },
    exportLogs: [],
    isProcessing: false,
    processingProgress: 0,

    filterParams: mockData.filterParams,
    fftConfig: DEFAULT_FFT_CONFIG,

    viewState: {
      activeTab: 'workspace' as const,
      showOriginal: true,
      showProcessed: true,
      frequencyScale: 'log' as const,
      amplitudeScale: 'db' as const,
      zoomLevel: 1,
      scrollPosition: 0,
    },

    activeView: 'spectrum' as ViewTab,

    spectrumBefore: derived.spectrumBefore,
    spectrumAfter: derived.spectrumAfter,

    traceTarget: {
      resultId: null,
      view: null,
    },

    activeBatch: derived.activeBatch,
    originalFile: derived.originalFile,
    processedFile: derived.processedFile,
    analysisResult: derived.analysisResult,
  };

  const recalcDerived = (partial: Partial<AppState>): Partial<AppState> => {
    const merged = { ...get(), ...partial };
    const derived = computeDerivedState(merged);
    return { ...partial, ...derived };
  };

  return {
    ...initialState,

    initializeWithMockData: () => {
      const mock = generateMockBatch();
      set(recalcDerived({
        activeBatchId: mock.batch.batchId,
        batches: [mock.batch, ...get().batches.filter(b => b.batchId !== mock.batch.batchId)],
        audioFiles: {
          ...get().audioFiles,
          [mock.audioFiles[0].fileId]: { ...mock.audioFiles[0], sourceType: mock.audioFiles[0].type },
          [mock.audioFiles[1].fileId]: { ...mock.audioFiles[1], sourceType: mock.audioFiles[1].type },
        },
        analysisResults: {
          ...get().analysisResults,
          [mock.analysisResult.resultId]: mock.analysisResult,
        },
        problems: {
          ...get().problems,
          [mock.batch.batchId]: mock.problems,
        },
        filterParams: mock.filterParams,
      }));
    },

    setActiveBatch: (batchId) => {
      set(recalcDerived({ activeBatchId: batchId }));
    },

    setActiveView: (view) => {
      set({ activeView: view });
    },

    addAudioFile: (file) => {
      const state = get();
      const newFile: AudioFile = {
        fileId: generateId('audio'),
        batchId: state.activeBatchId || '',
        type: file.sourceType,
        sourceType: file.sourceType,
        name: file.name,
        sampleRate: file.sampleRate,
        bitDepth: file.bitDepth || 16,
        duration: file.duration || file.channelData[0].length / file.sampleRate,
        blobUrl: file.blobUrl || '',
        numberOfChannels: file.channelData.length,
        channelData: file.channelData,
      };
      set(recalcDerived({
        audioFiles: {
          ...state.audioFiles,
          [newFile.fileId]: newFile,
        },
      }));
    },

    updateFilterParams: (params) => {
      set(state => ({
        filterParams: {
          ...state.filterParams,
          ...params,
        },
      }));
    },

    updateFFTConfig: (config) => {
      set(state => ({
        fftConfig: {
          ...state.fftConfig,
          ...config,
        },
      }));
    },

    updateViewState: (vs) => {
      set(prev => ({
        viewState: {
          ...prev.viewState,
          ...vs,
        },
      }));
    },

    analyzeAudio: async () => {
      const state = get();
      const originalFile = state.originalFile;

      if (!originalFile) return;

      set({ isProcessing: true, processingProgress: 0 });

      await new Promise(resolve => setTimeout(resolve, 100));
      set({ processingProgress: 30 });

      const { fftSize, windowType, overlap } = state.fftConfig;
      const spectrum = computeAverageSpectrum(
        originalFile.channelData[0],
        fftSize,
        windowType,
        originalFile.sampleRate,
        overlap
      );

      const fftSpectrum: FFTSpectrum = {
        spectrumId: generateId('spec'),
        fileId: originalFile.fileId,
        batchId: originalFile.batchId,
        fftSize,
        windowType,
        frequencyData: spectrum.magnitude,
        timeData: originalFile.channelData[0],
        binFrequencies: spectrum.binFrequencies,
        sampleRate: originalFile.sampleRate,
      };

      const beforeDB = magnitudeToDB(fftSpectrum.frequencyData);
      let peakFreq = 0;
      let noiseFloor = -100;
      let snr = 0;
      {
        let maxMag = -Infinity;
        let maxIdx = 0;
        for (let i = 0; i < beforeDB.length; i++) {
          if (beforeDB[i] > maxMag) {
            maxMag = beforeDB[i];
            maxIdx = i;
          }
        }
        peakFreq = fftSpectrum.binFrequencies[maxIdx] || 0;
        const sorted = Array.from(beforeDB).sort((a, b) => a - b);
        const bottom10 = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.1)));
        noiseFloor = bottom10.reduce((s, v) => s + v, 0) / bottom10.length;
        snr = maxMag - noiseFloor;
      }

      const resultId = generateId('result');
      const analysisResult: AnalysisResult = {
        resultId,
        batchId: originalFile.batchId,
        originalFileId: originalFile.fileId,
        processedFileId: '',
        paramsId: '',
        spectrumBefore: fftSpectrum,
        spectrumAfter: state.spectrumAfter || fftSpectrum,
        waveformDiff: [],
        createdAt: Date.now(),
        analyzedAt: Date.now(),
        filteredAt: 0,
        fftSize,
        peakFrequency: peakFreq,
        noiseFloor,
        snr,
        snrImprovement: 0,
        problemCount: 0,
      };

      set({ processingProgress: 70 });
      await new Promise(resolve => setTimeout(resolve, 100));

      set(prev => recalcDerived({
        spectrumBefore: fftSpectrum,
        analysisResults: {
          ...prev.analysisResults,
          [resultId]: analysisResult,
        },
        processingProgress: 100,
      }));

      await new Promise(resolve => setTimeout(resolve, 200));
      set({ isProcessing: false, processingProgress: 0 });

      get().runProblemDetection();
    },

    applyFilter: async () => {
      const state = get();
      const originalFile = state.originalFile;

      if (!originalFile) return;

      set({ isProcessing: true, processingProgress: 0 });

      await new Promise(resolve => setTimeout(resolve, 100));
      set({ processingProgress: 25 });

      const { filterType, lowFreq, highFreq } = state.filterParams;
      const processedData = applyFrequencyDomainFilter(
        originalFile.channelData[0],
        filterType,
        lowFreq,
        highFreq,
        originalFile.sampleRate
      );

      set({ processingProgress: 50 });
      await new Promise(resolve => setTimeout(resolve, 100));

      const processedBlob = new Blob([processedData.buffer], { type: 'application/octet-stream' });
      const processedBlobUrl = URL.createObjectURL(processedBlob);

      const processedFile: AudioFile = {
        fileId: generateId('audio'),
        batchId: state.activeBatchId!,
        type: 'processed',
        sourceType: 'processed',
        name: originalFile.name.replace('.wav', '_filtered.wav'),
        sampleRate: originalFile.sampleRate,
        bitDepth: originalFile.bitDepth,
        duration: originalFile.duration,
        blobUrl: processedBlobUrl,
        numberOfChannels: originalFile.numberOfChannels,
        channelData: [processedData],
      };

      const { fftSize, windowType, overlap } = state.fftConfig;
      const afterSpectrum = computeAverageSpectrum(
        processedData,
        fftSize,
        windowType,
        originalFile.sampleRate,
        overlap
      );

      set({ processingProgress: 75 });

      const spectrumAfter: FFTSpectrum = {
        spectrumId: generateId('spec'),
        fileId: processedFile.fileId,
        batchId: originalFile.batchId,
        fftSize,
        windowType,
        frequencyData: afterSpectrum.magnitude,
        timeData: processedData,
        binFrequencies: afterSpectrum.binFrequencies,
        sampleRate: originalFile.sampleRate,
      };

      const resultId = generateId('result');
      const filterParams: FilterParams = {
        ...state.filterParams,
        resultId,
        paramsId: generateId('params'),
      };

      const beforeDB = state.spectrumBefore ? magnitudeToDB(state.spectrumBefore.frequencyData) : new Float32Array();
      let peakFreq = 0;
      let noiseFloor = -100;
      let snr = 0;

      if (state.spectrumBefore) {
        let maxMag = -Infinity;
        let maxIdx = 0;
        for (let i = 0; i < beforeDB.length; i++) {
          if (beforeDB[i] > maxMag) {
            maxMag = beforeDB[i];
            maxIdx = i;
          }
        }
        peakFreq = state.spectrumBefore.binFrequencies[maxIdx] || 0;

        const sorted = Array.from(beforeDB).sort((a, b) => a - b);
        const bottom10 = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.1)));
        noiseFloor = bottom10.reduce((s, v) => s + v, 0) / bottom10.length;
        snr = maxMag - noiseFloor;
      }

      const afterDB = magnitudeToDB(afterSpectrum.magnitude);
      let afterNoiseFloor = -100;
      {
        const sorted = Array.from(afterDB).sort((a, b) => a - b);
        const bottom10 = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.1)));
        afterNoiseFloor = bottom10.reduce((s, v) => s + v, 0) / bottom10.length;
      }

      const analysisResult: AnalysisResult = {
        resultId,
        batchId: state.activeBatchId!,
        originalFileId: originalFile.fileId,
        processedFileId: processedFile.fileId,
        paramsId: filterParams.paramsId,
        spectrumBefore: state.spectrumBefore!,
        spectrumAfter,
        waveformDiff: computeWaveformDifference(originalFile.channelData[0], processedData),
        createdAt: state.analysisResult?.createdAt || Date.now(),
        analyzedAt: state.analysisResult?.analyzedAt || Date.now(),
        filteredAt: Date.now(),
        fftSize,
        peakFrequency: peakFreq,
        noiseFloor,
        snr,
        snrImprovement: afterNoiseFloor - noiseFloor,
        problemCount: 0,
      };

      set({ processingProgress: 90 });
      await new Promise(resolve => setTimeout(resolve, 100));

      set(prev => recalcDerived({
        audioFiles: {
          ...prev.audioFiles,
          [processedFile.fileId]: processedFile,
        },
        spectrumAfter,
        filterParams,
        analysisResults: {
          ...prev.analysisResults,
          [resultId]: analysisResult,
        },
        processingProgress: 100,
      }));

      await new Promise(resolve => setTimeout(resolve, 200));
      set({ isProcessing: false, processingProgress: 0 });

      get().runProblemDetection();
    },

    runProblemDetection: () => {
      const state = get();
      const activeFiles = state.getActiveAudioFiles();

      const detectedProblems = detectAllProblems(
        activeFiles,
        state.spectrumBefore || undefined,
        state.spectrumAfter || undefined
      );

      if (state.activeBatchId) {
        const existingProblems = state.problems[state.activeBatchId] || [];
        const newProblems = detectedProblems.filter(
          p => !existingProblems.some(ep => ep.type === p.type)
        );

        if (newProblems.length > 0 || existingProblems.length !== detectedProblems.length) {
          set(prev => recalcDerived({
            problems: {
              ...prev.problems,
              [state.activeBatchId!]: [...existingProblems, ...newProblems],
            },
            batches: prev.batches.map(b =>
              b.batchId === state.activeBatchId
                ? { ...b, status: 'has_issues' as const }
                : b
            ),
          }));
        }
      }
    },

    setTraceTarget: (resultId, view) => {
      set({
        traceTarget: {
          resultId,
          view,
        },
      });

      if (resultId) {
        const result = get().analysisResults[resultId];
        if (result) {
          set(recalcDerived({
            activeBatchId: result.batchId,
            spectrumBefore: result.spectrumBefore,
            spectrumAfter: result.spectrumAfter,
            viewState: {
              ...get().viewState,
              activeTab: 'workspace',
            },
          }));
        }
      }
    },

    addExportLog: (log) => {
      set(state => ({
        exportLogs: [...state.exportLogs, log],
      }));
    },

    getActiveBatch: () => {
      const state = get();
      return state.batches.find(b => b.batchId === state.activeBatchId) || null;
    },

    getActiveAudioFiles: () => {
      const state = get();
      if (!state.activeBatchId) return [];
      return Object.values(state.audioFiles).filter(
        f => f.batchId === state.activeBatchId
      );
    },

    getActiveProblems: () => {
      const state = get();
      if (!state.activeBatchId) return [];
      return state.problems[state.activeBatchId] || [];
    },

    getActiveAnalysisResult: () => {
      return get().analysisResult;
    },

    getAnalysisResultByBatchId: (batchId: string) => {
      return Object.values(get().analysisResults).find(r => r.batchId === batchId) || null;
    },

    createNewBatch: (name, sourceNote = '', listenerNote = '') => {
      const newBatch: Batch = {
        batchId: generateId('batch'),
        name,
        sourceNote,
        listenerNote,
        createdAt: Date.now(),
        status: 'pending',
      };

      set(prev => recalcDerived({
        batches: [newBatch, ...prev.batches],
        activeBatchId: newBatch.batchId,
        spectrumBefore: null,
        spectrumAfter: null,
      }));

      return newBatch;
    },
  };
});
