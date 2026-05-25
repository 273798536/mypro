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
            name: `${r.id.slice(0, 8)} | 行${r.rawRow} | ${(0, dirtyChecker_1.getSourceTypeLabel)(r.sourceType)} | ${(0, dirtyChecker_1.getDirtyTypeLabel)(r.dirtyType)} | ${r.description.slice(0, 30)}`,
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
        const result = await fixSingleRecord(record, options.auto ?? false);
        if (result)
            fixedCount++;
    }
    if (fixedCount > 0) {
        (0, database_1.addOperationLog)('fix_records', user, { afterData: { fixedCount } });
    }
}
async function fixSingleRecord(record, auto) {
    const user = (0, database_1.getCurrentUser)();
    console.log(chalk_1.default.cyan(`\n📝 记录ID: ${record.id}`));
    console.log(`数据源: ${(0, dirtyChecker_1.getSourceTypeLabel)(record.sourceType)}`);
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
        else {
            console.log(chalk_1.default.yellow('⚠️  您的角色没有权限编辑建议修复中的任何字段'));
        }
    }
    else if (record.suggestedFix) {
        console.log(`\n${chalk_1.default.blue('建议修复:')}`);
        const diffs = (0, diff_1.compareObjects)(record.originalData, record.suggestedFix);
        const filteredDiffs = diffs.filter(d => (0, permissions_1.canEditField)(user.role, d.field));
        if (filteredDiffs.length > 0) {
            console.log((0, diff_1.formatDiff)(filteredDiffs));
        }
        else {
            console.log(chalk_1.default.yellow('⚠️  您的角色没有权限编辑建议修复中的任何字段'));
        }
        if (filteredDiffs.length > 0) {
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
        else {
            console.log(chalk_1.default.yellow('⚠️  此记录中没有您有权限编辑的字段'));
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
    let importedRecord = null;
    try {
        if (record.sourceType === 'appointment') {
            importedRecord = (0, database_1.addAppointment)(fixData);
        }
        else if (record.sourceType === 'location') {
            importedRecord = (0, database_1.addLocation)(fixData);
        }
        else if (record.sourceType === 'review') {
            importedRecord = (0, database_1.addReview)(fixData);
        }
        else if (record.sourceType === 'price_adjustment') {
            importedRecord = (0, database_1.addPriceAdjustment)(fixData);
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
        console.log(chalk_1.default.green(`\n✅ 修复完成！记录已重新导入`));
        return true;
    }
    catch (err) {
        console.log(chalk_1.default.red(`\n❌ 修复失败: ${err.message}`));
        return false;
    }
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
    if (diffs.length === 0) {
        console.log(chalk_1.default.yellow(`⚠️  没有检测到实际修改，复核需确认是否有变更`));
    }
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