import { create } from 'zustand';
import type { CalcParams, CalcResult, CalcRecord } from '../types';
import { DRONE_SPECS, BATTERY_SPECS } from '../types';
import { calcEnergy } from '../utils/energyModel';
import { generateWarnings } from '../utils/warningEngine';

interface CalcState {
  params: CalcParams;
  result: CalcResult;
  records: CalcRecord[];
  setParams: (params: Partial<CalcParams>) => void;
  recalculate: () => void;
  loadRecords: () => void;
}

const defaultParams: CalcParams = {
  droneId: 'dji-m300',
  batteryId: 'dji-tb60',
  payload: 2.0,
  windSpeed: 5.0,
  windDirection: 270,
  routeDistance: 3000,
  altitude: 100,
  returnReserveRatio: 0.25,
  sourceRef: '现场测量数据'
};

export const useCalcStore = create<CalcState>((set, get) => ({
  params: defaultParams,
  result: {
    totalEnergyNeeded: 0,
    breakdown: {
      hoverEnergy: 0,
      climbEnergy: 0,
      cruiseOutEnergy: 0,
      cruiseBackEnergy: 0,
      windPenalty: 0,
      payloadPenalty: 0
    },
    reserveEnergy: 0,
    remainingEnergy: 0,
    flightTime: 0,
    effectiveRange: 0,
    warnings: []
  },
  records: [],

  setParams: (newParams) => {
    const params = { ...get().params, ...newParams };
    const drone = DRONE_SPECS.find(d => d.id === params.droneId) || DRONE_SPECS[0];
    const battery = BATTERY_SPECS.find(b => b.id === params.batteryId) || BATTERY_SPECS[0];
    const result = calcEnergy(params, drone, battery);
    result.warnings = generateWarnings(params, drone, battery, result);
    set({ params, result });
  },

  recalculate: () => {
    const { params } = get();
    const drone = DRONE_SPECS.find(d => d.id === params.droneId) || DRONE_SPECS[0];
    const battery = BATTERY_SPECS.find(b => b.id === params.batteryId) || BATTERY_SPECS[0];
    const result = calcEnergy(params, drone, battery);
    result.warnings = generateWarnings(params, drone, battery, result);
    set({ result });
  },

  loadRecords: () => {
    const records: CalcRecord[] = [];
    try {
      const data = localStorage.getItem('droneCalcRecords');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          records.push(...parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load records:', e);
    }
    set({ records });
  }
}));
