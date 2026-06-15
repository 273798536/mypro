import { create } from 'zustand';
import type { Complaint, MergeableComplaintGroup } from '@/types';
import { mockComplaints } from '@/data/mockData';

interface ComplaintStoreState {
  complaints: Complaint[];
  loading: boolean;
  error: string | null;
  mergeableGroups: MergeableComplaintGroup[];
  showMergePrompt: boolean;
  pendingMergeGroup: MergeableComplaintGroup | null;
}

interface ComplaintStoreActions {
  fetchComplaints: () => Promise<void>;
  getComplaintById: (id: string) => Complaint | undefined;
  getComplaintsByListItemId: (listItemId: string) => Complaint[];
  getMergeableGroups: () => MergeableComplaintGroup[];
  setShowMergePrompt: (show: boolean, group?: MergeableComplaintGroup | null) => void;
  mergeComplaints: (group: MergeableComplaintGroup, explanation: string) => void;
  resolveComplaint: (id: string) => void;
}

type ComplaintStore = ComplaintStoreState & ComplaintStoreActions;

export const useComplaintStore = create<ComplaintStore>((set, get) => ({
  complaints: [],
  loading: false,
  error: null,
  mergeableGroups: [],
  showMergePrompt: false,
  pendingMergeGroup: null,

  fetchComplaints: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const complaints = JSON.parse(JSON.stringify(mockComplaints));
      set({ complaints, loading: false });
      const mergeableGroups = get().getMergeableGroups();
      set({ mergeableGroups });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载投诉数据失败', loading: false });
    }
  },

  getComplaintById: (id: string) => {
    return get().complaints.find(c => c.id === id);
  },

  getComplaintsByListItemId: (listItemId: string) => {
    return get().complaints.filter(c => c.listItemId === listItemId);
  },

  getMergeableGroups: () => {
    const { complaints } = get();
    const groups: MergeableComplaintGroup[] = [];
    const groupMap = new Map<string, Complaint[]>();

    complaints
      .filter(c => c.status === 'pending')
      .forEach(complaint => {
        const key = `${complaint.street}-${complaint.listItemId}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, []);
        }
        groupMap.get(key)!.push(complaint);
      });

    groupMap.forEach((groupComplaints, key) => {
      if (groupComplaints.length > 1) {
        const [first] = groupComplaints;
        groups.push({
          key,
          street: first.street,
          listItemId: first.listItemId,
          complaints: groupComplaints,
        });
      }
    });

    return groups;
  },

  setShowMergePrompt: (show: boolean, group?: MergeableComplaintGroup | null) => {
    set({
      showMergePrompt: show,
      pendingMergeGroup: group ?? null,
    });
  },

  mergeComplaints: (group: MergeableComplaintGroup, explanation: string) => {
    const { complaints } = get();
    const originalIds = group.complaints.map(c => c.id).join(',');
    const newId = `comp-merged-${Date.now()}`;
    const now = new Date().toISOString();

    const mergedContent = group.complaints
      .map(c => `【${c.reporter}】${c.content}`)
      .join('\n');

    const newComplaint: Complaint = {
      id: newId,
      listItemId: group.listItemId,
      street: group.street,
      content: `${mergedContent}\n\n【归并说明】${explanation}`,
      reporter: '系统归并',
      status: 'pending',
      originalIds,
      createdAt: now,
    };

    const updatedComplaints = complaints.map(complaint => {
      if (group.complaints.some(c => c.id === complaint.id)) {
        return {
          ...complaint,
          status: 'merged' as const,
          mergedInto: newId,
        };
      }
      return complaint;
    });

    updatedComplaints.push(newComplaint);

    set({ complaints: updatedComplaints, showMergePrompt: false, pendingMergeGroup: null });
    const mergeableGroups = get().getMergeableGroups();
    set({ mergeableGroups });
  },

  resolveComplaint: (id: string) => {
    const { complaints } = get();
    const updatedComplaints = complaints.map(complaint => {
      if (complaint.id === id) {
        return {
          ...complaint,
          status: 'resolved' as const,
        };
      }
      return complaint;
    });

    set({ complaints: updatedComplaints });
    const mergeableGroups = get().getMergeableGroups();
    set({ mergeableGroups });
  },
}));
