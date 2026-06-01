import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppStore, FunctionConfig, RotationAxis, SolidParams, HistoryRecord, Filters } from '@/types';
import { calculateVolume, checkIssues, generateId } from '@/utils/mathUtils';

const defaultFunction: FunctionConfig = {
  id: 'default',
  expression: 'x^2',
  variable: 'x',
  domain: {
    start: 0,
    end: 2,
    isReversed: false
  },
  color: '#00d4ff'
};

const defaultAxis: RotationAxis = {
  axis: 'x',
  offset: 0
};

const defaultParams: SolidParams = {
  slices: 32,
  precision: 100
};

const initialHistory: HistoryRecord[] = [
  {
    id: '1',
    timestamp: Date.now() - 86400000 * 3,
    type: 'warning',
    functionConfig: {
      id: 'f1',
      expression: 'x^2',
      variable: 'x',
      domain: { start: 2, end: 0, isReversed: true },
      color: '#00d4ff'
    },
    rotationAxis: { axis: 'x', offset: 0 },
    volume: 0,
    remark: '区间反向，已自动修正但保留警告',
    tags: ['缺字段', '晚补'],
    status: 'warning',
    issues: { reversedInterval: true, axisConfusion: false, insufficientSlices: false }
  },
  {
    id: '2',
    timestamp: Date.now() - 86400000 * 2,
    type: 'create',
    functionConfig: {
      id: 'f2',
      expression: 'sin(x)',
      variable: 'x',
      domain: { start: 0, end: 3.14, isReversed: false },
      color: '#ff6b6b'
    },
    rotationAxis: { axis: 'x', offset: 0 },
    volume: 4.9348,
    remark: '备注改过：调整了区间上限',
    tags: ['备注修改'],
    status: 'normal',
    issues: { reversedInterval: false, axisConfusion: false, insufficientSlices: false }
  },
  {
    id: '3',
    timestamp: Date.now() - 86400000,
    type: 'warning',
    functionConfig: {
      id: 'f3',
      expression: 'sqrt(x)',
      variable: 'x',
      domain: { start: 0, end: 4, isReversed: false },
      color: '#4ecdc4'
    },
    rotationAxis: { axis: 'y', offset: 0 },
    volume: 25.1327,
    remark: '切片过少警告，建议增加精度',
    tags: ['缺字段'],
    status: 'missing_field',
    issues: { reversedInterval: false, axisConfusion: false, insufficientSlices: true }
  }
];

const defaultFilters: Filters = {
  types: [],
  dateRange: null
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentFunction: defaultFunction,
      rotationAxis: defaultAxis,
      solidParams: defaultParams,
      history: initialHistory,
      selectedHistoryId: null,
      isPlaying: false,
      playbackSpeed: 1,
      playbackProgress: 0,
      filters: defaultFilters,
      comparisonFunction: null,

      setFunction: (fn: FunctionConfig) => {
        const volume = calculateVolume(fn, get().rotationAxis, get().solidParams.precision);
        const issues = checkIssues(fn, get().rotationAxis, get().solidParams.slices);
        const hasIssues = issues.reversedInterval || issues.axisConfusion || issues.insufficientSlices;
        
        set({ currentFunction: fn });
        
        if (hasIssues) {
          get().addHistoryRecord({
            type: 'warning',
            functionConfig: fn,
            rotationAxis: get().rotationAxis,
            volume,
            remark: hasIssues ? '检测到潜在问题' : '',
            tags: issues.reversedInterval ? ['区间反向'] : issues.insufficientSlices ? ['切片过少'] : [],
            status: hasIssues ? 'warning' : 'normal',
            issues
          });
        }
      },

      setExpression: (expr: string) => {
        const fn = { ...get().currentFunction, expression: expr };
        get().setFunction(fn);
      },

      setDomain: (start: number, end: number) => {
        const isReversed = start > end;
        const fn = {
          ...get().currentFunction,
          domain: { start, end, isReversed }
        };
        get().setFunction(fn);
      },

      setRotationAxis: (axis: RotationAxis) => {
        const volume = calculateVolume(get().currentFunction, axis, get().solidParams.precision);
        const issues = checkIssues(get().currentFunction, axis, get().solidParams.slices);
        
        set({ rotationAxis: axis });
        
        get().addHistoryRecord({
          type: 'update',
          functionConfig: get().currentFunction,
          rotationAxis: axis,
          volume,
          remark: `旋转轴切换为 ${axis.axis.toUpperCase()} 轴`,
          tags: ['旋转轴'],
          status: issues.reversedInterval || issues.insufficientSlices ? 'warning' : 'normal',
          issues
        });
      },

      setSolidParams: (params: SolidParams) => {
        const issues = checkIssues(get().currentFunction, get().rotationAxis, params.slices);
        set({ solidParams: params });
        
        if (issues.insufficientSlices) {
          get().addHistoryRecord({
            type: 'warning',
            functionConfig: get().currentFunction,
            rotationAxis: get().rotationAxis,
            volume: calculateVolume(get().currentFunction, get().rotationAxis, params.precision),
            remark: '切片数过低，可能影响显示效果',
            tags: ['精度调整', '缺字段'],
            status: 'missing_field',
            issues
          });
        }
      },

      addHistoryRecord: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => {
        const newRecord: HistoryRecord = {
          ...record,
          id: generateId(),
          timestamp: Date.now()
        };
        set((state) => ({
          history: [newRecord, ...state.history].slice(0, 100)
        }));
      },

      updateHistoryRecord: (id: string, updates: Partial<HistoryRecord>) => {
        set((state) => ({
          history: state.history.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          )
        }));
      },

      deleteHistoryRecord: (id: string) => {
        set((state) => ({
          history: state.history.filter((r) => r.id !== id),
          selectedHistoryId: state.selectedHistoryId === id ? null : state.selectedHistoryId
        }));
      },

      selectHistory: (id: string | null) => {
        if (id) {
          const record = get().history.find((r) => r.id === id);
          if (record) {
            set({
              selectedHistoryId: id,
              currentFunction: record.functionConfig,
              rotationAxis: record.rotationAxis
            });
          }
        } else {
          set({ selectedHistoryId: null });
        }
      },

      setPlaying: (playing: boolean) => set({ isPlaying: playing }),
      setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),
      setPlaybackProgress: (progress: number) => set({ playbackProgress: progress }),

      setFilters: (filters: Filters) => set({ filters }),

      setComparison: (fn: FunctionConfig | null) => set({ comparisonFunction: fn }),

      reset: () => {
        set({
          currentFunction: defaultFunction,
          rotationAxis: defaultAxis,
          solidParams: defaultParams,
          selectedHistoryId: null,
          isPlaying: false,
          playbackProgress: 0,
          comparisonFunction: null
        });
      },

      exportScreenshot: async () => {
        return '';
      }
    }),
    {
      name: 'solid-revolution-storage',
      partialize: (state) => ({
        history: state.history,
        currentFunction: state.currentFunction,
        rotationAxis: state.rotationAxis,
        solidParams: state.solidParams
      })
    }
  )
);
