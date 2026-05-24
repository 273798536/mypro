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
const diff_1 = require("../utils/diff");
async function handleFix(dirtyId, options) {
    (0, login_1.requirePermission)('fix_dirty');
    const user = (0, database_1.getCurrentUser)();
    const dirtyRecords = (0, database_1.getDirtyRecords)();
    const pendingRecords = dirtyRecords.filter((r) => r.status === 'dirty');
    console.log(chalk_1.default.blue('=== 脏记录修复 ===\n'));
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
    for (const record of toFix) {
        await fixSingleRecord(record, options.auto ?? false);
    }
    (0, database_1.addOperationLog)('fix_records', user, {});
}
async function fixSingleRecord(record, auto) {
    const user = (0, database_1.getCurrentUser)();
    console.log(chalk_1.default.cyan(`\n📝 记录ID: ${record.id}`));
    console.log(`数据源: ${(0, dirtyChecker_1.getSourceTypeLabel)(record.sourceType)}`);
    console.log(`问题类型: ${(0, dirtyChecker_1.getDirtyTypeLabel)(record.dirtyType)}`);
    console.log(`问题描述: ${record.description}`);
    console.log(`原始文件: ${record.sourceFile} (行 ${record.rawRow})`);
    console.log(`\n${chalk_1.default.yellow('原始数据:')}`);
    const originalTable = new cli_table3_1.default();
    Object.entries(record.originalData).forEach(([k, v]) => {
        originalTable.push([k, String(v || '')]);
    });
    console.log(originalTable.toString());
    let fixData = { ...record.originalData };
    if (auto && record.suggestedFix) {
        console.log(chalk_1.default.green(`\n🔧 自动应用建议修复...`));
        fixData = { ...fixData, ...record.suggestedFix };
    }
    else if (record.suggestedFix) {
        console.log(`\n${chalk_1.default.blue('建议修复:')}`);
        const diffs = (0, diff_1.compareObjects)(record.originalData, record.suggestedFix);
        console.log((0, diff_1.formatDiff)(diffs));
        const answer = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'applySuggested',
                message: '是否应用建议修复?',
                default: true,
            },
        ]);
        if (answer.applySuggested) {
            fixData = { ...fixData, ...record.suggestedFix };
        }
    }
    if (!auto) {
        const editableFields = Object.keys(fixData);
        const fieldChoices = editableFields.map((f) => ({ name: f, value: f }));
        let editing = true;
        while (editing) {
            console.log(`\n${chalk_1.default.cyan('当前数据:')}`);
            const currentTable = new cli_table3_1.default();
            Object.entries(fixData).forEach(([k, v]) => {
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
                return;
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
            }
        }
    }
    const diffs = (0, diff_1.compareObjects)(record.originalData, fixData);
    console.log(`\n${chalk_1.default.blue('变更差异:')}`);
    console.log((0, diff_1.formatDiff)(diffs));
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
    }
    catch (err) {
        console.log(chalk_1.default.red(`\n❌ 修复失败: ${err.message}`));
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
        process.exit(1);
    }
    (0, database_1.updateDirtyRecord)(record.id, { status: 'approved' });
    (0, database_1.addOperationLog)('approve_fix', user, {
        recordId: record.id,
        beforeData: record.originalData,
        afterData: record.suggestedFix,
    });
    console.log(chalk_1.default.green(`✅ 已复核通过: ${record.id}`));
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