import { create } from 'zustand';
import type {
  AppState,
  ScenarioRecord,
  GeometryObject,
  RotationAxis,
  SectionPlane,
  AnnotationPoint,
  ProblemStep,
  ToolMode,
  CameraState,
  ValidationResult,
  RevisionEntry,
  SceneState,
} from '@/types';
import { validateScene } from '@/utils/validation';
import { generateId } from '@/utils/helpers';
import { initSampleScenarios } from '@/data/sampleScenarios';

interface StoreState extends AppState {
  scenarios: ScenarioRecord[];
  setCurrentScenario: (scenario: ScenarioRecord | null) => void;
  setActiveStepId: (stepId: string | null) => void;
  setSelectedObjectId: (objectId: string | null) => void;
  setToolMode: (mode: ToolMode) => void;
  setValidationResult: (result: ValidationResult | null) => void;
  addGeometry: (geometry: Omit<GeometryObject, 'id'>) => void;
  updateGeometry: (id: string, updates: Partial<GeometryObject>) => void;
  removeGeometry: (id: string) => void;
  addRotationAxis: (axis: Omit<RotationAxis, 'id'>) => void;
  updateRotationAxis: (id: string, updates: Partial<RotationAxis>) => void;
  removeRotationAxis: (id: string) => void;
  addSectionPlane: (plane: Omit<SectionPlane, 'id'>) => void;
  updateSectionPlane: (id: string, updates: Partial<SectionPlane>) => void;
  removeSectionPlane: (id: string) => void;
  addAnnotation: (annotation: Omit<AnnotationPoint, 'id'>) => void;
  updateAnnotation: (id: string, updates: Partial<AnnotationPoint>) => void;
  removeAnnotation: (id: string) => void;
  addStep: (step: Omit<ProblemStep, 'id'>) => void;
  updateStep: (id: string, updates: Partial<ProblemStep>) => void;
  removeStep: (id: string) => void;
  saveCurrentSceneToStep: (stepId: string) => void;
  loadStep: (stepId: string) => void;
  saveScenario: () => void;
  loadScenario: (scenarioId: string) => void;
  createNewScenario: (name: string, description: string, type: 'normal' | 'boundary' | 'error') => void;
  deleteScenario: (scenarioId: string) => void;
  addRevision: (action: string, description: string) => void;
  updateCamera: (camera: CameraState) => void;
  validateCurrentScene: () => void;
  exportScene: () => string;
  importScene: (json: string) => void;
  setScenarios: (scenarios: ScenarioRecord[]) => void;
  clearSelection: () => void;
}

const initialState: AppState = {
  currentScenario: null,
  activeStepId: null,
  selectedObjectId: null,
  toolMode: 'select',
  validationResult: null,
  isLoading: false,
};

export const useStore = create<StoreState>((set, get) => ({
  ...initialState,
  scenarios: [],

  setScenarios: (scenarios) => set({ scenarios }),

  setCurrentScenario: (scenario) => {
    set({
      currentScenario: scenario,
      activeStepId: scenario?.steps.find((s) => s.isActive)?.id || null,
      validationResult: scenario ? validateScene(scenario.scene) : null,
    });
  },

  setActiveStepId: (stepId) => set({ activeStepId: stepId }),

  setSelectedObjectId: (objectId) => set({ selectedObjectId: objectId }),

  setToolMode: (mode) => set({ toolMode: mode }),

  setValidationResult: (result) => set({ validationResult: result }),

  clearSelection: () => set({ selectedObjectId: null }),

  addGeometry: (geometry) => {
    const { currentScenario, addRevision } = get();
    if (!currentScenario) return;

    const newGeometry: GeometryObject = {
      ...geometry,
      id: generateId(),
    };

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        geometries: [...currentScenario.scene.geometries, newGeometry],
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('add_geometry', `添加几何体: ${geometry.type}`);
    set({ currentScenario: updatedScenario });
    get().validateCurrentScene();
  },

  updateGeometry: (id, updates) => {
    const { currentScenario, addRevision } = get();
    if (!currentScenario) return;

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        geometries: currentScenario.scene.geometries.map((g) =>
          g.id === id ? { ...g, ...updates } : g
        ),
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('update_geometry', `更新几何体参数`);
    set({ currentScenario: updatedScenario });
    get().validateCurrentScene();
  },

  removeGeometry: (id) => {
    const { currentScenario, addRevision, selectedObjectId } = get();
    if (!currentScenario) return;

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        geometries: currentScenario.scene.geometries.filter((g) => g.id !== id),
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('remove_geometry', `删除几何体`);
    set({
      currentScenario: updatedScenario,
      selectedObjectId: selectedObjectId === id ? null : selectedObjectId,
    });
    get().validateCurrentScene();
  },

  addRotationAxis: (axis) => {
    const { currentScenario, addRevision } = get();
    if (!currentScenario) return;

    const newAxis: RotationAxis = {
      ...axis,
      id: generateId(),
    };

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        rotationAxes: [...currentScenario.scene.rotationAxes, newAxis],
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('add_axis', `添加旋转轴: ${axis.type}`);
    set({ currentScenario: updatedScenario });
    get().validateCurrentScene();
  },

  updateRotationAxis: (id, updates) => {
    const { currentScenario, addRevision } = get();
    if (!currentScenario) return;

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        rotationAxes: currentScenario.scene.rotationAxes.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('update_axis', `更新旋转轴参数`);
    set({ currentScenario: updatedScenario });
    get().validateCurrentScene();
  },

  removeRotationAxis: (id) => {
    const { currentScenario, addRevision, selectedObjectId } = get();
    if (!currentScenario) return;

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        rotationAxes: currentScenario.scene.rotationAxes.filter((a) => a.id !== id),
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('remove_axis', `删除旋转轴`);
    set({
      currentScenario: updatedScenario,
      selectedObjectId: selectedObjectId === id ? null : selectedObjectId,
    });
    get().validateCurrentScene();
  },

  addSectionPlane: (plane) => {
    const { currentScenario, addRevision } = get();
    if (!currentScenario) return;

    const newPlane: SectionPlane = {
      ...plane,
      id: generateId(),
    };

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        sectionPlanes: [...currentScenario.scene.sectionPlanes, newPlane],
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('add_plane', `添加截面平面`);
    set({ currentScenario: updatedScenario });
    get().validateCurrentScene();
  },

  updateSectionPlane: (id, updates) => {
    const { currentScenario, addRevision } = get();
    if (!currentScenario) return;

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        sectionPlanes: currentScenario.scene.sectionPlanes.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('update_plane', `更新截面平面参数`);
    set({ currentScenario: updatedScenario });
    get().validateCurrentScene();
  },

  removeSectionPlane: (id) => {
    const { currentScenario, addRevision, selectedObjectId } = get();
    if (!currentScenario) return;

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        sectionPlanes: currentScenario.scene.sectionPlanes.filter((p) => p.id !== id),
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('remove_plane', `删除截面平面`);
    set({
      currentScenario: updatedScenario,
      selectedObjectId: selectedObjectId === id ? null : selectedObjectId,
    });
    get().validateCurrentScene();
  },

  addAnnotation: (annotation) => {
    const { currentScenario, addRevision } = get();
    if (!currentScenario) return;

    const newAnnotation: AnnotationPoint = {
      ...annotation,
      id: generateId(),
    };

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        annotations: [...currentScenario.scene.annotations, newAnnotation],
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('add_annotation', `添加标注: ${annotation.label}`);
    set({ currentScenario: updatedScenario });
    get().validateCurrentScene();
  },

  updateAnnotation: (id, updates) => {
    const { currentScenario, addRevision } = get();
    if (!currentScenario) return;

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        annotations: currentScenario.scene.annotations.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('update_annotation', `更新标注`);
    set({ currentScenario: updatedScenario });
    get().validateCurrentScene();
  },

  removeAnnotation: (id) => {
    const { currentScenario, addRevision, selectedObjectId } = get();
    if (!currentScenario) return;

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        annotations: currentScenario.scene.annotations.filter((a) => a.id !== id),
      },
      modifiedAt: new Date().toISOString(),
    };

    addRevision('remove_annotation', `删除标注`);
    set({
      currentScenario: updatedScenario,
      selectedObjectId: selectedObjectId === id ? null : selectedObjectId,
    });
    get().validateCurrentScene();
  },

  addStep: (step) => {
    const { currentScenario, addRevision } = get();
    if (!currentScenario) return;

    const newStep: ProblemStep = {
      ...step,
      id: generateId(),
    };

    const updatedScenario = {
      ...currentScenario,
      steps: [...currentScenario.steps, newStep].sort((a, b) => a.stepNumber - b.stepNumber),
      modifiedAt: new Date().toISOString(),
    };

    addRevision('add_step', `添加步骤: ${step.title}`);
    set({ currentScenario: updatedScenario });
  },

  updateStep: (id, updates) => {
    const { currentScenario, addRevision } = get();
    if (!currentScenario) return;

    const updatedScenario = {
      ...currentScenario,
      steps: currentScenario.steps.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      modifiedAt: new Date().toISOString(),
    };

    addRevision('update_step', `更新步骤`);
    set({ currentScenario: updatedScenario });
  },

  removeStep: (id) => {
    const { currentScenario, addRevision, activeStepId } = get();
    if (!currentScenario) return;

    const removedStep = currentScenario.steps.find((s) => s.id === id);
    const updatedSteps = currentScenario.steps
      .filter((s) => s.id !== id)
      .map((s, index) => ({ ...s, stepNumber: index + 1 }));

    const updatedScenario = {
      ...currentScenario,
      steps: updatedSteps,
      modifiedAt: new Date().toISOString(),
    };

    addRevision('remove_step', `删除步骤: ${removedStep?.title}`);
    set({
      currentScenario: updatedScenario,
      activeStepId: activeStepId === id ? null : activeStepId,
    });
  },

  saveCurrentSceneToStep: (stepId) => {
    const { currentScenario, addRevision } = get();
    if (!currentScenario) return;

    const updatedScenario = {
      ...currentScenario,
      steps: currentScenario.steps.map((s) =>
        s.id === stepId
          ? {
              ...s,
              sceneSnapshot: JSON.parse(JSON.stringify(currentScenario.scene)),
            }
          : s
      ),
      modifiedAt: new Date().toISOString(),
    };

    addRevision('save_scene_to_step', `保存当前场景到步骤`);
    set({ currentScenario: updatedScenario });
  },

  loadStep: (stepId) => {
    const { currentScenario } = get();
    if (!currentScenario) return;

    const step = currentScenario.steps.find((s) => s.id === stepId);
    if (!step) return;

    const updatedScenario = {
      ...currentScenario,
      scene: JSON.parse(JSON.stringify(step.sceneSnapshot)),
      steps: currentScenario.steps.map((s) => ({
        ...s,
        isActive: s.id === stepId,
      })),
      modifiedAt: new Date().toISOString(),
    };

    set({
      currentScenario: updatedScenario,
      activeStepId: stepId,
      selectedObjectId: null,
    });
    get().validateCurrentScene();
  },

  saveScenario: () => {
    const { currentScenario, scenarios } = get();
    if (!currentScenario) return;

    const savedScenario = {
      ...currentScenario,
      modifiedAt: new Date().toISOString(),
    };

    const updatedScenarios = scenarios.some((s) => s.id === savedScenario.id)
      ? scenarios.map((s) => (s.id === savedScenario.id ? savedScenario : s))
      : [...scenarios, savedScenario];

    localStorage.setItem('geometry-scenarios', JSON.stringify(updatedScenarios));

    set({
      currentScenario: savedScenario,
      scenarios: updatedScenarios,
    });
  },

  loadScenario: (scenarioId) => {
    const { scenarios } = get();
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      get().setCurrentScenario(JSON.parse(JSON.stringify(scenario)));
    }
  },

  createNewScenario: (name, description, type) => {
    const now = new Date().toISOString();
    const newScenario: ScenarioRecord = {
      id: generateId(),
      name,
      description,
      type,
      createdAt: now,
      modifiedAt: now,
      scene: {
        geometries: [],
        rotationAxes: [],
        sectionPlanes: [],
        annotations: [],
        camera: {
          position: [5, 5, 5],
          target: [0, 0, 0],
        },
      },
      steps: [],
      revisionHistory: [],
      source: 'user_created',
    };

    const revision: RevisionEntry = {
      timestamp: now,
      userId: 'default',
      action: 'create_scenario',
      description: `创建新场景: ${name}`,
    };

    newScenario.revisionHistory.push(revision);

    const { scenarios } = get();
    const updatedScenarios = [...scenarios, newScenario];
    localStorage.setItem('geometry-scenarios', JSON.stringify(updatedScenarios));

    set({
      scenarios: updatedScenarios,
      currentScenario: newScenario,
      activeStepId: null,
      selectedObjectId: null,
    });
  },

  deleteScenario: (scenarioId) => {
    const { scenarios, currentScenario } = get();
    const updatedScenarios = scenarios.filter((s) => s.id !== scenarioId);
    localStorage.setItem('geometry-scenarios', JSON.stringify(updatedScenarios));

    set({
      scenarios: updatedScenarios,
      currentScenario: currentScenario?.id === scenarioId ? null : currentScenario,
    });
  },

  addRevision: (action, description) => {
    const { currentScenario } = get();
    if (!currentScenario) return;

    const revision: RevisionEntry = {
      timestamp: new Date().toISOString(),
      userId: 'default',
      action,
      description,
    };

    const updatedScenario = {
      ...currentScenario,
      revisionHistory: [...currentScenario.revisionHistory, revision],
    };

    set({ currentScenario: updatedScenario });
  },

  updateCamera: (camera) => {
    const { currentScenario } = get();
    if (!currentScenario) return;

    const updatedScenario = {
      ...currentScenario,
      scene: {
        ...currentScenario.scene,
        camera,
      },
    };

    set({ currentScenario: updatedScenario });
  },

  validateCurrentScene: () => {
    const { currentScenario } = get();
    if (!currentScenario) return;

    const result = validateScene(currentScenario.scene);
    set({ validationResult: result });
  },

  exportScene: () => {
    const { currentScenario } = get();
    if (!currentScenario) return '';
    return JSON.stringify(currentScenario, null, 2);
  },

  importScene: (json) => {
    try {
      const scenario: ScenarioRecord = JSON.parse(json);
      const { scenarios } = get();
      const updatedScenarios = [...scenarios, scenario];
      localStorage.setItem('geometry-scenarios', JSON.stringify(updatedScenarios));
      set({
        scenarios: updatedScenarios,
        currentScenario: scenario,
      });
    } catch (e) {
      console.error('导入失败:', e);
    }
  },
}));

export const initStore = () => {
  const scenarios = initSampleScenarios();
  useStore.getState().setScenarios(scenarios);
  
  if (scenarios.length > 0) {
    useStore.getState().setCurrentScenario(JSON.parse(JSON.stringify(scenarios[0])));
  }
};
