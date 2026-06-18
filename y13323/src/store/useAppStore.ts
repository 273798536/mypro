import { create } from 'zustand';
import type { Sample, WithdrawalRecord, ReplayReport, TimelineEvent, Note, DashboardStats } from '@/types';
import { mockSamples } from '@/data/samples';
import { mockWithdrawals } from '@/data/withdrawals';
import { mockReplayReport } from '@/data/report';
import { mockTimeline, mockNotes, mockDashboardStats } from '@/data/timeline';
import { getStorage, setStorage } from '@/utils/storage';

interface AppState {
  samples: Sample[];
  withdrawals: WithdrawalRecord[];
  report: ReplayReport | null;
  timeline: TimelineEvent[];
  notes: Note[];
  dashboardStats: DashboardStats;
  selectedSampleId: string | null;
  selectedWithdrawalId: string | null;
  isLoading: boolean;

  setSelectedSampleId: (id: string | null) => void;
  setSelectedWithdrawalId: (id: string | null) => void;

  getSampleById: (id: string) => Sample | undefined;
  getWithdrawalById: (id: string) => WithdrawalRecord | undefined;
  getNotesByTarget: (targetType: string, targetId: string) => Note[];

  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSampleStatus: (sampleId: string, status: Sample['status']) => void;
  updateWithdrawalStatus: (withdrawalId: string, status: WithdrawalRecord['status']) => void;

  loadFromStorage: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  samples: mockSamples,
  withdrawals: mockWithdrawals,
  report: mockReplayReport,
  timeline: mockTimeline,
  notes: mockNotes,
  dashboardStats: mockDashboardStats,
  selectedSampleId: null,
  selectedWithdrawalId: null,
  isLoading: false,

  setSelectedSampleId: (id) => set({ selectedSampleId: id }),
  setSelectedWithdrawalId: (id) => set({ selectedWithdrawalId: id }),

  getSampleById: (id) => get().samples.find((s) => s.id === id),
  getWithdrawalById: (id) => get().withdrawals.find((w) => w.id === id),
  getNotesByTarget: (targetType, targetId) =>
    get().notes.filter((n) => n.targetType === targetType && n.targetId === targetId),

  addNote: (noteData) => {
    const newNote: Note = {
      ...noteData,
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newEvent: TimelineEvent = {
      id: `tl-${Date.now()}`,
      type: 'note',
      title: `${newNote.author}添加备注`,
      description: newNote.content.slice(0, 50) + (newNote.content.length > 50 ? '...' : ''),
      timestamp: newNote.createdAt,
      relatedId: newNote.targetId,
      status: 'info',
    };

    set((state) => {
      const updatedNotes = [...state.notes, newNote];
      const updatedTimeline = [...state.timeline, newEvent].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setStorage('notes', updatedNotes);
      setStorage('timeline', updatedTimeline);

      return {
        notes: updatedNotes,
        timeline: updatedTimeline,
      };
    });
  },

  updateSampleStatus: (sampleId, status) => {
    const sample = get().samples.find((s) => s.id === sampleId);
    if (!sample) return;

    const oldStatus = sample.status;

    const newEvent: TimelineEvent = {
      id: `tl-${Date.now()}`,
      type: 'status_change',
      title: `${sample.title} 状态变更`,
      description: `状态从${oldStatus}变更为${status}`,
      timestamp: new Date().toISOString(),
      relatedId: sampleId,
      status: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning',
    };

    set((state) => {
      const updatedSamples = state.samples.map((s) =>
        s.id === sampleId ? { ...s, status, updatedAt: new Date().toISOString() } : s
      );
      const updatedTimeline = [...state.timeline, newEvent].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setStorage('samples', updatedSamples);
      setStorage('timeline', updatedTimeline);

      return {
        samples: updatedSamples,
        timeline: updatedTimeline,
      };
    });
  },

  updateWithdrawalStatus: (withdrawalId, status) => {
    const withdrawal = get().withdrawals.find((w) => w.id === withdrawalId);
    if (!withdrawal) return;

    set((state) => {
      const updatedWithdrawals = state.withdrawals.map((w) =>
        w.id === withdrawalId ? { ...w, status } : w
      );

      setStorage('withdrawals', updatedWithdrawals);

      return {
        withdrawals: updatedWithdrawals,
      };
    });
  },

  loadFromStorage: () => {
    const savedNotes = getStorage<Note[]>('notes', null);
    const savedTimeline = getStorage<TimelineEvent[]>('timeline', null);
    const savedSamples = getStorage<Sample[]>('samples', null);

    if (savedNotes) {
      set({ notes: savedNotes });
    }
    if (savedTimeline) {
      set({ timeline: savedTimeline });
    }
    if (savedSamples) {
      set({ samples: savedSamples });
    }
  },
}));
