import { create } from 'zustand';
import { produce } from 'immer';
import type { AnnotationStore, SkeletonNode, OperationRecord, AnnotationTask } from '@/types';
import {
  MOCK_TASKS,
  MOCK_FRAMES,
  MOCK_FRAMES_BEFORE,
  MOCK_COLLISIONS,
  MOCK_SCORE_SHEET,
  MOCK_HISTORY,
  MOCK_LAYERS,
  MOCK_REVIEWS,
  BONE_CONNECTIONS,
  getTaskById,
  getFramesByLayer,
} from '@/mock/data';

const generateId = () => Math.random().toString(36).substring(2, 10);

const initialState: Omit<AnnotationStore, keyof { [K in keyof AnnotationStore as AnnotationStore[K] extends Function ? K : never]: never }> = {
  tasks: MOCK_TASKS,
  currentTask: null,
  frames: [],
  currentFrameIndex: 0,
  collisions: [],
  bones: BONE_CONNECTIONS,
  history: [],
  historyIndex: -1,
  scoreSheet: null,
  layers: [],
  activeLayerId: 'LAYER-AFTER',
  layerMode: 'after',
  reviews: [],
  viewState: {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  },
  selectedNodeId: null,
  isPlaying: false,
};

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  ...initialState,

  loadTask: async (taskId: string) => {
    const task = getTaskById(taskId);
    if (!task) return;

    await new Promise((resolve) => setTimeout(resolve, 300));

    set({
      currentTask: task,
      frames: MOCK_FRAMES,
      currentFrameIndex: 0,
      collisions: MOCK_COLLISIONS,
      history: [...MOCK_HISTORY],
      historyIndex: MOCK_HISTORY.length - 1,
      scoreSheet: MOCK_SCORE_SHEET,
      layers: MOCK_LAYERS,
      activeLayerId: 'LAYER-AFTER',
      layerMode: 'after',
      reviews: MOCK_REVIEWS,
      viewState: { scale: 1, offsetX: 0, offsetY: 0 },
      selectedNodeId: null,
    });
  },

  setFrameIndex: (index: number) => {
    const { frames } = get();
    if (index >= 0 && index < frames.length) {
      set({ currentFrameIndex: index });
    }
  },

  updateNode: (nodeId: string, x: number, y: number) => {
    const { frames, currentFrameIndex, history, historyIndex } = get();
    const frame = frames[currentFrameIndex];
    if (!frame) return;

    const node = frame.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const newFrames = produce(frames, (draft) => {
      const targetNode = draft[currentFrameIndex].nodes.find((n) => n.id === nodeId);
      if (targetNode) {
        targetNode.x = x;
        targetNode.y = y;
        targetNode.confidence = Math.min(1, targetNode.confidence + 0.05);
      }
    });

    const newHistory: OperationRecord = {
      id: generateId(),
      type: 'annotate',
      operator: '当前用户',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      description: `调整了${node.name}节点位置`,
      before: { node: node.name, x: node.x, y: node.y },
      after: { node: node.name, x, y },
    };

    const trimmedHistory = history.slice(0, historyIndex + 1);

    set({
      frames: newFrames,
      history: [...trimmedHistory, newHistory],
      historyIndex: trimmedHistory.length,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const record = history[historyIndex];

    if (record.type === 'annotate' && record.before && record.after) {
      const { frames, currentFrameIndex } = get();
      const nodeName = record.before.node as string;
      const newFrames = produce(frames, (draft) => {
        const targetNode = draft[currentFrameIndex].nodes.find((n) => n.name === nodeName);
        if (targetNode && record.before) {
          targetNode.x = record.before.x as number;
          targetNode.y = record.before.y as number;
        }
      });
      set({ frames: newFrames });
    }

    set({ historyIndex: newIndex });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const record = history[newIndex];

    if (record.type === 'annotate' && record.before && record.after) {
      const { frames, currentFrameIndex } = get();
      const nodeName = record.after.node as string;
      const newFrames = produce(frames, (draft) => {
        const targetNode = draft[currentFrameIndex].nodes.find((n) => n.name === nodeName);
        if (targetNode && record.after) {
          targetNode.x = record.after.x as number;
          targetNode.y = record.after.y as number;
        }
      });
      set({ frames: newFrames });
    }

    set({ historyIndex: newIndex });
  },

  togglePlay: () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying });
  },

  supplementScore: (itemIndex: number, score: number, remark?: string) => {
    const { scoreSheet } = get();
    if (!scoreSheet) return;

    const newScoreSheet = produce(scoreSheet, (draft) => {
      const item = draft.scores[itemIndex];
      if (item) {
        item.score = score;
        if (!item.unit) {
          item.unit = '分';
          item.missingUnit = false;
        }
        if (remark) {
          item.remark = remark;
        }
      }
    });

    const newHistory: OperationRecord = {
      id: generateId(),
      type: 'supplement',
      operator: '当前用户',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      description: `补录评分项"${newScoreSheet.scores[itemIndex].itemName}"得分为${score}`,
      before: { score: scoreSheet.scores[itemIndex].score },
      after: { score },
    };

    set({
      scoreSheet: newScoreSheet,
      history: [...get().history, newHistory],
      historyIndex: get().history.length,
    });
  },

  updateTask: (taskId: string, updates: Partial<AnnotationTask>) => {
    const { tasks } = get();
    const newTasks = produce(tasks, (draft) => {
      const task = draft.find((t) => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
      }
    });
    set({ tasks: newTasks });
  },

  confirmBoundary: (collisionId: string, approved: boolean, comment: string) => {
    const { collisions } = get();
    const collision = collisions.find((c) => c.id === collisionId);
    if (!collision) return;

    const newCollisions = produce(collisions, (draft) => {
      const target = draft.find((c) => c.id === collisionId);
      if (target) {
        target.confirmed = true;
        target.isFalsePositive = !approved;
        target.confirmedBy = '当前用户';
        target.confirmedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
        target.comment = comment;
      }
    });

    const newHistory: OperationRecord = {
      id: generateId(),
      type: 'confirm',
      operator: '当前用户',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      description: `${approved ? '确认' : '驳回'}边界案例${collisionId}：${collision.description}`,
    };

    set({
      collisions: newCollisions,
      history: [...get().history, newHistory],
      historyIndex: get().history.length,
    });
  },

  reRunAnnotation: () => {
    const { currentTask, history } = get();
    if (!currentTask) return;

    const newTask = produce(currentTask, (draft) => {
      draft.rerunCount += 1;
      draft.status = 'in_progress';
      draft.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    });

    const newHistory: OperationRecord = {
      id: generateId(),
      type: 'rerun',
      operator: '当前用户',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      description: `第${newTask.rerunCount}次重复标注：基于最新评分表重新计算`,
      before: { rerunCount: currentTask.rerunCount },
      after: { rerunCount: newTask.rerunCount },
    };

    set({
      currentTask: newTask,
      history: [...history, newHistory],
      historyIndex: history.length,
    });
  },

  reopenTask: () => {
    const { currentTask, history } = get();
    if (!currentTask) return;

    const newTask = produce(currentTask, (draft) => {
      draft.status = 'reopened';
      draft.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    });

    const newHistory: OperationRecord = {
      id: generateId(),
      type: 'reopen',
      operator: '当前用户',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      description: '重新打开任务以进行进一步调整',
    };

    set({
      currentTask: newTask,
      history: [...history, newHistory],
      historyIndex: history.length,
    });
  },

  switchLayer: (layerId: string) => {
    const frames = getFramesByLayer(layerId);
    set({
      activeLayerId: layerId,
      frames,
    });
  },

  setLayerMode: (mode: 'before' | 'after' | 'split') => {
    set({ layerMode: mode });
  },

  setViewState: (state: Partial<AnnotationStore['viewState']>) => {
    set((prev) => ({
      viewState: { ...prev.viewState, ...state },
    }));
  },

  selectNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  exportReport: async (format: 'pdf' | 'excel' | 'csv' | 'json', contents?: ('basicInfo' | 'skeletonData' | 'collisionResults' | 'scoreSheet' | 'boundaryCases' | 'operationHistory' | 'repeatReasons' | 'statistics')[]) => {
    const { currentTask, frames, collisions, history } = get();
    if (!currentTask) throw new Error('No task loaded');

    await new Promise((resolve) => setTimeout(resolve, 500));

    const totalNodes = frames.reduce((sum, f) => sum + f.nodes.length, 0);
    const avgConfidence = frames.reduce(
      (sum, f) => sum + f.nodes.reduce((s, n) => s + n.confidence, 0) / f.nodes.length,
      0
    ) / frames.length;

    const boundaryCases = collisions.filter((c) => c.severity === 'boundary');
    const falsePositives = collisions.filter((c) => c.isFalsePositive);

    const report = {
      task: currentTask,
      summary: {
        totalFrames: frames.length,
        totalNodes,
        collisions: collisions.length,
        boundaryCases: boundaryCases.length,
        falsePositives: falsePositives.length,
        rerunCount: currentTask.rerunCount,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
      },
      timeline: history,
      boundaryDetails: boundaryCases.map((c) => {
        const frame = frames.find((f) =>
          f.nodes.some((n) => n.name === c.nodes[0] || n.name === c.nodes[1])
        );
        const node1 = frame?.nodes.find((n) => n.name === c.nodes[0]);
        const node2 = frame?.nodes.find((n) => n.name === c.nodes[1]);
        return {
          collision: c,
          nodes: [node1, node2] as [SkeletonNode, SkeletonNode],
          frameId: frame?.frameId || '',
        };
      }),
      comparisonData: [
        { category: '碰撞检测', before: 8, after: 5 },
        { category: '边界案例', before: 3, after: 2 },
        { category: '误报数量', before: 0, after: 2 },
        { category: '平均置信度', before: 0.78, after: 0.85 },
      ],
      exportContents: contents,
    };

    const newHistory: OperationRecord = {
      id: generateId(),
      type: 'export',
      operator: '当前用户',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      description: `导出${format.toUpperCase()}格式报告${contents ? `（含${contents.length}项内容）` : ''}`,
    };

    set({
      history: [...get().history, newHistory],
      historyIndex: get().history.length,
    });

    return JSON.stringify(report, null, 2);
  },

  completeReview: (approved: boolean, comment: string) => {
    const { currentTask, reviews, history } = get();
    if (!currentTask) return;

    const newReview = {
      confirmId: generateId(),
      taskId: currentTask.taskId,
      reviewer: '当前用户',
      comment,
      isApproved: approved,
      confirmedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    const newTask = produce(currentTask, (draft) => {
      draft.status = approved ? 'completed' : 'reopened';
      draft.updatedAt = newReview.confirmedAt;
    });

    const newHistory: OperationRecord = {
      id: generateId(),
      type: 'confirm',
      operator: '当前用户',
      timestamp: newReview.confirmedAt,
      description: `${approved ? '通过' : '驳回'}复核：${comment}`,
    };

    set({
      currentTask: newTask,
      reviews: [...reviews, newReview],
      history: [...history, newHistory],
      historyIndex: history.length,
    });
  },

  resetState: () => {
    set(initialState);
  },
}));
