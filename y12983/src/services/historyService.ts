import type { HistoryLog, GapStatus, HistoryAction } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { getMockHistory } from '@/mock/history';

const STORAGE_KEY = 'history';

const getAllHistory = (): HistoryLog[] => {
  return storage.get<HistoryLog[]>(STORAGE_KEY, []);
};

const saveAllHistory = (history: HistoryLog[]): void => {
  storage.set(STORAGE_KEY, history);
};

export const historyService = {
  listByGapId(gapId: string): HistoryLog[] {
    const history = getAllHistory();
    return history
      .filter((h) => h.gapId === gapId)
      .sort((a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime());
  },

  listRecent(limit = 10): HistoryLog[] {
    const history = getAllHistory();
    return history
      .sort((a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime())
      .slice(0, limit);
  },

  add(log: Omit<HistoryLog, 'id' | 'operatedAt'>): HistoryLog {
    const history = getAllHistory();
    const newLog: HistoryLog = {
      ...log,
      id: 'hist_' + generateId(),
      operatedAt: new Date().toISOString(),
    };

    history.push(newLog);
    saveAllHistory(history);

    return newLog;
  },

  addStatusChange(gapId: string, fromStatus: GapStatus, toStatus: GapStatus, operator: string): HistoryLog {
    return this.add({
      gapId,
      action: 'status_changed',
      operator,
      detail: `状态变更：${statusLabel(fromStatus)} → ${statusLabel(toStatus)}`,
      fromStatus,
      toStatus,
    });
  },

  addCreated(gapId: string, operator: string, detail: string): HistoryLog {
    return this.add({
      gapId,
      action: 'created',
      operator,
      detail,
      toStatus: 'pending',
    });
  },

  addFixed(gapId: string, operator: string, detail: string): HistoryLog {
    return this.add({
      gapId,
      action: 'fixed',
      operator,
      detail,
    });
  },

  addConcluded(gapId: string, operator: string, detail: string): HistoryLog {
    return this.add({
      gapId,
      action: 'concluded',
      operator,
      detail,
    });
  },

  addDuplicateDetected(gapId: string, operator: string, detail: string): HistoryLog {
    return this.add({
      gapId,
      action: 'duplicate_detected',
      operator,
      detail,
    });
  },

  addMerged(gapId: string, operator: string, detail: string): HistoryLog {
    return this.add({
      gapId,
      action: 'merged',
      operator,
      detail,
    });
  },

  resetToMock(): void {
    saveAllHistory(getMockHistory());
  },
};

const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    fixed: '已修正',
    ignored: '已忽略',
  };
  return map[status] || status;
};
