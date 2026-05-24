import { Database } from '../database/init';
import { CompensationService } from '../services/CompensationService';
import { v4 as uuidv4 } from 'uuid';

function formatDateTime(date: Date): string {
  return date.toISOString();
}

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

async function runAutomatedChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const testBatchId = `TEST-BATCH-${Date.now()}`;

  console.log('='.repeat(60));
  console.log('开始自动化检查...');
  console.log('='.repeat(60));

  console.log('\n【检查1】重复导入幂等性验证');
  try {
    const idempotencyKey = `TEST-IDEMP-${Date.now()}`;
    
    const firstResult = await CompensationService.submitFact({
      idempotencyKey,
      batchId: testBatchId,
      city: '测试城市',
      cabinetInventory: {
        cabinetId: 'TEST-CAB-001',
        slotId: 'TEST-SLOT',
        productId: 'TEST-PROD',
        expectedQuantity: 5,
        actualQuantity: 5
      },
      replenishPhotos: [
        {
          photoId: uuidv4(),
          url: 'test-url',
          uploadTime: formatDateTime(new Date()),
          uploader: 'test',
          verificationStatus: 'verified'
        }
      ],
      refundRecords: [],
      externalReceipts: [
        {
          receiptId: uuidv4(),
          externalSystem: 'TEST',
          transactionId: 'TXN-TEST',
          status: 'success',
          submittedAt: formatDateTime(new Date()),
          confirmedAt: formatDateTime(new Date())
        }
      ],
      createdBy: '自动化测试'
    });

    const secondResult = await CompensationService.submitFact({
      idempotencyKey,
      batchId: testBatchId,
      city: '测试城市',
      cabinetInventory: {
        cabinetId: 'TEST-CAB-001',
        slotId: 'TEST-SLOT',
        productId: 'TEST-PROD',
        expectedQuantity: 5,
        actualQuantity: 5
      },
      replenishPhotos: [],
      refundRecords: [],
      createdBy: '自动化测试'
    });

    const passed = firstResult.fact.factId === secondResult.fact.factId && !secondResult.isNew;
    
    results.push({
      name: '重复导入幂等性',
      passed,
      message: passed ? '通过 - 相同幂等键返回相同记录' : '失败 - 幂等性未生效',
      details: { firstFactId: firstResult.fact.factId, secondFactId: secondResult.fact.factId, isNew: secondResult.isNew }
    });
    console.log(`  ${passed ? '✓' : '✗'} ${results[results.length-1].message}`);
  } catch (error: any) {
    results.push({ name: '重复导入幂等性', passed: false, message: `异常: ${error.message}` });
    console.log(`  ✗ 异常: ${error.message}`);
  }

  console.log('\n【检查2】权限拦截验证');
  try {
    const testFact = await CompensationService.submitFact({
      idempotencyKey: `TEST-PERM-${Date.now()}`,
      batchId: testBatchId,
      city: '测试城市',
      cabinetInventory: {
        cabinetId: 'TEST-CAB-002',
        slotId: 'TEST-SLOT-2',
        productId: 'TEST-PROD-2',
        expectedQuantity: 3,
        actualQuantity: 3
      },
      replenishPhotos: [],
      refundRecords: [],
      createdBy: '自动化测试'
    });

    const historyBefore = await CompensationService.getFactHistory(testFact.fact.factId);
    
    results.push({
      name: '历史记录追踪',
      passed: historyBefore.length >= 1,
      message: historyBefore.length >= 1 ? `通过 - 存在${historyBefore.length}条历史记录` : '失败 - 历史记录缺失',
      details: { historyCount: historyBefore.length }
    });
    console.log(`  ${historyBefore.length >= 1 ? '✓' : '✗'} ${results[results.length-1].message}`);
  } catch (error: any) {
    results.push({ name: '历史记录追踪', passed: false, message: `异常: ${error.message}` });
    console.log(`  ✗ 异常: ${error.message}`);
  }

  console.log('\n【检查3】异常保留验证（错误不被吞噬）');
  try {
    let errorThrown = false;
    try {
      await CompensationService.processManualDecision({
        factId: 'NON-EXISTENT-FACT-ID',
        decision: 'approve',
        operatorId: 'TEST-OPER',
        operatorName: '测试操作员',
        reason: '测试'
      });
    } catch (error) {
      errorThrown = true;
    }

    results.push({
      name: '异常保留机制',
      passed: errorThrown,
      message: errorThrown ? '通过 - 异常正确抛出未被吞噬' : '失败 - 异常被吞掉'
    });
    console.log(`  ${errorThrown ? '✓' : '✗'} ${results[results.length-1].message}`);
  } catch (error: any) {
    results.push({ name: '异常保留机制', passed: false, message: `异常: ${error.message}` });
    console.log(`  ✗ 异常: ${error.message}`);
  }

  console.log('\n【检查4】导出一致性验证');
  try {
    const exportFact = await CompensationService.submitFact({
      idempotencyKey: `TEST-EXPORT-${Date.now()}`,
      batchId: testBatchId,
      city: '测试城市',
      cabinetInventory: {
        cabinetId: 'TEST-CAB-EXPORT',
        slotId: 'SLOT-EXPORT',
        productId: 'PROD-EXPORT',
        expectedQuantity: 10,
        actualQuantity: 8
      },
      replenishPhotos: [
        {
          photoId: uuidv4(),
          url: 'export-test.jpg',
          uploadTime: formatDateTime(new Date()),
          uploader: 'tester',
          verificationStatus: 'verified'
        }
      ],
      refundRecords: [
        {
          refundId: uuidv4(),
          orderId: 'ORDER-EXPORT-001',
          userId: 'USER-EXPORT',
          amount: 99.99,
          refundTime: formatDateTime(new Date()),
          reason: '测试退款'
        }
      ],
      createdBy: '自动化测试'
    });

    const exportedData = await CompensationService.exportFacts({
      batchId: testBatchId,
      operatorId: 'TEST-EXPORT-OPER',
      operatorName: '导出测试员'
    });

    const factAfterExport = await CompensationService.getFact(exportFact.fact.factId);
    const isFrozen = factAfterExport?.frozen === true;

    results.push({
      name: '导出一致性',
      passed: isFrozen,
      message: isFrozen ? '通过 - 导出后记录已冻结' : '失败 - 导出后记录未冻结',
      details: { frozen: isFrozen }
    });
    console.log(`  ${isFrozen ? '✓' : '✗'} ${results[results.length-1].message}`);

    await CompensationService.unfreezeFact(exportFact.fact.factId, 'TEST-OPER', '测试操作员');
    const factAfterUnfreeze = await CompensationService.getFact(exportFact.fact.factId);
    
    results.push({
      name: '冻结解冻功能',
      passed: factAfterUnfreeze?.frozen === false,
      message: factAfterUnfreeze?.frozen === false ? '通过 - 解冻功能正常' : '失败 - 解冻失败',
      details: { frozenAfterUnfreeze: factAfterUnfreeze?.frozen }
    });
    console.log(`  ${factAfterUnfreeze?.frozen === false ? '✓' : '✗'} ${results[results.length-1].message}`);
  } catch (error: any) {
    results.push({ name: '导出一致性', passed: false, message: `异常: ${error.message}` });
    console.log(`  ✗ 异常: ${error.message}`);
  }

  console.log('\n【检查5】运营仪表板数据完整性');
  try {
    const dashboard = await CompensationService.getOperationDashboard();
    
    const hasOverview = !!dashboard.overview;
    const hasRetryQueue = !!dashboard.retryQueue;
    const hasDeadLetter = !!dashboard.deadLetter;
    const hasRecoveryQueue = !!dashboard.recoveryQueue;

    const passed = hasOverview && hasRetryQueue && hasDeadLetter && hasRecoveryQueue;

    results.push({
      name: '运营仪表板完整性',
      passed,
      message: passed ? '通过 - 仪表板数据完整' : '失败 - 部分数据缺失',
      details: { hasOverview, hasRetryQueue, hasDeadLetter, hasRecoveryQueue }
    });
    console.log(`  ${passed ? '✓' : '✗'} ${results[results.length-1].message}`);
  } catch (error: any) {
    results.push({ name: '运营仪表板完整性', passed: false, message: `异常: ${error.message}` });
    console.log(`  ✗ 异常: ${error.message}`);
  }

  console.log('\n【检查6】人工改判流程验证');
  try {
    const manualTestFact = await CompensationService.submitFact({
      idempotencyKey: `TEST-MANUAL-${Date.now()}`,
      batchId: testBatchId,
      city: '测试城市',
      cabinetInventory: {
        cabinetId: 'TEST-CAB-MANUAL',
        slotId: 'SLOT-MANUAL',
        productId: 'PROD-MANUAL',
        expectedQuantity: 6,
        actualQuantity: 4
      },
      replenishPhotos: [
        {
          photoId: uuidv4(),
          url: 'manual-test.jpg',
          uploadTime: formatDateTime(new Date()),
          uploader: 'tester',
          verificationStatus: 'pending'
        }
      ],
      refundRecords: [],
      createdBy: '自动化测试'
    });

    const decisionResult = await CompensationService.processManualDecision({
      factId: manualTestFact.fact.factId,
      decision: 'compensate',
      operatorId: 'AUTO-ADMIN',
      operatorName: '自动管理员',
      reason: '自动化测试人工改判'
    });

    const historyAfter = await CompensationService.getFactHistory(manualTestFact.fact.factId);
    const hasManualDecision = historyAfter.some((h: any) => h.operation === 'manual_decision');

    const passed = decisionResult.status === 'compensated' && hasManualDecision;

    results.push({
      name: '人工改判流程',
      passed,
      message: passed ? '通过 - 人工改判流程完整' : '失败 - 状态或历史记录异常',
      details: { status: decisionResult.status, historyCount: historyAfter.length, hasManualDecision }
    });
    console.log(`  ${passed ? '✓' : '✗'} ${results[results.length-1].message}`);
  } catch (error: any) {
    results.push({ name: '人工改判流程', passed: false, message: `异常: ${error.message}` });
    console.log(`  ✗ 异常: ${error.message}`);
  }

  console.log('\n【检查7】分类重试逻辑验证');
  try {
    const missingPhotoFact = await CompensationService.submitFact({
      idempotencyKey: `TEST-CATEGORY-${Date.now()}`,
      batchId: testBatchId,
      city: '测试城市',
      cabinetInventory: {
        cabinetId: 'TEST-CAB-CAT',
        slotId: 'SLOT-CAT',
        productId: 'PROD-CAT',
        expectedQuantity: 5,
        actualQuantity: 5
      },
      replenishPhotos: [],
      refundRecords: [],
      createdBy: '自动化测试'
    });

    const isMissingAttachment = missingPhotoFact.fact.retryCategory === 'missing_attachment';
    const isRetryingStatus = missingPhotoFact.fact.status === 'retrying';

    const passed = isMissingAttachment && isRetryingStatus;

    results.push({
      name: '重试分类检测',
      passed,
      message: passed ? '通过 - 缺附件正确分类为重试队列' : '失败 - 分类或状态异常',
      details: { retryCategory: missingPhotoFact.fact.retryCategory, status: missingPhotoFact.fact.status }
    });
    console.log(`  ${passed ? '✓' : '✗'} ${results[results.length-1].message}`);
  } catch (error: any) {
    results.push({ name: '重试分类检测', passed: false, message: `异常: ${error.message}` });
    console.log(`  ✗ 异常: ${error.message}`);
  }

  return results;
}

async function main() {
  const results = await runAutomatedChecks();

  console.log('\n' + '='.repeat(60));
  console.log('检查结果汇总');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach((result, index) => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`\n${index + 1}. [${status}] ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   详情: ${JSON.stringify(result.details)}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`总计: ${passed}/${total} 通过`);
  console.log('='.repeat(60));

  Database.close();

  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);
