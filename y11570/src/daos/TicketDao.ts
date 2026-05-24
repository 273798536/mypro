import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database/Database';
import {
    Ticket,
    TicketStatus,
    AssignmentRecord,
    CompensationApproval,
    InventoryDifference,
    TimeoutRecord,
    StateTransition,
    TicketAttachment,
    Batch,
    BatchStatus,
    AuditLog,
    FailedRecord,
    ExportRequest,
    SLARule,
    CompensationRule
} from '../types';

export class TicketDao {
    private db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async createTicket(ticket: Omit<Ticket, 'id'>): Promise<Ticket> {
        const id = uuidv4();
        const now = new Date().toISOString();

        const sql = `
            INSERT INTO tickets (
                id, batch_id, status, session_summary, sla_rule_id,
                current_agent_id, total_compensation, created_at, updated_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await this.db.run(sql, [
            id,
            ticket.batchId || null,
            ticket.status,
            JSON.stringify(ticket.sessionSummary),
            ticket.slaRuleId,
            ticket.currentAgentId || null,
            ticket.totalCompensation,
            now,
            now,
            ticket.createdBy
        ]);

        return { ...ticket, id } as Ticket;
    }

    async getTicketById(id: string): Promise<Ticket | null> {
        const sql = 'SELECT * FROM tickets WHERE id = ?';
        const row = await this.db.get<any>(sql, [id]);
        
        if (!row) return null;
        return this.mapRowToTicket(row);
    }

    async updateTicketStatus(id: string, status: TicketStatus, statusBeforeFrozen?: TicketStatus): Promise<void> {
        const now = new Date().toISOString();
        let sql = 'UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?';
        let params = [status, now, id];

        if (statusBeforeFrozen) {
            sql = 'UPDATE tickets SET status = ?, status_before_frozen = ?, updated_at = ? WHERE id = ?';
            params = [status, statusBeforeFrozen, now, id];
        }

        await this.db.run(sql, params);
    }

    async updateTicketAgent(id: string, agentId: string | undefined): Promise<void> {
        const now = new Date().toISOString();
        const sql = 'UPDATE tickets SET current_agent_id = ?, updated_at = ? WHERE id = ?';
        await this.db.run(sql, [agentId || null, now, id]);
    }

    async addTotalCompensation(id: string, amount: number): Promise<void> {
        const now = new Date().toISOString();
        const sql = 'UPDATE tickets SET total_compensation = total_compensation + ?, updated_at = ? WHERE id = ?';
        await this.db.run(sql, [amount, now, id]);
    }

    async freezeTicket(id: string, frozenType: string, reason: string, frozenBy: string): Promise<void> {
        const now = new Date().toISOString();
        const sql = `
            UPDATE tickets 
            SET frozen_type = ?, frozen_reason = ?, frozen_by = ?, frozen_at = ?, updated_at = ?
            WHERE id = ?
        `;
        await this.db.run(sql, [frozenType, reason, frozenBy, now, now, id]);
    }

    async unfreezeTicket(id: string): Promise<void> {
        const now = new Date().toISOString();
        const sql = `
            UPDATE tickets 
            SET status = status_before_frozen, status_before_frozen = NULL,
                frozen_type = NULL, frozen_reason = NULL, frozen_by = NULL, frozen_at = NULL,
                updated_at = ?
            WHERE id = ?
        `;
        await this.db.run(sql, [now, id]);
    }

    async settleTicket(id: string): Promise<void> {
        const now = new Date().toISOString();
        const sql = 'UPDATE tickets SET status = ?, settled_at = ?, updated_at = ? WHERE id = ?';
        await this.db.run(sql, [TicketStatus.SETTLED, now, now, id]);
    }

    async archiveTicket(id: string): Promise<void> {
        const now = new Date().toISOString();
        const sql = 'UPDATE tickets SET status = ?, archived_at = ?, updated_at = ? WHERE id = ?';
        await this.db.run(sql, [TicketStatus.ARCHIVED, now, now, id]);
    }

    async getTicketsByBatchId(batchId: string): Promise<Ticket[]> {
        const sql = 'SELECT * FROM tickets WHERE batch_id = ?';
        const rows = await this.db.all<any>(sql, [batchId]);
        return rows.map(row => this.mapRowToTicket(row));
    }

    async getTickets(filters: any = {}, limit: number = 100, offset: number = 0): Promise<Ticket[]> {
        let sql = 'SELECT * FROM tickets WHERE 1=1';
        const params: any[] = [];

        if (filters.status) {
            sql += ' AND status = ?';
            params.push(filters.status);
        }
        if (filters.batchId) {
            sql += ' AND batch_id = ?';
            params.push(filters.batchId);
        }
        if (filters.createdBy) {
            sql += ' AND created_by = ?';
            params.push(filters.createdBy);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const rows = await this.db.all<any>(sql, params);
        return rows.map(row => this.mapRowToTicket(row));
    }

    private mapRowToTicket(row: any): Ticket {
        return {
            id: row.id,
            batchId: row.batch_id,
            status: row.status,
            sessionSummary: JSON.parse(row.session_summary),
            slaRuleId: row.sla_rule_id,
            currentAgentId: row.current_agent_id,
            assignmentHistory: [],
            compensationApprovals: [],
            inventoryDifferences: [],
            timeoutRecords: [],
            totalCompensation: row.total_compensation,
            statusBeforeFrozen: row.status_before_frozen,
            frozenReason: row.frozen_reason,
            frozenType: row.frozen_type,
            frozenBy: row.frozen_by,
            frozenAt: row.frozen_at ? new Date(row.frozen_at) : undefined,
            settledAt: row.settled_at ? new Date(row.settled_at) : undefined,
            archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            createdBy: row.created_by
        };
    }

    async createAssignment(record: Omit<AssignmentRecord, 'id'>): Promise<AssignmentRecord> {
        const id = uuidv4();
        const sql = `
            INSERT INTO assignment_records (
                id, ticket_id, from_agent_id, to_agent_id, assignment_type,
                reason, assigned_at, expected_complete_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await this.db.run(sql, [
            id,
            record.ticketId,
            record.fromAgentId || null,
            record.toAgentId,
            record.assignmentType,
            record.reason || null,
            record.assignedAt.toISOString(),
            record.expectedCompleteTime?.toISOString() || null
        ]);

        return { ...record, id };
    }

    async getAssignmentsByTicketId(ticketId: string): Promise<AssignmentRecord[]> {
        const sql = 'SELECT * FROM assignment_records WHERE ticket_id = ? ORDER BY assigned_at DESC';
        const rows = await this.db.all<any>(sql, [ticketId]);
        return rows.map(row => ({
            id: row.id,
            ticketId: row.ticket_id,
            fromAgentId: row.from_agent_id,
            toAgentId: row.to_agent_id,
            assignmentType: row.assignment_type,
            reason: row.reason,
            assignedAt: new Date(row.assigned_at),
            expectedCompleteTime: row.expected_complete_time ? new Date(row.expected_complete_time) : undefined
        }));
    }

    async createTimeoutRecord(record: Omit<TimeoutRecord, 'id'>): Promise<TimeoutRecord> {
        const id = uuidv4();
        const sql = `
            INSERT INTO timeout_records (
                id, ticket_id, assignment_id, agent_id, timeout_type,
                duration, blame_level, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await this.db.run(sql, [
            id,
            record.ticketId,
            record.assignmentId,
            record.agentId,
            record.timeoutType,
            record.duration,
            record.blameLevel,
            record.createdAt.toISOString()
        ]);

        return { ...record, id };
    }

    async getTimeoutRecordsByTicketId(ticketId: string): Promise<TimeoutRecord[]> {
        const sql = 'SELECT * FROM timeout_records WHERE ticket_id = ? ORDER BY created_at DESC';
        const rows = await this.db.all<any>(sql, [ticketId]);
        return rows.map(row => ({
            id: row.id,
            ticketId: row.ticket_id,
            assignmentId: row.assignment_id,
            agentId: row.agent_id,
            timeoutType: row.timeout_type,
            duration: row.duration,
            blameLevel: row.blame_level,
            createdAt: new Date(row.created_at)
        }));
    }

    async createCompensationApproval(approval: Omit<CompensationApproval, 'id'>): Promise<CompensationApproval> {
        const id = uuidv4();
        const sql = `
            INSERT INTO compensation_approvals (
                id, ticket_id, requested_amount, approved_amount, status,
                reason, approver_id, approved_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await this.db.run(sql, [
            id,
            approval.ticketId,
            approval.requestedAmount,
            approval.approvedAmount || null,
            approval.status,
            approval.reason,
            approval.approverId || null,
            approval.approvedAt?.toISOString() || null,
            approval.createdAt.toISOString()
        ]);

        return { ...approval, id };
    }

    async updateCompensationApproval(
        id: string,
        status: string,
        approvedAmount: number | undefined,
        approverId: string
    ): Promise<void> {
        const now = new Date().toISOString();
        const sql = `
            UPDATE compensation_approvals
            SET status = ?, approved_amount = ?, approver_id = ?, approved_at = ?
            WHERE id = ?
        `;
        await this.db.run(sql, [status, approvedAmount || null, approverId, now, id]);
    }

    async getCompensationApprovalsByTicketId(ticketId: string): Promise<CompensationApproval[]> {
        const sql = 'SELECT * FROM compensation_approvals WHERE ticket_id = ? ORDER BY created_at DESC';
        const rows = await this.db.all<any>(sql, [ticketId]);
        return rows.map(row => ({
            id: row.id,
            ticketId: row.ticket_id,
            requestedAmount: row.requested_amount,
            approvedAmount: row.approved_amount,
            status: row.status,
            reason: row.reason,
            approverId: row.approver_id,
            approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
            createdAt: new Date(row.created_at)
        }));
    }

    async createStateTransition(transition: Omit<StateTransition, 'id'>): Promise<StateTransition> {
        const id = uuidv4();
        const sql = `
            INSERT INTO state_transitions (
                id, ticket_id, from_status, to_status, reason,
                operator_id, operator_name, manual, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await this.db.run(sql, [
            id,
            transition.ticketId,
            transition.fromStatus,
            transition.toStatus,
            transition.reason,
            transition.operatorId,
            transition.operatorName || null,
            transition.manual ? 1 : 0,
            transition.metadata ? JSON.stringify(transition.metadata) : null,
            transition.createdAt.toISOString()
        ]);

        return { ...transition, id };
    }

    async getStateTransitionsByTicketId(ticketId: string): Promise<StateTransition[]> {
        const sql = 'SELECT * FROM state_transitions WHERE ticket_id = ? ORDER BY created_at ASC';
        const rows = await this.db.all<any>(sql, [ticketId]);
        return rows.map(row => ({
            id: row.id,
            ticketId: row.ticket_id,
            fromStatus: row.from_status,
            toStatus: row.to_status,
            reason: row.reason,
            operatorId: row.operator_id,
            operatorName: row.operator_name,
            manual: row.manual === 1,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            createdAt: new Date(row.created_at)
        }));
    }

    async createBatch(batch: Omit<Batch, 'id'>): Promise<Batch> {
        const id = uuidv4();
        const now = new Date().toISOString();
        const sql = `
            INSERT INTO batches (
                id, name, status, ticket_count, total_amount, frozen_count,
                settled_count, created_at, updated_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await this.db.run(sql, [
            id,
            batch.name,
            batch.status,
            batch.ticketCount,
            batch.totalAmount,
            batch.frozenCount,
            batch.settledCount,
            now,
            now,
            batch.createdBy
        ]);

        return { ...batch, id };
    }

    async getBatchById(id: string): Promise<Batch | null> {
        const sql = 'SELECT * FROM batches WHERE id = ?';
        const row = await this.db.get<any>(sql, [id]);
        if (!row) return null;
        return this.mapRowToBatch(row);
    }

    async updateBatchStats(batchId: string): Promise<void> {
        const now = new Date().toISOString();
        const sql = `
            UPDATE batches 
            SET ticket_count = (SELECT COUNT(*) FROM tickets WHERE batch_id = ?),
                total_amount = (SELECT COALESCE(SUM(total_compensation), 0) FROM tickets WHERE batch_id = ?),
                frozen_count = (SELECT COUNT(*) FROM tickets WHERE batch_id = ? AND status = 'frozen'),
                settled_count = (SELECT COUNT(*) FROM tickets WHERE batch_id = ? AND status = 'settled'),
                updated_at = ?
            WHERE id = ?
        `;
        await this.db.run(sql, [batchId, batchId, batchId, batchId, now, batchId]);
    }

    async updateBatchStatus(id: string, status: BatchStatus, reviewedBy?: string): Promise<void> {
        const now = new Date().toISOString();
        let sql = 'UPDATE batches SET status = ?, updated_at = ? WHERE id = ?';
        let params: any[] = [status, now, id];

        if (reviewedBy) {
            sql = 'UPDATE batches SET status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?';
            params = [status, reviewedBy, now, now, id];
        }

        await this.db.run(sql, params);
    }

    async getBatches(filters: any = {}, limit: number = 100, offset: number = 0): Promise<Batch[]> {
        let sql = 'SELECT * FROM batches WHERE 1=1';
        const params: any[] = [];

        if (filters.status) {
            sql += ' AND status = ?';
            params.push(filters.status);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const rows = await this.db.all<any>(sql, params);
        return rows.map(row => this.mapRowToBatch(row));
    }

    private mapRowToBatch(row: any): Batch {
        return {
            id: row.id,
            name: row.name,
            status: row.status,
            ticketCount: row.ticket_count,
            totalAmount: row.total_amount,
            frozenCount: row.frozen_count,
            settledCount: row.settled_count,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            createdBy: row.created_by,
            reviewedBy: row.reviewed_by,
            reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined
        };
    }

    async createAuditLog(log: Omit<AuditLog, 'id'>): Promise<AuditLog> {
        const id = uuidv4();
        const sql = `
            INSERT INTO audit_logs (
                id, entity_type, entity_id, action, old_value, new_value,
                operator_id, operator_name, ip_address, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await this.db.run(sql, [
            id,
            log.entityType,
            log.entityId,
            log.action,
            log.oldValue !== undefined ? JSON.stringify(log.oldValue) : null,
            log.newValue !== undefined ? JSON.stringify(log.newValue) : null,
            log.operatorId,
            log.operatorName || null,
            log.ipAddress || null,
            log.createdAt.toISOString()
        ]);

        return { ...log, id };
    }

    async getAuditLogs(entityType: string, entityId: string): Promise<AuditLog[]> {
        const sql = 'SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC';
        const rows = await this.db.all<any>(sql, [entityType, entityId]);
        return rows.map(row => ({
            id: row.id,
            entityType: row.entity_type,
            entityId: row.entity_id,
            action: row.action,
            oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
            newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
            operatorId: row.operator_id,
            operatorName: row.operator_name,
            ipAddress: row.ip_address,
            createdAt: new Date(row.created_at)
        }));
    }

    async createFailedRecord(record: Omit<FailedRecord, 'id'>): Promise<FailedRecord> {
        const id = uuidv4();
        const sql = `
            INSERT INTO failed_records (
                id, batch_id, ticket_id, record_type, raw_data,
                error_code, error_message, failed_at, retried
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `;

        await this.db.run(sql, [
            id,
            record.batchId || null,
            record.ticketId || null,
            record.recordType,
            record.rawData,
            record.errorCode,
            record.errorMessage,
            record.failedAt.toISOString()
        ]);

        return { ...record, id, retried: false };
    }

    async getFailedRecords(filters: any = {}): Promise<FailedRecord[]> {
        let sql = 'SELECT * FROM failed_records WHERE 1=1';
        const params: any[] = [];

        if (filters.batchId) {
            sql += ' AND batch_id = ?';
            params.push(filters.batchId);
        }
        if (filters.recordType) {
            sql += ' AND record_type = ?';
            params.push(filters.recordType);
        }

        sql += ' ORDER BY failed_at DESC';
        const rows = await this.db.all<any>(sql, params);
        return rows.map(row => ({
            id: row.id,
            batchId: row.batch_id,
            ticketId: row.ticket_id,
            recordType: row.record_type,
            rawData: row.raw_data,
            errorCode: row.error_code,
            errorMessage: row.error_message,
            failedAt: new Date(row.failed_at),
            retried: row.retried === 1,
            retriedAt: row.retried_at ? new Date(row.retried_at) : undefined
        }));
    }

    async createExportRequest(request: Omit<ExportRequest, 'id'>): Promise<ExportRequest> {
        const id = uuidv4();
        const sql = `
            INSERT INTO export_requests (
                id, batch_id, filters, status, file_url, total_records,
                success_count, failed_count, requested_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await this.db.run(sql, [
            id,
            request.batchId || null,
            request.filters ? JSON.stringify(request.filters) : null,
            request.status,
            request.fileUrl || null,
            request.totalRecords,
            request.successCount,
            request.failedCount,
            request.requestedBy,
            request.createdAt.toISOString()
        ]);

        return { ...request, id };
    }

    async updateExportRequest(
        id: string,
        status: string,
        fileUrl?: string,
        totalRecords?: number,
        successCount?: number,
        failedCount?: number
    ): Promise<void> {
        const now = new Date().toISOString();
        const sql = `
            UPDATE export_requests
            SET status = ?, file_url = ?, total_records = ?, 
                success_count = ?, failed_count = ?, completed_at = ?
            WHERE id = ?
        `;
        await this.db.run(sql, [
            status,
            fileUrl || null,
            totalRecords || 0,
            successCount || 0,
            failedCount || 0,
            now,
            id
        ]);
    }

    async getExportRequestById(id: string): Promise<ExportRequest | null> {
        const sql = 'SELECT * FROM export_requests WHERE id = ?';
        const row = await this.db.get<any>(sql, [id]);
        if (!row) return null;
        return {
            id: row.id,
            batchId: row.batch_id,
            filters: row.filters ? JSON.parse(row.filters) : undefined,
            status: row.status,
            fileUrl: row.file_url,
            totalRecords: row.total_records,
            successCount: row.success_count,
            failedCount: row.failed_count,
            requestedBy: row.requested_by,
            createdAt: new Date(row.created_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined
        };
    }

    async createAttachment(attachment: Omit<TicketAttachment, 'id'>): Promise<TicketAttachment> {
        const id = uuidv4();
        const sql = `
            INSERT INTO ticket_attachments (
                id, ticket_id, file_name, file_type, file_url,
                uploaded_by, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await this.db.run(sql, [
            id,
            attachment.ticketId,
            attachment.fileName,
            attachment.fileType,
            attachment.fileUrl,
            attachment.uploadedBy,
            attachment.uploadedAt.toISOString()
        ]);

        return { ...attachment, id };
    }

    async getAttachmentsByTicketId(ticketId: string): Promise<TicketAttachment[]> {
        const sql = 'SELECT * FROM ticket_attachments WHERE ticket_id = ? ORDER BY uploaded_at DESC';
        const rows = await this.db.all<any>(sql, [ticketId]);
        return rows.map(row => ({
            id: row.id,
            ticketId: row.ticket_id,
            fileName: row.file_name,
            fileType: row.file_type,
            fileUrl: row.file_url,
            uploadedBy: row.uploaded_by,
            uploadedAt: new Date(row.uploaded_at)
        }));
    }

    async createSLARule(rule: Omit<SLARule, 'id'>): Promise<SLARule> {
        const id = uuidv4();
        const sql = `
            INSERT INTO sla_rules (
                id, ticket_type, priority, first_response_time,
                resolution_time, escalation_threshold, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await this.db.run(sql, [
            id,
            rule.ticketType,
            rule.priority,
            rule.firstResponseTime,
            rule.resolutionTime,
            rule.escalationThreshold,
            rule.createdAt.toISOString()
        ]);

        return { ...rule, id };
    }

    async getSLARuleById(id: string): Promise<SLARule | null> {
        const sql = 'SELECT * FROM sla_rules WHERE id = ?';
        const row = await this.db.get<any>(sql, [id]);
        if (!row) return null;
        return {
            id: row.id,
            ticketType: row.ticket_type,
            priority: row.priority,
            firstResponseTime: row.first_response_time,
            resolutionTime: row.resolution_time,
            escalationThreshold: row.escalation_threshold,
            createdAt: new Date(row.created_at)
        };
    }

    async getSLARules(): Promise<SLARule[]> {
        const sql = 'SELECT * FROM sla_rules ORDER BY created_at DESC';
        const rows = await this.db.all<any>(sql);
        return rows.map(row => ({
            id: row.id,
            ticketType: row.ticket_type,
            priority: row.priority,
            firstResponseTime: row.first_response_time,
            resolutionTime: row.resolution_time,
            escalationThreshold: row.escalation_threshold,
            createdAt: new Date(row.created_at)
        }));
    }

    async createCompensationRule(rule: Omit<CompensationRule, 'id'>): Promise<CompensationRule> {
        const id = uuidv4();
        const sql = `
            INSERT INTO compensation_rules (
                id, issue_type, base_amount, max_amount, multiplier, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        await this.db.run(sql, [
            id,
            rule.issueType,
            rule.baseAmount,
            rule.maxAmount,
            rule.multiplier,
            rule.createdAt.toISOString()
        ]);

        return { ...rule, id };
    }

    async getCompensationRules(): Promise<CompensationRule[]> {
        const sql = 'SELECT * FROM compensation_rules ORDER BY created_at DESC';
        const rows = await this.db.all<any>(sql);
        return rows.map(row => ({
            id: row.id,
            issueType: row.issue_type,
            baseAmount: row.base_amount,
            maxAmount: row.max_amount,
            multiplier: row.multiplier,
            createdAt: new Date(row.created_at)
        }));
    }

    getDatabase(): Database {
        return this.db;
    }
}

export default TicketDao;
