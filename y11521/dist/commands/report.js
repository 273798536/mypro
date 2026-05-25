"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleReport = handleReport;
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const database_1 = require("../utils/database");
const dirtyChecker_1 = require("../utils/dirtyChecker");
const login_1 = require("./login");
const permissions_1 = require("../config/permissions");
const roleLabels = {
    entry: '录入员',
    review: '复核员',
    supervisor: '主管',
    readonly: '只读',
};
async function handleReport(options) {
    (0, login_1.requirePermission)('report');
    const user = (0, database_1.getCurrentUser)();
    console.log(chalk_1.default.blue('=== 巡检报告 ===\n'));
    console.log(chalk_1.default.gray(`当前用户: ${user.name} (${roleLabels[user.role]})`));
    const appointments = (0, database_1.getAppointments)();
    const locations = (0, database_1.getLocations)();
    const reviews = (0, database_1.getReviews)();
    const priceAdjustments = (0, database_1.getPriceAdjustments)();
    const dirtyRecords = (0, database_1.getDirtyRecords)();
    const importHistory = (0, database_1.getImportHistory)();
    console.log(chalk_1.default.cyan('📊 数据汇总'));
    const summaryTable = new cli_table3_1.default({
        head: ['数据源', '记录数'],
        colWidths: [15, 10],
    });
    summaryTable.push(['预约单', String(appointments.length)]);
    summaryTable.push(['师傅定位', String(locations.length)]);
    summaryTable.push(['用户评价', String(reviews.length)]);
    summaryTable.push(['手工改价', String(priceAdjustments.length)]);
    summaryTable.push(['脏记录', chalk_1.default.yellow(String(dirtyRecords.length))]);
    console.log(summaryTable.toString());
    if ((0, permissions_1.canViewField)(user.role, 'rating') || (0, permissions_1.canViewField)(user.role, 'badReason')) {
        console.log(`\n${chalk_1.default.cyan('📋 用户评价分析')}`);
        const goodReviews = reviews.filter((r) => r.rating >= 4).length;
        const neutralReviews = reviews.filter((r) => r.rating === 3).length;
        const badReviews = reviews.filter((r) => r.rating <= 2).length;
        const badWithReason = reviews.filter((r) => r.rating <= 2 && r.badReason).length;
        const reviewTable = new cli_table3_1.default({
            head: ['评价类型', '数量', '占比'],
            colWidths: [15, 10, 15],
        });
        reviewTable.push([
            chalk_1.default.green('好评(4-5星)'),
            String(goodReviews),
            `${((goodReviews / Math.max(reviews.length, 1)) * 100).toFixed(1)}%`,
        ]);
        reviewTable.push([
            chalk_1.default.yellow('中评(3星)'),
            String(neutralReviews),
            `${((neutralReviews / Math.max(reviews.length, 1)) * 100).toFixed(1)}%`,
        ]);
        reviewTable.push([
            chalk_1.default.red('差评(1-2星)'),
            String(badReviews),
            `${((badReviews / Math.max(reviews.length, 1)) * 100).toFixed(1)}%`,
        ]);
        if ((0, permissions_1.canViewField)(user.role, 'badReason')) {
            reviewTable.push([
                chalk_1.default.magenta('差评有原因'),
                String(badWithReason),
                badReviews > 0 ? `${((badWithReason / Math.max(badReviews, 1)) * 100).toFixed(1)}%` : 'N/A',
            ]);
        }
        console.log(reviewTable.toString());
        if ((0, permissions_1.canViewField)(user.role, 'badReason')) {
            console.log(`\n${chalk_1.default.cyan('⚠️  差评原因缺失清单')}`);
            const missingBadReason = reviews.filter((r) => r.rating <= 2 && !r.badReason);
            if (missingBadReason.length > 0) {
                const missingTable = new cli_table3_1.default({
                    head: ['订单号', '评分', '评价内容', '原始行号'],
                    colWidths: [15, 8, 30, 10],
                });
                missingBadReason.slice(0, 10).forEach((r) => {
                    const orderNo = (0, permissions_1.canViewField)(user.role, 'orderNo') ? r.orderNo : '******';
                    const rating = (0, permissions_1.canViewField)(user.role, 'rating') ? String(r.rating) : '***';
                    const content = (0, permissions_1.canViewField)(user.role, 'reviewContent') ? r.reviewContent.slice(0, 28) : '******';
                    missingTable.push([orderNo, rating, content, String(r.rawRow || '-')]);
                });
                console.log(missingTable.toString());
                if (missingBadReason.length > 10) {
                    console.log(chalk_1.default.gray(`... 还有 ${missingBadReason.length - 10} 条`));
                }
            }
            else {
                console.log(chalk_1.default.green('✅ 所有差评都有原因说明'));
            }
        }
    }
    console.log(`\n${chalk_1.default.cyan('🔍 脏记录分类统计')}`);
    const dirtyByType = {};
    dirtyRecords.forEach((r) => {
        dirtyByType[r.dirtyType] = (dirtyByType[r.dirtyType] || 0) + 1;
    });
    const dirtyTypeTable = new cli_table3_1.default({
        head: ['问题类型', '数量', '状态分布'],
        colWidths: [15, 8, 30],
    });
    Object.entries(dirtyByType).forEach(([type, count]) => {
        const typeRecords = dirtyRecords.filter((r) => r.dirtyType === type);
        const dirtyCount = typeRecords.filter((r) => r.status === 'dirty').length;
        const fixedCount = typeRecords.filter((r) => r.status === 'fixed').length;
        const approvedCount = typeRecords.filter((r) => r.status === 'approved').length;
        dirtyTypeTable.push([
            (0, dirtyChecker_1.getDirtyTypeLabel)(type),
            String(count),
            `待处理:${dirtyCount} 已修复:${fixedCount} 已复核:${approvedCount}`,
        ]);
    });
    console.log(dirtyTypeTable.toString());
    console.log(`\n${chalk_1.default.cyan('📥 导入历史')}`);
    const importTable = new cli_table3_1.default({
        head: ['时间', '文件名', '类型', '总数', '成功', '脏记录'],
        colWidths: [20, 20, 10, 8, 8, 10],
    });
    importHistory.slice(0, 10).forEach((h) => {
        importTable.push([
            h.importedAt.slice(0, 19).replace('T', ' '),
            h.fileName.slice(0, 18),
            (0, dirtyChecker_1.getSourceTypeLabel)(h.sourceType),
            String(h.totalRecords),
            chalk_1.default.green(String(h.successCount)),
            chalk_1.default.yellow(String(h.dirtyCount)),
        ]);
    });
    console.log(importTable.toString());
    if (options.detail) {
        console.log(`\n${chalk_1.default.cyan('📋 失败清单 (带原始行号和来源)')}`);
        const failedRecords = dirtyRecords.filter((r) => r.status !== 'approved');
        const failedTable = new cli_table3_1.default({
            head: ['ID', '原始文件', '行号', '问题类型', '状态', '订单号'],
            colWidths: [12, 20, 8, 12, 10, 15],
        });
        failedRecords.slice(0, 20).forEach((r) => {
            const orderNo = (0, permissions_1.canViewField)(user.role, 'orderNo')
                ? (r.originalData?.orderNo || '-').toString().slice(0, 12)
                : '******';
            failedTable.push([
                r.id.slice(0, 10),
                r.sourceFile || '-',
                String(r.rawRow || '-'),
                (0, dirtyChecker_1.getDirtyTypeLabel)(r.dirtyType),
                r.status,
                orderNo,
            ]);
        });
        console.log(failedTable.toString());
        if (failedRecords.length > 20) {
            console.log(chalk_1.default.gray(`... 还有 ${failedRecords.length - 20} 条待处理记录`));
            console.log(chalk_1.default.gray('使用 hai export-dirty <file> 导出完整失败清单'));
        }
        console.log(`\n${chalk_1.default.cyan('📋 处理结果追溯')}`);
        const processedRecords = dirtyRecords.filter((r) => r.status === 'fixed' || r.status === 'approved' || r.status === 'rejected');
        if (processedRecords.length > 0) {
            const processedTable = new cli_table3_1.default({
                head: ['ID', '问题类型', '状态', '处理人', '处理说明', '处理时间'],
                colWidths: [12, 12, 10, 12, 20, 20],
            });
            processedRecords.slice(0, 10).forEach((r) => {
                processedTable.push([
                    r.id.slice(0, 10),
                    (0, dirtyChecker_1.getDirtyTypeLabel)(r.dirtyType),
                    r.status,
                    r.fixedBy ? r.fixedBy.slice(0, 8) : '-',
                    (r.fixNote || '-').slice(0, 18),
                    r.fixedAt ? r.fixedAt.slice(0, 16).replace('T', ' ') : '-',
                ]);
            });
            console.log(processedTable.toString());
        }
        else {
            console.log(chalk_1.default.green('暂无处理记录'));
        }
    }
    (0, database_1.addOperationLog)('generate_report', user, {});
    console.log(`\n${chalk_1.default.gray('提示: 使用 hai export 导出详细报告')}`);
}
//# sourceMappingURL=report.js.map