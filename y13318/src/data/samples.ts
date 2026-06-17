import type { Sample, Judge, VersionNote } from '@/types';

export const VERSIONS = ['v2.4.0', 'v2.4.1'] as const;

export const RUN_BY_VERSION: Record<string, string> = {
  'v2.4.0': 'R-2024-0901',
  'v2.4.1': 'R-2024-0908',
};

const img = (prompt: string): string =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
    prompt,
  )}&image_size=square_hd`;

interface EvalEntry {
  version: string;
  pred: Judge;
  conf: number;
  ts: string;
}

interface Physical {
  id: string;
  materialType: string;
  truth: Judge;
  prompt: string;
  evals: EvalEntry[];
}

const PHYS: Physical[] = [
  {
    id: 'S-001', materialType: '铝合金外壳', truth: 'OK',
    prompt: 'macro photo brushed aluminum alloy casing surface clean no defect even grey background industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'OK', conf: 0.97, ts: '2024-09-01T09:02:11' },
      { version: 'v2.4.1', pred: 'OK', conf: 0.98, ts: '2024-09-08T09:01:42' },
    ],
  },
  {
    id: 'S-002', materialType: 'PCB板', truth: 'NG',
    prompt: 'macro photo green PCB circuit board with hairline scratch defect industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'NG', conf: 0.91, ts: '2024-09-01T09:04:03' },
      { version: 'v2.4.1', pred: 'NG', conf: 0.94, ts: '2024-09-08T09:03:19' },
    ],
  },
  {
    id: 'S-003', materialType: '注塑件', truth: 'OK',
    prompt: 'macro photo white plastic injection molded part clean surface industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'OK', conf: 0.95, ts: '2024-09-01T09:05:48' },
      { version: 'v2.4.1', pred: 'OK', conf: 0.96, ts: '2024-09-08T09:04:55' },
    ],
  },
  {
    id: 'S-004', materialType: '金属冲压件', truth: 'NG',
    prompt: 'macro photo stamped metal sheet part with dent defect industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'NG', conf: 0.88, ts: '2024-09-01T09:07:21' },
      { version: 'v2.4.1', pred: 'NG', conf: 0.92, ts: '2024-09-08T09:06:30' },
    ],
  },
  {
    id: 'S-005', materialType: '玻璃面板', truth: 'OK',
    prompt: 'macro photo tempered glass panel clean surface reflective industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'NG', conf: 0.62, ts: '2024-09-01T09:09:12' },
      { version: 'v2.4.1', pred: 'OK', conf: 0.93, ts: '2024-09-08T09:08:05' },
    ],
  },
  {
    id: 'S-006', materialType: '不锈钢件', truth: 'NG',
    prompt: 'macro photo brushed stainless steel part with crack defect industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'NG', conf: 0.9, ts: '2024-09-01T09:11:33' },
      { version: 'v2.4.1', pred: 'NG', conf: 0.95, ts: '2024-09-08T09:10:14' },
    ],
  },
  {
    id: 'S-007', materialType: '铝合金外壳', truth: 'OK',
    prompt: 'macro photo aluminum alloy casing with surface stain industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'NG', conf: 0.58, ts: '2024-09-01T09:13:07' },
      { version: 'v2.4.1', pred: 'NG', conf: 0.61, ts: '2024-09-08T09:12:40' },
    ],
  },
  {
    id: 'S-008', materialType: 'PCB板', truth: 'NG',
    prompt: 'macro photo green PCB circuit board with burr defect industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'OK', conf: 0.55, ts: '2024-09-01T09:15:50' },
      { version: 'v2.4.1', pred: 'NG', conf: 0.89, ts: '2024-09-08T09:14:22' },
    ],
  },
  {
    id: 'S-009', materialType: '注塑件', truth: 'OK',
    prompt: 'macro photo white plastic injection molded part clean no defect industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'OK', conf: 0.96, ts: '2024-09-01T09:17:29' },
      { version: 'v2.4.1', pred: 'OK', conf: 0.97, ts: '2024-09-08T09:16:51' },
    ],
  },
  {
    id: 'S-010', materialType: '金属冲压件', truth: 'NG',
    prompt: 'macro photo stamped metal sheet part with crack defect industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'NG', conf: 0.93, ts: '2024-09-01T09:19:14' },
      { version: 'v2.4.1', pred: 'NG', conf: 0.96, ts: '2024-09-08T09:18:33' },
    ],
  },
  {
    id: 'S-011', materialType: '玻璃面板', truth: 'OK',
    prompt: 'macro photo tempered glass panel clean no defect reflective industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'OK', conf: 0.94, ts: '2024-09-01T09:21:02' },
      { version: 'v2.4.1', pred: 'OK', conf: 0.95, ts: '2024-09-08T09:20:19' },
    ],
  },
  {
    id: 'S-012', materialType: '不锈钢件', truth: 'OK',
    prompt: 'macro photo brushed stainless steel part clean no defect industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'OK', conf: 0.92, ts: '2024-09-01T09:23:41' },
      { version: 'v2.4.1', pred: 'NG', conf: 0.64, ts: '2024-09-08T09:22:08' },
    ],
  },
  {
    id: 'S-013', materialType: '铝合金外壳', truth: 'NG',
    prompt: 'macro photo aluminum alloy casing with dent defect industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'NG', conf: 0.9, ts: '2024-09-01T09:25:18' },
      { version: 'v2.4.1', pred: 'NG', conf: 0.93, ts: '2024-09-08T09:24:36' },
    ],
  },
  {
    id: 'S-014', materialType: 'PCB板', truth: 'OK',
    prompt: 'macro photo green PCB circuit board clean no defect industrial inspection',
    evals: [
      { version: 'v2.4.0', pred: 'OK', conf: 0.97, ts: '2024-09-01T09:27:55' },
      { version: 'v2.4.1', pred: 'OK', conf: 0.98, ts: '2024-09-08T09:26:12' },
    ],
  },
  {
    id: 'S-015', materialType: '注塑件', truth: 'NG',
    prompt: 'macro photo white plastic injection molded part with surface stain defect industrial inspection',
    evals: [{ version: 'v2.4.1', pred: 'NG', conf: 0.91, ts: '2024-09-08T09:28:44' }],
  },
  {
    id: 'S-016', materialType: '金属冲压件', truth: 'OK',
    prompt: 'macro photo stamped metal sheet part clean no defect industrial inspection',
    evals: [{ version: 'v2.4.1', pred: 'OK', conf: 0.96, ts: '2024-09-08T09:30:07' }],
  },
  {
    id: 'S-017', materialType: '玻璃面板', truth: 'NG',
    prompt: 'macro photo tempered glass panel with hairline scratch defect industrial inspection',
    evals: [{ version: 'v2.4.1', pred: 'NG', conf: 0.89, ts: '2024-09-08T09:31:39' }],
  },
  {
    id: 'S-018', materialType: '不锈钢件', truth: 'OK',
    prompt: 'macro photo brushed stainless steel part clean surface industrial inspection',
    evals: [{ version: 'v2.4.1', pred: 'OK', conf: 0.95, ts: '2024-09-08T09:33:15' }],
  },
  {
    id: 'S-019', materialType: '铝合金外壳', truth: 'OK',
    prompt: 'macro photo aluminum alloy casing with burr industrial inspection',
    evals: [{ version: 'v2.4.1', pred: 'NG', conf: 0.6, ts: '2024-09-08T09:34:52' }],
  },
  {
    id: 'S-020', materialType: 'PCB板', truth: 'NG',
    prompt: 'macro photo green PCB circuit board with crack defect industrial inspection',
    evals: [{ version: 'v2.4.1', pred: 'OK', conf: 0.52, ts: '2024-09-08T09:36:28' }],
  },
  {
    id: 'S-021', materialType: '注塑件', truth: 'NG',
    prompt: 'macro photo white plastic injection molded part with dent defect industrial inspection',
    evals: [{ version: 'v2.4.0', pred: 'NG', conf: 0.87, ts: '2024-09-01T09:29:05' }],
  },
  {
    id: 'S-022', materialType: '金属冲压件', truth: 'OK',
    prompt: 'macro photo stamped metal sheet part clean surface industrial inspection',
    evals: [{ version: 'v2.4.0', pred: 'OK', conf: 0.94, ts: '2024-09-01T09:30:48' }],
  },
];

export const SAMPLES: Sample[] = PHYS.flatMap((p) =>
  p.evals.map((e) => ({
    id: p.id,
    materialType: p.materialType,
    imageUrl: img(p.prompt),
    groundTruth: p.truth,
    prediction: e.pred,
    confidence: e.conf,
    timestamp: e.ts,
    runId: RUN_BY_VERSION[e.version],
    version: e.version,
    dupGroup: p.evals.length > 1 ? `DG-${p.id}` : undefined,
  })),
);

export const MATERIAL_TYPES = Array.from(
  new Set(PHYS.map((p) => p.materialType)),
).sort();

export const DEFAULT_VERSION_NOTE: VersionNote = {
  version: 'v2.4.1',
  date: '2024-09-08',
  author: '阿宁',
  summary:
    '候选版本 v2.4.1：修复玻璃面板 S-005 误判与 PCB S-008 漏检；但不锈钢件 S-012 出现回归误判，需重点复核。',
  changedJudgments: [
    { sampleId: 'S-005', from: 'NG', to: 'OK' },
    { sampleId: 'S-008', from: 'OK', to: 'NG' },
    { sampleId: 'S-012', from: 'OK', to: 'NG' },
  ],
};
