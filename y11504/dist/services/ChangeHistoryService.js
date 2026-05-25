"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeHistoryService = void 0;
const ChangeHistory_1 = require("../entities/ChangeHistory");
const diff_1 = require("../utils/diff");
class ChangeHistoryService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.repository = dataSource.getRepository(ChangeHistory_1.ChangeHistory);
    }
    async recordChange(ledgerId, action, beforeData, afterData, options = {}) {
        const changes = beforeData ? (0, diff_1.compareObjects)(beforeData, afterData) : [];
        const history = this.repository.create({
            ledgerId,
            action,
            fromStatus: options.fromStatus,
            toStatus: options.toStatus,
            beforeData: beforeData || undefined,
            afterData,
            changes,
            reason: options.reason,
            operatorId: options.operatorId,
            operatorName: options.operatorName,
            operatorRole: options.operatorRole,
            version: options.version || 1,
            metadata: options.metadata,
        });
        return this.repository.save(history);
    }
    async getLedgerHistories(ledgerId, options = {}) {
        const page = options.page || 1;
        const pageSize = options.pageSize || 20;
        const skip = (page - 1) * pageSize;
        const where = { ledgerId };
        if (options.action) {
            where.action = options.action;
        }
        const [histories, total] = await this.repository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip,
            take: pageSize,
        });
        return {
            histories,
            total,
            page,
            pageSize,
        };
    }
    async getHistoryById(id) {
        return this.repository.findOne({ where: { id } });
    }
    async compareVersions(ledgerId, version1, version2) {
        const h1 = await this.repository.findOne({
            where: { ledgerId, version: version1 },
        });
        const h2 = await this.repository.findOne({
            where: { ledgerId, version: version2 },
        });
        const differences = (0, diff_1.compareObjects)(h1?.afterData || {}, h2?.afterData || {});
        return {
            version1: h1,
            version2: h2,
            differences,
        };
    }
    async getLatestVersion(ledgerId) {
        const latest = await this.repository.findOne({
            where: { ledgerId },
            order: { version: 'DESC' },
        });
        return latest?.version || 0;
    }
    async getChangeByVersion(ledgerId, version) {
        return this.repository.findOne({
            where: { ledgerId, version },
        });
    }
}
exports.ChangeHistoryService = ChangeHistoryService;
//# sourceMappingURL=ChangeHistoryService.js.map