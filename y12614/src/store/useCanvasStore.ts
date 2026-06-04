import { create } from 'zustand';
import type { Point, CanvasState, ToolType } from '@/types';

interface CanvasStore extends CanvasState {
  tool: ToolType;
  currentPoints: Point[];
  isDrawing: boolean;
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  setImageLoaded: (loaded: boolean) => void;
  setImageSize: (width: number, height: number) => void;
  setTool: (tool: ToolType) => void;
  setCurrentPoints: (points: Point[]) => void;
  addPoint: (point: Point) => void;
  setIsDrawing: (drawing: boolean) => void;
  resetCanvas: () => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  zoom: 1,
  pan: { x: 0, y: 0 },
  imageLoaded: false,
  imageSize: { width: 0, height: 0 },
  tool: 'none',
  currentPoints: [],
  isDrawing: false,
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(3, zoom)) }),
  setPan: (pan) => set({ pan }),
  setImageLoaded: (loaded) => set({ imageLoaded: loaded }),
  setImageSize: (width, height) => set({ imageSize: { width, height } }),
  setTool: (tool) => set({ tool, currentPoints: [] }),
  setCurrentPoints: (points) => set({ currentPoints: points }),
  addPoint: (point) => set((state) => ({ currentPoints: [...state.currentPoints, point] })),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  resetCanvas: () => set({
    zoom: 1,
    pan: { x: 0, y: 0 },
    currentPoints: [],
    isDrawing: false
  })
}));
