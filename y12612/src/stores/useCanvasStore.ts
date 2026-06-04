import { create } from 'zustand';
import type { AnnotationType, RiskLevel } from '@/types';

type ToolType = 'select' | 'drag' | 'annotate' | 'pan';

interface CanvasStore {
  activeTool: ToolType;
  annotationType: AnnotationType;
  annotationRiskLevel: RiskLevel;
  isDrawing: boolean;
  drawingStart: { x: number; y: number } | null;
  drawingCurrent: { x: number; y: number } | null;
  showAnnotationDialog: boolean;
  annotationTargetDeviceId: string | null;
  setActiveTool: (tool: ToolType) => void;
  setAnnotationType: (type: AnnotationType) => void;
  setAnnotationRiskLevel: (level: RiskLevel) => void;
  startDrawing: (x: number, y: number) => void;
  updateDrawing: (x: number, y: number) => void;
  endDrawing: () => void;
  openAnnotationDialog: (deviceId: string) => void;
  closeAnnotationDialog: () => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  activeTool: 'select',
  annotationType: 'rectangle',
  annotationRiskLevel: 'warning',
  isDrawing: false,
  drawingStart: null,
  drawingCurrent: null,
  showAnnotationDialog: false,
  annotationTargetDeviceId: null,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setAnnotationType: (type) => set({ annotationType: type }),
  setAnnotationRiskLevel: (level) => set({ annotationRiskLevel: level }),

  startDrawing: (x, y) =>
    set({
      isDrawing: true,
      drawingStart: { x, y },
      drawingCurrent: { x, y },
    }),

  updateDrawing: (x, y) =>
    set({
      drawingCurrent: { x, y },
    }),

  endDrawing: () =>
    set({
      isDrawing: false,
      drawingStart: null,
      drawingCurrent: null,
    }),

  openAnnotationDialog: (deviceId) =>
    set({
      showAnnotationDialog: true,
      annotationTargetDeviceId: deviceId,
    }),

  closeAnnotationDialog: () =>
    set({
      showAnnotationDialog: false,
      annotationTargetDeviceId: null,
    }),
}));
