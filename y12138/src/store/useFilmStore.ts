import { create } from 'zustand';
import type {
  LayerRow,
  AngleParams,
  WavelengthRange,
  CalculationBatch,
  WavelengthResult,
  ValidationEntry,
} from '@/types';
import { calculateSpectrum } from '@/utils/tmm';
import { validateLayers, getValidLayers, getBadRows } from '@/utils/validator';

interface FilmStore {
  layers: LayerRow[];
  rawInput: string;
  angle: AngleParams;
  wavelengthRange: WavelengthRange;
  ambientN: number;
  substrateN: number;
  batch: CalculationBatch | null;
  selectedWavelength: number | null;
  isCalculating: boolean;

  setRawInput: (text: string) => void;
  setLayers: (layers: LayerRow[]) => void;
  setAngle: (angle: AngleParams) => void;
  setWavelengthRange: (range: WavelengthRange) => void;
  setAmbientN: (n: number) => void;
  setSubstrateN: (n: number) => void;
  setSelectedWavelength: (wl: number | null) => void;
  updateLayer: (index: number, updates: Partial<LayerRow>) => void;
  addLayer: () => void;
  removeLayer: (index: number) => void;
  runCalculation: () => void;
}

function generateBatchId(): string {
  return `batch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useFilmStore = create<FilmStore>((set, get) => ({
  layers: [],
  rawInput: '',
  angle: { angleDeg: 0, polarization: 's' },
  wavelengthRange: { start: 400, end: 800, step: 5 },
  ambientN: 1.0,
  substrateN: 1.52,
  batch: null,
  selectedWavelength: null,
  isCalculating: false,

  setRawInput: (text) => set({ rawInput: text }),

  setLayers: (layers) => set({ layers }),

  setAngle: (angle) => set({ angle }),

  setWavelengthRange: (range) => set({ wavelengthRange: range }),

  setAmbientN: (n) => set({ ambientN: n }),

  setSubstrateN: (n) => set({ substrateN: n }),

  setSelectedWavelength: (wl) => set({ selectedWavelength: wl }),

  updateLayer: (index, updates) =>
    set((state) => {
      const newLayers = [...state.layers];
      if (index >= 0 && index < newLayers.length) {
        newLayers[index] = { ...newLayers[index], ...updates };
      }
      return { layers: newLayers };
    }),

  addLayer: () =>
    set((state) => ({
      layers: [
        ...state.layers,
        {
          rowIndex: state.layers.length + 1,
          material: '',
          n: null,
          k: null,
          d: null,
          note: '',
          status: {
            isEmpty: false,
            isComment: false,
            missingColumns: false,
            zeroThickness: false,
            missingRefractiveIndex: false,
            angleOutOfBounds: false,
            rawContent: '',
          },
        },
      ],
    })),

  removeLayer: (index) =>
    set((state) => ({
      layers: state.layers.filter((_, i) => i !== index).map((l, i) => ({ ...l, rowIndex: i + 1 })),
    })),

  runCalculation: () => {
    const state = get();
    set({ isCalculating: true });

    const validations = validateLayers(state.layers, state.angle);
    const validLayers = getValidLayers(state.layers);
    const badRows = getBadRows(state.layers);

    let results: WavelengthResult[] = [];
    if (validLayers.length > 0 && state.angle.angleDeg >= 0 && state.angle.angleDeg < 90) {
      results = calculateSpectrum(
        validLayers,
        state.angle,
        state.wavelengthRange.start,
        state.wavelengthRange.end,
        state.wavelengthRange.step,
        state.ambientN,
        state.substrateN
      );
    }

    const batch: CalculationBatch = {
      batchId: generateBatchId(),
      createdAt: new Date().toISOString(),
      input: {
        layers: state.layers,
        angle: state.angle,
        wavelengthRange: state.wavelengthRange,
        ambientN: state.ambientN,
        substrateN: state.substrateN,
      },
      results,
      validations,
      badRows,
    };

    set({
      batch,
      isCalculating: false,
      selectedWavelength: results.length > 0 ? results[0].wavelength : null,
    });
  },
}));
