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
const permissions_1 = require("../config/permissions");
const roleLabels = {
    entry: '录入员',
    review: '复核员',
    supervisor: '主管',
    readonly: '只读',
};
async function handleCheck(options) {
    (0, login_1.requirePermission)('view');
    const user = (0, database_1.getCurrentUser)();
    console.log(chalk_1.default.blue('=== 数据巡检 ===\n'));
    console.log(chalk_1.default.gray(`当前用户: ${user.name} (${roleLabels[user.role]})`));
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
    console.log(`\n${chalk_1.default.cyan('📋 脏记录明细 (按角色权限过滤显示)')}`);
    const detailTable = new cli_table3_1.default({
        head: ['ID', '行号', '数据源', '问题类型', '状态', '订单号', '描述'],
        colWidths: [10, 8, 12, 12, 10, 12, 28],
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
        const orderNo = (0, permissions_1.canViewField)(user.role, 'orderNo')
            ? (r.originalData?.orderNo || '-').toString().slice(0, 10)
            : '******';
        detailTable.push([
            r.id.slice(0, 8),
            String(r.rawRow || '-'),
            (0, dirtyChecker_1.getSourceTypeLabel)(r.sourceType),
            (0, dirtyChecker_1.getDirtyTypeLabel)(r.dirtyType),
            statusColor(r.status),
            orderNo,
            r.description.slice(0, 26),
        ]);
    });
    console.log(detailTable.toString());
    if (filtered.length > 20) {
        console.log(chalk_1.default.gray(`... 还有 ${filtered.length - 20} 条记录，使用 hai check --detail 查看全部`));
    }
    console.log(`\n${chalk_1.default.cyan('🔍 重复检测 (跨源订单号)')}`);
    const appointments = (0, database_1.getAppointments)();
    const locations = (0, database_1.getLocations)();
    const reviews = (0, database_1.getReviews)();
    const priceAdjustments = (0, database_1.getPriceAdjustments)();
    const allRecords = [
        ...appointments.map(a => ({ orderNo: a.orderNo, source: '预约单', rawRow: a.rawRow, data: a })),
        ...locations.map(l => ({ orderNo: l.orderNo, source: '师傅定位', rawRow: l.rawRow, data: l })),
        ...reviews.map(r => ({ orderNo: r.orderNo, source: '用户评价', rawRow: r.rawRow, data: r })),
        ...priceAdjustments.map(p => ({ orderNo: p.orderNo, source: '手工改价', rawRow: p.rawRow, data: p })),
    ];
    const duplicates = (0, dirtyChecker_1.detectDuplicates)(allRecords);
    if (duplicates.length > 0) {
        console.log(chalk_1.default.yellow(`发现 ${duplicates.length} 组订单号在多源中出现:`));
        duplicates.slice(0, 5).forEach((group) => {
            const sources = [...new Set(group.map(g => g.source))];
            const orderNo = (0, permissions_1.canViewField)(user.role, 'orderNo')
                ? group[0].orderNo
                : '******';
            console.log(`  订单号 ${orderNo}: 出现于 ${sources.join(', ')}`);
        });
    }
    else {
        console.log(chalk_1.default.green('未发现跨源重复订单号'));
    }
    console.log(`\n${chalk_1.default.cyan('🔍 客户改名检测')}`);
    const nameChanges = (0, dirtyChecker_1.detectNameChanges)(appointments);
    if (nameChanges.length > 0) {
        console.log(chalk_1.default.yellow(`发现 ${nameChanges.length} 个客户姓名不一致:`));
        nameChanges.slice(0, 5).forEach((item) => {
            const orderNo = (0, permissions_1.canViewField)(user.role, 'orderNo') ? item.orderNo : '******';
            const names = item.names.map(n => (0, permissions_1.canViewField)(user.role, 'customerName') ? n : '******');
            console.log(`  订单号 ${orderNo}: ${names.join(' vs ')}`);
        });
    }
    else {
        console.log(chalk_1.default.green('未发现客户改名情况'));
    }
    console.log(`\n${chalk_1.default.cyan('🔍 金额冲突检测')}`);
    const amountConflicts = (0, dirtyChecker_1.detectAmountConflicts)(priceAdjustments);
    if (amountConflicts.length > 0) {
        console.log(chalk_1.default.yellow(`发现 ${amountConflicts.length} 组金额冲突:`));
        amountConflicts.slice(0, 5).forEach((item) => {
            const orderNo = (0, permissions_1.canViewField)(user.role, 'orderNo') ? item.orderNo : '******';
            console.log(`  订单号 ${orderNo}: 有多组不同金额`);
        });
    }
    else {
        console.log(chalk_1.default.green('未发现金额冲突'));
    }
    console.log(`\n${chalk_1.default.cyan('🔍 数量冲突检测 (同一订单多台家电)')}`);
    const quantityConflicts = (0, dirtyChecker_1.detectQuantityConflicts)(appointments);
    if (quantityConflicts.length > 0) {
        console.log(chalk_1.default.yellow(`发现 ${quantityConflicts.length} 组数量冲突:`));
        quantityConflicts.slice(0, 5).forEach((item) => {
            const orderNo = (0, permissions_1.canViewField)(user.role, 'orderNo') ? item.orderNo : '******';
            console.log(`  订单号 ${orderNo}: ${item.count} 条记录, 家电类型: ${item.types.join(', ')}`);
        });
    }
    else {
        console.log(chalk_1.default.green('未发现数量冲突'));
    }
    console.log(`\n${chalk_1.default.cyan('🔍 改约/二次上门合并检测')}`);
    const mergeConflicts = (0, dirtyChecker_1.detectMergeConflicts)(appointments);
    if (mergeConflicts.length > 0) {
        console.log(chalk_1.default.yellow(`发现 ${mergeConflicts.length} 组可能需要合并的改约/二次上门:`));
        mergeConflicts.slice(0, 5).forEach((item) => {
            const orderNo = (0, permissions_1.canViewField)(user.role, 'orderNo') ? item.orderNo : '******';
            console.log(`  订单号 ${orderNo}: ${item.count} 条记录, 状态: ${item.statuses.join(', ')}`);
        });
    }
    else {
        console.log(chalk_1.default.green('未发现改约/二次上门合并问题'));
    }
    (0, database_1.addOperationLog)('check_records', user, {});
    console.log(`\n${chalk_1.default.gray('使用 hai fix <dirtyId> 修复脏记录')}`);
    console.log(`${chalk_1.default.gray('使用 hai report --detail 查看失败清单')}`);
}
//# sourceMappingURL=check.js.map