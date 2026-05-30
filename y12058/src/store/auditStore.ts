import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ExceptionRecord } from '@/types';

interface AuditState {
  selectedGame: ExceptionRecord | null;
  filterType: 'all' | 'temperature_bound' | 'conservation_error' | 'timeout';
  reviewMode: boolean;
  replaySpeed: number;
  isReplaying: boolean;
  currentReplayTime: number;
  reviewedExceptions: string[];
  setSelectedGame: (exception: ExceptionRecord | null) => void;
  setFilterType: (type: AuditState['filterType']) => void;
  toggleReviewMode: () => void;
  setReplaySpeed: (speed: number) => void;
  setIsReplaying: (replaying: boolean) => void;
  setCurrentReplayTime: (time: number) => void;
  markAsReviewed: (exceptionId: string) => void;
  reset: () => void;
}

export const useAuditStore = create<AuditState>()(
  devtools(
    (set) => ({
      selectedGame: null,
      filterType: 'all',
      reviewMode: false,
      replaySpeed: 1,
      isReplaying: false,
      currentReplayTime: 0,
      reviewedExceptions: [],
      
      setSelectedGame: (exception: ExceptionRecord | null) => {
        set({ selectedGame: exception });
      },

      setFilterType: (type) => {
        set({ filterType: type });
      },

      toggleReviewMode: () => {
        set(state => ({ reviewMode: !state.reviewMode }));
      },

      setReplaySpeed: (speed) => {
        set({ replaySpeed: speed });
      },

      setIsReplaying: (replaying) => {
        set({ isReplaying });
      },

      setCurrentReplayTime: (time) => {
        set({ currentReplayTime: time });
      },

      markAsReviewed: (exceptionId) => {
        set(state => ({
          reviewedExceptions: [...state.reviewedExceptions, exceptionId],
        }));
      },

      reset: () => {
        set({
          selectedGame: null,
          filterType: 'all',
          reviewMode: false,
          replaySpeed: 1,
          currentReplayTime: 0,
        });
      },
    }),
    { name: 'audit-store' }
  )
);
