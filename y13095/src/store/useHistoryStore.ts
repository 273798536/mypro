import { create } from 'zustand';
import type { HistoryRecord, ActionType, ViewCondition } from '@/types';
import { getStorage, setStorage, generateId } from '@/utils/storage';
import { mockHistory } from '@/data/mockData';

interface HistoryState {
  records: HistoryRecord[];
  loadHistory: () => void;
  addRecord: (
    pointId: string,
    operator: string,
    actionType: ActionType,
    data: {
      oldValue?: string;
      newValue?: string;
      remark?: string;
      screenshot?: string;
      viewCondition?: ViewCondition;
    }
  ) => void;
  getHistoryByPointId: (pointId: string) => HistoryRecord[];
  getAllHistory: () => HistoryRecord[];
}

const STORAGE_KEY = 'history';
const INIT_FLAG = 'history_initialized';

export const useHistoryStore = create<HistoryState>((set, get) => ({
  records: [],

  loadHistory: () => {
    const initialized = getStorage(INIT_FLAG, false);
    if (!initialized) {
      setStorage(STORAGE_KEY, mockHistory);
      setStorage(INIT_FLAG, true);
      set({ records: mockHistory });
    } else {
      const records = getStorage<HistoryRecord[]>(STORAGE_KEY, mockHistory);
      set({ records });
    }
  },

  addRecord: (pointId, operator, actionType, data) => {
    const { records } = get();
    
    const newRecord: HistoryRecord = {
      id: generateId(),
      pointId,
      operator,
      actionType,
      oldValue: data.oldValue,
      newValue: data.newValue,
      remark: data.remark,
      screenshot: data.screenshot,
      viewCondition: data.viewCondition,
      timestamp: new Date().toISOString(),
    };

    const updatedRecords = [newRecord, ...records];
    setStorage(STORAGE_KEY, updatedRecords);
    set({ records: updatedRecords });
  },

  getHistoryByPointId: (pointId) => {
    return get().records
      .filter(r => r.pointId === pointId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  getAllHistory: () => {
    return [...get().records].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },
}));
