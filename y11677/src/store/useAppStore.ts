import { create } from 'zustand';
import type { GyroFrame, Anomaly, CorrectionRecord, PanelType, AppState } from '../types';
import { detectAnomalies } from '../utils/anomalyDetector';
import { generateMockGyroData, generateCalibratedData } from '../utils/mockData';
import { normalizeQuaternion } from '../utils/quaternion';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const initialFrames = generateMockGyroData(300);
const initialAnomalies = detectAnomalies(initialFrames);

interface AppStore extends AppState {
  setFrames: (frames: GyroFrame[]) => void;
  setCurrentFrameIndex: (index: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSelectedTimeRange: (range: [number, number] | null) => void;
  setActivePanel: (panel: PanelType) => void;
  setSelectedAnomalyId: (id: string | null) => void;
  setShowGrid: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  setCameraAutoRotate: (autoRotate: boolean) => void;
  nextFrame: () => void;
  prevFrame: () => void;
  correctAnomaly: (anomalyId: string, note?: string) => void;
  applyCalibration: () => void;
  resetData: () => void;
  loadMockData: () => void;
  importData: (data: GyroFrame[]) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  frames: initialFrames,
  anomalies: initialAnomalies,
  corrections: [],
  currentFrameIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  selectedTimeRange: null,
  activePanel: 'details',
  selectedAnomalyId: null,
  showGrid: true,
  showAxes: true,
  cameraAutoRotate: false,
  calibratedFrames: undefined,

  setFrames: (frames: GyroFrame[]) => {
    const anomalies = detectAnomalies(frames);
    set({ frames, anomalies, currentFrameIndex: 0, calibratedFrames: undefined });
  },

  setCurrentFrameIndex: (index: number) => {
    const { frames } = get();
    const clampedIndex = Math.max(0, Math.min(frames.length - 1, index));
    set({ currentFrameIndex: clampedIndex });
  },

  setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),

  setPlaybackSpeed: (playbackSpeed: number) => set({ playbackSpeed }),

  setSelectedTimeRange: (selectedTimeRange: [number, number] | null) => set({ selectedTimeRange }),

  setActivePanel: (activePanel: PanelType) => set({ activePanel }),

  setSelectedAnomalyId: (selectedAnomalyId: string | null) => set({ selectedAnomalyId }),

  setShowGrid: (showGrid: boolean) => set({ showGrid }),

  setShowAxes: (showAxes: boolean) => set({ showAxes }),

  setCameraAutoRotate: (cameraAutoRotate: boolean) => set({ cameraAutoRotate }),

  nextFrame: () => {
    const { currentFrameIndex, frames } = get();
    const nextIndex = Math.min(currentFrameIndex + 1, frames.length - 1);
    set({ currentFrameIndex: nextIndex });
  },

  prevFrame: () => {
    const { currentFrameIndex } = get();
    const prevIndex = Math.max(currentFrameIndex - 1, 0);
    set({ currentFrameIndex: prevIndex });
  },

  correctAnomaly: (anomalyId: string, note?: string) => {
    const { anomalies, frames, corrections } = get();
    const anomaly = anomalies.find(a => a.id === anomalyId);
    if (!anomaly) return;

    const frame = frames[anomaly.frameIndex];
    if (!frame) return;

    let correctedValue: unknown;
    let correctionType = '';

    if (anomaly.type === 'quaternion_not_normalized') {
      correctedValue = normalizeQuaternion(frame.quaternion);
      correctionType = '四元数归一化';
    } else if (anomaly.type === 'timestamp_out_of_order') {
      const prevFrame = frames[anomaly.frameIndex - 1];
      correctedValue = prevFrame ? prevFrame.timestamp + 50 : frame.timestamp;
      correctionType = '时间戳修正';
    } else {
      correctedValue = frame.quaternion;
      correctionType = '标记修正';
    }

    const correction: CorrectionRecord = {
      id: generateId(),
      anomalyId,
      type: correctionType,
      originalValue: anomaly.details || frame,
      correctedValue,
      operator: '系统自动修正',
      timestamp: Date.now(),
      note,
    };

    const updatedFrames = [...frames];
    if (anomaly.type === 'quaternion_not_normalized') {
      updatedFrames[anomaly.frameIndex] = {
        ...frame,
        quaternion: correctedValue as [number, number, number, number],
        calibrationNote: note || '自动校准: 四元数归一化',
      };
    }

    const updatedAnomalies = anomalies.map(a =>
      a.id === anomalyId ? { ...a, correction } : a
    );

    set({
      frames: updatedFrames,
      anomalies: updatedAnomalies,
      corrections: [...corrections, correction],
    });
  },

  applyCalibration: () => {
    const { frames } = get();
    const calibrated = generateCalibratedData(frames);
    const calibratedAnomalies = detectAnomalies(calibrated);

    const calibrationCorrections: CorrectionRecord[] = frames.map((frame, index) => ({
      id: generateId(),
      anomalyId: `calib_${index}`,
      type: '全局校准',
      originalValue: frame.quaternion,
      correctedValue: calibrated[index].quaternion,
      operator: '全局校准',
      timestamp: Date.now(),
      note: '应用全局校准: 四元数归一化',
    }));

    set({
      calibratedFrames: calibrated,
      anomalies: calibratedAnomalies,
      corrections: calibrationCorrections,
    });
  },

  resetData: () => {
    const frames = generateMockGyroData(300);
    const anomalies = detectAnomalies(frames);
    set({
      frames,
      anomalies,
      corrections: [],
      currentFrameIndex: 0,
      isPlaying: false,
      calibratedFrames: undefined,
    });
  },

  loadMockData: () => {
    const frames = generateMockGyroData(300);
    const anomalies = detectAnomalies(frames);
    set({
      frames,
      anomalies,
      corrections: [],
      currentFrameIndex: 0,
      isPlaying: false,
      calibratedFrames: undefined,
    });
  },

  importData: (data: GyroFrame[]) => {
    const anomalies = detectAnomalies(data);
    set({
      frames: data,
      anomalies,
      corrections: [],
      currentFrameIndex: 0,
      isPlaying: false,
      calibratedFrames: undefined,
    });
  },
}));
