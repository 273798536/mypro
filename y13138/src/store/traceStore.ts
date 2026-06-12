import { create } from 'zustand';
import type { TraceStep, MarkovNode, ParamRow, RawRecord } from '@/types';
import { rawRecords } from '@/data/records';

interface TraceState {
  activeNodeId: string | null;
  steps: TraceStep[];
  rightTab: 'trace' | 'evidence';
  allRecords: RawRecord[];

  setRightTab: (t: 'trace' | 'evidence') => void;
  buildTraceFromNode: (
    nodeId: string | null,
    nodes: MarkovNode[],
    paramRows: ParamRow[],
  ) => void;
  toggleStepExpand: (stepId: string) => void;
  jumpToRecord: (recordId: string) => void;
}

function findRecord(id: string, all: RawRecord[]): RawRecord | undefined {
  return all.find((r) => r.id === id);
}

export const useTraceStore = create<TraceState>((set) => ({
  activeNodeId: null,
  steps: [],
  rightTab: 'trace',
  allRecords: JSON.parse(JSON.stringify(rawRecords)),

  setRightTab: (t) => set({ rightTab: t }),

  buildTraceFromNode: (nodeId, nodes, paramRows) => {
    if (!nodeId) {
      set({ activeNodeId: null, steps: [] });
      return;
    }
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const steps: TraceStep[] = [];
    steps.push({
      id: `step-node-${node.id}`,
      stepType: 'node',
      title: `异常节点：${node.romanLabel} ${node.displayName}`,
      content: node.isAbnormal
        ? `样本量=${node.sampleCount}，稳态π=${(node.steadyProb * 100).toFixed(1)}%（${node.abnormalReason ?? '外推不可靠'}）`
        : `样本量=${node.sampleCount}，稳态π=${(node.steadyProb * 100).toFixed(1)}%`,
      refId: node.id,
      expanded: true,
    });

    node.relatedParamIds.forEach((pid) => {
      const p = paramRows.find((r) => r.id === pid);
      if (!p) return;
      const tag = p.isBoundary ? '【边界条件】' : p.isLateAttachment ? '【晚到附件】' : '';
      steps.push({
        id: `step-param-${pid}`,
        stepType: 'param',
        title: `参数表 ${pid}：${p.name} = ${p.value} ${p.unit} ${tag}`,
        content: p.remark || '（无备注）',
        refId: pid,
        expanded: p.isBoundary || p.isLateAttachment,
      });
    });

    node.relatedRecordIds.forEach((rid) => {
      const rec = findRecord(rid, rawRecords);
      if (!rec) return;
      const conv =
        rec.conversionSteps && rec.conversionSteps.length > 0
          ? {
              id: `step-conv-${rid}`,
              stepType: 'calc' as const,
              title: `单位换算：${rec.originalValue} ${rec.originalUnit} → ${rec.convertedValue} ${rec.convertedUnit}`,
              content: rec.conversionSteps.join('\n'),
              expanded: false,
            }
          : undefined;
      steps.push({
        id: `step-record-${rid}`,
        stepType: 'record',
        title: `原始材料 ${rid}：${rec.typeLabel}`,
        content: `${rec.collectTime} · ${rec.recorder}\n${rec.summary}`,
        refId: rid,
        expanded: rec.type !== 'success',
        children: conv ? [conv] : undefined,
      });
    });

    if (node.relatedRecordIds.length > 0) {
      const rec = findRecord(node.relatedRecordIds[0], rawRecords);
      if (rec && rec.conversionSteps) {
        steps.push({
          id: `step-calc-final-${node.id}`,
          stepType: 'calc',
          title: `最终计算：${node.romanLabel}节点转移概率推导`,
          content:
            '详见马尔可夫链主计算（engine/markov.ts）\n' +
            `P矩阵：见底部双组对照面板\n` +
            `稳态π：见steadyState.ts求解过程（方程组 πP = π）`,
          expanded: false,
        });
      }
    }

    set({ activeNodeId: nodeId, steps });
  },

  toggleStepExpand: (stepId) => {
    set((state) => {
      const flip = (arr: TraceStep[]): TraceStep[] =>
        arr.map((s) => {
          if (s.id === stepId) return { ...s, expanded: !s.expanded };
          if (s.children) return { ...s, children: flip(s.children) };
          return s;
        });
      return { steps: flip(state.steps) };
    });
  },

  jumpToRecord: (recordId) => {
    set({ rightTab: 'trace' });
    const rec = rawRecords.find((r) => r.id === recordId);
    if (rec && rec.relatedParamIds && rec.relatedParamIds[0]) {
      // 将在组件中处理自动滚动
    }
  },
}));
