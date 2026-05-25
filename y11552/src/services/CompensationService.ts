import { v4 as uuidv4 } from 'uuid';
import { FactDAO, QueueDAO, AuditDAO } from '../database/dao';
import {
  CompensationFact,
  FactStatus,
  RetryCategory,
  OperationType,
  SubmitFactRequest,
  ManualDecisionRequest,
  ExportRequest,
  ExternalReceipt
} from '../types';
import { config } from '../config';

function formatDateTime(date: Date): string {
  return date.toISOString();
}

function detectRetryCategory(fact: CompensationFact): RetryCategory | null {
  if (fact.replenishPhotos.length === 0) {
    return RetryCategory.MISSING_ATTACHMENT;
  }

  if (fact.externalReceipts.length === 0) {
    return RetryCategory.EXTERNAL_API_DOWN;
  }

  const failedReceipt = fact.externalReceipts.find(r => r.status === 'failed');
  if (failedReceipt) {
    return RetryCategory.NETWORK_ISSUE;
  }

  const inventory = fact.cabinetInventory;
  if (inventory.expectedQuantity !== inventory.actualQuantity) {
    return RetryCategory.DATA_CONFLICT;
  }

  return null;
}

export const CompensationService = {
  async submitFact(request: SubmitFactRequest, ipAddress?: string, userAgent?: string): Promise<{ fact: CompensationFact; isNew: boolean }> {
    const existingFact = await FactDAO.findByIdempotencyKey(request.idempotencyKey);

    if (existingFact) {
      await AuditDAO.create(
        existingFact.factId,
        OperationType.UPDATE,
        request.createdBy,
        request.createdBy,
        { status: existingFact.status, retryCount: existingFact.retryCount },
        { status: existingFact.status, retryCount: existingFact.retryCount },
        `重复提交，幂等性键已存在: ${request.idempotencyKey}`,
        ipAddress,
        userAgent
      );
      return { fact: existingFact, isNew: false };
    }

    const fact = await FactDAO.create(request);

    await AuditDAO.create(
      fact.factId,
      OperationType.SUBMIT,
      request.createdBy,
      request.createdBy,
      {},
      { ...fact },
      `创建补偿事实记录，批次: ${request.batchId}`,
      ipAddress,
      userAgent
    );

    const retryCategory = detectRetryCategory(fact);
    if (retryCategory) {
      const now = formatDateTime(new Date());
      const nextRetry = new Date(Date.now() + config.retry.intervalMinutes * 60 * 1000);
      await FactDAO.updateRetryInfo(
        fact.factId,
        0,
        retryCategory,
        now,
        formatDateTime(nextRetry)
      );
      await FactDAO.updateStatus(fact.factId, FactStatus.RETRYING);
      await QueueDAO.create(fact.factId, retryCategory);
    } else {
      await FactDAO.updateStatus(fact.factId, FactStatus.VERIFIED);
    }

    const updatedFact = await FactDAO.findByFactId(fact.factId);
    if (!updatedFact) throw new Error('Failed to retrieve fact');

    return { fact: updatedFact, isNew: true };
  },

  async getFact(factId: string): Promise<CompensationFact | undefined> {
    return FactDAO.findByFactId(factId);
  },

  async getFacts(options?: { 
    city?: string; 
    status?: FactStatus[]; 
    startDate?: string; 
    endDate?: string;
    batchId?: string;
  }): Promise<CompensationFact[]> {
    if (options?.batchId) {
      return FactDAO.findByBatchId(options.batchId);
    }
    return FactDAO.findAll(options);
  },

  async getFactHistory(factId: string): Promise<any[]> {
    const logs = await AuditDAO.findByFactId(factId);
    return logs.map(log => ({
      time: log.createdAt,
      operator: log.operatorName,
      operation: log.operationType,
      summary: log.changeSummary,
      oldValues: log.oldValues,
      newValues: log.newValues
    }));
  },

  async processManualDecision(request: ManualDecisionRequest, ipAddress?: string, userAgent?: string): Promise<CompensationFact> {
    const fact = await FactDAO.findByFactId(request.factId);
    if (!fact) {
      throw new Error('Fact not found');
    }

    if (fact.frozen) {
      throw new Error('Fact is frozen, cannot modify');
    }

    const oldValues = { status: fact.status, assignedTo: fact.assignedTo };
    let newStatus = fact.status;
    let summary = '';

    switch (request.decision) {
      case 'approve':
        newStatus = FactStatus.VERIFIED;
        summary = `人工审核通过，原因: ${request.reason}`;
        break;
      case 'reject':
        newStatus = FactStatus.CLOSED;
        summary = `人工审核拒绝，原因: ${request.reason}`;
        break;
      case 'retry':
        newStatus = FactStatus.RETRYING;
        summary = `人工发起重试，原因: ${request.reason}`;
        const category = request.newCategory || fact.retryCategory || RetryCategory.UNKNOWN_ERROR;
        await QueueDAO.create(fact.factId, category);
        break;
      case 'compensate':
        await FactDAO.compensate(fact.factId, request.operatorId);
        summary = `人工补偿入账，原因: ${request.reason}`;
        newStatus = FactStatus.COMPENSATED;
        break;
    }

    if (newStatus !== fact.status) {
      await FactDAO.updateStatus(fact.factId, newStatus);
    }

    await FactDAO.assignTo(fact.factId, request.operatorId);

    const updatedFact = await FactDAO.findByFactId(fact.factId);
    if (!updatedFact) throw new Error('Failed to retrieve updated fact');

    await AuditDAO.create(
      fact.factId,
      OperationType.MANUAL_DECISION,
      request.operatorId,
      request.operatorName,
      oldValues,
      { status: newStatus, assignedTo: request.operatorId },
      summary,
      ipAddress,
      userAgent
    );

    return updatedFact;
  },

  async closeFact(factId: string, operatorId: string, operatorName: string, reason: string): Promise<CompensationFact> {
    const fact = await FactDAO.findByFactId(factId);
    if (!fact) {
      throw new Error('Fact not found');
    }

    if (fact.frozen) {
      throw new Error('Fact is frozen, cannot close');
    }

    await FactDAO.close(factId, operatorId);

    await AuditDAO.create(
      factId,
      OperationType.CLOSE,
      operatorId,
      operatorName,
      { status: fact.status },
      { status: FactStatus.CLOSED },
      `关闭补偿记录: ${reason}`
    );

    const updatedFact = await FactDAO.findByFactId(factId);
    if (!updatedFact) throw new Error('Failed to retrieve updated fact');
    return updatedFact;
  },

  async compensateFact(factId: string, operatorId: string, operatorName: string): Promise<CompensationFact> {
    const fact = await FactDAO.findByFactId(factId);
    if (!fact) {
      throw new Error('Fact not found');
    }

    if (fact.frozen) {
      throw new Error('Fact is frozen, cannot compensate');
    }

    await FactDAO.compensate(factId, operatorId);

    await AuditDAO.create(
      factId,
      OperationType.COMPENSATE,
      operatorId,
      operatorName,
      { status: fact.status },
      { status: FactStatus.COMPENSATED },
      '补偿入账处理完成'
    );

    const updatedFact = await FactDAO.findByFactId(factId);
    if (!updatedFact) throw new Error('Failed to retrieve updated fact');
    return updatedFact;
  },

  async addExternalReceipt(factId: string, receipt: ExternalReceipt, operatorId: string, operatorName: string): Promise<CompensationFact> {
    const fact = await FactDAO.findByFactId(factId);
    if (!fact) {
      throw new Error('Fact not found');
    }

    await FactDAO.addExternalReceipt(factId, receipt);

    await AuditDAO.create(
      factId,
      OperationType.UPDATE,
      operatorId,
      operatorName,
      { receiptCount: fact.externalReceipts.length },
      { receiptCount: fact.externalReceipts.length + 1 },
      `添加外部回执: ${receipt.receiptId}`
    );

    const updatedFact = await FactDAO.findByFactId(factId);
    if (!updatedFact) throw new Error('Failed to retrieve updated fact');
    return updatedFact;
  },

  async freezeFact(factId: string, operatorId: string, operatorName: string): Promise<void> {
    const fact = await FactDAO.findByFactId(factId);
    if (!fact) {
      throw new Error('Fact not found');
    }

    await FactDAO.freeze(factId, operatorId);

    await AuditDAO.create(
      factId,
      OperationType.FREEZE,
      operatorId,
      operatorName,
      { frozen: fact.frozen },
      { frozen: true },
      '冻结记录'
    );
  },

  async freezeForExport(factIds: string[], operatorId: string, operatorName: string): Promise<void> {
    for (const factId of factIds) {
      const fact = await FactDAO.findByFactId(factId);
      if (!fact) continue;

      await FactDAO.freeze(factId, operatorId);
      
      await AuditDAO.create(
        factId,
        OperationType.FREEZE,
        operatorId,
        operatorName,
        { frozen: fact.frozen },
        { frozen: true },
        '导出前冻结记录'
      );
    }
  },

  async unfreezeFact(factId: string, operatorId: string, operatorName: string): Promise<void> {
    const fact = await FactDAO.findByFactId(factId);
    if (!fact) {
      throw new Error('Fact not found');
    }

    await FactDAO.unfreeze(factId);

    await AuditDAO.create(
      factId,
      OperationType.UNFREEZE,
      operatorId,
      operatorName,
      { frozen: true },
      { frozen: false },
      '解冻记录'
    );
  },

  async exportFacts(request: ExportRequest): Promise<any[]> {
    let factIds: string[];
    
    if (request.batchId) {
      const facts = await FactDAO.findByBatchId(request.batchId);
      const filtered = facts.filter(f => {
        if (request.city && f.city !== request.city) return false;
        if (request.status && !request.status.includes(f.status)) return false;
        return true;
      });
      factIds = filtered.map(f => f.factId);
    } else {
      const facts = await FactDAO.findAll({
        city: request.city,
        startDate: request.startDate,
        endDate: request.endDate,
        status: request.status
      });
      factIds = facts.map(f => f.factId);
    }

    await this.freezeForExport(factIds, request.operatorId, request.operatorName);

    const frozenFacts = await Promise.all(
      factIds.map(id => FactDAO.findByFactId(id))
    );

    return frozenFacts
      .filter((f): f is NonNullable<typeof f> => f !== undefined)
      .map(fact => ({
        factId: fact.factId,
        batchId: fact.batchId,
        city: fact.city,
        status: fact.status,
        cabinetId: fact.cabinetInventory.cabinetId,
        slotId: fact.cabinetInventory.slotId,
        productId: fact.cabinetInventory.productId,
        expectedQuantity: fact.cabinetInventory.expectedQuantity,
        actualQuantity: fact.cabinetInventory.actualQuantity,
        photoCount: fact.replenishPhotos.length,
        refundCount: fact.refundRecords.length,
        totalRefundAmount: fact.refundRecords.reduce((sum, r) => sum + r.amount, 0),
        receiptCount: fact.externalReceipts.length,
        retryCount: fact.retryCount,
        retryCategory: fact.retryCategory,
        frozen: fact.frozen,
        createdAt: fact.createdAt,
        createdBy: fact.createdBy
      }));
  },

  async getOperationDashboard(city?: string): Promise<any> {
    const queueStats = await QueueDAO.getStatistics();
    const allFacts = await FactDAO.findAll(city ? { city } : undefined);

    const statusCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    for (const fact of allFacts) {
      statusCounts[fact.status] = (statusCounts[fact.status] || 0) + 1;
      if (fact.retryCategory) {
        categoryCounts[fact.retryCategory] = (categoryCounts[fact.retryCategory] || 0) + 1;
      }
    }

    const deadLetterFacts = allFacts.filter(f => f.status === FactStatus.DEAD_LETTER);
    const retryableFacts = allFacts.filter(f => 
      f.status === FactStatus.RETRYING && 
      f.retryCount < config.retry.maxCount
    );

    return {
      overview: {
        total: allFacts.length,
        pending: statusCounts[FactStatus.PENDING] || 0,
        retrying: statusCounts[FactStatus.RETRYING] || 0,
        verified: statusCounts[FactStatus.VERIFIED] || 0,
        manualReview: statusCounts[FactStatus.MANUAL_REVIEW] || 0,
        compensated: statusCounts[FactStatus.COMPENSATED] || 0,
        deadLetter: statusCounts[FactStatus.DEAD_LETTER] || 0,
        closed: statusCounts[FactStatus.CLOSED] || 0
      },
      retryQueue: {
        total: queueStats.total,
        byCategory: categoryCounts,
        retryable: retryableFacts.length,
        deadLetter: deadLetterFacts.length
      },
      retryCategories: Object.entries(categoryCounts).map(([name, count]) => ({
        name,
        count,
        canRetry: name !== RetryCategory.INVALID_DATA
      })),
      deadLetter: {
        count: deadLetterFacts.length,
        items: deadLetterFacts.slice(0, 20).map(f => ({
          factId: f.factId,
          batchId: f.batchId,
          category: f.retryCategory,
          retryCount: f.retryCount,
          lastError: f.remarks
        }))
      },
      recoveryQueue: {
        count: retryableFacts.length,
        nextRetry: retryableFacts
          .filter(f => f.nextRetryAt)
          .sort((a, b) => new Date(a.nextRetryAt!).getTime() - new Date(b.nextRetryAt!).getTime())
          .slice(0, 10)
          .map(f => ({
            factId: f.factId,
            batchId: f.batchId,
            category: f.retryCategory,
            nextRetryAt: f.nextRetryAt,
            retryCount: f.retryCount
          }))
      }
    };
  }
};
