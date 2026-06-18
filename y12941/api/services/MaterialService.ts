import { MaterialRepository } from '../repositories/MaterialRepository.ts';
import { ConversationRepository } from '../repositories/ConversationRepository.ts';
import { VersionRepository } from '../repositories/VersionRepository.ts';
import type { MaterialBatch, MaterialSource, Intent, RiskLevel, Conversation } from '../../shared/types.ts';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const VALID_INTENTS: Intent[] = ['refund', 'exchange', 'complaint', 'inquiry', 'technical_support', 'other'];

export interface ImportRecordResult {
  batchId: string;
  totalRecords: number;
  processedRecords: number;
  errorRecords: number;
  warnings: string[];
  sampleRecords: Conversation[];
}

export class MaterialService {
  private materialRepo = new MaterialRepository();
  private convRepo = new ConversationRepository();
  private versionRepo = new VersionRepository();

  getBatches() {
    return this.materialRepo.findAll();
  }

  getBatchById(id: string) {
    return this.materialRepo.findById(id);
  }

  async importFile(
    filePath: string,
    sourceType: MaterialSource,
    fileName: string,
    operator: string
  ): Promise<ImportRecordResult> {
    const ext = path.extname(fileName).toLowerCase();
    const batchName = `${this.getSourceTypeName(sourceType)}_${new Date().toISOString().split('T')[0]}`;
    const warnings: string[] = [];

    const batch = this.materialRepo.create({
      name: batchName,
      sourceType,
      fileName,
      totalRecords: 0,
      processedRecords: 0,
      errorRecords: 0,
      status: 'processing',
      createdBy: operator
    });

    let processedCount = 0;
    let errorCount = 0;
    const createdConversations: Conversation[] = [];

    try {
      let records: any[] = [];

      if (ext === '.csv') {
        records = await this.parseCsv(filePath);
      } else if (ext === '.xlsx' || ext === '.xls') {
        records = this.parseExcel(filePath);
      } else if (ext === '.json') {
        records = this.parseJson(filePath);
      } else {
        throw new Error(`不支持的文件格式: ${ext}，请使用 CSV、Excel 或 JSON`);
      }

      const totalRecords = records.length;

      if (totalRecords === 0) {
        warnings.push('文件解析后没有找到任何有效数据记录');
      }

      for (let i = 0; i < records.length; i++) {
        const rawRecord = records[i];
        const rowNumber = i + 2;

        try {
          const result = this.processRecord(rawRecord, rowNumber, fileName, sourceType, batch.id, operator);

          if (result.conversation) {
            const conv = this.convRepo.create(result.conversation);
            createdConversations.push(conv);

            if (result.annotationVersion) {
              this.versionRepo.create({
                ...result.annotationVersion,
                conversationId: conv.id
              });
            }

            if (result.predictionVersion) {
              this.versionRepo.create({
                ...result.predictionVersion,
                conversationId: conv.id
              });
            }

            processedCount++;
          }

          if (result.warning) {
            warnings.push(`第${rowNumber}行：${result.warning}`);
          }
        } catch (recordError: any) {
          errorCount++;
          warnings.push(`第${rowNumber}行处理失败：${recordError.message}`);
        }
      }

      this.materialRepo.updateCounts(batch.id, {
        totalRecords,
        processedRecords: processedCount,
        errorRecords: errorCount,
        status: 'completed'
      });

      return {
        batchId: batch.id,
        totalRecords,
        processedRecords: processedCount,
        errorRecords: errorCount,
        warnings: warnings.slice(0, 50),
        sampleRecords: createdConversations.slice(0, 5)
      };
    } catch (error: any) {
      this.materialRepo.updateStatus(batch.id, 'failed', error.message);
      throw error;
    }
  }

  private processRecord(
    record: any,
    rowNumber: number,
    fileName: string,
    sourceType: MaterialSource,
    batchId: string,
    operator: string
  ): {
    conversation?: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>;
    annotationVersion?: Omit<any, 'id' | 'createdAt' | 'conversationId'>;
    predictionVersion?: Omit<any, 'id' | 'createdAt' | 'conversationId'>;
    warning?: string;
  } {
    const warnings: string[] = [];

    const userInput = this.extractField(record, ['userInput', 'user_input', '用户输入', '客户输入', 'question', 'text', 'content']);
    const intent = this.extractField(record, ['intent', '意图', 'annotation', 'label', 'category']);
    const confidence = this.extractField(record, ['confidence', '置信度', 'score']);
    const sessionId = this.extractField(record, ['sessionId', 'session_id', '会话ID', 'conversationId', 'conversation_id']) || `sess_${Date.now()}_${rowNumber}`;
    const assistantResponse = this.extractField(record, ['assistantResponse', 'assistant_response', '客服回复', '机器人回复', 'answer', 'response']);
    const remark = this.extractField(record, ['remark', '备注', 'note', 'comment']);
    const trainingSampleId = this.extractField(record, ['trainingSampleId', 'training_sample_id', '样本ID', 'sampleId']);

    if (!userInput || String(userInput).trim() === '') {
      warnings.push('用户输入内容为空');
    }

    const customerText = String(userInput || '').trim();
    const isTruncated = customerText.length > 500;
    const truncatedText = isTruncated ? customerText.substring(0, 497) + '...' : customerText;
    let truncationReason: string | undefined;

    if (isTruncated) {
      truncationReason = 'field_length_limit: customer_text > 500 chars';
      warnings.push(`用户输入过长（${customerText.length}字），已自动截断为前500字`);
    }

    let originalIntent: Intent = 'other';
    let aiIntent: Intent = 'other';
    let aiConfidence = 0.7;

    if (intent && VALID_INTENTS.includes(String(intent).trim() as Intent)) {
      originalIntent = String(intent).trim() as Intent;
    } else if (intent) {
      warnings.push(`标注意图"${intent}"不是有效值，已默认设为other`);
    }

    aiIntent = this.simulateAIPrediction(customerText, originalIntent);
    aiConfidence = this.calculateConfidence(customerText, originalIntent, aiIntent);

    const hasDrift = originalIntent !== aiIntent;
    const driftScore = hasDrift ? Math.min(0.5 + Math.random() * 0.4, 0.95) : Math.random() * 0.1;

    let riskLevel: RiskLevel = 'normal';
    if (hasDrift) {
      if (driftScore >= 0.7 || customerText.length > 200) {
        riskLevel = 'high';
      } else if (driftScore >= 0.4) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }
    }

    const hasEmptyField = !userInput || String(userInput).trim() === '';
    if (hasEmptyField) {
      riskLevel = 'high';
      warnings.push('检测到空字段坏数据，已标记为高风险');
    }

    const annotationRemark = [
      `原始标注，来源: ${fileName} 第${rowNumber}行`,
      remark ? `原备注: ${remark}` : null,
      trainingSampleId ? `训练样本ID: ${trainingSampleId}` : null
    ].filter(Boolean).join('；');

    const conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> = {
      sessionId: String(sessionId),
      customerText: truncatedText,
      robotText: assistantResponse ? String(assistantResponse) : undefined,
      fullContext: customerText !== truncatedText ? customerText : undefined,
      truncated: isTruncated,
      truncationReason,
      sourceFile: fileName,
      sourceRow: rowNumber,
      sourceType,
      originalAnnotation: originalIntent,
      aiPrediction: aiIntent,
      aiConfidence,
      riskLevel,
      driftScore,
      batchId
    };

    const annotationVersion = {
      versionType: 'annotation' as const,
      intent: originalIntent,
      confidence: Number(confidence) || 0.8,
      remark: annotationRemark,
      operator: sourceType === 'training_sample' ? '训练样本导入' : operator || '系统导入',
      trainingSampleId: trainingSampleId ? String(trainingSampleId) : undefined,
      promptVersionId: undefined
    };

    const predictionVersion = {
      versionType: 'prediction' as const,
      intent: aiIntent,
      confidence: aiConfidence,
      remark: `AI自动预测，基于提示词版本 pv_003，漂移得分: ${driftScore.toFixed(2)}`,
      operator: 'ai_system',
      promptVersionId: 'pv_003',
      trainingSampleId: undefined
    };

    return {
      conversation,
      annotationVersion,
      predictionVersion,
      warning: warnings.length > 0 ? warnings.join('；') : undefined
    };
  }

  private extractField(record: any, possibleKeys: string[]): any {
    for (const key of possibleKeys) {
      if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
        return record[key];
      }
    }
    const recordKeys = Object.keys(record);
    for (const key of recordKeys) {
      const lowerKey = key.toLowerCase().replace(/_/g, '');
      for (const possible of possibleKeys) {
        const lowerPossible = possible.toLowerCase().replace(/_/g, '');
        if (lowerKey === lowerPossible || lowerKey.includes(lowerPossible)) {
          return record[key];
        }
      }
    }
    return undefined;
  }

  private simulateAIPrediction(text: string, originalIntent: Intent): Intent {
    const lowerText = text.toLowerCase();

    if (/(退款|退货|退钱|不想买|不要了|cancel|refund)/.test(lowerText)) {
      return Math.random() > 0.2 ? 'refund' : originalIntent;
    }
    if (/(换货|换一个|换尺码|大小不合适|exchange)/.test(lowerText)) {
      return Math.random() > 0.25 ? 'exchange' : originalIntent;
    }
    if (/(投诉|差评|举报|垃圾|太差|坑爹|complain)/.test(lowerText)) {
      return Math.random() > 0.15 ? 'complaint' : originalIntent;
    }
    if (/(技术|故障|bug|坏了|打不开|加载|technical|error|问题)/.test(lowerText) && /(网页|系统|页面|app|软件)/.test(lowerText)) {
      return Math.random() > 0.3 ? 'technical_support' : originalIntent;
    }
    if (/(怎么|如何|请问|什么时候|能不能|多少|有没有|可以|是否|查询|发货|物流)/.test(lowerText)) {
      return Math.random() > 0.2 ? 'inquiry' : originalIntent;
    }

    return Math.random() > 0.85 ? (VALID_INTENTS[Math.floor(Math.random() * VALID_INTENTS.length)]) : originalIntent;
  }

  private calculateConfidence(text: string, original: Intent, predicted: Intent): number {
    const baseConfidence = original === predicted ? 0.92 : 0.72;
    const lengthFactor = Math.min(text.length / 100, 1) * 0.05;
    const randomFactor = (Math.random() - 0.5) * 0.1;
    return Math.max(0.55, Math.min(0.98, baseConfidence + lengthFactor + randomFactor));
  }

  private async parseCsv(filePath: string): Promise<any[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: reject
      });
    });
  }

  private parseExcel(filePath: string): any[] {
    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet);
  }

  private parseJson(filePath: string): any[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  }

  private getSourceTypeName(type: MaterialSource): string {
    const names: Record<MaterialSource, string> = {
      annotation_record: '标注记录',
      segmentation_list: '切分清单',
      training_sample: '训练样本'
    };
    return names[type];
  }
}
