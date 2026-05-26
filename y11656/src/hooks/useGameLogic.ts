import { useState, useCallback } from 'react';
import type { BookItem, TargetArea, GameAction, ToastMessage } from '@/types';
import { ERROR_TYPE_LABELS, TARGET_AREA_LABELS } from '@/types';
import { validateDrop, getErrorSuggestion } from '@/utils/scoring';
import { useGameStore } from '@/store/useGameStore';

export function useGameLogic() {
  const { processItem, processedItems } = useGameStore();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [draggedItem, setDraggedItem] = useState<BookItem | null>(null);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleDragStart = useCallback((item: BookItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  const handleDrop = useCallback((target: TargetArea) => {
    if (!draggedItem) return;

    if (processedItems.has(draggedItem.id)) {
      return;
    }

    const result = validateDrop(draggedItem, target);

    const action: GameAction = {
      itemId: draggedItem.id,
      itemTitle: draggedItem.title,
      target,
      correctTarget: draggedItem.correctTarget,
      isCorrect: result.isCorrect,
      errorType: result.errorType,
      points: result.points,
      timestamp: Date.now(),
    };

    processItem(draggedItem.id, action);

    if (result.isCorrect) {
      showToast({
        type: 'success',
        title: '正确！',
        message: `《${draggedItem.title}》已正确放入${TARGET_AREA_LABELS[target]}`,
      });
    } else {
      showToast({
        type: 'error',
        title: `错误：${ERROR_TYPE_LABELS[result.errorType!]}`,
        message: getErrorSuggestion(result.errorType!),
      });
    }

    setDraggedItem(null);
  }, [draggedItem, processedItems, processItem, showToast]);

  return {
    toasts,
    draggedItem,
    handleDragStart,
    handleDragEnd,
    handleDrop,
  };
}
