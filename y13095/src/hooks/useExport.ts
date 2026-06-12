import { useCallback } from 'react';
import { usePointStore } from '@/store/usePointStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { exportData, type ExportOptions } from '@/utils/export';

export function useExport() {
  const { points } = usePointStore();
  const { getAllHistory } = useHistoryStore();

  const handleExport = useCallback((options: ExportOptions) => {
    const history = getAllHistory();
    exportData(points, options, history);
  }, [points, getAllHistory]);

  return { handleExport };
}
