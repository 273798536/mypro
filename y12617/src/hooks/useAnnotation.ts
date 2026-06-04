import { useCallback } from 'react';
import { useAnnotationStore, usePhysicsStore, useHistoryStore } from '../store';
import type { AnnotationType, AnnotationStatus } from '../types/annotation';

export function useAnnotation() {
  const {
    isAnnotating,
    annotatingBallId,
    annotatingPosition,
    draftContent,
    draftType,
    setDraftContent,
    setDraftType,
    saveAnnotation,
    cancelAnnotation,
    selectAnnotation,
    selectedAnnotationId,
    updateAnnotation,
    deleteAnnotation,
    updateStatus,
    addProcessNote,
  } = useAnnotationStore();

  const { currentTime, takeSnapshot } = usePhysicsStore();
  const { pushHistory } = useHistoryStore();

  const handleSaveAnnotation = useCallback((levelId: string, status: AnnotationStatus = 'draft') => {
    const snapshot = takeSnapshot();
    
    const prevState = {
      annotations: JSON.parse(JSON.stringify(useAnnotationStore.getState().annotations)),
      snapshots: JSON.parse(JSON.stringify(usePhysicsStore.getState().snapshots)),
      currentTime: usePhysicsStore.getState().currentTime,
    };

    const annotation = saveAnnotation({
      levelId,
      snapshotId: snapshot.id,
      timePoint: currentTime,
      type: draftType,
      content: draftContent,
      status,
    });

    pushHistory(
      'annotation_create',
      prevState,
      `创建标注: ${annotation.content.substring(0, 30)}...`
    );

    return annotation;
  }, [saveAnnotation, draftContent, draftType, currentTime, takeSnapshot, pushHistory]);

  const handleUpdateAnnotation = useCallback((id: string, updates: Partial<{
    type: AnnotationType;
    content: string;
    status: AnnotationStatus;
  }>) => {
    const prevState = {
      annotations: JSON.parse(JSON.stringify(useAnnotationStore.getState().annotations)),
      snapshots: JSON.parse(JSON.stringify(usePhysicsStore.getState().snapshots)),
      currentTime: usePhysicsStore.getState().currentTime,
    };

    const updated = updateAnnotation(id, updates);

    pushHistory(
      'annotation_update',
      prevState,
      `更新标注: ${updated.content.substring(0, 30)}...`
    );

    return updated;
  }, [updateAnnotation, pushHistory]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    const prevState = {
      annotations: JSON.parse(JSON.stringify(useAnnotationStore.getState().annotations)),
      snapshots: JSON.parse(JSON.stringify(usePhysicsStore.getState().snapshots)),
      currentTime: usePhysicsStore.getState().currentTime,
    };

    deleteAnnotation(id);

    pushHistory(
      'annotation_delete',
      prevState,
      '删除标注'
    );
  }, [deleteAnnotation, pushHistory]);

  const handleAddProcessNote = useCallback((annotationId: string, content: string) => {
    return addProcessNote(annotationId, content);
  }, [addProcessNote]);

  const handleUpdateStatus = useCallback((id: string, status: AnnotationStatus) => {
    return updateStatus(id, status);
  }, [updateStatus]);

  return {
    isAnnotating,
    annotatingBallId,
    annotatingPosition,
    draftContent,
    draftType,
    selectedAnnotationId,
    setDraftContent,
    setDraftType,
    saveAnnotation: handleSaveAnnotation,
    cancelAnnotation,
    selectAnnotation,
    updateAnnotation: handleUpdateAnnotation,
    deleteAnnotation: handleDeleteAnnotation,
    updateStatus: handleUpdateStatus,
    addProcessNote: handleAddProcessNote,
  };
}
