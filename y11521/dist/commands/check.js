"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCheck = handleCheck;
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const database_1 = require("../utils/database");
const dirtyChecker_1 = require("../utils/dirtyChecker");
const login_1 = require("./login");
async function handleCheck(options) {
    (0, login_1.requirePermission)('view');
    const user = (0, database_1.getCurrentUser)();
    console.log(chalk_1.default.blue('=== 数据巡检 ===\n'));
    const dirtyRecords = (0, database_1.getDirtyRecords)();
    let filtered = dirtyRecords;
    if (options.type) {
        filtered = filtered.filter((r) => r.sourceType === options.type);
    }
    if (options.status) {
        filtered = filtered.filter((r) => r.status === options.status);
    }
    const byDirtyType = {};
    const bySourceType = {};
    filtered.forEach((r) => {
        byDirtyType[r.dirtyType] = (byDirtyType[r.dirtyType] || 0) + 1;
        bySourceType[r.sourceType] = (bySourceType[r.sourceType] || 0) + 1;
    });
    console.log(chalk_1.default.cyan('📊 巡检统计'));
    console.log(`总记录数: ${dirtyRecords.length}`);
    console.log(`待处理: ${chalk_1.default.yellow(filtered.filter((r) => r.status === 'dirty').length)}`);
    console.log(`已修复: ${chalk_1.default.green(filtered.filter((r) => r.status === 'fixed').length)}`);
    console.log(`已通过: ${chalk_1.default.green(filtered.filter((r) => r.status === 'approved').length)}`);
    console.log(`\n${chalk_1.default.cyan('📋 按问题类型分布')}`);
    const typeTable = new cli_table3_1.default({
        head: ['问题类型', '数量'],
        colWidths: [20, 10],
    });
    Object.entries(byDirtyType).forEach(([type, count]) => {
        typeTable.push([(0, dirtyChecker_1.getDirtyTypeLabel)(type), String(count)]);
    });
    console.log(typeTable.toString());
    console.log(`\n${chalk_1.default.cyan('📋 按数据源分布')}`);
    const sourceTable = new cli_table3_1.default({
        head: ['数据源', '数量'],
        colWidths: [15, 10],
    });
    Object.entries(bySourceType).forEach(([type, count]) => {
        sourceTable.push([(0, dirtyChecker_1.getSourceTypeLabel)(type), String(count)]);
    });
    console.log(sourceTable.toString());
    console.log(`\n${chalk_1.default.cyan('📋 脏记录明细')}`);
    const detailTable = new cli_table3_1.default({
        head: ['ID', '行号', '数据源', '问题类型', '状态', '描述'],
        colWidths: [10, 8, 12, 12, 10, 30],
    });
    filtered.slice(0, 20).forEach((r) => {
        const statusColor = r.status === 'dirty'
            ? chalk_1.default.yellow
            : r.status === 'fixed'
                ? chalk_1.default.blue
                : r.status === 'approved'
                    ? chalk_1.default.green
                    : r.status === 'rejected'
                        ? chalk_1.default.red
                        : chalk_1.default.gray;
        detailTable.push([
            r.id.slice(0, 8),
            String(r.rawRow || '-'),
            (0, dirtyChecker_1.getSourceTypeLabel)(r.sourceType),
            (0, dirtyChecker_1.getDirtyTypeLabel)(r.dirtyType),
            statusColor(r.status),
            r.description.slice(0, 28),
        ]);
    });
    console.log(detailTable.toString());
    if (filtered.length > 20) {
        console.log(chalk_1.default.gray(`... 还有 ${filtered.length - 20} 条记录，使用 hai check --detail 查看全部`));
    }
    console.log(`\n${chalk_1.default.cyan('🔍 重复检测')}`);
    const appointments = (0, database_1.getAppointments)();
    const duplicates = (0, dirtyChecker_1.detectDuplicates)(appointments);
    if (duplicates.length > 0) {
        console.log(chalk_1.default.yellow(`发现 ${duplicates.length} 组重复订单:`));
        duplicates.slice(0, 5).forEach((group) => {
            console.log(`  订单号 ${group[0].orderNo}: ${group.length} 条重复`);
        });
    }
    else {
        console.log(chalk_1.default.green('未发现重复记录'));
    }
    console.log(`\n${chalk_1.default.cyan('🔍 客户改名检测')}`);
    const nameChanges = (0, dirtyChecker_1.detectNameChanges)(appointments);
    if (nameChanges.length > 0) {
        console.log(chalk_1.default.yellow(`发现 ${nameChanges.length} 个客户姓名不一致:`));
        nameChanges.slice(0, 5).forEach((item) => {
            console.log(`  订单号 ${item.orderNo}: ${item.names.join(' vs ')}`);
        });
    }
    else {
        console.log(chalk_1.default.green('未发现客户改名情况'));
    }
    console.log(`\n${chalk_1.default.cyan('🔍 金额冲突检测')}`);
    const priceAdjustments = (0, database_1.getPriceAdjustments)();
    const amountConflicts = (0, dirtyChecker_1.detectAmountConflicts)(priceAdjustments);
    if (amountConflicts.length > 0) {
        console.log(chalk_1.default.yellow(`发现 ${amountConflicts.length} 组金额冲突:`));
        amountConflicts.slice(0, 5).forEach((item) => {
            console.log(`  订单号 ${item.orderNo}: 有多组不同金额`);
        });
    }
    else {
        console.log(chalk_1.default.green('未发现金额冲突'));
    }
    (0, database_1.addOperationLog)('check_records', user, {});
    console.log(`\n${chalk_1.default.gray('使用 hai fix <dirtyId> 修复脏记录')}`);
}
//# sourceMappingURL=check.js.map