import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AmortizationRecord,
  Correction,
  ImportLog,
  CloudBill,
  ReservedInstance,
  SharedGateway,
  Project,
  Anomaly,
} from '@/types';
import {
  projects,
  cloudBills,
  reservedInstances,
  sharedGateways,
  amortizationRecords,
  corrections,
  importLogs,
  anomalies,
} from '@/data/mockData';

interface AmortizationState {
  amortizationRecords: AmortizationRecord[];
  corrections: Correction[];
  importLogs: ImportLog[];
  cloudBills: CloudBill[];
  resourceTags: any[];
  reservedInstances: ReservedInstance[];
  sharedGateways: SharedGateway[];
  projects: Project[];
  anomalies: Anomaly[];
}

interface AmortizationActions {
  addAmortizationRecord: (record: Omit<AmortizationRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAmortizationRecord: (id: string, updates: Partial<AmortizationRecord>) => void;
  deleteAmortizationRecord: (id: string) => void;
  addCorrection: (correction: Omit<Correction, 'id' | 'createdAt'>) => void;
  addImportLog: (log: Omit<ImportLog, 'id' | 'createdAt'>) => void;
  updateProjectStatus: (projectId: string, status: string) => void;
}

const generateId = (): string => {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export const useAmortizationStore = create<AmortizationState & AmortizationActions>()(
  persist(
    (set) => ({
      amortizationRecords: [],
      corrections: [],
      importLogs: [],
      cloudBills: [],
      resourceTags: [],
      reservedInstances: [],
      sharedGateways: [],
      projects: [],
      anomalies: [],

      addAmortizationRecord: (record) =>
        set((state) => ({
          amortizationRecords: [
            ...state.amortizationRecords,
            {
              ...record,
              id: generateId(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateAmortizationRecord: (id, updates) =>
        set((state) => ({
          amortizationRecords: state.amortizationRecords.map((record) =>
            record.id === id
              ? { ...record, ...updates, updatedAt: new Date().toISOString() }
              : record
          ),
        })),

      deleteAmortizationRecord: (id) =>
        set((state) => ({
          amortizationRecords: state.amortizationRecords.filter((record) => record.id !== id),
        })),

      addCorrection: (correction) =>
        set((state) => ({
          corrections: [
            ...state.corrections,
            {
              ...correction,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      addImportLog: (log) =>
        set((state) => ({
          importLogs: [
            ...state.importLogs,
            {
              ...log,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateProjectStatus: (projectId, status) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId ? { ...project, status } : project
          ),
        })),
    }),
    {
      name: 'amortization-store',
      onRehydrateStorage: () => (state) => {
        if (state && state.amortizationRecords.length === 0) {
          state.amortizationRecords = amortizationRecords;
          state.corrections = corrections;
          state.importLogs = importLogs;
          state.cloudBills = cloudBills;
          state.reservedInstances = reservedInstances;
          state.sharedGateways = sharedGateways;
          state.projects = projects;
          state.anomalies = anomalies;
        }
      },
    }
  )
);

export default useAmortizationStore;
