"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.liabilityRecordModel = void 0;
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../config/database"));
const types_1 = require("../types");
function rowToRecord(row) {
    return {
        id: row.id,
        idempotencyKey: row.idempotency_key,
        ticketId: row.ticket_id,
        ticketNumber: row.ticket_number,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        agentName: row.agent_name,
        agentId: row.agent_id,
        department: row.department,
        slaBreachType: row.sla_breach_type,
        slaBreachDuration: row.sla_breach_duration,
        compensationAmount: row.compensation_amount,
        compensationType: row.compensation_type,
        escalationLevel: row.escalation_level,
        transferCount: row.transfer_count,
        responsibleParty: row.responsible_party,
        liabilityReason: row.liability_reason,
        status: row.status,
        dataSources: row.data_sources ? JSON.parse(row.data_sources) : [],
        sourceSessionSummaryId: row.source_session_summary_id,
        sourceSlaRuleId: row.source_sla_rule_id,
        sourceCompensationApprovalId: row.source_compensation_approval_id,
        sourceSupplierStatementId: row.source_supplier_statement_id,
        sourceApprovalEmailId: row.source_approval_email_id,
        occurrenceDate: row.occurrence_date,
        submittedBy: row.submitted_by,
        submittedAt: row.submitted_at,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        rejectedBy: row.rejected_by,
        rejectedAt: row.rejected_at,
        rejectionReason: row.rejection_reason,
        secondConfirmedBy: row.second_confirmed_by,
        secondConfirmedAt: row.second_confirmed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        version: row.version,
        isDirty: row.is_dirty === 1,
        dirtyRecordTypes: row.dirty_record_types ? JSON.parse(row.dirty_record_types) : undefined,
        originalContent: row.original_content ? JSON.parse(row.original_content) : undefined,
        handlingOpinion: row.handling_opinion,
        isCorrected: row.is_corrected === 1
    };
}
exports.liabilityRecordModel = {
    async create(dto) {
        const now = new Date().toISOString();
        const id = (0, uuid_1.v4)();
        return new Promise((resolve, reject) => {
            const stmt = database_1.default.prepare(`
        INSERT INTO liability_records (
          id, idempotency_key, ticket_id, ticket_number, customer_name, customer_phone,
          agent_name, agent_id, department, sla_breach_type, sla_breach_duration,
          compensation_amount, compensation_type, escalation_level, transfer_count,
          responsible_party, liability_reason, status, data_sources,
          source_session_summary_id, source_sla_rule_id, source_compensation_approval_id,
          source_supplier_statement_id, source_approval_email_id, occurrence_date,
          created_at, updated_at, version, is_dirty, is_corrected
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(id, dto.idempotencyKey, dto.ticketId, dto.ticketNumber, dto.customerName, dto.customerPhone, dto.agentName, dto.agentId, dto.department, dto.slaBreachType, dto.slaBreachDuration, dto.compensationAmount, dto.compensationType, dto.escalationLevel, dto.transferCount, dto.responsibleParty, dto.liabilityReason, types_1.WorkflowStatus.DRAFT, JSON.stringify(dto.dataSources), dto.sourceSessionSummaryId, dto.sourceSlaRuleId, dto.sourceCompensationApprovalId, dto.sourceSupplierStatementId, dto.sourceApprovalEmailId, dto.occurrenceDate, now, now, 1, 0, 0, (err) => {
                if (err)
                    reject(err);
                else
                    this.findById(id).then(record => resolve(record)).catch(reject);
            });
            stmt.finalize();
        });
    },
    async findById(id) {
        return new Promise((resolve, reject) => {
            database_1.default.get('SELECT * FROM liability_records WHERE id = ?', [id], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row ? rowToRecord(row) : null);
            });
        });
    },
    async findByIdempotencyKey(key) {
        return new Promise((resolve, reject) => {
            database_1.default.get('SELECT * FROM liability_records WHERE idempotency_key = ?', [key], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row ? rowToRecord(row) : null);
            });
        });
    },
    async findByTicketId(ticketId) {
        return new Promise((resolve, reject) => {
            database_1.default.all('SELECT * FROM liability_records WHERE ticket_id = ?', [ticketId], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows.map(rowToRecord));
            });
        });
    },
    async list(filters = {}) {
        let sql = 'SELECT * FROM liability_records WHERE 1=1';
        const params = [];
        if (filters.status) {
            sql += ' AND status = ?';
            params.push(filters.status);
        }
        if (filters.startDate) {
            sql += ' AND occurrence_date >= ?';
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            sql += ' AND occurrence_date <= ?';
            params.push(filters.endDate);
        }
        if (filters.department) {
            sql += ' AND department = ?';
            params.push(filters.department);
        }
        if (filters.agentId) {
            sql += ' AND agent_id = ?';
            params.push(filters.agentId);
        }
        if (filters.isDirty !== undefined) {
            sql += ' AND is_dirty = ?';
            params.push(filters.isDirty ? 1 : 0);
        }
        sql += ' ORDER BY created_at DESC';
        if (filters.limit) {
            sql += ' LIMIT ?';
            params.push(filters.limit);
        }
        if (filters.offset) {
            sql += ' OFFSET ?';
            params.push(filters.offset);
        }
        return new Promise((resolve, reject) => {
            database_1.default.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows.map(rowToRecord));
            });
        });
    },
    async update(id, updates) {
        const now = new Date().toISOString();
        const current = await this.findById(id);
        if (!current)
            return null;
        const newVersion = current.version + 1;
        const fields = [];
        const params = [];
        const fieldMapping = {
            ticketNumber: 'ticket_number',
            customerName: 'customer_name',
            customerPhone: 'customer_phone',
            agentName: 'agent_name',
            agentId: 'agent_id',
            department: 'department',
            slaBreachType: 'sla_breach_type',
            slaBreachDuration: 'sla_breach_duration',
            compensationAmount: 'compensation_amount',
            compensationType: 'compensation_type',
            escalationLevel: 'escalation_level',
            transferCount: 'transfer_count',
            responsibleParty: 'responsible_party',
            liabilityReason: 'liability_reason',
            status: 'status',
            dataSources: 'data_sources',
            sourceSessionSummaryId: 'source_session_summary_id',
            sourceSlaRuleId: 'source_sla_rule_id',
            sourceCompensationApprovalId: 'source_compensation_approval_id',
            sourceSupplierStatementId: 'source_supplier_statement_id',
            sourceApprovalEmailId: 'source_approval_email_id',
            occurrenceDate: 'occurrence_date',
            submittedBy: 'submitted_by',
            submittedAt: 'submitted_at',
            reviewedBy: 'reviewed_by',
            reviewedAt: 'reviewed_at',
            rejectedBy: 'rejected_by',
            rejectedAt: 'rejected_at',
            rejectionReason: 'rejection_reason',
            secondConfirmedBy: 'second_confirmed_by',
            secondConfirmedAt: 'second_confirmed_at',
            isDirty: 'is_dirty',
            dirtyRecordTypes: 'dirty_record_types',
            originalContent: 'original_content',
            handlingOpinion: 'handling_opinion',
            isCorrected: 'is_corrected'
        };
        for (const [key, value] of Object.entries(updates)) {
            const dbField = fieldMapping[key];
            if (dbField && value !== undefined) {
                fields.push(`${dbField} = ?`);
                if (typeof value === 'object' && value !== null) {
                    params.push(JSON.stringify(value));
                }
                else if (typeof value === 'boolean') {
                    params.push(value ? 1 : 0);
                }
                else {
                    params.push(value);
                }
            }
        }
        fields.push('updated_at = ?');
        params.push(now);
        fields.push('version = ?');
        params.push(newVersion);
        params.push(id);
        return new Promise((resolve, reject) => {
            database_1.default.run(`UPDATE liability_records SET ${fields.join(', ')} WHERE id = ?`, params, (err) => {
                if (err)
                    reject(err);
                else
                    this.findById(id).then(resolve).catch(reject);
            });
        });
    },
    async markDirty(id, dirtyTypes, originalContent) {
        return this.update(id, {
            isDirty: true,
            dirtyRecordTypes: dirtyTypes,
            originalContent
        });
    },
    async markCorrected(id) {
        return this.update(id, {
            isDirty: false,
            isCorrected: true
        });
    },
    async getStats() {
        return new Promise((resolve, reject) => {
            database_1.default.get(`SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
          SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
          SUM(CASE WHEN status = 'second_confirmation' THEN 1 ELSE 0 END) as second_confirm_count,
          SUM(CASE WHEN status = 'audit_only' THEN 1 ELSE 0 END) as audit_count,
          SUM(compensation_amount) as total_amount,
          SUM(CASE WHEN is_dirty = 1 THEN 1 ELSE 0 END) as dirty_count
        FROM liability_records`, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve({
                        total: row.total,
                        byStatus: {
                            draft: row.draft_count,
                            submitted: row.submitted_count,
                            rejected: row.rejected_count,
                            second_confirmation: row.second_confirm_count,
                            audit_only: row.audit_count
                        },
                        totalAmount: row.total_amount || 0,
                        dirtyCount: row.dirty_count
                    });
            });
        });
    }
};
