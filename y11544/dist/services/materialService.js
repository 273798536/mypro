"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.materialService = exports.MaterialService = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../database");
const types_1 = require("../types");
const stateMachine_1 = require("./stateMachine");
class MaterialService {
    constructor(db) {
        this.db = db || (0, database_1.getDatabase)();
    }
    async createMaterial(request, role = 'operator') {
        const now = new Date().toISOString();
        const id = (0, uuid_1.v4)();
        stateMachine_1.stateMachine.validateTransition(null, types_1.MaterialStatus.DRAFT, role);
        const existing = await this.db.get('SELECT * FROM materials WHERE materialId = ?', [request.materialId]);
        if (existing) {
            throw new Error(`Material with ID ${request.materialId} already exists`);
        }
        await this.db.run(`INSERT INTO materials (id, materialId, name, platform, originalName, status, createdBy, createdAt, updatedAt, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, [id, request.materialId, request.name, request.platform, request.originalName,
            types_1.MaterialStatus.DRAFT, request.createdBy, now, now]);
        await this.db.run(`INSERT INTO status_change_logs (id, materialId, fromStatus, toStatus, changedBy, changedAt, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), request.materialId, null, types_1.MaterialStatus.DRAFT, request.createdBy, now, '创建素材']);
        return this.getMaterial(request.materialId);
    }
    async getMaterial(materialId) {
        return this.db.get('SELECT * FROM materials WHERE materialId = ?', [materialId]);
    }
    async getMaterialDetail(materialId) {
        const material = await this.getMaterial(materialId);
        if (!material)
            return undefined;
        const [auditRecords, dailyCosts, managerComments, statusLogs] = await Promise.all([
            this.db.get('SELECT * FROM audit_records WHERE materialId = ? ORDER BY auditedAt DESC LIMIT 1', [materialId]),
            this.db.all('SELECT * FROM daily_costs WHERE materialId = ? AND isValid = 1 ORDER BY date DESC', [materialId]),
            this.db.all('SELECT * FROM manager_comments WHERE materialId = ? ORDER BY commentedAt DESC', [materialId]),
            this.db.all('SELECT * FROM status_change_logs WHERE materialId = ? ORDER BY changedAt ASC', [materialId]),
        ]);
        const totalCost = dailyCosts.reduce((sum, c) => sum + c.cost, 0);
        const totalImpressions = dailyCosts.reduce((sum, c) => sum + c.impressions, 0);
        const totalClicks = dailyCosts.reduce((sum, c) => sum + c.clicks, 0);
        return {
            ...material,
            latestAudit: auditRecords,
            dailyCosts,
            managerComments,
            statusHistory: statusLogs,
            summary: {
                totalCost,
                totalImpressions,
                totalClicks,
                ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) + '%' : '0%',
                cpc: totalClicks > 0 ? (totalCost / totalClicks).toFixed(2) : '0',
            }
        };
    }
    async changeStatus(request, role = 'operator') {
        const material = await this.getMaterial(request.materialId);
        if (!material) {
            throw new Error(`Material ${request.materialId} not found`);
        }
        if (material.status === request.toStatus) {
            return material;
        }
        stateMachine_1.stateMachine.validateTransition(material.status, request.toStatus, role);
        const now = new Date().toISOString();
        await this.db.beginTransaction();
        try {
            await this.db.run(`UPDATE materials SET status = ?, updatedAt = ?, version = version + 1 WHERE materialId = ?`, [request.toStatus, now, request.materialId]);
            await this.db.run(`INSERT INTO status_change_logs (id, materialId, fromStatus, toStatus, changedBy, changedAt, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), request.materialId, material.status, request.toStatus, request.changedBy, now, request.reason]);
            await this.db.commit();
        }
        catch (error) {
            await this.db.rollback();
            throw error;
        }
        return this.getMaterial(request.materialId);
    }
    async submitForReview(materialId, submittedBy) {
        return this.changeStatus({
            materialId,
            toStatus: types_1.MaterialStatus.SUBMITTED,
            changedBy: submittedBy,
            reason: '提交审核'
        }, 'operator');
    }
    async rejectMaterial(materialId, rejectedBy, reason) {
        return this.changeStatus({
            materialId,
            toStatus: types_1.MaterialStatus.REJECTED,
            changedBy: rejectedBy,
            reason
        }, 'reviewer');
    }
    async secondaryConfirm(materialId, confirmedBy) {
        return this.changeStatus({
            materialId,
            toStatus: types_1.MaterialStatus.SECONDARY_CONFIRMED,
            changedBy: confirmedBy,
            reason: '二次审核通过'
        }, 'reviewer');
    }
    async listMaterials(status, page = 1, pageSize = 20) {
        let sql = 'SELECT * FROM materials';
        let countSql = 'SELECT COUNT(*) as count FROM materials';
        const params = [];
        if (status) {
            sql += ' WHERE status = ?';
            countSql += ' WHERE status = ?';
            params.push(status);
        }
        sql += ' ORDER BY updatedAt DESC LIMIT ? OFFSET ?';
        params.push(pageSize, (page - 1) * pageSize);
        const [items, countResult] = await Promise.all([
            this.db.all(sql, params),
            this.db.get(countSql, status ? [status] : [])
        ]);
        return {
            items,
            total: countResult?.count || 0,
            page,
            pageSize
        };
    }
    async getStatusHistory(materialId) {
        return this.db.all('SELECT * FROM status_change_logs WHERE materialId = ? ORDER BY changedAt ASC', [materialId]);
    }
}
exports.MaterialService = MaterialService;
exports.materialService = new MaterialService();
//# sourceMappingURL=materialService.js.map