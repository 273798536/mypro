import { v4 as uuidv4 } from 'uuid';
import { ReviewTask, HistoryRecord, HistoryAction } from '@puzzle/shared';
import { store } from '../store';

export function createHistoryRecord(
  taskId: string,
  action: Omit<HistoryAction, 'description'> & { description?: string },
  userId: string
): HistoryRecord {
  const descriptions: Record<string, string> = {
    'create-annotation': '创建标注',
    'update-annotation': '更新标注',
    'delete-annotation': '删除标注',
    'update-layer': '更新图层',
    'update-score': '更新评分表',
    'update-conclusion': '更新结论',
    'create-note': '创建备注',
    'update-note': '更新备注',
    'delete-note': '删除备注',
    'reopen-task': '重开任务'
  };

  const key = `${action.type}-${action.entityType}`;
  
  return {
    id: uuidv4(),
    taskId,
    action: {
      ...action,
      description: action.description || descriptions[key] || `${action.type} ${action.entityType}`
    },
    timestamp: new Date().toISOString(),
    userId
  };
}

export function recordHistory(
  task: ReviewTask,
  action: Omit<HistoryAction, 'description'> & { description?: string },
  userId: string = 'trainer-001'
): void {
  const record = createHistoryRecord(task.id, action, userId);
  store.addHistory(task.id, record);
}

export function undoTask(taskId: string): ReviewTask | null {
  return store.undo(taskId);
}

export function redoTask(taskId: string): ReviewTask | null {
  return store.redo(taskId);
}

export function canUndo(task: ReviewTask): boolean {
  return task.historyIndex > 0;
}

export function canRedo(task: ReviewTask): boolean {
  return task.historyIndex < task.history.length - 1;
}

export function getTaskHistory(taskId: string): HistoryRecord[] | null {
  const task = store.getTaskById(taskId);
  if (!task) return null;
  return task.history.slice(0, task.historyIndex + 1);
}
