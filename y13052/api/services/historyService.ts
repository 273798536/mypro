import type { HistoryRecord, HistoryQuery } from '../../shared/types.js';
import { getAllHistory } from '../store/dataStore.js';

export function listHistory(query: HistoryQuery): HistoryRecord[] {
  let all = getAllHistory();
  if (query.caseId) {
    all = all.filter((h) => h.caseId === query.caseId);
  }
  if (query.operator) {
    all = all.filter((h) => h.operator.includes(query.operator));
  }
  if (query.action) {
    all = all.filter((h) => h.action === query.action);
  }
  return all;
}
