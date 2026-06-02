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
  computeResults,
  detectAnomalies,
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

function buildImpact(
  oldResults: InterfaceResult[],
  newResults: InterfaceResult[]
): VersionHistory['impactAnalysis'] {
  const oldAvg = oldResults.reduce((s, r) => s + (r.resultData.qualityScore || 0), 0) / (oldResults.length || 1);
  const newAvg = newResults.reduce((s, r) => s + (r.resultData.qualityScore || 0), 0) / (newResults.length || 1);
  const oldRec = oldResults.some((r) => r.resultData.recommended);
  const newRec = newResults.some((r) => r.resultData.recommended);
  const oldArt = oldResults.reduce((s, r) => s + (r.resultData.artifactProbability || 0), 0) / (oldResults.length || 1);
  const newArt = newResults.reduce((s, r) => s + (r.resultData.artifactProbability || 0), 0) / (newResults.length || 1);

  return {
    artifactInterpretationChange: Math.abs(oldArt - newArt) > 0.01,
    qualityScoreChange: Math.round(newAvg - oldAvg),
    recommendationChange: oldRec !== newRec,
  };
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

        const results = computeResults(param);

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

        const oldResults = get().getParameterResults(parameterId);
        const oldType = param.tissueType;

        const updatedParam: ScanParameter = { ...param, tissueType: newType, updatedAt: new Date().toISOString() };
        const newResults = computeResults(updatedParam);
        const impact = buildImpact(oldResults, newResults);

        const histories = get().getParameterHistories(parameterId);
        const history: VersionHistory = {
          id: generateId(),
          parameterId,
          version: histories.length + 1,
          beforeData: { tissueType: oldType },
          afterData: { tissueType: newType },
          modifiedBy: '医学物理讲师',
          changeReason: reason,
          impactAnalysis: impact,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          parameters: state.parameters.map((p) =>
            p.id === parameterId ? updatedParam : p
          ),
          interfaceResults: [
            ...state.interfaceResults.filter((r) => r.parameterId !== parameterId),
            ...newResults,
          ],
          versionHistories: [...state.versionHistories, history],
        }));

        get().runAnomalyDetection(parameterId);
      },

      updateArtifactLabel: (parameterId, newLabel, reason) => {
        const param = get().parameters.find((p) => p.id === parameterId);
        if (!param) return;

        const oldResults = get().getParameterResults(parameterId);
        const oldLabel = param.artifactLabel;

        const updatedParam: ScanParameter = { ...param, artifactLabel: newLabel, updatedAt: new Date().toISOString() };
        const newResults = computeResults(updatedParam);
        const impact = buildImpact(oldResults, newResults);

        const histories = get().getParameterHistories(parameterId);
        const history: VersionHistory = {
          id: generateId(),
          parameterId,
          version: histories.length + 1,
          beforeData: { artifactLabel: oldLabel },
          afterData: { artifactLabel: newLabel },
          modifiedBy: '医学物理讲师',
          changeReason: reason,
          impactAnalysis: impact,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          parameters: state.parameters.map((p) =>
            p.id === parameterId ? updatedParam : p
          ),
          interfaceResults: [
            ...state.interfaceResults.filter((r) => r.parameterId !== parameterId),
            ...newResults,
          ],
          versionHistories: [...state.versionHistories, history],
        }));

        get().runAnomalyDetection(parameterId);
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
