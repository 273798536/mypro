import { create } from 'zustand';
import type {
  ReviewBatch,
  ReviewException,
  HistoryEntry,
  AliasConflict,
  ConsistencyCheck,
} from '../types';
import { generateAllBatches } from '../data/mockData';

interface ReviewState {
  batches: ReviewBatch[];
  activeBatchId: string | null;
  activeSongId: string | null;
  selectedExceptionId: string | null;
  drawerOpen: boolean;
  drawerContent: 'exception' | 'file' | 'criteria' | null;
  consistencyChecks: Record<string, ConsistencyCheck>;

  init: () => void;
  setActiveBatch: (id: string) => void;
  setActiveSong: (id: string | null) => void;
  selectException: (id: string | null) => void;
  openDrawer: (content: 'exception' | 'file' | 'criteria') => void;
  closeDrawer: () => void;

  resolveException: (exceptionId: string) => void;
  addNote: (audioFileId: string, content: string, author: string) => void;
  resolveAliasConflict: (
    conflictId: string,
    resolution: 'merge' | 'separate'
  ) => void;
  runConsistencyCheck: (batchId: string) => ConsistencyCheck;
  createNewBatch: (name: string, folderPath: string) => ReviewBatch;
  getActiveBatch: () => ReviewBatch | undefined;
  getActiveSong: () => ReviewBatch['songs'][0] | undefined;
  getExceptionById: (id: string) => ReviewException | undefined;
}

const STORAGE_KEY = 'choir_review_batches_v1';

export const useReviewStore = create<ReviewState>((set, get) => ({
  batches: [],
  activeBatchId: null,
  activeSongId: null,
  selectedExceptionId: null,
  drawerOpen: false,
  drawerContent: null,
  consistencyChecks: {},

  init: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ReviewBatch[];
        set({
          batches: parsed,
          activeBatchId: parsed[0]?.id ?? null,
          activeSongId: parsed[0]?.songs[0]?.id ?? null,
        });
      } else {
        const fresh = generateAllBatches();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        set({
          batches: fresh,
          activeBatchId: fresh[0]?.id ?? null,
          activeSongId: fresh[0]?.songs[0]?.id ?? null,
        });
      }
    } catch {
      const fresh = generateAllBatches();
      set({
        batches: fresh,
        activeBatchId: fresh[0]?.id ?? null,
        activeSongId: fresh[0]?.songs[0]?.id ?? null,
      });
    }
  },

  setActiveBatch: (id) => {
    const batch = get().batches.find((b) => b.id === id);
    set({
      activeBatchId: id,
      activeSongId: batch?.songs[0]?.id ?? null,
    });
  },

  setActiveSong: (id) => set({ activeSongId: id }),

  selectException: (id) => set({ selectedExceptionId: id }),

  openDrawer: (content) => set({ drawerOpen: true, drawerContent: content }),

  closeDrawer: () => set({ drawerOpen: false, drawerContent: null }),

  resolveException: (exceptionId) => {
    const { batches, activeBatchId } = get();
    const updated = batches.map((b) =>
      b.id === activeBatchId
        ? {
            ...b,
            exceptions: b.exceptions.map((e) =>
              e.id === exceptionId ? { ...e, resolved: true } : e
            ),
          }
        : b
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ batches: updated });
  },

  addNote: (audioFileId, content, author) => {
    const { batches, activeBatchId } = get();
    const entry: HistoryEntry = {
      id: `note-${Date.now()}`,
      audioFileId,
      type: 'note_added',
      operator: author,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      description: '追加备注',
      noteContent: content,
    };
    const updated = batches.map((b) => {
      if (b.id !== activeBatchId) return b;
      return {
        ...b,
        songs: b.songs.map((s) => ({
          ...s,
          history: s.audioFiles.some((f) => f.id === audioFileId)
            ? [...s.history, entry]
            : s.history,
        })),
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ batches: updated });
  },

  resolveAliasConflict: (conflictId, resolution) => {
    const { batches, activeBatchId } = get();
    const updated = batches.map((b) => {
      if (b.id !== activeBatchId) return b;
      const newConflicts = b.aliasConflicts.map((c) =>
        c.id === conflictId ? { ...c, confirmed: true, resolution } : c
      );
      const allConfirmed = newConflicts.every((c) => c.confirmed);
      return {
        ...b,
        aliasConflicts: newConflicts,
        status: allConfirmed ? 'has_exceptions' : b.status,
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ batches: updated });
  },

  runConsistencyCheck: (batchId) => {
    const batch = get().batches.find((b) => b.id === batchId);
    if (!batch) return { passed: false, mismatches: [], checkedAt: '' };
    const mismatches: ConsistencyCheck['mismatches'] = [];
    const unresolvedInFile = batch.exceptions.filter(
      (e) => !e.resolved
    ).length;
    const displayedResolved = batch.exceptions.filter((e) => e.resolved).length;
    if (batch.status === 'completed' && unresolvedInFile > 0) {
      mismatches.push({
        field: '复核状态',
        displayValue: '已完成',
        fileValue: `还有${unresolvedInFile}条异常未处理`,
      });
    }
    if (displayedResolved > batch.exceptions.length * 0.4 && displayedResolved < 5) {
      mismatches.push({
        field: '异常处理进度',
        displayValue: `已处理${displayedResolved}条`,
        fileValue: `文件系统共${batch.exceptions.length}条异常记录`,
      });
    }
    batch.songs.forEach((song) => {
      if (song.aliases.length > 1 && song.name !== song.aliases[0]) {
        const hasUnconfirmedConflict = batch.aliasConflicts.some(
          (c) => !c.confirmed && c.duplicateNames.includes(song.name)
        );
        if (hasUnconfirmedConflict) {
          mismatches.push({
            field: `《${song.name}》曲名`,
            displayValue: song.name,
            fileValue: `文件中存在别名：${song.aliases.join('、')}，待确认`,
          });
        }
      }
    });
    const result: ConsistencyCheck = {
      passed: mismatches.length === 0,
      mismatches,
      checkedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    };
    set((s) => ({
      consistencyChecks: { ...s.consistencyChecks, [batchId]: result },
    }));
    return result;
  },

  createNewBatch: (name, folderPath) => {
    const { batches } = get();
    const newId = `rb-${Date.now()}`;
    const baseBatch = generateAllBatches()[0];
    const newBatch: ReviewBatch = {
      ...baseBatch,
      id: newId,
      name,
      folderPath,
      status: 'awaiting_confirm',
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    };
    newBatch.songs = newBatch.songs.map((s) => ({
      ...s,
      id: s.id.replace('rb-1000', newId.replace('rb-', '')),
      reviewBatchId: newId,
    }));
    const updated = [newBatch, ...batches];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({
      batches: updated,
      activeBatchId: newId,
      activeSongId: newBatch.songs[0]?.id ?? null,
    });
    return newBatch;
  },

  getActiveBatch: () =>
    get().batches.find((b) => b.id === get().activeBatchId),

  getActiveSong: () => {
    const { activeBatchId, activeSongId, batches } = get();
    const batch = batches.find((b) => b.id === activeBatchId);
    return batch?.songs.find((s) => s.id === activeSongId);
  },

  getExceptionById: (id) => {
    const batch = get().getActiveBatch();
    return batch?.exceptions.find((e) => e.id === id);
  },
}));
