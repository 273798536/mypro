import type { FlowNode, FlowEdge, DuplicatePair, AnalysisSample } from '@/types';

interface GraphSignature {
  nodeCount: number;
  edgeCount: number;
  degreeSequence: number[];
  capacitySum: number;
  capacityDistribution: number[];
}

function getDegreeSequence(nodes: FlowNode[], edges: FlowEdge[]): number[] {
  const degrees = new Map<string, number>();
  nodes.forEach((n) => degrees.set(n.id, 0));
  edges.forEach((e) => {
    degrees.set(e.from, (degrees.get(e.from) || 0) + 1);
    degrees.set(e.to, (degrees.get(e.to) || 0) + 1);
  });
  return Array.from(degrees.values()).sort((a, b) => b - a);
}

function getCapacityDistribution(edges: FlowEdge[]): number[] {
  const capacities = edges.map((e) => e.capacity).sort((a, b) => a - b);
  if (capacities.length === 0) return [0];
  const total = capacities.reduce((a, b) => a + b, 0);
  const buckets = [0, 0, 0, 0, 0];
  capacities.forEach((c) => {
    const ratio = total > 0 ? c / total : 0;
    const idx = Math.min(Math.floor(ratio * 5), 4);
    buckets[idx]++;
  });
  return buckets.map((b) => b / capacities.length);
}

function getSignature(nodes: FlowNode[], edges: FlowEdge[]): GraphSignature {
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    degreeSequence: getDegreeSequence(nodes, edges),
    capacitySum: edges.reduce((s, e) => s + e.capacity, 0),
    capacityDistribution: getCapacityDistribution(edges),
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function sequenceSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    const minLen = Math.min(a.length, b.length);
    const maxLen = Math.max(a.length, b.length);
    const paddedA = [...a, ...Array(maxLen - minLen).fill(0)];
    const paddedB = [...b, ...Array(maxLen - minLen).fill(0)];
    return cosineSimilarity(paddedA, paddedB);
  }
  return cosineSimilarity(a, b);
}

export function computeSimilarity(
  nodesA: FlowNode[],
  edgesA: FlowEdge[],
  nodesB: FlowNode[],
  edgesB: FlowEdge[]
): { score: number; reasons: string[] } {
  const sigA = getSignature(nodesA, edgesA);
  const sigB = getSignature(nodesB, edgesB);
  const reasons: string[] = [];

  let structureScore = 0;
  if (sigA.nodeCount === sigB.nodeCount && sigA.edgeCount === sigB.edgeCount) {
    structureScore += 0.4;
    reasons.push(`节点数（${sigA.nodeCount}）和边数（${sigA.edgeCount}）完全一致`);
  } else {
    const nodeRatio = Math.min(sigA.nodeCount, sigB.nodeCount) / Math.max(sigA.nodeCount, sigB.nodeCount);
    const edgeRatio = Math.min(sigA.edgeCount, sigB.edgeCount) / Math.max(sigA.edgeCount, sigB.edgeCount);
    structureScore = (nodeRatio + edgeRatio) / 2 * 0.4;
  }

  const degreeSim = sequenceSimilarity(sigA.degreeSequence, sigB.degreeSequence);
  if (degreeSim > 0.9) {
    reasons.push('节点度序列高度相似，图拓扑结构基本相同');
  }

  const capacitySim = cosineSimilarity(sigA.capacityDistribution, sigB.capacityDistribution);
  if (capacitySim > 0.9) {
    reasons.push('容量分布模式高度一致');
  }

  const totalCapA = sigA.capacitySum;
  const totalCapB = sigB.capacitySum;
  const capSumRatio = totalCapA > 0 && totalCapB > 0 ? Math.min(totalCapA, totalCapB) / Math.max(totalCapA, totalCapB) : 0;
  if (capSumRatio > 0.95 && totalCapA === totalCapB) {
    reasons.push(`总容量和完全相同（${totalCapA}）`);
  }

  const finalScore = Math.min(1, structureScore * 0.4 + degreeSim * 0.35 + capacitySim * 0.15 + capSumRatio * 0.1);

  return { score: finalScore, reasons };
}

export function findDuplicates(samples: AnalysisSample[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const threshold = 0.9;

  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const a = samples[i];
      const b = samples[j];
      if (a.status === 'bad_data' || b.status === 'bad_data') continue;

      const { score, reasons } = computeSimilarity(a.nodes, a.edges, b.nodes, b.edges);
      if (score >= threshold) {
        pairs.push({
          sampleId1: a.id,
          sampleId2: b.id,
          similarityScore: Math.round(score * 100) / 100,
          reason: reasons.length > 0 ? reasons.join('；') : '综合图结构、度序列、容量分布等多维度判定为重复样本',
        });
      }
    }
  }
  return pairs;
}

export function isDuplicateOf(
  sample: AnalysisSample,
  existingSamples: AnalysisSample[]
): { isDup: boolean; duplicateOf?: string; pair?: DuplicatePair } {
  const threshold = 0.9;
  for (const existing of existingSamples) {
    if (existing.id === sample.id) continue;
    if (existing.status === 'bad_data') continue;

    const { score, reasons } = computeSimilarity(
      sample.nodes, sample.edges,
      existing.nodes, existing.edges
    );
    if (score >= threshold) {
      const pair: DuplicatePair = {
        sampleId1: existing.id,
        sampleId2: sample.id,
        similarityScore: Math.round(score * 100) / 100,
        reason: reasons.length > 0 ? reasons.join('；') : '综合图结构、度序列、容量分布等多维度判定为重复样本',
      };
      return { isDup: true, duplicateOf: existing.id, pair };
    }
  }
  return { isDup: false };
}
