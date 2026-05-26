"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const data_source_1 = require("../data-source");
const RetryQueue_1 = require("../entities/RetryQueue");
const DeadLetter_1 = require("../entities/DeadLetter");
const DirtyRecord_1 = require("../entities/DirtyRecord");
const OperationTrace_1 = require("../entities/OperationTrace");
const Contract_1 = require("../entities/Contract");
const CompensationRecord_1 = require("../entities/CompensationRecord");
const csv_writer_1 = require("csv-writer");
const path = __importStar(require("path"));
const date_fns_1 = require("date-fns");
class ReportService {
    constructor() {
        this.retryQueueRepo = data_source_1.AppDataSource.getRepository(RetryQueue_1.RetryQueue);
        this.deadLetterRepo = data_source_1.AppDataSource.getRepository(DeadLetter_1.DeadLetter);
        this.dirtyRecordRepo = data_source_1.AppDataSource.getRepository(DirtyRecord_1.DirtyRecord);
        this.operationTraceRepo = data_source_1.AppDataSource.getRepository(OperationTrace_1.OperationTrace);
        this.contractRepo = data_source_1.AppDataSource.getRepository(Contract_1.Contract);
        this.compensationRepo = data_source_1.AppDataSource.getRepository(CompensationRecord_1.CompensationRecord);
    }
    async generateBusinessReport(options = {}) {
        const whereClause = this.buildDateWhereClause(options);
        const retryStats = await this.getRetryQueueStats(whereClause);
        const deadLetterStats = await this.getDeadLetterStats(whereClause);
        const dirtyDataStats = await this.getDirtyDataStats(whereClause);
        const compensationStats = await this.getCompensationStats(whereClause);
        const topIssues = await this.getTopIssues(whereClause);
        const recoverySuggestions = this.generateRecoverySuggestions(retryStats, deadLetterStats);
        return {
            summary: {
                generatedAt: (0, date_fns_1.formatISO)(new Date()),
                period: {
                    startDate: options.startDate,
                    endDate: options.endDate,
                },
            },
            retryQueueStats: retryStats,
            deadLetterStats: deadLetterStats,
            dirtyDataStats: dirtyDataStats,
            compensationStats: compensationStats,
            topIssues: topIssues,
            recoverySuggestions: recoverySuggestions,
        };
    }
    async exportToCSV(report, exportDir) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `business-report-${timestamp}.csv`;
        const filePath = path.join(exportDir, filename);
        const records = [];
        records.push({ category: "重试队列统计", item: "总数", value: report.retryQueueStats.total });
        records.push({ category: "重试队列统计", item: "待处理", value: report.retryQueueStats.pending });
        records.push({ category: "重试队列统计", item: "处理中", value: report.retryQueueStats.processing });
        records.push({ category: "重试队列统计", item: "重试中", value: report.retryQueueStats.retrying });
        records.push({ category: "重试队列统计", item: "成功", value: report.retryQueueStats.success });
        records.push({ category: "重试队列统计", item: "失败", value: report.retryQueueStats.failed });
        records.push({ category: "重试队列统计", item: "人工干预", value: report.retryQueueStats.manualIntervention });
        records.push({ category: "重试队列统计", item: "死信", value: report.retryQueueStats.deadLetter });
        records.push({ category: "死信统计", item: "总数", value: report.deadLetterStats.total });
        records.push({ category: "死信统计", item: "待处理", value: report.deadLetterStats.pending });
        records.push({ category: "死信统计", item: "已解决", value: report.deadLetterStats.resolved });
        records.push({ category: "死信统计", item: "已驳回", value: report.deadLetterStats.dismissed });
        records.push({ category: "死信统计", item: "已复活", value: report.deadLetterStats.resurrected });
        records.push({ category: "脏数据统计", item: "总数", value: report.dirtyDataStats.total });
        records.push({ category: "脏数据统计", item: "待处理", value: report.dirtyDataStats.pending });
        records.push({ category: "脏数据统计", item: "审核中", value: report.dirtyDataStats.reviewed });
        records.push({ category: "脏数据统计", item: "已解决", value: report.dirtyDataStats.resolved });
        records.push({ category: "补偿统计", item: "总数", value: report.compensationStats.total });
        records.push({ category: "补偿统计", item: "总金额", value: report.compensationStats.totalAmount });
        records.push({ category: "补偿统计", item: "待审批", value: report.compensationStats.pending });
        records.push({ category: "补偿统计", item: "已批准", value: report.compensationStats.approved });
        records.push({ category: "补偿统计", item: "处理中", value: report.compensationStats.processing });
        records.push({ category: "补偿统计", item: "已完成", value: report.compensationStats.completed });
        report.topIssues.forEach((issue, index) => {
            records.push({
                category: `问题TOP${index + 1}`,
                item: issue.category,
                value: issue.count,
                remark: issue.description,
            });
        });
        report.recoverySuggestions.forEach((suggestion, index) => {
            records.push({
                category: "恢复建议",
                item: `建议${index + 1}`,
                value: suggestion,
            });
        });
        const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
            path: filePath,
            header: [
                { id: "category", title: "分类" },
                { id: "item", title: "项目" },
                { id: "value", title: "数值/内容" },
                { id: "remark", title: "备注" },
            ],
        });
        await csvWriter.writeRecords(records);
        return filePath;
    }
    async exportDeadLetterToCSV(exportDir) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `dead-letter-${timestamp}.csv`;
        const filePath = path.join(exportDir, filename);
        const deadLetters = await this.deadLetterRepo.find({
            order: { createdAt: "DESC" },
        });
        const records = deadLetters.map((dl) => ({
            id: dl.id,
            itemType: dl.itemType,
            contractId: dl.contractId || "",
            retryCategory: dl.retryCategory || "",
            retryCount: dl.retryCount,
            finalError: dl.finalError || "",
            status: dl.status,
            isResurrected: dl.isResurrected ? "是" : "否",
            createdAt: dl.createdAt.toISOString(),
        }));
        const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
            path: filePath,
            header: [
                { id: "id", title: "死信ID" },
                { id: "itemType", title: "任务类型" },
                { id: "contractId", title: "合同ID" },
                { id: "retryCategory", title: "重试分类" },
                { id: "retryCount", title: "重试次数" },
                { id: "finalError", title: "最终错误" },
                { id: "status", title: "状态" },
                { id: "isResurrected", title: "是否复活" },
                { id: "createdAt", title: "创建时间" },
            ],
        });
        await csvWriter.writeRecords(records);
        return filePath;
    }
    async exportDirtyRecordsToCSV(exportDir) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `dirty-records-${timestamp}.csv`;
        const filePath = path.join(exportDir, filename);
        const dirtyRecords = await this.dirtyRecordRepo.find({
            order: { createdAt: "DESC" },
        });
        const records = dirtyRecords.map((dr) => ({
            id: dr.id,
            dirtyType: dr.dirtyType,
            sourceTable: dr.sourceTable,
            sourceRecordId: dr.sourceRecordId || "",
            fieldIssues: dr.fieldIssues || "",
            status: dr.status,
            isReconciled: dr.isReconciled ? "是" : "否",
            createdAt: dr.createdAt.toISOString(),
        }));
        const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
            path: filePath,
            header: [
                { id: "id", title: "脏记录ID" },
                { id: "dirtyType", title: "脏数据类型" },
                { id: "sourceTable", title: "来源表" },
                { id: "sourceRecordId", title: "来源记录ID" },
                { id: "fieldIssues", title: "字段问题" },
                { id: "status", title: "状态" },
                { id: "isReconciled", title: "是否已对账" },
                { id: "createdAt", title: "创建时间" },
            ],
        });
        await csvWriter.writeRecords(records);
        return filePath;
    }
    buildDateWhereClause(options) {
        const conditions = [];
        if (options.startDate) {
            conditions.push(`createdAt >= '${options.startDate}'`);
        }
        if (options.endDate) {
            conditions.push(`createdAt <= '${options.endDate}'`);
        }
        return conditions.join(" AND ");
    }
    async getRetryQueueStats(whereClause) {
        const baseQuery = whereClause ? `WHERE ${whereClause}` : "";
        const total = await this.retryQueueRepo.count();
        const pending = await this.retryQueueRepo.count({ where: { status: "PENDING" } });
        const processing = await this.retryQueueRepo.count({ where: { status: "PROCESSING" } });
        const retrying = await this.retryQueueRepo.count({ where: { status: "RETRYING" } });
        const success = await this.retryQueueRepo.count({ where: { status: "SUCCESS" } });
        const failed = await this.retryQueueRepo.count({ where: { status: "FAILED" } });
        const manualIntervention = await this.retryQueueRepo.count({
            where: { status: "MANUAL_INTERVENTION" },
        });
        const deadLetter = await this.retryQueueRepo.count({ where: { status: "DEAD_LETTER" } });
        const byCategory = await this.retryQueueRepo
            .createQueryBuilder("q")
            .select("q.retryCategory", "category")
            .addSelect("COUNT(*)", "count")
            .where("q.retryCategory IS NOT NULL")
            .groupBy("q.retryCategory")
            .orderBy("count", "DESC")
            .limit(10)
            .getRawMany();
        return {
            total,
            pending,
            processing,
            retrying,
            success,
            failed,
            manualIntervention,
            deadLetter,
            byCategory,
        };
    }
    async getDeadLetterStats(whereClause) {
        const total = await this.deadLetterRepo.count();
        const pending = await this.deadLetterRepo.count({ where: { status: "PENDING" } });
        const resolved = await this.deadLetterRepo.count({ where: { status: "RESOLVED" } });
        const dismissed = await this.deadLetterRepo.count({ where: { status: "DISMISSED" } });
        const resurrected = await this.deadLetterRepo.count({ where: { isResurrected: true } });
        return {
            total,
            pending,
            resolved,
            dismissed,
            resurrected,
        };
    }
    async getDirtyDataStats(whereClause) {
        const total = await this.dirtyRecordRepo.count();
        const pending = await this.dirtyRecordRepo.count({ where: { status: "IDENTIFIED" } });
        const reviewed = await this.dirtyRecordRepo.count({ where: { status: "PENDING_REVIEW" } });
        const resolved = await this.dirtyRecordRepo.count({ where: { status: "RESOLVED" } });
        const byType = await this.dirtyRecordRepo
            .createQueryBuilder("d")
            .select("d.dirtyType", "type")
            .addSelect("COUNT(*)", "count")
            .groupBy("d.dirtyType")
            .orderBy("count", "DESC")
            .getRawMany();
        return {
            total,
            pending,
            reviewed,
            resolved,
            byType,
        };
    }
    async getCompensationStats(whereClause) {
        const total = await this.compensationRepo.count();
        const result = await this.compensationRepo
            .createQueryBuilder("c")
            .select("SUM(c.amount)", "totalAmount")
            .getRawOne();
        const pending = await this.compensationRepo.count({ where: { status: "PENDING" } });
        const approved = await this.compensationRepo.count({ where: { status: "APPROVED" } });
        const processing = await this.compensationRepo.count({ where: { status: "PROCESSING" } });
        const completed = await this.compensationRepo.count({ where: { status: "COMPLETED" } });
        return {
            total,
            totalAmount: parseFloat(result.totalAmount || 0),
            pending,
            approved,
            processing,
            completed,
        };
    }
    async getTopIssues(whereClause) {
        const issues = [];
        const retryByCategory = await this.retryQueueRepo
            .createQueryBuilder("q")
            .select("q.retryCategory", "category")
            .addSelect("COUNT(*)", "count")
            .where("q.retryCategory IS NOT NULL")
            .andWhere("q.status IN (:...statuses)", {
            statuses: ["FAILED", "RETRYING", "MANUAL_INTERVENTION", "DEAD_LETTER"],
        })
            .groupBy("q.retryCategory")
            .orderBy("count", "DESC")
            .limit(5)
            .getRawMany();
        retryByCategory.forEach((item) => {
            issues.push({
                type: "重试失败",
                category: item.category,
                count: parseInt(item.count),
                description: this.getCategoryDescription(item.category),
            });
        });
        const dirtyByType = await this.dirtyRecordRepo
            .createQueryBuilder("d")
            .select("d.dirtyType", "type")
            .addSelect("COUNT(*)", "count")
            .where("d.status = :status", { status: "IDENTIFIED" })
            .groupBy("d.dirtyType")
            .orderBy("count", "DESC")
            .limit(3)
            .getRawMany();
        dirtyByType.forEach((item) => {
            issues.push({
                type: "脏数据",
                category: item.type,
                count: parseInt(item.count),
                description: this.getDirtyTypeDescription(item.type),
            });
        });
        return issues.slice(0, 10);
    }
    getCategoryDescription(category) {
        const descriptions = {
            NETWORK_ERROR: "网络连接超时或中断，建议检查网络配置后重试",
            VALIDATION_ERROR: "数据验证失败，需要检查数据格式是否正确",
            MISSING_DATA: "缺少必填字段，需要补充完整数据后重试",
            CROSS_DAY_ISSUE: "跨日数据不一致，需要人工核对日期",
            NAME_CONFLICT: "名称冲突，需要确认是否为同一主体",
            AMOUNT_CONFLICT: "金额不一致，需要财务对账确认",
            QUANTITY_CONFLICT: "数量不一致，需要业务部门确认",
            SYSTEM_ERROR: "系统内部错误，需要技术人员排查",
            BUSINESS_RULE: "不符合业务规则，需要调整后重试",
            UNKNOWN: "未知错误，建议人工介入排查",
        };
        return descriptions[category] || "需要进一步分析";
    }
    getDirtyTypeDescription(type) {
        const descriptions = {
            MISSING_FIELDS: "数据字段不完整",
            CROSS_DAY: "跨日数据异常",
            NAME_CHANGED: "名称发生变更",
            AMOUNT_CONFLICT: "金额存在冲突",
            QUANTITY_CONFLICT: "数量存在冲突",
            DUPLICATE: "重复记录",
            FORMAT_ERROR: "格式错误",
            OTHER: "其他问题",
        };
        return descriptions[type] || "需要进一步分析";
    }
    generateRecoverySuggestions(retryStats, deadLetterStats) {
        const suggestions = [];
        if (retryStats.manualIntervention > 0) {
            suggestions.push(`有 ${retryStats.manualIntervention} 个任务等待人工处理，请优先处理人工干预队列`);
        }
        if (deadLetterStats.pending > 0) {
            suggestions.push(`死信队列中有 ${deadLetterStats.pending} 条记录待处理，建议排查原因后决定是否复活`);
        }
        if (retryStats.retrying > 0) {
            suggestions.push(`有 ${retryStats.retrying} 个任务正在自动重试中，请关注重试成功率`);
        }
        const networkErrors = retryStats.byCategory.find((c) => c.category === "NETWORK_ERROR");
        if (networkErrors && parseInt(networkErrors.count) > 5) {
            suggestions.push("网络错误频发，建议检查外部系统连接稳定性");
        }
        const dataErrors = retryStats.byCategory.find((c) => c.category === "MISSING_DATA");
        if (dataErrors && parseInt(dataErrors.count) > 3) {
            suggestions.push("数据缺失问题较多，建议优化上游数据采集流程");
        }
        if (suggestions.length === 0) {
            suggestions.push("系统运行正常，继续保持监控");
        }
        return suggestions;
    }
}
exports.ReportService = ReportService;
