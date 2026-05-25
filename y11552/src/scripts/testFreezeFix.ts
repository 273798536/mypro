import { Database } from '../database/init';
import { CompensationService } from '../services/CompensationService';
import { v4 as uuidv4 } from 'uuid';

function formatDateTime(date: Date): string {
  return date.toISOString();
}

async function testFreezeFix() {
  console.log('='.repeat(60));
  console.log('验证冻结链路修复效果');
  console.log('='.repeat(60));

  const testBatchId = `TEST-FREEZE-FIX-${Date.now()}`;

  console.log('\n【测试1】验证 POST /facts/:id/freeze 正确冻结记录');
  
  const testFact = await CompensationService.submitFact({
    idempotencyKey: `TEST-FREEZE-${Date.now()}`,
    batchId: testBatchId,
    city: '测试城市',
    cabinetInventory: {
      cabinetId: 'TEST-CAB-FREEZE',
      slotId: 'SLOT-FREEZE',
      productId: 'PROD-FREEZE',
      expectedQuantity: 5,
      actualQuantity: 5
    },
    replenishPhotos: [
      {
        photoId: uuidv4(),
        url: 'test.jpg',
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

  console.log(`创建记录: factId=${testFact.fact.factId.substring(0, 8)}..., frozen=${testFact.fact.frozen}`);
  console.log(`  初始状态: frozen=${testFact.fact.frozen} ✓ 预期为 false`);

  await CompensationService.freezeFact(
    testFact.fact.factId,
    'TEST-OPER',
    '测试操作员'
  );

  const afterFreeze = await CompensationService.getFact(testFact.fact.factId);
  console.log(`  调用 freezeFact 后: frozen=${afterFreeze?.frozen}`);
  
  const freezePassed = afterFreeze?.frozen === true;
  console.log(`  结果: ${freezePassed ? '✓ 通过' : '✗ 失败 - 记录未正确冻结'}`);

  console.log('\n【测试2】验证导出数据中 frozen 字段为 true');
  
  const exportedData = await CompensationService.exportFacts({
    batchId: testBatchId,
    operatorId: 'EXPORT-TEST',
    operatorName: '导出测试员'
  });

  console.log(`  导出记录数: ${exportedData.length}`);
  if (exportedData.length > 0) {
    console.log(`  导出数据中 frozen 字段: ${exportedData[0].frozen}`);
    const exportPassed = exportedData[0].frozen === true;
    console.log(`  结果: ${exportPassed ? '✓ 通过 - 导出数据反映冻结状态' : '✗ 失败 - 导出数据 frozen=false'}`);
  }

  console.log('\n【测试3】验证解冻功能');
  await CompensationService.unfreezeFact(
    testFact.fact.factId,
    'TEST-OPER',
    '测试操作员'
  );
  
  const afterUnfreeze = await CompensationService.getFact(testFact.fact.factId);
  console.log(`  调用 unfreezeFact 后: frozen=${afterUnfreeze?.frozen}`);
  const unfreezePassed = afterUnfreeze?.frozen === false;
  console.log(`  结果: ${unfreezePassed ? '✓ 通过' : '✗ 失败 - 记录未正确解冻'}`);

  console.log('\n【测试4】验证历史记录完整');
  const history = await CompensationService.getFactHistory(testFact.fact.factId);
  console.log(`  历史记录数: ${history.length}`);
  const freezeHistory = history.filter((h: any) => h.operation === 'freeze');
  const unfreezeHistory = history.filter((h: any) => h.operation === 'unfreeze');
  console.log(`  冻结操作记录: ${freezeHistory.length} 条`);
  console.log(`  解冻操作记录: ${unfreezeHistory.length} 条`);
  
  const historyPassed = freezeHistory.length > 0 && unfreezeHistory.length > 0;
  console.log(`  结果: ${historyPassed ? '✓ 通过' : '✗ 失败 - 历史记录不完整'}`);

  console.log('\n' + '='.repeat(60));
  const allPassed = freezePassed && unfreezePassed && historyPassed && exportedData[0]?.frozen === true;
  console.log(`总体结果: ${allPassed ? '✓ 全部通过' : '✗ 存在失败'}`);
  console.log('='.repeat(60));

  Database.close();
  process.exit(allPassed ? 0 : 1);
}

testFreezeFix().catch(console.error);
