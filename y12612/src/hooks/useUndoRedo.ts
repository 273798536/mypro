import { useEffect, useCallback } from 'react';
import { useBatchStore } from '@/stores/useBatchStore';

export function useUndoRedo() {
  const { undo, redo, currentBatch } = useBatchStore();

  const canUndo = currentBatch.currentIndex >= 0;
  const canRedo = currentBatch.currentIndex < currentBatch.commands.length - 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
      }
    },
    [canUndo, canRedo, undo, redo]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
