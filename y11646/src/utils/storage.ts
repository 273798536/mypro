import { GameHistory, GameState, OperationLog } from '../types';

const HISTORY_KEY = 'chemical-warehouse-history';
const GAME_STATE_KEY = 'chemical-warehouse-current-game';

export const storage = {
  saveHistory(history: GameHistory): void {
    const histories = this.getHistories();
    histories.push(history);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(histories));
  },

  getHistories(): GameHistory[] {
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  getHistoryById(id: string): GameHistory | null {
    const histories = this.getHistories();
    return histories.find(h => h.id === id) || null;
  },

  deleteHistory(id: string): void {
    const histories = this.getHistories().filter(h => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(histories));
  },

  clearAllHistories(): void {
    localStorage.removeItem(HISTORY_KEY);
  },

  saveGameState(state: GameState): void {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify({
      ...state,
      shelf: state.shelf,
      operationLogs: state.operationLogs,
      riskEvents: state.riskEvents,
      remainingChemicals: state.remainingChemicals
    }));
  },

  loadGameState(): GameState | null {
    const data = localStorage.getItem(GAME_STATE_KEY);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        shelf: parsed.shelf,
        operationLogs: parsed.operationLogs || [],
        riskEvents: parsed.riskEvents || [],
        remainingChemicals: parsed.remainingChemicals || []
      };
    } catch {
      return null;
    }
  },

  clearGameState(): void {
    localStorage.removeItem(GAME_STATE_KEY);
  },

  markReportExported(historyId: string): void {
    const histories = this.getHistories();
    const index = histories.findIndex(h => h.id === historyId);
    if (index !== -1) {
      histories[index].reportExported = true;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(histories));
    }
  }
};

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function getOperationLabel(op: OperationLog): string {
  switch (op.type) {
    case 'place': return `摆放 ${op.chemicalName || op.chemicalId}`;
    case 'remove': return `移除 ${op.chemicalName || op.chemicalId}`;
    case 'swap': return `交换 ${op.chemicalName || op.chemicalId}`;
    default: return op.type;
  }
}
