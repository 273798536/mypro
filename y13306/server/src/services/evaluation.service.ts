import prisma from '../lib/prisma';
import {
  EvaluationRecordCreateInput,
  EvaluationRecordDetail,
} from '../types';
import {
  getStatusText,
  formatDate,
  generateDuplicateKey,
  generateRevisionExplanation,
} from '../utils/common';
import { EvaluationStatus, ModelType } from '@prisma/client';

export class EvaluationService {
  static async checkDuplicate(
    medicalRecordId: string,
    questionId: string,
    excludeId?: string
  ): Promise<{ isDuplicate: boolean; duplicateOfId?: string }> {
    const existing = await prisma.evaluationRecord.findFirst({
      where: {
        medicalRecordId,
        questionId,
        isDuplicate: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    if (existing) {
      return { isDuplicate: true, duplicateOfId: existing.id };
    }
    return { isDuplicate: false };
  }

  static async createRecord(
    data: EvaluationRecordCreateInput,
    operator?: string
  ): Promise<EvaluationRecordDetail> {
    const duplicateCheck = await this.checkDuplicate(
      data.medicalRecordId,
      data.questionId
    );

    const record = await prisma.evaluationRecord.create({
      data: {
        ...data,
        status: duplicateCheck.isDuplicate
          ? EvaluationStatus.DUPLICATE
          : data.isCorrect !== undefined
          ? EvaluationStatus.EVALUATED
          : EvaluationStatus.PENDING,
        isDuplicate: duplicateCheck.isDuplicate,
        duplicateOfId: duplicateCheck.duplicateOfId,
        evaluatedAt: data.isCorrect !== undefined ? new Date() : null,
      },
      include: {
        modelVersion: true,
      },
    });

    await this.createChangeHistory(
      record.id,
      'CREATE',
      null,
      JSON.stringify(data),
      '创建评测记录',
      operator
    );

    return this.getDetail(record.id);
  }

  static async batchCreate(
    records: EvaluationRecordCreateInput[],
    operator?: string
  ): Promise<EvaluationRecordDetail[]> {
    const results: EvaluationRecordDetail[] = [];
    const processedKeys = new Set<string>();

    for (const recordData of records) {
      const key = generateDuplicateKey(
        recordData.medicalRecordId,
        recordData.questionId
      );

      let duplicateCheck = { isDuplicate: false, duplicateOfId: undefined as string | undefined };

      if (processedKeys.has(key)) {
        const existingInBatch = results.find(
          (r) =>
            r.medicalRecordId === recordData.medicalRecordId &&
            r.questionId === recordData.questionId &&
            !r.isDuplicate
        );
        if (existingInBatch) {
          duplicateCheck = {
            isDuplicate: true,
            duplicateOfId: existingInBatch.id,
          };
        }
      } else {
        duplicateCheck = await this.checkDuplicate(
          recordData.medicalRecordId,
          recordData.questionId
        );
      }

      processedKeys.add(key);

      const record = await prisma.evaluationRecord.create({
        data: {
          ...recordData,
          status: duplicateCheck.isDuplicate
            ? EvaluationStatus.DUPLICATE
            : recordData.isCorrect !== undefined
            ? EvaluationStatus.EVALUATED
            : EvaluationStatus.PENDING,
          isDuplicate: duplicateCheck.isDuplicate,
          duplicateOfId: duplicateCheck.duplicateOfId,
          evaluatedAt: recordData.isCorrect !== undefined ? new Date() : null,
        },
        include: { modelVersion: true },
      });

      results.push(await this.getDetail(record.id));
    }

    return results;
  }

  static async getDetail(id: string): Promise<EvaluationRecordDetail> {
    const record = await prisma.evaluationRecord.findUniqueOrThrow({
      where: { id },
      include: {
        modelVersion: true,
        duplicateOf: {
          select: {
            id: true,
            medicalRecordId: true,
            questionId: true,
          },
        },
        withdrawal: true,
        finalConclusion: {
          include: { modelVersion: true },
        },
        changeHistories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const withdrawalInfo = record.withdrawal
      ? {
          id: record.withdrawal.id,
          reason: record.withdrawal.reason,
          operator: record.withdrawal.operator,
          createdAt: formatDate(record.withdrawal.createdAt)!,
          linkedConclusionId: record.withdrawal.linkedConclusionId,
        }
      : undefined;

    const finalConclusionInfo = record.finalConclusion
      ? {
          id: record.finalConclusion.id,
          status: record.finalConclusion.status,
          statusText: getStatusText(record.finalConclusion.status),
          isCorrect: record.finalConclusion.isCorrect ?? undefined,
          judgeReason: record.finalConclusion.judgeReason ?? undefined,
          revisionReason: record.finalConclusion.revisionReason ?? undefined,
        }
      : undefined;

    const revisionComparison = await this.getRevisionComparison(record);

    return {
      id: record.id,
      batchId: record.batchId,
      medicalRecordId: record.medicalRecordId,
      questionId: record.questionId,
      questionContent: record.questionContent,
      modelAnswer: record.modelAnswer,
      standardAnswer: record.standardAnswer ?? undefined,
      isCorrect: record.isCorrect ?? undefined,
      confidence: record.confidence ?? undefined,
      errorType: record.errorType ?? undefined,
      status: record.status,
      statusText: getStatusText(record.status),
      judgeReason: record.judgeReason ?? undefined,
      revisionReason: record.revisionReason ?? undefined,
      isDuplicate: record.isDuplicate,
      duplicateOfId: record.duplicateOfId ?? undefined,
      duplicateInfo: record.duplicateOf
        ? {
            id: record.duplicateOf.id,
            medicalRecordId: record.duplicateOf.medicalRecordId,
            questionId: record.duplicateOf.questionId,
          }
        : undefined,
      hasWithdrawal: record.hasWithdrawal,
      withdrawalInfo,
      finalConclusionId: record.finalConclusionId ?? undefined,
      finalConclusionInfo,
      modelVersion: {
        id: record.modelVersion.id,
        name: record.modelVersion.name,
        version: record.modelVersion.version,
        type: record.modelVersion.type,
      },
      changeHistories: record.changeHistories.map((h) => ({
        id: h.id,
        fieldName: h.fieldName,
        oldValue: h.oldValue ?? undefined,
        newValue: h.newValue ?? undefined,
        changeReason: h.changeReason ?? undefined,
        operator: h.operator ?? undefined,
        operationType: h.operationType,
        createdAt: formatDate(h.createdAt)!,
      })),
      revisionComparison,
      createdAt: formatDate(record.createdAt)!,
      evaluatedAt: formatDate(record.evaluatedAt),
      confirmedAt: formatDate(record.confirmedAt),
      confirmedBy: record.confirmedBy ?? undefined,
    };
  }

  static async getRevisionComparison(record: any) {
    if (record.modelVersion.type !== ModelType.NEW) {
      return undefined;
    }

    const oldRecord = await prisma.evaluationRecord.findFirst({
      where: {
        medicalRecordId: record.medicalRecordId,
        questionId: record.questionId,
        modelVersion: {
          type: ModelType.OLD,
        },
        isDuplicate: false,
      },
      include: { modelVersion: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!oldRecord) {
      return undefined;
    }

    return {
      oldModelVersion: {
        name: oldRecord.modelVersion.name,
        version: oldRecord.modelVersion.version,
        type: oldRecord.modelVersion.type,
      },
      oldIsCorrect: oldRecord.isCorrect ?? undefined,
      oldJudgeReason: oldRecord.judgeReason ?? undefined,
      newModelVersion: {
        name: record.modelVersion.name,
        version: record.modelVersion.version,
        type: record.modelVersion.type,
      },
      newIsCorrect: record.isCorrect ?? false,
      newJudgeReason: record.judgeReason ?? undefined,
      revisionExplanation: generateRevisionExplanation(
        oldRecord.isCorrect ?? undefined,
        record.isCorrect ?? false,
        oldRecord.judgeReason ?? undefined,
        record.judgeReason ?? undefined
      ),
    };
  }

  static async list(params: {
    batchId?: string;
    status?: EvaluationStatus;
    medicalRecordId?: string;
    modelVersionId?: string;
    isDuplicate?: boolean;
    hasWithdrawal?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{
    list: EvaluationRecordDetail[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      batchId,
      status,
      medicalRecordId,
      modelVersionId,
      isDuplicate,
      hasWithdrawal,
      page = 1,
      pageSize = 20,
    } = params;

    const where: any = {};
    if (batchId) where.batchId = batchId;
    if (status) where.status = status;
    if (medicalRecordId) where.medicalRecordId = medicalRecordId;
    if (modelVersionId) where.modelVersionId = modelVersionId;
    if (isDuplicate !== undefined) where.isDuplicate = isDuplicate;
    if (hasWithdrawal !== undefined) where.hasWithdrawal = hasWithdrawal;

    const [total, records] = await Promise.all([
      prisma.evaluationRecord.count({ where }),
      prisma.evaluationRecord.findMany({
        where,
        include: {
          modelVersion: true,
          duplicateOf: {
            select: { id: true, medicalRecordId: true, questionId: true },
          },
          withdrawal: true,
          finalConclusion: true,
          changeHistories: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const list = await Promise.all(
      records.map((r) => this.getDetail(r.id))
    );

    return { list, total, page, pageSize };
  }

  static async withdraw(
    id: string,
    reason: string,
    operator: string
  ): Promise<EvaluationRecordDetail> {
    const record = await prisma.evaluationRecord.findUniqueOrThrow({
      where: { id },
    });

    await prisma.withdrawalRecord.create({
      data: {
        evaluationRecordId: id,
        reason,
        operator,
      },
    });

    const updated = await prisma.evaluationRecord.update({
      where: { id },
      data: {
        status: EvaluationStatus.WITHDRAWN,
        hasWithdrawal: true,
      },
      include: { modelVersion: true },
    });

    await this.createChangeHistory(
      id,
      'UPDATE',
      getStatusText(record.status),
      getStatusText(updated.status),
      `撤回记录：${reason}`,
      operator,
      'status'
    );

    return this.getDetail(id);
  }

  static async linkWithdrawalToConclusion(
    withdrawalId: string,
    conclusionId: string,
    operator: string
  ): Promise<EvaluationRecordDetail> {
    const withdrawal = await prisma.withdrawalRecord.findUniqueOrThrow({
      where: { id: withdrawalId },
    });

    await prisma.withdrawalRecord.update({
      where: { id: withdrawalId },
      data: { linkedConclusionId: conclusionId },
    });

    await prisma.evaluationRecord.update({
      where: { id: withdrawal.evaluationRecordId },
      data: { finalConclusionId: conclusionId },
    });

    await this.createChangeHistory(
      withdrawal.evaluationRecordId,
      'UPDATE',
      withdrawal.evaluationRecordId,
      conclusionId,
      '关联撤回记录与最终结论',
      operator,
      'finalConclusionId'
    );

    return this.getDetail(withdrawal.evaluationRecordId);
  }

  static async confirm(
    id: string,
    operator: string,
    confirmReason?: string
  ): Promise<EvaluationRecordDetail> {
    const record = await prisma.evaluationRecord.findUniqueOrThrow({
      where: { id },
    });

    const updated = await prisma.evaluationRecord.update({
      where: { id },
      data: {
        status: EvaluationStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedBy: operator,
      },
    });

    await this.createChangeHistory(
      id,
      'UPDATE',
      getStatusText(record.status),
      getStatusText(updated.status),
      confirmReason || '人工确认评测结果',
      operator,
      'status'
    );

    return this.getDetail(id);
  }

  static async revise(
    id: string,
    isCorrect: boolean,
    judgeReason: string,
    revisionReason: string,
    operator: string
  ): Promise<EvaluationRecordDetail> {
    const record = await prisma.evaluationRecord.findUniqueOrThrow({
      where: { id },
    });

    const oldIsCorrect = record.isCorrect;
    const oldJudgeReason = record.judgeReason;
    const oldStatus = record.status;

    const updated = await prisma.evaluationRecord.update({
      where: { id },
      data: {
        isCorrect,
        judgeReason,
        revisionReason,
        status: EvaluationStatus.REVISED,
      },
    });

    await this.createChangeHistory(
      id,
      'UPDATE',
      oldIsCorrect?.toString(),
      isCorrect.toString(),
      revisionReason,
      operator,
      'isCorrect'
    );

    await this.createChangeHistory(
      id,
      'UPDATE',
      oldJudgeReason,
      judgeReason,
      revisionReason,
      operator,
      'judgeReason'
    );

    await this.createChangeHistory(
      id,
      'UPDATE',
      getStatusText(oldStatus),
      getStatusText(updated.status),
      revisionReason,
      operator,
      'status'
    );

    return this.getDetail(id);
  }

  static async createChangeHistory(
    evaluationRecordId: string,
    operationType: string,
    oldValue: string | null,
    newValue: string | null,
    changeReason?: string,
    operator?: string,
    fieldName: string = 'record'
  ) {
    return prisma.changeHistory.create({
      data: {
        evaluationRecordId,
        fieldName,
        oldValue,
        newValue,
        changeReason,
        operator,
        operationType,
      },
    });
  }

  static async getStatistics(batchId?: string) {
    const where: any = {};
    if (batchId) where.batchId = batchId;

    const records = await prisma.evaluationRecord.findMany({
      where,
      select: {
        status: true,
        isCorrect: true,
        isDuplicate: true,
        hasWithdrawal: true,
      },
    });

    const total = records.length;
    const evaluated = records.filter(
      (r) => r.status !== EvaluationStatus.PENDING
    ).length;
    const correct = records.filter((r) => r.isCorrect === true).length;
    const incorrect = records.filter((r) => r.isCorrect === false).length;
    const pending = records.filter(
      (r) => r.status === EvaluationStatus.PENDING
    ).length;
    const withdrawn = records.filter(
      (r) => r.status === EvaluationStatus.WITHDRAWN
    ).length;
    const confirmed = records.filter(
      (r) => r.status === EvaluationStatus.CONFIRMED
    ).length;
    const revised = records.filter(
      (r) => r.status === EvaluationStatus.REVISED
    ).length;
    const duplicates = records.filter((r) => r.isDuplicate).length;
    const hasWithdrawals = records.filter((r) => r.hasWithdrawal).length;

    const accuracy = evaluated > 0 ? (correct / evaluated) * 100 : 0;

    return {
      total,
      evaluated,
      pending,
      correct,
      incorrect,
      accuracy: Number(accuracy.toFixed(2)),
      withdrawn,
      confirmed,
      revised,
      duplicates,
      hasWithdrawals,
    };
  }
}
