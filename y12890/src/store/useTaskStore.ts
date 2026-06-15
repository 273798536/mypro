import { create } from 'zustand';
import { Task, TaskFilters, QualitySummary } from '../types/task';
import { TaskStatus, RiskLevel, DataStatus, QualityIssue } from '../types/common';
import { MOCK_TASKS, getTaskById } from '../data/mockTasks';
import { checkTideDataQuality, checkWaterDataQuality } from '../core/dataQuality';
import { generateMockTideData } from '../data/mockTideData';
import { generateMockWaterData } from '../data/mockWaterData';

interface TaskState {
  tasks: Task[];
  currentTaskId: string | null;
  isLoading: boolean;
  filters: TaskFilters;
  qualitySummary: QualitySummary | null;
  qualityReport: {
    tideIssues: QualityIssue[];
    waterIssues: QualityIssue[];
    tideScore: number;
    waterScore: number;
    explanation: string;
  } | null;

  setCurrentTask: (id: string) => void;
  loadTasks: () => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  runQualityCheck: (taskId: string) => void;
  getTaskQualitySummary: (id: string) => QualitySummary;
  getFilteredTasks: () => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  currentTaskId: null,
  isLoading: false,
  filters: {},
  qualitySummary: null,
  qualityReport: null,

  setCurrentTask: (id) => set({ currentTaskId: id }),

  loadTasks: () => {
    set({ isLoading: true });
    setTimeout(() => {
      set({ tasks: MOCK_TASKS, isLoading: false });
    }, 300);
  },

  updateTaskStatus: (id, status) => {
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, status } : t),
    }));
  },

  setFilters: (filters) => {
    set(state => ({ filters: { ...state.filters, ...filters } }));
  },

  runQualityCheck: (taskId) => {
    const tideData = generateMockTideData(taskId);
    const waterData = generateMockWaterData(taskId);

    const tideQuality = checkTideDataQuality(tideData);
    const waterQuality = checkWaterDataQuality(waterData);

    const allIssues = [...tideQuality.issues, ...waterQuality.issues];
    const avgScore = Math.round((tideQuality.score + waterQuality.score) / 2);
    const byType: Record<string, number> = {};
    allIssues.forEach(issue => {
      byType[issue.type] = (byType[issue.type] || 0) + 1;
    });

    const explanation = `潮汐数据质量评分：${tideQuality.score}/100，水质数据质量评分：${waterQuality.score}/100。${tideQuality.explanation} ${waterQuality.explanation}`;

    const allRecords = [...tideData, ...waterData];
    const statusBreakdown = allRecords.reduce((acc, r) => {
      const status = r.status as DataStatus;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {
      [DataStatus.AVAILABLE]: 0,
      [DataStatus.PENDING]: 0,
      [DataStatus.NEED_REVIEW]: 0,
      [DataStatus.RECOLLECT]: 0,
    } as Record<DataStatus, number>);

    set({
      qualitySummary: {
        totalIssues: allIssues,
        score: avgScore,
        qualityScore: avgScore,
        nullCount: byType['null_value'] || 0,
        duplicateCount: byType['duplicate'] || 0,
        unitMismatchCount: byType['unit_mixed'] || 0,
        timezoneIssueCount: byType['timezone_error'] || 0,
        statusBreakdown,
        byType,
        explanation,
      },
      qualityReport: {
        tideIssues: tideQuality.issues,
        waterIssues: waterQuality.issues,
        tideScore: tideQuality.score,
        waterScore: waterQuality.score,
        explanation,
      },
      tasks: get().tasks.map(t =>
        t.id === taskId
          ? { ...t, qualityScore: avgScore, status: TaskStatus.QUALITY_CHECKED }
          : t
      ),
    });
  },

  getTaskQualitySummary: (id): QualitySummary => {
    const task = getTaskById(id);
    if (!task) {
      return {
        totalIssues: [],
        score: 0,
        qualityScore: 0,
        nullCount: 0,
        duplicateCount: 0,
        unitMismatchCount: 0,
        timezoneIssueCount: 0,
        statusBreakdown: {
          [DataStatus.AVAILABLE]: 0,
          [DataStatus.PENDING]: 0,
          [DataStatus.NEED_REVIEW]: 0,
          [DataStatus.RECOLLECT]: 0,
        },
        byType: {},
        explanation: '未找到该任务',
      };
    }

    const tideData = generateMockTideData(id);
    const waterData = generateMockWaterData(id);
    const tideQuality = checkTideDataQuality(tideData);
    const waterQuality = checkWaterDataQuality(waterData);
    const allIssues = [...tideQuality.issues, ...waterQuality.issues];
    const avgScore = Math.round((tideQuality.score + waterQuality.score) / 2);

    const byType: Record<string, number> = {};
    allIssues.forEach(issue => {
      byType[issue.type] = (byType[issue.type] || 0) + 1;
    });

    const allRecords = [...tideData, ...waterData];
    const statusBreakdown = allRecords.reduce((acc, r) => {
      const status = r.status as DataStatus;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {
      [DataStatus.AVAILABLE]: 0,
      [DataStatus.PENDING]: 0,
      [DataStatus.NEED_REVIEW]: 0,
      [DataStatus.RECOLLECT]: 0,
    } as Record<DataStatus, number>);

    return {
      totalIssues: allIssues,
      score: avgScore,
      qualityScore: avgScore,
      nullCount: byType['null_value'] || 0,
      duplicateCount: byType['duplicate'] || 0,
      unitMismatchCount: byType['unit_mixed'] || 0,
      timezoneIssueCount: byType['timezone_error'] || 0,
      statusBreakdown,
      byType,
      explanation: `数据质量综合评分：${avgScore}/100。${tideQuality.explanation} ${waterQuality.explanation}`,
    };
  },

  getFilteredTasks: () => {
    const { tasks, filters } = get();
    return tasks.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.riskLevel && task.riskLevel !== filters.riskLevel) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          task.name.toLowerCase().includes(search) ||
          task.description.toLowerCase().includes(search)
        );
      }
      return true;
    });
  },
}));
