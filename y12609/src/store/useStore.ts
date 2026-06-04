import { create } from 'zustand';
import type { HotzoneAnnotation, ColorRule, ReproducibleSample, HistoryNode, ToolMode, Point, ValidationResult } from '@/types';
import { mockSamples, defaultColorRules } from '@/data/mockData';
import { validateAnnotation, updateAnnotationsAfterRuleChange, validateAllAnnotations } from '@/utils/validation';
import { calculateOverlapPercentage } from '@/utils/geometry';

interface StoreState {
  samples: ReproducibleSample[];
  currentSampleId: string | null;
  annotations: HotzoneAnnotation[];
  colorRules: ColorRule[];
  history: HistoryNode[];
  historyIndex: number;
  toolMode: ToolMode;
  selectedLevel: number;
  selectedAnnotationId: string | null;
  zoom: number;
  pan: Point;
  isDrawing: boolean;
  currentPoints: Point[];
  validationResults: Map<string, ValidationResult[]>;
  
  loadSample: (sampleId: string) => void;
  addAnnotation: (points: Point[]) => void;
  deleteAnnotation: (annotationId: string) => void;
  updateAnnotationManualNote: (annotationId: string, note: string) => void;
  updateColorRules: (newRules: ColorRule[]) => void;
  addColorRule: (rule: Omit<ColorRule, 'id' | 'createdAt'>) => void;
  undo: () => void;
  redo: () => void;
  setToolMode: (mode: ToolMode) => void;
  setSelectedLevel: (level: number) => void;
  setSelectedAnnotationId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  setIsDrawing: (drawing: boolean) => void;
  setCurrentPoints: (points: Point[]) => void;
  addCurrentPoint: (point: Point) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  validateAll: () => void;
  resetToSample: () => void;
  getCurrentSample: () => ReproducibleSample | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useStore = create<StoreState>((set, get) => ({
  samples: mockSamples,
  currentSampleId: mockSamples[0]?.id || null,
  annotations: mockSamples[0]?.expectedAnnotations.map(a => ({ ...a })) || [],
  colorRules: [...defaultColorRules],
  history: [],
  historyIndex: -1,
  toolMode: 'select',
  selectedLevel: 3,
  selectedAnnotationId: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isDrawing: false,
  currentPoints: [],
  validationResults: new Map(),

  getCurrentSample: () => {
    const { samples, currentSampleId } = get();
    return samples.find(s => s.id === currentSampleId) || null;
  },

  loadSample: (sampleId: string) => {
    const sample = get().samples.find(s => s.id === sampleId);
    if (!sample) return;
    
    const annotations = sample.expectedAnnotations.map(a => ({ ...a }));
    const sampleRef = sample;
    
    set({
      currentSampleId: sampleId,
      annotations,
      history: [],
      historyIndex: -1,
      selectedAnnotationId: null,
      zoom: 1,
      pan: { x: 0, y: 0 }
    });
    
    get().validateAll();
  },

  addAnnotation: (points: Point[]) => {
    const state = get();
    const { annotations, colorRules, currentSampleId, selectedLevel, history, historyIndex } = state;
    if (!currentSampleId || points.length < 3) return;

    const matchingRule = colorRules.find(r => r.level === selectedLevel);
    const now = Date.now();
    
    const newAnnotation: HotzoneAnnotation = {
      id: generateId(),
      sampleId: currentSampleId,
      points,
      color: matchingRule?.color || '#F59E0B',
      level: selectedLevel,
      createdAt: now,
      updatedAt: now,
      isDuplicate: false,
      isValid: true
    };

    const allAnnotations = [...annotations, newAnnotation];
    const results = validateAnnotation(
      newAnnotation,
      allAnnotations,
      colorRules,
      state.getCurrentSample()?.canvasWidth || 700,
      state.getCurrentSample()?.canvasHeight || 380
    );
    
    const hasBlockers = results.some(r => r.blocked);
    const duplicateResult = results.find(r => r.type === 'duplicate');
    const duplicates = annotations
      .filter(other => calculateOverlapPercentage(points, other.points) >= 30)
      .map(o => o.id);
    
    newAnnotation.isValid = !hasBlockers;
    newAnnotation.isDuplicate = !!duplicateResult;
    newAnnotation.duplicateWith = duplicates.length > 0 ? duplicates : undefined;
    newAnnotation.blockReason = hasBlockers ? results.filter(r => r.blocked).map(r => r.message).join('；') : undefined;

    const newAnnotations = [...annotations, newAnnotation];
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      id: generateId(),
      timestamp: now,
      type: 'add',
      before: [...annotations],
      after: newAnnotations,
      description: `添加标注 (${points.length}个顶点)`
    });

    set({
      annotations: newAnnotations,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDrawing: false,
      currentPoints: []
    });
    
    get().validateAll();
  },

  deleteAnnotation: (annotationId: string) => {
    const { annotations, history, historyIndex } = get();
    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation) return;

    const newAnnotations = annotations.filter(a => a.id !== annotationId);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      id: generateId(),
      timestamp: Date.now(),
      type: 'delete',
      before: [...annotations],
      after: newAnnotations,
      description: `删除标注`
    });

    set({
      annotations: newAnnotations,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selectedAnnotationId: null
    });
    
    get().validateAll();
  },

  updateAnnotationManualNote: (annotationId: string, note: string) => {
    const { annotations, history, historyIndex } = get();
    const newAnnotations = annotations.map(a =>
      a.id === annotationId ? { ...a, manualNote: note, updatedAt: Date.now() } : a
    );
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      id: generateId(),
      timestamp: Date.now(),
      type: 'modify',
      before: [...annotations],
      after: newAnnotations,
      description: `更新人工备注`
    });

    set({
      annotations: newAnnotations,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  updateColorRules: (newRules: ColorRule[]) => {
    const { annotations, history, historyIndex, colorRules } = get();
    const updatedAnnotations = updateAnnotationsAfterRuleChange(annotations, newRules);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      id: generateId(),
      timestamp: Date.now(),
      type: 'rule_change',
      before: [...annotations],
      after: updatedAnnotations,
      description: `颜色规则变更 (${newRules.length}条规则)`
    });

    set({
      colorRules: newRules,
      annotations: updatedAnnotations,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
    
    get().validateAll();
  },

  addColorRule: (rule) => {
    const { colorRules } = get();
    const newRule: ColorRule = {
      ...rule,
      id: generateId(),
      createdAt: Date.now()
    };
    const newRules = [...colorRules, newRule].sort((a, b) => a.level - b.level);
    get().updateColorRules(newRules);
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    
    const targetIndex = historyIndex - 1;
    const node = history[targetIndex];
    
    set({
      annotations: [...node.after],
      historyIndex: targetIndex
    });
    
    get().validateAll();
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    
    const targetIndex = historyIndex + 1;
    const node = history[targetIndex];
    
    set({
      annotations: [...node.after],
      historyIndex: targetIndex
    });
    
    get().validateAll();
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  setToolMode: (mode) => set({ toolMode: mode, isDrawing: false, currentPoints: [] }),
  setSelectedLevel: (level) => set({ selectedLevel: level }),
  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(3, zoom)) }),
  setPan: (pan) => set({ pan }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setCurrentPoints: (points) => set({ currentPoints: points }),
  
  addCurrentPoint: (point) => {
    const { currentPoints } = get();
    set({ currentPoints: [...currentPoints, point] });
  },

  finishDrawing: () => {
    const { currentPoints, addAnnotation } = get();
    if (currentPoints.length >= 3) {
      addAnnotation(currentPoints);
    } else {
      set({ isDrawing: false, currentPoints: [] });
    }
  },

  cancelDrawing: () => set({ isDrawing: false, currentPoints: [] }),

  validateAll: () => {
    const { annotations, colorRules, getCurrentSample } = get();
    const sample = getCurrentSample();
    if (!sample) return;
    
    const results = validateAllAnnotations(
      annotations,
      colorRules,
      sample.canvasWidth,
      sample.canvasHeight
    );
    set({ validationResults: results });
  },

  resetToSample: () => {
    const { currentSampleId, samples } = get();
    const sample = samples.find(s => s.id === currentSampleId);
    if (!sample) return;
    
    set({
      annotations: sample.expectedAnnotations.map(a => ({ ...a })),
      history: [],
      historyIndex: -1,
      selectedAnnotationId: null
    });
    
    get().validateAll();
  }
}));
