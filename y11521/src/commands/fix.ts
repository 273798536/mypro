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
import { canEditField, maskDataByRole, getEditableFields } from '../config/permissions';
import { compareObjects, formatDiff } from '../utils/diff';
import { DirtyRecord, AppointmentRecord, LocationRecord, ReviewRecord, PriceAdjustmentRecord, Role } from '../types';

const roleLabels: Record<Role, string> = {
  entry: '录入员',
  review: '复核员',
  supervisor: '主管',
  readonly: '只读',
};

export async function handleFix(dirtyId: string | undefined, options: { all?: boolean; auto?: boolean }): Promise<void> {
  requirePermission('fix_dirty');

  const user = getCurrentUser()!;
  const dirtyRecords = getDirtyRecords();
  const pendingRecords = dirtyRecords.filter((r) => r.status === 'dirty');

  console.log(chalk.blue('=== 脏记录修复 ===\n'));
  console.log(chalk.gray(`当前用户: ${user.name} (${roleLabels[user.role]})`));

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

  let fixedCount = 0;
  for (const record of toFix) {
    const result = await fixSingleRecord(record, options.auto ?? false);
    if (result) fixedCount++;
  }

  if (fixedCount > 0) {
    addOperationLog('fix_records', user, { afterData: { fixedCount } });
  }
}

async function fixSingleRecord(record: DirtyRecord, auto: boolean): Promise<boolean> {
  const user = getCurrentUser()!;

  console.log(chalk.cyan(`\n📝 记录ID: ${record.id}`));
  console.log(`数据源: ${getSourceTypeLabel(record.sourceType)}`);
  console.log(`问题类型: ${getDirtyTypeLabel(record.dirtyType)}`);
  console.log(`问题描述: ${record.description}`);
  if (record.sourceFile) console.log(`原始文件: ${record.sourceFile} (行 ${record.rawRow})`);

  console.log(`\n${chalk.yellow('原始数据 (按权限过滤显示):')}`);
  const originalTable = new Table();
  const maskedOriginal = maskDataByRole(user.role, record.originalData);
  Object.entries(maskedOriginal).forEach(([k, v]) => {
    originalTable.push([k, String(v || '')]);
  });
  console.log(originalTable.toString());

  let fixData: Record<string, any> = { ...record.originalData };
  let hasChanges = false;

  const editableFields = getEditableFields(user.role);
  console.log(chalk.gray(`可编辑字段: ${editableFields.join(', ') || '无'}`));

  if (auto && record.suggestedFix) {
    console.log(chalk.green(`\n🔧 自动应用建议修复...`));
    const suggestedEditable: Record<string, any> = {};
    for (const [key, value] of Object.entries(record.suggestedFix)) {
      if (canEditField(user.role, key)) {
        suggestedEditable[key] = value;
      }
    }
    if (Object.keys(suggestedEditable).length > 0) {
      fixData = { ...fixData, ...suggestedEditable };
      hasChanges = true;
    } else {
      console.log(chalk.yellow('⚠️  您的角色没有权限编辑建议修复中的任何字段'));
    }
  } else if (record.suggestedFix) {
    console.log(`\n${chalk.blue('建议修复:')}`);
    const diffs = compareObjects(record.originalData, record.suggestedFix);
    const filteredDiffs = diffs.filter(d => canEditField(user.role, d.field));
    if (filteredDiffs.length > 0) {
      console.log(formatDiff(filteredDiffs));
    } else {
      console.log(chalk.yellow('⚠️  您的角色没有权限编辑建议修复中的任何字段'));
    }

    if (filteredDiffs.length > 0) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'applySuggested',
          message: '是否应用可编辑的建议修复?',
          default: true,
        },
      ]);

      if (answer.applySuggested) {
        for (const [key, value] of Object.entries(record.suggestedFix)) {
          if (canEditField(user.role, key)) {
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
        console.log(`\n${chalk.cyan('当前数据 (按权限过滤):')}`);
        const currentTable = new Table();
        const maskedCurrent = maskDataByRole(user.role, fixData);
        Object.entries(maskedCurrent).forEach(([k, v]) => {
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
          return false;
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
          hasChanges = true;
        }
      }
    } else {
      console.log(chalk.yellow('⚠️  此记录中没有您有权限编辑的字段'));
    }
  }

  const diffs = compareObjects(record.originalData, fixData);
  const actualDiffs = diffs.filter(d => d.type === 'changed' || d.type === 'added' || d.type === 'removed');

  if (actualDiffs.length === 0 || !hasChanges) {
    console.log(chalk.yellow('\n⚠️  没有实际修改任何数据，取消修复'));
    return false;
  }

  console.log(`\n${chalk.blue('实际变更差异:')}`);
  console.log(formatDiff(actualDiffs));

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
    return true;
  } catch (err: any) {
    console.log(chalk.red(`\n❌ 修复失败: ${err.message}`));
    return false;
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
    console.log(chalk.gray(`当前状态: ${record.status}`));
    process.exit(1);
  }

  if (!record.fixedBy || !record.suggestedFix) {
    console.log(chalk.red(`❌ 修复记录不完整，缺少修复信息`));
    process.exit(1);
  }

  const beforeData = record.originalData;
  const afterData = record.suggestedFix;
  const diffs = compareObjects(beforeData, afterData);

  if (diffs.length === 0) {
    console.log(chalk.yellow(`⚠️  没有检测到实际修改，复核需确认是否有变更`));
  }

  updateDirtyRecord(record.id, { status: 'approved' });

  addOperationLog('approve_fix', user, {
    recordId: record.id,
    beforeData,
    afterData,
  });

  console.log(chalk.green(`✅ 已复核通过: ${record.id}`));
  if (diffs.length > 0) {
    console.log(chalk.gray('变更详情:'));
    console.log(formatDiff(diffs));
  }
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
