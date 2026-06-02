import {
  PredictionResult,
  ChurnReport,
  StrategyComparisonResult,
  ReportConfig,
  MemberStatus,
} from '../types';
import { MarkovChain } from '../core/markov-chain';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class ReportGenerator {
  private markovChain: MarkovChain;
  private reportDir: string;
  private version: string;
  private source: string;

  constructor(
    markovChain: MarkovChain,
    reportDir?: string,
    version: string = '1.0.0',
    source: string = 'report-generator'
  ) {
    this.markovChain = markovChain;
    this.reportDir = reportDir || path.join(process.cwd(), 'reports');
    this.version = version;
    this.source = source;
    this.ensureReportDir();
  }

  private ensureReportDir(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  generateReport(
    prediction: PredictionResult,
    strategyComparison: StrategyComparisonResult[],
    config: ReportConfig
  ): ChurnReport {
    const states = this.markovChain.getStates();
    const steadyState = this.markovChain.calculateSteadyState(prediction.transitionMatrix.matrix);
    const meanTimeToChurn = this.markovChain.calculateMeanTimeToChurn(prediction.transitionMatrix.matrix);

    const churnedIdx = states.indexOf('churned');
    const currentChurnRate = prediction.distributionHistory[0][churnedIdx];
    const predictedChurnRate = prediction.churnProbability[prediction.churnProbability.length - 1];

    const bestStrategy = strategyComparison.length > 0
      ? strategyComparison.reduce((best, curr) => curr.roi > best.roi ? curr : best, strategyComparison[0])
      : null;

    const recommendations = this.generateRecommendations(
      prediction,
      strategyComparison,
      steadyState
    );

    const report: ChurnReport = {
      id: uuidv4(),
      title: config.title,
      generatedAt: new Date().toISOString(),
      predictionId: prediction.id,
      summary: {
        currentChurnRate,
        predictedChurnRate,
        bestStrategyId: bestStrategy?.strategyId || '',
        expectedRetentionLift: bestStrategy?.liftPercentage || 0,
      },
      markovAnalysis: {
        transitionMatrix: prediction.transitionMatrix,
        steadyStateDistribution: steadyState,
        meanTimeToChurn,
      },
      strategyComparison,
      recommendations,
      version: this.version,
      source: this.source,
    };

    this.saveReport(report, config);

    return report;
  }

  private generateRecommendations(
    prediction: PredictionResult,
    strategyComparison: StrategyComparisonResult[],
    steadyState: number[]
  ): string[] {
    const recommendations: string[] = [];
    const states = this.markovChain.getStates();
    const silentIdx = states.indexOf('silent');
    const churnedIdx = states.indexOf('churned');

    if (steadyState[churnedIdx] > 0.3) {
      recommendations.push(
        `稳态流失率较高 (${(steadyState[churnedIdx] * 100).toFixed(1)}%)，建议立即采取干预措施`
      );
    }

    if (steadyState[silentIdx] > 0.2) {
      recommendations.push(
        `沉默用户比例较高 (${(steadyState[silentIdx] * 100).toFixed(1)}%)，建议加强沉默用户唤醒策略`
      );
    }

    const topStrategies = strategyComparison.slice(0, 3);
    topStrategies.forEach((strategy, idx) => {
      if (strategy.roi > 1) {
        recommendations.push(
          `策略「${strategy.strategyName}」ROI 为 ${strategy.roi.toFixed(2)}，预计提升留存 ${strategy.liftPercentage.toFixed(1)}%，建议优先实施`
        );
      }
    });

    if (strategyComparison.every(s => s.roi < 1)) {
      recommendations.push(
        '当前所有策略 ROI 均低于 1，建议重新评估策略成本或优化触达内容'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('当前模型健康，继续监控关键指标');
    }

    return recommendations;
  }

  private saveReport(report: ChurnReport, config: ReportConfig): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `churn_report_${report.id}_${timestamp}`;

    if (config.format === 'json' || config.includeRawData) {
      const jsonPath = path.join(this.reportDir, `${baseFilename}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    }

    if (config.format === 'html') {
      const htmlPath = path.join(this.reportDir, `${baseFilename}.html`);
      const htmlContent = this.generateHtmlReport(report, config);
      fs.writeFileSync(htmlPath, htmlContent);
    }

    const historyPath = path.join(this.reportDir, 'report-history.json');
    let history: Array<{ id: string; title: string; generatedAt: string; format: string }> = [];

    if (fs.existsSync(historyPath)) {
      try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      } catch {
        history = [];
      }
    }

    history.push({
      id: report.id,
      title: report.title,
      generatedAt: report.generatedAt,
      format: config.format,
    });

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  }

  private generateHtmlReport(report: ChurnReport, config: ReportConfig): string {
    const states = this.markovChain.getStates();
    const matrix = report.markovAnalysis.transitionMatrix.matrix;

    const matrixHtml = this.generateMatrixTable(matrix, states);
    const comparisonHtml = this.generateComparisonTable(report.strategyComparison);

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #f5f7fa; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; }
        .header h1 { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .content { padding: 40px; }
        .section { margin-bottom: 40px; }
        .section h2 { font-size: 20px; font-weight: 600; margin-bottom: 20px; color: #1a202c; display: flex; align-items: center; }
        .section h2::before { content: ''; width: 4px; height: 20px; background: #667eea; margin-right: 12px; border-radius: 2px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f7fafc; border-radius: 8px; padding: 20px; border-left: 4px solid #667eea; }
        .summary-card .label { font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .summary-card .value { font-size: 28px; font-weight: 700; color: #2d3748; }
        .summary-card .value.positive { color: #38a169; }
        .summary-card .value.negative { color: #e53e3e; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f7fafc; font-weight: 600; color: #4a5568; font-size: 13px; }
        td { font-size: 14px; color: #2d3748; }
        tr:hover td { background: #f7fafc; }
        .matrix-table { font-family: 'SF Mono', Monaco, monospace; font-size: 13px; }
        .matrix-table th, .matrix-table td { text-align: center; padding: 10px; }
        .high-prob { background: #c6f6d5; color: #22543d; }
        .med-prob { background: #feebc8; color: #744210; }
        .low-prob { background: #fed7d7; color: #742a2a; }
        .recommendations { list-style: none; }
        .recommendations li { padding: 16px; background: #ebf8ff; border-left: 4px solid #4299e1; margin-bottom: 12px; border-radius: 4px; font-size: 14px; line-height: 1.6; }
        .metadata { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #a0aec0; }
        .metadata span { margin-right: 20px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .badge-success { background: #c6f6d5; color: #22543d; }
        .badge-warning { background: #feebc8; color: #744210; }
        .badge-error { background: #fed7d7; color: #742a2a; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${report.title}</h1>
            <p>生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')} | 报告ID: ${report.id.substring(0, 8)}...</p>
        </div>
        <div class="content">
            <div class="section">
                <h2>执行摘要</h2>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="label">当前流失率</div>
                        <div class="value negative">${(report.summary.currentChurnRate * 100).toFixed(1)}%</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">预测流失率</div>
                        <div class="value negative">${(report.summary.predictedChurnRate * 100).toFixed(1)}%</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">平均流失周期</div>
                        <div class="value">${report.markovAnalysis.meanTimeToChurn.toFixed(1)} 天</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">预期留存提升</div>
                        <div class="value positive">+${report.summary.expectedRetentionLift.toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>马尔可夫转移矩阵</h2>
                <p style="margin-bottom: 16px; color: #718096; font-size: 14px;">样本量: ${report.markovAnalysis.transitionMatrix.sampleSize} | 计算时间: ${new Date(report.markovAnalysis.transitionMatrix.calculatedAt).toLocaleString('zh-CN')}</p>
                ${matrixHtml}
            </div>

            <div class="section">
                <h2>稳态分布</h2>
                <div class="summary-grid">
                    ${report.markovAnalysis.steadyStateDistribution.map((prob, i) => `
                    <div class="summary-card">
                        <div class="label">${this.getStatusLabel(states[i])}</div>
                        <div class="value">${(prob * 100).toFixed(1)}%</div>
                    </div>
                    `).join('')}
                </div>
            </div>

            <div class="section">
                <h2>策略比较分析</h2>
                ${comparisonHtml}
            </div>

            <div class="section">
                <h2>优化建议</h2>
                <ul class="recommendations">
                    ${report.recommendations.map(r => `<li>📌 ${r}</li>`).join('')}
                </ul>
            </div>

            <div class="metadata">
                <span><strong>版本:</strong> ${report.version}</span>
                <span><strong>来源:</strong> ${report.source}</span>
                <span><strong>预测ID:</strong> ${report.predictionId}</span>
                <span><strong>随机种子:</strong> ${report.markovAnalysis.transitionMatrix.seed}</span>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private generateMatrixTable(matrix: number[][], states: MemberStatus[]): string {
    const getProbClass = (prob: number): string => {
      if (prob >= 0.5) return 'high-prob';
      if (prob >= 0.2) return 'med-prob';
      return 'low-prob';
    };

    return `
    <table class="matrix-table">
        <thead>
            <tr>
                <th>从 ↓ / 到 →</th>
                ${states.map(s => `<th>${this.getStatusLabel(s)}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${matrix.map((row, i) => `
            <tr>
                <th>${this.getStatusLabel(states[i])}</th>
                ${row.map(p => `<td class="${getProbClass(p)}">${(p * 100).toFixed(1)}%</td>`).join('')}
            </tr>
            `).join('')}
        </tbody>
    </table>`;
  }

  private generateComparisonTable(comparison: StrategyComparisonResult[]): string {
    if (comparison.length === 0) {
      return '<p style="color: #718096;">暂无策略比较数据</p>';
    }

    const getRoiBadge = (roi: number): string => {
      if (roi >= 2) return '<span class="badge badge-success">优秀</span>';
      if (roi >= 1) return '<span class="badge badge-success">良好</span>';
      if (roi >= 0) return '<span class="badge badge-warning">一般</span>';
      return '<span class="badge badge-error">亏损</span>';
    };

    return `
    <table>
        <thead>
            <tr>
                <th>排名</th>
                <th>策略名称</th>
                <th>基准留存</th>
                <th>优化后留存</th>
                <th>提升幅度</th>
                <th>预计LTV增益</th>
                <th>触达次数</th>
                <th>预计成本</th>
                <th>ROI</th>
                <th>评级</th>
            </tr>
        </thead>
        <tbody>
            ${comparison.map((s, idx) => `
            <tr>
                <td><strong>${idx + 1}</strong></td>
                <td>${s.strategyName}</td>
                <td>${(s.baselineRetention * 100).toFixed(1)}%</td>
                <td><strong>${(s.improvedRetention * 100).toFixed(1)}%</strong></td>
                <td style="color: #38a169;">+${s.liftPercentage.toFixed(1)}%</td>
                <td>¥${s.estimatedLtvGain.toLocaleString()}</td>
                <td>${s.touchCount.toLocaleString()}</td>
                <td>¥${s.costEstimate.toLocaleString()}</td>
                <td><strong>${s.roi.toFixed(2)}</strong></td>
                <td>${getRoiBadge(s.roi)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>`;
  }

  private getStatusLabel(status: MemberStatus): string {
    const labels: Record<MemberStatus, string> = {
      new: '新用户',
      active: '活跃',
      silent: '沉默',
      churned: '流失',
      resurrected: '召回',
    };
    return labels[status] || status;
  }

  getReportHistory(): Array<{ id: string; title: string; generatedAt: string; format: string }> {
    const historyPath = path.join(this.reportDir, 'report-history.json');
    if (!fs.existsSync(historyPath)) {
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  getReportById(id: string): ChurnReport | null {
    const files = fs.readdirSync(this.reportDir);
    const reportFile = files.find(f => f.includes(id) && f.endsWith('.json'));
    if (!reportFile) return null;

    try {
      const filePath = path.join(this.reportDir, reportFile);
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }
}
