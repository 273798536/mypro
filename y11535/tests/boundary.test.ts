import 'reflect-metadata';
import { AppDataSource } from '../src/database/data-source';
import { exceptionRecordService } from '../src/services/ExceptionRecordService';
import { batchService } from '../src/services/BatchService';
import { auditLogService } from '../src/services/AuditLogService';
import { ExceptionStatus, ExceptionType, SourceType, Role, ReviewResult } from '../src/types';

async function testDuplicateSubmission() {
  console.log('\n=== 测试1: 重复提交 ===');
  
  const batch = await batchService.createBatch({
    name: '测试批次-重复提交',
    trainingId: 'TRAIN-001',
    trainingName: '2024年度安全培训',
    createdBy: 'user-training-001',
    creatorName: '培训管理员李四',
    creatorRole: Role.TRAINING_ADMIN
  });

  try {
    await exceptionRecordService.createRecord({
      batchId: batch.id,
      employeeId: 'EMP-TEST-001',
      employeeName: '测试员工1',
      department: '技术研发部',
      trainingId: 'TRAIN-001',
      trainingName: '2024年度安全培训',
      trainingDate: new Date(),
      exceptionType: ExceptionType.MISSING_SIGN,
      importSource: {
        sourceFileName: 'test.csv',
        sourceFileHash: 'hash123',
        originalRowNumber: 1,
        originalValue: 'test',
        parsedValue: {},
        sourceType: SourceType.REGISTRATION_FORM
      },
      originalEvidence: { test: true },
      createdBy: 'user-training-001',
      creatorName: '培训管理员李四',
      creatorRole: Role.TRAINING_ADMIN
    });
    console.log('✓ 第一条记录创建成功');

    await exceptionRecordService.createRecord({
      batchId: batch.id,
      employeeId: 'EMP-TEST-001',
      employeeName: '测试员工1',
      department: '技术研发部',
      trainingId: 'TRAIN-001',
      trainingName: '2024年度安全培训',
      trainingDate: new Date(),
      exceptionType: ExceptionType.MISSING_SIGN,
      importSource: {
        sourceFileName: 'test.csv',
        sourceFileHash: 'hash123',
        originalRowNumber: 2,
        originalValue: 'test',
        parsedValue: {},
        sourceType: SourceType.REGISTRATION_FORM
      },
      originalEvidence: { test: true },
      createdBy: 'user-training-001',
      creatorName: '培训管理员李四',
      creatorRole: Role.TRAINING_ADMIN
    });
    console.log('✗ 第二条记录创建成功（不应该）');
  } catch (error: any) {
    if (error.message.includes('DUPLICATE_RECORD')) {
      console.log('✓ 重复提交被正确拦截:', error.message);
    } else {
      console.log('✗ 错误类型不正确:', error.message);
    }
  }
}

async function testWithdrawAndReactivate() {
  console.log('\n=== 测试2: 撤回后再提交 ===');
  
  const batch = await batchService.createBatch({
    name: '测试批次-撤回重提',
    trainingId: 'TRAIN-002',
    trainingName: '2024年度合规培训',
    createdBy: 'user-training-001',
    creatorName: '培训管理员李四',
    creatorRole: Role.TRAINING_ADMIN
  });

  const record = await exceptionRecordService.createRecord({
    batchId: batch.id,
    employeeId: 'EMP-TEST-002',
    employeeName: '测试员工2',
    department: '市场部',
    trainingId: 'TRAIN-002',
    trainingName: '2024年度合规培训',
    trainingDate: new Date(),
    exceptionType: ExceptionType.LATE_SIGN,
    importSource: {
      sourceFileName: 'test2.csv',
      sourceFileHash: 'hash456',
      originalRowNumber: 1,
      originalValue: 'test2',
      parsedValue: {},
      sourceType: SourceType.SIGN_QRCODE
    },
    originalEvidence: { test: true },
    createdBy: 'user-training-001',
    creatorName: '培训管理员李四',
    creatorRole: Role.TRAINING_ADMIN
  });

  console.log('✓ 记录创建成功，当前状态:', record.status);

  const withdrawn = await exceptionRecordService.withdrawRecord({
    recordId: record.id,
    operatorId: 'user-training-001',
    operatorName: '培训管理员李四',
    operatorRole: Role.TRAINING_ADMIN,
    reason: '数据有误，撤回修正'
  });
  console.log('✓ 撤回成功，当前状态:', withdrawn.status);

  const reactivated = await exceptionRecordService.reactivateRecord({
    recordId: record.id,
    operatorId: 'user-training-001',
    operatorName: '培训管理员李四',
    operatorRole: Role.TRAINING_ADMIN,
    reason: '数据已修正，重新提交'
  });
  console.log('✓ 重新提交成功，当前状态:', reactivated.status);

  const transitions = await exceptionRecordService.getStateTransitions(record.id);
  console.log('✓ 状态流转记录数:', transitions.length);
}

async function testPartialFailure() {
  console.log('\n=== 测试3: 部分失败 ===');
  
  const batch = await batchService.createBatch({
    name: '测试批次-部分失败',
    trainingId: 'TRAIN-003',
    trainingName: '2024年度技能培训',
    createdBy: 'user-training-001',
    creatorName: '培训管理员李四',
    creatorRole: Role.TRAINING_ADMIN
  });

  const records = [
    { employeeId: 'EMP-TEST-003', employeeName: '成功1', shouldSuccess: true },
    { employeeId: 'EMP-TEST-004', employeeName: '成功2', shouldSuccess: true },
    { employeeId: 'EMP-TEST-003', employeeName: '重复失败', shouldSuccess: false }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const rec of records) {
    try {
      await exceptionRecordService.createRecord({
        batchId: batch.id,
        employeeId: rec.employeeId,
        employeeName: rec.employeeName,
        department: '财务部',
        trainingId: 'TRAIN-003',
        trainingName: '2024年度技能培训',
        trainingDate: new Date(),
        exceptionType: ExceptionType.MISSING_SIGN,
        importSource: {
          sourceFileName: 'test3.csv',
          sourceFileHash: 'hash789',
          originalRowNumber: 1,
          originalValue: JSON.stringify(rec),
          parsedValue: rec,
          sourceType: SourceType.HOMEWORK
        },
        originalEvidence: rec,
        createdBy: 'user-training-001',
        creatorName: '培训管理员李四',
        creatorRole: Role.TRAINING_ADMIN
      });
      successCount++;
    } catch (error) {
      failCount++;
    }
  }

  console.log(`✓ 成功: ${successCount}, 失败: ${failCount}`);
  console.log('✓ 部分失败场景验证完成');
}

async function testManualOverride() {
  console.log('\n=== 测试4: 人工改判 ===');
  
  const batch = await batchService.createBatch({
    name: '测试批次-人工改判',
    trainingId: 'TRAIN-004',
    trainingName: '2024年度管理培训',
    createdBy: 'user-training-001',
    creatorName: '培训管理员李四',
    creatorRole: Role.TRAINING_ADMIN
  });

  const record = await exceptionRecordService.createRecord({
    batchId: batch.id,
    employeeId: 'EMP-TEST-005',
    employeeName: '测试员工5',
    department: '人力资源部',
    trainingId: 'TRAIN-004',
    trainingName: '2024年度管理培训',
    trainingDate: new Date(),
    exceptionType: ExceptionType.MISSING_SIGN,
    importSource: {
      sourceFileName: 'test4.csv',
      sourceFileHash: 'hashabc',
      originalRowNumber: 1,
      originalValue: 'test',
      parsedValue: {},
      sourceType: SourceType.REGISTRATION_FORM
    },
    originalEvidence: { test: true },
    createdBy: 'user-training-001',
    creatorName: '培训管理员李四',
    creatorRole: Role.TRAINING_ADMIN
  });

  console.log('✓ 记录创建成功，初始状态:', record.status);

  const reviewed = await exceptionRecordService.reviewRecord({
    recordId: record.id,
    reviewerId: 'user-admin-001',
    reviewerName: '系统管理员',
    reviewerRole: Role.ADMIN,
    result: ReviewResult.CONFIRMED_ABNORMAL,
    reason: '经核实，确未签到'
  });
  console.log('✓ 复核完成，当前状态:', reviewed.status);

  const revised = await exceptionRecordService.reviewRecord({
    recordId: record.id,
    reviewerId: 'user-admin-001',
    reviewerName: '系统管理员',
    reviewerRole: Role.ADMIN,
    result: ReviewResult.CORRECTED_NORMAL,
    reason: '新证据显示已签到，人工改判',
    manualOverride: true,
    targetStatus: ExceptionStatus.REJECTED
  });
  console.log('✓ 人工改判完成，当前状态:', revised.status);
  console.log('✓ 人工改判次数:', revised.reviewHistory.filter(r => r.manualOverride).length);
}

async function testFreezeBeforeExport() {
  console.log('\n=== 测试5: 导出前冻结 ===');
  
  const batch = await batchService.createBatch({
    name: '测试批次-冻结导出',
    trainingId: 'TRAIN-005',
    trainingName: '2024年度销售培训',
    createdBy: 'user-training-001',
    creatorName: '培训管理员李四',
    creatorRole: Role.TRAINING_ADMIN
  });

  const record = await exceptionRecordService.createRecord({
    batchId: batch.id,
    employeeId: 'EMP-TEST-006',
    employeeName: '测试员工6',
    department: '销售部',
    trainingId: 'TRAIN-005',
    trainingName: '2024年度销售培训',
    trainingDate: new Date(),
    exceptionType: ExceptionType.MISSING_SIGN,
    importSource: {
      sourceFileName: 'test5.csv',
      sourceFileHash: 'hashdef',
      originalRowNumber: 1,
      originalValue: 'test',
      parsedValue: {},
      sourceType: SourceType.ABNORMAL_PHOTO
    },
    originalEvidence: { test: true },
    createdBy: 'user-training-001',
    creatorName: '培训管理员李四',
    creatorRole: Role.TRAINING_ADMIN
  });

  console.log('✓ 记录创建成功');

  const frozen = await exceptionRecordService.freezeRecord({
    recordId: record.id,
    operatorId: 'user-hrbp-001',
    operatorName: 'HRBP张三',
    operatorRole: Role.HRBP,
    reason: '数据核对完成，冻结待导出'
  });
  console.log('✓ 冻结成功，isFrozen:', frozen.isFrozen);

  try {
    await exceptionRecordService.reviewRecord({
      recordId: record.id,
      reviewerId: 'user-hrbp-001',
      reviewerName: 'HRBP张三',
      reviewerRole: Role.HRBP,
      result: ReviewResult.CONFIRMED_ABNORMAL,
      reason: '尝试复核冻结记录'
    });
    console.log('✗ 冻结状态下复核成功（不应该）');
  } catch (error: any) {
    if (error.message.includes('RECORD_FROZEN')) {
      console.log('✓ 冻结状态下操作被正确拦截:', error.message);
    } else {
      console.log('✗ 错误类型不正确:', error.message);
    }
  }

  const unfrozen = await exceptionRecordService.unfreezeRecord({
    recordId: record.id,
    operatorId: 'user-hrbp-001',
    operatorName: 'HRBP张三',
    operatorRole: Role.HRBP,
    reason: '需要补充信息'
  });
  console.log('✓ 解冻成功，isFrozen:', unfrozen.isFrozen);
}

async function testPermissionDenied() {
  console.log('\n=== 测试6: 权限不足拦截 ===');
  
  const batch = await batchService.createBatch({
    name: '测试批次-权限测试',
    trainingId: 'TRAIN-006',
    trainingName: '2024年度高管培训',
    createdBy: 'user-training-001',
    creatorName: '培训管理员李四',
    creatorRole: Role.TRAINING_ADMIN
  });

  const record = await exceptionRecordService.createRecord({
    batchId: batch.id,
    employeeId: 'EMP-TEST-007',
    employeeName: '测试员工7',
    department: '技术研发部',
    trainingId: 'TRAIN-006',
    trainingName: '2024年度高管培训',
    trainingDate: new Date(),
    exceptionType: ExceptionType.MISSING_SIGN,
    importSource: {
      sourceFileName: 'test6.csv',
      sourceFileHash: 'hashghi',
      originalRowNumber: 1,
      originalValue: 'test',
      parsedValue: {},
      sourceType: SourceType.REGISTRATION_FORM
    },
    originalEvidence: { test: true },
    createdBy: 'user-training-001',
    creatorName: '培训管理员李四',
    creatorRole: Role.TRAINING_ADMIN
  });

  console.log('✓ 记录创建成功');

  try {
    await exceptionRecordService.freezeRecord({
      recordId: record.id,
      operatorId: 'user-employee-001',
      operatorName: '员工赵六',
      operatorRole: Role.EMPLOYEE,
      reason: '员工尝试冻结'
    });
    console.log('✗ 员工冻结成功（不应该）');
  } catch (error: any) {
    if (error.message.includes('PERMISSION_DENIED')) {
      console.log('✓ 员工无权限冻结，正确拦截:', error.message);
    } else {
      console.log('✗ 错误类型不正确:', error.message);
    }
  }

  const auditLogs = await auditLogService.getPermissionDeniedLogs({ page: 1, pageSize: 10 });
  console.log('✓ 审计日志中权限拦截记录数:', auditLogs.total);
}

async function runAllTests() {
  try {
    await AppDataSource.initialize();
    console.log('数据库连接成功');

    await testDuplicateSubmission();
    await testWithdrawAndReactivate();
    await testPartialFailure();
    await testManualOverride();
    await testFreezeBeforeExport();
    await testPermissionDenied();

    console.log('\n=== 所有边界情况测试完成 ===');
    process.exit(0);
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

runAllTests();
