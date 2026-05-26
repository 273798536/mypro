import type { BookItem, TargetArea, ValidationResult, ErrorType } from '@/types';
import { ERROR_POINTS, SHELF_CATEGORIES } from '@/types';

export function validateDrop(item: BookItem, target: TargetArea): ValidationResult {
  if (item.isReserved && target === 'return') {
    return {
      isCorrect: false,
      errorType: 'reserved_return',
      points: ERROR_POINTS.reserved_return,
    };
  }

  if (item.isDamaged && target !== 'damaged') {
    return {
      isCorrect: false,
      errorType: 'damaged_unregistered',
      points: ERROR_POINTS.damaged_unregistered,
    };
  }

  if (target.startsWith('shelf-')) {
    const shelfCategory = SHELF_CATEGORIES[target];
    if (item.category !== shelfCategory) {
      return {
        isCorrect: false,
        errorType: 'shelf_mismatch',
        points: ERROR_POINTS.shelf_mismatch,
      };
    }
    if (item.type !== 'normal') {
      return {
        isCorrect: false,
        errorType: 'return_mismatch',
        points: ERROR_POINTS.return_mismatch,
      };
    }
  }

  if (target === 'return' && item.type !== 'return') {
    return {
      isCorrect: false,
      errorType: 'return_mismatch',
      points: ERROR_POINTS.return_mismatch,
    };
  }

  if (target === 'reserved' && !item.isReserved) {
    return {
      isCorrect: false,
      errorType: 'return_mismatch',
      points: ERROR_POINTS.return_mismatch,
    };
  }

  if (target === 'damaged' && !item.isDamaged) {
    return {
      isCorrect: false,
      errorType: 'return_mismatch',
      points: ERROR_POINTS.return_mismatch,
    };
  }

  return {
    isCorrect: true,
    points: 10,
  };
}

export function getErrorSuggestion(errorType: ErrorType): string {
  const suggestions: Record<ErrorType, string> = {
    reserved_return: '预订书有预订人标记，应拖入「预订保留区」，等待顾客来取。',
    damaged_unregistered: '破损书需要先拖入「破损登记区」，记录破损情况后再处理。',
    shelf_mismatch: '请检查图书分类，不同分类的书应放入对应的书架。',
    return_mismatch: '这本书不属于退货书，请根据类型选择正确的处理区域。',
  };
  return suggestions[errorType];
}

export function calculateScore(actions: { points: number }[]): number {
  return actions.reduce((total, action) => total + action.points, 0);
}
