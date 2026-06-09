import type { DataRow, Draft, ErrorItem, ErrorAction } from '@/types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

interface AnalysisResult {
  action: ErrorAction;
  description: string;
  sourceRef: string;
  relatedRowId?: string;
}

export function analyzeDataRows(rows: DataRow[]): AnalysisResult[] {
  const results: AnalysisResult[] = [];
  const seen = new Map<string, number>();

  rows.forEach((row, idx) => {
    if (row.isEmpty) {
      results.push({
        action: 'fill_material',
        description: `第${row.index}行数据为空值，频谱图出现断点，影响区间 [${Math.max(1, idx - 3)}, ${Math.min(rows.length, idx + 3)}] 的连续性分析`,
        sourceRef: `原始材料-第${Math.ceil(row.index / 10)}页_第${((row.index - 1) % 10) + 1}行`,
        relatedRowId: row.id,
      });
    }

    const key = `${row.xValue}-${row.yValue}`;
    if (!row.isEmpty && row.xValue !== null && row.yValue !== null) {
      if (seen.has(key)) {
        const firstIdx = seen.get(key) as number;
        results.push({
          action: 'fill_material',
          description: `第${row.index}行与第${firstIdx + 1}行数据完全重复（x=${row.xValue}, y=${row.yValue}），可能为录入时误复制`,
          sourceRef: '计算草稿-相邻行数值比对',
          relatedRowId: row.id,
        });
      } else {
        seen.set(key, idx);
      }
    }

    if (row.remark && /评分|补录|补一版/i.test(row.remark)) {
      results.push({
        action: 'adjust_caliber',
        description: `第${row.index}行备注含"${row.remark}"，属于评分修订，需确认评分口径是否一致`,
        sourceRef: `草稿备注-第${row.index}行`,
        relatedRowId: row.id,
      });
    }
  });

  return results;
}

export function analyzeConfig(draft: Draft): AnalysisResult[] {
  const results: AnalysisResult[] = [];
  const { fourierConfig } = draft;
  const nyquist = fourierConfig.sampleRate / 2;

  if (fourierConfig.lowPassCutoff > nyquist * 0.9) {
    results.push({
      action: 'adjust_caliber',
      description: `低通截止频率 ${fourierConfig.lowPassCutoff}Hz 逼近奈奎斯特频率 ${nyquist}Hz，可能出现吉布斯效应或混叠`,
      sourceRef: '公式计算-参数边界校验',
    });
  }

  if (fourierConfig.highPassCutoff >= fourierConfig.lowPassCutoff) {
    results.push({
      action: 'adjust_caliber',
      description: `高通截止(${fourierConfig.highPassCutoff}Hz) ≥ 低通截止(${fourierConfig.lowPassCutoff}Hz)，通带为空，所有信号将被滤除`,
      sourceRef: '公式计算-参数逻辑校验',
    });
  }

  if (fourierConfig.windowSize < 16) {
    results.push({
      action: 'adjust_caliber',
      description: `窗口大小 ${fourierConfig.windowSize} 过小，频率分辨率不足，建议 ≥ 32`,
      sourceRef: '公式计算-窗口参数校验',
    });
  }

  return results;
}

export function analyzeCounterExamples(draft: Draft): AnalysisResult[] {
  const results: AnalysisResult[] = [];
  draft.counterExamples.forEach((ce, idx) => {
    if (ce.passed === false) {
      results.push({
        action: 'adjust_caliber',
        description: `反例 CE-${String(idx + 1).padStart(3, '0')} 未通过：${ce.boundaryCondition}，${ce.actualOutput ?? '结果不符合预期'}`,
        sourceRef: `反例生成器-${ce.boundaryCondition}`,
      });
    }
  });
  return results;
}

export function runFullAnalysis(draft: Draft): ErrorItem[] {
  const all: AnalysisResult[] = [
    ...analyzeDataRows(draft.dataRows),
    ...analyzeConfig(draft),
    ...analyzeCounterExamples(draft),
  ];

  return all.map((a) => ({
    id: uid(),
    draftId: draft.id,
    type: a.action === 'fill_material' ? 'data' : a.description.includes('反例') ? 'counterexample' : 'formula',
    description: a.description,
    action: a.action,
    sourceRef: a.sourceRef,
    relatedRowId: a.relatedRowId,
  }));
}

export function summarizeAvailability(rows: DataRow[]) {
  const available = rows.filter((r) => r.availability === 'available').length;
  const pending = rows.filter((r) => r.availability === 'pending').length;
  const recollect = rows.filter((r) => r.availability === 'recollect').length;
  const unmarked = rows.filter((r) => r.availability === null).length;
  const total = rows.length;
  return {
    available,
    pending,
    recollect,
    unmarked,
    total,
    availablePct: total > 0 ? Math.round((available / total) * 100) : 0,
    pendingPct: total > 0 ? Math.round((pending / total) * 100) : 0,
    recollectPct: total > 0 ? Math.round((recollect / total) * 100) : 0,
  };
}
