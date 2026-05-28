import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RevisionEntry } from '@/types';

function generateId(): string {
  return `rev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface RevisionState {
  entries: RevisionEntry[];
  addEntry: (entry: Omit<RevisionEntry, 'id' | 'timestamp'>) => void;
  addEntries: (entries: Array<Omit<RevisionEntry, 'id' | 'timestamp'>>) => void;
  getEntriesForTarget: (targetType: RevisionEntry['targetType'], targetId: string) => RevisionEntry[];
  clearHistory: () => void;
  undo: (entryId: string) => void;
}

export const useRevisionStore = create<RevisionState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => ({
          entries: [
            {
              ...entry,
              id: generateId(),
              timestamp: new Date().toISOString(),
            },
            ...state.entries,
          ],
        })),

      addEntries: (newEntries) =>
        set((state) => ({
          entries: [
            ...newEntries.map((e) => ({
              ...e,
              id: generateId(),
              timestamp: new Date().toISOString(),
            })),
            ...state.entries,
          ],
        })),

      getEntriesForTarget: (targetType, targetId) =>
        get().entries.filter(
          (e) => e.targetType === targetType && e.targetId === targetId
        ),

      clearHistory: () =>
        set({
          entries: [],
        }),

      undo: () => {
        void get();
      },
    }),
    {
      name: 'revision-store',
    }
  )
);
