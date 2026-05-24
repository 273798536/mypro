import '../database';
import { BatchService } from '../services/batch-service';
import { MaterialService } from '../services/material-service';
import { TaskService } from '../services/task-service';
import { BatchStatus, ProcessResult, MaterialType } from '../types';
import fs from 'fs';
import path from 'path';

async function createSampleBatch(
  batchNumber: string,
  trainingName: string,
  status: BatchStatus,
  processResult?: ProcessResult
) {
  console.log(`创建批次: ${batchNumber}`);
  
  const batch = await BatchService.createBatch(
    batchNumber,
    trainingName,
    '2024-05-20',
    '张三',
    processResult ? `样例批次 - ${processResult}` : '样例批次'
  );

  const sampleFileContent = Buffer.from(`这是 ${trainingName} 的样例文件内容\n批次号: ${batchNumber}`);
  
  const material1 = await MaterialService.uploadMaterial(
    batch.id,
    MaterialType.REGISTRATION_FORM,
    sampleFileContent,
    `${batchNumber}_报名表.xlsx`,
    '李四',
    false
  );
  console.log(`  上传材料: ${material1.fileName}`);

  const material2 = await MaterialService.uploadMaterial(
    batch.id,
    MaterialType.SIGN_QR_CODE,
    sampleFileContent,
    `${batchNumber}_签到二维码.png`,
    '李四',
    false
  );
  console.log(`  上传材料: ${material2.fileName}`);

  const material3 = await MaterialService.uploadMaterial(
    batch.id,
    MaterialType.POST_CLASS_ASSIGNMENT,
    sampleFileContent,
    `${batchNumber}_课后作业.pdf`,
    '王五',
    true
  );
  console.log(`  上传材料: ${material3.fileName} (敏感)`);

  const material4 = await MaterialService.uploadMaterial(
    batch.id,
    MaterialType.CUSTOMER_SERVICE_NOTE,
    sampleFileContent,
    `${batchNumber}_客服备注.txt`,
    '赵六',
    false
  );
  console.log(`  上传材料: ${material4.fileName}`);

  if (processResult === ProcessResult.NORMAL) {
    await MaterialService.setMaterialProcessResult(
      material1.id,
      ProcessResult.NORMAL,
      '材料审核通过，信息完整',
      '审核员A'
    );
    await MaterialService.setMaterialProcessResult(
      material2.id,
      ProcessResult.NORMAL,
      '二维码验证有效，签到记录正常',
      '审核员A'
    );
    await MaterialService.setMaterialProcessResult(
      material3.id,
      ProcessResult.NORMAL,
      '作业已提交，评分合格',
      '审核员A'
    );
    await MaterialService.setMaterialProcessResult(
      material4.id,
      ProcessResult.NORMAL,
      '备注信息已确认',
      '审核员A'
    );
    await BatchService.setProcessResult(
      batch.id,
      ProcessResult.NORMAL,
      '所有材料审核通过',
      '审核员A'
    );
    console.log(`  设置处理结果: 正常`);
  } else if (processResult === ProcessResult.PENDING_REVIEW) {
    await MaterialService.setMaterialProcessResult(
      material1.id,
      ProcessResult.NORMAL,
      '材料审核通过',
      '审核员B'
    );
    await MaterialService.setMaterialProcessResult(
      material2.id,
      ProcessResult.PENDING_REVIEW,
      '签到记录有跳号现象，需要HRBP复核',
      '审核员B'
    );
    await MaterialService.setMaterialProcessResult(
      material3.id,
      ProcessResult.NORMAL,
      '作业已提交',
      '审核员B'
    );
    await MaterialService.setMaterialProcessResult(
      material4.id,
      ProcessResult.PENDING_REVIEW,
      '客服备注中提到有代签到情况，需要确认',
      '审核员B'
    );
    await BatchService.setProcessResult(
      batch.id,
      ProcessResult.PENDING_REVIEW,
      '部分材料需要进一步复核：签到记录跳号、疑似代签到',
      '审核员B'
    );
    console.log(`  设置处理结果: 待复核`);
  } else if (processResult === ProcessResult.UNPROCESSABLE) {
    await MaterialService.setMaterialProcessResult(
      material1.id,
      ProcessResult.UNPROCESSABLE,
      '报名表格式损坏，无法读取数据',
      '审核员C'
    );
    await MaterialService.setMaterialProcessResult(
      material2.id,
      ProcessResult.UNPROCESSABLE,
      '二维码图片模糊，无法识别',
      '审核员C'
    );
    await MaterialService.setMaterialProcessResult(
      material3.id,
      ProcessResult.PENDING_REVIEW,
      '作业文件疑似伪造，需要技术鉴定',
      '审核员C'
    );
    await MaterialService.setMaterialProcessResult(
      material4.id,
      ProcessResult.UNPROCESSABLE,
      '客服备注内容缺失关键信息',
      '审核员C'
    );
    await BatchService.setProcessResult(
      batch.id,
      ProcessResult.UNPROCESSABLE,
      '材料严重损坏/不完整，无法继续处理',
      '审核员C'
    );
    console.log(`  设置处理结果: 无法处理`);
  }

  if (status !== BatchStatus.DRAFT) {
    await BatchService.updateBatchStatus(
      batch.id,
      BatchStatus.SUBMITTED,
      '提交人',
      '提交审核'
    );
    console.log(`  状态流转: 草稿 → 已提交`);
  }

  if (status === BatchStatus.REJECTED) {
    await BatchService.updateBatchStatus(
      batch.id,
      BatchStatus.REJECTED,
      '审核员',
      '材料不完整，请补充后重新提交'
    );
    console.log(`  状态流转: 已提交 → 已驳回`);
  }

  if (status === BatchStatus.SECONDARY_CONFIRMED) {
    await BatchService.updateBatchStatus(
      batch.id,
      BatchStatus.SECONDARY_CONFIRMED,
      '主管',
      '复核通过'
    );
    console.log(`  状态流转: 已提交 → 二次确认`);
  }

  if (status === BatchStatus.AUDIT_ONLY) {
    await BatchService.updateBatchStatus(
      batch.id,
      BatchStatus.SECONDARY_CONFIRMED,
      '主管',
      '复核通过'
    );
    await BatchService.updateBatchStatus(
      batch.id,
      BatchStatus.AUDIT_ONLY,
      '审计员',
      '进入只读审计状态'
    );
    console.log(`  状态流转: 二次确认 → 只读审计`);
  }

  return batch;
}

async function createSampleTasks() {
  console.log('\n创建样例异步任务...');

  await TaskService.createTask(
    'material_analysis',
    { materialId: 'sample-1', analysisType: 'ocr' },
    undefined,
    3
  );
  console.log('  创建: 材料分析任务 (正常)');

  await TaskService.createTask(
    'batch_validation',
    { batchId: 'sample-2', validationType: 'signature' },
    undefined,
    5
  );
  console.log('  创建: 批次校验任务');

  await TaskService.createTask(
    'unknown_task_type',
    { test: 'data' },
    undefined,
    3
  );
  console.log('  创建: 未知类型任务 (将永久失败)');
}

async function main() {
  console.log('开始生成样例数据...\n');

  try {
    const normalBatch = await createSampleBatch(
      'BATCH-2024-0520-001',
      '销售技巧培训',
      BatchStatus.AUDIT_ONLY,
      ProcessResult.NORMAL
    );

    const pendingBatch = await createSampleBatch(
      'BATCH-2024-0520-002',
      '客户服务培训',
      BatchStatus.SECONDARY_CONFIRMED,
      ProcessResult.PENDING_REVIEW
    );

    const failedBatch = await createSampleBatch(
      'BATCH-2024-0520-003',
      '产品知识培训',
      BatchStatus.REJECTED,
      ProcessResult.UNPROCESSABLE
    );

    const draftBatch = await createSampleBatch(
      'BATCH-2024-0520-004',
      '管理能力培训',
      BatchStatus.DRAFT,
      undefined
    );

    await createSampleTasks();

    console.log('\n=== 样例数据生成完成 ===');
    console.log(`
批次概览:
  BATCH-2024-0520-001: 正常 / 只读审计
  BATCH-2024-0520-002: 待复核 / 二次确认
  BATCH-2024-0520-003: 无法处理 / 已驳回
  BATCH-2024-0520-004: 草稿

API测试示例:
  获取批次列表: GET /api/batches
  获取待复核项目: GET /api/hrbp/failed-items
  HRBP角色视图: GET /api/hrbp/view/hrbp
  导出报表: GET /api/hrbp/export/${normalBatch.id}
    `);

  } catch (error) {
    console.error('生成样例数据失败:', error);
    throw error;
  }
}

main().then(() => {
  console.log('\n样例数据生成脚本执行完成');
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
