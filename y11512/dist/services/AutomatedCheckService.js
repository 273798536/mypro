"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomatedCheckService = void 0;
const database_1 = require("../config/database");
const BorrowApplication_1 = require("../entities/BorrowApplication");
const RetryQueue_1 = require("../entities/RetryQueue");
const DeadLetter_1 = require("../entities/DeadLetter");
const OperationLog_1 = require("../entities/OperationLog");
class AutomatedCheckService {
    static async runAllChecks() {
        const results = [];
        results.push(await this.checkDuplicateImports());
        results.push(await this.checkPermissionConsistency());
        results.push(await this.checkExceptionRetention());
        results.push(await this.checkHistoryIntegrity());
        results.push(await this.checkExportConsistency());
        results.push(await this.checkDeadLetterBacklog());
        results.push(await this.checkFrozenTasks());
        results.push(await this.checkFeeCalculationConsistency());
        return results;
    }
    static async checkDuplicateImports() {
        const repository = database_1.AppDataSource.getRepository(BorrowApplication_1.BorrowApplication);
        const duplicates = await repository
            .createQueryBuilder('app')
            .select('app.applicationNo, COUNT(*) as count')
            .groupBy('app.applicationNo')
            .having('COUNT(*) > 1')
            .getRawMany();
        const passed = duplicates.length === 0;
        return {
            name: '重复导入检查',
            passed,
            severity: passed ? 'info' : 'warning',
            message: passed ? '未发现重复申请编号' : `发现 ${duplicates.length} 个重复申请编号`,
            details: duplicates,
            timestamp: new Date()
        };
    }
    static async checkPermissionConsistency() {
        const repository = database_1.AppDataSource.getRepository(OperationLog_1.OperationLog);
        const suspiciousOperations = await repository
            .createQueryBuilder('log')
            .where('log.operationType IN (:...types)', {
            types: ['delete', 'manual_decision', 'fee_adjust']
        })
            .andWhere('log.operatorId IS NULL')
            .getCount();
        const passed = suspiciousOperations === 0;
        return {
            name: '权限拦截检查',
            passed,
            severity: passed ? 'info' : 'critical',
            message: passed ? '所有敏感操作均记录了操作人' : `发现 ${suspiciousOperations} 条无操作人记录的敏感操作`,
            details: { suspiciousOperations },
            timestamp: new Date()
        };
    }
    static async checkExceptionRetention() {
        const retryRepository = database_1.AppDataSource.getRepository(RetryQueue_1.RetryQueue);
        const deadLetterRepository = database_1.AppDataSource.getRepository(DeadLetter_1.DeadLetter);
        const failedTasksWithoutError = await retryRepository.count({
            where: {
                status: RetryQueue_1.QueueStatus.FAILED,
                lastError: null
            }
        });
        const deadLettersWithoutError = await deadLetterRepository.count({
            where: {
                lastError: null
            }
        });
        const totalIssues = failedTasksWithoutError + deadLettersWithoutError;
        const passed = totalIssues === 0;
        return {
            name: '异常保留检查',
            passed,
            severity: passed ? 'info' : 'warning',
            message: passed ? '所有失败任务都保留了异常信息' : `发现 ${totalIssues} 条失败记录缺少异常信息`,
            details: {
                failedTasksWithoutError,
                deadLettersWithoutError
            },
            timestamp: new Date()
        };
    }
    static async checkHistoryIntegrity() {
        const appRepository = database_1.AppDataSource.getRepository(BorrowApplication_1.BorrowApplication);
        const logRepository = database_1.AppDataSource.getRepository(OperationLog_1.OperationLog);
        const apps = await appRepository.find({ select: ['id', 'applicationNo', 'version'] });
        const issues = [];
        for (const app of apps) {
            const logCount = await logRepository.count({
                where: { entityId: app.id }
            });
            if (app.version > 1 && logCount < app.version) {
                issues.push({
                    applicationId: app.id,
                    applicationNo: app.applicationNo,
                    version: app.version,
                    logCount
                });
            }
        }
        const passed = issues.length === 0;
        return {
            name: '历史完整性检查',
            passed,
            severity: passed ? 'info' : 'warning',
            message: passed ? '所有记录的版本历史完整' : `发现 ${issues.length} 条记录版本与操作日志不匹配`,
            details: issues.slice(0, 20),
            timestamp: new Date()
        };
    }
    static async checkExportConsistency() {
        const appRepository = database_1.AppDataSource.getRepository(BorrowApplication_1.BorrowApplication);
        const logRepository = database_1.AppDataSource.getRepository(OperationLog_1.OperationLog);
        const exportLogs = await logRepository.find({
            where: { operationType: 'export' },
            order: { createdAt: 'DESC' },
            take: 10
        });
        let inconsistentExports = 0;
        for (const log of exportLogs) {
            if (log.changes?.count) {
                const currentCount = await appRepository.count();
                if (Math.abs(currentCount - log.changes.count) > currentCount * 0.1) {
                    inconsistentExports++;
                }
            }
        }
        const passed = inconsistentExports === 0;
        return {
            name: '导出一致性检查',
            passed,
            severity: passed ? 'info' : 'warning',
            message: passed ? '最近导出记录与当前数据一致' : `发现 ${inconsistentExports} 次导出后数据变化超过10%`,
            details: { checkedExports: exportLogs.length, inconsistentExports },
            timestamp: new Date()
        };
    }
    static async checkDeadLetterBacklog() {
        const repository = database_1.AppDataSource.getRepository(DeadLetter_1.DeadLetter);
        const openCount = await repository.count({
            where: { status: DeadLetter_1.DeadLetterStatus.OPEN }
        });
        const threshold = 100;
        const passed = openCount < threshold;
        return {
            name: '死信积压检查',
            passed,
            severity: passed ? 'info' : (openCount > threshold * 2 ? 'critical' : 'warning'),
            message: passed ? `死信队列积压正常 (${openCount}条)` : `死信队列积压过高: ${openCount}条 (阈值: ${threshold})`,
            details: { openCount, threshold },
            timestamp: new Date()
        };
    }
    static async checkFrozenTasks() {
        const repository = database_1.AppDataSource.getRepository(RetryQueue_1.RetryQueue);
        const frozenTasks = await repository.find({
            where: { isFrozen: true },
            select: ['id', 'taskId', 'frozenAt', 'frozenReason']
        });
        const now = new Date();
        const longFrozen = frozenTasks.filter(t => {
            if (!t.frozenAt)
                return false;
            const days = (now.getTime() - t.frozenAt.getTime()) / (1000 * 60 * 60 * 24);
            return days > 7;
        });
        const passed = longFrozen.length === 0;
        return {
            name: '冻结任务检查',
            passed,
            severity: passed ? 'info' : 'warning',
            message: passed ? '无长期冻结任务' : `发现 ${longFrozen.length} 个任务冻结超过7天`,
            details: longFrozen.slice(0, 20),
            timestamp: new Date()
        };
    }
    static async checkFeeCalculationConsistency() {
        const repository = database_1.AppDataSource.getRepository(BorrowApplication_1.BorrowApplication);
        const apps = await repository.find({
            where: { isOverdue: true }
        });
        const issues = [];
        for (const app of apps) {
            const calculatedTotal = app.overdueFee + app.damageFee + app.shippingFee;
            if (Math.abs(calculatedTotal - app.totalFee) > 0.01) {
                issues.push({
                    applicationId: app.id,
                    applicationNo: app.applicationNo,
                    overdueFee: app.overdueFee,
                    damageFee: app.damageFee,
                    shippingFee: app.shippingFee,
                    calculatedTotal,
                    storedTotal: app.totalFee,
                    difference: calculatedTotal - app.totalFee
                });
            }
        }
        const passed = issues.length === 0;
        return {
            name: '费用计算一致性检查',
            passed,
            severity: passed ? 'info' : 'warning',
            message: passed ? '所有费用计算一致' : `发现 ${issues.length} 条费用计算不一致记录`,
            details: issues.slice(0, 20),
            timestamp: new Date()
        };
    }
    static printCheckResults(results) {
        console.log('\n========== 自动化检查结果 ==========\n');
        const grouped = {
            critical: results.filter(r => r.severity === 'critical'),
            warning: results.filter(r => r.severity === 'warning'),
            info: results.filter(r => r.severity === 'info')
        };
        ['critical', 'warning', 'info'].forEach(severity => {
            const items = grouped[severity];
            if (items.length > 0) {
                const prefix = severity === 'critical' ? '❌' : severity === 'warning' ? '⚠️' : '✅';
                console.log(`${prefix} ${severity.toUpperCase()} (${items.length}项):`);
                items.forEach(item => {
                    console.log(`  - ${item.name}: ${item.message}`);
                    if (!item.passed && item.details) {
                        console.log(`    详情: ${JSON.stringify(item.details).substring(0, 150)}...`);
                    }
                });
                console.log('');
            }
        });
        const passed = results.filter(r => r.passed).length;
        console.log(`总计: ${passed}/${results.length} 项通过\n`);
    }
}
exports.AutomatedCheckService = AutomatedCheckService;
