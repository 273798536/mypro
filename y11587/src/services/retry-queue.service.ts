import { Repository, LessThanOrEqual, IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import {
  RetryQueue,
  QueueItemType,
  QueueStatus,
  RetryCategory,
} from "../entities/RetryQueue";
import { RetryLog, RetryActionType } from "../entities/RetryLog";
import { DeadLetter, DeadLetterStatus } from "../entities/DeadLetter";
import { OperationTrace, OperationType } from "../entities/OperationTrace";
import { addSeconds, formatISO } from "date-fns";

export class RetryQueueService {
  private retryQueueRepo: Repository<RetryQueue>;
  private retryLogRepo: Repository<RetryLog>;
  private deadLetterRepo: Repository<DeadLetter>;
  private operationTraceRepo: Repository<OperationTrace>;

  constructor() {
    this.retryQueueRepo = AppDataSource.getRepository(RetryQueue);
    this.retryLogRepo = AppDataSource.getRepository(RetryLog);
    this.deadLetterRepo = AppDataSource.getRepository(DeadLetter);
    this.operationTraceRepo = AppDataSource.getRepository(OperationTrace);
  }

  async enqueue(
    itemType: QueueItemType,
    payload: any,
    options: {
      contractId?: string;
      paymentNodeId?: string;
      maxRetries?: number;
      retryInterval?: number;
      source?: string;
      sourceRef?: string;
      createdBy?: string;
    } = {}
  ): Promise<RetryQueue> {
    const queueItem = this.retryQueueRepo.create({
      itemType,
      contractId: options.contractId,
      paymentNodeId: options.paymentNodeId,
      payload: JSON.stringify(payload),
      status: "PENDING",
      maxRetries: options.maxRetries || 3,
      retryInterval: options.retryInterval || 60,
      source: options.source,
      sourceRef: options.sourceRef,
    });

    const saved = await this.retryQueueRepo.save(queueItem);

    await this.logAction(
      saved.id,
      "ENQUEUE",
      null,
      "PENDING",
      `任务入队成功，类型: ${itemType}`,
      options.createdBy,
      saved.payload
    );

    await this.traceOperation(
      "ENQUEUE",
      "RetryQueue",
      saved.id,
      null,
      JSON.stringify(saved),
      "任务入队",
      options.createdBy
    );

    return saved;
  }

  async processNext(): Promise<RetryQueue | null> {
    const now = formatISO(new Date());

    const pendingItems = await this.retryQueueRepo.find({
      where: [
        { status: "PENDING" as QueueStatus, isDeleted: false },
        {
          status: "RETRYING" as QueueStatus,
          isDeleted: false,
          nextRetryAt: LessThanOrEqual(now),
        },
      ],
      order: { createdAt: "ASC" },
      take: 10,
    });

    for (const item of pendingItems) {
      if (item.nextRetryAt && new Date(item.nextRetryAt) > new Date()) {
        continue;
      }

      try {
        item.status = "PROCESSING";
        await this.retryQueueRepo.save(item);

        await this.logAction(
          item.id,
          "PROCESS",
          item.status,
          "PROCESSING",
          "开始处理任务",
          "system",
          item.payload
        );

        return item;
      } catch (error) {
        console.error(`处理任务 ${item.id} 失败:`, error);
      }
    }

    return null;
  }

  async markSuccess(
    itemId: string,
    message: string = "处理成功",
    operator?: string
  ): Promise<RetryQueue> {
    const item = await this.retryQueueRepo.findOneBy({ id: itemId });
    if (!item) throw new Error("任务不存在");

    const previousStatus = item.status;
    item.status = "SUCCESS";
    item.processedAt = formatISO(new Date());

    const saved = await this.retryQueueRepo.save(item);

    await this.logAction(
      itemId,
      "SUCCESS",
      previousStatus,
      "SUCCESS",
      message,
      operator || "system"
    );

    await this.traceOperation(
      "UPDATE",
      "RetryQueue",
      itemId,
      JSON.stringify({ status: previousStatus }),
      JSON.stringify({ status: "SUCCESS" }),
      message,
      operator
    );

    return saved;
  }

  async markFailed(
    itemId: string,
    error: Error | string,
    operator?: string
  ): Promise<RetryQueue> {
    const item = await this.retryQueueRepo.findOneBy({ id: itemId });
    if (!item) throw new Error("任务不存在");

    const previousStatus = item.status;
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    item.retryCount = item.retryCount + 1;
    item.lastError = errorMessage;
    item.errorStack = errorStack;
    item.retryCategory = this.categorizeError(errorMessage);

    if (item.retryCount >= item.maxRetries) {
      item.status = "DEAD_LETTER";
      await this.moveToDeadLetter(item, errorMessage);

      await this.logAction(
        itemId,
        "DEAD_LETTER",
        previousStatus,
        "DEAD_LETTER",
        `重试次数已达上限(${item.maxRetries})，移入死信队列`,
        operator || "system"
      );
    } else {
      item.status = "RETRYING";
      item.nextRetryAt = formatISO(
        addSeconds(new Date(), item.retryInterval * Math.pow(2, item.retryCount))
      );

      await this.logAction(
        itemId,
        "RETRY",
        previousStatus,
        "RETRYING",
        `第 ${item.retryCount} 次重试失败，下次重试时间: ${item.nextRetryAt}`,
        operator || "system",
        item.payload
      );
    }

    return await this.retryQueueRepo.save(item);
  }

  async manualIntervention(
    itemId: string,
    handler: string,
    remark: string
  ): Promise<RetryQueue> {
    const item = await this.retryQueueRepo.findOneBy({ id: itemId });
    if (!item) throw new Error("任务不存在");

    const previousStatus = item.status;
    item.status = "MANUAL_INTERVENTION";
    item.isManuallyHandled = true;
    item.handledBy = handler;
    item.handleRemark = remark;

    const saved = await this.retryQueueRepo.save(item);

    await this.logAction(
      itemId,
      "MANUAL_INTERVENTION",
      previousStatus,
      "MANUAL_INTERVENTION",
      `人工接管: ${remark}`,
      handler
    );

    await this.traceOperation(
      "MANUAL_CORRECT",
      "RetryQueue",
      itemId,
      null,
      JSON.stringify({ status: "MANUAL_INTERVENTION", handler, remark }),
      remark,
      handler
    );

    return saved;
  }

  async manualResolve(
    itemId: string,
    resolvedBy: string,
    resolution: string,
    isSuccess: boolean = true
  ): Promise<RetryQueue> {
    const item = await this.retryQueueRepo.findOneBy({ id: itemId });
    if (!item) throw new Error("任务不存在");

    const previousStatus = item.status;

    if (isSuccess) {
      item.status = "SUCCESS";
      item.processedAt = formatISO(new Date());
    } else {
      item.status = "CANCELLED";
    }

    const saved = await this.retryQueueRepo.save(item);

    await this.logAction(
      itemId,
      isSuccess ? "SUCCESS" : "CANCEL",
      previousStatus,
      item.status,
      `人工处理完成: ${resolution}`,
      resolvedBy
    );

    return saved;
  }

  async resurrectDeadLetter(
    deadLetterId: string,
    resurrectedBy: string,
    newMaxRetries?: number
  ): Promise<RetryQueue> {
    const deadLetter = await this.deadLetterRepo.findOneBy({ id: deadLetterId });
    if (!deadLetter) throw new Error("死信记录不存在");

    const newQueueItem = this.retryQueueRepo.create({
      itemType: deadLetter.itemType as QueueItemType,
      contractId: deadLetter.contractId,
      paymentNodeId: deadLetter.paymentNodeId,
      payload: deadLetter.originalPayload,
      status: "PENDING",
      retryCategory: deadLetter.retryCategory as RetryCategory,
      retryCount: 0,
      maxRetries: newMaxRetries || 3,
      retryInterval: 60,
      source: "dead_letter_resurrection",
      sourceRef: deadLetterId,
    });

    const saved = await this.retryQueueRepo.save(newQueueItem);

    deadLetter.status = "RESOLVED";
    deadLetter.isResurrected = true;
    deadLetter.resurrectedToQueueId = saved.id;
    deadLetter.resolvedBy = resurrectedBy;
    deadLetter.resolvedAt = formatISO(new Date());
    deadLetter.resolveRemark = "死信复活，重新入队";
    await this.deadLetterRepo.save(deadLetter);

    await this.logAction(
      saved.id,
      "RESURRECT",
      null,
      "PENDING",
      `从死信队列复活，原死信ID: ${deadLetterId}`,
      resurrectedBy,
      saved.payload
    );

    return saved;
  }

  private async moveToDeadLetter(
    item: RetryQueue,
    finalError: string
  ): Promise<DeadLetter> {
    const deadLetter = this.deadLetterRepo.create({
      retryQueueId: item.id,
      itemType: item.itemType,
      contractId: item.contractId,
      paymentNodeId: item.paymentNodeId,
      originalPayload: item.payload,
      retryCategory: item.retryCategory,
      retryCount: item.retryCount,
      finalError,
      status: "PENDING",
    });

    return await this.deadLetterRepo.save(deadLetter);
  }

  private categorizeError(errorMessage: string): RetryCategory {
    const msg = errorMessage.toLowerCase();

    if (msg.includes("network") || msg.includes("timeout") || msg.includes("connection")) {
      return "NETWORK_ERROR";
    }
    if (msg.includes("validation") || msg.includes("invalid")) {
      return "VALIDATION_ERROR";
    }
    if (msg.includes("missing") || msg.includes("required") || msg.includes("null")) {
      return "MISSING_DATA";
    }
    if (msg.includes("cross") || msg.includes("day") || msg.includes("date")) {
      return "CROSS_DAY_ISSUE";
    }
    if (msg.includes("name") || msg.includes("duplicate")) {
      return "NAME_CONFLICT";
    }
    if (msg.includes("amount") || msg.includes("price")) {
      return "AMOUNT_CONFLICT";
    }
    if (msg.includes("quantity") || msg.includes("count")) {
      return "QUANTITY_CONFLICT";
    }
    if (msg.includes("system") || msg.includes("internal")) {
      return "SYSTEM_ERROR";
    }
    if (msg.includes("business") || msg.includes("rule")) {
      return "BUSINESS_RULE";
    }

    return "UNKNOWN";
  }

  private async logAction(
    retryQueueId: string,
    actionType: RetryActionType,
    previousStatus: string | null,
    newStatus: string,
    message: string,
    performedBy?: string,
    payloadSnapshot?: string
  ): Promise<any> {
    const log: any = {
      retryQueueId,
      actionType,
      previousStatus: previousStatus || undefined,
      newStatus,
      message,
      performedBy,
      payloadSnapshot,
    };
    return await this.retryLogRepo.save(log);
  }

  private async traceOperation(
    operationType: OperationType,
    entityType: string,
    entityId: string,
    beforeSnapshot: string | null,
    afterSnapshot: string | null,
    changeSummary: string,
    operator?: string
  ): Promise<any> {
    const trace: any = {
      operationType,
      entityType,
      entityId,
      beforeSnapshot: beforeSnapshot || undefined,
      afterSnapshot: afterSnapshot || undefined,
      changeSummary,
      operator,
    };
    return await this.operationTraceRepo.save(trace);
  }

  async getQueueStats() {
    const total = await this.retryQueueRepo.count({ where: { isDeleted: false } });
    const pending = await this.retryQueueRepo.count({
      where: { status: "PENDING", isDeleted: false },
    });
    const processing = await this.retryQueueRepo.count({
      where: { status: "PROCESSING", isDeleted: false },
    });
    const retrying = await this.retryQueueRepo.count({
      where: { status: "RETRYING", isDeleted: false },
    });
    const success = await this.retryQueueRepo.count({
      where: { status: "SUCCESS", isDeleted: false },
    });
    const failed = await this.retryQueueRepo.count({
      where: { status: "FAILED", isDeleted: false },
    });
    const manual = await this.retryQueueRepo.count({
      where: { status: "MANUAL_INTERVENTION", isDeleted: false },
    });
    const deadLetter = await this.deadLetterRepo.count({
      where: { status: "PENDING" as DeadLetterStatus },
    });

    const byCategory = await this.retryQueueRepo
      .createQueryBuilder("q")
      .select("q.retryCategory", "category")
      .addSelect("COUNT(*)", "count")
      .where("q.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere("q.retryCategory IS NOT NULL")
      .groupBy("q.retryCategory")
      .getRawMany();

    return {
      total,
      pending,
      processing,
      retrying,
      success,
      failed,
      manualIntervention: manual,
      deadLetter,
      byCategory,
    };
  }
}
