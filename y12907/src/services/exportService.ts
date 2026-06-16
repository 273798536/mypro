// 导出服务 - 生成非技术人员可读的报告
// 重点：安全规则漏配原因不用字段名和缩写，用自然语言

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';

import { Sample, ProcessingRecord, AnalysisResult, ExportConfig } from '../types';
import {
  translateSourceType,
  translateAnomalyType,
  translateHandlingOpinion,
  translate
} from '../utils/naturalLanguage';
import { getRuleById } from '../data/securityRules';

// 导出服务类
export class ExportService {
  // 生成Excel导出
  async exportToExcel(
    record: ProcessingRecord,
    samples: Sample[],
    analysisResult: AnalysisResult,
    config: ExportConfig
  ): Promise<Blob> {
    const wb = XLSX.utils.book_new();

    // 1. 概览表
    const overviewData = this.generateOverviewData(record, analysisResult, config);
    const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, ws1, '分析概览');

    // 2. 异常明细表
    const anomalyData = this.generateAnomalyDetailData(samples, analysisResult, config);
    const ws2 = XLSX.utils.aoa_to_sheet(anomalyData);
    XLSX.utils.book_append_sheet(wb, ws2, '异常明细');

    // 3. 安全规则匹配表
    const ruleData = this.generateRuleMatchData(samples, analysisResult, config);
    const ws3 = XLSX.utils.aoa_to_sheet(ruleData);
    XLSX.utils.book_append_sheet(wb, ws3, '规则匹配');

    // 4. 完整样本表
    const sampleData = this.generateSampleData(samples, config);
    const ws4 = XLSX.utils.aoa_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws4, '样本明细');

    // 导出为Blob
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  // 生成PDF导出
  async exportToPDF(
    record: ProcessingRecord,
    samples: Sample[],
    analysisResult: AnalysisResult,
    config: ExportConfig
  ): Promise<Blob> {
    const doc = new jsPDF();
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // 设置中文字体（使用内置字体，对于中文会使用替代，但结构保持）
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);

    // 标题
    doc.text('安全拒答样本归因分析报告', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // 基本信息
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const headerInfo = [
      `分析时间: ${dayjs(record.processedAt).format('YYYY-MM-DD HH:mm:ss')}`,
      `运行编号: ${analysisResult.reproducibility.runId}`,
      `分析样本: ${record.sampleCount}条`,
      `异常样本: ${record.anomalyCount}条`,
      `异常率: ${((record.anomalyCount / record.sampleCount) * 100).toFixed(2)}%`
    ];

    headerInfo.forEach(info => {
      doc.text(info, margin, yPosition);
      yPosition += 7;
    });

    yPosition += 10;

    // 分布统计
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('一、分布统计', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const { bySourceType, byAnomalyType } = analysisResult.distributionStats;

    doc.text('数据来源分布:', margin, yPosition);
    yPosition += 6;
    Object.entries(bySourceType).forEach(([type, count]) => {
      const pct = ((count / record.sampleCount) * 100).toFixed(1);
      doc.text(`  ${translateSourceType(type as any)}: ${count}条 (${pct}%)`, margin + 5, yPosition);
      yPosition += 5;
    });

    yPosition += 5;
    doc.text('异常类型分布:', margin, yPosition);
    yPosition += 6;
    Object.entries(byAnomalyType).forEach(([type, count]) => {
      doc.text(`  ${translateAnomalyType(type as any)}: ${count}条`, margin + 5, yPosition);
      yPosition += 5;
    });

    yPosition += 10;

    // 异常详情
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('二、异常详情（前10条）', margin, yPosition);
    yPosition += 8;

    const anomalySamples = samples.filter(s => s.anomalies.length > 0).slice(0, 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    anomalySamples.forEach((sample, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. 样本ID: ${sample.sampleId}`, margin, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');

      const content = sample.content.length > 50
        ? sample.content.substring(0, 50) + '...'
        : sample.content;
      doc.text(`内容: ${content}`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`来源: ${translateSourceType(sample.sourceType)}`, margin + 5, yPosition);
      yPosition += 5;

      sample.anomalies.forEach(anomaly => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`异常类型: ${translateAnomalyType(anomaly.type)}`, margin + 10, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'normal');

        // 使用自然语言描述
        if (config.includeNaturalLanguage) {
          const descLines = this.splitText(anomaly.naturalDescription, 80);
          descLines.forEach(line => {
            doc.text(line, margin + 15, yPosition);
            yPosition += 5;
          });
        }

        if (anomaly.handlingOpinion && config.includeNaturalLanguage) {
          doc.text(
            `处理建议: ${translateHandlingOpinion(anomaly.handlingOpinion)}`,
            margin + 15,
            yPosition
          );
          yPosition += 5;
        }
      });

      yPosition += 5;
    });

    // 页脚
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `报告生成时间: ${new Date().toLocaleString('zh-CN')} | 运行ID: ${analysisResult.reproducibility.runId}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );

    return doc.output('blob');
  }

  // 生成Word格式导出（HTML格式，Word可打开）
  async exportToWord(
    record: ProcessingRecord,
    samples: Sample[],
    analysisResult: AnalysisResult,
    config: ExportConfig
  ): Promise<Blob> {
    const htmlContent = this.generateWordHTML(record, samples, analysisResult, config);
    const htmlBlob = new Blob(
      ['\ufeff', htmlContent], // BOM for UTF-8
      { type: 'application/msword' }
    );
    return htmlBlob;
  }

  // 生成Word的HTML内容
  private generateWordHTML(
    record: ProcessingRecord,
    samples: Sample[],
    analysisResult: AnalysisResult,
    config: ExportConfig
  ): string {
    const { bySourceType, byAnomalyType } = analysisResult.distributionStats;
    const anomalySamples = samples.filter(s => s.anomalies.length > 0);

    return `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head>
<meta charset='utf-8'>
<title>安全拒答样本归因分析报告</title>
<style>
  body { font-family: 'Microsoft YaHei', SimSun, sans-serif; font-size: 12pt; line-height: 1.6; }
  h1 { color: #1e3a5f; font-size: 18pt; text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; }
  h2 { color: #1e3a5f; font-size: 14pt; margin-top: 20px; border-left: 4px solid #f59e0b; padding-left: 10px; }
  .info-box { background: #f0f4f8; padding: 10px; margin: 10px 0; border-left: 4px solid #1e3a5f; }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
  .stat-item { background: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; }
  .stat-label { color: #64748b; font-size: 10pt; }
  .stat-value { color: #1e3a5f; font-size: 14pt; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th { background: #1e3a5f; color: white; padding: 8px; text-align: left; }
  td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .anomaly-card { background: #fffbeb; border: 1px solid #f59e0b; padding: 10px; margin: 10px 0; border-radius: 4px; }
  .severity-high { color: #dc2626; font-weight: bold; }
  .severity-medium { color: #f59e0b; font-weight: bold; }
  .severity-low { color: #10b981; font-weight: bold; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10pt; color: #64748b; text-align: center; }
  .trace-link { background: #ecfdf5; padding: 8px; border-left: 3px solid #10b981; margin: 5px 0; }
</style>
</head>
<body>
  <h1>安全拒答样本归因分析报告</h1>

  <div class="info-box">
    <p><strong>分析时间：</strong>${dayjs(record.processedAt).format('YYYY年MM月DD日 HH:mm:ss')}</p>
    <p><strong>运行编号：</strong>${analysisResult.reproducibility.runId}（可用于复现本次分析结果）</p>
    <p><strong>提示词版本：</strong>${record.promptVersionId}</p>
  </div>

  <div class="stats-grid">
    <div class="stat-item">
      <div class="stat-label">分析样本总数</div>
      <div class="stat-value">${record.sampleCount}条</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">异常样本数</div>
      <div class="stat-value" style="color: #dc2626;">${record.anomalyCount}条</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">标签冲突数</div>
      <div class="stat-value" style="color: #f59e0b;">${record.conflictCount}条</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">异常率</div>
      <div class="stat-value">${((record.anomalyCount / record.sampleCount) * 100).toFixed(2)}%</div>
    </div>
  </div>

  <h2>一、数据来源分布</h2>
  <table>
    <tr><th>来源类型</th><th>数量</th><th>占比</th><th>说明</th></tr>
    ${Object.entries(bySourceType).map(([type, count]) => `
    <tr>
      <td>${translateSourceType(type as any)}</td>
      <td>${count}条</td>
      <td>${((count / record.sampleCount) * 100).toFixed(1)}%</td>
      <td>${translate('source_type_' + type)}</td>
    </tr>
    `).join('')}
  </table>

  <h2>二、异常类型分布</h2>
  <table>
    <tr><th>异常类型</th><th>数量</th><th>说明</th></tr>
    ${Object.entries(byAnomalyType).map(([type, count]) => `
    <tr>
      <td>${translateAnomalyType(type as any)}</td>
      <td>${count}条</td>
      <td>${this.getAnomalyTypeDescription(type as any)}</td>
    </tr>
    `).join('')}
  </table>

  <h2>三、安全规则匹配情况</h2>
  <table>
    <tr><th>规则ID</th><th>规则名称</th><th>命中数</th><th>未命中数</th><th>命中率</th></tr>
    ${Object.entries(analysisResult.distributionStats.byRuleMatch).map(([ruleId, stats]) => {
      const rule = getRuleById(ruleId);
      const total = stats.matched + stats.unmatched;
      const rate = total > 0 ? ((stats.matched / total) * 100).toFixed(1) : '0';
      return `
      <tr>
        <td>${ruleId}</td>
        <td>${rule?.ruleName || '未知规则'}</td>
        <td>${stats.matched}</td>
        <td>${stats.unmatched}</td>
        <td>${rate}%</td>
      </tr>
      `;
    }).join('')}
  </table>

  <h2>四、异常明细</h2>
  ${anomalySamples.slice(0, 20).map(sample => `
  <div class="anomaly-card">
    <p><strong>样本ID：</strong>${sample.sampleId} 
       <strong>来源：</strong>${translateSourceType(sample.sourceType)}
       ${sample.sourceRemark ? `<br/><strong>备注：</strong>${sample.sourceRemark}` : ''}
    </p>
    <p><strong>内容：</strong>${sample.content}</p>
    ${sample.anomalies.map(anomaly => `
    <div class="trace-link">
      <p><span class="severity-${anomaly.severity}">【${translateAnomalyType(anomaly.type)}】</span>
         <strong>严重程度：</strong>${this.getSeverityText(anomaly.severity)}
      </p>
      ${config.includeNaturalLanguage ? `<p><strong>原因说明：</strong>${anomaly.naturalDescription.replace(/\n/g, '<br/>')}</p>` : ''}
      ${anomaly.relatedRuleId ? `<p><strong>关联安全规则：</strong>${anomaly.relatedRuleId} - ${getRuleById(anomaly.relatedRuleId)?.ruleName || ''}</p>` : ''}
      ${anomaly.handlingOpinion ? `<p><strong>处理建议：</strong>${translateHandlingOpinion(anomaly.handlingOpinion)}</p>` : ''}
      ${config.includeTraceLink ? `<p style="color: #10b981;"><strong>追溯链路：</strong>异常样本 → 安全规则${anomaly.relatedRuleId || ''} → 处理意见</p>` : ''}
    </div>
    `).join('')}
  </div>
  `).join('')}

  ${anomalySamples.length > 20 ? `<p style="color: #64748b; text-align: center;">仅显示前20条异常，完整数据请查看Excel附件</p>` : ''}

  <div class="footer">
    <p>本报告由安全拒答样本归因系统自动生成</p>
    <p>运行ID：${analysisResult.reproducibility.runId} | 生成时间：${new Date().toLocaleString('zh-CN')}</p>
    <p>如需复现本次分析结果，请在系统中输入运行ID进行复现操作</p>
  </div>
</body>
</html>
`;
  }

  // 获取异常类型描述
  private getAnomalyTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      missing_rule: '样本内容本应被某条安全规则捕获，但实际未匹配到',
      label_conflict: '提示词版本变更后，样本的安全标签与之前不一致',
      missing_unit: '样本未填写计量单位字段，影响安全规则判断',
      format_error: '样本的数据格式不符合标注规范要求'
    };
    return descriptions[type] || type;
  }

  // 获取严重程度文本
  private getSeverityText(severity: string): string {
    const texts: Record<string, string> = {
      low: '轻微',
      medium: '中等',
      high: '严重',
      critical: '致命'
    };
    return texts[severity] || severity;
  }

  // 分割长文本
  private splitText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];
    const result: string[] = [];
    for (let i = 0; i < text.length; i += maxLength) {
      result.push(text.substring(i, i + maxLength));
    }
    return result;
  }

  // ========== 辅助方法：生成各表数据 ==========

  private generateOverviewData(
    record: ProcessingRecord,
    analysisResult: AnalysisResult,
    _config: ExportConfig
  ): any[][] {
    const data: any[][] = [];

    data.push(['安全拒答样本归因分析报告']);
    data.push(['']);
    data.push(['分析时间', dayjs(record.processedAt).format('YYYY-MM-DD HH:mm:ss')]);
    data.push(['运行编号', analysisResult.reproducibility.runId]);
    data.push(['可复现性', '是（使用运行ID可复现本次结果）']);
    data.push(['']);
    data.push(['分析样本总数', record.sampleCount]);
    data.push(['异常样本数', record.anomalyCount]);
    data.push(['标签冲突数', record.conflictCount]);
    data.push(['异常率', `${((record.anomalyCount / record.sampleCount) * 100).toFixed(2)}%`]);
    data.push(['']);
    data.push(['说明']);
    data.push(['本报告所有技术术语已转译为自然语言，方便非技术人员阅读。']);
    data.push(['如需追溯具体异常的详细原因，请使用系统的异常追溯功能。']);

    return data;
  }

  private generateAnomalyDetailData(
    samples: Sample[],
    _analysisResult: AnalysisResult,
    config: ExportConfig
  ): any[][] {
    const data: any[][] = [];

    const headers = config.includeNaturalLanguage
      ? ['样本ID', '内容摘要', '来源类型', '异常类型', '严重程度', '原因说明（自然语言）', '关联规则', '处理建议']
      : ['样本ID', '内容摘要', '来源类型', '异常类型', '严重程度', '技术描述', '关联规则', '处理建议'];

    data.push(headers);

    samples
      .filter(s => s.anomalies.length > 0)
      .forEach(sample => {
        sample.anomalies.forEach(anomaly => {
          const rule = anomaly.relatedRuleId ? getRuleById(anomaly.relatedRuleId) : null;
          data.push([
            sample.sampleId,
            sample.content.substring(0, 30) + (sample.content.length > 30 ? '...' : ''),
            translateSourceType(sample.sourceType),
            translateAnomalyType(anomaly.type),
            this.getSeverityText(anomaly.severity),
            config.includeNaturalLanguage ? anomaly.naturalDescription : anomaly.description,
            rule ? `${rule.ruleId} - ${rule.ruleName}` : '无',
            anomaly.handlingOpinion ? translateHandlingOpinion(anomaly.handlingOpinion) : '待处理'
          ]);
        });
      });

    return data;
  }

  private generateRuleMatchData(
    _samples: Sample[],
    analysisResult: AnalysisResult,
    _config: ExportConfig
  ): any[][] {
    const data: any[][] = [];
    data.push(['规则ID', '规则名称', '规则描述', '命中样本数', '未命中样本数', '命中率', '处理意见']);

    Object.entries(analysisResult.distributionStats.byRuleMatch).forEach(([ruleId, stats]) => {
      const rule = getRuleById(ruleId);
      const total = stats.matched + stats.unmatched;
      const rate = total > 0 ? `${((stats.matched / total) * 100).toFixed(1)}%` : '0%';

      data.push([
        ruleId,
        rule?.ruleName || '未知规则',
        rule?.ruleDescription || '',
        stats.matched,
        stats.unmatched,
        rate,
        rule?.handlingOpinion || ''
      ]);
    });

    return data;
  }

  private generateSampleData(samples: Sample[], _config: ExportConfig): any[][] {
    const data: any[][] = [];
    data.push([
      '样本ID', '内容', '来源类型', '来源说明', '单位',
      '标注标签', '安全标签', '备注', '创建时间', '异常数', '匹配规则'
    ]);

    samples.forEach(sample => {
      data.push([
        sample.sampleId,
        sample.content,
        translateSourceType(sample.sourceType),
        sample.sourceRemark || '',
        sample.unit || '（未填写）',
        sample.annotationLabel,
        sample.securityLabel,
        sample.remark || '',
        dayjs(sample.createdAt).format('YYYY-MM-DD HH:mm'),
        sample.anomalies.length,
        sample.matchedRules.join(', ') || '无'
      ]);
    });

    return data;
  }

  // 主导出方法
  async export(
    config: ExportConfig,
    record: ProcessingRecord,
    samples: Sample[],
    analysisResult: AnalysisResult
  ): Promise<{ blob: Blob; filename: string }> {
    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const templateName = config.template === 'review' ? '评审会' : '日常分析';
    let blob: Blob;
    let filename: string;

    switch (config.format) {
      case 'excel':
        blob = await this.exportToExcel(record, samples, analysisResult, config);
        filename = `安全拒答样本归因分析_${templateName}_${timestamp}.xlsx`;
        break;
      case 'pdf':
        blob = await this.exportToPDF(record, samples, analysisResult, config);
        filename = `安全拒答样本归因分析_${templateName}_${timestamp}.pdf`;
        break;
      case 'word':
        blob = await this.exportToWord(record, samples, analysisResult, config);
        filename = `安全拒答样本归因分析_${templateName}_${timestamp}.doc`;
        break;
      default:
        throw new Error('不支持的导出格式');
    }

    return { blob, filename };
  }

  // 下载文件
  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// 全局单例
export const exportService = new ExportService();
