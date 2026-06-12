import { create } from 'zustand';
import type {
  CalcState, WeatherForecast, SalinityRecord, EnergyDevice,
  TidalHarmonic, MapViewPreset, ResultItem, MissingMaterial, NoGoZone,
} from '@/types';
import {
  sampleWeather, sampleSalinity, sampleDevices,
  sampleHarmonics, sampleNoGoZones, sampleViewPresets,
} from '@/mock/samples';
import { buildAllResults } from '@/utils/statusClassifier';
import { calculateTidalSeries } from '@/utils/tideCalculator';
import { normalizeAllToPSU, markUnitMismatches } from '@/utils/salinityConverter';

const baseInitial: CalcState = {
  projectName: '舟山马鞍列岛海浪能示范项目（一期）',
  weather: [], weatherSourceName: null,
  salinity: [], salinitySourceName: null,
  devices: [], harmonics: [], tidalSeries: [], results: [],
  viewPresets: [], activeViewId: undefined,
  screenshotMode: false, missingMaterials: [], noGoZones: [],
  salinityUnitModalOpen: false, unitMismatchCount: 0,
  lastUpdatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
};

function rebuild(prev: CalcState): Partial<CalcState> {
  const { results, missing, devices } = buildAllResults({
    weather: prev.weather, salinity: prev.salinity,
    harmonics: prev.harmonics, devices: prev.devices, noGoZones: prev.noGoZones,
  });
  const start = prev.weather[0]?.timestamp
    ? new Date(prev.weather[0].timestamp.replace(' ', 'T'))
    : new Date(2026, 5, 12, 0, 0, 0);
  const series = calculateTidalSeries(prev.harmonics, start, 72, 1);
  const mismatch = markUnitMismatches(prev.salinity).filter(s => s.unitMismatch).length;
  return {
    results, missingMaterials: missing, devices,
    tidalSeries: series, unitMismatchCount: mismatch,
    lastUpdatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
}

export const useCalcStore = create<CalcState & {
  loadMockData: () => void;
  setWeather: (rows: WeatherForecast[], name: string) => void;
  setSalinity: (rows: SalinityRecord[], name: string) => void;
  addDevice: (d: EnergyDevice) => void;
  updateDevice: (id: string, patch: Partial<EnergyDevice>) => void;
  removeDevice: (id: string) => void;
  setHarmonics: (h: TidalHarmonic[]) => void;
  normalizeSalinityToPSU: () => void;
  openUnitModal: () => void; closeUnitModal: () => void;
  saveViewPreset: (name: string, center: [number, number], zoom: number, bounds?: [[number, number], [number, number]]) => void;
  applyViewPreset: (id: string) => void;
  deleteViewPreset: (id: string) => void;
  toggleScreenshotMode: () => void;
  setProjectName: (n: string) => void;
  triggerRebuild: () => void;
}>((set, get) => ({
  ...baseInitial,

  loadMockData: () => set(prev => {
    const next: CalcState = {
      ...prev,
      weather: sampleWeather, weatherSourceName: 'ECMWF_20260612_舟山海域.csv',
      salinity: sampleSalinity, salinitySourceName: 'ZS_20260612_盐度剖面.xlsx',
      devices: sampleDevices, harmonics: sampleHarmonics,
      noGoZones: sampleNoGoZones, viewPresets: sampleViewPresets,
      activeViewId: sampleViewPresets[0]?.id,
    };
    return { ...next, ...rebuild(next) };
  }),

  setWeather: (rows, name) => set(prev => {
    const next = { ...prev, weather: rows, weatherSourceName: name };
    return { ...next, ...rebuild(next) };
  }),

  setSalinity: (rows, name) => set(prev => {
    const next = { ...prev, salinity: markUnitMismatches(rows), salinitySourceName: name };
    return { ...next, ...rebuild(next) };
  }),

  addDevice: (d) => set(prev => {
    const next = { ...prev, devices: [...prev.devices, d] };
    return { ...next, ...rebuild(next) };
  }),

  updateDevice: (id, patch) => set(prev => {
    const next = {
      ...prev, devices: prev.devices.map(d => d.id === id ? { ...d, ...patch } : d),
    };
    return { ...next, ...rebuild(next) };
  }),

  removeDevice: (id) => set(prev => {
    const next = { ...prev, devices: prev.devices.filter(d => d.id !== id) };
    return { ...next, ...rebuild(next) };
  }),

  setHarmonics: (h) => set(prev => {
    const next = { ...prev, harmonics: h };
    return { ...next, ...rebuild(next) };
  }),

  normalizeSalinityToPSU: () => set(prev => {
    const next = { ...prev, salinity: normalizeAllToPSU(prev.salinity), salinityUnitModalOpen: false };
    return { ...next, ...rebuild(next) };
  }),

  openUnitModal: () => set({ salinityUnitModalOpen: true }),
  closeUnitModal: () => set({ salinityUnitModalOpen: false }),

  saveViewPreset: (name, center, zoom, bounds) => set(prev => {
    const p: MapViewPreset = {
      id: 'v_' + Date.now().toString(36), name, center, zoom, bounds,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    return { viewPresets: [...prev.viewPresets, p], activeViewId: p.id };
  }),
  applyViewPreset: (id) => set({ activeViewId: id }),
  deleteViewPreset: (id) => set(prev => ({
    viewPresets: prev.viewPresets.filter(v => v.id !== id),
    activeViewId: prev.activeViewId === id ? undefined : prev.activeViewId,
  })),

  toggleScreenshotMode: () => set(p => ({ screenshotMode: !p.screenshotMode })),
  setProjectName: (n) => set({ projectName: n }),
  triggerRebuild: () => set(prev => ({ ...prev, ...rebuild(prev) })),
}));
