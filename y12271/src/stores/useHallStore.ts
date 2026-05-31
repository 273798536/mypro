import { create } from 'zustand';
import type { HallModel, Seat, Surface, SoundSource } from '@/types';
import { mockHall, mockSeats, mockSurfaces, mockSoundSources } from '@/data/mockData';

interface HallState {
  hall: HallModel;
  seats: Seat[];
  surfaces: Surface[];
  soundSources: SoundSource[];
  selectedSeatId: string | null;
  selectedSurfaceId: string | null;
  selectSeat: (id: string | null) => void;
  selectSurface: (id: string | null) => void;
  updateSoundSource: (id: string, pos: { x: number; y: number; z: number }) => void;
  supplementSurface: (id: string, coeffs: number[]) => void;
  getReverbColor: (reverbTime: number) => string;
}

function reverbToColor(rt: number): string {
  const minRt = 1.2;
  const maxRt = 2.8;
  const t = Math.max(0, Math.min(1, (rt - minRt) / (maxRt - minRt)));
  const r = Math.round(245 * (1 - t) + 59 * t);
  const g = Math.round(158 * (1 - t) + 130 * t);
  const b = Math.round(11 * (1 - t) + 246 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export const useHallStore = create<HallState>((set) => ({
  hall: mockHall,
  seats: mockSeats,
  surfaces: mockSurfaces,
  soundSources: mockSoundSources,
  selectedSeatId: null,
  selectedSurfaceId: null,
  selectSeat: (id) => set({ selectedSeatId: id }),
  selectSurface: (id) => set({ selectedSurfaceId: id }),
  updateSoundSource: (id, pos) =>
    set((state) => ({
      soundSources: state.soundSources.map((s) =>
        s.id === id ? { ...s, ...pos } : s
      ),
    })),
  supplementSurface: (id, coeffs) =>
    set((state) => ({
      surfaces: state.surfaces.map((s) =>
        s.id === id
          ? {
              ...s,
              absorptionCoeffs: s.absorptionCoeffs.map((c, i) =>
                coeffs[i] >= 0 ? coeffs[i] : c
              ),
              missingFreqBands: s.missingFreqBands.filter(
                (b) => coeffs[Object.keys(s.absorptionCoeffs).indexOf(String(b))] >= 0
              ),
              paramsComplete: coeffs.every((c) => c >= 0),
            }
          : s
      ),
    })),
  getReverbColor: reverbToColor,
}));
