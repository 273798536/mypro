import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState,
  Path,
  VectorField,
  IntegrationResult,
  ComparisonReport,
  Warning,
  AppSettings,
} from '../types';
import { vectorFields } from '../data/vectorFields';

const initialSettings: AppSettings = {
  stepSize: 0.1,
  integrationMethod: 'trapezoidal',
  showVectors: true,
  showGrid: true,
  theme: 'light',
  animationSpeed: 1,
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createDefaultPaths(): Path[] {
  const now = Date.now();
  return [
    {
      id: 'path-a',
      name: '路径 A',
      color: '#165DFF',
      nodes: [],
      isClosed: false,
      direction: 1,
      sampleStep: 0.1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'path-b',
      name: '路径 B',
      color: '#7B61FF',
      nodes: [],
      isClosed: false,
      direction: 1,
      sampleStep: 0.1,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      vectorFields,
      activeFieldId: vectorFields[0]?.id || null,
      paths: createDefaultPaths(),
      activePathId: null,
      selectedPathForDrawing: null,
      results: [],
      reports: [],
      warnings: [],
      settings: initialSettings,
      isDrawing: false,
      showFormulaPanel: false,
    }),
    {
      name: 'line-integral-storage',
      partialize: (state) => ({
        settings: state.settings,
        reports: state.reports,
      }),
    }
  )
);

export const storeActions = {
  setActiveField(fieldId: string) {
    useAppStore.setState({ activeFieldId: fieldId, results: [] });
    storeActions.clearWarnings();
  },

  getActiveField(): VectorField | undefined {
    const state = useAppStore.getState();
    return state.vectorFields.find((f) => f.id === state.activeFieldId);
  },

  selectPathForDrawing(path: 'A' | 'B' | null) {
    useAppStore.setState({ selectedPathForDrawing: path, isDrawing: false });
  },

  setDrawingMode(isDrawing: boolean) {
    useAppStore.setState({ isDrawing });
  },

  addNodeToPath(pathId: string, x: number, y: number) {
    useAppStore.setState((state) => ({
      paths: state.paths.map((p) =>
        p.id === pathId
          ? {
              ...p,
              nodes: [
                ...p.nodes,
                { id: generateId(), position: { x, y } },
              ],
              updatedAt: Date.now(),
            }
          : p
      ),
    }));
  },

  updatePathNode(pathId: string, nodeId: string, x: number, y: number) {
    useAppStore.setState((state) => ({
      paths: state.paths.map((p) =>
        p.id === pathId
          ? {
              ...p,
              nodes: p.nodes.map((n) =>
                n.id === nodeId ? { ...n, position: { x, y } } : n
              ),
              updatedAt: Date.now(),
            }
          : p
      ),
    }));
  },

  removeNodeFromPath(pathId: string, nodeId: string) {
    useAppStore.setState((state) => ({
      paths: state.paths.map((p) =>
        p.id === pathId
          ? {
              ...p,
              nodes: p.nodes.filter((n) => n.id !== nodeId),
              updatedAt: Date.now(),
            }
          : p
      ),
    }));
  },

  clearPath(pathId: string) {
    useAppStore.setState((state) => ({
      paths: state.paths.map((p) =>
        p.id === pathId
          ? { ...p, nodes: [], updatedAt: Date.now() }
          : p
      ),
      results: state.results.filter((r) => r.pathId !== pathId),
    }));
  },

  reversePathDirection(pathId: string) {
    useAppStore.setState((state) => ({
      paths: state.paths.map((p) =>
        p.id === pathId
          ? {
              ...p,
              nodes: [...p.nodes].reverse(),
              direction: (p.direction * -1) as 1 | -1,
              updatedAt: Date.now(),
            }
          : p
      ),
    }));
  },

  setPathSampleStep(pathId: string, stepSize: number) {
    useAppStore.setState((state) => ({
      paths: state.paths.map((p) =>
        p.id === pathId ? { ...p, sampleStep: stepSize } : p
      ),
    }));
  },

  addIntegrationResult(result: IntegrationResult) {
    useAppStore.setState((state) => ({
      results: [...state.results.filter((r) => r.pathId !== result.pathId), result],
    }));
  },

  createComparisonReport(
    pathAId: string,
    pathBId: string
  ): ComparisonReport | null {
    const state = useAppStore.getState();
    const resultA = state.results.find((r) => r.pathId === pathAId);
    const resultB = state.results.find((r) => r.pathId === pathBId);

    if (!resultA || !resultB) return null;

    const difference = resultA.value - resultB.value;
    const maxVal = Math.max(Math.abs(resultA.value), Math.abs(resultB.value));
    const percentageDiff = maxVal > 0 ? Math.abs(difference) / maxVal * 100 : 0;

    const analysisNotes: string[] = [];
    const field = storeActions.getActiveField();

    if (field) {
      if (field.isConservative && percentageDiff < 1) {
        analysisNotes.push(
          '该向量场为保守场，理论上积分应与路径无关。实测差异较小，验证了保守场性质。'
        );
      } else if (!field.isConservative && percentageDiff > 1) {
        analysisNotes.push(
          '该向量场为非保守场，积分与路径有关，观察到的差异符合理论预期。'
        );
      }
    }

    if (Math.abs(resultA.directionFactor - resultB.directionFactor) > 0.1) {
      analysisNotes.push('两条路径方向不同，注意方向对积分结果的影响。');
    }

    const report: ComparisonReport = {
      id: generateId(),
      fieldId: state.activeFieldId || '',
      pathAResult: resultA,
      pathBResult: resultB,
      difference,
      percentageDiff,
      analysisNotes,
      warnings: [],
      createdAt: Date.now(),
    };

    useAppStore.setState((state) => ({
      reports: [...state.reports, report],
    }));

    return report;
  },

  addWarning(type: Warning['type'], message: string, details?: string) {
    const warning: Warning = {
      id: generateId(),
      type,
      message,
      details,
      timestamp: Date.now(),
    };
    useAppStore.setState((state) => ({
      warnings: [...state.warnings.slice(-9), warning],
    }));
  },

  removeWarning(id: string) {
    useAppStore.setState((state) => ({
      warnings: state.warnings.filter((w) => w.id !== id),
    }));
  },

  clearWarnings() {
    useAppStore.setState({ warnings: [] });
  },

  updateSettings(settings: Partial<AppSettings>) {
    useAppStore.setState((state) => ({
      settings: { ...state.settings, ...settings },
    }));
  },

  toggleFormulaPanel() {
    useAppStore.setState((state) => ({
      showFormulaPanel: !state.showFormulaPanel,
    }));
  },

  resetApp() {
    useAppStore.setState({
      paths: createDefaultPaths(),
      results: [],
      warnings: [],
      selectedPathForDrawing: null,
      isDrawing: false,
    });
  },

  getPathById(pathId: string): Path | undefined {
    return useAppStore.getState().paths.find((p) => p.id === pathId);
  },

  getResultByPathId(pathId: string): IntegrationResult | undefined {
    return useAppStore.getState().results.find((r) => r.pathId === pathId);
  },
};
