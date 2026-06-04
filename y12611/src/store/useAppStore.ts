import { create } from 'zustand';
import type { DataSource, CoastlineRecord, Anomaly, CanvasState, ProcessOpinion, HistoryState } from '../types';
import { mockDataSources, mockRecords, mockCanvasStates, mockProcessOpinions } from '../data/mockData';

interface AppState {
  dataSources: DataSource[];
  records: CoastlineRecord[];
  anomalies: Anomaly[];
  canvasHistory: Record<string, HistoryState>;
  processOpinions: ProcessOpinion[];
  selectedRecordId: string | null;
  isLoading: boolean;
  
  loadMockData: () => void;
  setSelectedRecord: (id: string | null) => void;
  resolveAnomaly: (anomalyId: string) => void;
  addProcessOpinion: (anomalyId: string, content: string, author: string) => void;
  addCanvasState: (recordId: string, snapshot: string, description: string) => void;
  undo: (recordId: string) => void;
  redo: (recordId: string) => void;
  getCurrentCanvasState: (recordId: string) => CanvasState | null;
  getCanvasHistory: (recordId: string) => CanvasState[];
  importData: (files: File[]) => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(7);

export const useAppStore = create<AppState>((set, get) => ({
  dataSources: [],
  records: [],
  anomalies: [],
  canvasHistory: {},
  processOpinions: [],
  selectedRecordId: null,
  isLoading: false,

  loadMockData: () => {
    const allAnomalies = mockRecords.flatMap(r => r.anomalies);
    
    const initialHistory: Record<string, HistoryState> = {};
    mockRecords.forEach(record => {
      const recordStates = mockCanvasStates.filter(cs => cs.recordId === record.id);
      if (recordStates.length > 0) {
        initialHistory[record.id] = {
          past: recordStates.slice(0, -1),
          present: recordStates[recordStates.length - 1],
          future: [],
        };
      }
    });

    set({
      dataSources: mockDataSources,
      records: mockRecords,
      anomalies: allAnomalies,
      canvasHistory: initialHistory,
      processOpinions: mockProcessOpinions,
    });
  },

  setSelectedRecord: (id) => set({ selectedRecordId: id }),

  resolveAnomaly: (anomalyId) => {
    set(state => ({
      anomalies: state.anomalies.map(a => 
        a.id === anomalyId ? { ...a, resolved: true } : a
      ),
      records: state.records.map(r => ({
        ...r,
        anomalies: r.anomalies.map(a => 
          a.id === anomalyId ? { ...a, resolved: true } : a
        ),
        hasAnomaly: r.anomalies.some(a => a.id !== anomalyId && !a.resolved),
      })),
    }));
  },

  addProcessOpinion: (anomalyId, content, author) => {
    const newOpinion: ProcessOpinion = {
      id: `op-${generateId()}`,
      anomalyId,
      content,
      createTime: new Date(),
      author,
    };
    set(state => ({
      processOpinions: [...state.processOpinions, newOpinion],
    }));
  },

  addCanvasState: (recordId, snapshot, description) => {
    set(state => {
      const currentHistory = state.canvasHistory[recordId] || { past: [], present: null, future: [] };
      const newVersion = (currentHistory.present?.version || 0) + 1;
      
      const newState: CanvasState = {
        id: `canvas-${generateId()}`,
        recordId,
        version: newVersion,
        snapshot,
        timestamp: new Date(),
        operation: 'modify',
        description,
      };

      return {
        canvasHistory: {
          ...state.canvasHistory,
          [recordId]: {
            past: currentHistory.present ? [...currentHistory.past, currentHistory.present] : currentHistory.past,
            present: newState,
            future: [],
          },
        },
      };
    });
  },

  undo: (recordId) => {
    set(state => {
      const history = state.canvasHistory[recordId];
      if (!history || history.past.length === 0) return state;

      const newPast = [...history.past];
      const previousState = newPast.pop()!;
      
      const undoState: CanvasState = {
        ...previousState,
        id: `canvas-${generateId()}`,
        timestamp: new Date(),
        operation: 'undo',
        description: `撤销: ${history.present?.description || '上一步操作'}`,
      };

      return {
        canvasHistory: {
          ...state.canvasHistory,
          [recordId]: {
            past: newPast,
            present: undoState,
            future: history.present ? [history.present, ...history.future] : history.future,
          },
        },
      };
    });
  },

  redo: (recordId) => {
    set(state => {
      const history = state.canvasHistory[recordId];
      if (!history || history.future.length === 0) return state;

      const newFuture = [...history.future];
      const nextState = newFuture.shift()!;
      
      const redoState: CanvasState = {
        ...nextState,
        id: `canvas-${generateId()}`,
        timestamp: new Date(),
        operation: 'redo',
        description: `重做: ${nextState.description}`,
      };

      return {
        canvasHistory: {
          ...state.canvasHistory,
          [recordId]: {
            past: history.present ? [...history.past, history.present] : history.past,
            present: redoState,
            future: newFuture,
          },
        },
      };
    });
  },

  getCurrentCanvasState: (recordId) => {
    return get().canvasHistory[recordId]?.present || null;
  },

  getCanvasHistory: (recordId) => {
    const history = get().canvasHistory[recordId];
    if (!history) return [];
    return [...history.past, history.present].filter(Boolean) as CanvasState[];
  },

  importData: async (files) => {
    set({ isLoading: true });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newSources: DataSource[] = files.map((file, index) => ({
      id: `src-imported-${generateId()}`,
      name: file.name,
      type: file.name.includes('颜色') ? 'color_rule' : file.name.includes('评分') ? 'score_table' : 'basemap_coords',
      uploadTime: new Date(),
      fileName: file.name,
    }));

    set(state => ({
      dataSources: [...state.dataSources, ...newSources],
      isLoading: false,
    }));
  },
}));
