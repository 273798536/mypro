import { useState, useCallback, useEffect } from 'react';
import { Annotation } from '@/types/experiment';
import { useExperimentStore } from '@/store/useExperimentStore';

export const useAnnotationSync = (resultId?: string | null) => {
  const getSelectedResult = useExperimentStore(state => state.getSelectedResult);
  const updateAnnotationStore = useExperimentStore(state => state.updateAnnotation);
  
  const selectedResult = resultId ? getSelectedResult() : null;
  
  const [annotation, setAnnotation] = useState<Annotation>({
    sceneNote: selectedResult?.annotations?.sceneNote || '',
    sideNote: selectedResult?.annotations?.sideNote || '',
    screenshotNote: selectedResult?.annotations?.screenshotNote || '',
    lastSyncedAt: selectedResult?.annotations?.lastSyncedAt || Date.now(),
    syncMode: selectedResult?.annotations?.syncMode || 'synchronized',
  });
  
  const [activeField, setActiveField] = useState<keyof Annotation | null>(null);

  useEffect(() => {
    if (selectedResult?.annotations) {
      setAnnotation(selectedResult.annotations);
    }
  }, [selectedResult]);
  
  const syncMode = annotation.syncMode;
  
  const toggleSyncMode = useCallback(() => {
    setAnnotation(prev => ({
      ...prev,
      syncMode: prev.syncMode === 'synchronized' ? 'independent' : 'synchronized',
    }));
  }, []);
  
  const setSyncMode = useCallback((mode: 'synchronized' | 'independent') => {
    setAnnotation(prev => ({ ...prev, syncMode: mode }));
  }, []);

  const updateAnnotation = useCallback((field: keyof Omit<Annotation, 'lastSyncedAt' | 'syncMode'>, value: string, syncAll: boolean = false) => {
    if (syncAll || annotation.syncMode === 'synchronized') {
      const newAnnotation = {
        ...annotation,
        sceneNote: value,
        sideNote: value,
        screenshotNote: value,
        lastSyncedAt: Date.now(),
      };
      setAnnotation(newAnnotation);
      if (resultId) {
        updateAnnotationStore(resultId, field, value, true);
      }
    } else {
      const newAnnotation = {
        ...annotation,
        [field]: value,
        lastSyncedAt: Date.now(),
      };
      setAnnotation(newAnnotation);
      if (resultId) {
        updateAnnotationStore(resultId, field, value, false);
      }
    }
  }, [annotation, resultId, updateAnnotationStore]);

  const updateField = useCallback((field: keyof Omit<Annotation, 'lastSyncedAt' | 'syncMode'>, value: string) => {
    updateAnnotation(field, value, false);
  }, [updateAnnotation]);
  
  const syncToAll = useCallback((sourceField?: keyof Omit<Annotation, 'lastSyncedAt' | 'syncMode'>) => {
    const sourceValue = sourceField ? annotation[sourceField] : annotation.sceneNote;
    const newAnnotation = {
      ...annotation,
      sceneNote: sourceValue,
      sideNote: sourceValue,
      screenshotNote: sourceValue,
      lastSyncedAt: Date.now(),
      syncMode: 'synchronized' as const,
    };
    setAnnotation(newAnnotation);
    if (resultId) {
      updateAnnotationStore(resultId, 'sceneNote', sourceValue, true);
    }
  }, [annotation, resultId, updateAnnotationStore]);
  
  const clearAll = useCallback(() => {
    setAnnotation({
      sceneNote: '',
      sideNote: '',
      screenshotNote: '',
      lastSyncedAt: Date.now(),
      syncMode: annotation.syncMode,
    });
  }, [annotation.syncMode]);
  
  const isConsistent = annotation.sceneNote === annotation.sideNote && annotation.sideNote === annotation.screenshotNote;
  
  const getFieldLabel = (field: keyof Omit<Annotation, 'lastSyncedAt' | 'syncMode'>): string => {
    const labels: Record<string, string> = {
      sceneNote: '场景标注',
      sideNote: '侧边说明',
      screenshotNote: '截图说明',
    };
    return labels[field] || field;
  };
  
  return {
    annotation,
    setAnnotation,
    activeField,
    setActiveField,
    toggleSyncMode,
    setSyncMode,
    updateField,
    updateAnnotation,
    syncToAll,
    clearAll,
    isConsistent,
    getFieldLabel,
    syncMode,
  };
};
