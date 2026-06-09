import type { AnalysisSample, DraftData, FlowNode, FlowEdge } from '@/types';
import { maxFlow, generateExplanation } from './flowEngine';
import { cleanData } from './dataCleaner';
import { isDuplicateOf } from './duplicateDetector';

export function analyzeSample(
  sampleId: string,
  sampleName: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
  sourceId: string,
  sinkId: string,
  allSamples: AnalysisSample[] = []
): AnalysisSample {
  const cleanResult = cleanData(nodes, edges, sourceId, sinkId);

  let explanation = null;
  let finalNodes = nodes.map((n) => ({ ...n, isBottleneck: false }));
  let finalEdges = edges.map((e) => ({ ...e, isBottleneck: false, flow: 0 }));

  if (cleanResult.isValid) {
    const result = maxFlow(finalNodes, finalEdges, sourceId, sinkId);

    finalEdges = finalEdges.map((e) => {
      const flow = result.flows.get(e.id) || 0;
      return {
        ...e,
        flow,
        isBottleneck: result.bottleneckEdges.includes(e.id),
      };
    });

    finalNodes = finalNodes.map((n) => ({
      ...n,
      isBottleneck: result.bottleneckNodes.includes(n.id),
    }));

    explanation = generateExplanation(result, finalNodes, finalEdges, sourceId, sinkId);
  }

  const base: AnalysisSample = {
    id: sampleId,
    name: sampleName,
    status: cleanResult.status,
    nodes: finalNodes,
    edges: finalEdges,
    source: sourceId,
    sink: sinkId,
    explanation,
    issues: cleanResult.issues,
    isDuplicate: false,
    reviewed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { isDup, duplicateOf, pair } = isDuplicateOf(base, allSamples);
  if (isDup) {
    base.isDuplicate = true;
    base.duplicateOf = duplicateOf;
    base.duplicatePair = pair;
  }

  return base;
}

export function recomputeSample(sample: AnalysisSample, allSamples: AnalysisSample[]): AnalysisSample {
  const updated = analyzeSample(
    sample.id,
    sample.name,
    sample.nodes.map((n) => ({ ...n, isBottleneck: false, flow: 0 })),
    sample.edges.map((e) => ({ ...e, isBottleneck: false, flow: 0 })),
    sample.source,
    sample.sink,
    allSamples.filter((s) => s.id !== sample.id)
  );

  return {
    ...updated,
    reviewed: sample.reviewed,
    reviewStatus: sample.reviewStatus,
    reviewComment: sample.reviewComment,
    createdAt: sample.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export function compareDraft(
  original: AnalysisSample,
  draft: { nodes: FlowNode[]; edges: FlowEdge[] }
): { impacts: string[]; diffSummary: string; changes: { nodesAdded: number; nodesRemoved: number; edgesChanged: number } } {
  const originalNodeIds = new Set(original.nodes.map((n) => n.id));
  const draftNodeIds = new Set(draft.nodes.map((n) => n.id));
  const nodesAdded = Array.from(draftNodeIds).filter((id) => !originalNodeIds.has(id)).length;
  const nodesRemoved = Array.from(originalNodeIds).filter((id) => !draftNodeIds.has(id)).length;

  let edgesChanged = 0;
  const edgeMap = new Map(original.edges.map((e) => [`${e.from}->${e.to}`, e]));
  for (const de of draft.edges) {
    const key = `${de.from}->${de.to}`;
    const orig = edgeMap.get(key);
    if (!orig || orig.capacity !== de.capacity) {
      edgesChanged++;
    }
  }

  const impacts: string[] = [];
  const changes: string[] = [];

  if (nodesAdded > 0) {
    impacts.push('瓶颈节点可能变化');
    changes.push(`新增 ${nodesAdded} 个节点`);
  }
  if (nodesRemoved > 0) {
    impacts.push('最大流结论需要重新验证');
    changes.push(`移除 ${nodesRemoved} 个节点`);
  }
  if (edgesChanged > 0) {
    impacts.push('瓶颈位置可能偏移');
    impacts.push('最大流数值可能变化');
    changes.push(`${edgesChanged} 条边的容量或拓扑变化`);
  }

  if (original.isDuplicate) {
    impacts.push('重复样本判定需重新验证');
  }

  const diffSummary = changes.length > 0 ? changes.join('；') : '数据无实质变化';

  return {
    impacts: Array.from(new Set(impacts)),
    diffSummary,
    changes: { nodesAdded, nodesRemoved, edgesChanged },
  };
}

export function applyDraft(original: AnalysisSample, draft: DraftData): AnalysisSample {
  const updated = analyzeSample(
    original.id,
    original.name,
    draft.nodes,
    draft.edges,
    original.source,
    original.sink,
    []
  );

  return {
    ...updated,
    reviewed: false,
    reviewStatus: undefined,
    reviewComment: undefined,
    createdAt: original.createdAt,
    updatedAt: new Date().toISOString(),
  };
}
