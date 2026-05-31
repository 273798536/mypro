import { create } from 'zustand';
import type { CargoCell, CargoGrid, CargoItem } from '../types';
import { mockCargoCells, mockCargoGrid, mockCargoItems } from '../utils/mockData';

interface CargoState {
  grid: CargoGrid;
  cells: CargoCell[];
  cargoItems: CargoItem[];
  selectedCellId: string | null;
  setSelectedCell: (cellId: string | null) => void;
  updateCellLoad: (cellId: string, load: number, cargoName: string) => void;
  resetCell: (cellId: string) => void;
  getCellById: (cellId: string) => CargoCell | undefined;
}

export const useCargoStore = create<CargoState>((set, get) => ({
  grid: mockCargoGrid,
  cells: mockCargoCells,
  cargoItems: mockCargoItems,
  selectedCellId: null,
  setSelectedCell: (cellId) => set({ selectedCellId: cellId }),
  updateCellLoad: (cellId, load, cargoName) =>
    set((state) => {
      const cell = state.cells.find((c) => c.id === cellId);
      if (!cell) return state;

      let status: CargoCell['status'] = 'empty';
      const ratio = load / cell.maxCapacity;
      if (load === 0) {
        status = 'empty';
      } else if (load > cell.maxCapacity) {
        status = 'overload';
      } else if (ratio > 0.95) {
        status = 'warning';
      } else {
        status = 'loaded';
      }

      return {
        cells: state.cells.map((c) =>
          c.id === cellId
            ? { ...c, currentLoad: load, cargoName, status }
            : c
        ),
      };
    }),
  resetCell: (cellId) =>
    set((state) => ({
      cells: state.cells.map((c) =>
        c.id === cellId
          ? { ...c, currentLoad: 0, cargoName: '', status: 'empty' as const }
          : c
      ),
    })),
  getCellById: (cellId) => get().cells.find((c) => c.id === cellId),
}));
