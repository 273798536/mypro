import 'reflect-metadata';
import { initializeDatabase } from '../config/database';
import { BorrowApplicationService } from '../services/BorrowApplicationService';
import { QueueService } from '../services/QueueService';
import { ExpressOrderService } from '../services/ExpressOrderService';
import { CompensationService } from '../services/CompensationService';
import { ReceiptService } from '../services/ReceiptService';
import { BorrowType } from '../entities/BorrowApplication';
import { CommentType } from '../entities/SupervisorComment';
import { ExpressType } from '../entities/ExpressOrder';
import { CompensationType } from '../entities/CompensationRecord';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  try {
    await initializeDatabase();
    console.log('数据库连接成功\n');

    const operatorId = 'demo-operator-001';
    const operatorName = '演示操作员';
    const supervisorId = 'demo-supervisor-001';
    const supervisorName = '李主管';

    console.log('=== 创建示例借阅申请 ===\n');

    const applications = [
      {
        applicationNo: 'ILL-2024-00001',
        readerId: 'R2024001',
        readerName: '张三',
        bookTitle: '人工智能导论',
        isbn: '978-7-111-12345-6',
        sourceLibrary: '北京大学图书馆',
        targetLibrary: '清华大学图书馆',
        borrowType: BorrowType.INTER_LIBRARY
      },
      {
        applicationNo: 'ILL-2024-00002',
        readerId: 'R2024002',
        readerName: '李四',
        bookTitle: '机器学习实战',
        isbn: '978-7-111-23456-7',
        sourceLibrary: '复旦大学图书馆',
        targetLibrary: '上海交通大学图书馆',
        borrowType: BorrowType.INTER_LIBRARY
      },
      {
        applicationNo: 'ILL-2024-00003',
        readerId: 'R2024003',
        readerName: '王五',
        bookTitle: '数据结构与算法',
        isbn: '978-7-111-34567-8',
        sourceLibrary: '浙江大学图书馆',
        targetLibrary: '南京大学图书馆',
        borrowType: BorrowType.DOCUMENT_DELIVERY
      }
    ];

    for (const app of applications) {
      const result = await BorrowApplicationService.submitApplication(
        app,
        { strategy: 'ignore' },
        operatorId,
        operatorName
      );
      console.log(`申请 ${app.applicationNo}: ${result.action}`);
      console.log(`  ID: ${result.application.id}`);
      console.log(`  状态: ${result.application.status}`);
      console.log(`  版本: ${result.application.version}`);
      console.log('');
    }

    console.log('=== 测试重复提交处理 ===\n');
    
    const duplicateResult = await BorrowApplicationService.submitApplication(
      applications[0],
      { strategy: 'append' },
      operatorId,
      operatorName
    );
    console.log(`重复提交 ILL-2024-00001: ${duplicateResult.action}`);
    console.log(`新版本: ${duplicateResult.application.version}`);
    console.log('');

    console.log('=== 测试撤回后重新提交 ===\n');

    const app2 = await BorrowApplicationService.submitApplication(
      applications[1],
      { strategy: 'ignore' },
      operatorId,
      operatorName
    );
    
    const withdrawn = await BorrowApplicationService.withdrawApplication(
      app2.application.id,
      '读者申请撤回',
      supervisorId,
      supervisorName
    );
    console.log(`撤回申请 ${withdrawn.applicationNo}: ${withdrawn.status}`);

    const resubmitted = await BorrowApplicationService.resubmitAfterWithdraw(
      app2.application.id,
      operatorId,
      operatorName
    );
    console.log(`重新提交: ${resubmitted.status}`);
    console.log(`新版本: ${resubmitted.version}`);
    console.log('');

    console.log('=== 添加主管批注 ===\n');

    const comment = await BorrowApplicationService.addSupervisorComment(
      app2.application.id,
      CommentType.FEE_ADJUSTMENT,
      '因首次逾期，减免一半逾期费用',
      supervisorId,
      supervisorName,
      true,
      { type: 'overdue', adjustment: -10 }
    );
    console.log(`添加批注: ${comment.commentType}`);
    console.log(`内容: ${comment.content}`);
    console.log('');

    console.log('=== 获取申请完整详情 ===\n');

    const details = await BorrowApplicationService.getApplicationWithDetails(app2.application.id);
    console.log(`申请编号: ${details.application.applicationNo}`);
    console.log(`读者: ${details.application.readerName}`);
    console.log(`费用明细: ${details.feeCalculation.breakdown.length} 项`);
    console.log(`操作历史: ${details.history.length} 条`);
    console.log(`总费用: ${details.feeCalculation.totalFee} 元`);
    console.log('');

    console.log('=== 创建快递单 ===\n');

    const application1 = await BorrowApplicationService.getApplicationWithDetails(app2.application.id);
    
    const expressOrder1 = await ExpressOrderService.createExpressOrder(
      {
        expressNo: `SF-2024-${uuidv4().slice(0, 6).toUpperCase()}`,
        applicationId: app2.application.id,
        expressType: ExpressType.FORWARD,
        courierCompany: '顺丰速运',
        receiver: '李四',
        receiverPhone: '13800138001',
        receiverAddress: '上海市闵行区上海交通大学图书馆',
        fee: 25,
        sender: '复旦大学图书馆',
        senderPhone: '021-65641234',
        senderAddress: '上海市杨浦区复旦大学图书馆'
      },
      operatorId,
      operatorName
    );
    console.log(`创建快递单: ${expressOrder1.expressNo}`);
    console.log(`  快递公司: ${expressOrder1.courierCompany}`);
    console.log(`  费用: ${expressOrder1.fee} 元`);
    console.log('');

    const expressOrder2 = await ExpressOrderService.createExpressOrder(
      {
        expressNo: `SF-2024-${uuidv4().slice(0, 6).toUpperCase()}`,
        applicationId: app2.application.id,
        expressType: ExpressType.RETURN,
        courierCompany: '顺丰速运',
        receiver: '复旦大学图书馆',
        receiverPhone: '021-65641234',
        receiverAddress: '上海市杨浦区复旦大学图书馆',
        fee: 20,
        sender: '李四',
        senderPhone: '13800138001',
        senderAddress: '上海市闵行区上海交通大学图书馆'
      },
      operatorId,
      operatorName
    );
    console.log(`创建归还快递单: ${expressOrder2.expressNo}`);
    console.log(`  费用: ${expressOrder2.fee} 元`);
    console.log('');

    console.log('=== 创建赔偿记录 ===\n');

    const compensation1 = await CompensationService.createCompensationRecord(
      {
        applicationId: app2.application.id,
        compensationType: CompensationType.OVERDUE,
        amount: 20,
        reason: '逾期10天',
        rawData: { overdueDays: 10, dailyRate: 2 }
      },
      operatorId,
      operatorName
    );
    console.log(`创建逾期赔偿: ${compensation1.recordNo}`);
    console.log(`  类型: ${compensation1.compensationType}`);
    console.log(`  金额: ${compensation1.amount} 元`);
    console.log('');

    const compensation2 = await CompensationService.createCompensationRecord(
      {
        applicationId: app2.application.id,
        compensationType: CompensationType.DAMAGE,
        amount: 50,
        reason: '书籍封面有轻微破损',
        evidence: '图片: damage_001.jpg'
      },
      operatorId,
      operatorName
    );
    console.log(`创建污损赔偿: ${compensation2.recordNo}`);
    console.log(`  类型: ${compensation2.compensationType}`);
    console.log(`  金额: ${compensation2.amount} 元`);
    console.log('');

    console.log('=== 提交外部回执 ===\n');

    const receipt1 = await ReceiptService.submitExternalReceipt({
      applicationNo: app2.application.applicationNo,
      receiptType: 'status_update',
      externalReference: `LIB-SYS-${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: {
        status: 'returned',
        borrowDate: '2024-01-01',
        dueDate: '2024-01-15',
        returnDate: '2024-01-20',
        renewalCount: 1,
        isOverdue: true
      },
      operatorId,
      operatorName
    });
    console.log(`提交状态更新回执: ${receipt1.action}`);
    console.log(`  申请编号: ${receipt1.applicationNo}`);
    console.log('');

    const receipt2 = await ReceiptService.submitExternalReceipt({
      applicationNo: app2.application.applicationNo,
      receiptType: 'express',
      externalReference: `EXP-SYS-${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: {
        expressNo: `EXT-${Date.now()}`,
        courierCompany: '中通快递',
        fee: 18,
        receiver: '复旦大学图书馆',
        receiverAddress: '上海市杨浦区',
        trackingInfo: '77889900112233'
      },
      operatorId,
      operatorName
    });
    console.log(`提交快递回执: ${receipt2.action}`);
    console.log(`  申请编号: ${receipt2.applicationNo}`);
    console.log('');

    console.log('=== 计算费用并入账 ===\n');

    const feeResult = await ReceiptService.calculateAndRecordFees(
      app2.application.id,
      supervisorId,
      supervisorName
    );
    console.log(`费用计算结果:`);
    console.log(`  逾期费: ${feeResult.details.overdueFee} 元`);
    console.log(`  污损费: ${feeResult.details.damageFee} 元`);
    console.log(`  快递费: ${feeResult.details.shippingFee} 元`);
    console.log(`  总费用: ${feeResult.details.totalFee} 元`);
    console.log(`  明细项数: ${feeResult.details.breakdown.length} 项`);
    console.log('');

    console.log('=== 处理赔偿支付 ===\n');

    const paymentResult = await CompensationService.processPayment(
      {
        recordId: compensation1.id,
        amount: compensation1.amount,
        paymentMethod: '现金',
        paymentReference: 'PAY-2024-0001'
      },
      supervisorId,
      supervisorName
    );
    console.log(`赔偿支付完成: ${paymentResult.recordNo}`);
    console.log(`  已付金额: ${paymentResult.paidAmount} 元`);
    console.log(`  状态: ${paymentResult.status}`);
    console.log('');

    console.log('=== 获取完整申请详情 ===\n');

    const completeDetails = await BorrowApplicationService.getApplicationWithDetails(app2.application.id);
    console.log(`申请编号: ${completeDetails.application.applicationNo}`);
    console.log(`读者: ${completeDetails.application.readerName}`);
    console.log(`状态: ${completeDetails.application.status}`);
    console.log(`逾期费: ${completeDetails.application.overdueFee} 元`);
    console.log(`污损费: ${completeDetails.application.damageFee} 元`);
    console.log(`快递费: ${completeDetails.application.shippingFee} 元`);
    console.log(`总费用: ${completeDetails.application.totalFee} 元`);
    console.log(`费用明细: ${completeDetails.feeCalculation.breakdown.length} 项`);
    console.log(`操作历史: ${completeDetails.history.length} 条`);
    console.log(`版本号: ${completeDetails.application.version}`);
    console.log('');

    console.log('=== 队列统计 ===\n');

    const stats = await QueueService.getTaskStats();
    console.log(`队列状态:`);
    console.log(`  待处理: ${stats.queue.pending}`);
    console.log(`  处理中: ${stats.queue.processing}`);
    console.log(`  成功: ${stats.queue.success}`);
    console.log(`  失败: ${stats.queue.failed}`);
    console.log(`  人工处理: ${stats.queue.manual}`);
    console.log(`  已冻结: ${stats.queue.frozen}`);
    console.log(`死信队列: ${stats.deadLetter.total} 条`);
    console.log('');

    console.log('=== 验证多事实写入 ===\n');

    const expressList = await ExpressOrderService.getExpressOrdersByApplication(app2.application.id);
    const compensationList = await CompensationService.getCompensationRecordsByApplication(app2.application.id);
    
    console.log(`快递单数量: ${expressList.length}`);
    expressList.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.expressNo} - ${e.courierCompany} - ${e.fee}元 - ${e.status}`);
    });
    
    console.log(`赔偿记录数量: ${compensationList.length}`);
    compensationList.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.recordNo} - ${c.compensationType} - ${c.amount}元 - ${c.status}`);
    });
    console.log('');

    console.log('=== 示例数据创建完成 ===');
    console.log('\n接下来可以运行:');
    console.log('  npm run dev - 启动开发服务器');
    console.log('  npm run check - 运行自动化检查');
    console.log('\n测试 API 时请在请求头中添加:');
    console.log('  X-User-ID: demo-operator-001');
    console.log('  X-User-Name: 演示操作员');
    console.log('  X-User-Role: supervisor');

  } catch (error) {
    console.error('创建示例数据失败:', error);
    process.exit(1);
  }
}

main();
