import '../database';
import { BatchService } from '../services/batch-service';
import { MaterialService } from '../services/material-service';
import { AuditService } from '../services/audit-service';
import { HrbpService } from '../services/hrbp-service';
import { TaskService } from '../services/task-service';
import { BatchStatus, BatchStrategy, ProcessResult, MaterialType, TaskStatus } from '../types';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

async function runTests() {
  console.log('开始运行测试用例...\n');
  const results: TestResult[] = [];

  results.push(await test_CreateBatch());
  results.push(await test_BatchStatusTransitions());
  results.push(await test_DuplicateBatchStrategy());
  results.push(await test_UploadAndProcessMaterial());
  results.push(await test_ChangeHistoryTracking());
  results.push(await test_HrbpRoleView());
  results.push(await test_ExportReport());
  results.push(await test_FailedItemsReport());
  results.push(await test_TaskRecovery());

  console.log('\n=== 测试结果总结 ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}${r.error ? ` - ${r.error}` : ''}`);
  });

  console.log(`\n总计: ${passed} 通过, ${failed} 失败`);
  
  return failed === 0;
}

async function test_CreateBatch(): Promise<TestResult> {
  try {
    const batchNumber = `TEST-BATCH-${Date.now()}`;
    const batch = await BatchService.createBatch(
      batchNumber,
      '测试培训',
      '2024-05-20',
      '测试用户',
      '测试备注'
    );

    if (!batch || batch.batchNumber !== batchNumber) {
      return { name: '创建批次', passed: false, error: '批次创建失败或数据不正确' };
    }
    if (batch.status !== BatchStatus.DRAFT) {
      return { name: '创建批次', passed: false, error: '初始状态应为草稿' };
    }

    return { name: '创建批次', passed: true };
  } catch (err: any) {
    return { name: '创建批次', passed: false, error: err.message };
  }
}

async function test_BatchStatusTransitions(): Promise<TestResult> {
  try {
    const batchNumber = `TEST-TRANS-${Date.now()}`;
    const batch = await BatchService.createBatch(
      batchNumber,
      '状态流转测试',
      '2024-05-20',
      '测试用户'
    );

    let updated = await BatchService.updateBatchStatus(
      batch.id,
      BatchStatus.SUBMITTED,
      '操作人A',
      '提交审核'
    );
    if (updated.status !== BatchStatus.SUBMITTED) {
      return { name: '状态流转', passed: false, error: '无法提交' };
    }

    updated = await BatchService.updateBatchStatus(
      batch.id,
      BatchStatus.REJECTED,
      '审核员A',
      '材料不完整'
    );
    if (updated.status !== BatchStatus.REJECTED) {
      return { name: '状态流转', passed: false, error: '无法驳回' };
    }

    updated = await BatchService.updateBatchStatus(
      batch.id,
      BatchStatus.SUBMITTED,
      '操作人A',
      '补充材料后重新提交'
    );
    if (updated.status !== BatchStatus.SUBMITTED) {
      return { name: '状态流转', passed: false, error: '驳回后无法重新提交' };
    }

    updated = await BatchService.updateBatchStatus(
      batch.id,
      BatchStatus.SECONDARY_CONFIRMED,
      '主管A',
      '复核通过'
    );
    if (updated.status !== BatchStatus.SECONDARY_CONFIRMED) {
      return { name: '状态流转', passed: false, error: '无法二次确认' };
    }

    updated = await BatchService.updateBatchStatus(
      batch.id,
      BatchStatus.AUDIT_ONLY,
      '审计员A',
      '进入审计状态'
    );
    if (updated.status !== BatchStatus.AUDIT_ONLY) {
      return { name: '状态流转', passed: false, error: '无法进入只读审计状态' };
    }

    const transitions = await AuditService.getBatchStatusTransitions(batch.id);
    if (transitions.length < 5) {
      return { name: '状态流转', passed: false, error: '状态流转记录不完整' };
    }

    return { name: '状态流转', passed: true };
  } catch (err: any) {
    return { name: '状态流转', passed: false, error: err.message };
  }
}

async function test_DuplicateBatchStrategy(): Promise<TestResult> {
  try {
    const batchNumber = `TEST-DUP-${Date.now()}`;
    const batch = await BatchService.createBatch(
      batchNumber,
      '重复批次测试',
      '2024-05-20',
      '测试用户'
    );

    const testMaterial = {
      type: MaterialType.REGISTRATION_FORM,
      fileName: '测试报名表.xlsx',
      fileContent: Buffer.from('测试材料内容').toString('base64')
    };

    const initialMaterial = {
      type: MaterialType.SIGN_QR_CODE,
      fileName: '初始二维码.png',
      fileContent: Buffer.from('初始二维码内容').toString('base64')
    };

    await MaterialService.uploadMaterial(
      batch.id,
      initialMaterial.type,
      Buffer.from(initialMaterial.fileContent, 'base64'),
      initialMaterial.fileName,
      '测试用户',
      false
    );

    const ignoreResult = await BatchService.processDuplicateBatch({
      batchNumber,
      strategy: BatchStrategy.IGNORE,
      operatedBy: '操作人',
      materials: [testMaterial]
    });
    if (ignoreResult.action !== 'ignored') {
      return { name: '重复批次策略', passed: false, error: '忽略策略失败' };
    }
    if ((ignoreResult.ignoredCount || 0) !== 1) {
      return { name: '重复批次策略', passed: false, error: '忽略策略应记录丢弃的材料数量' };
    }

    const overwriteResult = await BatchService.processDuplicateBatch({
      batchNumber,
      strategy: BatchStrategy.OVERWRITE,
      operatedBy: '操作人',
      trainingName: '更新后的培训名称',
      materials: [testMaterial]
    });
    if (overwriteResult.action !== 'overwritten') {
      return { name: '重复批次策略', passed: false, error: '覆盖策略失败' };
    }
    if (overwriteResult.overwrittenMaterials.length === 0) {
      return { name: '重复批次策略', passed: false, error: '覆盖策略应记录被覆盖的材料' };
    }
    if (overwriteResult.addedMaterials.length === 0) {
      return { name: '重复批次策略', passed: false, error: '覆盖策略应添加新材料' };
    }

    const appendResult = await BatchService.processDuplicateBatch({
      batchNumber,
      strategy: BatchStrategy.APPEND,
      operatedBy: '操作人',
      materials: [{ ...testMaterial, type: MaterialType.POST_CLASS_ASSIGNMENT, fileName: '课后作业.pdf' }]
    });
    if (appendResult.action !== 'appended') {
      return { name: '重复批次策略', passed: false, error: '追加策略失败' };
    }
    if (appendResult.addedMaterials.length === 0) {
      return { name: '重复批次策略', passed: false, error: '追加策略应添加新材料' };
    }

    return { name: '重复批次策略', passed: true };
  } catch (err: any) {
    return { name: '重复批次策略', passed: false, error: err.message };
  }
}

async function test_UploadAndProcessMaterial(): Promise<TestResult> {
  try {
    const batch = await BatchService.createBatch(
      `TEST-MAT-${Date.now()}`,
      '材料处理测试',
      '2024-05-20',
      '测试用户'
    );

    const fileContent = Buffer.from('测试文件内容');
    const material = await MaterialService.uploadMaterial(
      batch.id,
      MaterialType.REGISTRATION_FORM,
      fileContent,
      '测试报名表.xlsx',
      '上传人',
      false
    );

    if (!material || material.batchId !== batch.id) {
      return { name: '材料上传处理', passed: false, error: '材料上传失败' };
    }

    const updated = await MaterialService.setMaterialProcessResult(
      material.id,
      ProcessResult.PENDING_REVIEW,
      '需要人工复核',
      '审核员'
    );
    if (updated.processResult !== ProcessResult.PENDING_REVIEW) {
      return { name: '材料上传处理', passed: false, error: '设置处理结果失败' };
    }

    const materials = await MaterialService.getMaterialsByBatchId(batch.id);
    if (materials.length !== 1) {
      return { name: '材料上传处理', passed: false, error: '材料列表查询失败' };
    }

    return { name: '材料上传处理', passed: true };
  } catch (err: any) {
    return { name: '材料上传处理', passed: false, error: err.message };
  }
}

async function test_ChangeHistoryTracking(): Promise<TestResult> {
  try {
    const batch = await BatchService.createBatch(
      `TEST-HIST-${Date.now()}`,
      '变更历史测试',
      '2024-05-20',
      '测试用户'
    );

    await BatchService.updateBatchStatus(
      batch.id,
      BatchStatus.SUBMITTED,
      '操作人',
      '提交审核'
    );

    await BatchService.setProcessResult(
      batch.id,
      ProcessResult.NORMAL,
      '审核通过',
      '审核员'
    );

    const history = await AuditService.getBatchChangeHistory(batch.id);
    if (history.length < 2) {
      return { name: '变更历史追踪', passed: false, error: '变更历史记录不完整' };
    }

    const statusChanges = history.filter(h => h.fieldName === 'status');
    if (statusChanges.length === 0) {
      return { name: '变更历史追踪', passed: false, error: '状态变更未记录' };
    }

    return { name: '变更历史追踪', passed: true };
  } catch (err: any) {
    return { name: '变更历史追踪', passed: false, error: err.message };
  }
}

async function test_HrbpRoleView(): Promise<TestResult> {
  try {
    const hrbpView = await HrbpService.getRoleView('hrbp');
    if (!hrbpView || !hrbpView.overview || !hrbpView.batches) {
      return { name: 'HRBP角色视图', passed: false, error: '视图数据结构不正确' };
    }

    const operatorView = await HrbpService.getRoleView('operator');
    if (!operatorView) {
      return { name: 'HRBP角色视图', passed: false, error: '普通角色视图失败' };
    }

    return { name: 'HRBP角色视图', passed: true };
  } catch (err: any) {
    return { name: 'HRBP角色视图', passed: false, error: err.message };
  }
}

async function test_ExportReport(): Promise<TestResult> {
  try {
    const batches = await BatchService.listBatches();
    if (batches.data.length === 0) {
      return { name: '导出报表', passed: false, error: '没有可用批次进行测试' };
    }

    const fileName = await HrbpService.exportBatchReport(batches.data[0].id, false);
    if (!fileName || !fileName.endsWith('.csv')) {
      return { name: '导出报表', passed: false, error: '导出文件名不正确' };
    }

    return { name: '导出报表', passed: true };
  } catch (err: any) {
    return { name: '导出报表', passed: false, error: err.message };
  }
}

async function test_FailedItemsReport(): Promise<TestResult> {
  try {
    const report = await HrbpService.getFailedItemsReport();
    if (!report.pendingReview || !report.unprocessable || !report.failedTasks) {
      return { name: '失败项报表', passed: false, error: '数据结构不正确' };
    }
    return { name: '失败项报表', passed: true };
  } catch (err: any) {
    return { name: '失败项报表', passed: false, error: err.message };
  }
}

async function test_TaskRecovery(): Promise<TestResult> {
  try {
    const { run: dbRun } = require('../database');

    await dbRun(`DELETE FROM async_tasks WHERE task_type = ?`, ['test_recovery']);

    const task = await TaskService.createTask(
      'test_recovery',
      { testData: 'recovery test' },
      undefined,
      3
    );

    await dbRun(
      `UPDATE async_tasks SET status = ? WHERE id = ?`,
      [TaskStatus.PROCESSING, task.id]
    );

    const beforeRecovery = await TaskService.getTaskById(task.id);
    if (!beforeRecovery || beforeRecovery.status !== TaskStatus.PROCESSING) {
      return { name: '任务恢复', passed: false, error: '设置 processing 状态失败' };
    }

    const recovered = await TaskService.recoverProcessingTasks();
    if (recovered !== 1) {
      return { name: '任务恢复', passed: false, error: `应恢复 1 个任务，实际恢复 ${recovered} 个` };
    }

    const afterRecovery = await TaskService.getTaskById(task.id);
    if (!afterRecovery) {
      return { name: '任务恢复', passed: false, error: '任务不存在' };
    }

    if (afterRecovery.status !== TaskStatus.PENDING_RETRY && afterRecovery.status !== TaskStatus.PENDING_MANUAL) {
      return { name: '任务恢复', passed: false, error: `恢复后状态应为 PENDING_RETRY 或 PENDING_MANUAL，实际为 ${afterRecovery.status}` };
    }

    if (!afterRecovery.lastError || !afterRecovery.lastError.includes('服务中断后恢复')) {
      return { name: '任务恢复', passed: false, error: '应记录恢复原因' };
    }

    return { name: '任务恢复', passed: true };
  } catch (err: any) {
    return { name: '任务恢复', passed: false, error: err.message };
  }
}

runTests().then(allPassed => {
  console.log(allPassed ? '\n所有测试通过!' : '\n部分测试失败!');
  process.exit(allPassed ? 0 : 1);
}).catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
