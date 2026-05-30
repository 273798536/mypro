import * as XLSX from 'xlsx';
import {
  Judge,
  Supplier,
  ScoreCategory,
  Score,
  ReviewLog,
  CalculationResult,
  ConsistencyResult,
  SensitivityResult,
} from '../types';

export interface ExportData {
  judges: Judge[];
  suppliers: Supplier[];
  categories: ScoreCategory[];
  scores: Score[];
  reviewLogs: ReviewLog[];
  calculationResults: CalculationResult[];
  consistencyResults: ConsistencyResult | null;
  sensitivityResults: SensitivityResult | null;
}

export function exportToExcel(data: ExportData): void {
  const wb = XLSX.utils.book_new();

  const judgeData = data.judges.map((j) => ({
    '评委ID': j.id,
    '评委姓名': j.name,
    '评委角色': j.role,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(judgeData), '评委信息');

  const supplierData = data.suppliers.map((s) => ({
    '供应商ID': s.id,
    '供应商名称': s.name,
    '联系方式': s.contact,
    '所属类别': s.category,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supplierData), '供应商信息');

  const categoryData = data.categories.map((c) => ({
    '评分项ID': c.id,
    '评分项名称': c.name,
    '原始权重': c.weight,
    '单位': c.unit,
    '评分范围': `${c.range[0]}-${c.range[1]}`,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categoryData), '权重配置');

  const scoreData = data.scores.map((s) => {
    const judge = data.judges.find((j) => j.id === s.judgeId);
    const supplier = data.suppliers.find((sup) => sup.id === s.supplierId);
    const category = data.categories.find((c) => c.id === s.categoryId);
    return {
      '评委ID': s.judgeId,
      '评委姓名': judge?.name || '',
      '供应商ID': s.supplierId,
      '供应商名称': supplier?.name || '',
      '评分项ID': s.categoryId,
      '评分项名称': category?.name || '',
      '分值': s.value ?? '缺项',
      '打分时间': s.timestamp,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scoreData), '评委打分');

  const reviewData = data.reviewLogs.map((r) => {
    const judge = data.judges.find((j) => j.id === r.judgeId);
    const supplier = data.suppliers.find((s) => s.id === r.supplierId);
    return {
      '记录ID': r.id,
      '记录类型': r.type === 'appeal' ? '申诉' : r.type === 'correction' ? '修正' : '核验',
      '内容': r.content,
      '关联评委': judge?.name || '',
      '关联供应商': supplier?.name || '',
      '状态': r.status === 'pending' ? '待处理' : r.status === 'resolved' ? '已解决' : '已驳回',
      '时间': r.timestamp,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reviewData), '复议记录');

  if (data.calculationResults.length > 0) {
    const resultData = data.calculationResults.map((r) => {
      const supplier = data.suppliers.find((s) => s.id === r.supplierId);
      const row: Record<string, any> = {
        '排名': r.rank,
        '供应商ID': r.supplierId,
        '供应商名称': supplier?.name || '',
        '最终得分': r.totalScore.toFixed(4),
      };
      r.weightedScores.forEach((ws) => {
        const category = data.categories.find((c) => c.id === ws.categoryId);
        row[`${category?.name || ws.categoryId}_平均分`] = ws.score.toFixed(2);
        row[`${category?.name || ws.categoryId}_原始权重`] = ws.weight;
        row[`${category?.name || ws.categoryId}_归一化权重`] = ws.normalizedWeight.toFixed(4);
        row[`${category?.name || ws.categoryId}_加权得分`] = (ws.score * ws.normalizedWeight).toFixed(4);
      });
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resultData), '评分结果');
  }

  if (data.consistencyResults) {
    const consistencyData = [
      {
        '检验项目': '权重归一化检查',
        '单位': '-',
        '检验结果': data.consistencyResults.weightNormalization.isNormalized ? '通过' : '警告',
        '适用范围': data.consistencyResults.weightNormalization.scope,
        '失败原因/说明': data.consistencyResults.weightNormalization.reason,
        '数值': data.consistencyResults.weightNormalization.originalSum.toFixed(4),
      },
      {
        '检验项目': '打分缺项检查',
        '单位': '项',
        '检验结果': data.consistencyResults.missingScores.count === 0 ? '通过' : '警告',
        '适用范围': data.consistencyResults.missingScores.scope,
        '失败原因/说明': data.consistencyResults.missingScores.reason,
        '数值': data.consistencyResults.missingScores.count,
      },
      {
        '检验项目': "Cronbach's α系数",
        '单位': '-',
        '检验结果': data.consistencyResults.cronbachAlphaStatus === 'pass' ? '通过' : data.consistencyResults.cronbachAlphaStatus === 'warning' ? '警告' : '不通过',
        '适用范围': data.consistencyResults.cronbachAlphaScope,
        '失败原因/说明': data.consistencyResults.cronbachAlphaReason,
        '数值': data.consistencyResults.cronbachAlpha.toFixed(4),
      },
      {
        '检验项目': 'Kendall协同系数',
        '单位': '-',
        '检验结果': data.consistencyResults.kendallStatus === 'pass' ? '通过' : data.consistencyResults.kendallStatus === 'warning' ? '警告' : '不通过',
        '适用范围': data.consistencyResults.kendallScope,
        '失败原因/说明': data.consistencyResults.kendallReason,
        '数值': data.consistencyResults.kendallCoefficient.toFixed(4),
      },
      {
        '检验项目': '极端评委检测',
        '单位': '人',
        '检验结果': data.consistencyResults.extremeJudges.length === 0 ? '通过' : '警告',
        '适用范围': '基于Z-score检测偏离均值超过2.5σ的评委，用于发现评分标准明显不同的评委',
        '失败原因/说明': data.consistencyResults.extremeJudges.length === 0 ? '未发现极端评委' : data.consistencyResults.extremeJudges.map((id) => {
          const judge = data.judges.find((j) => j.id === id);
          return judge?.name || id;
        }).join('、') + ' 被判定为极端评委',
        '数值': data.consistencyResults.extremeJudges.length,
      },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consistencyData), '一致性检验');

    if (data.consistencyResults.extremeJudges.length > 0) {
      const extremeDetails = data.consistencyResults.extremeJudges.map((id) => {
        const judge = data.judges.find((j) => j.id === id);
        return {
          '评委ID': id,
          '评委姓名': judge?.name || '',
          '极端原因': data.consistencyResults?.extremeReasons[id] || '',
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(extremeDetails), '极端评委详情');
    }
  }

  if (data.sensitivityResults) {
    const impactData = data.sensitivityResults.weightImpact.map((w) => ({
      '评分项ID': w.categoryId,
      '评分项名称': w.categoryName,
      '权重变动': `+${(w.change * 100).toFixed(0)}%`,
      '总分影响程度': w.impact.toFixed(4),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(impactData), '权重敏感性');

    const volatilityData = data.sensitivityResults.scoreVolatility.map((v) => ({
      '供应商ID': v.supplierId,
      '供应商名称': v.supplierName,
      '标准差': v.standardDeviation.toFixed(4),
      '变异系数': v.volatility.toFixed(4),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(volatilityData), '评分波动性');
  }

  XLSX.writeFile(wb, `矩阵评分分析报告_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToJSON(data: ExportData): void {
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `矩阵评分分析数据_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJSON(file: File): Promise<Partial<ExportData>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function importFromExcel(file: File): Promise<Partial<ExportData>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const result: Partial<ExportData> = {};

        const judgeSheet = wb.Sheets['评委信息'];
        if (judgeSheet) {
          const judgeData = XLSX.utils.sheet_to_json(judgeSheet);
          result.judges = judgeData.map((d: any) => ({
            id: d['评委ID']?.toString() || '',
            name: d['评委姓名']?.toString() || '',
            role: d['评委角色']?.toString() || '',
          }));
        }

        const supplierSheet = wb.Sheets['供应商信息'];
        if (supplierSheet) {
          const supplierData = XLSX.utils.sheet_to_json(supplierSheet);
          result.suppliers = supplierData.map((d: any) => ({
            id: d['供应商ID']?.toString() || '',
            name: d['供应商名称']?.toString() || '',
            contact: d['联系方式']?.toString() || '',
            category: d['所属类别']?.toString() || '',
          }));
        }

        const categorySheet = wb.Sheets['权重配置'];
        if (categorySheet) {
          const categoryData = XLSX.utils.sheet_to_json(categorySheet);
          result.categories = categoryData.map((d: any) => ({
            id: d['评分项ID']?.toString() || '',
            name: d['评分项名称']?.toString() || '',
            weight: parseFloat(d['原始权重']) || 0,
            unit: d['单位']?.toString() || '分',
            range: [0, 100] as [number, number],
          }));
        }

        const scoreSheet = wb.Sheets['评委打分'];
        if (scoreSheet) {
          const scoreData = XLSX.utils.sheet_to_json(scoreSheet);
          result.scores = scoreData.map((d: any) => ({
            judgeId: d['评委ID']?.toString() || '',
            supplierId: d['供应商ID']?.toString() || '',
            categoryId: d['评分项ID']?.toString() || '',
            value: d['分值'] === '缺项' ? null : parseFloat(d['分值']),
            timestamp: d['打分时间']?.toString() || new Date().toISOString(),
          }));
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
