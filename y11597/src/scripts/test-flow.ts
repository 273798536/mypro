import 'reflect-metadata';
import dotenv from 'dotenv';
import { AppDataSource } from '../config/database';
import { CompensationService } from '../services/compensationService';
import { ReportService } from '../services/reportService';
import { AuthService } from '../services/authService';
import { DataSource, RetryCategory, UserRole } from '../types/enums';

dotenv.config();

async function testFlow() {
  await AppDataSource.initialize();
  console.log('数据库连接成功\n');

  const compensationService = new CompensationService();
  const reportService = new ReportService();
  const authService = new AuthService();

  const adminResult = await authService.login('admin', 'admin123');
  if (!adminResult) {
    console.error('管理员登录失败，请先运行 npm run init-db');
    await AppDataSource.destroy();
    return;
  }
  const adminId = adminResult.user.id;
  const adminName = adminResult.user.username;

  console.log('=== 测试流程开始 ===\n');

  console.log('1. 提交补偿记录（来自变更单）');
  const record1 = await compensationService.submitRecord({
    businessKey: 'CO-2024-001',
    dataSource: DataSource.CHANGE_ORDER,
    sourceId: 'CHG-001',
    customerId: 'CUST-001',
    customerName: '测试客户A',
    compensationAmount: 150.00,
    reason: '旧口径答案下线后坐席误用',
    rawData: { oldAnswer: '旧口径答案', newAnswer: '新口径答案' }
  }, adminId, adminName);
  console.log(`   创建记录: ${record1.id} - ${record1.businessKey}`);
  console.log(`   状态: ${record1.status}`);
  console.log();

  console.log('2. 提交补偿记录（来自审核意见）');
  const record2 = await compensationService.submitRecord({
    businessKey: 'AO-2024-001',
    dataSource: DataSource.AUDIT_OPINION,
    sourceId: 'AUD-001',
    customerId: 'CUST-002',
    customerName: '测试客户B',
    compensationAmount: 300.00,
    reason: '审核发现错赔需要补偿'
  }, adminId, adminName);
  console.log(`   创建记录: ${record2.id} - ${record2.businessKey}`);
  console.log();

  console.log('3. 提交补偿记录（来自手工改价表）');
  const record3 = await compensationService.submitRecord({
    businessKey: 'MP-2024-001',
    dataSource: DataSource.MANUAL_PRICING,
    sourceId: 'MP-001',
    customerId: 'CUST-003',
    customerName: '测试客户C',
    compensationAmount: 500.00,
    reason: '手工改价后差价补偿'
  }, adminId, adminName);
  console.log(`   创建记录: ${record3.id} - ${record3.businessKey}`);
  console.log();

  console.log('4. 提交一条坏数据（缺少客户ID，测试死信机制）');
  try {
    const badRecord = await compensationService.submitRecord({
      businessKey: 'BAD-001',
      dataSource: DataSource.CUSTOMER_QUOTE,
      sourceId: 'BAD-SRC',
      customerId: '',
      compensationAmount: 100.00,
      reason: '测试坏数据'
    }, adminId, adminName);
    console.log(`   坏数据记录ID: ${badRecord.id}`);
    console.log(`   状态: ${badRecord.status}`);
    console.log(`   是否坏数据: ${badRecord.isBadData}`);
    console.log(`   坏数据原因: ${badRecord.badDataReason}`);
  } catch (e) {
    console.log(`   错误: ${(e as Error).message}`);
  }
  console.log();

  console.log('5. 将记录1加入队列');
  const queuedRecord1 = await compensationService.queueRecord(record1.id, adminId, adminName);
  console.log(`   记录1状态: ${queuedRecord1.status}`);
  console.log();

  console.log('6. 重试记录1（模拟外部服务失败）');
  const retriedRecord1 = await compensationService.retryRecord(
    record1.id,
    adminId,
    adminName,
    RetryCategory.EXTERNAL_SERVICE_DOWN,
    '支付网关暂时不可用'
  );
  console.log(`   记录1状态: ${retriedRecord1.status}`);
  console.log(`   重试次数: ${retriedRecord1.retryCount}`);
  console.log(`   重试分类: ${retriedRecord1.retryCategory}`);
  console.log(`   最后错误: ${retriedRecord1.lastError}`);
  console.log();

  console.log('7. 人工接管记录1');
  const takeoverRecord = await compensationService.manualTakeover(
    record1.id,
    adminId,
    adminName,
    '外部服务持续不可用，转人工处理'
  );
  console.log(`   记录1状态: ${takeoverRecord.status}`);
  console.log(`   处理人: ${takeoverRecord.handledBy}`);
  console.log();

  console.log('8. 人工处理完成，补偿入账');
  const compensatedRecord = await compensationService.processCompensation(
    record1.id,
    adminId,
    adminName,
    'EXT-RECEIPT-12345'
  );
  console.log(`   记录1状态: ${compensatedRecord.status}`);
  console.log(`   外部回执ID: ${compensatedRecord.externalReceiptId}`);
  console.log(`   补偿时间: ${compensatedRecord.compensatedAt}`);
  console.log();

  console.log('9. 开始复核记录1');
  const reviewingRecord = await compensationService.startReview(record1.id, adminId, adminName);
  console.log(`   记录1状态: ${reviewingRecord.status}`);
  console.log(`   复核人: ${reviewingRecord.reviewedBy}`);
  console.log();

  console.log('10. 审批通过记录1');
  const approvedRecord = await compensationService.approveRecord(
    record1.id,
    adminId,
    adminName,
    '复核通过，补偿金额合理'
  );
  console.log(`   记录1状态: ${approvedRecord.status}`);
  console.log(`   审批人: ${approvedRecord.approvedBy}`);
  console.log(`   审批时间: ${approvedRecord.approvedAt}`);
  console.log();

  console.log('11. 关闭记录1');
  const closedRecord = await compensationService.closeRecord(
    record1.id,
    adminId,
    adminName,
    '流程完成，正常关闭'
  );
  console.log(`   记录1状态: ${closedRecord.status}`);
  console.log();

  console.log('12. 查看失败记录列表');
  const failedRecords = await compensationService.getFailedRecords(false);
  console.log(`   未解决失败记录数: ${failedRecords.total}`);
  failedRecords.records.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.businessKey} - ${r.retryCategory} - ${r.errorMessage}`);
  });
  console.log();

  console.log('13. 生成运营报表');
  const report = await reportService.generateReport();
  console.log('   汇总数据:');
  console.log(`     总记录数: ${report.summary.totalRecords}`);
  console.log(`     总金额: ${report.summary.totalAmount}`);
  console.log(`     已审批: ${report.summary.approvedRecords}条 (${report.summary.approvedAmount}元)`);
  console.log(`     待处理: ${report.summary.pendingRecords}条 (${report.summary.pendingAmount}元)`);
  console.log(`     死信记录: ${report.summary.deadLetterRecords}条`);
  console.log(`     坏数据记录: ${report.summary.badDataRecords}条`);
  console.log();
  console.log('   按状态分类:');
  report.statusBreakdown.forEach(s => {
    console.log(`     ${s.status}: ${s.count}条, ${s.totalAmount}元`);
  });
  console.log();
  console.log('   按数据源分类:');
  report.dataSourceBreakdown.forEach(d => {
    console.log(`     ${d.dataSource}: ${d.count}条, ${d.totalAmount}元`);
  });
  console.log();
  console.log('   按重试分类（失败记录）:');
  report.retryCategoryBreakdown.forEach(c => {
    console.log(`     ${c.category}: ${c.count}条 (已解决${c.resolvedCount}, 未解决${c.unresolvedCount})`);
  });
  console.log();

  console.log('14. 追溯记录1的完整历史');
  const traceData = await reportService.getTraceableRecord(record1.id);
  console.log(`   记录 ${traceData.record.businessKey} 的历史轨迹:`);
  traceData.statusHistories.forEach((h, i) => {
    console.log(`     ${i + 1}. [${h.operatedAt.toLocaleString()}] ${h.operatorName}: ${h.fromStatus} → ${h.toStatus}`);
    console.log(`        操作: ${h.operationType}, 原因: ${h.reason}`);
  });
  console.log();

  console.log('=== 测试流程完成 ===');
  console.log();
  console.log('测试账号:');
  console.log('  主管账号: admin / admin123');
  console.log('  复核账号: reviewer / reviewer123');
  console.log('  录入账号: entry / entry123');
  console.log('  只读账号: viewer / viewer123');

  await AppDataSource.destroy();
}

testFlow().catch(console.error);
