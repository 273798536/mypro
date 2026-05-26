import { useCallback } from 'react';
import { Annotation, BoundingBox, DamageLevel } from '../types';
import { useAppStore } from '../store/useAppStore';
import { generateId } from '../utils/coordinateUtils';

export function useAnnotation() {
  const {
    annotations,
    selectedAnnotationId,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    setSelectedAnnotation,
    checkForOverlap,
  } = useAppStore();

  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId);

  const createBoxAnnotation = useCallback(
    (box: BoundingBox, treeRowId: string, damageLevel: DamageLevel) => {
      createAnnotation({
        pointcloudId: useAppStore.getState().activePointcloudId || '',
        treeRowId,
        damageLevel,
        notes: '',
        box,
        createdBy: useAppStore.getState().currentUser,
      });
    },
    [createAnnotation]
  );

  const updateAnnotationDamageLevel = useCallback(
    (id: string, level: DamageLevel) => {
      updateAnnotation(id, { damageLevel: level });
    },
    [updateAnnotation]
  );

  const updateAnnotationNotes = useCallback(
    (id: string, notes: string) => {
      updateAnnotation(id, { notes });
    },
    [updateAnnotation]
  );

  const updateAnnotationTreeRow = useCallback(
    (id: string, treeRowId: string) => {
      updateAnnotation(id, { treeRowId });
    },
    [updateAnnotation]
  );

  const getAnnotationsByLevel = useCallback(
    (level: DamageLevel) => {
      return annotations.filter((a) => a.damageLevel === level);
    },
    [annotations]
  );

  const getAnnotationsByTreeRow = useCallback(
    (treeRowId: string) => {
      return annotations.filter((a) => a.treeRowId === treeRowId);
    },
    [annotations]
  );

  const getFilteredAnnotations = useCallback(() => {
    const { damageLevelFilter, treeRowFilter } = useAppStore.getState();

    return annotations.filter((a) => {
      if (damageLevelFilter.length > 0 && !damageLevelFilter.includes(a.damageLevel)) {
        return false;
      }
      if (treeRowFilter && a.treeRowId !== treeRowFilter) {
        return false;
      }
      return true;
    });
  }, [annotations]);

  const getAnnotationStats = useCallback(() => {
    const stats: Record<DamageLevel, number> = {
      none: 0,
      minor: 0,
      moderate: 0,
      severe: 0,
      critical: 0,
    };

    for (const annotation of annotations) {
      stats[annotation.damageLevel]++;
    }

    const treeRows = new Set(annotations.map((a) => a.treeRowId));

    return {
      total: annotations.length,
      byLevel: stats,
      uniqueTreeRows: treeRows.size,
    };
  }, [annotations]);

  const checkAnnotationOverlap = useCallback(
    (box: BoundingBox, excludeId?: string) => {
      return checkForOverlap(box, excludeId);
    },
    [checkForOverlap]
  );

  return {
    annotations,
    selectedAnnotation,
    selectedAnnotationId,
    setSelectedAnnotation,
    createBoxAnnotation,
    updateAnnotation,
    updateAnnotationDamageLevel,
    updateAnnotationNotes,
    updateAnnotationTreeRow,
    deleteAnnotation,
    getAnnotationsByLevel,
    getAnnotationsByTreeRow,
    getFilteredAnnotations,
    getAnnotationStats,
    checkAnnotationOverlap,
  };
}
