import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { Ticket, TicketStatus, StateTransition } from '../types';
import TicketDao from '../daos/TicketDao';

export class ExportService {
    private dao: TicketDao;
    private exportDir: string;

    constructor(dao: TicketDao, exportDir: string = './exports') {
        this.dao = dao;
        this.exportDir = exportDir;
        this.ensureExportDir();
    }

    private ensureExportDir(): void {
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }

    async exportBatchToCSV(
        batchId: string,
        requestedBy: string
    ): Promise<{ exportId: string; fileUrl: string; successCount: number; failedCount: number }> {
        const exportRequest = await this.dao.createExportRequest({
            batchId,
            status: 'processing',
            totalRecords: 0,
            successCount: 0,
            failedCount: 0,
            requestedBy,
            createdAt: new Date()
        });

        const batchDetail = await this.dao.getBatchById(batchId);
        if (!batchDetail) {
            await this.dao.updateExportRequest(exportRequest.id, 'failed');
            throw new Error(`Batch ${batchId} not found`);
        }

        const tickets = await this.dao.getTicketsByBatchId(batchId);
        const failedRecords = await this.dao.getFailedRecords({ batchId });

        const fileName = `batch_${batchId}_${Date.now()}.csv`;
        const filePath = path.join(this.exportDir, fileName);

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'ticketId', title: '工单ID' },
                { id: 'status', title: '状态' },
                { id: 'customerId', title: '客户ID' },
                { id: 'issueType', title: '问题类型' },
                { id: 'severity', title: '严重程度' },
                { id: 'currentAgentId', title: '当前坐席' },
                { id: 'totalCompensation', title: '补偿金额' },
                { id: 'frozenType', title: '冻结类型' },
                { id: 'frozenReason', title: '冻结原因' },
                { id: 'statusBeforeFrozen', title: '冻结前状态' },
                { id: 'createdAt', title: '创建时间' },
                { id: 'settledAt', title: '结算时间' },
                { id: 'timeoutCount', title: '超时次数' },
                { id: 'totalBlame', title: '总责任分' },
                { id: 'assignmentCount', title: '转派次数' }
            ]
        });

        const records: any[] = [];
        let successCount = 0;
        let failedCount = 0;

        for (const ticket of tickets) {
            try {
                const timeouts = await this.dao.getTimeoutRecordsByTicketId(ticket.id);
                const assignments = await this.dao.getAssignmentsByTicketId(ticket.id);

                records.push({
                    ticketId: ticket.id,
                    status: ticket.status,
                    customerId: ticket.sessionSummary.customerId,
                    issueType: ticket.sessionSummary.issueType,
                    severity: ticket.sessionSummary.severity,
                    currentAgentId: ticket.currentAgentId || '',
                    totalCompensation: ticket.totalCompensation,
                    frozenType: ticket.frozenType || '',
                    frozenReason: ticket.frozenReason || '',
                    statusBeforeFrozen: ticket.statusBeforeFrozen || '',
                    createdAt: ticket.createdAt.toISOString(),
                    settledAt: ticket.settledAt?.toISOString() || '',
                    timeoutCount: timeouts.length,
                    totalBlame: timeouts.reduce((sum, t) => sum + t.blameLevel, 0),
                    assignmentCount: assignments.length
                });
                successCount++;
            } catch (error) {
                failedCount++;
                await this.dao.createFailedRecord({
                    batchId,
                    ticketId: ticket.id,
                    recordType: 'export',
                    rawData: JSON.stringify(ticket),
                    errorCode: 'EXPORT_ERROR',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    failedAt: new Date()
                });
            }
        }

        await csvWriter.writeRecords(records);

        const fileUrl = `/exports/${fileName}`;

        await this.dao.updateExportRequest(
            exportRequest.id,
            'completed',
            fileUrl,
            tickets.length,
            successCount,
            failedCount
        );

        return {
            exportId: exportRequest.id,
            fileUrl,
            successCount,
            failedCount
        };
    }

    async exportTicketDetailToCSV(
        ticketId: string,
        requestedBy: string
    ): Promise<{ exportId: string; fileUrl: string }> {
        const ticket = await this.dao.getTicketById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        const transitions = await this.dao.getStateTransitionsByTicketId(ticketId);
        const assignments = await this.dao.getAssignmentsByTicketId(ticketId);
        const timeouts = await this.dao.getTimeoutRecordsByTicketId(ticketId);
        const approvals = await this.dao.getCompensationApprovalsByTicketId(ticketId);

        const fileName = `ticket_${ticketId}_${Date.now()}.csv`;
        const filePath = path.join(this.exportDir, fileName);

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'section', title: '部分' },
                { id: 'field', title: '字段' },
                { id: 'value', title: '值' },
                { id: 'time', title: '时间' },
                { id: 'operator', title: '操作人' }
            ]
        });

        const records: any[] = [];

        records.push(
            { section: '基本信息', field: '工单ID', value: ticket.id, time: '', operator: '' },
            { section: '基本信息', field: '状态', value: ticket.status, time: '', operator: '' },
            { section: '基本信息', field: '客户ID', value: ticket.sessionSummary.customerId, time: '', operator: '' },
            { section: '基本信息', field: '问题类型', value: ticket.sessionSummary.issueType, time: '', operator: '' },
            { section: '基本信息', field: '严重程度', value: ticket.sessionSummary.severity, time: '', operator: '' },
            { section: '基本信息', field: '总补偿金额', value: ticket.totalCompensation, time: '', operator: '' },
            { section: '基本信息', field: '创建时间', value: ticket.createdAt.toISOString(), time: '', operator: ticket.createdBy }
        );

        if (ticket.status === TicketStatus.FROZEN) {
            records.push(
                { section: '冻结信息', field: '冻结类型', value: ticket.frozenType, time: '', operator: '' },
                { section: '冻结信息', field: '冻结原因', value: ticket.frozenReason, time: ticket.frozenAt?.toISOString() || '', operator: ticket.frozenBy || '' },
                { section: '冻结信息', field: '冻结前状态', value: ticket.statusBeforeFrozen, time: '', operator: '' }
            );
        }

        for (const transition of transitions) {
            records.push({
                section: '状态流转',
                field: `${transition.fromStatus} -> ${transition.toStatus}`,
                value: transition.reason,
                time: transition.createdAt.toISOString(),
                operator: transition.operatorName || transition.operatorId
            });
        }

        for (const assignment of assignments) {
            records.push({
                section: '转派记录',
                field: `转派: ${assignment.fromAgentId || '系统'} -> ${assignment.toAgentId}`,
                value: assignment.reason || assignment.assignmentType,
                time: assignment.assignedAt.toISOString(),
                operator: ''
            });
        }

        for (const timeout of timeouts) {
            records.push({
                section: '超时记录',
                field: `超时类型: ${timeout.timeoutType}`,
                value: `超时时长: ${timeout.duration.toFixed(2)}分钟, 责任分: ${timeout.blameLevel}`,
                time: timeout.createdAt.toISOString(),
                operator: timeout.agentId
            });
        }

        for (const approval of approvals) {
            records.push({
                section: '补偿审批',
                field: `申请金额: ${approval.requestedAmount}`,
                value: `审批结果: ${approval.status}, 审批金额: ${approval.approvedAmount || 0}`,
                time: approval.createdAt.toISOString(),
                operator: approval.approverId || ''
            });
        }

        await csvWriter.writeRecords(records);

        const fileUrl = `/exports/${fileName}`;

        const exportRequest = await this.dao.createExportRequest({
            filters: { ticketId },
            status: 'completed',
            fileUrl,
            totalRecords: records.length,
            successCount: records.length,
            failedCount: 0,
            requestedBy,
            createdAt: new Date()
        });

        return {
            exportId: exportRequest.id,
            fileUrl
        };
    }

    async getExportStatus(exportId: string): Promise<any> {
        return await this.dao.getExportRequestById(exportId);
    }
}

export default ExportService;
