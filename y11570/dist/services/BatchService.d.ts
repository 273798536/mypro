import { Batch, Ticket, CreateTicketRequest, FrozenType, InventoryDifference } from '../types';
import TicketDao from '../daos/TicketDao';
import TicketStateMachine from '../state-machine/TicketStateMachine';
export declare class BatchService {
    private dao;
    private stateMachine;
    constructor(dao: TicketDao, stateMachine: TicketStateMachine);
    createBatch(name: string, createdBy: string): Promise<Batch>;
    submitBatch(batchId: string, operatorId: string): Promise<Batch>;
    startReview(batchId: string, operatorId: string): Promise<Batch>;
    processBatch(batchId: string, operatorId: string): Promise<Batch>;
    freezeBatch(batchId: string, frozenType: FrozenType, reason: string, operatorId: string): Promise<Batch>;
    archiveBatch(batchId: string, operatorId: string): Promise<Batch>;
    addTicketsToBatch(batchId: string, requests: CreateTicketRequest[], operatorId: string): Promise<Ticket[]>;
    private createTicketInBatch;
    getBatchDetail(batchId: string): Promise<{
        batch: Batch;
        tickets: Ticket[];
        failedRecords: any[];
    }>;
    getBatchStats(batchId: string): Promise<any>;
    createInventoryDifference(diffData: Omit<InventoryDifference, 'id' | 'createdAt'>, operatorId: string): Promise<InventoryDifference>;
    getInventoryDifferencesByTicketId(ticketId: string): Promise<InventoryDifference[]>;
    getInventoryDifferenceById(id: string): Promise<InventoryDifference | null>;
    getInventoryDifferences(filters?: any): Promise<{
        differences: InventoryDifference[];
        summary: any;
    }>;
    updateInventoryDifferenceReason(id: string, reason: string, operatorId: string): Promise<void>;
}
export default BatchService;
