import { TicketDao } from '../daos/TicketDao';
import { TicketStateMachine } from '../state-machine/TicketStateMachine';
import { BatchService } from './BatchService';
import { OperationsViewService } from './OperationsViewService';
export interface ReportOptions {
    includeTicketDetails?: boolean;
    includeInventory?: boolean;
    includeTimeouts?: boolean;
    includeAssignments?: boolean;
    includeTransitions?: boolean;
    includeCompensation?: boolean;
    includeResponsibility?: boolean;
    format?: 'markdown' | 'html';
}
export interface GeneratedReport {
    reportId: string;
    fileName: string;
    filePath: string;
    fileUrl: string;
    reportType: string;
    title: string;
    generatedAt: Date;
    generatedBy: string;
    summary: {
        ticketCount: number;
        batchCount: number;
        inventoryDiffCount: number;
        totalCompensation: number;
        timeoutCount: number;
    };
}
export declare class ReportService {
    private dao;
    private stateMachine;
    private batchService;
    private operationsViewService;
    private reportsDir;
    constructor(dao: TicketDao, stateMachine: TicketStateMachine, batchService: BatchService, operationsViewService: OperationsViewService);
    generateTicketReport(ticketId: string, options: ReportOptions, generatedBy: string): Promise<GeneratedReport>;
    generateBatchReport(batchId: string, options: ReportOptions, generatedBy: string): Promise<GeneratedReport>;
    generateOperationsReport(filters: {
        startDate?: string;
        endDate?: string;
        status?: string;
    }, options: ReportOptions, generatedBy: string): Promise<GeneratedReport>;
    private generateTicketMarkdown;
    private generateBatchMarkdown;
    private generateOperationsMarkdown;
    getReportFilePath(fileName: string): string;
    listReports(): Promise<{
        fileName: string;
        generatedAt: number;
        size: number;
    }[]>;
}
export default ReportService;
