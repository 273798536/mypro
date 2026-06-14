import type { MarkovNode, MarkovEdge, ParamRow, RawRecord } from '@/types';
import { rawRecords } from '@/data/records';

export interface GraphDeriveOptions {
  thresholdSlider?: number;
  safeCoeffSlider?: number;
}

export interface DerivedGraph {
  nodes: MarkovNode[];
  edges: MarkovEdge[];
  log: string[];
}

interface NodeTemplate {
  id: string;
  romanLabel: string;
  displayName: string;
  x: number;
  y: number;
  baseSampleContrib: Record<string, number>;
}

const NODE_TEMPLATES: NodeTemplate[] = [
  {
    id: 'S0',
    romanLabel: 'Ⅰ',
    displayName: '未掌握',
    x: 120,
    y: 180,
    baseSampleContrib: { 'R-001': 12, 'R-002': 0 },
  },
  {
    id: 'S1',
    romanLabel: 'Ⅱ',
    displayName: '初步理解',
    x: 360,
    y: 90,
    baseSampleContrib: { 'R-001': 10, 'R-002': 8 },
  },
  {
    id: 'S2',
    romanLabel: 'Ⅲ',
    displayName: '掌握',
    x: 600,
    y: 180,
    baseSampleContrib: { 'R-003': 3 },
  },
  {
    id: 'S3',
    romanLabel: 'Ⅳ',
    displayName: '熟练应用',
    x: 480,
    y: 320,
    baseSampleContrib: { 'R-004': 8 },
  },
];

export interface ParamMappingEntry {
  paramId: string;
  kind: 'initial' | 'edge';
  target: string;
  target2?: string;
}

export const PARAM_MAPPING: ParamMappingEntry[] = [
  { paramId: 'P-01', kind: 'initial', target: 'S0' },
  { paramId: 'P-02', kind: 'initial', target: 'S1' },
  { paramId: 'P-03', kind: 'edge', target: 'S0', target2: 'S1' },
  { paramId: 'P-04', kind: 'edge', target: 'S1', target2: 'S0' },
  { paramId: 'P-05', kind: 'edge', target: 'S1', target2: 'S2' },
  { paramId: 'P-06', kind: 'edge', target: 'S2', target2: 'S3' },
];

function buildBaseEdgeCalcSteps(): Record<string, string[]> {
  return {
    'S0→S0': ['自环概率：由出度归一化派生 P(S₀→S₀) = 1 - Σ其他出边'],
    'S0→S1': ['见参数表 P-03（原始来源 R-001）'],
    'S0→S2': ['弱边默认值：S₀→S₂ 跳跃 ≈ 0.05（n=2/34）'],
    'S1→S0': ['见参数表 P-04（来源 R-001 / R-002 晚到修正）'],
    'S1→S1': ['自环概率：由出度归一化派生 P(S₁→S₁) = 1 - Σ其他出边'],
    'S1→S2': ['见参数表 P-05（晚到附件 R-002 影响：B组修正为0.30）'],
    'S1→S3': ['弱边默认值：S₁→S₃ 跳跃 ≈ 0.03（n=1/33）'],
    'S2→S0': ['大回退默认值：S₂→S₀ ≈ 0.05（n=0.75/15）'],
    'S2→S1': ['回退默认值：S₂→S₁ ≈ 0.15（n=2.25/15）'],
    'S2→S2': ['自环概率：由出度归一化派生 P(S₂→S₂) = 1 - Σ其他出边'],
    'S2→S3': ['见参数表 P-06（⚠️边界样本 R-003：n=3<θ=5）'],
    'S3→S1': ['回退默认值：S₃→S₁ ≈ 0.02（n=0.4/20）'],
    'S3→S2': ['回退默认值：S₃→S₂ ≈ 0.10（n=2/20）'],
    'S3→S3': ['自环概率：由出度归一化派生 P(S₃→S₃) = 1 - Σ其他出边'],
  };
}

function edgeIdx(from: string, to: string): number {
  const map: Record<string, number> = {
    'S0→S0': 0, 'S0→S1': 1, 'S0→S2': 2,
    'S1→S0': 3, 'S1→S1': 4, 'S1→S2': 5, 'S1→S3': 6,
    'S2→S0': 7, 'S2→S1': 8, 'S2→S2': 9, 'S2→S3': 10,
    'S3→S1': 11, 'S3→S2': 12, 'S3→S3': 13,
  };
  return map[`${from}→${to}`] ?? -1;
}

function buildDefaultEdges(): number[][] {
  const n = 4;
  const P: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  P[0][2] = 0.05;
  P[1][3] = 0.03;
  P[2][0] = 0.05;
  P[2][1] = 0.15;
  P[3][1] = 0.02;
  P[3][2] = 0.10;
  return P;
}

function computeSampleCount(
  template: NodeTemplate,
  records: RawRecord[],
  paramRows: ParamRow[],
): { count: number; relatedRecordIds: string[]; relatedParamIds: string[] } {
  let count = 0;
  const relatedRecordIds: string[] = [];
  for (const [rid, c] of Object.entries(template.baseSampleContrib)) {
    if (records.find((r) => r.id === rid)) {
      count += c;
      if (!relatedRecordIds.includes(rid)) relatedRecordIds.push(rid);
    }
  }
  for (const row of paramRows) {
    if (row.sourceRecordId && !relatedRecordIds.includes(row.sourceRecordId)) {
      const m = PARAM_MAPPING.find((p) => p.paramId === row.id);
      if (m && m.target === template.id) {
        relatedRecordIds.push(row.sourceRecordId);
      }
    }
  }
  const relatedParamIds = PARAM_MAPPING.filter(
    (m) => m.target === template.id || (m.target2 && m.target2 === template.id),
  ).map((m) => m.paramId);
  if (template.id === 'S2') relatedParamIds.push('P-07');
  if (template.id === 'S3') relatedParamIds.push('P-08');
  return { count, relatedRecordIds, relatedParamIds };
}

export function deriveGraphFromParams(
  paramRows: ParamRow[],
  options: GraphDeriveOptions = {},
): DerivedGraph {
  const log: string[] = [];
  const allRecords = rawRecords;

  log.push('[deriveGraph] 开始派生图结构');
  log.push(`[deriveGraph] 参数行数：${paramRows.length}，阈值滑块：${options.thresholdSlider ?? '未设置'}，安全系数滑块：${options.safeCoeffSlider ?? '未设置'}`);

  const p01 = paramRows.find((r) => r.id === 'P-01')?.value ?? 0.4;
  const p02 = paramRows.find((r) => r.id === 'P-02')?.value ?? 0.35;
  log.push(`[deriveGraph] 初始分布 P-01=${p01} (S0), P-02=${p02} (S1)`);

  const initS0 = p01;
  const initS1 = p02;
  const remain = Math.max(0, 1 - initS0 - initS1);
  const initS2 = +(remain * 0.72).toFixed(3);
  const initS3 = +(remain * 0.28).toFixed(3);
  const initProbs = [initS0, initS1, initS2, initS3];
  log.push(`[deriveGraph] 初始分布归一化：剩余${remain.toFixed(3)}按72/28分配→S2=${initS2}, S3=${initS3}`);

  const P = buildDefaultEdges();
  P[0][1] = paramRows.find((r) => r.id === 'P-03')?.value ?? P[0][1];
  P[1][0] = paramRows.find((r) => r.id === 'P-04')?.value ?? P[1][0];
  P[1][2] = paramRows.find((r) => r.id === 'P-05')?.value ?? P[1][2];
  P[2][3] = paramRows.find((r) => r.id === 'P-06')?.value ?? P[2][3];
  log.push(`[deriveGraph] 主转移边：P01=P[0][1]=${P[0][1]}, P10=P[1][0]=${P[1][0]}, P12=P[1][2]=${P[1][2]}, P23=P[2][3]=${P[2][3]}`);

  for (let i = 0; i < 4; i++) {
    const outSum = P[i].reduce((s, v, j) => (j === i ? s : s + v), 0);
    P[i][i] = Math.max(0, +(1 - outSum).toFixed(4));
    const rowSum = P[i].reduce((s, v) => s + v, 0);
    if (Math.abs(rowSum - 1) > 1e-6) {
      log.push(`[deriveGraph] ⚠️ 行${i}出和=${rowSum.toFixed(4)}，微修正自环 P[${i}][${i}] += ${(1 - rowSum).toFixed(4)}`);
      P[i][i] = +(P[i][i] + (1 - rowSum)).toFixed(4);
    }
  }

  const stepCalc = buildBaseEdgeCalcSteps();

  const edges: MarkovEdge[] = [];
  const ids = ['S0', 'S1', 'S2', 'S3'];
  let idx = 0;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const key = `${ids[i]}→${ids[j]}`;
      const ei = edgeIdx(ids[i], ids[j]);
      if (ei >= 0) {
        edges.push({
          id: 'E' + String(idx).padStart(2, '0'),
          from: ids[i],
          to: ids[j],
          probability: P[i][j],
          isCalcVisible: P[i][j] > 0.25,
          calcSteps: stepCalc[key] || ['默认值'],
        });
        idx++;
      }
    }
  }
  log.push(`[deriveGraph] 共生成 ${edges.length} 条转移边`);

  const nodes: MarkovNode[] = NODE_TEMPLATES.map((tpl, i) => {
    const sc = computeSampleCount(tpl, allRecords, paramRows);
    return {
      id: tpl.id,
      romanLabel: tpl.romanLabel,
      displayName: tpl.displayName,
      steadyProb: initProbs[i],
      initialProb: initProbs[i],
      sampleCount: sc.count,
      isAbnormal: false,
      relatedParamIds: sc.relatedParamIds,
      relatedRecordIds: sc.relatedRecordIds,
      x: tpl.x,
      y: tpl.y,
    };
  });
  log.push(`[deriveGraph] 节点样本数：${nodes.map((n) => `${n.id}=${n.sampleCount}`).join(', ')}`);
  log.push('[deriveGraph] 派生完成，稳态概率将由 engine/steadyState 覆写');

  return { nodes, edges, log };
}

export function syncSliderToParamRows(
  rows: ParamRow[],
  threshold: number,
  safeCoeff: number,
): ParamRow[] {
  return rows.map((r) => {
    if (r.id === 'P-07') return { ...r, value: threshold };
    if (r.id === 'P-08') return { ...r, value: safeCoeff };
    return r;
  });
}

export function readInitialThresholdsFromRows(rows: ParamRow[]): { threshold: number; safeCoeff: number } {
  const p7 = rows.find((r) => r.id === 'P-07');
  const p8 = rows.find((r) => r.id === 'P-08');
  return {
    threshold: p7?.value ?? 5,
    safeCoeff: p8?.value ?? 1.0,
  };
}
