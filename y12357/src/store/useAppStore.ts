import { create } from 'zustand';
import type {
  AppState,
  AppActions,
  Flywheel,
  AngularVelocityRecord,
  InertiaResult,
  MeasurementReport,
} from '../types';
import { mockFlywheels } from '../data/mockFlywheels';
import { mockVelocities, mockGaps } from '../data/mockVelocities';
import { mockReports } from '../data/mockReports';
import { calculateInertiaResult, calculateBatchComparison } from '../engine/inertiaCalculator';
import { detectAllErrors } from '../engine/errorDetector';
import { generateReport } from '../engine/reportGenerator';
import { convertToMeters } from '../utils/unitConverter';

type StoreState = AppState & AppActions;

export const useAppStore = create<StoreState>((set, get) => ({
  flywheels: [],
  selectedFlywheelId: null,
  angularVelocities: [],
  samplingGaps: [],
  unitErrors: [],
  frictionOmissions: [],
  inertiaResults: [],
  reports: [],
  selectedTimeRange: null,
  isPlaying: false,
  playbackSpeed: 1,
  currentTime: 0,
  showDetailPanel: false,
  selectedResultId: null,

  loadMockData: () => {
    const flywheels = [...mockFlywheels];
    const velocities = [...mockVelocities];
    const reports = [...mockReports];
    
    const errors = detectAllErrors(flywheels, velocities, reports);
    const gaps = [...mockGaps, ...errors.samplingGaps];
    
    const uniqueGaps = gaps.filter((gap, index, self) =>
      index === self.findIndex(g => g.startTime === gap.startTime && g.flywheelId === gap.flywheelId)
    );
    
    const results: InertiaResult[] = [];
    flywheels.forEach(fw => {
      const result = calculateInertiaResult(fw, velocities);
      result.gapsInvolved = uniqueGaps.filter(g => g.flywheelId === fw.id).map(g => g.id);
      result.errorsInvolved = errors.unitErrors.filter(e => e.flywheelId === fw.id).map(e => e.id);
      results.push(result);
    });
    
    const maxTime = Math.max(...velocities.map(v => v.timestamp), 20);
    
    set({
      flywheels,
      selectedFlywheelId: flywheels[0]?.id || null,
      angularVelocities: velocities,
      samplingGaps: uniqueGaps,
      unitErrors: errors.unitErrors,
      frictionOmissions: errors.frictionOmissions,
      inertiaResults: results,
      reports,
      selectedTimeRange: [0, maxTime],
      currentTime: 0,
    });
  },

  setSelectedFlywheel: (id: string | null) => {
    set({ selectedFlywheelId: id });
    get().recalculateInertia();
  },

  updateFlywheel: (flywheel: Flywheel) => {
    const rawValue = parseFloat(flywheel.rawRadiusInput);
    if (!isNaN(rawValue)) {
      flywheel.radius = convertToMeters(rawValue, flywheel.radiusUnit);
    }
    
    set(state => ({
      flywheels: state.flywheels.map(fw => 
        fw.id === flywheel.id ? { ...flywheel } : fw
      ),
    }));
    
    get().detectErrors();
    get().recalculateInertia();
  },

  setSelectedTimeRange: (range: [number, number] | null) => {
    set({ selectedTimeRange: range });
    get().recalculateInertia();
  },

  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed });
  },

  setCurrentTime: (time: number | ((prev: number) => number)) => {
    set(state => ({ 
      currentTime: typeof time === 'function' ? time(state.currentTime) : time 
    }));
  },

  setShowDetailPanel: (show: boolean) => {
    set({ showDetailPanel: show });
  },

  setSelectedResultId: (id: string | null) => {
    set({ selectedResultId: id });
  },

  addAngularVelocityRecord: (record: AngularVelocityRecord) => {
    set(state => ({
      angularVelocities: [...state.angularVelocities, record],
    }));
    get().detectErrors();
    get().recalculateInertia();
  },

  importAngularVelocities: (records: AngularVelocityRecord[]) => {
    set(state => ({
      angularVelocities: [...state.angularVelocities, ...records],
    }));
    get().detectErrors();
    get().recalculateInertia();
  },

  recalculateInertia: () => {
    const { flywheels, angularVelocities, selectedTimeRange, samplingGaps, unitErrors } = get();
    
    const results: InertiaResult[] = [];
    flywheels.forEach(fw => {
      const result = calculateInertiaResult(fw, angularVelocities, selectedTimeRange || undefined);
      result.gapsInvolved = samplingGaps.filter(g => g.flywheelId === fw.id).map(g => g.id);
      result.errorsInvolved = unitErrors.filter(e => e.flywheelId === fw.id).map(e => e.id);
      results.push(result);
    });
    
    set({ inertiaResults: results });
  },

  detectErrors: () => {
    const { flywheels, angularVelocities, reports } = get();
    const errors = detectAllErrors(flywheels, angularVelocities, reports);
    
    set({
      samplingGaps: errors.samplingGaps,
      unitErrors: errors.unitErrors,
      frictionOmissions: errors.frictionOmissions,
    });
  },

  generateReport: () => {
    const {
      selectedFlywheelId,
      flywheels,
      angularVelocities,
      inertiaResults,
      samplingGaps,
      unitErrors,
      frictionOmissions,
      selectedTimeRange,
    } = get();
    
    const flywheel = flywheels.find(f => f.id === selectedFlywheelId);
    if (!flywheel) {
      throw new Error('No flywheel selected');
    }
    
    const report = generateReport(
      flywheel,
      angularVelocities,
      inertiaResults,
      samplingGaps,
      unitErrors,
      frictionOmissions,
      selectedTimeRange || undefined
    );
    
    set(state => ({
      reports: [...state.reports, report],
    }));
    
    return report;
  },
}));

export const useSelectedFlywheel = () => {
  const { flywheels, selectedFlywheelId } = useAppStore();
  return flywheels.find(f => f.id === selectedFlywheelId) || null;
};

export const useSelectedResult = () => {
  const { inertiaResults, selectedResultId, selectedFlywheelId } = useAppStore();
  if (selectedResultId) {
    return inertiaResults.find(r => r.id === selectedResultId) || null;
  }
  return inertiaResults.find(r => r.flywheelId === selectedFlywheelId) || null;
};

export const useFlywheelVelocities = (flywheelId?: string) => {
  const { angularVelocities, selectedFlywheelId } = useAppStore();
  const id = flywheelId || selectedFlywheelId;
  return angularVelocities.filter(v => v.flywheelId === id).sort((a, b) => a.timestamp - b.timestamp);
};

export const useFlywheelErrors = (flywheelId?: string) => {
  const { unitErrors, frictionOmissions, samplingGaps, selectedFlywheelId } = useAppStore();
  const id = flywheelId || selectedFlywheelId;
  
  return {
    unitErrors: unitErrors.filter(e => e.flywheelId === id),
    frictionOmissions: frictionOmissions.filter(o => o.flywheelId === id),
    samplingGaps: samplingGaps.filter(g => g.flywheelId === id),
  };
};

export const useBatchComparison = () => {
  const { inertiaResults, flywheels } = useAppStore();
  return calculateBatchComparison(inertiaResults, flywheels);
};
