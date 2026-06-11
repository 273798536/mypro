import { create } from 'zustand';
import type { ParsedRow } from '@/utils/fileParser';

interface ImportState {
  rows: ParsedRow[];
  stage: 'idle' | 'parsing' | 'preview' | 'done';
  error: string | null;
  fileMeta: { name: string; size: number } | null;
  setRows: (rows: ParsedRow[]) => void;
  setStage: (s: ImportState['stage']) => void;
  setError: (e: string | null) => void;
  setFileMeta: (m: ImportState['fileMeta']) => void;
  reset: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  rows: [],
  stage: 'idle',
  error: null,
  fileMeta: null,
  setRows: (rows) => set({ rows }),
  setStage: (stage) => set({ stage }),
  setError: (error) => set({ error }),
  setFileMeta: (fileMeta) => set({ fileMeta }),
  reset: () =>
    set({ rows: [], stage: 'idle', error: null, fileMeta: null }),
}));
