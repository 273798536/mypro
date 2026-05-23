import { Repository } from 'typeorm';
import { Remark, RemarkType } from '../entities/Remark';
import { AppDataSource } from '../database';
import { auditService } from './AuditService';

export interface CreateRemarkOptions {
  refundId?: string;
  batchId?: string;
  remarkType: RemarkType;
  content: string;
  operatorId?: string;
  operatorName?: string;
  isSensitive?: boolean;
}

export class RemarkService {
  private remarkRepository: Repository<Remark>;

  constructor() {
    this.remarkRepository = AppDataSource.getRepository(Remark);
  }

  async createRemark(options: CreateRemarkOptions): Promise<Remark> {
    const remark = this.remarkRepository.create({
      refundId: options.refundId,
      batchId: options.batchId,
      remarkType: options.remarkType,
      content: options.content,
      operatorId: options.operatorId,
      operatorName: options.operatorName,
      isSensitive: options.isSensitive || false,
      createdBy: options.operatorId,
      updatedBy: options.operatorId,
    });

    const saved = await this.remarkRepository.save(remark);

    await auditService.logCreate('remark', saved.id, saved, {
      batchId: options.batchId,
      operatorId: options.operatorId,
      operatorName: options.operatorName,
    });

    return saved;
  }

  async getRemarksByRefund(refundId: string): Promise<Remark[]> {
    return await this.remarkRepository.find({
      where: { refundId },
      order: { createdAt: 'DESC' },
    });
  }

  async getRemarksByBatch(batchId: string): Promise<Remark[]> {
    return await this.remarkRepository.find({
      where: { batchId },
      order: { createdAt: 'DESC' },
    });
  }

  async getRemarkById(id: string): Promise<Remark | null> {
    return await this.remarkRepository.findOne({ where: { id } });
  }
}

export const remarkService = new RemarkService();
