import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  BatchTrace,
  TraceStatus,
  ConflictStrategy,
  DataSource,
  SampleLabel,
  TemperatureRecord,
  StoreComplaint,
  StoreHandover,
  EntityType,
  OperationType,
} from '../entities';
import { AuditService } from './AuditService';

export interface CreateTraceInput {
  batchNo: string;
  potNo: string;
  productName: string;
  productionTime: Date;
  conflictStrategy?: ConflictStrategy;
  operator: string;
  requestId?: string;
}

export interface ProcessTraceInput {
  traceNo: string;
  operator: string;
  autoCollect?: boolean;
  skipValidation?: boolean;
  requestId?: string;
}

export interface ManualJudgeInput {
  traceNo: string;
  operator: string;
  reason: string;
  judgment: 'pass' | 'fail' | 'pending';
  requestId?: string;
}

export interface FreezeTraceInput {
  traceNo: string;
  operator: string;
  reason: string;
  requestId?: string;
}

export interface ValidationError {
  type: string;
  field: string;
  value: any;
  message: string;
}

export interface FailedItem {
  id?: string;
  type: string;
  error: string;
  data?: Record<string, any>;
}

export class BatchTraceService {
  private traceRepository: Repository<BatchTrace>;
  private sampleRepository: Repository<SampleLabel>;
  private tempRepository: Repository<TemperatureRecord>;
  private complaintRepository: Repository<StoreComplaint>;
  private handoverRepository: Repository<StoreHandover>;
  private auditService: AuditService;

  constructor() {
    this.traceRepository = AppDataSource.getRepository(BatchTrace);
    this.sampleRepository = AppDataSource.getRepository(SampleLabel);
    this.tempRepository = AppDataSource.getRepository(TemperatureRecord);
    this.complaintRepository = AppDataSource.getRepository(StoreComplaint);
    this.handoverRepository = AppDataSource.getRepository(StoreHandover);
    this.auditService = new AuditService();
  }

  async createTrace(input: CreateTraceInput): Promise<BatchTrace> {
    const existingTrace = await this.traceRepository.findOne({
      where: { batchNo: input.batchNo, potNo: input.potNo },
    });

    if (existingTrace) {
      const strategy = input.conflictStrategy || ConflictStrategy.ERROR;
      
      switch (strategy) {
        case ConflictStrategy.IGNORE:
          return existingTrace;
        case ConflictStrategy.OVERWRITE:
          return this.overwriteTrace(existingTrace, input);
        case ConflictStrategy.APPEND:
          return this.appendToTrace(existingTrace, input);
        case ConflictStrategy.ERROR:
          throw new Error(
            `Trace already exists for batch ${input.batchNo} pot ${input.potNo}. Use conflictStrategy: ignore/overwrite/append`
          );
      }
    }

    const traceNo = `TRACE-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const trace = this.traceRepository.create({
      traceNo,
      batchNo: input.batchNo,
      potNo: input.potNo,
      productName: input.productName,
      productionTime: input.productionTime,
      status: TraceStatus.CREATED,
      conflictStrategy: input.conflictStrategy || ConflictStrategy.ERROR,
      dataSources: [],
      stores: [],
      createdBy: input.operator,
      updatedBy: input.operator,
    });

    const saved = await this.traceRepository.save(trace);

    await this.auditService.logCreate(
      saved.id,
      EntityType.BATCH_TRACE,
      traceNo,
      input.operator,
      saved,
      input.requestId
    );

    return saved;
  }

  private async overwriteTrace(
    existing: BatchTrace,
    input: CreateTraceInput
  ): Promise<BatchTrace> {
    const oldData = { ...existing };
    
    existing.productName = input.productName;
    existing.productionTime = input.productionTime;
    existing.status = TraceStatus.CREATED;
    existing.version = existing.version + 1;
    existing.dataSources = [];
    existing.stores = [];
    existing.sampleLabelCount = 0;
    existing.temperatureRecordCount = 0;
    existing.complaintCount = 0;
    existing.handoverCount = 0;
    existing.hasAbnormalTemperature = false;
    existing.hasComplaint = false;
    existing.updatedBy = input.operator;

    const saved = await this.traceRepository.save(existing);

    await this.auditService.logUpdate(
      saved.id,
      EntityType.BATCH_TRACE,
      saved.traceNo,
      input.operator,
      oldData,
      saved,
      ['productName', 'productionTime', 'status', 'version', 'dataSources', 'stores'],
      '覆盖已有批次链路',
      input.requestId
    );

    return saved;
  }

  private async appendToTrace(
    existing: BatchTrace,
    input: CreateTraceInput
  ): Promise<BatchTrace> {
    const oldData = { ...existing };
    
    existing.version = existing.version + 1;
    existing.updatedBy = input.operator;

    const saved = await this.traceRepository.save(existing);

    await this.auditService.logUpdate(
      saved.id,
      EntityType.BATCH_TRACE,
      saved.traceNo,
      input.operator,
      oldData,
      saved,
      ['version'],
      '追加模式 - 保留现有数据',
      input.requestId
    );

    return saved;
  }

  async processTrace(input: ProcessTraceInput): Promise<BatchTrace> {
    const trace = await this.traceRepository.findOne({
      where: { traceNo: input.traceNo },
    });

    if (!trace) {
      throw new Error(`Trace ${input.traceNo} not found`);
    }

    if (trace.status === TraceStatus.FROZEN) {
      throw new Error(`Trace ${input.traceNo} is frozen, cannot process`);
    }

    const oldStatus = trace.status;
    trace.status = TraceStatus.PROCESSING;
    trace.updatedBy = input.operator;
    await this.traceRepository.save(trace);

    await this.auditService.logStatusChange(
      trace.id,
      EntityType.BATCH_TRACE,
      trace.traceNo,
      OperationType.UPDATE,
      input.operator,
      oldStatus,
      TraceStatus.PROCESSING,
      '开始处理批次链路',
      input.requestId
    );

    const failedItems: FailedItem[] = [];
    const dataSources: DataSource[] = [];
    const validationErrors: ValidationError[] = [];

    try {
      let samples: SampleLabel[] = [];
      try {
        samples = await this.sampleRepository.find({
          where: { batchNo: trace.batchNo, potNo: trace.potNo, isDeleted: false },
        });
        const sampleErrors = this.validateSamples(samples);
        validationErrors.push(...sampleErrors);
        trace.sampleLabelCount = samples.length;
        if (samples.length > 0) dataSources.push(DataSource.SAMPLE_LABEL);
        if (samples.length === 0) {
          failedItems.push({
            type: 'sample_label',
            error: '未找到留样标签数据',
            data: { batchNo: trace.batchNo, potNo: trace.potNo },
          });
        }
      } catch (error: any) {
        failedItems.push({
          type: 'sample_label',
          error: `留样标签查询失败: ${error.message}`,
          data: { batchNo: trace.batchNo, potNo: trace.potNo },
        });
      }

      let tempRecords: TemperatureRecord[] = [];
      try {
        tempRecords = await this.tempRepository.find({
          where: { batchNo: trace.batchNo, potNo: trace.potNo },
        });
        const tempErrors = this.validateTemperatureRecords(tempRecords);
        validationErrors.push(...tempErrors);
        trace.temperatureRecordCount = tempRecords.length;
        if (tempRecords.length > 0) dataSources.push(DataSource.TEMPERATURE);
        trace.hasAbnormalTemperature = tempRecords.some(
          (t) => t.status !== 'normal'
        );
        if (tempRecords.length === 0) {
          failedItems.push({
            type: 'temperature',
            error: '未找到温度记录数据',
            data: { batchNo: trace.batchNo, potNo: trace.potNo },
          });
        }
      } catch (error: any) {
        failedItems.push({
          type: 'temperature',
          error: `温度记录查询失败: ${error.message}`,
          data: { batchNo: trace.batchNo, potNo: trace.potNo },
        });
      }

      let complaints: StoreComplaint[] = [];
      try {
        complaints = await this.complaintRepository.find({
          where: { batchNo: trace.batchNo, potNo: trace.potNo },
        });
        trace.complaintCount = complaints.length;
        if (complaints.length > 0) dataSources.push(DataSource.COMPLAINT);
        trace.hasComplaint = complaints.length > 0;
      } catch (error: any) {
        failedItems.push({
          type: 'complaint',
          error: `门店投诉查询失败: ${error.message}`,
          data: { batchNo: trace.batchNo, potNo: trace.potNo },
        });
      }

      let handovers: StoreHandover[] = [];
      try {
        handovers = await this.handoverRepository.find({
          where: { batchNo: trace.batchNo, potNo: trace.potNo },
        });
        const handoverErrors = this.validateHandovers(handovers);
        validationErrors.push(...handoverErrors);
        trace.handoverCount = handovers.length;
        if (handovers.length > 0) dataSources.push(DataSource.HANDOVER);
        if (handovers.length === 0) {
          failedItems.push({
            type: 'handover',
            error: '未找到门店交接数据',
            data: { batchNo: trace.batchNo, potNo: trace.potNo },
          });
        }
      } catch (error: any) {
        failedItems.push({
          type: 'handover',
          error: `门店交接查询失败: ${error.message}`,
          data: { batchNo: trace.batchNo, potNo: trace.potNo },
        });
      }

      try {
        trace.stores = handovers.map((h) => ({
          storeCode: h.storeCode,
          storeName: h.storeName,
          handoverNo: h.handoverNo,
          deliveredQuantity: h.deliveredQuantity,
          receivedQuantity: h.receivedQuantity,
          status: h.status,
        }));
        trace.totalStores = handovers.length;
        trace.completedStores = handovers.filter(
          (h) => h.status === 'received'
        ).length;
      } catch (error: any) {
        failedItems.push({
          type: 'store_mapping',
          error: `门店数据映射失败: ${error.message}`,
        });
      }

      trace.dataSources = [...new Set([...(trace.dataSources || []), ...dataSources])];
      trace.failedItems = failedItems.length > 0 ? failedItems as any : [];
      trace.metadata = {
        ...(trace.metadata || {}),
        validationErrors,
        processedAt: new Date().toISOString(),
      };

      if (failedItems.length > 0 || validationErrors.length > 0) {
        trace.status = TraceStatus.PARTIAL_FAILED;
        const totalIssues = failedItems.length + validationErrors.length;
        trace.errorMessage = `${totalIssues} 项数据异常（${failedItems.length} 项失败，${validationErrors.length} 项验证警告）`;
      } else {
        trace.status = TraceStatus.COMPLETED;
        trace.summary = this.generateSummary(trace);
      }

      trace.updatedBy = input.operator;
      const saved = await this.traceRepository.save(trace);

      await this.auditService.logStatusChange(
        saved.id,
        EntityType.BATCH_TRACE,
        saved.traceNo,
        OperationType.UPDATE,
        input.operator,
        TraceStatus.PROCESSING,
        saved.status,
        saved.status === TraceStatus.COMPLETED
          ? '批次链路处理完成'
          : `批次链路部分完成 - ${saved.errorMessage}`,
        input.requestId
      );

      return saved;
    } catch (error: any) {
      trace.status = TraceStatus.FAILED;
      trace.errorMessage = `处理完全失败: ${error.message}`;
      trace.updatedBy = input.operator;
      trace.failedItems = [{
        type: 'fatal_error',
        error: error.message,
        data: { stack: error.stack },
      }] as any;
      const saved = await this.traceRepository.save(trace);

      await this.auditService.logStatusChange(
        saved.id,
        EntityType.BATCH_TRACE,
        saved.traceNo,
        OperationType.REPLAY,
        input.operator,
        TraceStatus.PROCESSING,
        TraceStatus.FAILED,
        `处理完全失败: ${error.message}`,
        input.requestId
      );

      throw error;
    }
  }

  private validateSamples(samples: SampleLabel[]): ValidationError[] {
    const errors: ValidationError[] = [];

    samples.forEach((sample, index) => {
      if (!sample.batchNo || sample.batchNo.trim() === '') {
        errors.push({
          type: 'sample_label',
          field: 'batchNo',
          value: sample.batchNo,
          message: `留样标签[${index}]: 批次号为空`,
        });
      }
      if (!sample.potNo || sample.potNo.trim() === '') {
        errors.push({
          type: 'sample_label',
          field: 'potNo',
          value: sample.potNo,
          message: `留样标签[${index}]: 锅次号为空`,
        });
      }
      if (sample.quantity <= 0) {
        errors.push({
          type: 'sample_label',
          field: 'quantity',
          value: sample.quantity,
          message: `留样标签[${index}]: 数量异常(${sample.quantity})`,
        });
      }
      if (!sample.productionTime) {
        errors.push({
          type: 'sample_label',
          field: 'productionTime',
          value: sample.productionTime,
          message: `留样标签[${index}]: 生产时间为空`,
        });
      }
    });

    return errors;
  }

  private validateTemperatureRecords(records: TemperatureRecord[]): ValidationError[] {
    const errors: ValidationError[] = [];

    records.forEach((record, index) => {
      if (record.temperature === null || record.temperature === undefined) {
        errors.push({
          type: 'temperature',
          field: 'temperature',
          value: record.temperature,
          message: `温度记录[${index}]: 温度值为空`,
        });
      } else if (record.temperature < -30 || record.temperature > 100) {
        errors.push({
          type: 'temperature',
          field: 'temperature',
          value: record.temperature,
          message: `温度记录[${index}]: 温度值异常(${record.temperature}°C)`,
        });
      }
      if (!record.recordTime) {
        errors.push({
          type: 'temperature',
          field: 'recordTime',
          value: record.recordTime,
          message: `温度记录[${index}]: 记录时间为空`,
        });
      }
    });

    return errors;
  }

  private validateHandovers(handovers: StoreHandover[]): ValidationError[] {
    const errors: ValidationError[] = [];

    handovers.forEach((handover, index) => {
      if (!handover.storeCode || handover.storeCode.trim() === '') {
        errors.push({
          type: 'handover',
          field: 'storeCode',
          value: handover.storeCode,
          message: `交接单[${index}]: 门店编码为空`,
        });
      }
      if (handover.deliveredQuantity < 0) {
        errors.push({
          type: 'handover',
          field: 'deliveredQuantity',
          value: handover.deliveredQuantity,
          message: `交接单[${index}]: 配送数量为负`,
        });
      }
      if (handover.receivedQuantity < 0) {
        errors.push({
          type: 'handover',
          field: 'receivedQuantity',
          value: handover.receivedQuantity,
          message: `交接单[${index}]: 实收数量为负`,
        });
      }
      if (handover.receivedQuantity > handover.deliveredQuantity) {
        errors.push({
          type: 'handover',
          field: 'receivedQuantity',
          value: handover.receivedQuantity,
          message: `交接单[${index}]: 实收数量(${handover.receivedQuantity})大于配送数量(${handover.deliveredQuantity})`,
        });
      }
    });

    return errors;
  }

  private generateSummary(trace: BatchTrace): string {
    const parts: string[] = [];
    parts.push(`批次 ${trace.batchNo}-${trace.potNo}`);
    parts.push(`产品: ${trace.productName}`);
    parts.push(`留样标签: ${trace.sampleLabelCount} 条`);
    parts.push(`温度记录: ${trace.temperatureRecordCount} 条`);
    parts.push(`门店交接: ${trace.handoverCount} 条`);
    parts.push(`涉及门店: ${trace.totalStores} 家`);
    if (trace.hasAbnormalTemperature) parts.push('【注意】存在异常温度');
    if (trace.hasComplaint) parts.push('【注意】存在门店投诉');
    return parts.join(' | ');
  }

  async getTrace(traceNo: string): Promise<BatchTrace | null> {
    return this.traceRepository.findOne({ where: { traceNo } });
  }

  async getTraceByBatchPot(batchNo: string, potNo: string): Promise<BatchTrace | null> {
    return this.traceRepository.findOne({ where: { batchNo, potNo } });
  }

  async getTraceStores(traceNo: string): Promise<any[]> {
    const trace = await this.getTrace(traceNo);
    if (!trace) throw new Error(`Trace ${traceNo} not found`);
    return trace.stores || [];
  }

  async manualJudge(input: ManualJudgeInput): Promise<BatchTrace> {
    const trace = await this.traceRepository.findOne({
      where: { traceNo: input.traceNo },
    });

    if (!trace) {
      throw new Error(`Trace ${input.traceNo} not found`);
    }

    if (trace.status === TraceStatus.FROZEN) {
      throw new Error(`Trace ${input.traceNo} is frozen, cannot judge`);
    }

    const oldStatus = trace.status;
    const oldData = { ...trace };

    if (input.judgment === 'pass') {
      trace.status = TraceStatus.COMPLETED;
    } else if (input.judgment === 'fail') {
      trace.status = TraceStatus.FAILED;
    }

    trace.version = trace.version + 1;
    trace.updatedBy = input.operator;

    const saved = await this.traceRepository.save(trace);

    await this.auditService.logStatusChange(
      saved.id,
      EntityType.BATCH_TRACE,
      saved.traceNo,
      OperationType.MANUAL_JUDGE,
      input.operator,
      oldStatus,
      saved.status,
      input.reason,
      input.requestId
    );

    return saved;
  }

  async freezeTrace(input: FreezeTraceInput): Promise<BatchTrace> {
    const trace = await this.traceRepository.findOne({
      where: { traceNo: input.traceNo },
    });

    if (!trace) {
      throw new Error(`Trace ${input.traceNo} not found`);
    }

    const oldStatus = trace.status;

    trace.status = TraceStatus.FROZEN;
    trace.frozenAt = new Date();
    trace.frozenBy = input.operator;
    trace.updatedBy = input.operator;

    const saved = await this.traceRepository.save(trace);

    await this.auditService.logStatusChange(
      saved.id,
      EntityType.BATCH_TRACE,
      saved.traceNo,
      OperationType.FREEZE,
      input.operator,
      oldStatus,
      TraceStatus.FROZEN,
      input.reason,
      input.requestId
    );

    return saved;
  }

  async unfreezeTrace(traceNo: string, operator: string, reason: string, requestId?: string): Promise<BatchTrace> {
    const trace = await this.traceRepository.findOne({
      where: { traceNo },
    });

    if (!trace) {
      throw new Error(`Trace ${traceNo} not found`);
    }

    const oldStatus = trace.status;

    trace.status = TraceStatus.CREATED;
    trace.frozenAt = null as any;
    trace.frozenBy = null as any;
    trace.updatedBy = operator;

    const saved = await this.traceRepository.save(trace);

    await this.auditService.logStatusChange(
      saved.id,
      EntityType.BATCH_TRACE,
      saved.traceNo,
      OperationType.UNFREEZE,
      operator,
      oldStatus,
      TraceStatus.CREATED,
      reason,
      requestId
    );

    return saved;
  }

  async getTraceHistory(traceNo: string): Promise<any[]> {
    const trace = await this.getTrace(traceNo);
    if (!trace) throw new Error(`Trace ${traceNo} not found`);
    
    return this.auditService.getEntityHistoryByNo(traceNo, EntityType.BATCH_TRACE);
  }

  async listTraces(page: number = 1, pageSize: number = 20): Promise<{ data: BatchTrace[]; total: number }> {
    const [data, total] = await this.traceRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data, total };
  }
}