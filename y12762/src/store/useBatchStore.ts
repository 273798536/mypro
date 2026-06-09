import { create } from 'zustand';
import type { BatchRecord, Reagent, SafetyNote } from '../types';
import { MOCK_BATCHES, generateHash } from '../data/mockData';

interface BatchState {
  batches: BatchRecord[];
  currentBatchId: string | null;
  currentBatch: BatchRecord | null;
  setCurrentBatch: (id: string) => void;
  addBatch: (batch: Omit<BatchRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBatch: (id: string, updates: Partial<BatchRecord>) => void;
  addReagent: (batchId: string, reagent: Omit<Reagent, 'id'>) => void;
  updateReagent: (batchId: string, reagentId: string, updates: Partial<Reagent>) => void;
  removeReagent: (batchId: string, reagentId: string) => void;
  addSafetyNote: (batchId: string, note: Omit<SafetyNote, 'id' | 'createdAt' | 'contentHash'>) => { success: boolean; message: string; note?: SafetyNote };
  importSafetyNotes: (batchId: string, notes: Omit<SafetyNote, 'id' | 'createdAt' | 'contentHash'>[]) => { imported: number; skipped: number; messages: string[] };
}

export const useBatchStore = create<BatchState>((set, get) => ({
  batches: MOCK_BATCHES,
  currentBatchId: MOCK_BATCHES[0]?.id || null,
  currentBatch: MOCK_BATCHES[0] || null,

  setCurrentBatch: (id: string) => {
    const batch = get().batches.find((b) => b.id === id) || null;
    set({ currentBatchId: id, currentBatch: batch });
  },

  addBatch: (batch) => {
    const newBatch: BatchRecord = {
      ...batch,
      id: `batch-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      batches: [...state.batches, newBatch],
      currentBatchId: newBatch.id,
      currentBatch: newBatch,
    }));
  },

  updateBatch: (id, updates) => {
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b
      ),
      currentBatch:
        state.currentBatch?.id === id
          ? { ...state.currentBatch, ...updates, updatedAt: Date.now() }
          : state.currentBatch,
    }));
  },

  addReagent: (batchId, reagent) => {
    const newReagent: Reagent = {
      ...reagent,
      id: `reagent-${Date.now()}`,
    };
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === batchId
          ? { ...b, reagents: [...b.reagents, newReagent], updatedAt: Date.now() }
          : b
      ),
      currentBatch:
        state.currentBatch?.id === batchId
          ? {
              ...state.currentBatch,
              reagents: [...state.currentBatch.reagents, newReagent],
              updatedAt: Date.now(),
            }
          : state.currentBatch,
    }));
  },

  updateReagent: (batchId, reagentId, updates) => {
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === batchId
          ? {
              ...b,
              reagents: b.reagents.map((r) =>
                r.id === reagentId ? { ...r, ...updates } : r
              ),
              updatedAt: Date.now(),
            }
          : b
      ),
      currentBatch:
        state.currentBatch?.id === batchId
          ? {
              ...state.currentBatch,
              reagents: state.currentBatch.reagents.map((r) =>
                r.id === reagentId ? { ...r, ...updates } : r
              ),
              updatedAt: Date.now(),
            }
          : state.currentBatch,
    }));
  },

  removeReagent: (batchId, reagentId) => {
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === batchId
          ? {
              ...b,
              reagents: b.reagents.filter((r) => r.id !== reagentId),
              updatedAt: Date.now(),
            }
          : b
      ),
      currentBatch:
        state.currentBatch?.id === batchId
          ? {
              ...state.currentBatch,
              reagents: state.currentBatch.reagents.filter((r) => r.id !== reagentId),
              updatedAt: Date.now(),
            }
          : state.currentBatch,
    }));
  },

  addSafetyNote: (batchId, note) => {
    const state = get();
    const batch = state.batches.find((b) => b.id === batchId);
    if (!batch) return { success: false, message: '批次不存在' };

    const contentHash = generateHash(note.content + batchId);
    const exists = batch.safetyNotes.some((n) => n.contentHash === contentHash);
    if (exists) {
      return { success: false, message: '已存在相同内容的安全备注，已跳过' };
    }

    const newNote: SafetyNote = {
      ...note,
      id: `note-${Date.now()}`,
      contentHash,
      createdAt: Date.now(),
    };

    set((s) => ({
      batches: s.batches.map((b) =>
        b.id === batchId
          ? { ...b, safetyNotes: [...b.safetyNotes, newNote], updatedAt: Date.now() }
          : b
      ),
      currentBatch:
        s.currentBatch?.id === batchId
          ? {
              ...s.currentBatch,
              safetyNotes: [...s.currentBatch.safetyNotes, newNote],
              updatedAt: Date.now(),
            }
          : s.currentBatch,
    }));

    return { success: true, message: '安全备注已添加', note: newNote };
  },

  importSafetyNotes: (batchId, notes) => {
    const messages: string[] = [];
    let imported = 0;
    let skipped = 0;
    const state = get();
    const batch = state.batches.find((b) => b.id === batchId);
    if (!batch) return { imported: 0, skipped: notes.length, messages: ['批次不存在'] };

    const newNotes: SafetyNote[] = [];
    notes.forEach((note, idx) => {
      const contentHash = generateHash(note.content + batchId);
      const exists = batch.safetyNotes.some((n) => n.contentHash === contentHash);
      if (exists) {
        skipped++;
        messages.push(`第${idx + 1}条备注：内容重复，已跳过`);
      } else {
        newNotes.push({
          ...note,
          id: `note-${Date.now()}-${idx}`,
          contentHash,
          createdAt: Date.now(),
        });
        imported++;
        messages.push(`第${idx + 1}条备注：已成功导入`);
      }
    });

    if (newNotes.length > 0) {
      set((s) => ({
        batches: s.batches.map((b) =>
          b.id === batchId
            ? { ...b, safetyNotes: [...b.safetyNotes, ...newNotes], updatedAt: Date.now() }
            : b
        ),
        currentBatch:
          s.currentBatch?.id === batchId
            ? {
                ...s.currentBatch,
                safetyNotes: [...s.currentBatch.safetyNotes, ...newNotes],
                updatedAt: Date.now(),
              }
            : s.currentBatch,
      }));
    }

    return { imported, skipped, messages };
  },
}));
