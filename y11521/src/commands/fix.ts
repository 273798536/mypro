import chalk from 'chalk';
import dayjs from 'dayjs';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import {
  getDirtyRecords,
  updateDirtyRecord,
  getCurrentUser,
  addOperationLog,
  getAppointmentsByOrderNo,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  mergeAppointments,
  updateReview,
  getReviewById,
  updatePriceAdjustment,
  getPriceAdjustmentById,
  updateLocation,
  getLocationById,
} from '../utils/database';
import { getDirtyTypeLabel, getSourceTypeLabel } from '../utils/dirtyChecker';
import { requirePermission } from './login';
import { canEditField, maskDataByRole, getEditableFields } from '../config/permissions';
import { compareObjects, formatDiff } from '../utils/diff';
import { DirtyRecord, Role, AppointmentRecord } from '../types';

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
      name: `${r.id.slice(0, 8)} | 行${r.rawRow || '-'} | ${getSourceTypeLabel(r.sourceType)} | ${getDirtyTypeLabel(r.dirtyType)} | ${r.description.slice(0, 30)}`,
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
    const result = await fixByDirtyType(record, options.auto ?? false);
    if (result) fixedCount++;
  }

  if (fixedCount > 0) {
    addOperationLog('fix_records', user, { afterData: { fixedCount } });
  }
}

async function fixByDirtyType(record: DirtyRecord, auto: boolean): Promise<boolean> {
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

async function fixFieldIssue(record: DirtyRecord, auto: boolean): Promise<boolean> {
  const user = getCurrentUser()!;

  console.log(chalk.cyan(`\n📝 记录ID: ${record.id}`));
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
    }
  } else if (record.suggestedFix) {
    console.log(`\n${chalk.blue('建议修复:')}`);
    const diffs = compareObjects(record.originalData, record.suggestedFix);
    const filteredDiffs = diffs.filter(d => canEditField(user.role, d.field));
    if (filteredDiffs.length > 0) {
      console.log(formatDiff(filteredDiffs));
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

  try {
    const originalId = (record.originalData as any)?.id;
    if (originalId) {
      if (record.sourceType === 'appointment') {
        updateAppointment(originalId, fixData);
      } else if (record.sourceType === 'location') {
        updateLocation(originalId, fixData);
      } else if (record.sourceType === 'review') {
        updateReview(originalId, fixData);
      } else if (record.sourceType === 'price_adjustment') {
        updatePriceAdjustment(originalId, fixData);
      }
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

    console.log(chalk.green(`\n✅ 修复完成！记录已更新`));
    return true;
  } catch (err: any) {
    console.log(chalk.red(`\n❌ 修复失败: ${err.message}`));
    return false;
  }
}

async function fixDuplicate(record: DirtyRecord, auto: boolean): Promise<boolean> {
  const user = getCurrentUser()!;
  const orderNo = record.originalData?.orderNo;
  const records = record.originalData?.records || [];

  if (!orderNo) {
    console.log(chalk.red('❌ 缺少订单号信息'));
    return false;
  }

  console.log(chalk.cyan(`\n📝 记录ID: ${record.id}`));
  console.log(`问题类型: 重复记录`);
  console.log(`订单号: ${orderNo}`);
  console.log(`重复次数: ${records.length || '多'}`);

  const existingRecords = getAppointmentsByOrderNo(orderNo);
  if (existingRecords.length <= 1) {
    console.log(chalk.yellow('⚠️  当前已无重复记录，自动标记为已修复'));
    updateDirtyRecord(record.id, {
      status: 'fixed',
      fixNote: '重复记录已被其他操作处理',
      fixedBy: user.id,
      fixedAt: dayjs().toISOString(),
    });
    return true;
  }

  console.log(`\n${chalk.yellow('当前重复记录:')}`);
  const dupTable = new Table({
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
    console.log(chalk.green('\n🔧 自动保留第一条，删除其他重复记录...'));
    const keepRecord = existingRecords[0];
    const removeIds = existingRecords.slice(1).map(r => r.id);

    removeIds.forEach(id => deleteAppointment(id));

    updateDirtyRecord(record.id, {
      status: 'fixed',
      fixNote: `自动保留 ID:${keepRecord.id.slice(0, 8)}, 删除 ${removeIds.length} 条重复`,
      fixedBy: user.id,
      fixedAt: dayjs().toISOString(),
      suggestedFix: {
        action: 'keep_and_delete',
        keepId: keepRecord.id,
        removedIds: removeIds,
      },
    });

    addOperationLog('fix_duplicate', user, {
      recordId: record.id,
      beforeData: { count: existingRecords.length, records: existingRecords.map(r => r.id) },
      afterData: { action: 'merged', keepId: keepRecord.id, removedCount: removeIds.length },
    });

    console.log(chalk.green(`✅ 已保留 ${keepRecord.id.slice(0, 8)}，删除 ${removeIds.length} 条重复记录`));
    return true;
  }

  const choices = existingRecords.map((r) => ({
    name: `保留 ${r.id.slice(0, 8)} - ${r.status} - ${r.appointmentDate}`,
    value: r.id,
  }));

  const answer = await inquirer.prompt([
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

  removeIds.forEach(id => deleteAppointment(id));

  updateDirtyRecord(record.id, {
    status: 'fixed',
    fixNote: answer.fixNote,
    fixedBy: user.id,
    fixedAt: dayjs().toISOString(),
    suggestedFix: {
      action: 'keep_and_delete',
      keepId,
      removedIds: removeIds,
    },
  });

  addOperationLog('fix_duplicate', user, {
    recordId: record.id,
    beforeData: { count: existingRecords.length },
    afterData: { action: 'merged', removedCount: removeIds.length },
  });

  console.log(chalk.green(`\n✅ 已保留 ${keepId.slice(0, 8)}，删除 ${removeIds.length} 条重复记录`));
  return true;
}

async function fixNameChange(record: DirtyRecord, auto: boolean): Promise<boolean> {
  const user = getCurrentUser()!;
  const orderNo = record.originalData?.orderNo;
  const names = record.originalData?.names || [];

  if (!orderNo) {
    console.log(chalk.red('❌ 缺少订单号信息'));
    return false;
  }

  console.log(chalk.cyan(`\n📝 记录ID: ${record.id}`));
  console.log(`问题类型: 客户改名`);
  console.log(`订单号: ${orderNo}`);
  console.log(`姓名不一致: ${names.join(' vs ')}`);

  const existingRecords = getAppointmentsByOrderNo(orderNo);
  if (existingRecords.length === 0) {
    console.log(chalk.yellow('⚠️  订单已不存在，自动标记为已修复'));
    updateDirtyRecord(record.id, {
      status: 'fixed',
      fixNote: '订单已被删除',
      fixedBy: user.id,
      fixedAt: dayjs().toISOString(),
    });
    return true;
  }

  console.log(`\n${chalk.yellow('当前订单记录:')}`);
  const nameTable = new Table({
    head: ['ID', '客户姓名', '状态', '预约日期'],
    colWidths: [12, 15, 12, 14],
  });
  existingRecords.forEach((r) => {
    nameTable.push([r.id.slice(0, 10), r.customerName, r.status, r.appointmentDate]);
  });
  console.log(nameTable.toString());

  let correctName: string;
  let fixNote: string;

  if (auto) {
    correctName = names[0];
    fixNote = `自动统一姓名为: ${correctName}`;
    console.log(chalk.green(`\n🔧 自动统一姓名为: ${correctName}`));
  } else {
    const nameChoices = names.map((n: string) => ({ name: n, value: n }));
    const answer = await inquirer.prompt([
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
    updateAppointment(r.id, { customerName: correctName });
  });

  updateDirtyRecord(record.id, {
    status: 'fixed',
    fixNote,
    fixedBy: user.id,
    fixedAt: dayjs().toISOString(),
    suggestedFix: { correctName },
  });

  addOperationLog('fix_name_changed', user, {
    recordId: record.id,
    beforeData: { names },
    afterData: { correctName },
  });

  console.log(chalk.green(`\n✅ 已将 ${existingRecords.length} 条记录的客户姓名统一为: ${correctName}`));
  return true;
}

async function fixQuantityConflict(record: DirtyRecord, auto: boolean): Promise<boolean> {
  const user = getCurrentUser()!;
  const orderNo = record.originalData?.orderNo;
  const types = record.originalData?.types || [];

  if (!orderNo) {
    console.log(chalk.red('❌ 缺少订单号信息'));
    return false;
  }

  console.log(chalk.cyan(`\n📝 记录ID: ${record.id}`));
  console.log(`问题类型: 数量冲突（多台家电）`);
  console.log(`订单号: ${orderNo}`);
  console.log(`家电类型: ${types.join(', ')}`);

  const existingRecords = getAppointmentsByOrderNo(orderNo);

  console.log(`\n${chalk.yellow('当前订单记录:')}`);
  const qtyTable = new Table({
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
    console.log(chalk.green('\n🔧 自动确认多台家电，保留全部记录...'));
    updateDirtyRecord(record.id, {
      status: 'fixed',
      fixNote: '确认多台家电安装，保留全部记录',
      fixedBy: user.id,
      fixedAt: dayjs().toISOString(),
      suggestedFix: { action: 'keep_multi_appliance' },
    });
    addOperationLog('fix_quantity_conflict', user, {
      recordId: record.id,
      beforeData: { orderNo, count: existingRecords.length },
      afterData: { action: 'confirmed_multi' },
    });
    return true;
  }

  const answer = await inquirer.prompt([
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
    console.log(chalk.yellow('已跳过'));
    return false;
  }

  if (answer.action === 'keep') {
    updateDirtyRecord(record.id, {
      status: 'fixed',
      fixNote: '确认多台家电安装',
      fixedBy: user.id,
      fixedAt: dayjs().toISOString(),
    });
    addOperationLog('fix_quantity_conflict', user, {
      recordId: record.id,
      afterData: { action: 'confirmed_multi' },
    });
    console.log(chalk.green('\n✅ 已确认多台家电安装，保留全部记录'));
    return true;
  }

  if (answer.action === 'delete') {
    return await fixDuplicate(record, auto);
  }

  return false;
}

async function fixMergeConflict(record: DirtyRecord, auto: boolean): Promise<boolean> {
  const user = getCurrentUser()!;
  const orderNo = record.originalData?.orderNo;
  const statuses = record.originalData?.statuses || [];
  const dates = record.originalData?.dates || [];

  if (!orderNo) {
    console.log(chalk.red('❌ 缺少订单号信息'));
    return false;
  }

  console.log(chalk.cyan(`\n📝 记录ID: ${record.id}`));
  console.log(`问题类型: 改约/二次上门合并冲突`);
  console.log(`订单号: ${orderNo}`);
  console.log(`状态: ${statuses.join(', ')}`);
  console.log(`日期: ${dates.join(', ')}`);

  const existingRecords = getAppointmentsByOrderNo(orderNo);

  console.log(`\n${chalk.yellow('当前订单记录 (可能需要合并):')}`);
  const mergeTable = new Table({
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
    console.log(chalk.green('\n🔧 自动标记为改约，保留最新记录...'));
    const sorted = [...existingRecords].sort((a, b) =>
      dayjs(b.appointmentDate).unix() - dayjs(a.appointmentDate).unix()
    );
    const keepRecord = sorted[0];
    const removeIds = sorted.slice(1).map(r => r.id);

    removeIds.forEach(id => deleteAppointment(id));
    updateAppointment(keepRecord.id, { status: '已改约' });

    updateDirtyRecord(record.id, {
      status: 'fixed',
      fixNote: `自动合并改约，保留最新日期`,
      fixedBy: user.id,
      fixedAt: dayjs().toISOString(),
      suggestedFix: {
        action: 'merge_reschedule',
        keepId: keepRecord.id,
        removedIds: removeIds,
        newStatus: '已改约',
      },
    });

    addOperationLog('fix_merge_conflict', user, {
      recordId: record.id,
      beforeData: { count: existingRecords.length },
      afterData: { action: 'merged', keepId: keepRecord.id },
    });

    console.log(chalk.green(`✅ 已合并，保留 ${keepRecord.id.slice(0, 8)}，删除 ${removeIds.length} 条记录`));
    return true;
  }

  const answer = await inquirer.prompt([
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
    console.log(chalk.yellow('已跳过'));
    return false;
  }

  const noteAnswer = await inquirer.prompt([
    {
      type: 'input',
      name: 'fixNote',
      message: '修复说明:',
      default: answer.action === 'merge_reschedule' ? '合并改约记录' : '确认二次上门',
    },
  ]);

  if (answer.action === 'keep_second_visit') {
    updateDirtyRecord(record.id, {
      status: 'fixed',
      fixNote: noteAnswer.fixNote,
      fixedBy: user.id,
      fixedAt: dayjs().toISOString(),
      suggestedFix: { action: 'confirmed_second_visit' },
    });
    addOperationLog('fix_merge_conflict', user, {
      recordId: record.id,
      afterData: { action: 'confirmed_second_visit' },
    });
    console.log(chalk.green('\n✅ 已确认二次上门，保留全部记录'));
    return true;
  }

  if (answer.action === 'merge_reschedule') {
    const sorted = [...existingRecords].sort((a, b) =>
      dayjs(b.appointmentDate).unix() - dayjs(a.appointmentDate).unix()
    );
    const keepRecord = sorted[0];
    const removeIds = sorted.slice(1).map(r => r.id);

    removeIds.forEach(id => deleteAppointment(id));
    updateAppointment(keepRecord.id, { status: '已改约' });

    updateDirtyRecord(record.id, {
      status: 'fixed',
      fixNote: noteAnswer.fixNote,
      fixedBy: user.id,
      fixedAt: dayjs().toISOString(),
    });

    addOperationLog('fix_merge_conflict', user, {
      recordId: record.id,
      beforeData: { count: existingRecords.length },
      afterData: { action: 'merged', keepId: keepRecord.id },
    });

    console.log(chalk.green(`\n✅ 已合并，保留 ${keepRecord.id.slice(0, 8)}，删除 ${removeIds.length} 条记录`));
    return true;
  }

  if (answer.action === 'manual') {
    return await fixDuplicate(record, auto);
  }

  return false;
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
