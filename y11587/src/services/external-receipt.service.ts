import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { ExternalReceipt, ReceiptStatus, ReceiptType } from "../entities/ExternalReceipt";
import { CompensationRecord, CompensationStatus } from "../entities/CompensationRecord";
import { OperationTrace, OperationType } from "../entities/OperationTrace";
import { RetryQueueService } from "./retry-queue.service";
import { formatISO } from "date-fns";
import { v4 as uuidv4 } from "uuid";

export class ExternalReceiptService {
  private externalReceiptRepo: Repository<ExternalReceipt>;
  private compensationRecordRepo: Repository<CompensationRecord>;
  private operationTraceRepo: Repository<OperationTrace>;
  private retryQueueService: RetryQueueService;

  constructor() {
    this.externalReceiptRepo = AppDataSource.getRepository(ExternalReceipt);
    this.compensationRecordRepo = AppDataSource.getRepository(CompensationRecord);
    this.operationTraceRepo = AppDataSource.getRepository(OperationTrace);
    this.retryQueueService = new RetryQueueService();
  }

  async submitReceipt(
    receiptType: ReceiptType,
    payload: any,
    options: {
      contractId?: string;
      paymentNodeId?: string;
      sourceSystem: string;
      sourceRefNo?: string;
      signature?: string;
      submittedBy?: string;
    }
  ): Promise<ExternalReceipt> {
    const receiptNo = this.generateReceiptNo();

    const receipt = this.externalReceiptRepo.create({
      receiptNo,
      receiptType,
      contractId: options.contractId,
      paymentNodeId: options.paymentNodeId,
      sourceSystem: options.sourceSystem,
      sourceRefNo: options.sourceRefNo,
      payload: JSON.stringify(payload),
      signature: options.signature,
      status: "RECEIVED",
    });

    const saved = await this.externalReceiptRepo.save(receipt);

    await this.retryQueueService.enqueue(
      "EXTERNAL_RECEIPT",
      { receiptId: saved.id, receiptNo, payload },
      {
        contractId: options.contractId,
        paymentNodeId: options.paymentNodeId,
        source: "external_receipt_submit",
        sourceRef: receiptNo,
        createdBy: options.submittedBy,
      }
    );

    await this.traceOperation(
      "SUBMIT",
      "ExternalReceipt",
      saved.id,
      null,
      JSON.stringify(saved),
      "外部回执提交",
      options.submittedBy
    );

    return saved;
  }

  async verifyReceipt(receiptId: string, verifiedBy: string): Promise<ExternalReceipt> {
    const receipt = await this.externalReceiptRepo.findOneBy({ id: receiptId });
    if (!receipt) throw new Error("回执不存在");

    const beforeSnapshot = JSON.stringify(receipt);

    const payload = JSON.parse(receipt.payload);
    const verificationResult = this.validateReceiptPayload(receipt.receiptType, payload);

    receipt.status = verificationResult.isValid ? "VERIFIED" : "REJECTED";
    receipt.verificationResult = JSON.stringify(verificationResult);
    if (!verificationResult.isValid) {
      receipt.rejectReason = verificationResult.errors?.join("; ");
    }
    receipt.processedBy = verifiedBy;
    receipt.processedAt = formatISO(new Date());

    const saved = await this.externalReceiptRepo.save(receipt);

    await this.traceOperation(
      "UPDATE",
      "ExternalReceipt",
      receiptId,
      beforeSnapshot,
      JSON.stringify(saved),
      verificationResult.isValid ? "回执验证通过" : "回执验证失败",
      verifiedBy
    );

    if (verificationResult.isValid) {
      await this.retryQueueService.enqueue(
        "COMPENSATION",
        { receiptId: saved.id, receiptNo: saved.receiptNo, payload },
        {
          contractId: saved.contractId,
          paymentNodeId: saved.paymentNodeId,
          source: "receipt_verification",
          sourceRef: saved.receiptNo,
          createdBy: verifiedBy,
        }
      );
    }

    return saved;
  }

  async createCompensation(
    compensationType: CompensationRecord["compensationType"],
    amount: number,
    options: {
      contractId?: string;
      paymentNodeId?: string;
      retryQueueId?: string;
      externalReceiptId?: string;
      reason: string;
      createdBy: string;
      currency?: string;
    }
  ): Promise<CompensationRecord> {
    const compensationNo = this.generateCompensationNo();

    const compensation = this.compensationRecordRepo.create({
      compensationNo,
      compensationType,
      amount,
      contractId: options.contractId,
      paymentNodeId: options.paymentNodeId,
      retryQueueId: options.retryQueueId,
      externalReceiptId: options.externalReceiptId,
      currency: options.currency || "CNY",
      reason: options.reason,
      createdBy: options.createdBy,
      status: "PENDING",
    });

    const saved = await this.compensationRecordRepo.save(compensation);

    await this.traceOperation(
      "CREATE",
      "CompensationRecord",
      saved.id,
      null,
      JSON.stringify(saved),
      "创建补偿记录",
      options.createdBy
    );

    return saved;
  }

  async approveCompensation(
    compensationId: string,
    approvedBy: string,
    remark?: string
  ): Promise<CompensationRecord> {
    const compensation = await this.compensationRecordRepo.findOneBy({
      id: compensationId,
    });
    if (!compensation) throw new Error("补偿记录不存在");

    const beforeSnapshot = JSON.stringify(compensation);

    compensation.status = "APPROVED";
    compensation.approvedBy = approvedBy;
    compensation.approvedAt = formatISO(new Date());
    if (remark) compensation.remark = remark;

    const saved = await this.compensationRecordRepo.save(compensation);

    await this.traceOperation(
      "APPROVE",
      "CompensationRecord",
      compensationId,
      beforeSnapshot,
      JSON.stringify(saved),
      remark || "补偿记录已批准",
      approvedBy
    );

    return saved;
  }

  async processCompensation(
    compensationId: string,
    processedBy: string,
    accountingRef?: string
  ): Promise<CompensationRecord> {
    const compensation = await this.compensationRecordRepo.findOneBy({
      id: compensationId,
    });
    if (!compensation) throw new Error("补偿记录不存在");

    const beforeSnapshot = JSON.stringify(compensation);

    compensation.status = "PROCESSING";
    compensation.processedBy = processedBy;

    const saved = await this.compensationRecordRepo.save(compensation);

    await this.retryQueueService.enqueue(
      "PAYMENT_PROCESS",
      {
        compensationId: saved.id,
        compensationNo: saved.compensationNo,
        amount: saved.amount,
      },
      {
        contractId: saved.contractId,
        paymentNodeId: saved.paymentNodeId,
        source: "compensation_process",
        sourceRef: saved.compensationNo,
        createdBy: processedBy,
      }
    );

    return saved;
  }

  async completeCompensation(
    compensationId: string,
    accountingRef: string,
    processedBy: string
  ): Promise<CompensationRecord> {
    const compensation = await this.compensationRecordRepo.findOneBy({
      id: compensationId,
    });
    if (!compensation) throw new Error("补偿记录不存在");

    const beforeSnapshot = JSON.stringify(compensation);

    compensation.status = "COMPLETED";
    compensation.accountingRef = accountingRef;
    compensation.processedAt = formatISO(new Date());
    if (!compensation.processedBy) {
      compensation.processedBy = processedBy;
    }

    const saved = await this.compensationRecordRepo.save(compensation);

    await this.traceOperation(
      "UPDATE",
      "CompensationRecord",
      compensationId,
      beforeSnapshot,
      JSON.stringify(saved),
      "补偿入账完成",
      processedBy
    );

    return saved;
  }

  async closeReceipt(receiptId: string, closedBy: string): Promise<ExternalReceipt> {
    const receipt = await this.externalReceiptRepo.findOneBy({ id: receiptId });
    if (!receipt) throw new Error("回执不存在");

    const beforeSnapshot = JSON.stringify(receipt);
    receipt.status = "COMPLETED";

    const saved = await this.externalReceiptRepo.save(receipt);

    await this.traceOperation(
      "CLOSE",
      "ExternalReceipt",
      receiptId,
      beforeSnapshot,
      JSON.stringify(saved),
      "回执处理完成关闭",
      closedBy
    );

    return saved;
  }

  private validateReceiptPayload(
    receiptType: ReceiptType,
    payload: any
  ): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!payload) {
      errors.push("payload不能为空");
      return { isValid: false, errors };
    }

    switch (receiptType) {
      case "PAYMENT_CONFIRMATION":
        if (!payload.amount) errors.push("缺少付款金额");
        if (!payload.paymentDate) errors.push("缺少付款日期");
        if (!payload.transactionNo) errors.push("缺少交易流水号");
        break;
      case "ACCEPTANCE_CONFIRMATION":
        if (!payload.acceptanceDate) errors.push("缺少验收日期");
        if (!payload.acceptedBy) errors.push("缺少验收人");
        break;
      case "SIGNATURE_CONFIRMATION":
        if (!payload.signatureDate) errors.push("缺少签署日期");
        if (!payload.signedBy) errors.push("缺少签署人");
        break;
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private generateReceiptNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = uuidv4().substring(0, 6).toUpperCase();
    return `HZ-${year}${month}${day}-${random}`;
  }

  private generateCompensationNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = uuidv4().substring(0, 6).toUpperCase();
    return `BC-${year}${month}-${random}`;
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
}
