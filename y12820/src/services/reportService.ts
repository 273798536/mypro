import { Report, ReportSummary, Sample, QCRecord, AnalysisResult, Group, SampleStatus } from '../types';
import { generateId } from '../utils/mockData';
import { jsPDF } from 'jspdf';

export class ReportService {
  static generateReport(
    title: string,
    type: 'standard' | 'student',
    includedSampleIds: string[],
    samples: Sample[],
    qcRecords: QCRecord[],
    analysisResults?: AnalysisResult[],
    groups?: Group[]
  ): Report {
    const now = new Date();
    const currentUser = '张检验师';

    return {
      id: generateId(),
      title,
      type,
      includedSampleIds,
      analysisId: analysisResults?.[0]?.analysisId,
      status: 'ready',
      format: 'html',
      createdAt: now,
      createdBy: currentUser,
      generatedAt: now,
    };
  }

  static generateReportSummary(
    samples: Sample[],
    qcRecords: QCRecord[],
    analysisResults?: AnalysisResult[]
  ): ReportSummary {
    const total = samples.length;
    const available = samples.filter(s => s.status === SampleStatus.AVAILABLE).length;
    const reviewing = samples.filter(s => s.status === SampleStatus.REVIEWING).length;
    const invalid = samples.filter(s => s.status === SampleStatus.INVALID).length;
    const significantFindings = analysisResults?.filter(r => r.isSignificant).length || 0;

    const avgQcScore = qcRecords.length > 0
      ? qcRecords.reduce((sum, q) => sum + q.qcScore, 0) / qcRecords.length
      : 0;

    return {
      totalSamples: total,
      availableSamples: available,
      reviewingSamples: reviewing,
      invalidSamples: invalid,
      significantFindings,
      qualityScore: avgQcScore,
      generatedAt: new Date(),
      generatedBy: '张检验师',
    };
  }

  static generateHTMLReport(
    report: Report,
    summary: ReportSummary,
    samples: Sample[],
    qcRecords: QCRecord[],
    analysisResults?: AnalysisResult[],
    isStudentView = false
  ): string {
    const statusColor = (status: SampleStatus) => {
      switch (status) {
        case SampleStatus.AVAILABLE:
          return '#10B981';
        case SampleStatus.REVIEWING:
          return '#F59E0B';
        case SampleStatus.INVALID:
          return '#EF4444';
        default:
          return '#6B7280';
      }
    };

    const statusText = (status: SampleStatus) => {
      switch (status) {
        case SampleStatus.AVAILABLE:
          return '可用';
        case SampleStatus.REVIEWING:
          return '待复核';
        case SampleStatus.INVALID:
          return '不可用';
        default:
          return '未知';
      }
    };

    const statusIcon = (status: SampleStatus) => {
      switch (status) {
        case SampleStatus.AVAILABLE:
          return '🟢';
        case SampleStatus.REVIEWING:
          return '🟡';
        case SampleStatus.INVALID:
          return '🔴';
        default:
          return '⚪';
      }
    };

    const samplesHtml = samples.map(sample => {
      const qc = qcRecords.find(q => q.sampleId === sample.id);
      const result = analysisResults?.find(r => r.sampleId === sample.id);

      if (isStudentView) {
        return `
          <div style="border: 2px solid ${statusColor(sample.status)}30; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: ${statusColor(sample.status)}08;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <span style="font-size: 28px;">${statusIcon(sample.status)}</span>
              <div>
                <h3 style="margin: 0; font-size: 18px;">${sample.name}</h3>
                <span style="color: ${statusColor(sample.status)}; font-weight: 600;">${statusText(sample.status)}</span>
              </div>
            </div>
            <p style="margin: 8px 0; color: #4B5563;">条码：${sample.barcode} | 材料：${sample.material}</p>
            ${sample.invalidReason ? `<p style="color: #EF4444; margin: 8px 0;">⚠️ ${sample.invalidReason}</p>` : ''}
            ${sample.status === SampleStatus.REVIEWING ? `<p style="color: #F59E0B; margin: 8px 0;">📋 请联系检验师复核确认后使用</p>` : ''}
          </div>
        `;
      }

      return `
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px;">${sample.barcode}</td>
          <td style="padding: 12px;">${sample.name}</td>
          <td style="padding: 12px;">${sample.material}</td>
          <td style="padding: 12px;"><span style="color: ${statusColor(sample.status)};">● ${statusText(sample.status)}</span></td>
          <td style="padding: 12px;">${qc?.qcScore.toFixed(1) || '-'}</td>
          <td style="padding: 12px;">${result ? (result.isSignificant ? (result.regulation === 'up' ? '↑ 上调' : '↓ 下调') : '无差异') : '-'}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>${report.title}</title>
        <style>
          body { font-family: 'Noto Sans SC', sans-serif; line-height: 1.6; color: #1F2937; padding: 40px; max-width: 1200px; margin: 0 auto; }
          h1 { color: #0F3B5F; border-bottom: 3px solid #0F3B5F; padding-bottom: 16px; }
          h2 { color: #0F3B5F; margin-top: 32px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 24px 0; }
          .summary-card { background: #F8FAFC; border-radius: 8px; padding: 20px; text-align: center; }
          .summary-number { font-size: 32px; font-weight: 700; color: #0F3B5F; }
          .summary-label { color: #6B7280; font-size: 14px; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #F1F5F9; padding: 12px; text-align: left; font-weight: 600; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
          .legend { display: flex; gap: 24px; margin: 16px 0; padding: 16px; background: #F8FAFC; border-radius: 8px; }
          .legend-item { display: flex; align-items: center; gap: 8px; }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <p style="color: #6B7280;">生成时间：${report.generatedAt?.toLocaleString('zh-CN')} | 生成人：${report.createdBy}</p>
        
        <h2>报告摘要</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-number">${summary.totalSamples}</div>
            <div class="summary-label">总样本数</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #10B981;">${summary.availableSamples}</div>
            <div class="summary-label">可用样本</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #F59E0B;">${summary.reviewingSamples}</div>
            <div class="summary-label">待复核</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #EF4444;">${summary.invalidSamples}</div>
            <div class="summary-label">不可用</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #8B5CF6;">${summary.significantFindings}</div>
            <div class="summary-label">显著差异</div>
          </div>
          <div class="summary-card">
            <div class="summary-number">${summary.qualityScore.toFixed(1)}</div>
            <div class="summary-label">平均质控分</div>
          </div>
        </div>

        ${isStudentView ? `
          <div class="legend">
            <div class="legend-item"><span>🟢</span> 直接可用</div>
            <div class="legend-item"><span>🟡</span> 待复核</div>
            <div class="legend-item"><span>🔴</span> 不可用</div>
          </div>
        ` : ''}

        <h2>样本详情</h2>
        ${isStudentView ? samplesHtml : `
          <table>
            <thead>
              <tr>
                <th>条码</th>
                <th>名称</th>
                <th>材料</th>
                <th>状态</th>
                <th>质控分数</th>
                <th>差异分析</th>
              </tr>
            </thead>
            <tbody>
              ${samplesHtml}
            </tbody>
          </table>
        `}

        ${analysisResults && analysisResults.length > 0 ? `
          <h2>差异分析摘要</h2>
          <p>显著差异样本：${analysisResults.filter(r => r.isSignificant).length} 个</p>
          <p>上调：${analysisResults.filter(r => r.regulation === 'up').length} 个</p>
          <p>下调：${analysisResults.filter(r => r.regulation === 'down').length} 个</p>
        ` : ''}

        <div class="footer">
          <p>本报告由叶绿素荧光实验报告系统自动生成</p>
          <p>如有疑问，请联系检验科检验师</p>
        </div>
      </body>
      </html>
    `;
  }

  static exportHTML(html: string, filename: string): void {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.html`;
    link.click();
  }

  static async exportPDF(htmlContent: string, filename: string): Promise<void> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const textContent = doc.body.textContent || '';

    const lines = pdf.splitTextToSize(textContent, 180);
    let y = 20;

    pdf.setFont('helvetica');
    pdf.setFontSize(16);
    pdf.text('叶绿素荧光实验报告', 105, y, { align: 'center' });
    y += 15;

    pdf.setFontSize(10);
    lines.forEach((line: string) => {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 15, y);
      y += 7;
    });

    pdf.save(`${filename}.pdf`);
  }

  static downloadReport(report: Report, format: 'html' | 'pdf', htmlContent: string): void {
    const filename = `${report.title}_${report.createdAt.toISOString().slice(0, 10)}`;

    if (format === 'html') {
      this.exportHTML(htmlContent, filename);
    } else {
      this.exportPDF(htmlContent, filename);
    }
  }
}
