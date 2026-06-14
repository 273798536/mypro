import { create } from 'zustand';
import type { EquipmentRecord, NameplateData, JudgmentHistory } from '@/types';
import { equipmentRecords, nameplateData, initialJudgmentHistories } from '@/data/mockData';

interface StoreState {
  records: EquipmentRecord[];
  nameplates: NameplateData[];
  judgmentHistories: JudgmentHistory[];
  selectedRecordId: string | null;
  nameplateDrawerOpen: boolean;
  nameplateDrawerCode: string | null;
  modifyDialogOpen: boolean;
  modifyDialogRecordId: string | null;

  selectRecord: (id: string | null) => void;
  openNameplateDrawer: (equipmentCode: string) => void;
  closeNameplateDrawer: () => void;
  openModifyDialog: (recordId: string) => void;
  closeModifyDialog: () => void;
  addJudgmentHistory: (entry: Omit<JudgmentHistory, 'id'>) => void;
  updateRecordJudgment: (recordId: string, newJudgment: string) => void;
  getDuplicateRecords: (equipmentCode: string) => EquipmentRecord[];
  getNameplateByCode: (equipmentCode: string) => NameplateData | undefined;
  getHistoriesByRecordId: (recordId: string) => JudgmentHistory[];
}

const STORAGE_KEY = 'pulley-recalc-histories';

function loadHistories(): JudgmentHistory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return initialJudgmentHistories;
}

function saveHistories(histories: JudgmentHistory[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(histories));
}

export const useStore = create<StoreState>((set, get) => ({
  records: equipmentRecords,
  nameplates: nameplateData,
  judgmentHistories: loadHistories(),
  selectedRecordId: null,
  nameplateDrawerOpen: false,
  nameplateDrawerCode: null,
  modifyDialogOpen: false,
  modifyDialogRecordId: null,

  selectRecord: (id) => set({ selectedRecordId: id }),

  openNameplateDrawer: (equipmentCode) =>
    set({ nameplateDrawerOpen: true, nameplateDrawerCode: equipmentCode }),

  closeNameplateDrawer: () =>
    set({ nameplateDrawerOpen: false, nameplateDrawerCode: null }),

  openModifyDialog: (recordId) =>
    set({ modifyDialogOpen: true, modifyDialogRecordId: recordId }),

  closeModifyDialog: () =>
    set({ modifyDialogOpen: false, modifyDialogRecordId: null }),

  addJudgmentHistory: (entry) => {
    const newEntry: JudgmentHistory = {
      ...entry,
      id: `JH-${Date.now()}`,
    };
    const updated = [newEntry, ...get().judgmentHistories];
    saveHistories(updated);
    set({ judgmentHistories: updated });
  },

  updateRecordJudgment: (recordId, newJudgment) => {
    const records = get().records.map((r) =>
      r.id === recordId ? { ...r, judgment: newJudgment } : r
    );
    set({ records });
  },

  getDuplicateRecords: (equipmentCode) =>
    get().records.filter((r) => r.equipmentCode === equipmentCode),

  getNameplateByCode: (equipmentCode) =>
    get().nameplates.find((n) => n.equipmentCode === equipmentCode),

  getHistoriesByRecordId: (recordId) =>
    get().judgmentHistories.filter((h) => h.recordId === recordId),
}));
