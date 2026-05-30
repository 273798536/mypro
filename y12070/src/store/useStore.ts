import { create } from 'zustand';
import { schemeA, schemeB, windConditions, powerRecords, maintenancePlans } from '../data/mockData';
import { calculateWakeDeficit } from '../utils/wakeModel';
import { detectCableCrossings } from '../utils/cableAnalysis';
import { detectMaintenanceConflicts } from '../utils/schemeComparison';
import type { WakeResult, CableCrossing, MaintenanceConflict } from '../data/types';

interface AppState {
  windDirection: number;
  windSpeed: number;
  currentTimestampIndex: number;
  isPlaying: boolean;
  activeSchemeId: string;
  comparisonMode: boolean;
  showWake: boolean;
  showCables: boolean;
  showVessels: boolean;
  showParticles: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  wakeResults: WakeResult[];
  cableCrossings: CableCrossing[];
  maintenanceConflicts: MaintenanceConflict[];

  setWindDirection: (dir: number) => void;
  setWindSpeed: (speed: number) => void;
  setCurrentTimestampIndex: (idx: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setActiveSchemeId: (id: string) => void;
  setComparisonMode: (mode: boolean) => void;
  setShowWake: (show: boolean) => void;
  setShowCables: (show: boolean) => void;
  setShowVessels: (show: boolean) => void;
  setShowParticles: (show: boolean) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  recalculate: () => void;
}

function getScheme(id: string) {
  return id === 'scheme-b' ? schemeB : schemeA;
}

function computeDerived(state: { windDirection: number; windSpeed: number; activeSchemeId: string }) {
  const scheme = getScheme(state.activeSchemeId);
  const wakeResults = calculateWakeDeficit(scheme.turbines, state.windDirection, state.windSpeed);
  const cableCrossings = detectCableCrossings(scheme.cables);
  const maintenanceConflicts = detectMaintenanceConflicts(maintenancePlans);
  return { wakeResults, cableCrossings, maintenanceConflicts };
}

export const useStore = create<AppState>((set, get) => {
  const initial = {
    windDirection: windConditions[0].direction,
    windSpeed: windConditions[0].speed,
    activeSchemeId: 'scheme-a',
  };

  const derived = computeDerived(initial);

  return {
    ...initial,
    currentTimestampIndex: 0,
    isPlaying: false,
    comparisonMode: false,
    showWake: true,
    showCables: true,
    showVessels: true,
    showParticles: true,
    leftPanelOpen: true,
    rightPanelOpen: true,

    ...derived,

    setWindDirection: (dir) => {
      set({ windDirection: dir });
      const s = get();
      set(computeDerived({ windDirection: dir, windSpeed: s.windSpeed, activeSchemeId: s.activeSchemeId }));
    },
    setWindSpeed: (speed) => {
      set({ windSpeed: speed });
      const s = get();
      set(computeDerived({ windDirection: s.windDirection, windSpeed: speed, activeSchemeId: s.activeSchemeId }));
    },
    setCurrentTimestampIndex: (idx) => {
      set({ currentTimestampIndex: idx });
      const wc = windConditions[idx];
      if (wc) {
        set({ windDirection: wc.direction, windSpeed: wc.speed });
        const s = get();
        set(computeDerived({ windDirection: wc.direction, windSpeed: wc.speed, activeSchemeId: s.activeSchemeId }));
      }
    },
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setActiveSchemeId: (id) => {
      set({ activeSchemeId: id });
      const s = get();
      set(computeDerived({ windDirection: s.windDirection, windSpeed: s.windSpeed, activeSchemeId: id }));
    },
    setComparisonMode: (mode) => set({ comparisonMode: mode }),
    setShowWake: (show) => set({ showWake: show }),
    setShowCables: (show) => set({ showCables: show }),
    setShowVessels: (show) => set({ showVessels: show }),
    setShowParticles: (show) => set({ showParticles: show }),
    setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
    setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
    recalculate: () => {
      const s = get();
      set(computeDerived({ windDirection: s.windDirection, windSpeed: s.windSpeed, activeSchemeId: s.activeSchemeId }));
    },
  };
});
