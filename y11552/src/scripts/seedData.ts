import { Database } from '../database/init';
import { CompensationService } from '../services/CompensationService';
import { RetryCategory, FactStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

function formatDateTime(date: Date): string {
  return date.toISOString();
}

async function seedSampleData() {
  console.log('开始创建样例数据...');

  const batchId = `BATCH-${Date.now()}`;

  console.log('\n=== 样例1: 缺附件（缺少补货照片）===');
  const missingAttachmentResult = await CompensationService.submitFact({
    idempotencyKey: `IDEMP-MISSING-${Date.now()}`,
    batchId,
    city: '上海市',
    cabinetInventory: {
      cabinetId: 'CAB-SH-001',
      slotId: 'SLOT-A1',
      productId: 'PROD-001',
      expectedQuantity: 10,
      actualQuantity: 10,
      lastRestockTime: formatDateTime(new Date())
    },
    replenishPhotos: [],
    refundRecords: [
      {
        refundId: uuidv4(),
        orderId: `ORDER-${Date.now()}-001`,
        userId: 'USER-1001',
        amount: 25.5,
        refundTime: formatDateTime(new Date()),
        reason: '补货失败，用户申请退款'
      }
    ],
    createdBy: '系统导入',
    remarks: '热销格口补货异常，需要核对'
  });
  console.log(`创建记录: ${missingAttachmentResult.fact.factId}, 状态: ${missingAttachmentResult.fact.status}, 重试分类: ${missingAttachmentResult.fact.retryCategory}`);
  console.log(`  问题: ${missingAttachmentResult.fact.replenishPhotos.length === 0 ? '缺少补货照片 ✓' : '数据异常'}`);

  console.log('\n=== 样例2: 重复提交测试 ===');
  const duplicateKey = `IDEMP-DUP-${Date.now()}`;
  const firstSubmit = await CompensationService.submitFact({
    idempotencyKey: duplicateKey,
    batchId,
    city: '北京市',
    cabinetInventory: {
      cabinetId: 'CAB-BJ-002',
      slotId: 'SLOT-B2',
      productId: 'PROD-002',
      expectedQuantity: 8,
      actualQuantity: 8
    },
    replenishPhotos: [
      {
        photoId: uuidv4(),
        url: 'https://example.com/photo1.jpg',
        uploadTime: formatDateTime(new Date()),
        uploader: 'OPER-001',
        verificationStatus: 'verified'
      }
    ],
    refundRecords: [],
    externalReceipts: [
      {
        receiptId: uuidv4(),
        externalSystem: 'PAYMENT-GATEWAY',
        transactionId: `TXN-${Date.now()}`,
        status: 'success',
        submittedAt: formatDateTime(new Date()),
        confirmedAt: formatDateTime(new Date())
      }
    ],
    createdBy: '系统导入'
  });
  console.log(`首次提交: isNew=${firstSubmit.isNew}, factId=${firstSubmit.fact.factId}`);

  const secondSubmit = await CompensationService.submitFact({
    idempotencyKey: duplicateKey,
    batchId,
    city: '北京市',
    cabinetInventory: {
      cabinetId: 'CAB-BJ-002',
      slotId: 'SLOT-B2',
      productId: 'PROD-002',
      expectedQuantity: 8,
      actualQuantity: 8
    },
    replenishPhotos: [],
    refundRecords: [],
    createdBy: '系统导入'
  });
  console.log(`二次提交: isNew=${secondSubmit.isNew}, factId=${secondSubmit.fact.factId}`);
  console.log(`  幂等性验证: ${firstSubmit.fact.factId === secondSubmit.fact.factId ? '通过 ✓' : '失败'}`);

  const history = await CompensationService.getFactHistory(secondSubmit.fact.factId);
  console.log(`  历史记录数: ${history.length}`);
  history.forEach((h: any, i: number) => {
    console.log(`    [${i+1}] ${h.time} - ${h.operator} - ${h.summary}`);
  });

  console.log('\n=== 样例3: 人工改判流程 ===');
  const manualResult = await CompensationService.submitFact({
    idempotencyKey: `IDEMP-MANUAL-${Date.now()}`,
    batchId,
    city: '广州市',
    cabinetInventory: {
      cabinetId: 'CAB-GZ-003',
      slotId: 'SLOT-C3',
      productId: 'PROD-003',
      expectedQuantity: 5,
      actualQuantity: 3
    },
    replenishPhotos: [
      {
        photoId: uuidv4(),
        url: 'https://example.com/photo2.jpg',
        uploadTime: formatDateTime(new Date()),
        uploader: 'OPER-002',
        verificationStatus: 'pending'
      }
    ],
    refundRecords: [
      {
        refundId: uuidv4(),
        orderId: `ORDER-${Date.now()}-003`,
        userId: 'USER-2002',
        amount: 18.0,
        refundTime: formatDateTime(new Date()),
        reason: '格口显示满仓但实际为空'
      }
    ],
    createdBy: '系统导入',
    remarks: '数据冲突，需要人工核实'
  });
  console.log(`创建记录: ${manualResult.fact.factId}, 状态: ${manualResult.fact.status}, 重试分类: ${manualResult.fact.retryCategory}`);

  const decisionResult = await CompensationService.processManualDecision({
    factId: manualResult.fact.factId,
    decision: 'compensate',
    operatorId: 'ADMIN-001',
    operatorName: '张管理员',
    reason: '经核实，确认为系统误判，用户已实际支付但未取货，予以补偿',
    newCategory: RetryCategory.DATA_CONFLICT
  });
  console.log(`人工改判后: 状态=${decisionResult.status}, 处理人=${decisionResult.assignedTo}`);

  const manualHistory = await CompensationService.getFactHistory(manualResult.fact.factId);
  console.log(`  历史记录数: ${manualHistory.length}`);
  manualHistory.forEach((h: any, i: number) => {
    console.log(`    [${i+1}] ${h.time} - ${h.operator} - ${h.operation} - ${h.summary}`);
  });

  console.log('\n=== 样例4: 网络问题重试（模拟外部回执失败）===');
  const networkResult = await CompensationService.submitFact({
    idempotencyKey: `IDEMP-NET-${Date.now()}`,
    batchId,
    city: '深圳市',
    cabinetInventory: {
      cabinetId: 'CAB-SZ-004',
      slotId: 'SLOT-D4',
      productId: 'PROD-004',
      expectedQuantity: 12,
      actualQuantity: 12
    },
    replenishPhotos: [
      {
        photoId: uuidv4(),
        url: 'https://example.com/photo3.jpg',
        uploadTime: formatDateTime(new Date()),
        uploader: 'OPER-003',
        verificationStatus: 'verified'
      }
    ],
    refundRecords: [],
    externalReceipts: [
      {
        receiptId: uuidv4(),
        externalSystem: 'INVENTORY-SYNC',
        transactionId: `TXN-${Date.now()}-NET`,
        status: 'failed',
        submittedAt: formatDateTime(new Date())
      }
    ],
    createdBy: '系统导入',
    remarks: '网络波动导致同步失败，等待自动重试'
  });
  console.log(`创建记录: ${networkResult.fact.factId}, 状态: ${networkResult.fact.status}, 重试分类: ${networkResult.fact.retryCategory}`);

  console.log('\n=== 样例5: 撤回后再提交（模拟先撤回，补充信息后重提）===');
  const withdrawKey = `IDEMP-WITHDRAW-${Date.now()}`;
  const withdrawResult = await CompensationService.submitFact({
    idempotencyKey: withdrawKey,
    batchId,
    city: '杭州市',
    cabinetInventory: {
      cabinetId: 'CAB-HZ-005',
      slotId: 'SLOT-E5',
      productId: 'PROD-005',
      expectedQuantity: 6,
      actualQuantity: 6
    },
    replenishPhotos: [],
    refundRecords: [],
    createdBy: '系统导入'
  });
  console.log(`首次提交（缺附件）: factId=${withdrawResult.fact.factId}, 状态=${withdrawResult.fact.status}`);

  await CompensationService.closeFact(withdrawResult.fact.factId, 'OPER-004', '李操作员', '数据不全，撤回重提');
  const afterClose = await CompensationService.getFact(withdrawResult.fact.factId);
  console.log(`撤回后状态: ${afterClose?.status}`);

  const reSubmitKey = `IDEMP-WITHDRAW-RESUBMIT-${Date.now()}`;
  const reSubmitResult = await CompensationService.submitFact({
    idempotencyKey: reSubmitKey,
    batchId,
    city: '杭州市',
    cabinetInventory: {
      cabinetId: 'CAB-HZ-005',
      slotId: 'SLOT-E5',
      productId: 'PROD-005',
      expectedQuantity: 6,
      actualQuantity: 6
    },
    replenishPhotos: [
      {
        photoId: uuidv4(),
        url: 'https://example.com/photo5.jpg',
        uploadTime: formatDateTime(new Date()),
        uploader: 'OPER-004',
        verificationStatus: 'verified'
      }
    ],
    refundRecords: [],
    externalReceipts: [
      {
        receiptId: uuidv4(),
        externalSystem: 'PAYMENT-GATEWAY',
        transactionId: `TXN-${Date.now()}-HZ`,
        status: 'success',
        submittedAt: formatDateTime(new Date()),
        confirmedAt: formatDateTime(new Date())
      }
    ],
    createdBy: '李操作员',
    remarks: '撤回重提，已补充完整信息'
  });
  console.log(`重提后: factId=${reSubmitResult.fact.factId}, 状态=${reSubmitResult.fact.status}, isNew=${reSubmitResult.isNew}`);

  console.log('\n=== 样例数据统计 ===');
  const allFacts = await CompensationService.getFacts({ batchId });
  console.log(`批次 ${batchId} 共 ${allFacts.length} 条记录:`);
  allFacts.forEach((f: any) => {
    console.log(`  - ${f.factId.slice(0, 8)}... | ${f.city} | ${f.status} | ${f.retryCategory || '-'}`);
  });

  const dashboard = await CompensationService.getOperationDashboard();
  console.log('\n=== 运营仪表板 ===');
  console.log('总览:', dashboard.overview);
  console.log('重试队列:', dashboard.retryQueue);

  console.log('\n样例数据创建完成!');
  console.log(`批次ID: ${batchId}`);
  console.log('可以通过以下API查看:');
  console.log(`  GET /api/v1/facts?batchId=${batchId}`);
  console.log(`  GET /api/v1/facts/dashboard`);

  Database.close();
}

seedSampleData().catch(console.error);
