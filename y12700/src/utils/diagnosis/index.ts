import type {
  MatrixData,
  AnomalyItem,
  RowAvailability,
  DataAvailability,
  RankResult,
} from '@/types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function detectAnomalies(matrix: MatrixData, rankResult: RankResult | null): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];

  for (let r = 0; r < matrix.rows; r++) {
    for (let c = 0; c < matrix.cols; c++) {
      const cell = matrix.cells[r][c];
      if (cell.value === null || Number.isNaN(cell.value)) {
        anomalies.push({
          id: uid(),
          type: 'value_invalid',
          severity: 'error',
          cellRef: { row: r, col: c },
          message: `第 ${r + 1} 行 第 ${c + 1} 列 数值为空或无效`,
          suggestion: 'recollect',
          suggestionText: '原始数值缺失，需重新采集该数据点',
        });
      } else if (cell.unit.trim() === '') {
        anomalies.push({
          id: uid(),
          type: 'unit_missing',
          severity: 'warning',
          cellRef: { row: r, col: c },
          message: `第 ${r + 1} 行 第 ${c + 1} 列 单位缺失`,
          suggestion: 'fill_material',
          suggestionText: '数值本身有效但缺少单位说明，请补充来源材料中的单位信息或统一口径',
        });
      }
    }
  }

  if (rankResult) {
    if (rankResult.conditionNumber > 1e8 && isFinite(rankResult.conditionNumber)) {
      anomalies.push({
        id: uid(),
        type: 'near_singular',
        severity: rankResult.conditionNumber > 1e12 ? 'error' : 'warning',
        message: `矩阵条件数 ${rankResult.conditionNumber.toExponential(2)} 较大，接近奇异`,
        suggestion: 'adjust_caliber',
        suggestionText: '数据线性相关性过强，建议检查指标口径是否重复或调整变量选取',
      });
    }
    if (!isFinite(rankResult.conditionNumber) || rankResult.errorEstimate > 0.1) {
      anomalies.push({
        id: uid(),
        type: 'large_error',
        severity: 'error',
        message: `数值误差估计超过 10%，秩结果可信度低`,
        suggestion: 'recollect',
        suggestionText: '计算结果受舍入误差影响严重，需重新采集更高精度的原始数据',
      });
    } else if (rankResult.errorEstimate > 1e-4) {
      anomalies.push({
        id: uid(),
        type: 'large_error',
        severity: 'warning',
        message: `数值误差估计约 ${rankResult.errorEstimate.toExponential(2)}，需留意`,
        suggestion: 'review',
        suggestionText: '请投研助理复核误差对结论的影响，必要时提高数据精度',
      });
    }
  }

  return anomalies;
}

export function computeRowAvailability(
  matrix: MatrixData,
  anomalies: AnomalyItem[]
): RowAvailability[] {
  const result: RowAvailability[] = [];

  for (let r = 0; r < matrix.rows; r++) {
    let availability: DataAvailability = 'available';
    const reasons: string[] = [];
    let hasError = false;
    let hasWarn = false;

    for (let c = 0; c < matrix.cols; c++) {
      const cell = matrix.cells[r][c];
      if (cell.value === null || Number.isNaN(cell.value)) {
        hasError = true;
        reasons.push(`第 ${c + 1} 列数值无效`);
      } else if (cell.unit.trim() === '') {
        hasWarn = true;
        reasons.push(`第 ${c + 1} 列单位缺失`);
      }
    }

    const rowAnoms = anomalies.filter(a => a.cellRef?.row === r);
    if (rowAnoms.some(a => a.severity === 'error')) hasError = true;
    if (rowAnoms.some(a => a.severity === 'warning')) hasWarn = true;

    if (hasError) availability = 'recollect';
    else if (hasWarn) availability = 'pending';

    result.push({
      rowIndex: r,
      availability,
      reason: reasons.length
        ? reasons.join('；')
        : availability === 'available'
        ? '数据完整可直接使用'
        : '请复核该数据',
    });
  }

  return result;
}

export const AVAILABILITY_META: Record<
  DataAvailability,
  { label: string; short: string; color: string; bg: string; border: string; dot: string; icon: string }
> = {
  available: {
    label: '可直接使用',
    short: '可用',
    color: 'text-forest-700',
    bg: 'bg-forest-50',
    border: 'border-forest-200',
    dot: 'bg-forest-500',
    icon: 'check-circle',
  },
  pending: {
    label: '需投研复核',
    short: '暂缓',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    icon: 'clock',
  },
  recollect: {
    label: '需重新采集',
    short: '重采',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    icon: 'alert-triangle',
  },
};

export const SUGGESTION_LABEL: Record<AnomalyItem['suggestion'], string> = {
  fill_material: '补材料',
  adjust_caliber: '改口径',
  recollect: '重新采集',
  review: '人工复核',
};
