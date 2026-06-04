import { useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ActionLog, ActionType } from '@/types';

export function useActionLog() {
  const { actionLogs, redoStack, undo, redo, canUndo, canRedo } = useAppStore();

  const getLogsByType = useCallback((type: ActionType): ActionLog[] => {
    return actionLogs.filter(log => log.type === type);
  }, [actionLogs]);

  const getAnomalyTrace = useCallback((logId: string) => {
    const logIndex = actionLogs.findIndex(l => l.id === logId);
    if (logIndex === -1) return null;

    const log = actionLogs[logIndex];
    const before = actionLogs.slice(Math.max(0, logIndex - 3), logIndex);
    const after = actionLogs.slice(logIndex + 1, Math.min(actionLogs.length, logIndex + 4));

    return { log, before, after };
  }, [actionLogs]);

  const hitLogs = useMemo(() => getLogsByType('mark_hit'), [getLogsByType]);
  const anomalyLogs = useMemo(() => getLogsByType('mark_anomaly'), [getLogsByType]);

  return {
    logs: actionLogs,
    redoStack,
    hitLogs,
    anomalyLogs,
    undo,
    redo,
    canUndo,
    canRedo,
    getLogsByType,
    getAnomalyTrace,
  };
}
