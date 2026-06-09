import type { MatrixData, HistoryRecord, MatrixCell } from '@/types';
import { computeRank } from '@/utils/math/rank';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function cell(value: number | null, unit: string, sourceRow: number, extra?: Partial<MatrixCell>): MatrixCell {
  return { value, unit, sourceRow, ...extra };
}

export function sampleMatrix(
  variant: 'rank-deficient' | 'near-singular' | 'clean' = 'rank-deficient'
): MatrixData {
  const now = Date.now();

  if (variant === 'clean') {
    return {
      id: uid(),
      title: '示例 · 满秩设计矩阵（线性无关）',
      rows: 4,
      cols: 3,
      createdAt: now,
      updatedAt: now,
      cells: [
        [cell(1.2, 'mm', 3, { sourceImage: 'fig-2.1.png', sourceNote: '表2 第3行' }),
         cell(0.5, 'mm', 3, { sourceImage: 'fig-2.1.png', sourceNote: '表2 第3行' }),
         cell(3.1, 'mm', 3, { sourceImage: 'fig-2.1.png', sourceNote: '表2 第3行' })],
        [cell(2.0, 'mm', 4, { sourceNote: '表2 第4行' }),
         cell(1.8, 'mm', 4, { sourceNote: '表2 第4行' }),
         cell(0.9, 'mm', 4, { sourceNote: '表2 第4行' })],
        [cell(0.4, 'mm', 5),
         cell(4.2, 'mm', 5),
         cell(2.7, 'mm', 5)],
        [cell(3.3, 'mm', 6, { sourceNote: '草稿页B面' }),
         cell(1.1, 'mm', 6, { sourceNote: '草稿页B面' }),
         cell(5.0, 'mm', 6, { sourceNote: '草稿页B面' })],
      ],
    };
  }

  if (variant === 'near-singular') {
    return {
      id: uid(),
      title: '示例 · 接近奇异矩阵（高共线性）',
      rows: 3,
      cols: 3,
      createdAt: now,
      updatedAt: now,
      cells: [
        [cell(1.0, 'kg/m²', 1, { sourceNote: '原始数据表 A' }),
         cell(2.0, 'kg/m²', 1, { sourceNote: '原始数据表 A' }),
         cell(3.0001, 'kg/m²', 1, { sourceNote: '原始数据表 A' })],
        [cell(4.0, 'kg/m²', 2),
         cell(5.0, 'kg/m²', 2),
         cell(6.0001, 'kg/m²', 2)],
        [cell(7.0, 'kg/m²', 3, { sourceImage: 'scan-007.jpg' }),
         cell(8.0, 'kg/m²', 3, { sourceImage: 'scan-007.jpg' }),
         cell(9.0002, 'kg/m²', 3, { sourceImage: 'scan-007.jpg' })],
      ],
    };
  }

  return {
    id: uid(),
    title: '题目 07 · 截面刚度矩阵退化诊断',
    rows: 4,
    cols: 4,
    createdAt: now,
    updatedAt: now,
    cells: [
      [cell(4.2, 'kN·m', 11, { sourceImage: 'fig-3.1.png', sourceNote: '草稿表 第11行' }),
       cell(1.5, 'kN·m', 11, { sourceImage: 'fig-3.1.png', sourceNote: '草稿表 第11行' }),
       cell(0.8, 'kN·m', 11, { sourceImage: 'fig-3.1.png' }),
       cell(2.1, 'kN·m', 11)],
      [cell(3.0, 'kN·m', 12, { sourceNote: '表B-2 第12行' }),
       cell(1.0, '', 12, { sourceNote: '表B-2 第12行' }),
       cell(0.6, 'kN·m', 12),
       cell(1.5, 'kN·m', 12)],
      [cell(8.4, 'kN·m', 13),
       cell(3.0, 'kN·m', 13),
       cell(1.6, 'kN·m', 13),
       cell(4.2, 'kN·m', 13)],
      [cell(null, 'kN·m', 14, { sourceNote: '原始记录缺失，需核对图片' }),
       cell(0.5, 'kN·m', 14),
       cell(0.3, '', 14),
       cell(0.7, 'kN·m', 14)],
    ],
  };
}

export function historySamples(): HistoryRecord[] {
  const now = Date.now();
  const cases: Array<{ title: string; A: number[][]; deltaDays: number; anom: number; avail: number; pend: number; rec: number }> = [
    {
      title: '题目 05 · 多跨梁刚度矩阵',
      A: [
        [2, 1, 0],
        [1, 2, 1],
        [0, 1, 2],
      ],
      deltaDays: 12,
      anom: 1,
      avail: 3,
      pend: 0,
      rec: 0,
    },
    {
      title: '题目 06 · 节点荷载相关阵',
      A: [
        [1, 2, 3],
        [2, 4, 6],
        [3, 6, 9],
      ],
      deltaDays: 5,
      anom: 3,
      avail: 1,
      pend: 1,
      rec: 1,
    },
    {
      title: '题目 04 · 截面惯性矩矩阵',
      A: [
        [5, 0, 0],
        [0, 3, 0],
        [0, 0, 1],
      ],
      deltaDays: 21,
      anom: 0,
      avail: 3,
      pend: 0,
      rec: 0,
    },
  ];
  return cases.map((c, i) => {
    const rank = computeRank(c.A);
    return {
      id: 'hist-' + i + '-' + uid(),
      matrixId: 'mat-' + i,
      title: c.title,
      timestamp: now - c.deltaDays * 86400000 - i * 3600_000,
      rankResult: rank,
      anomalyCount: c.anom,
      availableCount: c.avail,
      pendingCount: c.pend,
      recollectCount: c.rec,
    };
  });
}
