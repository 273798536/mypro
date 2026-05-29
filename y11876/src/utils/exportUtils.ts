import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import {
  AnalysisResult,
  RawDataRow,
  CalibratedRow,
  AnomalyItem,
  GROUP_LABELS,
  ANOMALY_TYPE_LABELS,
} from '@/types';

const addBOM = (content: string): string => {
  return '\ufeff' + content;
};

export const exportCalibratedResults = (result: AnalysisResult): void => {
  const headers = [
    '行号',
    '品类',
    '日期',
    '原始预测值',
    '原始预测下限',
    '原始预测上限',
    '校准后预测下限',
    '校准后预测上限',
    '真实销量',
    '是否促销',
    '分组类型',
    '原始区间是否覆盖',
    '校准后区间是否覆盖',
    '备注',
  ];

  const rows = result.calibratedRows.map((calibrated: CalibratedRow) => {
    const row = calibrated.originalRow;
    return [
      row.rowNumber,
      row.category,
      row.date,
      row.forecast,
      row.lowerBound,
      row.upperBound,
      calibrated.calibratedLower.toFixed(2),
      calibrated.calibratedUpper.toFixed(2),
      row.actual,
      row.isPromotion ? '是' : '否',
      GROUP_LABELS[calibrated.group],
      calibrated.isCoveredOriginal ? '是' : '否',
      calibrated.isCoveredCalibrated ? '是' : '否',
      row.remark,
    ];
  });

  const csv = Papa.unparse({ fields: headers, data: rows });
  const blob = new Blob([addBOM(csv)], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `校准结果_${formatDateForFilename()}.csv`);
};

export const exportDirtyRows = (dirtyRows: RawDataRow[]): void => {
  const headers = [
    '行号',
    '品类',
    '日期',
    '预测值',
    '预测下限',
    '预测上限',
    '真实销量',
    '是否促销',
    '错误类型',
    '错误信息',
    '备注',
  ];

  const rows = dirtyRows.map(row => [
    row.rowNumber,
    row.category,
    row.date,
    row.forecast,
    row.lowerBound,
    row.upperBound,
    row.actual,
    row.isPromotion ? '是' : '否',
    row._errors.map(e => e.type).join('; '),
    row._errors.map(e => e.message).join('; '),
    row.remark,
  ]);

  const csv = Papa.unparse({ fields: headers, data: rows });
  const blob = new Blob([addBOM(csv)], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `脏数据清单_${formatDateForFilename()}.csv`);
};

export const exportAnomalies = (anomalies: AnomalyItem[]): void => {
  const headers = [
    '异常ID',
    '异常类型',
    '严重程度',
    '品类',
    '描述',
    '行号',
    '预测值',
    '真实值',
    '预测下限',
    '预测上限',
  ];

  const rows = anomalies.map(anomaly => [
    anomaly.id,
    ANOMALY_TYPE_LABELS[anomaly.type],
    anomaly.severity === 'high' ? '高' : anomaly.severity === 'medium' ? '中' : '低',
    anomaly.category,
    anomaly.description,
    anomaly.rowData.rowNumber,
    anomaly.rowData.forecast,
    anomaly.rowData.actual,
    anomaly.rowData.lowerBound,
    anomaly.rowData.upperBound,
  ]);

  const csv = Papa.unparse({ fields: headers, data: rows });
  const blob = new Blob([addBOM(csv)], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `异常清单_${formatDateForFilename()}.csv`);
};

export const exportCategoryResults = (result: AnalysisResult): void => {
  const headers = [
    '品类',
    '分组类型',
    '样本总数',
    '有效样本数',
    '覆盖率',
    '平均预测值',
    '平均真实销量',
    '平均区间宽度',
    '低估次数',
    '高估次数',
    '中位数销量',
  ];

  const categoryGroups = new Map<string, string>();
  result.groupResults.forEach(g => {
    g.categories.forEach(cat => categoryGroups.set(cat, GROUP_LABELS[g.group]));
  });

  const rows = result.categoryResults.map(cat => [
    cat.category,
    categoryGroups.get(cat.category) || '未分组',
    cat.sampleSize,
    cat.validSampleSize,
    `${(cat.coverage * 100).toFixed(1)}%`,
    cat.avgForecast.toFixed(2),
    cat.avgActual.toFixed(2),
    cat.avgIntervalWidth.toFixed(2),
    cat.underCoverageCount,
    cat.overCoverageCount,
    cat.medianSales,
  ]);

  const csv = Papa.unparse({ fields: headers, data: rows });
  const blob = new Blob([addBOM(csv)], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `分品类分析结果_${formatDateForFilename()}.csv`);
};

export const exportSummaryReport = (result: AnalysisResult): void => {
  const html = generateHTMLReport(result);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  saveAs(blob, `分析报告_${formatDateForFilename()}.html`);
};

const formatDateForFilename = (): string => {
  const now = new Date();
  return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
};

const generateHTMLReport = (result: AnalysisResult): string => {
  const coveragePercent = (result.overallCoverage * 100).toFixed(1);
  const calibratedPercent = (result.overallCalibratedCoverage * 100).toFixed(1);
  const targetPercent = (result.targetCoverage * 100).toFixed(1);

  const anomalyCounts = {
    promotion: result.anomalies.filter(a => a.type === 'promotion').length,
    low_sample: result.anomalies.filter(a => a.type === 'low_sample').length,
    under_coverage: result.anomalies.filter(a => a.type === 'under_coverage').length,
    bad_forecast: result.anomalies.filter(a => a.type === 'bad_forecast').length,
    logic_error: result.anomalies.filter(a => a.type === 'logic_error').length,
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>销量预测区间校准分析报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 48px; }
    h1 { font-size: 32px; font-weight: 700; color: #0f3460; margin-bottom: 8px; }
    .subtitle { color: #64748b; margin-bottom: 32px; }
    .section { margin-bottom: 40px; }
    .section-title { font-size: 20px; font-weight: 600; color: #0f3460; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .stat-card { background: #f8fafc; border-radius: 12px; padding: 20px; }
    .stat-label { font-size: 14px; color: #64748b; margin-bottom: 8px; }
    .stat-value { font-size: 28px; font-weight: 700; color: #0f3460; }
    .stat-value.good { color: #16c79a; }
    .stat-value.bad { color: #e94560; }
    .coverage-bar { height: 24px; background: #e2e8f0; border-radius: 12px; overflow: hidden; margin-top: 8px; position: relative; }
    .coverage-fill { height: 100%; background: linear-gradient(90deg, #0f3460, #1a4b7f); transition: width 0.5s; }
    .coverage-target { position: absolute; top: 0; bottom: 0; width: 2px; background: #e94560; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { text-align: left; padding: 12px; background: #f1f5f9; font-weight: 600; font-size: 14px; color: #475569; }
    td { padding: 12px; border-top: 1px solid #e2e8f0; font-size: 14px; }
    .tag { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .tag-hot { background: #fef2f2; color: #dc2626; }
    .tag-normal { background: #eff6ff; color: #2563eb; }
    .tag-cold { background: #f8fafc; color: #64748b; }
    .tag-danger { background: #fef2f2; color: #dc2626; }
    .tag-warning { background: #fefce8; color: #ca8a04; }
    .tag-info { background: #eff6ff; color: #2563eb; }
    .anomaly-item { padding: 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 8px; }
    .anomaly-title { font-weight: 600; color: #dc2626; margin-bottom: 4px; }
    .anomaly-desc { font-size: 14px; color: #475569; }
    .footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>销量预测区间校准分析报告</h1>
    <p class="subtitle">生成时间：${result.processedAt.toLocaleString('zh-CN')}</p>

    <div class="section">
      <h2 class="section-title">整体概览</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">总数据量</div>
          <div class="stat-value">${result.totalRows} 行</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">有效数据</div>
          <div class="stat-value">${result.validRowCount} 行</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">脏数据</div>
          <div class="stat-value ${result.dirtyRowCount > 0 ? 'bad' : ''}">${result.dirtyRowCount} 行</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">原始覆盖率</div>
          <div class="stat-value ${result.overallCoverage >= result.targetCoverage ? 'good' : 'bad'}">${coveragePercent}%</div>
          <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${coveragePercent}%"></div>
            <div class="coverage-target" style="left: ${targetPercent}%"></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">目标覆盖率</div>
          <div class="stat-value">${targetPercent}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">校准后覆盖率</div>
          <div class="stat-value ${result.overallCalibratedCoverage >= result.targetCoverage ? 'good' : 'bad'}">${calibratedPercent}%</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">分组分析结果</h2>
      <table>
        <thead>
          <tr>
            <th>分组</th>
            <th>品类数</th>
            <th>样本量</th>
            <th>原始覆盖率</th>
            <th>校准后覆盖率</th>
            <th>校准系数</th>
            <th>平均低估比例</th>
          </tr>
        </thead>
        <tbody>
          ${result.groupResults.map(g => `
            <tr>
              <td><span class="tag tag-${g.group}">${GROUP_LABELS[g.group]}</span></td>
              <td>${g.categories.length} 个</td>
              <td>${g.sampleSize}</td>
              <td>${(g.originalCoverage * 100).toFixed(1)}%</td>
              <td>${(g.calibratedCoverage * 100).toFixed(1)}%</td>
              <td>${g.calibrationFactor.toFixed(2)}</td>
              <td>${(g.avgUnderEstimation * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">异常统计</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">促销异常</div>
          <div class="stat-value"><span class="tag tag-warning">${anomalyCounts.promotion}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">样本过少</div>
          <div class="stat-value"><span class="tag tag-info">${anomalyCounts.low_sample}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">覆盖不足</div>
          <div class="stat-value"><span class="tag tag-danger">${anomalyCounts.under_coverage}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">明显坏值</div>
          <div class="stat-value"><span class="tag tag-danger">${anomalyCounts.bad_forecast}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">逻辑错误</div>
          <div class="stat-value"><span class="tag tag-danger">${anomalyCounts.logic_error}</span></div>
        </div>
      </div>
    </div>

    ${result.badExamples.length > 0 ? `
    <div class="section">
      <h2 class="section-title">严重坏值样例</h2>
      ${result.badExamples.slice(0, 5).map(ex => `
        <div class="anomaly-item">
          <div class="anomaly-title">${ex.category} - 偏差 ${(ex.deviationPercent * 100).toFixed(0)}%</div>
          <div class="anomaly-desc">${ex.reason}</div>
          <div class="anomaly-desc" style="margin-top: 8px;">
            预测: ${ex.forecast} | 真实: ${ex.actual} | 区间: [${ex.lowerBound}, ${ex.upperBound}]
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">校准系数</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">热门品类收缩系数</div>
          <div class="stat-value">${result.calibrationCoefficients.hotShrinkFactor.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">冷门品类扩展系数</div>
          <div class="stat-value">${result.calibrationCoefficients.coldExpandFactor.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">普通品类调整系数</div>
          <div class="stat-value">${result.calibrationCoefficients.normalAdjustFactor.toFixed(2)}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      本报告由收益预测区间校准工具自动生成 | 如需调整参数请重新运行分析
    </div>
  </div>
</body>
</html>`;
};

export const exportAll = (result: AnalysisResult): void => {
  exportCalibratedResults(result);
  setTimeout(() => exportDirtyRows(result.dirtyRows), 500);
  setTimeout(() => exportAnomalies(result.anomalies), 1000);
  setTimeout(() => exportCategoryResults(result), 1500);
  setTimeout(() => exportSummaryReport(result), 2000);
};
