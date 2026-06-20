import { create } from 'zustand';
import type { FailureLog, FailureGroup, TrainingTask, ManualCorrection, PublicNote } from '@/types';
import { mockFailureLogs, mockTasks, mockCorrections, mockPublicNotes } from '@/data/sampleData';
import { buildMainlineGroups } from '@/utils/mainlineBuilder';

interface FailureState {
  tasks: TrainingTask[];
  logs: FailureLog[];
  groups: FailureGroup[];
  corrections: ManualCorrection[];
  notes: PublicNote[];
  selectedGroupId: string | null;
  selectedLogId: string | null;
  init: () => void;
  setSelectedGroup: (id: string | null) => void;
  setSelectedLog: (id: string | null) => void;
  addCorrection: (group: Omit<ManualCorrection, 'id' | 'createTime'>) => void;
  addPublicNote: (note: Omit<PublicNote, 'id' | 'createTime'>) => void;
  updateGroupStatus: (groupId: string, status: FailureGroup['status']) => void;
}

export const useFailureStore = create<FailureState>((set, get) => ({
  tasks: [],
  logs: [],
  groups: [],
  corrections: [],
  notes: [],
  selectedGroupId: null,
  selectedLogId: null,
  init: () => {
    const { logs: currentLogs, tasks: currentTasks } = get();
    if (currentLogs.length > 0) return;
    const logs = [...mockFailureLogs];
    const tasks = [...mockTasks];
    const groups = buildMainlineGroups(logs, tasks);
    set({
      logs,
      tasks,
      groups,
      corrections: [...mockCorrections],
      notes: [...mockPublicNotes]
    });
  },
  setSelectedGroup: (id) => set({ selectedGroupId: id }),
  setSelectedLog: (id) => set({ selectedLogId: id }),
  addCorrection: (c) => set(state => ({
    corrections: [
      ...state.corrections,
      { ...c, id: `cor_${Date.now()}`, createTime: new Date().toISOString() }
    ]
  })),
  addPublicNote: (n) => set(state => ({
    notes: [
      ...state.notes,
      { ...n, id: `note_${Date.now()}`, createTime: new Date().toISOString() }
    ]
  })),
  updateGroupStatus: (groupId, status) => set(state => ({
    groups: state.groups.map(g => g.id === groupId ? { ...g, status } : g)
  }))
}));
