"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.costService = exports.CostService = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../database");
class CostService {
    constructor(db) {
        this.db = db || (0, database_1.getDatabase)();
    }
    validateCostData(request) {
        if (!request.materialId)
            return 'materialId is required';
        if (!request.date)
            return 'date is required';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(request.date))
            return 'date format must be YYYY-MM-DD';
        if (typeof request.cost !== 'number' || request.cost < 0)
            return 'cost must be a non-negative number';
        if (!Number.isInteger(request.impressions) || request.impressions < 0)
            return 'impressions must be a non-negative integer';
        if (!Number.isInteger(request.clicks) || request.clicks < 0)
            return 'clicks must be a non-negative integer';
        if (request.clicks > request.impressions)
            return 'clicks cannot exceed impressions';
        return null;
    }
    async importCost(request) {
        const validationError = this.validateCostData(request);
        const now = new Date().toISOString();
        if (validationError) {
            await this.recordFailedImport(request, validationError);
            return { success: false, error: validationError };
        }
        const material = await this.db.get('SELECT materialId FROM materials WHERE materialId = ?', [request.materialId]);
        if (!material) {
            const error = `Material ${request.materialId} does not exist`;
            await this.recordFailedImport(request, error);
            return { success: false, error };
        }
        const id = (0, uuid_1.v4)();
        try {
            const existing = await this.db.get('SELECT id FROM daily_costs WHERE materialId = ? AND date = ?', [request.materialId, request.date]);
            if (existing) {
                await this.db.run(`UPDATE daily_costs
           SET cost = ?, impressions = ?, clicks = ?, importedAt = ?, isValid = 1, validationError = NULL
           WHERE materialId = ? AND date = ?`, [request.cost, request.impressions, request.clicks, now, request.materialId, request.date]);
                const data = await this.db.get('SELECT * FROM daily_costs WHERE materialId = ? AND date = ?', [request.materialId, request.date]);
                return { success: true, data };
            }
            await this.db.run(`INSERT INTO daily_costs (id, materialId, date, cost, impressions, clicks, importedAt, isValid)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`, [id, request.materialId, request.date, request.cost, request.impressions, request.clicks, now]);
            const data = await this.db.get('SELECT * FROM daily_costs WHERE id = ?', [id]);
            return { success: true, data };
        }
        catch (error) {
            await this.recordFailedImport(request, error.message);
            return { success: false, error: error.message };
        }
    }
    async recordFailedImport(request, errorReason) {
        await this.db.run(`INSERT INTO failed_records (id, recordType, originalData, errorReason, failedAt, source)
       VALUES (?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), 'cost_import', JSON.stringify(request), errorReason, new Date().toISOString(), request.source || 'manual']);
    }
    async getCostsByMaterial(materialId, includeInvalid = false) {
        let sql = 'SELECT * FROM daily_costs WHERE materialId = ?';
        const params = [materialId];
        if (!includeInvalid) {
            sql += ' AND isValid = 1';
        }
        sql += ' ORDER BY date DESC';
        return this.db.all(sql, params);
    }
    async getCostSummary(materialId) {
        const costs = await this.getCostsByMaterial(materialId);
        const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
        const totalImpressions = costs.reduce((sum, c) => sum + c.impressions, 0);
        const totalClicks = costs.reduce((sum, c) => sum + c.clicks, 0);
        return {
            totalCost,
            totalImpressions,
            totalClicks,
            avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) + '%' : '0%',
            avgCpc: totalClicks > 0 ? (totalCost / totalClicks).toFixed(2) : '0',
            dayCount: costs.length
        };
    }
    async bulkImportCosts(requests) {
        const errors = [];
        for (let i = 0; i < requests.length; i++) {
            const result = await this.importCost(requests[i]);
            if (!result.success && result.error) {
                errors.push({ index: i, error: result.error });
            }
        }
        return {
            successCount: requests.length - errors.length,
            failCount: errors.length,
            errors
        };
    }
}
exports.CostService = CostService;
exports.costService = new CostService();
//# sourceMappingURL=costService.js.map