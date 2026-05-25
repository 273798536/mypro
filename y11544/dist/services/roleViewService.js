"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleViewService = exports.RoleViewService = void 0;
const database_1 = require("../database");
const types_1 = require("../types");
const dataMaskingService_1 = require("./dataMaskingService");
class RoleViewService {
    constructor(db) {
        this.db = db || (0, database_1.getDatabase)();
    }
    async getRoleDashboard(role) {
        const baseStats = await this.getBaseStats();
        switch (role) {
            case types_1.UserRole.OPERATOR:
                return this.getOperatorView(baseStats);
            case types_1.UserRole.REVIEWER:
                return this.getReviewerView(baseStats);
            case types_1.UserRole.MANAGER:
                return this.getManagerView(baseStats);
            case types_1.UserRole.AUDITOR:
                return this.getAuditorView(baseStats);
            case types_1.UserRole.ADMIN:
                return this.getAdminView(baseStats);
            default:
                return baseStats;
        }
    }
    async getBaseStats() {
        const [statusStats, recentChanges, failedStats] = await Promise.all([
            this.db.all('SELECT status, COUNT(*) as count FROM materials GROUP BY status'),
            this.db.all(`SELECT l.*, m.name as materialName
         FROM status_change_logs l
         INNER JOIN materials m ON l.materialId = m.materialId
         ORDER BY l.changedAt DESC LIMIT 10`),
            this.db.get('SELECT COUNT(*) as count FROM failed_records WHERE failedAt >= ?', [new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()])
        ]);
        const statusMap = {};
        statusStats.forEach(s => {
            statusMap[s.status] = s.count;
        });
        return {
            totalMaterials: statusStats.reduce((sum, s) => sum + s.count, 0),
            byStatus: statusMap,
            recentChanges,
            failedRecords24h: failedStats?.count || 0
        };
    }
    getOperatorView(baseStats) {
        return {
            role: types_1.UserRole.OPERATOR,
            focus: 'My Drafts & Submissions',
            totalMaterials: baseStats.totalMaterials,
            draftCount: baseStats.byStatus[types_1.MaterialStatus.DRAFT] || 0,
            submittedCount: baseStats.byStatus[types_1.MaterialStatus.SUBMITTED] || 0,
            rejectedCount: baseStats.byStatus[types_1.MaterialStatus.REJECTED] || 0,
            recentChanges: baseStats.recentChanges.map((c) => dataMaskingService_1.dataMaskingService.maskMaterialDetail(c, types_1.UserRole.OPERATOR)),
            actions: ['Create Draft', 'Edit Draft', 'Submit for Review', 'Resubmit Rejected']
        };
    }
    getReviewerView(baseStats) {
        return {
            role: types_1.UserRole.REVIEWER,
            focus: 'Pending Reviews',
            totalMaterials: baseStats.totalMaterials,
            pendingReview: baseStats.byStatus[types_1.MaterialStatus.SUBMITTED] || 0,
            secondaryConfirmed: baseStats.byStatus[types_1.MaterialStatus.SECONDARY_CONFIRMED] || 0,
            recentChanges: baseStats.recentChanges,
            actions: ['Review Submissions', 'Approve/Reject', 'Add Comments']
        };
    }
    getManagerView(baseStats) {
        return {
            role: types_1.UserRole.MANAGER,
            focus: 'Team Overview & Quality Control',
            totalMaterials: baseStats.totalMaterials,
            byStatus: baseStats.byStatus,
            failedRecords24h: baseStats.failedRecords24h,
            recentChanges: baseStats.recentChanges,
            actions: ['View All Materials', 'Add Manager Comments', 'Review Audit Trails']
        };
    }
    getAuditorView(baseStats) {
        return {
            role: types_1.UserRole.AUDITOR,
            focus: 'Compliance & Audit Trail',
            totalMaterials: baseStats.totalMaterials,
            auditOnlyCount: baseStats.byStatus[types_1.MaterialStatus.AUDIT_ONLY] || 0,
            exportedCount: baseStats.byStatus[types_1.MaterialStatus.EXPORTED] || 0,
            recentChanges: baseStats.recentChanges,
            actions: ['View Audit Trails', 'Export Reports', 'Verify Data Integrity']
        };
    }
    getAdminView(baseStats) {
        return {
            role: types_1.UserRole.ADMIN,
            focus: 'Full System Control',
            totalMaterials: baseStats.totalMaterials,
            byStatus: baseStats.byStatus,
            failedRecords24h: baseStats.failedRecords24h,
            recentChanges: baseStats.recentChanges,
            actions: ['Full CRUD Access', 'Manage Users', 'System Configuration', 'All Export Options']
        };
    }
    async getMaterialForRole(materialId, role) {
        const material = await this.db.get('SELECT * FROM materials WHERE materialId = ?', [materialId]);
        if (!material)
            return undefined;
        const [auditRecords, dailyCosts, managerComments, statusLogs] = await Promise.all([
            this.db.all('SELECT * FROM audit_records WHERE materialId = ? ORDER BY auditedAt DESC', [materialId]),
            this.db.all('SELECT * FROM daily_costs WHERE materialId = ? AND isValid = 1 ORDER BY date DESC', [materialId]),
            this.db.all('SELECT * FROM manager_comments WHERE materialId = ? ORDER BY commentedAt DESC', [materialId]),
            this.db.all('SELECT * FROM status_change_logs WHERE materialId = ? ORDER BY changedAt ASC', [materialId]),
        ]);
        const totalCost = dailyCosts.reduce((sum, c) => sum + c.cost, 0);
        const totalImpressions = dailyCosts.reduce((sum, c) => sum + c.impressions, 0);
        const totalClicks = dailyCosts.reduce((sum, c) => sum + c.clicks, 0);
        const result = {
            ...dataMaskingService_1.dataMaskingService.maskMaterialDetail(material, role),
            auditRecords: auditRecords.map(a => dataMaskingService_1.dataMaskingService.maskMaterialDetail(a, role)),
            dailyCosts: dailyCosts.map(c => dataMaskingService_1.dataMaskingService.maskMaterialDetail(c, role)),
            managerComments: managerComments.map(c => dataMaskingService_1.dataMaskingService.maskMaterialDetail(c, role)),
            statusHistory: statusLogs.map(l => dataMaskingService_1.dataMaskingService.maskMaterialDetail(l, role)),
            summary: {
                totalCost,
                totalImpressions,
                totalClicks,
                ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) + '%' : '0%',
                cpc: totalClicks > 0 ? (totalCost / totalClicks).toFixed(2) : '0',
            }
        };
        return result;
    }
}
exports.RoleViewService = RoleViewService;
exports.roleViewService = new RoleViewService();
//# sourceMappingURL=roleViewService.js.map