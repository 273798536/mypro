import { create } from 'zustand';
import { AppState, Measure, Annotation, ChangeRecord, TraceNode } from '../types';
import { mockMeasures, mockAnnotations, mockChangeRecords, mockTraceNodes, mockAudioClips } from '../data/mockData';

interface AppStore extends AppState {
  setCurrentAudioClip: (id: string) => void;
  setCurrentMeasure: (id: string | null) => void;
  setPlaybackTime: (time: number) => void;
  togglePlay: () => void;
  updateChord: (measureId: string, newChord: string) => void;
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => void;
  updateAnnotation: (id: string, content: string) => void;
  selectTraceNode: (id: string | null) => void;
  getMeasureById: (id: string) => Measure | undefined;
  getAnnotationsForMeasure: (measureId: string) => Annotation[];
}

export const useStore = create<AppStore>((set, get) => ({
  audioClips: mockAudioClips,
  measures: mockMeasures,
  annotations: mockAnnotations,
  changeRecords: mockChangeRecords,
  traceNodes: mockTraceNodes,
  currentAudioClipId: 'clip-001',
  currentMeasureId: null,
  playbackTime: 0,
  isPlaying: false,
  selectedTraceNodeId: null,

  setCurrentAudioClip: (id: string) => set({ currentAudioClipId: id }),
  
  setCurrentMeasure: (id: string | null) => set({ currentMeasureId: id }),
  
  setPlaybackTime: (time: number) => set({ playbackTime: time }),
  
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  updateChord: (measureId: string, newChord: string) => {
    const state = get();
    const measure = state.measures.find((m) => m.id === measureId);
    if (!measure) return;

    const oldChord = measure.chord;
    
    const newChangeRecord: ChangeRecord = {
      id: `cr-${Date.now()}`,
      entityType: 'chord',
      entityId: measureId,
      fieldName: 'chord',
      oldValue: oldChord,
      newValue: newChord,
      source: 'manual',
      operator: '张老师',
      timestamp: Date.now(),
    };

    set((state) => ({
      measures: state.measures.map((m) =>
        m.id === measureId ? { ...m, chord: newChord, expectedChord: newChord } : m
      ),
      changeRecords: [newChangeRecord, ...state.changeRecords],
    }));
  },

  addAnnotation: (annotation) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: `ann-${Date.now()}`,
      timestamp: Date.now(),
    };

    const newChangeRecord: ChangeRecord = {
      id: `cr-${Date.now()}`,
      entityType: 'annotation',
      entityId: newAnnotation.id,
      fieldName: 'content',
      oldValue: '',
      newValue: annotation.content,
      source: 'manual',
      operator: '张老师',
      timestamp: Date.now(),
    };

    set((state) => ({
      annotations: [...state.annotations, newAnnotation],
      changeRecords: [newChangeRecord, ...state.changeRecords],
    }));
  },

  updateAnnotation: (id: string, content: string) => {
    const state = get();
    const annotation = state.annotations.find((a) => a.id === id);
    if (!annotation) return;

    const newChangeRecord: ChangeRecord = {
      id: `cr-${Date.now()}`,
      entityType: 'annotation',
      entityId: id,
      fieldName: 'content',
      oldValue: annotation.content,
      newValue: content,
      source: 'manual',
      operator: '张老师',
      timestamp: Date.now(),
    };

    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, content } : a
      ),
      changeRecords: [newChangeRecord, ...state.changeRecords],
    }));
  },

  selectTraceNode: (id: string | null) => set({ selectedTraceNodeId: id }),

  getMeasureById: (id: string) => get().measures.find((m) => m.id === id),

  getAnnotationsForMeasure: (measureId: string) =>
    get().annotations.filter((a) => a.measureId === measureId),
}));
