
import { create } from 'zustand';
import type {
  Airfoil,
  Alert,
  DataSource,
  ExperimentParams,
  ExperimentRecord,
  Modification,
  PressureField,
} from '../types';
import { getDefaultAirfoil } from '../data/airfoils';
import { calculatePressureField, calculateReynoldsNumber } from '../utils/pressureCalc';
import { createSampleRecords } from '../data/sampleRecords';

interface ExperimentState {
  airfoil: Airfoil;
  params: ExperimentParams;
  pressureField: PressureField | null;
  records: ExperimentRecord[];
  alerts: Alert[];
  selectedRecordId: string | null;
  isLoading: boolean;

  setAirfoil: (airfoil: Airfoil) => void;
  setAngleOfAttack: (angle: number) => void;
  setVelocity: (velocity: number) => void;
  updateParams: (updates: Partial<ExperimentParams>) => void;

  calculateField: () => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;

  saveRecord: (source: DataSource, notes?: string, sourceNote?: string) => void;
  loadRecord: (id: string) => void;
  deleteRecord: (id: string) => void;
  selectRecord: (id: string | null) => void;

  addModification: (field: string, oldValue: unknown, newValue: unknown, reason: string) => void;

  initializeWithSamples: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const defaultParams: ExperimentParams = {
  angleOfAttack: 5,
  velocity: 50,
  airDensity: 1.225,
  reynoldsNumber: 3.3e6,
};

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  airfoil: getDefaultAirfoil(),
  params: defaultParams,
  pressureField: null,
  records: [],
  alerts: [],
  selectedRecordId: null,
  isLoading: false,

  setAirfoil: (airfoil) => {
    const { params } = get();
    const reynoldsNumber = calculateReynoldsNumber(params.velocity, airfoil.chordLength);
    set({
      airfoil,
      params: { ...params, reynoldsNumber },
    });
    get().calculateField();
  },

  setAngleOfAttack: (angle) => {
    const { params, airfoil } = get();
    const oldValue = params.angleOfAttack;
    set({
      params: { ...params, angleOfAttack: angle },
    });
    get().addModification('angleOfAttack', oldValue, angle, '用户调整迎角');
    get().calculateField();
  },

  setVelocity: (velocity) => {
    const { params, airfoil } = get();
    const oldValue = params.velocity;
    const reynoldsNumber = calculateReynoldsNumber(velocity, airfoil.chordLength);
    set({
      params: { ...params, velocity, reynoldsNumber },
    });
    get().addModification('velocity', oldValue, velocity, '用户调整速度');
    get().calculateField();
  },

  updateParams: (updates) => {
    const { params, airfoil } = get();
    const newParams = { ...params, ...updates };
    if (updates.velocity !== undefined) {
      newParams.reynoldsNumber = calculateReynoldsNumber(updates.velocity, airfoil.chordLength);
    }
    set({ params: newParams });
    get().calculateField();
  },

  calculateField: () => {
    const { airfoil, params } = get();
    const pressureField = calculatePressureField(airfoil, params);
    set({ pressureField });
  },

  addAlert: (alert) => {
    set((state) => ({
      alerts: [...state.alerts, alert],
    }));
  },

  removeAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    }));
  },

  clearAlerts: () => {
    set({ alerts: [] });
  },

  saveRecord: (source, notes = '', sourceNote) => {
    const { airfoil, params, pressureField } = get();
    if (!pressureField) return;

    const now = new Date().toISOString();
    const record: ExperimentRecord = {
      id: `record-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      airfoil: { ...airfoil },
      params: { ...params },
      pressureField: { ...pressureField },
      source,
      sourceNote,
      modificationHistory: [],
      notes,
      tags: [],
    };

    set((state) => ({
      records: [...state.records, record],
    }));
    get().saveToStorage();
  },

  loadRecord: (id) => {
    const { records } = get();
    const record = records.find((r) => r.id === id);
    if (!record) return;

    set({
      airfoil: { ...record.airfoil },
      params: { ...record.params },
      pressureField: { ...record.pressureField },
      selectedRecordId: id,
    });
  },

  deleteRecord: (id) => {
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
      selectedRecordId: state.selectedRecordId === id ? null : state.selectedRecordId,
    }));
    get().saveToStorage();
  },

  selectRecord: (id) => {
    set({ selectedRecordId: id });
  },

  addModification: (field, oldValue, newValue, reason) => {
    if (oldValue === newValue) return;

    const modification: Modification = {
      timestamp: new Date().toISOString(),
      field,
      oldValue,
      newValue,
      reason,
    };

    set((state) => {
      if (state.selectedRecordId) {
        const records = state.records.map((r) =>
          r.id === state.selectedRecordId
            ? {
                ...r,
                updatedAt: modification.timestamp,
                modificationHistory: [...r.modificationHistory, modification],
              }
            : r
        );
        return { records };
      }
      return {};
    });
  },

  initializeWithSamples: () => {
    const samples = createSampleRecords();
    set({ records: samples });
    get().calculateField();
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem('windTunnelRecords');
      if (stored) {
        const records = JSON.parse(stored) as ExperimentRecord[];
        set({ records });
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  },

  saveToStorage: () => {
    try {
      const { records } = get();
      localStorage.setItem('windTunnelRecords', JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save to storage:', e);
    }
  },
}));
