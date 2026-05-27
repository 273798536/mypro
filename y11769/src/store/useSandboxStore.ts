import { create } from 'zustand';
import type { Epicenter, MediumLayer, Station, RayPath, ArrivalTime, ValidationResult, Correction, SampleData } from '@/types';
import { computeRayPathToStation, computeTravelTimeCurve, computeWavefrontPoints } from '@/utils/physics';
import { validateAll } from '@/utils/validation';
import { getDefaultSample } from '@/utils/samples';

interface TravelTimePoint {
  distance: number;
  time: number;
  isValid: boolean;
}

interface SandboxState {
  epicenter: Epicenter;
  layers: MediumLayer[];
  stations: Station[];
  rayPaths: RayPath[];
  arrivals: ArrivalTime[];
  validationResults: ValidationResult[];
  pTravelCurve: TravelTimePoint[];
  sTravelCurve: TravelTimePoint[];
  activeSample: string | null;
  isAnimating: boolean;
  animationTime: number;
  animationSpeed: number;
  showPWave: boolean;
  showSWave: boolean;
  showRayPaths: boolean;
  showWavefront: boolean;
  selectedStation: string | null;
  correctionLog: Correction[];
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  correctionLogOpen: boolean;

  setEpicenterPosition: (pos: [number, number, number]) => void;
  setEpicenterDepth: (depth: number) => void;
  updateLayer: (id: string, updates: Partial<MediumLayer>) => void;
  addStation: (pos: [number, number, number]) => void;
  removeStation: (id: string) => void;
  updateStation: (id: string, updates: Partial<Station>) => void;
  loadSample: (sample: SampleData) => void;
  setActiveSample: (id: string | null) => void;
  toggleAnimation: () => void;
  setAnimationTime: (t: number) => void;
  setAnimationSpeed: (s: number) => void;
  setShowPWave: (v: boolean) => void;
  setShowSWave: (v: boolean) => void;
  setShowRayPaths: (v: boolean) => void;
  setShowWavefront: (v: boolean) => void;
  setSelectedStation: (id: string | null) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleCorrectionLog: () => void;
  recompute: () => void;
  addCorrection: (correction: Correction) => void;
  getWavefrontPoints: (waveType: 'P' | 'S') => [number, number, number][];
}

function recomputeDerivations(state: { epicenter: Epicenter; layers: MediumLayer[]; stations: Station[] }): {
  rayPaths: RayPath[];
  arrivals: ArrivalTime[];
  validationResults: ValidationResult[];
  pTravelCurve: TravelTimePoint[];
  sTravelCurve: TravelTimePoint[];
} {
  const { epicenter, layers, stations } = state;
  const epicenterDepth = -epicenter.position[1];
  const epicenterX = epicenter.position[0];
  const rayPaths: RayPath[] = [];
  const arrivals: ArrivalTime[] = [];

  stations.forEach(station => {
    const stationX = station.position[0];
    const dist = Math.abs(stationX - epicenterX);

    const pPath = computeRayPathToStation(stationX, 0, epicenterDepth, epicenterX, layers, 'P');
    pPath.stationId = station.id;
    rayPaths.push(pPath);

    const sPath = computeRayPathToStation(stationX, 0, epicenterDepth, epicenterX, layers, 'S');
    sPath.stationId = station.id;
    rayPaths.push(sPath);

    const pValid = pPath.isValid && pPath.travelTime > 0;
    const sValid = sPath.isValid && sPath.travelTime > 0;

    arrivals.push({
      stationId: station.id,
      waveType: 'P',
      time: pPath.travelTime,
      isValid: pValid,
      invalidReason: pValid ? undefined : pPath.validationErrors.join('; '),
    });
    arrivals.push({
      stationId: station.id,
      waveType: 'S',
      time: sPath.travelTime,
      isValid: sValid,
      invalidReason: sValid ? undefined : sPath.validationErrors.join('; '),
    });
  });

  const validationResults = validateAll(layers, arrivals, rayPaths);

  const pTravelCurve = computeTravelTimeCurve(epicenterDepth, epicenterX, layers, 'P', 300, 40);
  const sTravelCurve = computeTravelTimeCurve(epicenterDepth, epicenterX, layers, 'S', 300, 40);

  return { rayPaths, arrivals, validationResults, pTravelCurve, sTravelCurve };
}

const defaultSample = getDefaultSample();

const derivations = recomputeDerivations({
  epicenter: defaultSample.epicenter,
  layers: defaultSample.layers,
  stations: defaultSample.stations,
});

export const useSandboxStore = create<SandboxState>((set, get) => ({
  epicenter: defaultSample.epicenter,
  layers: defaultSample.layers,
  stations: defaultSample.stations,
  rayPaths: derivations.rayPaths,
  arrivals: derivations.arrivals,
  validationResults: derivations.validationResults,
  pTravelCurve: derivations.pTravelCurve,
  sTravelCurve: derivations.sTravelCurve,
  activeSample: defaultSample.id,
  isAnimating: false,
  animationTime: 0,
  animationSpeed: 1,
  showPWave: true,
  showSWave: true,
  showRayPaths: true,
  showWavefront: true,
  selectedStation: null,
  correctionLog: [],
  leftPanelOpen: true,
  rightPanelOpen: true,
  correctionLogOpen: false,

  setEpicenterPosition: (pos) => {
    set(state => {
      const correction: Correction = {
        id: `corr-${Date.now()}`,
        field: 'position',
        oldValue: JSON.stringify(state.epicenter.position),
        newValue: JSON.stringify(pos),
        reason: '拖拽震源位置',
        timestamp: new Date().toISOString(),
        source: '震源位置',
      };
      const newEpicenter = {
        ...state.epicenter,
        position: pos,
        updatedAt: new Date().toISOString(),
        corrections: [...state.epicenter.corrections, correction],
      };
      const newState = { ...state, epicenter: newEpicenter, correctionLog: [...state.correctionLog, correction] };
      const derivations = recomputeDerivations(newState);
      return { ...newState, ...derivations };
    });
  },

  setEpicenterDepth: (depth) => {
    set(state => {
      const newPos: [number, number, number] = [state.epicenter.position[0], -depth, state.epicenter.position[2]];
      const correction: Correction = {
        id: `corr-${Date.now()}`,
        field: 'depth',
        oldValue: `${-state.epicenter.position[1]}`,
        newValue: `${depth}`,
        reason: '调整震源深度',
        timestamp: new Date().toISOString(),
        source: '震源位置',
      };
      const newEpicenter = {
        ...state.epicenter,
        position: newPos,
        updatedAt: new Date().toISOString(),
        corrections: [...state.epicenter.corrections, correction],
      };
      const newState = { ...state, epicenter: newEpicenter, correctionLog: [...state.correctionLog, correction] };
      const derivations = recomputeDerivations(newState);
      return { ...newState, ...derivations };
    });
  },

  updateLayer: (id, updates) => {
    set(state => {
      const newLayers = state.layers.map(l => {
        if (l.id !== id) return l;
        const corrections: Correction[] = [...l.corrections];
        Object.entries(updates).forEach(([field, newValue]) => {
          const oldValue = String((l as unknown as Record<string, unknown>)[field]);
          corrections.push({
            id: `corr-${Date.now()}-${field}`,
            field,
            oldValue,
            newValue: String(newValue),
            reason: `修改层「${l.name}」的${field}`,
            timestamp: new Date().toISOString(),
            source: '介质速度',
          });
        });
        return { ...l, ...updates, updatedAt: new Date().toISOString(), corrections };
      });
      const newCorrectionLog = [...state.correctionLog];
      const oldLayer = state.layers.find(l => l.id === id);
      if (oldLayer) {
        Object.entries(updates).forEach(([field, newValue]) => {
          newCorrectionLog.push({
            id: `corr-${Date.now()}-${field}`,
            field,
            oldValue: String((oldLayer as unknown as Record<string, unknown>)[field]),
            newValue: String(newValue),
            reason: `修改层「${oldLayer.name}」的${field}`,
            timestamp: new Date().toISOString(),
            source: '介质速度',
          });
        });
      }
      const newState = { ...state, layers: newLayers, correctionLog: newCorrectionLog };
      const derivations = recomputeDerivations(newState);
      return { ...newState, ...derivations };
    });
  },

  addStation: (pos) => {
    set(state => {
      const id = `sta-${Date.now()}`;
      const dist = Math.round(Math.abs(pos[0] - state.epicenter.position[0]));
      const station: Station = {
        id,
        position: pos,
        label: `测站(${dist}km)`,
        source: '测站',
      };
      const newState = { ...state, stations: [...state.stations, station] };
      const derivations = recomputeDerivations(newState);
      return { ...newState, ...derivations };
    });
  },

  removeStation: (id) => {
    set(state => {
      const newState = { ...state, stations: state.stations.filter(s => s.id !== id) };
      const derivations = recomputeDerivations(newState);
      return { ...newState, ...derivations };
    });
  },

  updateStation: (id, updates) => {
    set(state => {
      const newStations = state.stations.map(s => s.id === id ? { ...s, ...updates } : s);
      const newState = { ...state, stations: newStations };
      const derivations = recomputeDerivations(newState);
      return { ...newState, ...derivations };
    });
  },

  loadSample: (sample) => {
    const derivations = recomputeDerivations({
      epicenter: sample.epicenter,
      layers: sample.layers,
      stations: sample.stations,
    });
    set({
      epicenter: sample.epicenter,
      layers: sample.layers,
      stations: sample.stations,
      activeSample: sample.id,
      animationTime: 0,
      isAnimating: false,
      ...derivations,
    });
  },

  setActiveSample: (id) => set({ activeSample: id }),

  toggleAnimation: () => set(state => ({ isAnimating: !state.isAnimating })),

  setAnimationTime: (t) => set({ animationTime: t }),

  setAnimationSpeed: (s) => set({ animationSpeed: s }),

  setShowPWave: (v) => set({ showPWave: v }),
  setShowSWave: (v) => set({ showSWave: v }),
  setShowRayPaths: (v) => set({ showRayPaths: v }),
  setShowWavefront: (v) => set({ showWavefront: v }),
  setSelectedStation: (id) => set({ selectedStation: id }),

  toggleLeftPanel: () => set(state => ({ leftPanelOpen: !state.leftPanelOpen })),
  toggleRightPanel: () => set(state => ({ rightPanelOpen: !state.rightPanelOpen })),
  toggleCorrectionLog: () => set(state => ({ correctionLogOpen: !state.correctionLogOpen })),

  recompute: () => {
    const state = get();
    const derivations = recomputeDerivations(state);
    set(derivations);
  },

  addCorrection: (correction) => {
    set(state => ({ correctionLog: [...state.correctionLog, correction] }));
  },

  getWavefrontPoints: (waveType) => {
    const state = get();
    return computeWavefrontPoints(
      state.animationTime,
      -state.epicenter.position[1],
      state.epicenter.position[0],
      state.layers,
      waveType,
      48
    );
  },
}));
