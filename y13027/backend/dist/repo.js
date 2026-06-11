import { db } from './db.js';
import { v4 as uuidv4 } from 'uuid';
function recordToModel(row) {
    return {
        id: row.id,
        businessNo: row.business_no,
        businessDate: row.business_date,
        clientName: row.client_name,
        clientId: row.client_id,
        productName: row.product_name,
        productCode: row.product_code,
        amount: row.amount,
        currency: row.currency,
        primaryCaliber: row.primary_caliber,
        secondaryCaliber: row.secondary_caliber,
        status: row.status,
        currentConclusion: row.current_conclusion,
        isDualCaliberConflict: row.is_dual_caliber_conflict === 1,
        isSplitRepayment: row.is_split_repayment === 1,
        splitParentId: row.split_parent_id || undefined,
        boundarySampleTag: row.boundary_sample_tag || undefined,
        exceptionQueueId: row.exception_queue_id || undefined,
        remark: row.remark || undefined,
        operator: row.operator || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        reviewedAt: row.reviewed_at || undefined,
    };
}
function exceptionToModel(row) {
    return {
        id: row.id,
        reconciliationId: row.reconciliation_id,
        caliberFilter: JSON.parse(row.caliber_filter),
        reason: row.reason,
        severity: row.severity,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at || undefined,
        resolvedBy: row.resolved_by || undefined,
        isActive: row.is_active === 1,
    };
}
function historyToModel(row) {
    return {
        id: row.id,
        reconciliationId: row.reconciliation_id,
        changedAt: row.changed_at,
        changedBy: row.changed_by,
        previousConclusion: row.previous_conclusion,
        newConclusion: row.new_conclusion,
        previousRemark: row.previous_remark || undefined,
        newRemark: row.new_remark || undefined,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        changeReason: row.change_reason,
        previousSupplementaryMaterials: row.previous_supplementary_materials ? JSON.parse(row.previous_supplementary_materials) : undefined,
        newSupplementaryMaterials: row.new_supplementary_materials ? JSON.parse(row.new_supplementary_materials) : undefined,
        supplementaryMaterials: row.supplementary_materials ? JSON.parse(row.supplementary_materials) : undefined,
    };
}
export const ReconciliationRepo = {
    getAll(filters) {
        let sql = 'SELECT * FROM reconciliation_records WHERE 1=1';
        const params = [];
        if (filters?.status) {
            sql += ' AND status = ?';
            params.push(filters.status);
        }
        if (filters?.caliber) {
            sql += ' AND (primary_caliber = ? OR secondary_caliber = ?)';
            params.push(filters.caliber, filters.caliber);
        }
        if (filters?.conflictOnly) {
            sql += ' AND is_dual_caliber_conflict = 1';
        }
        sql += ' ORDER BY business_date DESC, created_at DESC';
        const rows = db.prepare(sql).all(...params);
        return rows.map(recordToModel);
    },
    getById(id) {
        const row = db.prepare('SELECT * FROM reconciliation_records WHERE id = ?').get(id);
        return row ? recordToModel(row) : undefined;
    },
    create(record) {
        const now = new Date().toISOString();
        const id = uuidv4();
        db.prepare(`
      INSERT INTO reconciliation_records (
        id, business_no, business_date, client_name, client_id, product_name, product_code,
        amount, currency, primary_caliber, secondary_caliber, status, current_conclusion,
        is_dual_caliber_conflict, is_split_repayment, split_parent_id, boundary_sample_tag,
        exception_queue_id, remark, operator, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, record.businessNo, record.businessDate, record.clientName, record.clientId, record.productName, record.productCode, record.amount, record.currency, record.primaryCaliber, record.secondaryCaliber ?? null, record.status, record.currentConclusion ?? null, record.isDualCaliberConflict ? 1 : 0, record.isSplitRepayment ? 1 : 0, record.splitParentId ?? null, record.boundarySampleTag ?? null, record.exceptionQueueId ?? null, record.remark ?? null, record.operator ?? null, now, now);
        return this.getById(id);
    },
    updateStatusAndConclusion(id, status, conclusion, remark, operator) {
        const now = new Date().toISOString();
        db.prepare(`
      UPDATE reconciliation_records
      SET status = ?, current_conclusion = ?, remark = ?, operator = ?, reviewed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(status, conclusion ?? null, remark ?? null, operator ?? null, now, now, id);
        return this.getById(id);
    },
};
export const ExceptionQueueRepo = {
    getAll(activeOnly = true) {
        let sql = 'SELECT * FROM exception_queue';
        if (activeOnly)
            sql += ' WHERE is_active = 1';
        sql += ' ORDER BY created_at DESC';
        const rows = db.prepare(sql).all();
        return rows.map(exceptionToModel);
    },
    getByReconciliationId(reconciliationId) {
        const row = db.prepare('SELECT * FROM exception_queue WHERE reconciliation_id = ?').get(reconciliationId);
        return row ? exceptionToModel(row) : undefined;
    },
    create(item) {
        const now = new Date().toISOString();
        const id = uuidv4();
        db.prepare(`
      INSERT INTO exception_queue (
        id, reconciliation_id, caliber_filter, reason, severity,
        created_at, resolved_at, resolved_by, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, item.reconciliationId, JSON.stringify(item.caliberFilter), item.reason, item.severity, now, item.resolvedAt ?? null, item.resolvedBy ?? null, item.isActive ? 1 : 0);
        const row = db.prepare('SELECT * FROM exception_queue WHERE id = ?').get(id);
        return exceptionToModel(row);
    },
    resolve(id, resolvedBy) {
        const now = new Date().toISOString();
        db.prepare('UPDATE exception_queue SET is_active = 0, resolved_at = ?, resolved_by = ? WHERE id = ?').run(now, resolvedBy, id);
    },
};
export const HistoryChangeLogRepo = {
    getByReconciliationId(reconciliationId) {
        const rows = db.prepare('SELECT * FROM history_change_logs WHERE reconciliation_id = ? ORDER BY changed_at DESC').all(reconciliationId);
        return rows.map(historyToModel);
    },
    create(log) {
        const now = new Date().toISOString();
        const id = uuidv4();
        db.prepare(`
      INSERT INTO history_change_logs (
        id, reconciliation_id, changed_at, changed_by,
        previous_conclusion, new_conclusion, previous_remark, new_remark,
        previous_status, new_status, change_reason, supplementary_materials,
        previous_supplementary_materials, new_supplementary_materials
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, log.reconciliationId, now, log.changedBy, log.previousConclusion ?? null, log.newConclusion ?? null, log.previousRemark ?? null, log.newRemark ?? null, log.previousStatus ?? null, log.newStatus ?? null, log.changeReason, log.supplementaryMaterials ? JSON.stringify(log.supplementaryMaterials) : null, log.previousSupplementaryMaterials ? JSON.stringify(log.previousSupplementaryMaterials) : null, log.newSupplementaryMaterials ? JSON.stringify(log.newSupplementaryMaterials) : null);
        const row = db.prepare('SELECT * FROM history_change_logs WHERE id = ?').get(id);
        return historyToModel(row);
    },
};
