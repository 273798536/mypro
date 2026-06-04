import { ReviewTask, TaskListItem, HistoryRecord } from '@puzzle/shared';

let tasks: ReviewTask[] = [];

export const store = {
  getTasks: (): TaskListItem[] => {
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      assignee: task.assignee,
      usability: task.conclusion?.usability,
      updatedAt: task.updatedAt,
      hasUnsyncedChanges: !task.scoreSheet.synchronizedWithNotes || 
                         (task.conclusion ? !task.conclusion.synchronizedWithScoreSheet : false)
    }));
  },

  getTaskById: (id: string): ReviewTask | undefined => {
    return tasks.find(t => t.id === id);
  },

  saveTask: (task: ReviewTask): void => {
    const index = tasks.findIndex(t => t.id === task.id);
    if (index >= 0) {
      tasks[index] = { ...task, updatedAt: new Date().toISOString() };
    } else {
      tasks.push(task);
    }
  },

  addTask: (task: ReviewTask): void => {
    tasks.push(task);
  },

  deleteTask: (id: string): boolean => {
    const index = tasks.findIndex(t => t.id === id);
    if (index >= 0) {
      tasks.splice(index, 1);
      return true;
    }
    return false;
  },

  getAllTasks: (): ReviewTask[] => {
    return tasks;
  },

  setTasks: (newTasks: ReviewTask[]): void => {
    tasks = newTasks;
  },

  addHistory: (taskId: string, record: HistoryRecord): void => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      if (task.historyIndex < task.history.length - 1) {
        task.history = task.history.slice(0, task.historyIndex + 1);
      }
      task.history.push(record);
      task.historyIndex = task.history.length - 1;
      task.updatedAt = new Date().toISOString();
    }
  },

  undo: (taskId: string): ReviewTask | null => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.historyIndex <= 0) return null;
    
    task.historyIndex--;
    const currentRecord = task.history[task.historyIndex];
    
    if (currentRecord.action.previousSnapshot) {
      applySnapshot(task, currentRecord.action.entityType, currentRecord.action.previousSnapshot);
    }
    
    task.updatedAt = new Date().toISOString();
    return task;
  },

  redo: (taskId: string): ReviewTask | null => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.historyIndex >= task.history.length - 1) return null;
    
    task.historyIndex++;
    const currentRecord = task.history[task.historyIndex];
    applySnapshot(task, currentRecord.action.entityType, currentRecord.action.snapshot);
    
    task.updatedAt = new Date().toISOString();
    return task;
  }
};

function applySnapshot(task: ReviewTask, entityType: string, snapshot: any): void {
  switch (entityType) {
    case 'annotation':
      if (snapshot === null) {
        task.annotations = task.annotations.filter(a => a.id !== snapshot?.id);
      } else {
        const idx = task.annotations.findIndex(a => a.id === snapshot.id);
        if (idx >= 0) {
          task.annotations[idx] = snapshot;
        } else {
          task.annotations.push(snapshot);
        }
      }
      break;
    case 'layer':
      const layerIdx = task.layers.findIndex(l => l.id === snapshot.id);
      if (layerIdx >= 0) {
        task.layers[layerIdx] = snapshot;
      }
      break;
    case 'score':
      task.scoreSheet = snapshot;
      break;
    case 'conclusion':
      task.conclusion = snapshot;
      break;
    case 'note':
      const noteIdx = task.notes.findIndex(n => n.id === snapshot.id);
      if (noteIdx >= 0) {
        task.notes[noteIdx] = snapshot;
      } else if (snapshot) {
        task.notes.push(snapshot);
      }
      break;
  }
}
