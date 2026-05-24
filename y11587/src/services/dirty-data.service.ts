import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { DirtyRecord, DirtyType, DirtyStatus } from "../entities/DirtyRecord";
import { OperationTrace, OperationType } from "../entities/OperationTrace";
import { formatISO } from "date-fns";

export class DirtyDataService {
  private dirtyRecordRepo: Repository<DirtyRecord>;
  private operationTraceRepo: Repository<OperationTrace>;

  constructor() {
    this.dirtyRecordRepo = AppDataSource.getRepository(DirtyRecord);
    this.operationTraceRepo = AppDataSource.getRepository(OperationTrace);
  }

  detectAndRecord(
    sourceTable: string,
    sourceRecordId: string | null,
    originalData: any,
    dirtyType: DirtyType,
    fieldIssues?: string[],
    conflictDetails?: any
  ): DirtyRecord {
    const record: any = {
      dirtyType,
      sourceTable,
      sourceRecordId: sourceRecordId || undefined,
      originalData: JSON.stringify(originalData),
      fieldIssues: fieldIssues ? JSON.stringify(fieldIssues) : undefined,
      conflictDetails: conflictDetails ? JSON.stringify(conflictDetails) : undefined,
      status: "IDENTIFIED",
    };

    return record as DirtyRecord;
  }

  async recordDirtyData(
    sourceTable: string,
    sourceRecordId: string | null,
    originalData: any,
    dirtyType: DirtyType,
    fieldIssues?: string[],
    conflictDetails?: any
  ): Promise<DirtyRecord> {
    const record = this.detectAndRecord(
      sourceTable,
      sourceRecordId,
      originalData,
      dirtyType,
      fieldIssues,
      conflictDetails
    );

    const saved = await this.dirtyRecordRepo.save(record);

    await this.traceOperation(
      "CREATE",
      "DirtyRecord",
      saved.id,
      null,
      JSON.stringify(saved),
      `识别脏数据: ${dirtyType}`,
      "system"
    );

    return saved;
  }

  validateContractData(data: any): { isValid: boolean; issues: DirtyRecord[] } {
    const issues: DirtyRecord[] = [];
    const requiredFields = ["contractNo", "contractName", "totalAmount"];
    const missingFields = requiredFields.filter((f) => !data[f]);

    if (missingFields.length > 0) {
      issues.push(
        this.detectAndRecord(
          "Contract",
          data.id || null,
          data,
          "MISSING_FIELDS",
          missingFields
        )
      );
    }

    if (data.totalAmount !== undefined && data.totalAmount < 0) {
      issues.push(
        this.detectAndRecord(
          "Contract",
          data.id || null,
          data,
          "AMOUNT_CONFLICT",
          ["totalAmount"],
          { expected: ">= 0", actual: data.totalAmount }
        )
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  validatePaymentNodeData(data: any): { isValid: boolean; issues: DirtyRecord[] } {
    const issues: DirtyRecord[] = [];
    const requiredFields = ["nodeName", "nodeType", "amount"];
    const missingFields = requiredFields.filter((f) => !data[f]);

    if (missingFields.length > 0) {
      issues.push(
        this.detectAndRecord(
          "PaymentNode",
          data.id || null,
          data,
          "MISSING_FIELDS",
          missingFields
        )
      );
    }

    if (data.amount !== undefined && data.amount < 0) {
      issues.push(
        this.detectAndRecord(
          "PaymentNode",
          data.id || null,
          data,
          "AMOUNT_CONFLICT",
          ["amount"],
          { expected: ">= 0", actual: data.amount }
        )
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  detectCrossDayIssue(
    sourceTable: string,
    sourceRecordId: string,
    data: any,
    dateField: string,
    referenceDate: string
  ): DirtyRecord | null {
    const recordDate = new Date(data[dateField]);
    const refDate = new Date(referenceDate);
    const diffDays = Math.abs(
      (recordDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 1) {
      return this.detectAndRecord(
        sourceTable,
        sourceRecordId,
        data,
        "CROSS_DAY",
        [dateField],
        {
          recordDate: data[dateField],
          referenceDate,
          diffDays,
        }
      );
    }

    return null;
  }

  detectNameConflict(
    sourceTable: string,
    sourceRecordId: string,
    newName: string,
    existingName: string
  ): DirtyRecord | null {
    if (newName !== existingName) {
      return this.detectAndRecord(
        sourceTable,
        sourceRecordId,
        { newName, existingName },
        "NAME_CHANGED",
        ["name"],
        {
          oldName: existingName,
          newName,
        }
      );
    }
    return null;
  }

  detectAmountConflict(
    sourceTable: string,
    sourceRecordId: string,
    fieldName: string,
    newValue: number,
    expectedValue: number,
    tolerance: number = 0
  ): DirtyRecord | null {
    const diff = Math.abs(newValue - expectedValue);
    if (diff > tolerance) {
      return this.detectAndRecord(
        sourceTable,
        sourceRecordId,
        { newValue, expectedValue },
        "AMOUNT_CONFLICT",
        [fieldName],
        {
          field: fieldName,
          expected: expectedValue,
          actual: newValue,
          difference: diff,
        }
      );
    }
    return null;
  }

  async reviewDirtyRecord(
    recordId: string,
    reviewer: string,
    remark: string,
    status: "PENDING_REVIEW" | "RESOLVED" | "DISMISSED",
    correctedData?: any
  ): Promise<DirtyRecord> {
    const record = await this.dirtyRecordRepo.findOneBy({ id: recordId });
    if (!record) throw new Error("脏记录不存在");

    const beforeSnapshot = JSON.stringify(record);

    record.status = status;
    record.reviewRemark = remark;
    record.reviewedBy = reviewer;
    record.reviewedAt = formatISO(new Date());

    if (correctedData) {
      record.correctedData = JSON.stringify(correctedData);
    }

    if (status === "RESOLVED") {
      record.isReconciled = true;
      record.resolution = "人工修正完成";
    }

    const saved = await this.dirtyRecordRepo.save(record);

    await this.traceOperation(
      "UPDATE",
      "DirtyRecord",
      recordId,
      beforeSnapshot,
      JSON.stringify(saved),
      remark,
      reviewer
    );

    return saved;
  }

  async resolveDirtyRecord(
    recordId: string,
    resolvedBy: string,
    correctedData: any,
    resolution: string
  ): Promise<DirtyRecord> {
    return await this.reviewDirtyRecord(
      recordId,
      resolvedBy,
      resolution,
      "RESOLVED",
      correctedData
    );
  }

  async getDirtyRecords(
    filters?: {
      dirtyType?: DirtyType;
      status?: DirtyStatus;
      sourceTable?: string;
    }
  ): Promise<DirtyRecord[]> {
    const where: any = {};
    if (filters?.dirtyType) where.dirtyType = filters.dirtyType;
    if (filters?.status) where.status = filters.status;
    if (filters?.sourceTable) where.sourceTable = filters.sourceTable;

    return await this.dirtyRecordRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  async getDirtyStats() {
    const total = await this.dirtyRecordRepo.count();
    const byType = await this.dirtyRecordRepo
      .createQueryBuilder("d")
      .select("d.dirtyType", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("d.dirtyType")
      .getRawMany();

    const byStatus = await this.dirtyRecordRepo
      .createQueryBuilder("d")
      .select("d.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("d.status")
      .getRawMany();

    const pending = await this.dirtyRecordRepo.count({
      where: { status: "IDENTIFIED" },
    });

    const reviewed = await this.dirtyRecordRepo.count({
      where: { status: "PENDING_REVIEW" },
    });

    const resolved = await this.dirtyRecordRepo.count({
      where: { status: "RESOLVED" },
    });

    return {
      total,
      pending,
      reviewed,
      resolved,
      byType,
      byStatus,
    };
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
