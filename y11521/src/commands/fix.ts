import chalk from 'chalk';
import dayjs from 'dayjs';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import {
  getDirtyRecords,
  updateDirtyRecord,
  getCurrentUser,
  addAppointment,
  addLocation,
  addReview,
  addPriceAdjustment,
  addOperationLog,
} from '../utils/database';
import { getDirtyTypeLabel, getSourceTypeLabel } from '../utils/dirtyChecker';
import { requirePermission } from './login';
import { compareObjects, formatDiff } from '../utils/diff';
import { DirtyRecord, AppointmentRecord, LocationRecord, ReviewRecord, PriceAdjustmentRecord } from '../types';

export async function handleFix(dirtyId: string | undefined, options: { all?: boolean; auto?: boolean }): Promise<void> {
  requirePermission('fix_dirty');

  const user = getCurrentUser()!;
  const dirtyRecords = getDirtyRecords();
  const pendingRecords = dirtyRecords.filter((r) => r.status === 'dirty');

  console.log(chalk.blue('=== 脏记录修复 ===\n'));

  if (pendingRecords.length === 0) {
    console.log(chalk.green('✅ 没有待修复的脏记录'));
    return;
  }

  let toFix: DirtyRecord[] = [];

  if (dirtyId) {
    const record = dirtyRecords.find((r) => r.id.startsWith(dirtyId));
    if (!record) {
      console.log(chalk.red(`❌ 未找到脏记录: ${dirtyId}`));
      process.exit(1);
    }
    toFix = [record];
  } else if (options.all) {
    toFix = pendingRecords;
  } else {
    const choices = pendingRecords.slice(0, 20).map((r) => ({
      name: `${r.id.slice(0, 8)} | 行${r.rawRow} | ${getSourceTypeLabel(r.sourceType)} | ${getDirtyTypeLabel(r.dirtyType)} | ${r.description.slice(0, 30)}`,
      value: r.id,
    }));

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'recordId',
        message: '选择要修复的脏记录:',
        choices,
      },
    ]);

    const record = dirtyRecords.find((r) => r.id === answer.recordId);
    if (record) toFix = [record];
  }

  for (const record of toFix) {
    await fixSingleRecord(record, options.auto ?? false);
  }

  addOperationLog('fix_records', user, {});
}

async function fixSingleRecord(record: DirtyRecord, auto: boolean): Promise<void> {
  const user = getCurrentUser()!;

  console.log(chalk.cyan(`\n📝 记录ID: ${record.id}`));
  console.log(`数据源: ${getSourceTypeLabel(record.sourceType)}`);
  console.log(`问题类型: ${getDirtyTypeLabel(record.dirtyType)}`);
  console.log(`问题描述: ${record.description}`);
  console.log(`原始文件: ${record.sourceFile} (行 ${record.rawRow})`);

  console.log(`\n${chalk.yellow('原始数据:')}`);
  const originalTable = new Table();
  Object.entries(record.originalData).forEach(([k, v]) => {
    originalTable.push([k, String(v || '')]);
  });
  console.log(originalTable.toString());

  let fixData: Record<string, any> = { ...record.originalData };

  if (auto && record.suggestedFix) {
    console.log(chalk.green(`\n🔧 自动应用建议修复...`));
    fixData = { ...fixData, ...record.suggestedFix };
  } else if (record.suggestedFix) {
    console.log(`\n${chalk.blue('建议修复:')}`);
    const diffs = compareObjects(record.originalData, record.suggestedFix);
    console.log(formatDiff(diffs));

    const answer = await inquirer.prompt([
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
      console.log(`\n${chalk.cyan('当前数据:')}`);
      const currentTable = new Table();
      Object.entries(fixData).forEach(([k, v]) => {
        currentTable.push([k, String(v || '')]);
      });
      console.log(currentTable.toString());

      const answer = await inquirer.prompt([
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
        console.log(chalk.yellow('已跳过'));
        return;
      }

      if (answer.action === 'confirm') {
        editing = false;
      }

      if (answer.action === 'edit') {
        const fieldAnswer = await inquirer.prompt([
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
            default: (ans: any) => String(fixData[ans.field] || ''),
          },
        ]);
        fixData[fieldAnswer.field] = fieldAnswer.value;
      }
    }
  }

  const diffs = compareObjects(record.originalData, fixData);
  console.log(`\n${chalk.blue('变更差异:')}`);
  console.log(formatDiff(diffs));

  const fixNoteAnswer = auto
    ? { fixNote: '自动修复' }
    : await inquirer.prompt([
        {
          type: 'input',
          name: 'fixNote',
          message: '修复说明:',
          default: '手动修复',
        },
      ]);

  let importedRecord: AppointmentRecord | LocationRecord | ReviewRecord | PriceAdjustmentRecord | null = null;

  try {
    if (record.sourceType === 'appointment') {
      importedRecord = addAppointment(fixData as Omit<AppointmentRecord, 'id' | 'source'>);
    } else if (record.sourceType === 'location') {
      importedRecord = addLocation(fixData as Omit<LocationRecord, 'id' | 'source'>);
    } else if (record.sourceType === 'review') {
      importedRecord = addReview(fixData as Omit<ReviewRecord, 'id' | 'source'>);
    } else if (record.sourceType === 'price_adjustment') {
      importedRecord = addPriceAdjustment(fixData as Omit<PriceAdjustmentRecord, 'id' | 'source'>);
    }

    updateDirtyRecord(record.id, {
      status: 'fixed',
      suggestedFix: fixData,
      fixNote: fixNoteAnswer.fixNote,
      fixedBy: user.id,
      fixedAt: dayjs().toISOString(),
    });

    addOperationLog('fix_dirty_record', user, {
      recordId: record.id,
      beforeData: record.originalData,
      afterData: fixData,
    });

    console.log(chalk.green(`\n✅ 修复完成！记录已重新导入`));
  } catch (err: any) {
    console.log(chalk.red(`\n❌ 修复失败: ${err.message}`));
  }
}

export async function handleApprove(dirtyId: string): Promise<void> {
  requirePermission('approve');

  const user = getCurrentUser()!;
  const dirtyRecords = getDirtyRecords();
  const record = dirtyRecords.find((r) => r.id.startsWith(dirtyId));

  if (!record) {
    console.log(chalk.red(`❌ 未找到脏记录: ${dirtyId}`));
    process.exit(1);
  }

  if (record.status !== 'fixed') {
    console.log(chalk.yellow(`⚠️  只有已修复的记录才能复核通过`));
    process.exit(1);
  }

  updateDirtyRecord(record.id, { status: 'approved' });

  addOperationLog('approve_fix', user, {
    recordId: record.id,
    beforeData: record.originalData,
    afterData: record.suggestedFix,
  });

  console.log(chalk.green(`✅ 已复核通过: ${record.id}`));
}

export async function handleReject(dirtyId: string, reason: string): Promise<void> {
  requirePermission('reject');

  const user = getCurrentUser()!;
  const dirtyRecords = getDirtyRecords();
  const record = dirtyRecords.find((r) => r.id.startsWith(dirtyId));

  if (!record) {
    console.log(chalk.red(`❌ 未找到脏记录: ${dirtyId}`));
    process.exit(1);
  }

  updateDirtyRecord(record.id, {
    status: 'rejected',
    fixNote: reason,
  });

  addOperationLog('reject_fix', user, {
    recordId: record.id,
  });

  console.log(chalk.red(`❌ 已驳回修复: ${record.id}`));
  console.log(chalk.gray(`原因: ${reason}`));
}
