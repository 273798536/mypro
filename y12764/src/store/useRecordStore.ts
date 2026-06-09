import { create } from "zustand";
import type { LabRecord, RecordStore } from "@/types";
import { mockRecords } from "@/data/mockData";

const STORAGE_KEY = "tlc_records_supplement_v1";

function loadFromStorage(): Record<string, Partial<LabRecord>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Partial<LabRecord>>) : {};
  } catch {
    return {};
  }
}

function saveToStorage(data: Record<string, Partial<LabRecord>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function mergeRecords(base: LabRecord[], supplements: Record<string, Partial<LabRecord>>): LabRecord[] {
  return base.map((r) => {
    const patch = supplements[r.id];
    if (!patch) return r;
    const merged = { ...r, ...patch };
    if (patch.reactionTime && r.notes.length > 0) {
      merged.notes = r.notes.filter((n) => n.type !== "missing_time");
      if (merged.notes.length === 0) {
        merged.status = "success";
      }
    }
    return merged;
  });
}

export const useRecordStore = create<RecordStore>((set, get) => {
  const supplements = loadFromStorage();
  return {
    records: mergeRecords(mockRecords, supplements),
    getRecord: (id) => get().records.find((r) => r.id === id),
    updateRecord: (id, patch) => {
      const current = loadFromStorage();
      const merged = { ...current, [id]: { ...(current[id] || {}), ...patch } };
      saveToStorage(merged);
      set({ records: mergeRecords(mockRecords, merged) });
    },
    clearSupplement: (id) => {
      const current = loadFromStorage();
      delete current[id];
      saveToStorage(current);
      set({ records: mergeRecords(mockRecords, current) });
    },
  };
});
