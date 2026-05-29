import { create } from 'zustand';
import type {
  TacticsScheme,
  AnyElement,
  Path,
  ToolType,
  Point,
  Robot,
  Ball,
  Obstacle,
  PassPoint,
} from '../engine/types';
import {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  ROBOT_RADIUS,
  BALL_RADIUS,
} from '../engine/types';
import { generateId, clamp } from '../utils/geometry';
import { checkAllCollisions, type CollisionWarning } from '../engine/collision';
import { saveScheme, loadSchemes, deleteScheme, loadScheme } from '../utils/storage';

interface TacticsState {
  scheme: TacticsScheme;
  selectedElementId: string | null;
  selectedPathId: string | null;
  currentTool: ToolType;
  isDrawingPath: boolean;
  pathStartElementId: string | null;
  tempPathPoints: Point[];
  collisionWarnings: CollisionWarning[];
  schemeName: string;
  robotCounter: number;
  obstacleCounter: number;
  passPointCounter: number;

  setSchemeName: (name: string) => void;
  setCurrentTool: (tool: ToolType) => void;
  addElement: (type: 'robot' | 'ball' | 'obstacle' | 'passPoint', position: Point) => void;
  selectElement: (id: string | null) => void;
  updateElementPosition: (id: string, position: Point) => void;
  updateElement: (id: string, updates: Partial<AnyElement>) => void;
  deleteElement: (id: string) => void;
  startPath: (elementId: string) => void;
  addPathPoint: (point: Point) => void;
  finishPath: () => void;
  cancelPath: () => void;
  selectPath: (id: string | null) => void;
  deletePath: (id: string) => void;
  updateCollisionWarnings: () => void;
  saveCurrentScheme: () => void;
  loadSchemeById: (id: string) => void;
  deleteSchemeById: (id: string) => void;
  resetScheme: () => void;
  loadSchemeFromObject: (scheme: TacticsScheme) => void;
  updateSchemeLastScore: (schemeId: string, score: number) => void;
}

const createEmptyScheme = (): TacticsScheme => ({
  id: generateId(),
  name: '未命名战术',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  elements: [],
  paths: [],
  fieldSize: { width: FIELD_WIDTH, height: FIELD_HEIGHT },
});

export const useTacticsStore = create<TacticsState>((set, get) => ({
  scheme: createEmptyScheme(),
  selectedElementId: null,
  selectedPathId: null,
  currentTool: 'select',
  isDrawingPath: false,
  pathStartElementId: null,
  tempPathPoints: [],
  collisionWarnings: [],
  schemeName: '未命名战术',
  robotCounter: 1,
  obstacleCounter: 1,
  passPointCounter: 1,

  setSchemeName: (name) => {
    set({ schemeName: name });
    const { scheme } = get();
    set({ scheme: { ...scheme, name } });
  },

  setCurrentTool: (tool) => {
    set({
      currentTool: tool,
      selectedElementId: null,
      selectedPathId: null,
      isDrawingPath: false,
      pathStartElementId: null,
      tempPathPoints: [],
    });
  },

  addElement: (type, position) => {
    const { scheme, robotCounter, obstacleCounter, passPointCounter } = get();
    let element: AnyElement;
    const isPassPoint = type === 'passPoint';
    const margin = isPassPoint ? -50 : 30;
    const maxX = isPassPoint ? FIELD_WIDTH + 50 : FIELD_WIDTH - 30;
    const maxY = isPassPoint ? FIELD_HEIGHT + 50 : FIELD_HEIGHT - 30;
    const clampedPos = {
      x: clamp(position.x, margin, maxX),
      y: clamp(position.y, margin, maxY),
    };

    switch (type) {
      case 'robot':
        element = {
          id: generateId(),
          type: 'robot',
          position: clampedPos,
          label: `机器人${robotCounter}`,
          color: '#0EA5E9',
          energy: 100,
          maxEnergy: 100,
          speed: 80,
        } as Robot;
        set({ robotCounter: robotCounter + 1 });
        break;
      case 'ball':
        const existingBall = scheme.elements.find((e) => e.type === 'ball');
        if (existingBall) return;
        element = {
          id: generateId(),
          type: 'ball',
          position: clampedPos,
          label: '足球',
          color: '#F59E0B',
        } as Ball;
        break;
      case 'obstacle':
        element = {
          id: generateId(),
          type: 'obstacle',
          position: clampedPos,
          label: `障碍${obstacleCounter}`,
          color: '#6B7280',
          width: 60,
          height: 60,
        } as Obstacle;
        set({ obstacleCounter: obstacleCounter + 1 });
        break;
      case 'passPoint':
        element = {
          id: generateId(),
          type: 'passPoint',
          position: clampedPos,
          label: `传球点${passPointCounter}`,
          color: '#22C55E',
        } as PassPoint;
        set({ passPointCounter: passPointCounter + 1 });
        break;
      default:
        return;
    }

    set({
      scheme: {
        ...scheme,
        elements: [...scheme.elements, element],
      },
    });
    get().updateCollisionWarnings();
  },

  selectElement: (id) => {
    set({ selectedElementId: id, selectedPathId: null });
  },

  updateElementPosition: (id, position) => {
    const { scheme } = get();
    const elements = scheme.elements.map((e) =>
      e.id === id ? { ...e, position } : e
    );
    const paths = scheme.paths.map((p) => {
      if (p.elementId === id && p.points.length > 0) {
        return { ...p, points: [position, ...p.points.slice(1)] };
      }
      return p;
    });
    set({ scheme: { ...scheme, elements, paths } });
    get().updateCollisionWarnings();
  },

  updateElement: (id, updates) => {
    const { scheme } = get();
    const elements = scheme.elements.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    ) as AnyElement[];
    set({ scheme: { ...scheme, elements } });
  },

  deleteElement: (id) => {
    const { scheme } = get();
    const elements = scheme.elements.filter((e) => e.id !== id);
    const paths = scheme.paths.filter((p) => p.elementId !== id);
    set({
      scheme: { ...scheme, elements, paths },
      selectedElementId: null,
    });
    get().updateCollisionWarnings();
  },

  startPath: (elementId) => {
    const { scheme } = get();
    const element = scheme.elements.find((e) => e.id === elementId);
    if (!element) return;

    set({
      isDrawingPath: true,
      pathStartElementId: elementId,
      tempPathPoints: [element.position],
      currentTool: 'path',
    });
  },

  addPathPoint: (point) => {
    const { tempPathPoints } = get();
    const clampedPoint = {
      x: clamp(point.x, ROBOT_RADIUS, FIELD_WIDTH - ROBOT_RADIUS),
      y: clamp(point.y, ROBOT_RADIUS, FIELD_HEIGHT - ROBOT_RADIUS),
    };
    set({ tempPathPoints: [...tempPathPoints, clampedPoint] });
  },

  finishPath: () => {
    const { scheme, pathStartElementId, tempPathPoints } = get();
    if (!pathStartElementId || tempPathPoints.length < 2) {
      get().cancelPath();
      return;
    }

    const element = scheme.elements.find((e) => e.id === pathStartElementId);
    const newPath: Path = {
      id: generateId(),
      elementId: pathStartElementId,
      points: tempPathPoints,
      color: element?.color || '#0EA5E9',
    };

    const existingPathIndex = scheme.paths.findIndex(
      (p) => p.elementId === pathStartElementId
    );
    let newPaths;
    if (existingPathIndex >= 0) {
      newPaths = [...scheme.paths];
      newPaths[existingPathIndex] = newPath;
    } else {
      newPaths = [...scheme.paths, newPath];
    }

    set({
      scheme: { ...scheme, paths: newPaths },
      isDrawingPath: false,
      pathStartElementId: null,
      tempPathPoints: [],
      currentTool: 'select',
    });
    get().updateCollisionWarnings();
  },

  cancelPath: () => {
    set({
      isDrawingPath: false,
      pathStartElementId: null,
      tempPathPoints: [],
      currentTool: 'select',
    });
  },

  selectPath: (id) => {
    set({ selectedPathId: id, selectedElementId: null });
  },

  deletePath: (id) => {
    const { scheme } = get();
    const paths = scheme.paths.filter((p) => p.id !== id);
    set({ scheme: { ...scheme, paths }, selectedPathId: null });
    get().updateCollisionWarnings();
  },

  updateCollisionWarnings: () => {
    const { scheme } = get();
    const obstacles = scheme.elements.filter(
      (e) => e.type === 'obstacle'
    ) as Obstacle[];
    const warnings = checkAllCollisions(scheme.paths, obstacles);
    set({ collisionWarnings: warnings });
  },

  saveCurrentScheme: () => {
    const { scheme, schemeName } = get();
    const schemeToSave = { ...scheme, name: schemeName };
    saveScheme(schemeToSave);
    set({ scheme: schemeToSave });
  },

  loadSchemeById: (id) => {
    const scheme = loadScheme(id);
    if (scheme) {
      set({
        scheme,
        schemeName: scheme.name,
        selectedElementId: null,
        selectedPathId: null,
      });
      get().updateCollisionWarnings();
    }
  },

  deleteSchemeById: (id) => {
    deleteScheme(id);
  },

  resetScheme: () => {
    set({
      scheme: createEmptyScheme(),
      schemeName: '未命名战术',
      selectedElementId: null,
      selectedPathId: null,
      currentTool: 'select',
      isDrawingPath: false,
      pathStartElementId: null,
      tempPathPoints: [],
      collisionWarnings: [],
      robotCounter: 1,
      obstacleCounter: 1,
      passPointCounter: 1,
    });
  },

  loadSchemeFromObject: (scheme) => {
    set({
      scheme: { ...scheme, id: generateId() },
      schemeName: scheme.name,
      selectedElementId: null,
      selectedPathId: null,
    });
    get().updateCollisionWarnings();
  },

  updateSchemeLastScore: (schemeId, score) => {
    const { scheme } = get();
    if (scheme.id === schemeId) {
      const updated = { ...scheme, lastScore: score };
      set({ scheme: updated });
      saveScheme(updated);
    } else {
      const stored = loadScheme(schemeId);
      if (stored) {
        saveScheme({ ...stored, lastScore: score });
      }
    }
  },
}));
