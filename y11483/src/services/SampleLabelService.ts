import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  SampleLabel,
  SampleStatus,
  EntityType,
  OperationType,
} from '../entities';
import { AuditService } from './AuditService';

export interface CreateSampleInput {
  batchNo: string;
  potNo: string;
  productName: string;
  productionTime: Date;
  producer: string;
  quantity: number;
  unit: string;
  shelfNo?: string;
  operator: string;
  sourceSystem?: string;
  requestId?: string;
}

export interface UpdateSampleStatusInput {
  id: string;
  status: SampleStatus;
  operator: string;
  reason: string;
  requestId?: string;
}

export class SampleLabelService {
  private repository: Repository<SampleLabel>;
  private auditService: AuditService;

  constructor() {
    this.repository = AppDataSource.getRepository(SampleLabel);
    this.auditService = new AuditService();
  }

  async create(input: CreateSampleInput): Promise<SampleLabel> {
    const sample = this.repository.create({
      ...input,
      status: SampleStatus.CREATED,
      version: 1,
      isDeleted: false,
      createdBy: input.operator,
      updatedBy: input.operator,
    });

    const saved = await this.repository.save(sample);

    await this.auditService.logCreate(
      saved.id,
      EntityType.SAMPLE_LABEL,
      `${saved.batchNo}-${saved.potNo}`,
      input.operator,
      saved,
      input.requestId
    );

    return saved;
  }

  async batchCreate(inputs: CreateSampleInput[]): Promise<{
    success: SampleLabel[];
    failed: { input: CreateSampleInput; error: string }[]>;
  }> {
    const success: SampleLabel[] = [];
    const failed: { input: CreateSampleInput; error: string }[] = [];

    for (const input of inputs) {
      try {
        const sample = await this.create(input);
        success.push(sample);
      } catch (error: any) {
        failed.push({ input, error: error.message });
      }
    }

    return { success, failed };
  }

  async submit(id: string, operator: string, reason: string = '提交验收', requestId?: string): Promise<SampleLabel> {
    return this.updateStatus(id, SampleStatus.SUBMITTED, operator, reason, requestId);
  }

  async withdraw(id: string, operator: string, reason: string, requestId?: string): Promise<SampleLabel> {
    return this.updateStatus(id, SampleStatus.WITHDRAWN, operator, reason, requestId);
  }

  async verify(id: string, operator: string, reason: string = '验收通过', requestId?: string): Promise<SampleLabel> {
    return this.updateStatus(id, SampleStatus.VERIFIED, operator, reason, requestId);
  }

  async reject(id: string, operator: string, reason: string, requestId?: string): Promise<SampleLabel> {
    return this.updateStatus(id, SampleStatus.REJECTED, operator, reason, requestId);
  }

  private async updateStatus(
    id: string,
    newStatus: SampleStatus,
    operator: string,
    reason: string,
    requestId?: string
  ): Promise<SampleLabel> {
    const sample = await this.repository.findOne({ where: { id } });
    if (!sample) {
      throw new Error(`Sample label ${id} not found`);
    }

    const oldStatus = sample.status;
    const oldData = { ...sample };

    sample.status = newStatus;
    sample.version = sample.version + 1;
    sample.updatedBy = operator;

    const saved = await this.repository.save(sample);

    const operationType = this.getOperationType(newStatus);
    await this.auditService.logStatusChange(
      saved.id,
      EntityType.SAMPLE_LABEL,
      `${saved.batchNo}-${saved.potNo}`,
      operationType,
      operator,
      oldStatus,
      newStatus,
      reason,
      requestId
    );

    return saved;
  }

  private getOperationType(status: SampleStatus): OperationType {
    switch (status) {
      case SampleStatus.SUBMITTED:
        return OperationType.SUBMIT;
      case SampleStatus.WITHDRAWN:
        return OperationType.WITHDRAW;
      case SampleStatus.VERIFIED:
        return OperationType.VERIFY;
      case SampleStatus.REJECTED:
        return OperationType.REJECT;
      default:
        return OperationType.UPDATE;
    }
  }

  async getById(id: string): Promise<SampleLabel | null> {
    return this.repository.findOne({ where: { id, isDeleted: false } });
  }

  async getByBatchPot(batchNo: string, potNo: string): Promise<SampleLabel[]> {
    return this.repository.find({
      where: { batchNo, potNo, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async getHistory(id: string): Promise<any[]> {
    return this.auditService.getEntityHistory(id, EntityType.SAMPLE_LABEL);
  }

  async list(
    page: number = 1,
    pageSize: number = 20,
    filters?: { status?: SampleStatus; batchNo?: string }
  ): Promise<{ data: SampleLabel[]; total: number }> {
    const where: any = { isDeleted: false };
    if (filters?.status) where.status = filters.status;
    if (filters?.batchNo) where.batchNo = filters.batchNo;

    const [data, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { data, total };
  }
}