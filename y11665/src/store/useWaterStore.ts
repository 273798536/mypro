import { create } from 'zustand';
import type { PipeSegment, Valve, PumpStation, UserArea, DispatchRecord, AnomalyItem, ReportData } from '@/types';
import { mockSegments, mockValves, mockPumpStations, mockUserAreas, mockDispatchRecords, PRESSURE_THRESHOLD } from '@/data/mockData';
import { recalculatePressures, detectAnomalies } from '@/hooks/usePressureCalc';

interface WaterState {
  segments: PipeSegment[];
  valves: Valve[];
  pumpStations: PumpStation[];
  userAreas: UserArea[];
  dispatchRecords: DispatchRecord[];
  anomalies: AnomalyItem[];
  selectedSegmentId: string | null;
  selectedValveId: string | null;
  hoveredSegmentId: string | null;
  pressureThreshold: number;
  isPlaying: boolean;
  playbackTime: number;
  filterDataQuality: ('good' | 'boundary' | 'bad')[];

  toggleValve: (valveId: string) => void;
  saveValveState: (valveId: string) => void;
  selectSegment: (segmentId: string | null) => void;
  selectValve: (valveId: string | null) => void;
  setHoveredSegment: (segmentId: string | null) => void;
  setPressureThreshold: (threshold: number) => void;
  setFilterDataQuality: (filters: ('good' | 'boundary' | 'bad')[]) => void;
  acknowledgeAnomaly: (anomalyId: string) => void;
  setPlaybackTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  generateReport: (startTime: number, endTime: number) => ReportData;
  addDispatchRecord: (record: Omit<DispatchRecord, 'id' | 'timestamp'>) => void;
}

export const useWaterStore = create<WaterState>((set, get) => ({
  segments: mockSegments,
  valves: mockValves,
  pumpStations: mockPumpStations,
  userAreas: mockUserAreas,
  dispatchRecords: mockDispatchRecords,
  anomalies: detectAnomalies(mockSegments, mockValves, PRESSURE_THRESHOLD),
  selectedSegmentId: null,
  selectedValveId: null,
  hoveredSegmentId: null,
  pressureThreshold: PRESSURE_THRESHOLD,
  isPlaying: false,
  playbackTime: 0,
  filterDataQuality: ['good', 'boundary', 'bad'],

  toggleValve: (valveId) => {
    const state = get();
    const valve = state.valves.find(v => v.id === valveId);
    if (!valve) return;

    const newValves = state.valves.map(v =>
      v.id === valveId ? { ...v, isOpen: !v.isOpen, lastModified: Date.now() } : v
    );
    const newSegments = recalculatePressures(state.segments, newValves, state.pumpStations);
    const newAnomalies = detectAnomalies(newSegments, newValves, state.pressureThreshold);

    const record: Omit<DispatchRecord, 'id' | 'timestamp'> = {
      valveId,
      valveName: valve.pipeSegmentId + '阀门',
      action: valve.isOpen ? 'close' : 'open',
      operator: '当前调度员',
      notes: valve.isOpen ? '关闭阀门操作' : '开启阀门操作',
      beforePressure: 0,
      afterPressure: 0,
    };

    set({
      valves: newValves,
      segments: newSegments,
      anomalies: newAnomalies,
      dispatchRecords: [...state.dispatchRecords, {
        ...record,
        id: 'DR' + Date.now(),
        timestamp: Date.now(),
      }],
    });
  },

  saveValveState: (valveId) => {
    set(state => ({
      valves: state.valves.map(v =>
        v.id === valveId ? { ...v, isSaved: true } : v
      ),
      anomalies: state.anomalies.filter(a => !(a.type === 'unsaved_state' && a.locationId === valveId)),
    }));
  },

  selectSegment: (segmentId) => set({ selectedSegmentId: segmentId }),
  selectValve: (valveId) => set({ selectedValveId: valveId }),
  setHoveredSegment: (segmentId) => set({ hoveredSegmentId: segmentId }),
  setPressureThreshold: (threshold) => {
    set(state => ({
      pressureThreshold: threshold,
      anomalies: detectAnomalies(state.segments, state.valves, threshold),
    }));
  },
  setFilterDataQuality: (filters) => set({ filterDataQuality: filters }),
  acknowledgeAnomaly: (anomalyId) => {
    set(state => ({
      anomalies: state.anomalies.map(a =>
        a.id === anomalyId ? { ...a, acknowledged: true } : a
      ),
    }));
  },

  setPlaybackTime: (time) => set({ playbackTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  generateReport: (startTime, endTime) => {
    const state = get();
    const records = state.dispatchRecords.filter(r => r.timestamp >= startTime && r.timestamp <= endTime);
    const anomalies = state.anomalies.filter(a => a.timestamp >= startTime && a.timestamp <= endTime);
    const validSegments = state.segments.filter(s => s.dataQuality !== 'bad' && s.currentPressure >= 0);
    const pressures = validSegments.map(s => s.currentPressure);

    return {
      periodStart: startTime,
      periodEnd: endTime,
      dispatchRecords: records,
      anomalies,
      pressureSummary: {
        min: pressures.length ? Math.min(...pressures) : 0,
        max: pressures.length ? Math.max(...pressures) : 0,
        avg: pressures.length ? pressures.reduce((a, b) => a + b, 0) / pressures.length : 0,
        segments: validSegments.length,
      },
      corrections: state.segments.flatMap(s => s.corrections),
    };
  },

  addDispatchRecord: (record) => {
    set(state => ({
      dispatchRecords: [...state.dispatchRecords, {
        ...record,
        id: 'DR' + Date.now(),
        timestamp: Date.now(),
      }],
    }));
  },
}));
