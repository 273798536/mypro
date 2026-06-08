
import { create } from 'zustand';
import { Task, HistoryRecord, DataPoint, SectionImage } from '@/types';
import { mockTasks } from '@/data/mockData';

interface AppState {
  tasks: Task[];
  selectedTaskId: string | null;
  currentUser: string;

  setTasks: (tasks: Task[]) => void;
  selectTask: (taskId: string | null) => void;
  addHistoryRecord: (taskId: string, record: Omit<HistoryRecord, 'id' | 'timestamp'>) => void;
  updateDataPoint: (taskId: string, dataPointId: string, updates: Partial<DataPoint>) => void;
  addDataPoint: (taskId: string, value: number, remark?: string) => void;
  removeDataPoint: (taskId: string, dataPointId: string) => void;
  verifyOutlier: (taskId: string, dataPointId: string, reason: string, confirmOutlier: boolean) => void;
  addSectionImage: (taskId: string, image: Omit<SectionImage, 'id' | 'createdAt'>) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  reRunValidation: (taskId: string) => void;
  getSelectedTask: () => Task | undefined;
}

export const useAppStore = create<AppState>((set, get) => {
  const savedTasks = localStorage.getItem('robotArmTasks');
  const initialTasks = savedTasks ? JSON.parse(savedTasks) : mockTasks;

  return {
    tasks: initialTasks,
    selectedTaskId: initialTasks.length > 0 ? initialTasks[0].id : null,
    currentUser: '当前用户',

    setTasks: (tasks) => {
      set({ tasks });
      localStorage.setItem('robotArmTasks', JSON.stringify(tasks));
    },

    selectTask: (taskId) => set({ selectedTaskId: taskId }),

    addHistoryRecord: (taskId, record) => {
      const newRecord: HistoryRecord = {
        ...record,
        id: `h-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
      };

      set((state) => {
        const updatedTasks = state.tasks.map((task: Task) => {
          if (task.id === taskId) {
            return {
              ...task,
              history: [...task.history, newRecord],
              updatedAt: new Date().toISOString(),
            };
          }
          return task;
        });
        localStorage.setItem('robotArmTasks', JSON.stringify(updatedTasks));
        return { tasks: updatedTasks };
      });
    },

    updateDataPoint: (taskId, dataPointId, updates) => {
      set((state) => {
        const updatedTasks = state.tasks.map((task: Task) => {
          if (task.id === taskId) {
            const updatedDataPoints = task.dataPoints.map((dp: DataPoint) =>
              dp.id === dataPointId ? { ...dp, ...updates } : dp
            );
            return {
              ...task,
              dataPoints: updatedDataPoints,
              updatedAt: new Date().toISOString(),
            };
          }
          return task;
        });
        localStorage.setItem('robotArmTasks', JSON.stringify(updatedTasks));
        return { tasks: updatedTasks };
      });
    },

    addDataPoint: (taskId, value, remark) => {
      const newPoint: DataPoint = {
        id: `dp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        value,
        unit: 'mm',
        isOutlier: false,
        remark,
      };

      set((state) => {
        const updatedTasks = state.tasks.map((task: Task) => {
          if (task.id === taskId) {
            return {
              ...task,
              dataPoints: [...task.dataPoints, newPoint],
              updatedAt: new Date().toISOString(),
            };
          }
          return task;
        });
        localStorage.setItem('robotArmTasks', JSON.stringify(updatedTasks));
        return { tasks: updatedTasks };
      });

      get().addHistoryRecord(taskId, {
        taskId,
        operator: get().currentUser,
        action: '补录数据点',
        reason: remark || `补录测量值 ${value}mm`,
        afterData: newPoint,
      });
    },

    removeDataPoint: (taskId, dataPointId) => {
      const state = get();
      const task = state.tasks.find(t => t.id === taskId);
      const removedPoint = task?.dataPoints.find(dp => dp.id === dataPointId);

      set((state) => {
        const updatedTasks = state.tasks.map((task: Task) => {
          if (task.id === taskId) {
            return {
              ...task,
              dataPoints: task.dataPoints.filter((dp: DataPoint) => dp.id !== dataPointId),
              updatedAt: new Date().toISOString(),
            };
          }
          return task;
        });
        localStorage.setItem('robotArmTasks', JSON.stringify(updatedTasks));
        return { tasks: updatedTasks };
      });

      if (removedPoint) {
        get().addHistoryRecord(taskId, {
          taskId,
          operator: get().currentUser,
          action: '删除数据点',
          reason: '人工确认删除',
          beforeData: removedPoint,
        });
      }
    },

    verifyOutlier: (taskId, dataPointId, reason, confirmOutlier) => {
      const state = get();
      const task = state.tasks.find(t => t.id === taskId);
      const oldPoint = task?.dataPoints.find(dp => dp.id === dataPointId);
      const now = new Date().toISOString();

      const updates: Partial<DataPoint> = {
        isOutlier: confirmOutlier,
        verifiedBy: state.currentUser,
        verifiedAt: now,
        verificationReason: reason,
      };

      set((state) => {
        const updatedTasks = state.tasks.map((task: Task) => {
          if (task.id === taskId) {
            const updatedDataPoints = task.dataPoints.map((dp: DataPoint) =>
              dp.id === dataPointId ? { ...dp, ...updates } : dp
            );
            return {
              ...task,
              dataPoints: updatedDataPoints,
              updatedAt: now,
            };
          }
          return task;
        });
        localStorage.setItem('robotArmTasks', JSON.stringify(updatedTasks));
        return { tasks: updatedTasks };
      });

      get().addHistoryRecord(taskId, {
        taskId,
        operator: state.currentUser,
        action: confirmOutlier ? '复核确认 - 判定为离群点' : '复核通过 - 排除离群点标记',
        reason,
        beforeData: oldPoint,
        afterData: { ...oldPoint, ...updates },
      });
    },

    addSectionImage: (taskId, image) => {
      const newImage: SectionImage = {
        ...image,
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
      };

      set((state) => {
        const updatedTasks = state.tasks.map((task: Task) => {
          if (task.id === taskId) {
            return {
              ...task,
              sectionImages: [...task.sectionImages, newImage],
              updatedAt: new Date().toISOString(),
            };
          }
          return task;
        });
        localStorage.setItem('robotArmTasks', JSON.stringify(updatedTasks));
        return { tasks: updatedTasks };
      });

      get().addHistoryRecord(taskId, {
        taskId,
        operator: get().currentUser,
        action: '补录剖面图',
        reason: `新增剖面图版本 ${image.version}`,
        afterData: newImage,
      });
    },

    updateTaskStatus: (taskId, status) => {
      const state = get();
      const task = state.tasks.find(t => t.id === taskId);
      const oldStatus = task?.status;

      set((state) => {
        const updatedTasks = state.tasks.map((task: Task) => {
          if (task.id === taskId) {
            return {
              ...task,
              status,
              updatedAt: new Date().toISOString(),
            };
          }
          return task;
        });
        localStorage.setItem('robotArmTasks', JSON.stringify(updatedTasks));
        return { tasks: updatedTasks };
      });

      if (oldStatus !== status) {
        get().addHistoryRecord(taskId, {
          taskId,
          operator: get().currentUser,
          action: '状态变更',
          reason: '人工确认更新状态',
          beforeData: { status: oldStatus },
          afterData: { status },
        });
      }
    },

    reRunValidation: (taskId) => {
      get().addHistoryRecord(taskId, {
        taskId,
        operator: get().currentUser,
        action: '重复运行校验',
        reason: '人工触发重新校验计算',
      });
    },

    getSelectedTask: () => {
      const state = get();
      return state.tasks.find((t: Task) => t.id === state.selectedTaskId);
    },
  };
});
