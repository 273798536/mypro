"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogService = exports.AuditLogService = void 0;
const entities_1 = require("../entities");
const data_source_1 = require("../database/data-source");
class AuditLogService {
    constructor() {
        this.repository = data_source_1.AppDataSource.getRepository(entities_1.AuditLog);
    }
    async log(action, options = {}) {
        const log = new entities_1.AuditLog();
        log.action = action;
        log.batchId = options.batchId || null;
        log.materialId = options.materialId || null;
        log.fieldName = options.fieldName || null;
        log.oldValue = options.oldValue !== undefined ? String(options.oldValue) : null;
        log.newValue = options.newValue !== undefined ? String(options.newValue) : null;
        log.diff = this.generateDiff(options.oldValue, options.newValue);
        log.operator = options.operator || null;
        log.reason = options.reason || null;
        return await this.repository.save(log);
    }
    generateDiff(oldValue, newValue) {
        if (oldValue === undefined && newValue === undefined)
            return null;
        if (oldValue === newValue)
            return null;
        const oldStr = oldValue !== undefined ? String(oldValue) : '(空)';
        const newStr = newValue !== undefined ? String(newValue) : '(空)';
        return `${oldStr} → ${newStr}`;
    }
    async getBatchHistory(batchId) {
        return await this.repository.find({
            where: { batchId },
            order: { createdAt: 'DESC' }
        });
    }
    async getMaterialHistory(materialId) {
        return await this.repository.find({
            where: { materialId },
            order: { createdAt: 'DESC' }
        });
    }
    async getChangeDiff(batchId, fieldName) {
        const where = { batchId };
        if (fieldName)
            where.fieldName = fieldName;
        return await this.repository.find({
            where,
            order: { createdAt: 'DESC' }
        });
    }
}
exports.AuditLogService = AuditLogService;
exports.auditLogService = new AuditLogService();
