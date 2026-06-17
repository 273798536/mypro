import { create } from "zustand";
import type { Entry, EntryInput, MergeGroup } from "@/types";
import * as api from "@/lib/api";
import { detectAnomalies, type AnomalyFlags } from "@/lib/anomaly";

interface ToastState {
  id: number;
  message: string;
}

interface GroupPatchBody {
  merged_name?: string;
  merged_latitude?: number;
  merged_longitude?: number;
  remark?: string;
}

interface AppState {
  entries: Entry[];
  groups: MergeGroup[];
  loadingEntries: boolean;
  loadingGroups: boolean;
  toast: ToastState | null;

  fetchEntries: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  runMerge: () => Promise<void>;
  createEntries: (entries: EntryInput[]) => Promise<Entry[]>;
  patchEntry: (id: number, body: Partial<Entry>) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  patchGroup: (id: number, body: GroupPatchBody) => Promise<void>;
  ungroupEntry: (entryId: number) => Promise<void>;
  groupEntry: (entryId: number, groupId: number) => Promise<void>;
  seedData: () => Promise<void>;
  exportCsv: () => Promise<void>;
  showToast: (message: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<AppState>((set, get) => ({
  entries: [],
  groups: [],
  loadingEntries: false,
  loadingGroups: false,
  toast: null,

  fetchEntries: async () => {
    set({ loadingEntries: true });
    try {
      const entries = await api.fetchEntries();
      set({ entries });
    } finally {
      set({ loadingEntries: false });
    }
  },

  fetchGroups: async () => {
    set({ loadingGroups: true });
    try {
      const groups = await api.fetchGroups();
      const entries = await api.fetchEntries();
      set({ groups, entries });
    } finally {
      set({ loadingGroups: false });
    }
  },

  runMerge: async () => {
    await api.runMerge();
    await get().fetchGroups();
  },

  createEntries: async (entries) => {
    const created = await api.createEntries(entries);
    await get().fetchEntries();
    return created;
  },

  patchEntry: async (id, body) => {
    const updated = await api.patchEntry(id, body);
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? updated : e)),
    }));
  },

  deleteEntry: async (id) => {
    await api.deleteEntry(id);
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
  },

  patchGroup: async (id, body) => {
    await api.patchGroup(id, body);
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === id ? { ...g, ...body, updated_at: new Date().toISOString() } : g,
      ),
    }));
  },

  ungroupEntry: async (entryId) => {
    await api.ungroupEntry(entryId);
    await get().fetchGroups();
  },

  groupEntry: async (entryId, groupId) => {
    await api.groupEntry(entryId, groupId);
    await get().fetchGroups();
  },

  seedData: async () => {
    await api.seedData();
    await get().fetchEntries();
  },

  exportCsv: async () => {
    await api.exportCsv();
  },

  showToast: (message) => {
    const id = Date.now();
    set({ toast: { id, message } });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 1800);
  },
}));

export function getGroupAnomalies(group: MergeGroup): AnomalyFlags[] {
  return detectAnomalies(group.entries);
}

export function getEntryAnomalies<T extends { name: string; latitude: number; longitude: number }>(
  entries: T[],
): AnomalyFlags[] {
  return detectAnomalies(entries);
}
