import { useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getAllConflicts, getActiveConflicts, getConflictsAtTime } from '@/utils/conflictDetection';

export function useConflictHighlight() {
  const { currentTime, filters } = useAppStore();
  const allConflicts = getAllConflicts();

  const activeConflicts = useMemo(() => {
    return getActiveConflicts(
      allConflicts,
      currentTime,
      filters.conflictTypes,
      filters.timeRange
    ).sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [allConflicts, currentTime, filters]);

  const currentConflicts = useMemo(() => {
    return getConflictsAtTime(activeConflicts, currentTime, 0.5);
  }, [activeConflicts, currentTime]);

  const highlightedObjectIds = useMemo(() => {
    const ids = new Set<string>();
    currentConflicts.forEach((c) => c.objectIds.forEach((id) => ids.add(id)));
    return ids;
  }, [currentConflicts]);

  const isObjectHighlighted = useCallback(
    (objectId: string): boolean => {
      return highlightedObjectIds.has(objectId);
    },
    [highlightedObjectIds]
  );

  const getConflictForObject = useCallback(
    (objectId: string) => {
      return currentConflicts.find((c) => c.objectIds.includes(objectId));
    },
    [currentConflicts]
  );

  const getConflictColor = useCallback((type: string): string => {
    switch (type) {
      case 'cable_cross':
        return '#ff0055';
      case 'equipment_block':
        return '#ffaa00';
      case 'route_conflict':
        return '#00aaff';
      default:
        return '#8892b0';
    }
  }, []);

  return {
    allConflicts,
    activeConflicts,
    currentConflicts,
    highlightedObjectIds,
    isObjectHighlighted,
    getConflictForObject,
    getConflictColor,
  };
}
