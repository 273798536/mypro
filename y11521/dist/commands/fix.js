"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFix = handleFix;
exports.handleApprove = handleApprove;
exports.handleReject = handleReject;
const chalk_1 = __importDefault(require("chalk"));
const dayjs_1 = __importDefault(require("dayjs"));
const inquirer_1 = __importDefault(require("inquirer"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const database_1 = require("../utils/database");
const dirtyChecker_1 = require("../utils/dirtyChecker");
const login_1 = require("./login");
const permissions_1 = require("../config/permissions");
const diff_1 = require("../utils/diff");
const roleLabels = {
    entry: '录入员',
    review: '复核员',
    supervisor: '主管',
    readonly: '只读',
};
async function handleFix(dirtyId, options) {
    (0, login_1.requirePermission)('fix_dirty');
    const user = (0, database_1.getCurrentUser)();
    const dirtyRecords = (0, database_1.getDirtyRecords)();
    const pendingRecords = dirtyRecords.filter((r) => r.status === 'dirty');
    console.log(chalk_1.default.blue('=== 脏记录修复 ===\n'));
    console.log(chalk_1.default.gray(`当前用户: ${user.name} (${roleLabels[user.role]})`));
    if (pendingRecords.length === 0) {
        console.log(chalk_1.default.green('✅ 没有待修复的脏记录'));
        return;
    }
    let toFix = [];
    if (dirtyId) {
        const record = dirtyRecords.find((r) => r.id.startsWith(dirtyId));
        if (!record) {
            console.log(chalk_1.default.red(`❌ 未找到脏记录: ${dirtyId}`));
            process.exit(1);
        }
        toFix = [record];
    }
    else if (options.all) {
        toFix = pendingRecords;
    }
    else {
        const choices = pendingRecords.slice(0, 20).map((r) => ({
            name: `${r.id.slice(0, 8)} | 行${r.rawRow || '-'} | ${(0, dirtyChecker_1.getSourceTypeLabel)(r.sourceType)} | ${(0, dirtyChecker_1.getDirtyTypeLabel)(r.dirtyType)} | ${r.description.slice(0, 30)}`,
            value: r.id,
        }));
        const answer = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'recordId',
                message: '选择要修复的脏记录:',
                choices,
            },
        ]);
        const record = dirtyRecords.find((r) => r.id === answer.recordId);
        if (record)
            toFix = [record];
    }
    let fixedCount = 0;
    for (const record of toFix) {
        const result = await fixByDirtyType(record, options.auto ?? false);
        if (result)
            fixedCount++;
    }
    if (fixedCount > 0) {
        (0, database_1.addOperationLog)('fix_records', user, { afterData: { fixedCount } });
    }
}
async function fixByDirtyType(record, auto) {
    switch (record.dirtyType) {
        case 'missing_field':
        case 'cross_day':
        case 'amount_conflict':
            return await fixFieldIssue(record, auto);
        case 'duplicate':
            return await fixDuplicate(record, auto);
        case 'name_changed':
            return await fixNameChange(record, auto);
        case 'quantity_conflict':
            return await fixQuantityConflict(record, auto);
        case 'merge_conflict':
            return await fixMergeConflict(record, auto);
        default:
            return await fixFieldIssue(record, auto);
    }
}
async function fixFieldIssue(record, auto) {
    const user = (0, database_1.getCurrentUser)();
    console.log(chalk_1.default.cyan(`\n📝 记录ID: ${record.id}`));
    console.log(`问题类型: ${(0, dirtyChecker_1.getDirtyTypeLabel)(record.dirtyType)}`);
    console.log(`问题描述: ${record.description}`);
    if (record.sourceFile)
        console.log(`原始文件: ${record.sourceFile} (行 ${record.rawRow})`);
    console.log(`\n${chalk_1.default.yellow('原始数据 (按权限过滤显示):')}`);
    const originalTable = new cli_table3_1.default();
    const maskedOriginal = (0, permissions_1.maskDataByRole)(user.role, record.originalData);
    Object.entries(maskedOriginal).forEach(([k, v]) => {
        originalTable.push([k, String(v || '')]);
    });
    console.log(originalTable.toString());
    let fixData = { ...record.originalData };
    let hasChanges = false;
    const editableFields = (0, permissions_1.getEditableFields)(user.role);
    console.log(chalk_1.default.gray(`可编辑字段: ${editableFields.join(', ') || '无'}`));
    if (auto && record.suggestedFix) {
        console.log(chalk_1.default.green(`\n🔧 自动应用建议修复...`));
        const suggestedEditable = {};
        for (const [key, value] of Object.entries(record.suggestedFix)) {
            if ((0, permissions_1.canEditField)(user.role, key)) {
                suggestedEditable[key] = value;
            }
        }
        if (Object.keys(suggestedEditable).length > 0) {
            fixData = { ...fixData, ...suggestedEditable };
            hasChanges = true;
        }
    }
    else if (record.suggestedFix) {
        console.log(`\n${chalk_1.default.blue('建议修复:')}`);
        const diffs = (0, diff_1.compareObjects)(record.originalData, record.suggestedFix);
        const filteredDiffs = diffs.filter(d => (0, permissions_1.canEditField)(user.role, d.field));
        if (filteredDiffs.length > 0) {
            console.log((0, diff_1.formatDiff)(filteredDiffs));
            const answer = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'applySuggested',
                    message: '是否应用可编辑的建议修复?',
                    default: true,
                },
            ]);
            if (answer.applySuggested) {
                for (const [key, value] of Object.entries(record.suggestedFix)) {
                    if ((0, permissions_1.canEditField)(user.role, key)) {
                        fixData[key] = value;
                        hasChanges = true;
                    }
                }
            }
        }
    }
    if (!auto && editableFields.length > 0) {
        const fieldChoices = editableFields
            .filter(f => f in fixData)
            .map((f) => ({ name: f, value: f }));
        if (fieldChoices.length > 0) {
            let editing = true;
            while (editing) {
                console.log(`\n${chalk_1.default.cyan('当前数据 (按权限过滤):')}`);
                const currentTable = new cli_table3_1.default();
                const maskedCurrent = (0, permissions_1.maskDataByRole)(user.role, fixData);
                Object.entries(maskedCurrent).forEach(([k, v]) => {
                    currentTable.push([k, String(v || '')]);
                });
                console.log(currentTable.toString());
                const answer = await inquirer_1.default.prompt([
                    {
                        type: 'list',
                        name: 'action',
                        message: '选择操作:',
                        choices: [
                            { name: '修改字段', value: 'edit' },
                            { name: '确认修复', value: 'confirm' },
                            { name: '跳过', value: 'skip' },
                        ],
                    },
                ]);
                if (answer.action === 'skip') {
                    console.log(chalk_1.default.yellow('已跳过'));
                    return false;
                }
                if (answer.action === 'confirm') {
                    editing = false;
                }
                if (answer.action === 'edit') {
                    const fieldAnswer = await inquirer_1.default.prompt([
                        {
                            type: 'list',
                            name: 'field',
                            message: '选择要修改的字段:',
                            choices: fieldChoices,
                        },
                        {
                            type: 'input',
                            name: 'value',
                            message: '输入新值:',
                            default: (ans) => String(fixData[ans.field] || ''),
                        },
                    ]);
                    fixData[fieldAnswer.field] = fieldAnswer.value;
                    hasChanges = true;
                }
            }
        }
    }
    const diffs = (0, diff_1.compareObjects)(record.originalData, fixData);
    const actualDiffs = diffs.filter(d => d.type === 'changed' || d.type === 'added' || d.type === 'removed');
    if (actualDiffs.length === 0 || !hasChanges) {
        console.log(chalk_1.default.yellow('\n⚠️  没有实际修改任何数据，取消修复'));
        return false;
    }
    console.log(`\n${chalk_1.default.blue('实际变更差异:')}`);
    console.log((0, diff_1.formatDiff)(actualDiffs));
    const fixNoteAnswer = auto
        ? { fixNote: '自动修复' }
        : await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'fixNote',
                message: '修复说明:',
                default: '手动修复',
            },
        ]);
    try {
        const originalId = record.originalData?.id;
        if (originalId) {
            if (record.sourceType === 'appointment') {
                (0, database_1.updateAppointment)(originalId, fixData);
            }
            else if (record.sourceType === 'location') {
                (0, database_1.updateLocation)(originalId, fixData);
            }
            else if (record.sourceType === 'review') {
                (0, database_1.updateReview)(originalId, fixData);
            }
            else if (record.sourceType === 'price_adjustment') {
                (0, database_1.updatePriceAdjustment)(originalId, fixData);
            }
        }
        (0, database_1.updateDirtyRecord)(record.id, {
            status: 'fixed',
            suggestedFix: fixData,
            fixNote: fixNoteAnswer.fixNote,
            fixedBy: user.id,
            fixedAt: (0, dayjs_1.default)().toISOString(),
        });
        (0, database_1.addOperationLog)('fix_dirty_record', user, {
            recordId: record.id,
            beforeData: record.originalData,
            afterData: fixData,
        });
        console.log(chalk_1.default.green(`\n✅ 修复完成！记录已更新`));
        return true;
    }
    catch (err) {
        console.log(chalk_1.default.red(`\n❌ 修复失败: ${err.message}`));
        return false;
    }
}
async function fixDuplicate(record, auto) {
    const user = (0, database_1.getCurrentUser)();
    const orderNo = record.originalData?.orderNo;
    const records = record.originalData?.records || [];
    if (!orderNo) {
        console.log(chalk_1.default.red('❌ 缺少订单号信息'));
        return false;
    }
    console.log(chalk_1.default.cyan(`\n📝 记录ID: ${record.id}`));
    console.log(`问题类型: 重复记录`);
    console.log(`订单号: ${orderNo}`);
    console.log(`重复次数: ${records.length || '多'}`);
    const existingRecords = (0, database_1.getAppointmentsByOrderNo)(orderNo);
    if (existingRecords.length <= 1) {
        console.log(chalk_1.default.yellow('⚠️  当前已无重复记录，自动标记为已修复'));
        (0, database_1.updateDirtyRecord)(record.id, {
            status: 'fixed',
            fixNote: '重复记录已被其他操作处理',
            fixedBy: user.id,
            fixedAt: (0, dayjs_1.default)().toISOString(),
        });
        return true;
    }
    console.log(`\n${chalk_1.default.yellow('当前重复记录:')}`);
    const dupTable = new cli_table3_1.default({
        head: ['ID', '状态', '预约日期', '师傅', '原始行号', '来源文件'],
        colWidths: [12, 12, 14, 10, 12, 18],
    });
    existingRecords.forEach((r) => {
        dupTable.push([
            r.id.slice(0, 10),
            r.status,
            r.appointmentDate,
            r.technicianName || '-',
            String(r.rawRow || '-'),
            (r.sourceFile || '-').slice(0, 16),
        ]);
    });
    console.log(dupTable.toString());
    if (auto) {
        console.log(chalk_1.default.green('\n🔧 自动保留第一条，删除其他重复记录...'));
        const keepRecord = existingRecords[0];
        const removeIds = existingRecords.slice(1).map(r => r.id);
        removeIds.forEach(id => (0, database_1.deleteAppointment)(id));
        (0, database_1.updateDirtyRecord)(record.id, {
            status: 'fixed',
            fixNote: `自动保留 ID:${keepRecord.id.slice(0, 8)}, 删除 ${removeIds.length} 条重复`,
            fixedBy: user.id,
            fixedAt: (0, dayjs_1.default)().toISOString(),
            suggestedFix: {
                action: 'keep_and_delete',
                keepId: keepRecord.id,
                removedIds: removeIds,
            },
        });
        (0, database_1.addOperationLog)('fix_duplicate', user, {
            recordId: record.id,
            beforeData: { count: existingRecords.length, records: existingRecords.map(r => r.id) },
            afterData: { action: 'merged', keepId: keepRecord.id, removedCount: removeIds.length },
        });
        console.log(chalk_1.default.green(`✅ 已保留 ${keepRecord.id.slice(0, 8)}，删除 ${removeIds.length} 条重复记录`));
        return true;
    }
    const choices = existingRecords.map((r) => ({
        name: `保留 ${r.id.slice(0, 8)} - ${r.status} - ${r.appointmentDate}`,
        value: r.id,
    }));
    const answer = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'keepId',
            message: '选择要保留的记录:',
            choices,
        },
        {
            type: 'input',
            name: 'fixNote',
            message: '修复说明:',
            default: '删除重复记录',
        },
    ]);
    const keepId = answer.keepId;
    const removeIds = existingRecords.filter(r => r.id !== keepId).map(r => r.id);
    removeIds.forEach(id => (0, database_1.deleteAppointment)(id));
    (0, database_1.updateDirtyRecord)(record.id, {
        status: 'fixed',
        fixNote: answer.fixNote,
        fixedBy: user.id,
        fixedAt: (0, dayjs_1.default)().toISOString(),
        suggestedFix: {
            action: 'keep_and_delete',
            keepId,
            removedIds: removeIds,
        },
    });
    (0, database_1.addOperationLog)('fix_duplicate', user, {
        recordId: record.id,
        beforeData: { count: existingRecords.length },
        afterData: { action: 'merged', removedCount: removeIds.length },
    });
    console.log(chalk_1.default.green(`\n✅ 已保留 ${keepId.slice(0, 8)}，删除 ${removeIds.length} 条重复记录`));
    return true;
}
async function fixNameChange(record, auto) {
    const user = (0, database_1.getCurrentUser)();
    const orderNo = record.originalData?.orderNo;
    const names = record.originalData?.names || [];
    if (!orderNo) {
        console.log(chalk_1.default.red('❌ 缺少订单号信息'));
        return false;
    }
    console.log(chalk_1.default.cyan(`\n📝 记录ID: ${record.id}`));
    console.log(`问题类型: 客户改名`);
    console.log(`订单号: ${orderNo}`);
    console.log(`姓名不一致: ${names.join(' vs ')}`);
    const existingRecords = (0, database_1.getAppointmentsByOrderNo)(orderNo);
    if (existingRecords.length === 0) {
        console.log(chalk_1.default.yellow('⚠️  订单已不存在，自动标记为已修复'));
        (0, database_1.updateDirtyRecord)(record.id, {
            status: 'fixed',
            fixNote: '订单已被删除',
            fixedBy: user.id,
            fixedAt: (0, dayjs_1.default)().toISOString(),
        });
        return true;
    }
    console.log(`\n${chalk_1.default.yellow('当前订单记录:')}`);
    const nameTable = new cli_table3_1.default({
        head: ['ID', '客户姓名', '状态', '预约日期'],
        colWidths: [12, 15, 12, 14],
    });
    existingRecords.forEach((r) => {
        nameTable.push([r.id.slice(0, 10), r.customerName, r.status, r.appointmentDate]);
    });
    console.log(nameTable.toString());
    let correctName;
    let fixNote;
    if (auto) {
        correctName = names[0];
        fixNote = `自动统一姓名为: ${correctName}`;
        console.log(chalk_1.default.green(`\n🔧 自动统一姓名为: ${correctName}`));
    }
    else {
        const nameChoices = names.map((n) => ({ name: n, value: n }));
        const answer = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'correctName',
                message: '选择正确的客户姓名:',
                choices: nameChoices,
            },
            {
                type: 'input',
                name: 'fixNote',
                message: '修复说明:',
                default: '统一客户姓名',
            },
        ]);
        correctName = answer.correctName;
        fixNote = answer.fixNote;
    }
    existingRecords.forEach(r => {
        (0, database_1.updateAppointment)(r.id, { customerName: correctName });
    });
    (0, database_1.updateDirtyRecord)(record.id, {
        status: 'fixed',
        fixNote,
        fixedBy: user.id,
        fixedAt: (0, dayjs_1.default)().toISOString(),
        suggestedFix: { correctName },
    });
    (0, database_1.addOperationLog)('fix_name_changed', user, {
        recordId: record.id,
        beforeData: { names },
        afterData: { correctName },
    });
    console.log(chalk_1.default.green(`\n✅ 已将 ${existingRecords.length} 条记录的客户姓名统一为: ${correctName}`));
    return true;
}
async function fixQuantityConflict(record, auto) {
    const user = (0, database_1.getCurrentUser)();
    const orderNo = record.originalData?.orderNo;
    const types = record.originalData?.types || [];
    if (!orderNo) {
        console.log(chalk_1.default.red('❌ 缺少订单号信息'));
        return false;
    }
    console.log(chalk_1.default.cyan(`\n📝 记录ID: ${record.id}`));
    console.log(`问题类型: 数量冲突（多台家电）`);
    console.log(`订单号: ${orderNo}`);
    console.log(`家电类型: ${types.join(', ')}`);
    const existingRecords = (0, database_1.getAppointmentsByOrderNo)(orderNo);
    console.log(`\n${chalk_1.default.yellow('当前订单记录:')}`);
    const qtyTable = new cli_table3_1.default({
        head: ['ID', '家电类型', '状态', '预约日期', '师傅'],
        colWidths: [12, 12, 12, 14, 12],
    });
    existingRecords.forEach((r) => {
        qtyTable.push([
            r.id.slice(0, 10),
            r.applianceType,
            r.status,
            r.appointmentDate,
            r.technicianName || '-',
        ]);
    });
    console.log(qtyTable.toString());
    if (auto) {
        console.log(chalk_1.default.green('\n🔧 自动确认多台家电，保留全部记录...'));
        (0, database_1.updateDirtyRecord)(record.id, {
            status: 'fixed',
            fixNote: '确认多台家电安装，保留全部记录',
            fixedBy: user.id,
            fixedAt: (0, dayjs_1.default)().toISOString(),
            suggestedFix: { action: 'keep_multi_appliance' },
        });
        (0, database_1.addOperationLog)('fix_quantity_conflict', user, {
            recordId: record.id,
            beforeData: { orderNo, count: existingRecords.length },
            afterData: { action: 'confirmed_multi' },
        });
        return true;
    }
    const answer = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'action',
            message: '确认处理方式:',
            choices: [
                { name: '确认多台家电安装（保留全部）', value: 'keep' },
                { name: '删除重复记录', value: 'delete' },
                { name: '跳过', value: 'skip' },
            ],
        },
    ]);
    if (answer.action === 'skip') {
        console.log(chalk_1.default.yellow('已跳过'));
        return false;
    }
    if (answer.action === 'keep') {
        (0, database_1.updateDirtyRecord)(record.id, {
            status: 'fixed',
            fixNote: '确认多台家电安装',
            fixedBy: user.id,
            fixedAt: (0, dayjs_1.default)().toISOString(),
        });
        (0, database_1.addOperationLog)('fix_quantity_conflict', user, {
            recordId: record.id,
            afterData: { action: 'confirmed_multi' },
        });
        console.log(chalk_1.default.green('\n✅ 已确认多台家电安装，保留全部记录'));
        return true;
    }
    if (answer.action === 'delete') {
        return await fixDuplicate(record, auto);
    }
    return false;
}
async function fixMergeConflict(record, auto) {
    const user = (0, database_1.getCurrentUser)();
    const orderNo = record.originalData?.orderNo;
    const statuses = record.originalData?.statuses || [];
    const dates = record.originalData?.dates || [];
    if (!orderNo) {
        console.log(chalk_1.default.red('❌ 缺少订单号信息'));
        return false;
    }
    console.log(chalk_1.default.cyan(`\n📝 记录ID: ${record.id}`));
    console.log(`问题类型: 改约/二次上门合并冲突`);
    console.log(`订单号: ${orderNo}`);
    console.log(`状态: ${statuses.join(', ')}`);
    console.log(`日期: ${dates.join(', ')}`);
    const existingRecords = (0, database_1.getAppointmentsByOrderNo)(orderNo);
    console.log(`\n${chalk_1.default.yellow('当前订单记录 (可能需要合并):')}`);
    const mergeTable = new cli_table3_1.default({
        head: ['ID', '状态', '预约日期', '师傅', '原始行号'],
        colWidths: [12, 12, 14, 12, 12],
    });
    existingRecords.forEach((r) => {
        mergeTable.push([
            r.id.slice(0, 10),
            r.status,
            r.appointmentDate,
            r.technicianName || '-',
            String(r.rawRow || '-'),
        ]);
    });
    console.log(mergeTable.toString());
    if (auto) {
        console.log(chalk_1.default.green('\n🔧 自动标记为改约，保留最新记录...'));
        const sorted = [...existingRecords].sort((a, b) => (0, dayjs_1.default)(b.appointmentDate).unix() - (0, dayjs_1.default)(a.appointmentDate).unix());
        const keepRecord = sorted[0];
        const removeIds = sorted.slice(1).map(r => r.id);
        removeIds.forEach(id => (0, database_1.deleteAppointment)(id));
        (0, database_1.updateAppointment)(keepRecord.id, { status: '已改约' });
        (0, database_1.updateDirtyRecord)(record.id, {
            status: 'fixed',
            fixNote: `自动合并改约，保留最新日期`,
            fixedBy: user.id,
            fixedAt: (0, dayjs_1.default)().toISOString(),
            suggestedFix: {
                action: 'merge_reschedule',
                keepId: keepRecord.id,
                removedIds: removeIds,
                newStatus: '已改约',
            },
        });
        (0, database_1.addOperationLog)('fix_merge_conflict', user, {
            recordId: record.id,
            beforeData: { count: existingRecords.length },
            afterData: { action: 'merged', keepId: keepRecord.id },
        });
        console.log(chalk_1.default.green(`✅ 已合并，保留 ${keepRecord.id.slice(0, 8)}，删除 ${removeIds.length} 条记录`));
        return true;
    }
    const answer = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'action',
            message: '确认处理方式:',
            choices: [
                { name: '改约合并（保留最新，标记为已改约）', value: 'merge_reschedule' },
                { name: '二次上门（保留全部）', value: 'keep_second_visit' },
                { name: '手动选择保留记录', value: 'manual' },
                { name: '跳过', value: 'skip' },
            ],
        },
    ]);
    if (answer.action === 'skip') {
        console.log(chalk_1.default.yellow('已跳过'));
        return false;
    }
    const noteAnswer = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'fixNote',
            message: '修复说明:',
            default: answer.action === 'merge_reschedule' ? '合并改约记录' : '确认二次上门',
        },
    ]);
    if (answer.action === 'keep_second_visit') {
        (0, database_1.updateDirtyRecord)(record.id, {
            status: 'fixed',
            fixNote: noteAnswer.fixNote,
            fixedBy: user.id,
            fixedAt: (0, dayjs_1.default)().toISOString(),
            suggestedFix: { action: 'confirmed_second_visit' },
        });
        (0, database_1.addOperationLog)('fix_merge_conflict', user, {
            recordId: record.id,
            afterData: { action: 'confirmed_second_visit' },
        });
        console.log(chalk_1.default.green('\n✅ 已确认二次上门，保留全部记录'));
        return true;
    }
    if (answer.action === 'merge_reschedule') {
        const sorted = [...existingRecords].sort((a, b) => (0, dayjs_1.default)(b.appointmentDate).unix() - (0, dayjs_1.default)(a.appointmentDate).unix());
        const keepRecord = sorted[0];
        const removeIds = sorted.slice(1).map(r => r.id);
        removeIds.forEach(id => (0, database_1.deleteAppointment)(id));
        (0, database_1.updateAppointment)(keepRecord.id, { status: '已改约' });
        (0, database_1.updateDirtyRecord)(record.id, {
            status: 'fixed',
            fixNote: noteAnswer.fixNote,
            fixedBy: user.id,
            fixedAt: (0, dayjs_1.default)().toISOString(),
        });
        (0, database_1.addOperationLog)('fix_merge_conflict', user, {
            recordId: record.id,
            beforeData: { count: existingRecords.length },
            afterData: { action: 'merged', keepId: keepRecord.id },
        });
        console.log(chalk_1.default.green(`\n✅ 已合并，保留 ${keepRecord.id.slice(0, 8)}，删除 ${removeIds.length} 条记录`));
        return true;
    }
    if (answer.action === 'manual') {
        return await fixDuplicate(record, auto);
    }
    return false;
}
async function handleApprove(dirtyId) {
    (0, login_1.requirePermission)('approve');
    const user = (0, database_1.getCurrentUser)();
    const dirtyRecords = (0, database_1.getDirtyRecords)();
    const record = dirtyRecords.find((r) => r.id.startsWith(dirtyId));
    if (!record) {
        console.log(chalk_1.default.red(`❌ 未找到脏记录: ${dirtyId}`));
        process.exit(1);
    }
    if (record.status !== 'fixed') {
        console.log(chalk_1.default.yellow(`⚠️  只有已修复的记录才能复核通过`));
        console.log(chalk_1.default.gray(`当前状态: ${record.status}`));
        process.exit(1);
    }
    if (!record.fixedBy || !record.suggestedFix) {
        console.log(chalk_1.default.red(`❌ 修复记录不完整，缺少修复信息`));
        process.exit(1);
    }
    const beforeData = record.originalData;
    const afterData = record.suggestedFix;
    const diffs = (0, diff_1.compareObjects)(beforeData, afterData);
    (0, database_1.updateDirtyRecord)(record.id, { status: 'approved' });
    (0, database_1.addOperationLog)('approve_fix', user, {
        recordId: record.id,
        beforeData,
        afterData,
    });
    console.log(chalk_1.default.green(`✅ 已复核通过: ${record.id}`));
    if (diffs.length > 0) {
        console.log(chalk_1.default.gray('变更详情:'));
        console.log((0, diff_1.formatDiff)(diffs));
    }
}
async function handleReject(dirtyId, reason) {
    (0, login_1.requirePermission)('reject');
    const user = (0, database_1.getCurrentUser)();
    const dirtyRecords = (0, database_1.getDirtyRecords)();
    const record = dirtyRecords.find((r) => r.id.startsWith(dirtyId));
    if (!record) {
        console.log(chalk_1.default.red(`❌ 未找到脏记录: ${dirtyId}`));
        process.exit(1);
    }
    (0, database_1.updateDirtyRecord)(record.id, {
        status: 'rejected',
        fixNote: reason,
    });
    (0, database_1.addOperationLog)('reject_fix', user, {
        recordId: record.id,
    });
    console.log(chalk_1.default.red(`❌ 已驳回修复: ${record.id}`));
    console.log(chalk_1.default.gray(`原因: ${reason}`));
}
//# sourceMappingURL=fix.js.map