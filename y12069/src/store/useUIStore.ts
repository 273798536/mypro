import { create } from 'zustand';
import { GameError, CollisionRecord } from '@/utils/types';

interface UIState {
  showErrorToast: boolean;
  activeError: GameError | null;
  showCollisionDetail: boolean;
  activeCollision: CollisionRecord | null;
  showResultModal: boolean;
  showTutorial: boolean;
  selectedCollisionIndex: number | null;
  replaySpeed: number;
  isReplaying: boolean;
  
  setShowErrorToast: (show: boolean) => void;
  setActiveError: (error: GameError | null) => void;
  setShowCollisionDetail: (show: boolean) => void;
  setActiveCollision: (collision: CollisionRecord | null) => void;
  setShowResultModal: (show: boolean) => void;
  setShowTutorial: (show: boolean) => void;
  setSelectedCollisionIndex: (index: number | null) => void;
  setReplaySpeed: (speed: number) => void;
  setIsReplaying: (replaying: boolean) => void;
  resetUI: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showErrorToast: false,
  activeError: null,
  showCollisionDetail: false,
  activeCollision: null,
  showResultModal: false,
  showTutorial: false,
  selectedCollisionIndex: null,
  replaySpeed: 1,
  isReplaying: false,
  
  setShowErrorToast: (show) => set({ showErrorToast: show }),
  setActiveError: (error) => set({ activeError: error, showErrorToast: error !== null }),
  setShowCollisionDetail: (show) => set({ showCollisionDetail: show }),
  setActiveCollision: (collision) => set({ activeCollision: collision, showCollisionDetail: collision !== null }),
  setShowResultModal: (show) => set({ showResultModal: show }),
  setShowTutorial: (show) => set({ showTutorial: show }),
  setSelectedCollisionIndex: (index) => set({ selectedCollisionIndex: index }),
  setReplaySpeed: (speed) => set({ replaySpeed: speed }),
  setIsReplaying: (replaying) => set({ isReplaying: replaying }),
  
  resetUI: () => set({
    showErrorToast: false,
    activeError: null,
    showCollisionDetail: false,
    activeCollision: null,
    showResultModal: false,
    selectedCollisionIndex: null,
    isReplaying: false,
  }),
}));
