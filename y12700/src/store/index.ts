import { create } from 'zustand';
import type {
  AppState,
  MatrixData,
  MatrixCell,
  RankResult,
  AnomalyItem,
  RowAvailability,
  HistoryRecord,
  ViewMode,
} from '@/types';
import { computeRank } from '@/utils/math/rank';
import { detectAnomalies, computeRowAvailability } from '@/utils/diagnosis';
import { sampleMatrix, historySamples } from '@/data/samples';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function matrixToNumeric(m: MatrixData): number[][] {
  return m.cells.map(row =>
    row.map(cell => (cell.value === null || Number.isNaN(cell.value) ? 0 : cell.value))
  );
}

function emptyCell(sourceRow: number): MatrixCell {
  return { value: null, unit: '', sourceRow };
}

function computeAll(matrix: MatrixData): {
  rank: RankResult | null;
  anomalies: AnomalyItem[];
  rows: RowAvailability[];
} {
  const A = matrixToNumeric(matrix);
  const hasAnyValue = A.some(row => row.some(v => v !== 0));
  if (!hasAnyValue) return { rank: null, anomalies: [], rows: [] };
  const rank = computeRank(A);
  const anomalies = detectAnomalies(matrix, rank);
  const rows = computeRowAvailability(matrix, anomalies);
  return { rank, anomalies, rows };
}

export const useStore = create<
  AppState & {
    setMatrix: (m: MatrixData) => void;
    updateCell: (row: number, col: number, patch: Partial<MatrixCell>) => void;
    setCellValue: (row: number, col: number, raw: string) => void;
    setCellUnit: (row: number, col: number, unit: string) => void;
    addRow: () => void;
    removeRow: (row: number) => void;
    addCol: () => void;
    removeCol: (col: number) => void;
    setTitle: (title: string) => void;
    setViewMode: (m: ViewMode) => void;
    saveToHistory: () => void;
    loadSample: (key: 'rank-deficient' | 'near-singular' | 'clean') => void;
    clearMatrix: () => void;
    deleteHistory: (id: string) => void;
  }
>((set, get) => {
  const initial = sampleMatrix();
  const initialComputed = computeAll(initial);
  return {
    currentMatrix: initial,
    rankResult: initialComputed.rank,
    anomalies: initialComputed.anomalies,
    rowAvailability: initialComputed.rows,
    viewMode: 'analyst',
    history: historySamples(),

    setMatrix: m => {
      const c = computeAll(m);
      set({ currentMatrix: m, rankResult: c.rank, anomalies: c.anomalies, rowAvailability: c.rows });
    },

    updateCell: (row, col, patch) => {
      const m = get().currentMatrix;
      if (!m) return;
      const cells = m.cells.map(r => r.slice());
      cells[row][col] = { ...cells[row][col], ...patch };
      const next: MatrixData = { ...m, cells, updatedAt: Date.now() };
      const c = computeAll(next);
      set({ currentMatrix: next, rankResult: c.rank, anomalies: c.anomalies, rowAvailability: c.rows });
    },

    setCellValue: (row, col, raw) => {
      const trimmed = raw.trim();
      if (trimmed === '') {
        get().updateCell(row, col, { value: null });
        return;
      }
      const num = Number(trimmed);
      get().updateCell(row, col, { value: Number.isNaN(num) ? null : num });
    },

    setCellUnit: (row, col, unit) => {
      get().updateCell(row, col, { unit });
    },

    addRow: () => {
      const m = get().currentMatrix;
      if (!m) return;
      const sourceRow = m.rows + 1;
      const cells = [...m.cells, Array.from({ length: m.cols }, (_, c) => emptyCell(sourceRow))];
      const next: MatrixData = { ...m, rows: m.rows + 1, cells, updatedAt: Date.now() };
      const c = computeAll(next);
      set({ currentMatrix: next, rankResult: c.rank, anomalies: c.anomalies, rowAvailability: c.rows });
    },

    removeRow: row => {
      const m = get().currentMatrix;
      if (!m || m.rows <= 1) return;
      const cells = m.cells.filter((_, i) => i !== row);
      const next: MatrixData = { ...m, rows: m.rows - 1, cells, updatedAt: Date.now() };
      const c = computeAll(next);
      set({ currentMatrix: next, rankResult: c.rank, anomalies: c.anomalies, rowAvailability: c.rows });
    },

    addCol: () => {
      const m = get().currentMatrix;
      if (!m) return;
      const cells = m.cells.map((row, ri) => [...row, emptyCell(ri + 1)]);
      const next: MatrixData = { ...m, cols: m.cols + 1, cells, updatedAt: Date.now() };
      const c = computeAll(next);
      set({ currentMatrix: next, rankResult: c.rank, anomalies: c.anomalies, rowAvailability: c.rows });
    },

    removeCol: col => {
      const m = get().currentMatrix;
      if (!m || m.cols <= 1) return;
      const cells = m.cells.map(row => row.filter((_, i) => i !== col));
      const next: MatrixData = { ...m, cols: m.cols - 1, cells, updatedAt: Date.now() };
      const c = computeAll(next);
      set({ currentMatrix: next, rankResult: c.rank, anomalies: c.anomalies, rowAvailability: c.rows });
    },

    setTitle: title => {
      const m = get().currentMatrix;
      if (!m) return;
      set({ currentMatrix: { ...m, title, updatedAt: Date.now() } });
    },

    setViewMode: m => set({ viewMode: m }),

    saveToHistory: () => {
      const s = get();
      if (!s.currentMatrix || !s.rankResult) return;
      const available = s.rowAvailability.filter(r => r.availability === 'available').length;
      const pending = s.rowAvailability.filter(r => r.availability === 'pending').length;
      const recollect = s.rowAvailability.filter(r => r.availability === 'recollect').length;
      const rec: HistoryRecord = {
        id: uid(),
        matrixId: s.currentMatrix.id,
        title: s.currentMatrix.title,
        timestamp: Date.now(),
        rankResult: s.rankResult,
        anomalyCount: s.anomalies.length,
        availableCount: available,
        pendingCount: pending,
        recollectCount: recollect,
      };
      set({ history: [rec, ...s.history].slice(0, 20) });
      try {
        localStorage.setItem('rank-diagnostic-history', JSON.stringify([rec, ...s.history].slice(0, 20)));
      } catch {}
    },

    loadSample: key => {
      const m = sampleMatrix(key);
      const c = computeAll(m);
      set({ currentMatrix: m, rankResult: c.rank, anomalies: c.anomalies, rowAvailability: c.rows });
    },

    clearMatrix: () => {
      const m: MatrixData = {
        id: uid(),
        title: '新诊断题目',
        rows: 3,
        cols: 3,
        cells: Array.from({ length: 3 }, (_, r) =>
          Array.from({ length: 3 }, () => emptyCell(r + 1))
        ),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      set({ currentMatrix: m, rankResult: null, anomalies: [], rowAvailability: [] });
    },

    deleteHistory: id => {
      const next = get().history.filter(h => h.id !== id);
      set({ history: next });
      try {
        localStorage.setItem('rank-diagnostic-history', JSON.stringify(next));
      } catch {}
    },
  };
});
