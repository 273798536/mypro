import { create } from 'zustand';
import type { BuoyDataPoint, AnomalyPoint, MaintenanceNote, RunStatus } from '@/types';
import { buoyData as initialBuoyData, anomalyPoints as initialAnomalies } from '@/data/buoyData';
import { maintenanceNotes as initialNotes } from '@/data/notes';

interface DataState {
  buoyData: BuoyDataPoint[];
  anomalies: AnomalyPoint[];
  notes: MaintenanceNote[];
  selectedDataId: string | null;
  selectedAnomalyId: string | null;
  loading: boolean;
  runStatus: RunStatus;
  runProgress: number;
  setSelectedDataId: (id: string | null) => void;
  setSelectedAnomalyId: (id: string | null) => void;
  selectDataAndAnomaly: (dataId: string, anomalyId: string | null) => void;
  startRun: () => void;
  updateRunProgress: (progress: number) => void;
  completeRun: () => void;
  failRun: () => void;
  updateAnomalyStatus: (anomalyId: string, status: AnomalyPoint['status']) => void;
  setBuoyData: (data: BuoyDataPoint[]) => void;
  getSelectedData: () => BuoyDataPoint | undefined;
  getSelectedAnomaly: () => AnomalyPoint | undefined;
  getRelatedNotes: (dataId: string) => MaintenanceNote[];
}

export const useDataStore = create<DataState>((set, get) => ({
  buoyData: initialBuoyData,
  anomalies: initialAnomalies,
  notes: initialNotes,
  selectedDataId: 'data-0012',
  selectedAnomalyId: 'anom-001',
  loading: false,
  runStatus: 'idle',
  runProgress: 0,

  setSelectedDataId: (id) => set({ selectedDataId: id }),
  
  setSelectedAnomalyId: (id) => set({ selectedAnomalyId: id }),
  
  selectDataAndAnomaly: (dataId, anomalyId) => set({
    selectedDataId: dataId,
    selectedAnomalyId: anomalyId,
  }),

  startRun: () => set({ runStatus: 'running', runProgress: 0 }),
  
  updateRunProgress: (progress) => set({ runProgress: progress }),
  
  completeRun: () => set({ runStatus: 'completed', runProgress: 100 }),
  
  failRun: () => set({ runStatus: 'failed', runProgress: 0 }),

  updateAnomalyStatus: (anomalyId, status) => set((state) => ({
    anomalies: state.anomalies.map((a) =>
      a.id === anomalyId ? { ...a, status } : a
    ),
  })),

  setBuoyData: (data) => set({ buoyData: data }),

  getSelectedData: () => {
    const { buoyData, selectedDataId } = get();
    return buoyData.find((d) => d.id === selectedDataId);
  },

  getSelectedAnomaly: () => {
    const { anomalies, selectedAnomalyId } = get();
    return anomalies.find((a) => a.id === selectedAnomalyId);
  },

  getRelatedNotes: (dataId) => {
    const { notes } = get();
    return notes.filter((note) => note.relatedDataIds.includes(dataId));
  },
}));
