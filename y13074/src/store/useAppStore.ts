import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  StationOption,
  TimelineSegment,
  ReviewComment,
  CameraView,
  ProcessingStatus,
  CommentSource,
  FloorUnitCheckResult,
} from '../types';
import {
  STATION_OPTIONS,
  TIMELINE_SEGMENTS,
  INITIAL_COMMENTS,
  SAVED_VIEWS,
} from '../data/mockData';

interface AppState {
  stationOptions: StationOption[];
  timelineSegments: TimelineSegment[];
  comments: ReviewComment[];
  savedViews: CameraView[];
  selectedOptionId: string | null;
  selectedTimelineId: string | null;
  highlightedCommentId: string | null;
  currentView: CameraView | null;
  statusFilter: ProcessingStatus | 'all';
  sourceFilter: CommentSource | 'all';
  searchKeyword: string;
  pendingFloorCheck: Record<string, FloorUnitCheckResult>;

  setSelectedOption: (id: string | null) => void;
  setSelectedTimeline: (id: string | null) => void;
  setHighlightedComment: (id: string | null) => void;
  setCurrentView: (view: CameraView | null) => void;
  setStatusFilter: (s: ProcessingStatus | 'all') => void;
  setSourceFilter: (s: CommentSource | 'all') => void;
  setSearchKeyword: (k: string) => void;

  saveView: (view: Omit<CameraView, 'id' | 'savedAt'>) => void;
  deleteView: (id: string) => void;

  addComment: (data: {
    optionId: string;
    timelineSegmentId: string | null;
    content: string;
    source: CommentSource;
    originalFieldName?: string;
    rawFields?: Record<string, string>;
  }) => void;

  updateComment: (
    id: string,
    patch: Partial<
      Pick<
        ReviewComment,
        'content' | 'status' | 'handler' | 'evidenceRefs' | 'source'
      >
    >
  ) => void;

  normalizeAndAddComment: (raw: Record<string, string>) => {
    added: boolean;
    check?: FloorUnitCheckResult;
    commentId?: string;
  };

  confirmFloorCheck: (commentId: string, accept: boolean, overrideValue?: string) => void;

  getFilteredComments: () => ReviewComment[];
  getCommentsByOption: (optionId: string) => ReviewComment[];
  getCommentsByTimeline: (timelineId: string) => ReviewComment[];
  getStatusStats: () => Record<ProcessingStatus, number>;
}

const TODAY = new Date().toISOString().slice(0, 10);
const NOW_STR = () =>
  new Date().toLocaleString('zh-CN', { hour12: false });

function detectFloorUnitMixed(value: string): FloorUnitCheckResult | null {
  if (!value) return null;
  const hasFloorWord = /(层|楼|F|f)/.test(value);
  const hasAreaUnit = /(㎡|平方米|平米|平方|m2|M2)/.test(value);
  const hasHeightUnit = /(m|米)/.test(value);
  const mixed =
    (hasFloorWord && hasAreaUnit) ||
    (hasFloorWord && hasHeightUnit && /(层高|高度)/.test(value) === false);

  if (mixed) {
    let normalized = value
      .replace(/\b平方\b/g, '㎡')
      .replace(/\b平米\b/g, '㎡')
      .replace(/\b平方米\b/g, '㎡')
      .replace(/\bm2\b/gi, '㎡')
      .replace(/\bF\b/g, '层')
      .replace(/\bf\b/g, '层');
    if (normalized === value) normalized = value + '（已标准化）';
    return {
      hasMixedUnit: true,
      originalValue: value,
      normalizedValue: normalized,
      reason: `检测到楼层/单位混用：${
        hasFloorWord ? '含楼层标识' : ''
      }${hasAreaUnit ? '+面积单位' : ''}${hasHeightUnit ? '+长度单位' : ''}，可能导致复核歧义。`,
      nextStep:
        '请复核人确认：1) 若为楼层描述请去掉面积/长度单位；2) 若为面积请使用"㎡"；3) 若为层高请使用"m"并标注"层高"。',
      needsManualConfirm: true,
    };
  }
  return null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      stationOptions: STATION_OPTIONS,
      timelineSegments: TIMELINE_SEGMENTS,
      comments: INITIAL_COMMENTS,
      savedViews: SAVED_VIEWS,
      selectedOptionId: null,
      selectedTimelineId: null,
      highlightedCommentId: null,
      currentView: null,
      statusFilter: 'all',
      sourceFilter: 'all',
      searchKeyword: '',
      pendingFloorCheck: {},

      setSelectedOption: (id) => set({ selectedOptionId: id }),
      setSelectedTimeline: (id) => set({ selectedTimelineId: id }),
      setHighlightedComment: (id) => set({ highlightedCommentId: id }),
      setCurrentView: (view) => set({ currentView: view }),
      setStatusFilter: (s) => set({ statusFilter: s }),
      setSourceFilter: (s) => set({ sourceFilter: s }),
      setSearchKeyword: (k) => set({ searchKeyword: k }),

      saveView: (view) => {
        const newView: CameraView = {
          ...view,
          id: `v-${Date.now()}`,
          savedAt: NOW_STR(),
        };
        set((s) => ({ savedViews: [...s.savedViews, newView] }));
      },

      deleteView: (id) => {
        set((s) => ({ savedViews: s.savedViews.filter((v) => v.id !== id) }));
      },

      addComment: (data) => {
        const newComment: ReviewComment = {
          id: `c-${Date.now()}`,
          optionId: data.optionId,
          timelineSegmentId: data.timelineSegmentId,
          content: data.content,
          source: data.source,
          status: 'pending',
          originalFieldName: data.originalFieldName,
          rawFields: data.rawFields,
          createdAt: TODAY,
          createdBy: '当前用户',
          updatedAt: TODAY,
          updatedBy: '当前用户',
        };
        set((s) => ({ comments: [...s.comments, newComment] }));
      },

      updateComment: (id, patch) => {
        set((s) => ({
          comments: s.comments.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...patch,
                  updatedAt: TODAY,
                  updatedBy: '当前用户',
                  handledAt:
                    patch.status === 'completed' || patch.status === 'confirmed'
                      ? TODAY
                      : c.handledAt,
                }
              : c
          ),
        }));
      },

      normalizeAndAddComment: (raw) => {
        const SOURCE_KEYS = [
          ['source', '来源', '资料来源', '信息来源'],
        ] as const;
        const STATUS_KEYS = [
          ['status', '状态', '处理状态', '进度'],
        ] as const;
        const CONTENT_KEYS = [
          ['content', '备注', '意见', '问题', '批注', '说明', '描述'],
        ] as const;
        const OPTION_KEYS = [
          ['option', '方案', '站位', '索道站'],
        ] as const;
        const TIMELINE_KEYS = [
          ['timeline', '阶段', '环节', '时间'],
        ] as const;

        const pick = (keys: readonly (readonly string[])[]) => {
          for (const group of keys) {
            for (const k of Object.keys(raw)) {
              if (group.some((alias) => k.includes(alias))) {
                return raw[k];
              }
            }
          }
          return undefined;
        };

        const rawContent = pick(CONTENT_KEYS) || Object.values(raw)[0] || '';
        const rawSource = pick(SOURCE_KEYS) || '';
        const rawStatus = pick(STATUS_KEYS) || '';
        const rawOption = pick(OPTION_KEYS) || '';
        const rawTimeline = pick(TIMELINE_KEYS) || '';

        let source: CommentSource = 'other';
        for (const [key, label] of Object.entries({
          expert_review: '专家',
          onsite_inspection: '现场|踏勘',
          design_doc: '设计|图纸',
          safety_spec: '安全',
          operation_feedback: '运维',
        })) {
          if (new RegExp(label).test(rawSource)) {
            source = key as CommentSource;
            break;
          }
        }

        let status: ProcessingStatus = 'pending';
        for (const [key, label] of Object.entries({
          completed: '已处理|已完成|完成',
          processing: '处理中|进行中',
          evidence_needed: '补证据|待补|证据',
          confirmed: '已确认|确认',
          pending: '待处理|待办|未处理',
        })) {
          if (new RegExp(label).test(rawStatus)) {
            status = key as ProcessingStatus;
            break;
          }
        }

        let optionId: string | null = null;
        for (const opt of get().stationOptions) {
          if (
            rawOption.includes(opt.code) ||
            rawContent.includes(opt.code + '方案') ||
            rawContent.includes(opt.code + '站')
          ) {
            optionId = opt.id;
            break;
          }
        }
        if (!optionId) optionId = get().stationOptions[0].id;

        let timelineId: string | null = null;
        for (const seg of get().timelineSegments) {
          if (rawTimeline.includes(seg.name) || rawContent.includes(seg.name)) {
            timelineId = seg.id;
            break;
          }
        }

        const check = detectFloorUnitMixed(rawContent);

        const id = `c-${Date.now()}`;
        const newComment: ReviewComment = {
          id,
          optionId,
          timelineSegmentId: timelineId,
          content: rawContent,
          source,
          status,
          rawFields: { ...raw },
          originalFieldName: Object.keys(raw)[0],
          floorUnitMixed: check?.hasMixedUnit,
          floorUnitCheckNote: check?.reason,
          createdAt: TODAY,
          createdBy: '批量导入',
          updatedAt: TODAY,
          updatedBy: '批量导入',
        };

        set((s) => ({
          comments: [...s.comments, newComment],
          pendingFloorCheck: check?.hasMixedUnit
            ? { ...s.pendingFloorCheck, [id]: check }
            : s.pendingFloorCheck,
        }));

        return {
          added: true,
          check: check || undefined,
          commentId: id,
        };
      },

      confirmFloorCheck: (commentId, accept, overrideValue) => {
        set((s) => {
          const nextPending = { ...s.pendingFloorCheck };
          delete nextPending[commentId];
          const nextComments = s.comments.map((c) => {
            if (c.id !== commentId) return c;
            return {
              ...c,
              content: accept && overrideValue ? overrideValue : c.content,
              floorUnitMixed: false,
              floorUnitCheckNote: accept
                ? '已人工确认通过'
                : '已标记不修正，保留原文',
              updatedAt: TODAY,
              updatedBy: '当前用户',
            };
          });
          return { pendingFloorCheck: nextPending, comments: nextComments };
        });
      },

      getFilteredComments: () => {
        const {
          comments,
          statusFilter,
          sourceFilter,
          searchKeyword,
          selectedOptionId,
          selectedTimelineId,
        } = get();
        return comments.filter((c) => {
          if (statusFilter !== 'all' && c.status !== statusFilter) return false;
          if (sourceFilter !== 'all' && c.source !== sourceFilter) return false;
          if (selectedOptionId && c.optionId !== selectedOptionId) return false;
          if (selectedTimelineId && c.timelineSegmentId !== selectedTimelineId)
            return false;
          if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            const hay = (
              c.content +
              (c.originalFieldName || '') +
              Object.values(c.rawFields || {}).join(' ')
            ).toLowerCase();
            if (!hay.includes(kw)) return false;
          }
          return true;
        });
      },

      getCommentsByOption: (optionId) =>
        get().comments.filter((c) => c.optionId === optionId),

      getCommentsByTimeline: (timelineId) =>
        get().comments.filter((c) => c.timelineSegmentId === timelineId),

      getStatusStats: () => {
        const stats: Record<ProcessingStatus, number> = {
          pending: 0,
          processing: 0,
          completed: 0,
          evidence_needed: 0,
          confirmed: 0,
        };
        for (const c of get().comments) stats[c.status]++;
        return stats;
      },
    }),
    {
      name: 'ropeway-station-store',
      partialize: (s) => ({
        comments: s.comments,
        savedViews: s.savedViews,
        pendingFloorCheck: s.pendingFloorCheck,
      }),
    }
  )
);
