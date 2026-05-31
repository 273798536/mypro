import { create } from 'zustand';
import { PracticeSession, ErrorEvent, ErrorStats, PlaybackState, HandKeyframe } from '@/types';
import { mockPracticeSession } from '@/data/mockData';

interface PlaybackStore extends PlaybackState {
  session: PracticeSession;
  currentKeyframes: HandKeyframe[];
  currentErrors: ErrorEvent[];
  errorStats: ErrorStats;
  hasDataGap: boolean;
  currentDataGapReason: string | null;
  
  setPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSelectedErrorId: (id: string | null) => void;
  addManualError: (error: Omit<ErrorEvent, 'id' | 'isRetroactivelyAdded' | 'addedAt' | 'source'>) => void;
  jumpToError: (errorId: string) => void;
  getCorrespondenceData: () => Array<{
    timestamp: number;
    measureNumber: number;
    keypointIds: string[];
    errorIds: string[];
  }>;
}

function getCurrentKeyframes(session: PracticeSession, time: number): HandKeyframe[] {
  return session.keyframes.filter(kf => {
    const nextIndex = session.keyframes.findIndex(k => k.timestamp > time && k.hand === kf.hand);
    if (nextIndex === -1) return kf.timestamp <= time;
    const prevKf = session.keyframes[nextIndex - 1];
    return prevKf?.id === kf.id;
  });
}

function getCurrentErrors(session: PracticeSession, time: number): ErrorEvent[] {
  return session.errors.filter(err => Math.abs(err.timestamp - time) < 0.5);
}

function calculateErrorStats(session: PracticeSession): ErrorStats {
  return {
    missingKeypoint: session.errors.filter(e => e.type === 'missing_keypoint').length,
    measureMisalignment: session.errors.filter(e => e.type === 'measure_misalignment').length,
    handConfusion: session.errors.filter(e => e.type === 'hand_confusion').length,
    total: session.errors.length,
  };
}

function checkDataGap(keyframes: HandKeyframe[]): { hasGap: boolean; reason: string | null } {
  const gapFrame = keyframes.find(kf => kf.dataGap);
  return {
    hasGap: !!gapFrame,
    reason: gapFrame?.dataGapReason || null,
  };
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  session: mockPracticeSession,
  isPlaying: false,
  currentTime: 0,
  playbackSpeed: 1,
  selectedErrorId: null,
  currentKeyframes: [],
  currentErrors: [],
  errorStats: calculateErrorStats(mockPracticeSession),
  hasDataGap: false,
  currentDataGapReason: null,
  
  setPlaying: (isPlaying) => set({ isPlaying }),
  
  setCurrentTime: (time) => {
    const { session } = get();
    const clampedTime = Math.max(0, Math.min(time, session.totalDuration));
    const keyframes = getCurrentKeyframes(session, clampedTime);
    const errors = getCurrentErrors(session, clampedTime);
    const { hasGap, reason } = checkDataGap(keyframes);
    
    set({
      currentTime: clampedTime,
      currentKeyframes: keyframes,
      currentErrors: errors,
      hasDataGap: hasGap,
      currentDataGapReason: reason,
    });
  },
  
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  
  setSelectedErrorId: (id) => set({ selectedErrorId: id }),
  
  addManualError: (errorData) => {
    const newError: ErrorEvent = {
      ...errorData,
      id: `err-manual-${Date.now()}`,
      source: 'manual',
      isRetroactivelyAdded: true,
      addedAt: Date.now(),
    };
    
    set((state) => {
      const newSession = {
        ...state.session,
        errors: [...state.session.errors, newError],
      };
      return {
        session: newSession,
        errorStats: calculateErrorStats(newSession),
      };
    });
  },
  
  jumpToError: (errorId) => {
    const { session } = get();
    const error = session.errors.find(e => e.id === errorId);
    if (error) {
      get().setCurrentTime(error.timestamp);
      set({ selectedErrorId: errorId, isPlaying: false });
    }
  },
  
  getCorrespondenceData: () => {
    const { session } = get();
    const correspondence: Array<{
      timestamp: number;
      measureNumber: number;
      keypointIds: string[];
      errorIds: string[];
    }> = [];
    
    session.measures.forEach(measure => {
      const keyframesInMeasure = session.keyframes.filter(
        kf => kf.timestamp >= measure.startTime && kf.timestamp < measure.endTime
      );
      
      const errorsInMeasure = session.errors.filter(
        err => err.measureNumber === measure.measureNumber
      );
      
      const keypointIds = [...new Set(keyframesInMeasure.flatMap(kf => 
        kf.fingerKeypoints.map(kp => kp.id)
      ))];
      
      correspondence.push({
        timestamp: measure.startTime,
        measureNumber: measure.measureNumber,
        keypointIds,
        errorIds: errorsInMeasure.map(e => e.id),
      });
    });
    
    return correspondence;
  },
}));
