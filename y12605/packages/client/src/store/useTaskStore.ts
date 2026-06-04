import { create } from 'zustand';
import { 
  ReviewTask, TaskListItem, Annotation, ValidationError, HistoryRecord, ReviewLevel } from '@puzzle/shared';
import { taskApi, TaskDetailResponse } from '../services/api';

interface TaskStore {
  tasks: TaskListItem[];
  currentTask: (ReviewTask & { canUndo: boolean; canRedo: boolean; usability: string }) | null;
  currentTaskErrors: ValidationError[];
  levels: ReviewLevel[];
  history: HistoryRecord[];
  loading: boolean;
  error: string | null;
  
  fetchTasks: () => Promise<void>;
  fetchLevels: () => Promise<void>;
  fetchTask: (id: string) => Promise<void>;
  fetchHistory: (id: string) => Promise<void>;
  createTask: (data: { title: string; description?: string; levelId?: string }) => Promise<string | null>;
  addAnnotation: (taskId: string, data: Partial<Annotation>) => Promise<{ success: boolean; errors?: ValidationError[] }>;
  updateAnnotation: (taskId: string, annotationId: string, data: Partial<Annotation>) => Promise<void>;
  deleteAnnotation: (taskId: string, annotationId: string) => Promise<void>;
  updateLayer: (taskId: string, layerId: string, data: Partial<{ visible: boolean; locked: boolean; opacity: number }>) => Promise<void>;
  addNote: (taskId: string, data: { content: string; affectsScoreSheet?: boolean; affectsConclusion?: boolean }) => Promise<void>;
  updateNote: (taskId: string, noteId: string, data: any) => Promise<void>;
  updateScore: (taskId: string, data: { items: any[] }) => Promise<void>;
  syncScore: (taskId: string) => Promise<void>;
  updateConclusion: (taskId: string, data: any) => Promise<void>;
  syncConclusion: (taskId: string) => Promise<void>;
  undo: (taskId: string) => Promise<void>;
  redo: (taskId: string) => Promise<void>;
  reopen: (taskId: string) => Promise<void>;
  complete: (taskId: string) => Promise<{ success: boolean; errors?: ValidationError[] }>;
  updateLevel: (taskId: string, levelId: string) => Promise<void>;
  exportTask: (taskId: string, options: any) => Promise<void>;
  validateTask: (taskId: string) => Promise<{ isValid: boolean; usability: string; errors: ValidationError[] }>;
  clearCurrentTask: () => void;
  setError: (error: string | null) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  currentTask: null,
  currentTaskErrors: [],
  levels: [],
  history: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await taskApi.getTasks();
      set({ tasks, loading: false });
    } catch (err: any) {
      set({ error: err.message || '加载任务列表失败', loading: false });
    }
  },

  fetchLevels: async () => {
    try {
      const levels = await taskApi.getLevels();
      set({ levels });
    } catch (err: any) {
      set({ error: err.message || '加载关卡列表失败' });
    }
  },

  fetchTask: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await taskApi.getTask(id);
      set({ 
        currentTask: response.task, 
        currentTaskErrors: response.validationErrors,
        loading: false 
      });
    } catch (err: any) {
      set({ error: err.message || '加载任务详情失败', loading: false });
    }
  },

  fetchHistory: async (id: string) => {
    try {
      const history = await taskApi.getTaskHistory(id);
      set({ history });
    } catch (err: any) {
      set({ error: err.message || '加载历史记录失败' });
    }
  },

  createTask: async (data) => {
    set({ loading: true, error: null });
    try {
      const task = await taskApi.createTask(data);
      set({ loading: false });
      return task.id;
    } catch (err: any) {
      set({ error: err.message || '创建任务失败', loading: false });
      return null;
    }
  },

  addAnnotation: async (taskId, data) => {
    try {
      const result = await taskApi.addAnnotation(taskId, data);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        set({ 
          currentTask: { ...result.task, canUndo: current.canUndo, canRedo: current.canRedo, usability: current.usability },
          currentTaskErrors: result.validationErrors || []
        });
      }
      await get().fetchTasks();
      return { success: true, errors: result.validationErrors };
    } catch (err: any) {
      const errors = err.response?.data?.validationErrors;
      set({ error: err.message || '添加标注失败' });
      return { success: false, errors };
    }
  },

  updateAnnotation: async (taskId, annotationId, data) => {
    try {
      const task = await taskApi.updateAnnotation(taskId, annotationId, data);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        set({ currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: current.usability } });
      }
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '更新标注失败' });
    }
  },

  deleteAnnotation: async (taskId, annotationId) => {
    try {
      const task = await taskApi.deleteAnnotation(taskId, annotationId);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        set({ currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: current.usability } });
      }
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '删除标注失败' });
    }
  },

  updateLayer: async (taskId, layerId, data) => {
    try {
      const task = await taskApi.updateLayer(taskId, layerId, data);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        set({ currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: current.usability } });
      }
    } catch (err: any) {
      set({ error: err.message || '更新图层失败' });
    }
  },

  addNote: async (taskId, data) => {
    try {
      const task = await taskApi.addNote(taskId, data);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        const { validationErrors } = await taskApi.getTask(taskId);
        set({ 
          currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: current.usability },
          currentTaskErrors: validationErrors
        });
      }
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '添加备注失败' });
    }
  },

  updateNote: async (taskId, noteId, data) => {
    try {
      const task = await taskApi.updateNote(taskId, noteId, data);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        const { validationErrors } = await taskApi.getTask(taskId);
        set({ 
          currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: current.usability },
          currentTaskErrors: validationErrors
        });
      }
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '更新备注失败' });
    }
  },

  updateScore: async (taskId, data) => {
    try {
      const task = await taskApi.updateScore(taskId, data);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        const { validationErrors } = await taskApi.getTask(taskId);
        set({ 
          currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: current.usability },
          currentTaskErrors: validationErrors
        });
      }
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '更新评分失败' });
    }
  },

  syncScore: async (taskId) => {
    try {
      const task = await taskApi.syncScore(taskId);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        const { validationErrors } = await taskApi.getTask(taskId);
        set({ 
          currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: current.usability },
          currentTaskErrors: validationErrors
        });
      }
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '同步评分失败' });
    }
  },

  updateConclusion: async (taskId, data) => {
    try {
      const task = await taskApi.updateConclusion(taskId, data);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        const { validationErrors } = await taskApi.getTask(taskId);
        set({ 
          currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: task.conclusion?.usability || current.usability },
          currentTaskErrors: validationErrors
        });
      }
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '更新结论失败' });
    }
  },

  syncConclusion: async (taskId) => {
    try {
      const task = await taskApi.syncConclusion(taskId);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        const { validationErrors } = await taskApi.getTask(taskId);
        set({ 
          currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: current.usability },
          currentTaskErrors: validationErrors
        });
      }
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '同步结论失败' });
    }
  },

  undo: async (taskId) => {
    set({ loading: true });
    try {
      const response = await taskApi.undo(taskId);
      set({ 
        currentTask: response.task,
        currentTaskErrors: response.validationErrors,
        loading: false
      });
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '撤销失败', loading: false });
    }
  },

  redo: async (taskId) => {
    set({ loading: true });
    try {
      const response = await taskApi.redo(taskId);
      set({ 
        currentTask: response.task,
        currentTaskErrors: response.validationErrors,
        loading: false
      });
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '重做失败', loading: false });
    }
  },

  reopen: async (taskId) => {
    try {
      const task = await taskApi.reopen(taskId);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        set({ currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: current.usability } });
      }
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '重开失败' });
    }
  },

  complete: async (taskId) => {
    try {
      const task = await taskApi.complete(taskId);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        set({ currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: task.conclusion?.usability || current.usability } });
      }
      await get().fetchTasks();
      return { success: true };
    } catch (err: any) {
      const errors = err.response?.data?.validationErrors;
      set({ error: err.message || '完成审核失败' });
      return { success: false, errors };
    }
  },

  updateLevel: async (taskId, levelId) => {
    try {
      const task = await taskApi.updateLevel(taskId, levelId);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        const { validationErrors } = await taskApi.getTask(taskId);
        set({ 
          currentTask: { ...task, canUndo: current.canUndo, canRedo: current.canRedo, usability: current.usability },
          currentTaskErrors: validationErrors
        });
      }
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || '切换关卡失败' });
    }
  },

  exportTask: async (taskId, options) => {
    try {
      await taskApi.exportTask(taskId, options);
    } catch (err: any) {
      set({ error: err.message || '导出失败' });
    }
  },

  validateTask: async (taskId) => {
    try {
      const result = await taskApi.validateTask(taskId);
      const current = get().currentTask;
      if (current && current.id === taskId) {
        set({ 
          currentTaskErrors: result.validationErrors,
          currentTask: { ...current, usability: result.usability }
        });
      }
      return { isValid: result.isValid, usability: result.usability, errors: result.validationErrors };
    } catch (err: any) {
      set({ error: err.message || '验证失败' });
      return { isValid: false, usability: 'needs_trainer_review', errors: [] };
    }
  },

  clearCurrentTask: () => {
    set({ currentTask: null, currentTaskErrors: [], history: [] });
  },

  setError: (error) => set({ error })
}));
