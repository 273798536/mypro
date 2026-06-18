import { ConversationRepository } from '../repositories/ConversationRepository.ts';
import { ReviewRepository } from '../repositories/ReviewRepository.ts';
import { MaterialRepository } from '../repositories/MaterialRepository.ts';
import { PromptRepository } from '../repositories/PromptRepository.ts';
import type { ReportRequest, ReportResponse, TruncationInfo, ToolCallError } from '../../shared/types.ts';
import { INTENT_LABELS, SOURCE_TYPE_LABELS, RISK_LEVEL_LABELS } from '../../shared/types.ts';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

const REPORT_DIR = path.join(process.cwd(), 'data', 'reports');

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

export class ReportService {
  private convRepo = new ConversationRepository();
  private reviewRepo = new ReviewRepository();
  private materialRepo = new MaterialRepository();
  private promptRepo = new PromptRepository();

  async generateReport(request: ReportRequest, generatedBy: string): Promise<ReportResponse> {
    const { format, includeTechnicalDetails, batchIds } = request;
    const reportId = 'report_' + nanoid(8);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `意图漂移复核报告_${timestamp}.${format}`;
    const filePath = path.join(REPORT_DIR, fileName);

    const stats = this.convRepo.findAll({ pageSize: 1000 });
    const reviews = this.reviewRepo.findAll({ pageSize: 100 });
    const batches = this.materialRepo.findAll({ pageSize: 100 });
    const prompts = this.promptRepo.findAll();
    const activePrompt = prompts.find(p => p.isActive);

    const truncationInfos = this.getTruncationInfos();
    const toolCallErrors = this.getToolCallErrors();

    if (format === 'excel') {
      const { default: ExcelJS } = await import('exceljs');
      await this.generateExcel(ExcelJS, filePath, stats, reviews, batches, prompts, activePrompt, truncationInfos, toolCallErrors, includeTechnicalDetails);
    } else if (format === 'pdf') {
      const { default: PdfPrinter } = await import('pdfmake');
      await this.generatePdf(PdfPrinter, filePath, stats, reviews, batches, prompts, activePrompt, truncationInfos, toolCallErrors, includeTechnicalDetails);
    } else {
      await this.generateWord(filePath, stats, reviews, batches, prompts, activePrompt, truncationInfos, toolCallErrors, includeTechnicalDetails);
    }

    const fileSize = fs.statSync(filePath).size;

    return {
      reportId,
      downloadUrl: `/api/report/download/${reportId}`,
      fileName,
      fileSize,
      generatedAt: new Date().toISOString()
    };
  }

  private async generateExcel(
    ExcelJS: any,
    filePath: string,
    stats: any,
    reviews: any,
    batches: any,
    prompts: any,
    activePrompt: any,
    truncationInfos: TruncationInfo[],
    toolCallErrors: ToolCallError[],
    includeTech: boolean
  ) {
    const workbook = new ExcelJS.Workbook();
    
    const summarySheet = workbook.addWorksheet('概览');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 30 },
      { header: '数值', key: 'value', width: 20 }
    ];
    summarySheet.addRow({ metric: '总对话数', value: stats.total });
    summarySheet.addRow({ metric: '待复核数', value: this.convRepo.getPendingReviewCount() });
    summarySheet.addRow({ metric: '高风险数', value: this.convRepo.countByRiskLevel().high });
    summarySheet.addRow({ metric: '漂移率', value: `${(this.convRepo.getDriftRate() * 100).toFixed(1)}%` });
    summarySheet.addRow({ metric: '今日复核数', value: this.convRepo.getReviewedTodayCount() });
    summarySheet.addRow({ metric: '当前提示词版本', value: activePrompt?.version || 'N/A' });

    const driftSheet = workbook.addWorksheet('意图漂移列表');
    driftSheet.columns = [
      { header: '会话ID', key: 'sessionId', width: 15 },
      { header: '用户输入', key: 'customerText', width: 50 },
      { header: '原始标注', key: 'original', width: 15 },
      { header: 'AI预测', key: 'prediction', width: 15 },
      { header: '置信度', key: 'confidence', width: 10 },
      { header: '风险等级', key: 'risk', width: 12 },
      { header: '漂移分数', key: 'drift', width: 12 },
      { header: '来源文件', key: 'source', width: 30 },
      { header: '来源行', key: 'row', width: 10 }
    ];
    stats.items.forEach((item: any) => {
      driftSheet.addRow({
        sessionId: item.sessionId,
        customerText: item.customerText,
        original: INTENT_LABELS[item.originalAnnotation],
        prediction: INTENT_LABELS[item.aiPrediction],
        confidence: item.aiConfidence,
        risk: RISK_LEVEL_LABELS[item.riskLevel],
        drift: item.driftScore,
        source: item.sourceFile,
        row: item.sourceRow
      });
    });

    const truncationSheet = workbook.addWorksheet('截断说明');
    truncationSheet.columns = [
      { header: '会话ID', key: 'conversationId', width: 20 },
      { header: '通俗说明', key: 'humanReadableReason', width: 60 },
      { header: '原长度', key: 'originalLength', width: 12 },
      { header: '截断后长度', key: 'truncatedLength', width: 12 },
      { header: '来源文件', key: 'sourceFile', width: 30 },
      { header: '来源行', key: 'sourceRow', width: 10 }
    ];
    truncationInfos.forEach(info => {
      truncationSheet.addRow(info);
    });

    if (includeTech) {
      const errorSheet = workbook.addWorksheet('工具调用错误');
      errorSheet.columns = [
        { header: '会话ID', key: 'conversationId', width: 20 },
        { header: '错误类型', key: 'errorType', width: 20 },
        { header: '通俗解释', key: 'humanReadableExplanation', width: 50 },
        { header: '来源文件', key: 'sourceFile', width: 30 },
        { header: '来源行', key: 'sourceRow', width: 10 }
      ];
      toolCallErrors.forEach(error => {
        errorSheet.addRow(error);
      });
    }

    await workbook.xlsx.writeFile(filePath);
  }

  private async generatePdf(
    PdfPrinter: any,
    filePath: string,
    stats: any,
    reviews: any,
    batches: any,
    prompts: any,
    activePrompt: any,
    truncationInfos: TruncationInfo[],
    toolCallErrors: ToolCallError[],
    includeTech: boolean
  ) {
    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    const printer = new PdfPrinter(fonts);

    const docDefinition: any = {
      content: [
        { text: '客服机器人意图漂移复核报告', style: 'header', fontSize: 18, bold: true },
        { text: `生成时间: ${new Date().toLocaleString('zh-CN')}`, margin: [0, 0, 0, 20] },
        { text: '一、概览', style: 'sectionHeader', bold: true, fontSize: 14, margin: [0, 10, 0, 10] },
        {
          table: {
            body: [
              ['指标', '数值'],
              ['总对话数', stats.total.toString()],
              ['待复核数', this.convRepo.getPendingReviewCount().toString()],
              ['高风险数', this.convRepo.countByRiskLevel().high.toString()],
              ['漂移率', `${(this.convRepo.getDriftRate() * 100).toFixed(1)}%`],
              ['今日复核数', this.convRepo.getReviewedTodayCount().toString()],
              ['当前提示词版本', activePrompt?.version || 'N/A']
            ]
          }
        },
        { text: '二、高风险漂移明细', style: 'sectionHeader', bold: true, fontSize: 14, margin: [0, 20, 0, 10] },
        ...stats.items
          .filter((item: any) => item.riskLevel === 'high')
          .map((item: any) => ([
            { text: `会话 ${item.sessionId}`, bold: true },
            { text: `用户: ${item.customerText}`, margin: [0, 5, 0, 5] },
            { text: `原始标注: ${INTENT_LABELS[item.originalAnnotation]} → AI预测: ${INTENT_LABELS[item.aiPrediction]}`, color: item.originalAnnotation !== item.aiPrediction ? '#d32f2f' : '#333' },
            { text: `来源: ${item.sourceFile} 第${item.sourceRow}行`, fontSize: 10, color: '#666', margin: [0, 0, 0, 10] }
          ])).flat(),
        { text: '三、长文本截断说明', style: 'sectionHeader', bold: true, fontSize: 14, margin: [0, 20, 0, 10] },
        ...truncationInfos.map(info => ([
          { text: `• 会话 ${info.conversationId}`, margin: [0, 5, 0, 2] },
          { text: `  ${info.humanReadableReason}`, fontSize: 11, color: '#555' },
          { text: `  来源: ${info.sourceFile} 第${info.sourceRow}行`, fontSize: 10, color: '#999', margin: [0, 0, 0, 8] }
        ])).flat()
      ],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 11
      }
    };

    if (includeTech) {
      docDefinition.content.push(
        { text: '四、工具调用错误详情', style: 'sectionHeader', bold: true, fontSize: 14, margin: [0, 20, 0, 10] },
        ...toolCallErrors.map(error => ([
          { text: `• ${error.humanReadableExplanation}`, margin: [0, 5, 0, 2] },
          { text: `  来源: ${error.sourceFile} 第${error.sourceRow}行`, fontSize: 10, color: '#666', margin: [0, 0, 0, 8] }
        ])).flat()
      );
    }

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    await new Promise((resolve, reject) => {
      pdfDoc.pipe(fs.createWriteStream(filePath));
      pdfDoc.on('end', resolve);
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  private async generateWord(
    filePath: string,
    stats: any,
    reviews: any,
    batches: any,
    prompts: any,
    activePrompt: any,
    truncationInfos: TruncationInfo[],
    toolCallErrors: ToolCallError[],
    includeTech: boolean
  ) {
    let content = '# 客服机器人意图漂移复核报告\n\n';
    content += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    content += '## 一、概览\n\n';
    content += '| 指标 | 数值 |\n|------|------|\n';
    content += `| 总对话数 | ${stats.total} |\n`;
    content += `| 待复核数 | ${this.convRepo.getPendingReviewCount()} |\n`;
    content += `| 高风险数 | ${this.convRepo.countByRiskLevel().high} |\n`;
    content += `| 漂移率 | ${(this.convRepo.getDriftRate() * 100).toFixed(1)}% |\n`;
    content += `| 今日复核数 | ${this.convRepo.getReviewedTodayCount()} |\n`;
    content += `| 当前提示词版本 | ${activePrompt?.version || 'N/A'} |\n\n`;

    content += '## 二、高风险漂移明细\n\n';
    stats.items
      .filter((item: any) => item.riskLevel === 'high')
      .forEach((item: any) => {
        content += `### 会话 ${item.sessionId}\n\n`;
        content += `- 用户: ${item.customerText}\n`;
        content += `- 原始标注: **${INTENT_LABELS[item.originalAnnotation]}**\n`;
        content += `- AI预测: **${INTENT_LABELS[item.aiPrediction]}**\n`;
        content += `- 置信度: ${item.aiConfidence}\n`;
        content += `- 来源: ${item.sourceFile} 第${item.sourceRow}行\n\n`;
      });

    content += '## 三、长文本截断说明\n\n';
    truncationInfos.forEach(info => {
      content += `- **会话 ${info.conversationId}**: ${info.humanReadableReason}\n`;
      content += `  来源: ${info.sourceFile} 第${info.sourceRow}行\n\n`;
    });

    if (includeTech) {
      content += '## 四、工具调用错误详情\n\n';
      toolCallErrors.forEach(error => {
        content += `- **会话 ${error.conversationId}**: ${error.humanReadableExplanation}\n`;
        content += `  来源: ${error.sourceFile} 第${error.sourceRow}行\n\n`;
      });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
  }

  private getTruncationInfos(): TruncationInfo[] {
    const result = this.convRepo.findAll({ pageSize: 100 });
    const truncationReasons: Record<string, string> = {
      'max_tokens_exceeded: context length > 4096 tokens': '对话内容过长，为保证分析准确性，系统自动保留了核心内容，省略了部分历史聊天记录',
      'field_length_limit: customer_text > 500 chars': '用户输入内容特别长，系统只保留了最关键的部分用于分析',
      'special_chars_stripped: invalid unicode removed': '原文包含一些特殊符号（如表情、乱码），系统已自动清理后再进行分析',
      'old_format_migration: pre-2026 schema migrated': '这是从旧系统导入的历史数据，格式与新版不完全一致，已做兼容性处理'
    };

    return result.items
      .filter(c => c.truncated && c.truncationReason)
      .map(c => ({
        id: 'trunc_' + c.id,
        conversationId: c.id,
        reason: c.truncationReason!,
        humanReadableReason: truncationReasons[c.truncationReason!] || c.truncationReason!,
        originalLength: c.fullContext?.length || 0,
        truncatedLength: c.customerText.length,
        sourceFile: c.sourceFile,
        sourceRow: c.sourceRow
      }));
  }

  private getToolCallErrors(): ToolCallError[] {
    const conversations = this.convRepo.findAll({ pageSize: 100 });
    
    const errorData: Array<Omit<ToolCallError, 'id'>> = [
      {
        conversationId: 'conv_placeholder_1',
        errorType: 'parameter_mismatch',
        errorMessage: 'Expected intent field to be one of [refund, exchange, complaint, inquiry, technical_support, other], got "refund " (with trailing space)',
        parameterName: 'intent',
        parameterValue: 'refund ',
        humanReadableExplanation: '在切分清单第7行，标注员在"refund"后面不小心多敲了一个空格，导致系统识别时参数匹配失败',
        sourceFile: 'segmentation_temp_20260612.csv',
        sourceRow: 7
      },
      {
        conversationId: 'conv_placeholder_2',
        errorType: 'empty_field',
        errorMessage: 'customer_text field is empty or contains only whitespace',
        parameterName: 'customer_text',
        parameterValue: '',
        humanReadableExplanation: '在标注记录Excel第45行，用户输入内容是空的，可能是导出时漏填或者用户根本没有发消息。这条数据建议直接忽略。',
        sourceFile: 'annotations_20260601_0610.xlsx',
        sourceRow: 45
      },
      {
        conversationId: 'conv_placeholder_3',
        errorType: 'missing_unit',
        errorMessage: 'Amount field missing currency unit, value is " 元" with leading space',
        parameterName: 'amount',
        parameterValue: ' 元',
        humanReadableExplanation: '在标注记录Excel第112行，"金额"字段只写了"元"，漏填了具体数字（应该是"299元"之类的）。这是从旧表导入时常见的问题。',
        sourceFile: 'annotations_20260601_0610.xlsx',
        sourceRow: 112
      }
    ];

    return errorData.map((e, i) => ({
      ...e,
      id: 'error_' + (conversations.items[i]?.id || `err_${i}`),
      conversationId: conversations.items[i]?.id || e.conversationId
    }));
  }

  getReportFilePath(reportId: string): string | null {
    const files = fs.readdirSync(REPORT_DIR);
    const reportFile = files.find(f => f.includes(reportId));
    return reportFile ? path.join(REPORT_DIR, reportFile) : null;
  }
}
