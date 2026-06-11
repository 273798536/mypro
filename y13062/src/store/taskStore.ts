import { create } from 'zustand';
import type { Task, AnomalyStatus, AnomalyType, AnomalyLevel } from '@/types';
import { mockTasks } from '@/data/mockData';

interface TaskStore {
  tasks: Task[];
  currentTaskId: string | null;
  setCurrentTaskId: (id: string | null) => void;
  getTask: (id: string) => Task | undefined;
  createTask: (name: string, rule: string) => Task;
  rerunTask: (taskId: string) => void;
  updateAnomalyCounts: (taskId: string, counts: { anomalyCount?: number; unconfirmedCount?: number }) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: mockTasks,
  currentTaskId: null,

  setCurrentTaskId: (id) => set({ currentTaskId: id }),

  getTask: (id) => get().tasks.find(t => t.id === id),

  createTask: (name, rule) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name,
      status: 'running',
      calculationRule: rule,
      calculationVersion: 'v1.0',
      wellCount: 0,
      anomalyCount: 0,
      unconfirmedCount: 0,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      operator: '阿乔',
    };
    set(state => ({ tasks: [newTask, ...state.tasks] }));
    return newTask;
  },

  rerunTask: (taskId) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId
          ? { ...t, status: 'running' as const, updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }) }
          : t
      ),
    }));
  },

  updateAnomalyCounts: (taskId, counts) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId
          ? {
              ...t,
              anomalyCount: counts.anomalyCount ?? t.anomalyCount,
              unconfirmedCount: counts.unconfirmedCount ?? t.unconfirmedCount,
              updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
            }
          : t
      ),
    }));
  },
}));

export const anomalyStatusLabel: Record<AnomalyStatus, string> = {
  unconfirmed: '待确认',
  confirmed_abnormal: '确认异常',
  confirmed_normal: '确认正常',
};

export const anomalyTypeLabel: Record<AnomalyType, string> = {
  distance_violation: '距离违规',
  overlap: '空间重叠',
  depth_conflict: '埋深冲突',
};

export const anomalyLevelLabel: Record<AnomalyLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

export const taskStatusLabel: Record<Task['status'], string> = {
  pending: '待启动',
  running: '计算中',
  completed: '已完成',
  archived: '已归档',
};
