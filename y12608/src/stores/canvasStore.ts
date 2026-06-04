import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Track,
  Annotation,
  HistoryRecord,
  ToolType,
  ActionType,
  CanvasState
} from '../types';
import { generateId } from '../utils/coordinate';

interface CanvasStore extends CanvasState {
  setTool: (tool: ToolType) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  selectTrack: (trackId: string | null) => void;
  selectAnnotation: (annotationId: string | null) => void;
  
  addTrack: (track: Omit<Track, 'id' | 'createdAt'>) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  deleteTrack: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  flipTrack: (trackId: string) => void;
  
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  updateAnnotation: (annotationId: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (annotationId: string) => void;
  
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  importTracks: (tracks: Track[]) => void;
  
  reset: () => void;
}

const MAX_HISTORY = 50;

const initialState: Omit<CanvasState, 'tracks' | 'annotations' | 'history'> = {
  historyIndex: -1,
  selectedTrackId: null,
  selectedAnnotationId: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  currentTool: 'select'
};

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      tracks: [],
      annotations: [],
      history: [],
      ...initialState,
      
      setTool: (tool) => set({ currentTool: tool }),
      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
      setPan: (pan) => set({ pan }),
      selectTrack: (trackId) => set({ selectedTrackId: trackId, selectedAnnotationId: null }),
      selectAnnotation: (annotationId) => set({ selectedAnnotationId: annotationId, selectedTrackId: null }),
      
      addTrack: (track) => {
        const state = get();
        const newTrack: Track = {
          ...track,
          id: generateId(),
          createdAt: new Date()
        };
        
        const newTracks = [...state.tracks, newTrack];
        const historyRecord: HistoryRecord = {
          id: generateId(),
          actionType: 'add',
          description: `添加轨迹: ${track.name}`,
          beforeState: { tracks: state.tracks, annotations: state.annotations },
          afterState: { tracks: newTracks, annotations: state.annotations },
          timestamp: new Date()
        };
        
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(historyRecord);
        
        set({
          tracks: newTracks,
          history: newHistory.slice(-MAX_HISTORY),
          historyIndex: Math.min(newHistory.length - 1, MAX_HISTORY - 1)
        });
      },
      
      updateTrack: (trackId, updates) => {
        const state = get();
        const newTracks = state.tracks.map(t => 
          t.id === trackId ? { ...t, ...updates } : t
        );
        
        const track = state.tracks.find(t => t.id === trackId);
        const historyRecord: HistoryRecord = {
          id: generateId(),
          actionType: 'update',
          description: `更新轨迹: ${track?.name || trackId}`,
          beforeState: { tracks: state.tracks, annotations: state.annotations },
          afterState: { tracks: newTracks, annotations: state.annotations },
          timestamp: new Date()
        };
        
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(historyRecord);
        
        set({
          tracks: newTracks,
          history: newHistory.slice(-MAX_HISTORY),
          historyIndex: Math.min(newHistory.length - 1, MAX_HISTORY - 1)
        });
      },
      
      deleteTrack: (trackId) => {
        const state = get();
        const track = state.tracks.find(t => t.id === trackId);
        const newTracks = state.tracks.filter(t => t.id !== trackId);
        const newAnnotations = state.annotations.filter(a => a.trackId !== trackId);
        
        const historyRecord: HistoryRecord = {
          id: generateId(),
          actionType: 'delete',
          description: `删除轨迹: ${track?.name || trackId}`,
          beforeState: { tracks: state.tracks, annotations: state.annotations },
          afterState: { tracks: newTracks, annotations: newAnnotations },
          timestamp: new Date()
        };
        
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(historyRecord);
        
        set({
          tracks: newTracks,
          annotations: newAnnotations,
          history: newHistory.slice(-MAX_HISTORY),
          historyIndex: Math.min(newHistory.length - 1, MAX_HISTORY - 1),
          selectedTrackId: state.selectedTrackId === trackId ? null : state.selectedTrackId
        });
      },
      
      toggleTrackVisibility: (trackId) => {
        const state = get();
        const newTracks = state.tracks.map(t => 
          t.id === trackId ? { ...t, visible: !t.visible } : t
        );
        set({ tracks: newTracks });
      },
      
      flipTrack: (trackId) => {
        const state = get();
        const track = state.tracks.find(t => t.id === trackId);
        if (!track) return;
        
        const flippedPoints = track.points.map(p => ({
          ...p,
          x: 1 - p.x,
          y: 1 - p.y
        }));
        
        const newTracks = state.tracks.map(t => 
          t.id === trackId ? { ...t, points: flippedPoints, isFlipped: !t.isFlipped } : t
        );
        
        const historyRecord: HistoryRecord = {
          id: generateId(),
          actionType: 'flip',
          description: `翻转轨迹: ${track.name}`,
          beforeState: { tracks: state.tracks, annotations: state.annotations },
          afterState: { tracks: newTracks, annotations: state.annotations },
          timestamp: new Date()
        };
        
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(historyRecord);
        
        set({
          tracks: newTracks,
          history: newHistory.slice(-MAX_HISTORY),
          historyIndex: Math.min(newHistory.length - 1, MAX_HISTORY - 1)
        });
      },
      
      addAnnotation: (annotation) => {
        const state = get();
        const newAnnotation: Annotation = {
          ...annotation,
          id: generateId(),
          createdAt: new Date()
        };
        
        const newAnnotations = [...state.annotations, newAnnotation];
        const historyRecord: HistoryRecord = {
          id: generateId(),
          actionType: 'add',
          description: `添加${annotation.type === 'abnormal' ? '异常' : annotation.type === 'pending' ? '待确认' : '正常'}标注`,
          beforeState: { tracks: state.tracks, annotations: state.annotations },
          afterState: { tracks: state.tracks, annotations: newAnnotations },
          timestamp: new Date()
        };
        
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(historyRecord);
        
        set({
          annotations: newAnnotations,
          history: newHistory.slice(-MAX_HISTORY),
          historyIndex: Math.min(newHistory.length - 1, MAX_HISTORY - 1)
        });
      },
      
      updateAnnotation: (annotationId, updates) => {
        const state = get();
        const newAnnotations = state.annotations.map(a => 
          a.id === annotationId ? { ...a, ...updates } : a
        );
        
        const historyRecord: HistoryRecord = {
          id: generateId(),
          actionType: 'update',
          description: '更新标注',
          beforeState: { tracks: state.tracks, annotations: state.annotations },
          afterState: { tracks: state.tracks, annotations: newAnnotations },
          timestamp: new Date()
        };
        
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(historyRecord);
        
        set({
          annotations: newAnnotations,
          history: newHistory.slice(-MAX_HISTORY),
          historyIndex: Math.min(newHistory.length - 1, MAX_HISTORY - 1)
        });
      },
      
      deleteAnnotation: (annotationId) => {
        const state = get();
        const newAnnotations = state.annotations.filter(a => a.id !== annotationId);
        
        const historyRecord: HistoryRecord = {
          id: generateId(),
          actionType: 'delete',
          description: '删除标注',
          beforeState: { tracks: state.tracks, annotations: state.annotations },
          afterState: { tracks: state.tracks, annotations: newAnnotations },
          timestamp: new Date()
        };
        
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(historyRecord);
        
        set({
          annotations: newAnnotations,
          history: newHistory.slice(-MAX_HISTORY),
          historyIndex: Math.min(newHistory.length - 1, MAX_HISTORY - 1),
          selectedAnnotationId: state.selectedAnnotationId === annotationId ? null : state.selectedAnnotationId
        });
      },
      
      undo: () => {
        const state = get();
        if (state.historyIndex <= 0) return;
        
        const prevIndex = state.historyIndex - 1;
        const prevState = state.history[prevIndex].beforeState;
        
        set({
          tracks: prevState.tracks,
          annotations: prevState.annotations,
          historyIndex: prevIndex
        });
      },
      
      redo: () => {
        const state = get();
        if (state.historyIndex >= state.history.length - 1) return;
        
        const nextIndex = state.historyIndex + 1;
        const nextState = state.history[nextIndex].afterState;
        
        set({
          tracks: nextState.tracks,
          annotations: nextState.annotations,
          historyIndex: nextIndex
        });
      },
      
      clearHistory: () => set({ history: [], historyIndex: -1 }),
      
      importTracks: (newTracks) => {
        const state = get();
        const tracksWithId = newTracks.map(t => ({
          ...t,
          id: t.id || generateId(),
          createdAt: t.createdAt || new Date()
        }));
        
        const allTracks = [...state.tracks, ...tracksWithId];
        const historyRecord: HistoryRecord = {
          id: generateId(),
          actionType: 'import' as ActionType,
          description: `导入 ${newTracks.length} 条轨迹`,
          beforeState: { tracks: state.tracks, annotations: state.annotations },
          afterState: { tracks: allTracks, annotations: state.annotations },
          timestamp: new Date()
        };
        
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(historyRecord);
        
        set({
          tracks: allTracks,
          history: newHistory.slice(-MAX_HISTORY),
          historyIndex: Math.min(newHistory.length - 1, MAX_HISTORY - 1)
        });
      },
      
      reset: () => set({
        tracks: [],
        annotations: [],
        history: [],
        ...initialState
      })
    }),
    {
      name: 'tactics-whiteboard-storage',
      partialize: (state) => ({
        tracks: state.tracks,
        annotations: state.annotations
      })
    }
  )
);
