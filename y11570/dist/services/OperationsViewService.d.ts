import TicketDao from '../daos/TicketDao';
export declare class OperationsViewService {
    private dao;
    constructor(dao: TicketDao);
    getFrozenTicketsComparison(batchId?: string): Promise<any[]>;
    private extractManualReasons;
    getTicketTraceability(ticketId: string): Promise<any>;
    getSummaryReport(batchId?: string, startDate?: Date, endDate?: Date): Promise<any>;
    getBatchComparisonReport(batchIds: string[]): Promise<any>;
    verifyDataConsistency(ticketId: string): Promise<{
        consistent: boolean;
        issues: string[];
    }>;
    getFailedRecordsSummary(batchId?: string): Promise<any>;
}
export default OperationsViewService;
