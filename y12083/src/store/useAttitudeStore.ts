import { create } from 'zustand';
import {
  AttitudeData,
  AttitudeFrame,
  EulerAngles,
  GimbalLockState,
  AttitudeWarning,
  DataQuality,
  PlaybackState,
  KeyframeMarker,
} from '../types';
import { detectGimbalLock } from '../engine/gimbalLockDetector';
import { validateAllFrames, fillMissingFields } from '../engine/dataValidator';
import { generateId } from '../utils/math';

interface AttitudeStore {
  attitudeData: AttitudeData | null;
  validatedFrames: AttitudeFrame[];
  allWarnings: AttitudeWarning[][];
  overallQuality: DataQuality | null;
  currentAngles: EulerAngles;
  gimbalLockState: GimbalLockState;
  currentWarnings: AttitudeWarning[];
  playbackState: PlaybackState;
  keyframeMarkers: KeyframeMarker[];
  isPanelCollapsed: boolean;
  selectedWarningId: string | null;

  setAttitudeData: (data: AttitudeData) => void;
  setCurrentAngles: (angles: Partial<EulerAngles>) => void;
  setPlaybackState: (state: Partial<PlaybackState>) => void;
  nextFrame: () => void;
  prevFrame: () => void;
  goToFrame: (frameIndex: number) => void;
  togglePlay: () => void;
  togglePanel: () => void;
  setSelectedWarningId: (id: string | null) => void;
  resetToDefault: () => void;
}

const defaultAngles: EulerAngles = {
  pitch: 0,
  yaw: 0,
  roll: 0,
};

const defaultGimbalLockState: GimbalLockState = {
  isLocked: false,
  lockAngle: 0,
  lockedAxis: 'pitch',
  severity: 0,
};

const defaultPlaybackState: PlaybackState = {
  isPlaying: false,
  currentFrame: 0,
  totalFrames: 0,
  speed: 1,
  currentTime: 0,
};

export const useAttitudeStore = create<AttitudeStore>((set, get) => ({
  attitudeData: null,
  validatedFrames: [],
  allWarnings: [],
  overallQuality: null,
  currentAngles: defaultAngles,
  gimbalLockState: defaultGimbalLockState,
  currentWarnings: [],
  playbackState: defaultPlaybackState,
  keyframeMarkers: [],
  isPanelCollapsed: false,
  selectedWarningId: null,

  setAttitudeData: (data: AttitudeData) => {
    const { validatedFrames, allWarnings, overallQuality } = validateAllFrames(data.frames);

    const keyframeMarkers: KeyframeMarker[] = [];
    allWarnings.forEach((warnings, frameIndex) => {
      warnings.forEach((warning) => {
        if (warning.type === 'gimbal_lock') {
          keyframeMarkers.push({
            frameIndex,
            type: 'gimbal_lock',
            description: warning.message,
          });
        } else if (warning.type === 'angle_out_of_range' || warning.type === 'axis_reversed') {
          keyframeMarkers.push({
            frameIndex,
            type: 'warning',
            description: warning.message,
          });
        }
      });
    });

    const firstFrame = validatedFrames[0];
    const initialAngles = firstFrame
      ? fillMissingFields(firstFrame, [])
      : defaultAngles;

    const gimbalLockState = detectGimbalLock(initialAngles);
    const currentWarnings = allWarnings[0] || [];

    const gimbalWarnings: AttitudeWarning[] = [];
    if (gimbalLockState.isLocked) {
      gimbalWarnings.push({
        id: generateId(),
        type: 'gimbal_lock',
        axis: gimbalLockState.lockedAxis,
        currentValue: gimbalLockState.lockAngle,
        message: `检测到万向节锁：俯仰角 ${gimbalLockState.lockAngle.toFixed(1)}°`,
        correctionSteps: [],
      });
    }

    set({
      attitudeData: data,
      validatedFrames,
      allWarnings,
      overallQuality,
      currentAngles: initialAngles,
      gimbalLockState,
      currentWarnings: [...currentWarnings, ...gimbalWarnings],
      playbackState: {
        ...defaultPlaybackState,
        totalFrames: validatedFrames.length,
        currentTime: firstFrame?.timestamp || 0,
      },
      keyframeMarkers,
    });
  },

  setCurrentAngles: (angles: Partial<EulerAngles>) => {
    const { currentAngles } = get();
    const newAngles = { ...currentAngles, ...angles };
    const gimbalLockState = detectGimbalLock(newAngles);

    const gimbalWarnings: AttitudeWarning[] = [];
    if (gimbalLockState.isLocked) {
      gimbalWarnings.push({
        id: generateId(),
        type: 'gimbal_lock',
        axis: gimbalLockState.lockedAxis,
        currentValue: gimbalLockState.lockAngle,
        message: `检测到万向节锁：俯仰角 ${gimbalLockState.lockAngle.toFixed(1)}°`,
        correctionSteps: [],
      });
    }

    set({
      currentAngles: newAngles,
      gimbalLockState,
      currentWarnings: gimbalWarnings,
    });
  },

  setPlaybackState: (state: Partial<PlaybackState>) => {
    const { playbackState } = get();
    set({
      playbackState: { ...playbackState, ...state } });
  },

  nextFrame: () => {
    const { playbackState, validatedFrames, allWarnings } = get();
    const nextFrameIndex = Math.min(playbackState.currentFrame + 1, validatedFrames.length - 1);

    if (nextFrameIndex !== playbackState.currentFrame && validatedFrames[nextFrameIndex]) {
      const frame = validatedFrames[nextFrameIndex];
      const currentAngles = fillMissingFields(frame, validatedFrames.slice(0, nextFrameIndex));
      const gimbalLockState = detectGimbalLock(currentAngles);
      const frameWarnings = allWarnings[nextFrameIndex] || [];

      const gimbalWarnings: AttitudeWarning[] = [];
      if (gimbalLockState.isLocked) {
        gimbalWarnings.push({
          id: generateId(),
          type: 'gimbal_lock',
          axis: gimbalLockState.lockedAxis,
          currentValue: gimbalLockState.lockAngle,
          message: `检测到万向节锁：俯仰角 ${gimbalLockState.lockAngle.toFixed(1)}°`,
          correctionSteps: [],
        });
      }

      set({
        currentAngles,
        gimbalLockState,
        currentWarnings: [...frameWarnings, ...gimbalWarnings],
        playbackState: {
          ...playbackState,
          currentFrame: nextFrameIndex,
          currentTime: frame.timestamp,
        },
      });
    }
  },

  prevFrame: () => {
    const { playbackState, validatedFrames, allWarnings } = get();
    const prevFrameIndex = Math.max(playbackState.currentFrame - 1, 0);

    if (prevFrameIndex !== playbackState.currentFrame && validatedFrames[prevFrameIndex]) {
      const frame = validatedFrames[prevFrameIndex];
      const currentAngles = fillMissingFields(frame, validatedFrames.slice(0, prevFrameIndex));
      const gimbalLockState = detectGimbalLock(currentAngles);
      const frameWarnings = allWarnings[prevFrameIndex] || [];

      const gimbalWarnings: AttitudeWarning[] = [];
      if (gimbalLockState.isLocked) {
        gimbalWarnings.push({
          id: generateId(),
          type: 'gimbal_lock',
          axis: gimbalLockState.lockedAxis,
          currentValue: gimbalLockState.lockAngle,
          message: `检测到万向节锁：俯仰角 ${gimbalLockState.lockAngle.toFixed(1)}°`,
          correctionSteps: [],
        });
      }

      set({
        currentAngles,
        gimbalLockState,
        currentWarnings: [...frameWarnings, ...gimbalWarnings],
        playbackState: {
          ...playbackState,
          currentFrame: prevFrameIndex,
          currentTime: frame.timestamp,
        },
      });
    }
  },

  goToFrame: (frameIndex: number) => {
    const { validatedFrames, allWarnings, playbackState } = get();
    const clampedIndex = Math.max(0, Math.min(frameIndex, validatedFrames.length - 1));

    if (validatedFrames[clampedIndex]) {
      const frame = validatedFrames[clampedIndex];
      const currentAngles = fillMissingFields(frame, validatedFrames.slice(0, clampedIndex));
      const gimbalLockState = detectGimbalLock(currentAngles);
      const frameWarnings = allWarnings[clampedIndex] || [];

      const gimbalWarnings: AttitudeWarning[] = [];
      if (gimbalLockState.isLocked) {
        gimbalWarnings.push({
          id: generateId(),
          type: 'gimbal_lock',
          axis: gimbalLockState.lockedAxis,
          currentValue: gimbalLockState.lockAngle,
          message: `检测到万向节锁：俯仰角 ${gimbalLockState.lockAngle.toFixed(1)}°`,
          correctionSteps: [],
        });
      }

      set({
        currentAngles,
        gimbalLockState,
        currentWarnings: [...frameWarnings, ...gimbalWarnings],
        playbackState: {
          ...playbackState,
          currentFrame: clampedIndex,
          currentTime: frame.timestamp,
        },
      });
    }
  },

  togglePlay: () => {
    const { playbackState } = get();
    set({
      playbackState: {
        ...playbackState,
        isPlaying: !playbackState.isPlaying,
      },
    });
  },

  togglePanel: () => {
    const { isPanelCollapsed } = get();
    set({ isPanelCollapsed: !isPanelCollapsed });
  },

  setSelectedWarningId: (id: string | null) => {
    set({ selectedWarningId: id });
  },

  resetToDefault: () => {
    set({
      currentAngles: defaultAngles,
      gimbalLockState: defaultGimbalLockState,
      currentWarnings: [],
      playbackState: defaultPlaybackState,
    });
  },
}));
