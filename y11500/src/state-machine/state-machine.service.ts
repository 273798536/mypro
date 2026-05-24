import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchStatus } from '../common/enums/batch-status.enum';
import { Batch } from '../entities/batch.entity';
import { StatusLog } from '../entities/status-log.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface StateTransition {
  from: BatchStatus[];
  to: BatchStatus;
}

@Injectable()
export class StateMachineService {
  private transitions: Map<BatchStatus, StateTransition[]> = new Map();

  constructor(
    @InjectRepository(StatusLog)
    private statusLogRepository: Repository<StatusLog>,
  ) {
    this.initTransitions();
  }

  private initTransitions() {
    this.addTransition(BatchStatus.DRAFT, BatchStatus.PENDING_REVIEW);
    this.addTransition(BatchStatus.DRAFT, BatchStatus.CANCELLED);
    
    this.addTransition(BatchStatus.PENDING_REVIEW, BatchStatus.APPROVED);
    this.addTransition(BatchStatus.PENDING_REVIEW, BatchStatus.REJECTED);
    this.addTransition(BatchStatus.PENDING_REVIEW, BatchStatus.DRAFT);
    
    this.addTransition(BatchStatus.APPROVED, BatchStatus.FROZEN);
    this.addTransition(BatchStatus.APPROVED, BatchStatus.SETTLED);
    
    this.addTransition(BatchStatus.REJECTED, BatchStatus.DRAFT);
    this.addTransition(BatchStatus.REJECTED, BatchStatus.CANCELLED);
    
    this.addTransition(BatchStatus.FROZEN, BatchStatus.APPROVED);
    this.addTransition(BatchStatus.FROZEN, BatchStatus.CANCELLED);
    
    this.addTransition(BatchStatus.SETTLED, BatchStatus.ARCHIVED);
    this.addTransition(BatchStatus.SETTLED, BatchStatus.FROZEN);
    
    this.addTransition(BatchStatus.CANCELLED, BatchStatus.ARCHIVED);
    this.addTransition(BatchStatus.CANCELLED, BatchStatus.DRAFT);
  }

  private addTransition(from: BatchStatus, to: BatchStatus) {
    if (!this.transitions.has(from)) {
      this.transitions.set(from, []);
    }
    const existing = this.transitions.get(from);
    if (!existing.find(t => t.to === to)) {
      existing.push({ from: [from], to });
    }
  }

  canTransition(from: BatchStatus, to: BatchStatus): boolean {
    const transitions = this.transitions.get(from);
    if (!transitions) return false;
    return transitions.some(t => t.to === to);
  }

  getAvailableTransitions(status: BatchStatus): BatchStatus[] {
    const transitions = this.transitions.get(status);
    if (!transitions) return [];
    return transitions.map(t => t.to);
  }

  async transition(
    batch: Batch,
    toStatus: BatchStatus,
    user: CurrentUser,
    reason: string,
    metadata?: Record<string, any>,
  ): Promise<Batch> {
    if (!this.canTransition(batch.status, toStatus)) {
      throw new BadRequestException(
        `无法从 ${batch.status} 转换到 ${toStatus}`,
      );
    }

    const log = this.statusLogRepository.create({
      batchId: batch.id,
      fromStatus: batch.status,
      toStatus: toStatus,
      reason,
      operatorId: user.id,
      operatorName: user.name,
      metadata,
    });
    await this.statusLogRepository.save(log);

    batch.status = toStatus;
    return batch;
  }

  async getStatusLogs(batchId: string): Promise<StatusLog[]> {
    return this.statusLogRepository.find({
      where: { batchId },
      order: { operatedAt: 'DESC' },
    });
  }
}
