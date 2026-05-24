import { Repository } from 'typeorm';
import { BatchStatus } from '../common/enums/batch-status.enum';
import { Batch } from '../entities/batch.entity';
import { StatusLog } from '../entities/status-log.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
export declare class StateMachineService {
    private statusLogRepository;
    private transitions;
    constructor(statusLogRepository: Repository<StatusLog>);
    private initTransitions;
    private addTransition;
    canTransition(from: BatchStatus, to: BatchStatus): boolean;
    getAvailableTransitions(status: BatchStatus): BatchStatus[];
    transition(batch: Batch, toStatus: BatchStatus, user: CurrentUser, reason: string, metadata?: Record<string, any>): Promise<Batch>;
    getStatusLogs(batchId: string): Promise<StatusLog[]>;
}
