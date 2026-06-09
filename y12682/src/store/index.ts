import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ShardNode,
  TopologyLink,
  ProcessRecord,
  AnomalyRecord,
  TimelineSyncRecord,
  Level,
  ViewState,
  SettlementData,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

interface TopologyState {
  nodes: ShardNode[];
  links: TopologyLink[];
  selectedNodeId: string | null;
  setNodes: (nodes: ShardNode[]) => void;
  setLinks: (links: TopologyLink[]) => void;
  selectNode: (id: string | null) => void;
  addNode: (node: ShardNode) => void;
  updateNode: (id: string, updates: Partial<ShardNode>) => void;
  deleteNode: (id: string) => void;
}

interface LevelState {
  levels: Level[];
  currentLevelId: string | null;
  settlements: SettlementData[];
  setLevels: (levels: Level[]) => void;
  setCurrentLevel: (id: string | null) => void;
  completeLevel: (settlement: SettlementData) => void;
  resetLevel: (id: string) => void;
  updateLevelTask: (levelId: string, taskId: string, completed: boolean) => void;
  unlockLevel: (id: string) => void;
}

interface RecordState {
  processRecords: ProcessRecord[];
  addRecord: (record: Omit<ProcessRecord, 'id' | 'timestamp'>) => void;
  getRecordsByTimeRange: (start: number, end: number) => ProcessRecord[];
  clearRecords: () => void;
}

interface AnomalyState {
  anomalies: AnomalyRecord[];
  addAnomaly: (anomaly: Omit<AnomalyRecord, 'id' | 'timestamp'>) => void;
  updateAnomaly: (id: string, updates: Partial<AnomalyRecord>) => void;
  addHandling: (anomalyId: string, handling: AnomalyRecord['handling'][0]) => void;
  resolveAnomaly: (id: string) => void;
}

interface TimelineState {
  syncRecords: TimelineSyncRecord[];
  addSyncRecord: (record: Omit<TimelineSyncRecord, 'id' | 'timestamp'>) => void;
  reviewSync: (id: string, review: TimelineSyncRecord['review']) => void;
}

interface ViewStateStore {
  currentView: ViewState;
  viewHistory: ViewState[];
  saveView: (view: ViewState) => void;
  restoreView: (index: number) => void;
  resetView: () => void;
}

interface PlaybackState {
  isPlaying: boolean;
  playbackSpeed: number;
  currentTime: number;
  duration: number;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setTime: (time: number) => void;
}

export const useTopologyStore = create<TopologyState>()(
  persist(
    (set) => ({
      nodes: [],
      links: [],
      selectedNodeId: null,
      setNodes: (nodes) => set({ nodes }),
      setLinks: (links) => set({ links }),
      selectNode: (id) => set({ selectedNodeId: id }),
      addNode: (node) =>
        set((state) => ({ nodes: [...state.nodes, node] })),
      updateNode: (id, updates) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        })),
      deleteNode: (id) =>
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          links: state.links.filter((l) => l.source !== id && l.target !== id),
        })),
    }),
    { name: 'topology-storage' }
  )
);

export const useLevelStore = create<LevelState>()(
  persist(
    (set) => ({
      levels: [],
      currentLevelId: null,
      settlements: [],
      setLevels: (levels) => set({ levels }),
      setCurrentLevel: (id) => set({ currentLevelId: id }),
      completeLevel: (settlement) =>
        set((state) => ({
          settlements: [...state.settlements, settlement],
          levels: state.levels.map((l) =>
            l.id === settlement.levelId
              ? { ...l, status: settlement.passed ? 'completed' : 'failed' }
              : l
          ),
        })),
      resetLevel: (id) =>
        set((state) => ({
          levels: state.levels.map((l) =>
            l.id === id ? { ...l, status: 'active', tasks: l.tasks.map(t => ({ ...t, completed: false })) } : l
          ),
        })),
      updateLevelTask: (levelId, taskId, completed) =>
        set((state) => ({
          levels: state.levels.map((l) =>
            l.id === levelId
              ? {
                  ...l,
                  tasks: l.tasks.map((t) =>
                    t.id === taskId ? { ...t, completed } : t
                  ),
                }
              : l
          ),
        })),
      unlockLevel: (id) =>
        set((state) => ({
          levels: state.levels.map((l) =>
            l.id === id ? { ...l, status: 'active' } : l
          ),
        })),
    }),
    { name: 'level-storage' }
  )
);

export const useRecordStore = create<RecordState>()(
  persist(
    (set, get) => ({
      processRecords: [],
      addRecord: (record) =>
        set((state) => ({
          processRecords: [
            ...state.processRecords,
            { ...record, id: uuidv4(), timestamp: Date.now() },
          ],
        })),
      getRecordsByTimeRange: (start, end) =>
        get().processRecords.filter(
          (r) => r.timestamp >= start && r.timestamp <= end
        ),
      clearRecords: () => set({ processRecords: [] }),
    }),
    { name: 'record-storage' }
  )
);

export const useAnomalyStore = create<AnomalyState>()(
  persist(
    (set) => ({
      anomalies: [],
      addAnomaly: (anomaly) =>
        set((state) => ({
          anomalies: [
            ...state.anomalies,
            { ...anomaly, id: uuidv4(), timestamp: Date.now() },
          ],
        })),
      updateAnomaly: (id, updates) =>
        set((state) => ({
          anomalies: state.anomalies.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),
      addHandling: (anomalyId, handling) =>
        set((state) => ({
          anomalies: state.anomalies.map((a) =>
            a.id === anomalyId
              ? { ...a, handling: [...a.handling, handling] }
              : a
          ),
        })),
      resolveAnomaly: (id) =>
        set((state) => ({
          anomalies: state.anomalies.map((a) =>
            a.id === id ? { ...a, status: 'resolved' } : a
          ),
        })),
    }),
    { name: 'anomaly-storage' }
  )
);

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set) => ({
      syncRecords: [],
      addSyncRecord: (record) =>
        set((state) => ({
          syncRecords: [
            ...state.syncRecords,
            { ...record, id: uuidv4(), timestamp: Date.now() },
          ],
        })),
      reviewSync: (id, review) =>
        set((state) => ({
          syncRecords: state.syncRecords.map((r) =>
            r.id === id ? { ...r, review } : r
          ),
        })),
    }),
    { name: 'timeline-storage' }
  )
);

export const useViewStore = create<ViewStateStore>()(
  persist(
    (set) => ({
      currentView: { x: 0, y: 0, zoom: 1, timestamp: Date.now() },
      viewHistory: [],
      saveView: (view) =>
        set((state) => ({
          currentView: view,
          viewHistory: [...state.viewHistory.slice(-19), view],
        })),
      restoreView: (index) =>
        set((state) => ({
          currentView: state.viewHistory[index] || state.currentView,
        })),
      resetView: () =>
        set({ currentView: { x: 0, y: 0, zoom: 1, timestamp: Date.now() } }),
    }),
    { name: 'view-storage' }
  )
);

export const usePlaybackStore = create<PlaybackState>()((set) => ({
  isPlaying: false,
  playbackSpeed: 1,
  currentTime: 0,
  duration: 0,
  setPlaying: (playing) => set({ isPlaying: playing }),
  setSpeed: (speed) => set({ playbackSpeed: speed }),
  setTime: (time) => set({ currentTime: time }),
}));
