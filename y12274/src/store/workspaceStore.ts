import { create } from 'zustand';
import {
  ImplicitFormula,
  SectionPlane,
  DiagnosticIssue,
  HistoryRecord,
  ViewportSettings,
  Parameter,
  ColorRule,
  PRESET_FORMULAS,
} from '../types';

interface WorkspaceState {
  currentFormula: ImplicitFormula | null;
  parameters: Record<string, number>;
  sectionPlanes: SectionPlane[];
  diagnosticIssues: DiagnosticIssue[];
  history: HistoryRecord[];
  viewportSettings: ViewportSettings;
  isFormulaValid: boolean;
  formulaError: string | null;

  setFormula: (formula: ImplicitFormula) => void;
  updateFormulaExpression: (expression: string) => void;
  updateParameter: (name: string, value: number) => void;
  addParameter: (param: Parameter) => void;
  removeParameter: (name: string) => void;
  updateColorRule: (rule: Partial<ColorRule>) => void;
  addSectionPlane: () => void;
  updateSectionPlane: (id: string, updates: Partial<SectionPlane>) => void;
  removeSectionPlane: (id: string) => void;
  addDiagnosticIssue: (issue: Omit<DiagnosticIssue, 'id'>) => void;
  clearDiagnosticIssues: () => void;
  setFormulaValidity: (isValid: boolean, error: string | null) => void;
  saveSnapshot: (includeScreenshot?: boolean, screenshot?: string) => void;
  removeHistoryRecord: (id: string) => void;
  clearHistory: () => void;
  updateViewportSettings: (settings: Partial<ViewportSettings>) => void;
  loadPreset: (index: number) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const defaultFormula: ImplicitFormula = {
  id: generateId(),
  name: PRESET_FORMULAS[0].name,
  expression: PRESET_FORMULAS[0].expression,
  parameters: PRESET_FORMULAS[0].parameters,
  colorRule: PRESET_FORMULAS[0].colorRule,
  createdAt: new Date(),
};

const defaultParameters: Record<string, number> = {};
defaultFormula.parameters.forEach((p) => {
  defaultParameters[p.name] = p.value;
});

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentFormula: defaultFormula,
  parameters: defaultParameters,
  sectionPlanes: [],
  diagnosticIssues: [],
  history: [],
  viewportSettings: {
    showGrid: true,
    showAxes: true,
    backgroundColor: '#0a1628',
    resolution: 64,
  },
  isFormulaValid: true,
  formulaError: null,

  setFormula: (formula) => {
    const params: Record<string, number> = {};
    formula.parameters.forEach((p) => {
      params[p.name] = p.value;
    });
    set({ currentFormula: formula, parameters: params, diagnosticIssues: [] });
  },

  updateFormulaExpression: (expression) => {
    const { currentFormula } = get();
    if (!currentFormula) return;
    set({
      currentFormula: { ...currentFormula, expression },
      diagnosticIssues: [],
    });
  },

  updateParameter: (name, value) => {
    set((state) => ({
      parameters: { ...state.parameters, [name]: value },
    }));
  },

  addParameter: (param) => {
    const { currentFormula } = get();
    if (!currentFormula) return;
    set({
      currentFormula: {
        ...currentFormula,
        parameters: [...currentFormula.parameters, param],
      },
      parameters: { ...get().parameters, [param.name]: param.value },
    });
  },

  removeParameter: (name) => {
    const { currentFormula, parameters } = get();
    if (!currentFormula) return;
    const newParams = { ...parameters };
    delete newParams[name];
    set({
      currentFormula: {
        ...currentFormula,
        parameters: currentFormula.parameters.filter((p) => p.name !== name),
      },
      parameters: newParams,
    });
  },

  updateColorRule: (rule) => {
    const { currentFormula } = get();
    if (!currentFormula) return;
    set({
      currentFormula: {
        ...currentFormula,
        colorRule: { ...currentFormula.colorRule, ...rule },
      },
    });
  },

  addSectionPlane: () => {
    const plane: SectionPlane = {
      id: generateId(),
      normal: [0, 1, 0],
      offset: 0,
      visible: true,
      showIntersection: true,
      color: '#00f5d4',
    };
    set((state) => ({
      sectionPlanes: [...state.sectionPlanes, plane],
    }));
  },

  updateSectionPlane: (id, updates) => {
    set((state) => ({
      sectionPlanes: state.sectionPlanes.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },

  removeSectionPlane: (id) => {
    set((state) => ({
      sectionPlanes: state.sectionPlanes.filter((p) => p.id !== id),
    }));
  },

  addDiagnosticIssue: (issue) => {
    set((state) => ({
      diagnosticIssues: [
        ...state.diagnosticIssues,
        { ...issue, id: generateId() },
      ],
    }));
  },

  clearDiagnosticIssues: () => {
    set({ diagnosticIssues: [] });
  },

  setFormulaValidity: (isValid, error) => {
    set({ isFormulaValid: isValid, formulaError: error });
  },

  saveSnapshot: (includeScreenshot = false, screenshot) => {
    const { currentFormula, parameters } = get();
    if (!currentFormula) return;

    const record: HistoryRecord = {
      id: generateId(),
      formula: JSON.parse(JSON.stringify(currentFormula)),
      parameters: { ...parameters },
      screenshot: includeScreenshot ? screenshot : undefined,
      timestamp: new Date(),
    };

    set((state) => ({
      history: [record, ...state.history].slice(0, 50),
    }));
  },

  removeHistoryRecord: (id) => {
    set((state) => ({
      history: state.history.filter((r) => r.id !== id),
    }));
  },

  clearHistory: () => {
    set({ history: [] });
  },

  updateViewportSettings: (settings) => {
    set((state) => ({
      viewportSettings: { ...state.viewportSettings, ...settings },
    }));
  },

  loadPreset: (index) => {
    const preset = PRESET_FORMULAS[index];
    if (!preset) return;

    const formula: ImplicitFormula = {
      id: generateId(),
      name: preset.name,
      expression: preset.expression,
      parameters: preset.parameters,
      colorRule: preset.colorRule,
      createdAt: new Date(),
    };

    const params: Record<string, number> = {};
    formula.parameters.forEach((p) => {
      params[p.name] = p.value;
    });

    set({
      currentFormula: formula,
      parameters: params,
      sectionPlanes: [],
      diagnosticIssues: [],
    });
  },
}));
