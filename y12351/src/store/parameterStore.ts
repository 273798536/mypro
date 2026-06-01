import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ScanParameter,
  InterfaceResult,
  Anomaly,
  VersionHistory,
  TissueType,
  ArtifactType,
} from '../types';
import {
  mockScanParameters,
  mockInterfaceResults,
  mockAnomalies,
  mockVersionHistories,
  calculateInterfaceResult,
  detectAnomalies,
  calculateInterfaceNames,
  generateId,
} from '../services/mockData';

interface ParameterState {
  parameters: ScanParameter[];
  currentParameter: ScanParameter | null;
  interfaceResults: InterfaceResult[];
  anomalies: Anomaly[];
  versionHistories: VersionHistory[];
  isCalculating: boolean;
  selectedParameterId: string | null;

  setSelectedParameter: (id: string | null) => void;
  addParameter: (data: Partial<ScanParameter>) => string;
  updateParameter: (id: string, data: Partial<ScanParameter>) => void;
  deleteParameter: (id: string) => void;
  
  calculateResults: (parameterId: string) => Promise<void>;
  runAnomalyDetection: (parameterId: string) => void;
  
  correctTissueType: (parameterId: string, newType: TissueType, reason?: string) => void;
  updateArtifactLabel: (parameterId: string, newLabel: ArtifactType, reason?: string) => void;
  
  resolveAnomaly: (anomalyId: string, handlerNote?: string) => void;
  confirmAnomaly: (anomalyId: string) => void;
  
  getParameterResults: (parameterId: string) => InterfaceResult[];
  getParameterAnomalies: (parameterId: string) => Anomaly[];
  getParameterHistories: (parameterId: string) => VersionHistory[];
  
  resetToMockData: () => void;
}

export const useParameterStore = create<ParameterState>()(
  persist(
    (set, get) => ({
      parameters: mockScanParameters,
      currentParameter: null,
      interfaceResults: mockInterfaceResults,
      anomalies: mockAnomalies,
      versionHistories: mockVersionHistories,
      isCalculating: false,
      selectedParameterId: null,

      setSelectedParameter: (id) => {
        const param = get().parameters.find((p) => p.id === id);
        set({ selectedParameterId: id, currentParameter: param || null });
      },

      addParameter: (data) => {
        const now = new Date().toISOString();
        const newParam: ScanParameter = {
          id: generateId(),
          scanType: data.scanType || '',
          tr: data.tr || 0,
          te: data.te || 0,
          flipAngle: data.flipAngle || 0,
          sliceThickness: data.sliceThickness,
          fov: data.fov,
          matrix: data.matrix,
          bandwidth: data.bandwidth,
          nex: data.nex,
          tissueType: data.tissueType,
          artifactLabel: data.artifactLabel,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          parameters: [...state.parameters, newParam],
        }));
        return newParam.id;
      },

      updateParameter: (id, data) => {
        set((state) => ({
          parameters: state.parameters.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
          currentParameter:
            state.currentParameter?.id === id
              ? { ...state.currentParameter, ...data, updatedAt: new Date().toISOString() }
              : state.currentParameter,
        }));
      },

      deleteParameter: (id) => {
        set((state) => ({
          parameters: state.parameters.filter((p) => p.id !== id),
          interfaceResults: state.interfaceResults.filter((r) => r.parameterId !== id),
          anomalies: state.anomalies.filter((a) => a.parameterId !== id),
          versionHistories: state.versionHistories.filter((v) => v.parameterId !== id),
          currentParameter: state.currentParameter?.id === id ? null : state.currentParameter,
          selectedParameterId: state.selectedParameterId === id ? null : state.selectedParameterId,
        }));
      },

      calculateResults: async (parameterId) => {
        set({ isCalculating: true });
        const param = get().parameters.find((p) => p.id === parameterId);
        if (!param) {
          set({ isCalculating: false });
          return;
        }

        const results: InterfaceResult[] = [];
        for (const name of calculateInterfaceNames) {
          const result = await calculateInterfaceResult(param, name);
          results.push(result);
        }

        set((state) => {
          const filtered = state.interfaceResults.filter((r) => r.parameterId !== parameterId);
          return {
            interfaceResults: [...filtered, ...results],
            isCalculating: false,
          };
        });

        get().runAnomalyDetection(parameterId);
        get().updateParameter(parameterId, { status: 'pending' });
      },

      runAnomalyDetection: (parameterId) => {
        const param = get().parameters.find((p) => p.id === parameterId);
        const results = get().getParameterResults(parameterId);
        if (!param || results.length === 0) return;

        const newAnomalies = detectAnomalies(param, results);
        set((state) => {
          const filtered = state.anomalies.filter((a) => a.parameterId !== parameterId);
          const hasAnomalies = newAnomalies.length > 0;
          return {
            anomalies: [...filtered, ...newAnomalies],
            parameters: state.parameters.map((p) =>
              p.id === parameterId
                ? { ...p, status: hasAnomalies ? ('anomaly' as const) : ('pending' as const) }
                : p
            ),
          };
        });
      },

      correctTissueType: (parameterId, newType, reason) => {
        const param = get().parameters.find((p) => p.id === parameterId);
        if (!param) return;

        const oldType = param.tissueType;
        const histories = get().getParameterHistories(parameterId);
        const newVersion = histories.length + 1;

        const history: VersionHistory = {
          id: generateId(),
          parameterId,
          version: newVersion,
          beforeData: { tissueType: oldType },
          afterData: { tissueType: newType },
          modifiedBy: '医学物理讲师',
          changeReason: reason,
          impactAnalysis: {
            artifactInterpretationChange: true,
            qualityScoreChange: Math.round((Math.random() - 0.3) * 10),
            recommendationChange: Math.random() > 0.5,
          },
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          parameters: state.parameters.map((p) =>
            p.id === parameterId ? { ...p, tissueType: newType, updatedAt: new Date().toISOString() } : p
          ),
          versionHistories: [...state.versionHistories, history],
        }));
      },

      updateArtifactLabel: (parameterId, newLabel, reason) => {
        const param = get().parameters.find((p) => p.id === parameterId);
        if (!param) return;

        const oldLabel = param.artifactLabel;
        const histories = get().getParameterHistories(parameterId);
        const newVersion = histories.length + 1;

        const history: VersionHistory = {
          id: generateId(),
          parameterId,
          version: newVersion,
          beforeData: { artifactLabel: oldLabel },
          afterData: { artifactLabel: newLabel },
          modifiedBy: '医学物理讲师',
          changeReason: reason,
          impactAnalysis: {
            artifactInterpretationChange: true,
            qualityScoreChange: Math.round((Math.random() - 0.5) * 10),
            recommendationChange: Math.random() > 0.6,
          },
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          parameters: state.parameters.map((p) =>
            p.id === parameterId ? { ...p, artifactLabel: newLabel, updatedAt: new Date().toISOString() } : p
          ),
          versionHistories: [...state.versionHistories, history],
        }));
      },

      resolveAnomaly: (anomalyId, handlerNote) => {
        set((state) => ({
          anomalies: state.anomalies.map((a) =>
            a.id === anomalyId ? { ...a, status: 'resolved', handlerNote } : a
          ),
        }));
      },

      confirmAnomaly: (anomalyId) => {
        set((state) => ({
          anomalies: state.anomalies.map((a) =>
            a.id === anomalyId ? { ...a, status: 'confirmed' } : a
          ),
        }));
      },

      getParameterResults: (parameterId) => {
        return get().interfaceResults.filter((r) => r.parameterId === parameterId);
      },

      getParameterAnomalies: (parameterId) => {
        return get().anomalies.filter((a) => a.parameterId === parameterId);
      },

      getParameterHistories: (parameterId) => {
        return get().versionHistories.filter((v) => v.parameterId === parameterId);
      },

      resetToMockData: () => {
        set({
          parameters: mockScanParameters,
          interfaceResults: mockInterfaceResults,
          anomalies: mockAnomalies,
          versionHistories: mockVersionHistories,
          currentParameter: null,
          selectedParameterId: null,
        });
      },
    }),
    {
      name: 'mri-parameter-storage',
    }
  )
);
