import * as fs from 'fs';
import * as path from 'path';
import prisma from '../src/utils/prisma';
import { FileUploadService } from '../src/services/file-upload.service';
import { BatchService } from '../src/services/batch.service';
import { AuditDetectionService } from '../src/services/audit-detection.service';
import { ExportService } from '../src/services/export.service';
import { UserContext, SourceFileType, UserRoleType } from '../src/types';
import { toJsonString } from '../src/utils/json';

async function demo() {
  console.log('='.repeat(60));
  console.log('财务报销稽核异常回执状态机 - 演示流程');
  console.log('='.repeat(60));

  const clerkUser = await prisma.user.findUnique({ where: { username: 'clerk01' } });
  const reviewerUser = await prisma.user.findUnique({ where: { username: 'reviewer01' } });
  const managerUser = await prisma.user.findUnique({ where: { username: 'manager01' } });

  if (!clerkUser || !reviewerUser || !managerUser) {
    console.error('请先运行 npm run seed 初始化用户数据');
    return;
  }

  const clerkContext: UserContext = {
    userId: clerkUser.id,
    username: clerkUser.username,
    role: clerkUser.role as UserRoleType,
    ipAddress: '127.0.0.1',
  };

  const reviewerContext: UserContext = {
    userId: reviewerUser.id,
    username: reviewerUser.username,
    role: reviewerUser.role as UserRoleType,
    ipAddress: '127.0.0.1',
  };

  const managerContext: UserContext = {
    userId: managerUser.id,
    username: managerUser.username,
    role: managerUser.role as UserRoleType,
    ipAddress: '127.0.0.1',
  };

  console.log('\n【步骤1】文员创建稽核批次');
  const batch = await BatchService.createBatch(
    {
      title: '2024年1月差旅费用稽核',
      description: '稽核销售部门1月份差旅报销，重点检查多人共用行程的重复报销情况',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
    },
    clerkContext
  );
  console.log(`  ✓ 批次创建成功: ${batch.batchNo}`);
  console.log(`    状态: ${batch.status}`);

  console.log('\n【步骤2】上传差旅申请数据');
  const travelAppFile = {
    path: path.join(process.cwd(), 'sample-data/travel-applications.csv'),
    originalname: 'travel-applications.csv',
    size: fs.statSync(path.join(process.cwd(), 'sample-data/travel-applications.csv')).size,
  } as Express.Multer.File;

  const travelResult = await FileUploadService.uploadFile(
    batch.id,
    travelAppFile,
    SourceFileType.TRAVEL_APPLICATION,
    clerkContext
  );
  console.log(`  ✓ 差旅申请数据上传成功，解析 ${travelResult.parsedCount} 条记录`);

  console.log('\n【步骤3】上传付款流水数据');
  const paymentFile = {
    path: path.join(process.cwd(), 'sample-data/payment-records.csv'),
    originalname: 'payment-records.csv',
    size: fs.statSync(path.join(process.cwd(), 'sample-data/payment-records.csv')).size,
  } as Express.Multer.File;

  const paymentResult = await FileUploadService.uploadFile(
    batch.id,
    paymentFile,
    SourceFileType.PAYMENT_RECORD,
    clerkContext
  );
  console.log(`  ✓ 付款流水数据上传成功，解析 ${paymentResult.parsedCount} 条记录`);

  console.log('\n【步骤4】手动导入模拟发票数据（演示用）');
  const invoicesData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'sample-data/sample-invoices.json'), 'utf-8')
  );

  const mockSourceFile = await prisma.sourceFile.create({
    data: {
      batchId: batch.id,
      fileType: SourceFileType.INVOICE_PDF,
      fileName: '模拟发票数据.json',
      fileSize: 0,
      fileHash: 'mock_hash_' + Date.now(),
      storagePath: '/dev/null',
      uploadedBy: clerkContext.userId,
    },
  });

  for (let i = 0; i < invoicesData.length; i++) {
    const inv = invoicesData[i];
    await prisma.invoice.create({
      data: {
        batchId: batch.id,
        sourceFileId: mockSourceFile.id,
        sourceRowNo: i + 1,
        invoiceNo: inv.invoiceNo,
        invoiceDate: new Date(inv.invoiceDate),
        amount: inv.amount,
        taxAmount: inv.taxAmount,
        totalAmount: inv.totalAmount,
        sellerName: inv.sellerName,
        sellerTaxNo: inv.sellerTaxNo,
        buyerName: inv.buyerName,
        buyerTaxNo: inv.buyerTaxNo,
        invoiceType: inv.invoiceType,
        hotelName: inv.hotelName,
        checkInDate: inv.checkInDate ? new Date(inv.checkInDate) : null,
        checkOutDate: inv.checkOutDate ? new Date(inv.checkOutDate) : null,
        guestNames: inv.guestNames,
        rawData: toJsonString(inv.rawData),
        parsedBy: clerkContext.userId,
        parsedAt: new Date(),
      },
    });
  }
  console.log(`  ✓ 导入 ${invoicesData.length} 条发票模拟数据`);

  console.log('\n【步骤5】文员提交批次处理');
  await BatchService.submitForProcessing(batch.id, clerkContext);
  console.log(`  ✓ 批次已提交处理，状态: PROCESSING`);

  console.log('\n【步骤6】稽核员运行稽核检测');
  const auditResult = await AuditDetectionService.runAudit(batch.id, reviewerContext);
  console.log(`  ✓ 稽核完成，检测到 ${auditResult.totalDetected} 个异常:`);
  
  const exceptionTypes = auditResult.exceptions.reduce((acc: any, e: any) => {
    acc[e.exceptionType] = (acc[e.exceptionType] || 0) + 1;
    return acc;
  }, {});
  for (const [type, count] of Object.entries(exceptionTypes)) {
    console.log(`    - ${type}: ${count} 个`);
  }

  console.log('\n【步骤7】稽核员提交复核');
  await BatchService.submitForReview(batch.id, reviewerContext);
  console.log(`  ✓ 批次已提交复核，状态: REVIEWING`);

  console.log('\n【步骤8】稽核员处理异常 - 确认重复发票');
  const exceptions = await AuditDetectionService.getBatchExceptions(batch.id);
  const duplicateInvoiceException = exceptions.find(
    e => e.exceptionType === 'DUPLICATE_INVOICE'
  );
  if (duplicateInvoiceException) {
    await AuditDetectionService.confirmException(
      duplicateInvoiceException.id,
      reviewerContext,
      '经核实，确认为同一张发票重复报销'
    );
    console.log(`  ✓ 已确认重复发票异常`);
  }

  console.log('\n【步骤9】稽核员处理异常 - 驳回日期重叠');
  const dateOverlapException = exceptions.find(
    e => e.exceptionType === 'DATE_OVERLAP'
  );
  if (dateOverlapException) {
    await AuditDetectionService.dismissException(
      dateOverlapException.id,
      reviewerContext,
      '经核实，张三是从北京直接去上海，属于连续出差，日期重叠合理'
    );
    console.log(`  ✓ 已驳回日期重叠异常（情况特殊合理）`);
  }

  console.log('\n【步骤10】财务经理人工改判异常');
  const multiPersonException = exceptions.find(
    e => e.exceptionType === 'MULTIPLE_PERSON_SHARE'
  );
  if (multiPersonException) {
    await AuditDetectionService.overruleException(
      multiPersonException.id,
      managerContext,
      '改判为严重异常，3人合住但费用全部报销，需退回多报款项'
    );
    console.log(`  ✓ 已改判多人共用行程异常，提升严重级别`);
  }

  console.log('\n【步骤11】财务经理冻结批次（导出前冻结，结算锁定）');
  await BatchService.freezeBatch(
    batch.id,
    managerContext,
    '异常已处理完毕，冻结后导出报告，锁定结算状态'
  );
  console.log(`  ✓ 批次已冻结，状态: FROZEN`);
  console.log(`    冻结后：不能上传/删除文件，不能确认/驳回/改判异常`);
  console.log(`    冻结后：可以导出报告（冻结结算）`);

  console.log('\n【步骤12】冻结后尝试确认异常（应该失败）');
  try {
    await AuditDetectionService.confirmException(
      duplicateInvoiceException!.id,
      reviewerContext,
      '测试冻结后确认'
    );
    console.log('  ✗ 错误：冻结后应该不能确认异常');
  } catch (e: any) {
    console.log(`  ✓ 正确拦截：${e.message}`);
  }

  console.log('\n【步骤13】冻结状态导出稽核报告（冻结结算）');
  const exportResult = await ExportService.exportBatchReport(
    batch.id,
    managerContext
  );
  console.log(`  ✓ 报告导出成功（冻结状态）: ${exportResult.fileName}`);
  console.log(`    导出报告中包含冻结状态、冻结人、冻结原因`);

  console.log('\n【步骤14】财务经理解冻并批准');
  await BatchService.unfreezeBatch(batch.id, managerContext, '报告已导出，可正常审批');
  await BatchService.approveBatch(batch.id, managerContext, '异常已核实，按规定处理');
  console.log(`  ✓ 批次已批准，状态: APPROVED`);

  console.log('\n【步骤15】文员尝试冻结（权限不足，测试权限控制）');
  try {
    await BatchService.freezeBatch(batch.id, clerkContext, '测试权限');
    console.log('  ✗ 错误：文员应该没有权限冻结');
  } catch (e: any) {
    console.log(`  ✓ 正确拦截：${e.message}`);
    console.log('    （审计日志中已记录这次权限不足的操作）');
  }

  console.log('\n【步骤16】查看经理仪表板');
  const dashboard = await ExportService.getFinanceDashboard(batch.id);
  console.log(`  ✓ 仪表板数据:`);
  console.log(`    批次: ${dashboard.batchNo} - ${dashboard.title}`);
  console.log(`    当前状态: ${dashboard.currentStatus}`);
  console.log(`    异常总数: ${dashboard.summary.totalExceptions}`);
  console.log(`    - 待处理: ${dashboard.summary.exceptionsByStatus.detected}`);
  console.log(`    - 已确认: ${dashboard.summary.exceptionsByStatus.confirmed}`);
  console.log(`    - 已改判: ${dashboard.summary.exceptionsByStatus.overruled}`);
  console.log(`    - 已驳回: ${dashboard.summary.exceptionsByStatus.dismissed}`);

  console.log('\n' + '='.repeat(60));
  console.log('演示流程完成！');
  console.log('='.repeat(60));

  console.log('\n【审计日志检查】');
  const auditLogs = await prisma.auditLog.findMany({
    where: { batchId: batch.id },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`  共记录 ${auditLogs.length} 条审计日志:`);
  for (const log of auditLogs.slice(0, 10)) {
    console.log(`    [${log.createdAt.toLocaleTimeString()}] ${log.action} - ${log.username || 'system'}`);
  }
  if (auditLogs.length > 10) {
    console.log(`    ... 还有 ${auditLogs.length - 10} 条日志`);
  }

  const permissionDeniedLogs = auditLogs.filter(l => l.action === 'PERMISSION_DENIED');
  if (permissionDeniedLogs.length > 0) {
    console.log(`\n  权限拦截记录 (${permissionDeniedLogs.length} 条):`);
    for (const log of permissionDeniedLogs) {
      console.log(`    - ${log.username} 尝试操作被拦截，已记录审计`);
    }
  }
}

demo()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
