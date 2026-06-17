import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import prisma from '../lib/prisma';
import { EvaluationService } from './evaluation.service';
import { EvaluationRecordCreateInput, EvaluationRecordDetail, STATUS_TEXT_MAP, MODEL_TYPE_TEXT_MAP } from '../types';
import { generateBatchId, getStatusText } from '../utils/common';
import { EvaluationStatus, ModelType } from '@prisma/client';

export class CsvService {
  static async importFromFile(
    filePath: string,
    modelVersionId: string,
    operator?: string
  ): Promise<{
    batchId: string;
    total: number;
    success: number;
    failed: number;
    duplicates: number;
    errors: string[];
  }> {
    const batchId = generateBatchId();
    const records: EvaluationRecordCreateInput[] = [];
    const errors: string[] = [];
    let rowNum = 0;

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => {
          rowNum++;
          try {
            const record = this.parseCsvRow(row, rowNum, modelVersionId, batchId);
            records.push(record);
          } catch (e: any) {
            errors.push(`第${rowNum}行: ${e.message}`);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const results = await EvaluationService.batchCreate(records, operator);
    const duplicates = results.filter((r) => r.isDuplicate).length;

    await prisma.importBatch.create({
      data: {
        id: batchId,
        fileName: path.basename(filePath),
        recordCount: records.length,
        importedBy: operator,
      },
    });

    return {
      batchId,
      total: records.length,
      success: results.length,
      failed: errors.length,
      duplicates,
      errors,
    };
  }

  private static parseCsvRow(
    row: any,
    rowNum: number,
    modelVersionId: string,
    batchId: string
  ): EvaluationRecordCreateInput {
    const medicalRecordId = row['病历ID'] || row['medicalRecordId'];
    const questionId = row['问题ID'] || row['questionId'];
    const questionContent = row['问题内容'] || row['questionContent'];
    const modelAnswer = row['模型回答'] || row['modelAnswer'];

    if (!medicalRecordId) {
      throw new Error('缺少病历ID');
    }
    if (!questionId) {
      throw new Error('缺少问题ID');
    }
    if (!questionContent) {
      throw new Error('缺少问题内容');
    }
    if (!modelAnswer) {
      throw new Error('缺少模型回答');
    }

    const isCorrectStr = row['是否正确'] || row['isCorrect'];
    const isCorrect = isCorrectStr
      ? isCorrectStr === '是' || isCorrectStr === 'true' || isCorrectStr === '1'
      : undefined;

    const confidenceStr = row['置信度'] || row['confidence'];
    const confidence = confidenceStr ? parseFloat(confidenceStr) : undefined;

    return {
      batchId,
      medicalRecordId: String(medicalRecordId),
      questionId: String(questionId),
      questionContent: String(questionContent),
      modelAnswer: String(modelAnswer),
      standardAnswer: row['标准答案'] || row['standardAnswer'] || undefined,
      modelVersionId,
      isCorrect,
      confidence,
      errorType: row['错误类型'] || row['errorType'] || undefined,
      judgeReason: row['判定理由'] || row['judgeReason'] || undefined,
    };
  }

  static async exportToFile(
    params: {
      batchId?: string;
      status?: EvaluationStatus;
      medicalRecordId?: string;
      modelVersionId?: string;
      isDuplicate?: boolean;
      hasWithdrawal?: boolean;
    },
    outputDir: string
  ): Promise<string> {
    const { list } = await EvaluationService.list({
      ...params,
      pageSize: 10000,
    });

    const fileName = `病历问答灰度对比_${new Date().toISOString().slice(0, 10)}.csv`;
    const filePath = path.join(outputDir, fileName);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'medicalRecordId', title: '病历ID' },
        { id: 'questionId', title: '问题ID' },
        { id: 'questionContent', title: '问题内容' },
        { id: 'modelAnswer', title: '模型回答' },
        { id: 'standardAnswer', title: '标准答案' },
        { id: 'modelName', title: '模型名称' },
        { id: 'modelType', title: '模型类型' },
        { id: 'modelVersion', title: '模型版本' },
        { id: 'isCorrect', title: '是否正确' },
        { id: 'confidence', title: '置信度' },
        { id: 'errorType', title: '错误类型' },
        { id: 'status', title: '状态' },
        { id: 'judgeReason', title: '判定理由' },
        { id: 'revisionReason', title: '改判理由' },
        { id: 'isDuplicate', title: '是否重复' },
        { id: 'duplicateOfId', title: '重复源记录ID' },
        { id: 'hasWithdrawal', title: '是否有撤回' },
        { id: 'withdrawalReason', title: '撤回原因' },
        { id: 'withdrawalOperator', title: '撤回操作人' },
        { id: 'withdrawalTime', title: '撤回时间' },
        { id: 'linkedConclusionId', title: '关联结论ID' },
        { id: 'finalConclusionStatus', title: '最终结论状态' },
        { id: 'finalConclusionResult', title: '最终结论结果' },
        { id: 'revisionExplanation', title: '新旧模型对比说明' },
        { id: 'confirmedBy', title: '确认人' },
        { id: 'confirmedAt', title: '确认时间' },
        { id: 'createdAt', title: '创建时间' },
        { id: 'evaluatedAt', title: '评测时间' },
      ],
    });

    const rows = list.map((record) => this.mapDetailToCsvRow(record));
    await csvWriter.writeRecords(rows);

    return filePath;
  }

  private static mapDetailToCsvRow(record: EvaluationRecordDetail): any {
    const isCorrectText = record.isCorrect === undefined
      ? ''
      : record.isCorrect ? '是' : '否';

    const finalConclusionResult = record.finalConclusionInfo
      ? record.finalConclusionInfo.isCorrect === undefined
        ? ''
        : record.finalConclusionInfo.isCorrect ? '正确' : '错误'
      : '';

    return {
      medicalRecordId: record.medicalRecordId,
      questionId: record.questionId,
      questionContent: record.questionContent,
      modelAnswer: record.modelAnswer,
      standardAnswer: record.standardAnswer || '',
      modelName: record.modelVersion.name,
      modelType: MODEL_TYPE_TEXT_MAP[record.modelVersion.type],
      modelVersion: record.modelVersion.version,
      isCorrect: isCorrectText,
      confidence: record.confidence !== undefined ? record.confidence.toFixed(2) : '',
      errorType: record.errorType || '',
      status: record.statusText,
      judgeReason: record.judgeReason || '',
      revisionReason: record.revisionReason || '',
      isDuplicate: record.isDuplicate ? '是' : '否',
      duplicateOfId: record.duplicateOfId || '',
      hasWithdrawal: record.hasWithdrawal ? '是' : '否',
      withdrawalReason: record.withdrawalInfo?.reason || '',
      withdrawalOperator: record.withdrawalInfo?.operator || '',
      withdrawalTime: record.withdrawalInfo?.createdAt || '',
      linkedConclusionId: record.withdrawalInfo?.linkedConclusionId || '',
      finalConclusionStatus: record.finalConclusionInfo?.statusText || '',
      finalConclusionResult,
      revisionExplanation: record.revisionComparison?.revisionExplanation || '',
      confirmedBy: record.confirmedBy || '',
      confirmedAt: record.confirmedAt || '',
      createdAt: record.createdAt,
      evaluatedAt: record.evaluatedAt || '',
    };
  }

  static async generateExportData(params: {
    batchId?: string;
    status?: EvaluationStatus;
  }) {
    const { list } = await EvaluationService.list({
      ...params,
      pageSize: 10000,
    });

    const headers = [
      '病历ID', '问题ID', '问题内容', '模型回答', '标准答案',
      '模型名称', '模型类型', '模型版本', '是否正确', '置信度',
      '错误类型', '状态', '判定理由', '改判理由', '是否重复',
      '重复源记录ID', '是否有撤回', '撤回原因', '撤回操作人', '撤回时间',
      '关联结论ID', '最终结论状态', '最终结论结果', '新旧模型对比说明',
      '确认人', '确认时间', '创建时间', '评测时间'
    ];

    const rows = list.map((record) => {
      const row = this.mapDetailToCsvRow(record);
      return [
        row.medicalRecordId,
        row.questionId,
        row.questionContent,
        row.modelAnswer,
        row.standardAnswer,
        row.modelName,
        row.modelType,
        row.modelVersion,
        row.isCorrect,
        row.confidence,
        row.errorType,
        row.status,
        row.judgeReason,
        row.revisionReason,
        row.isDuplicate,
        row.duplicateOfId,
        row.hasWithdrawal,
        row.withdrawalReason,
        row.withdrawalOperator,
        row.withdrawalTime,
        row.linkedConclusionId,
        row.finalConclusionStatus,
        row.finalConclusionResult,
        row.revisionExplanation,
        row.confirmedBy,
        row.confirmedAt,
        row.createdAt,
        row.evaluatedAt,
      ];
    });

    return { headers, rows, total: rows.length };
  }
}
