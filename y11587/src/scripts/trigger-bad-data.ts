import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { DirtyDataService } from "../services/dirty-data.service";
import { RetryQueueService } from "../services/retry-queue.service";
import { ContractService } from "../services/contract.service";
import { DirtyType } from "../entities/DirtyRecord";

async function triggerBadData() {
  console.log("=== 触发坏数据场景 ===");
  await AppDataSource.initialize();

  const dirtyDataService = new DirtyDataService();
  const retryQueueService = new RetryQueueService();
  const contractService = new ContractService();

  console.log("\n1. 创建缺失字段的脏数据...");

  const incompleteContract = {
    contractNo: "HT-BAD-001",
    totalAmount: 100000,
  };

  const validation1 = dirtyDataService.validateContractData(incompleteContract);
  console.log(`  ✓ 发现 ${validation1.issues.length} 个问题`);

  for (const issue of validation1.issues) {
    await dirtyDataService.recordDirtyData(
      "Contract",
      null,
      JSON.parse(issue.originalData),
      issue.dirtyType as DirtyType,
      issue.fieldIssues ? JSON.parse(issue.fieldIssues) : undefined,
      issue.conflictDetails ? JSON.parse(issue.conflictDetails) : undefined
    );
  }

  console.log("\n2. 创建金额冲突的脏数据...");

  const amountConflict = {
    id: "temp-id-001",
    nodeName: "测试付款节点",
    nodeType: "PROGRESS",
    amount: -5000,
  };

  const validation2 = dirtyDataService.validatePaymentNodeData(amountConflict);
  console.log(`  ✓ 发现 ${validation2.issues.length} 个问题`);

  for (const issue of validation2.issues) {
    await dirtyDataService.recordDirtyData(
      "PaymentNode",
      amountConflict.id,
      JSON.parse(issue.originalData),
      issue.dirtyType as DirtyType,
      issue.fieldIssues ? JSON.parse(issue.fieldIssues) : undefined,
      issue.conflictDetails ? JSON.parse(issue.conflictDetails) : undefined
    );
  }

  console.log("\n3. 创建跨日数据异常...");

  const crossDayData = {
    id: "temp-id-002",
    paymentDate: "2024-01-01",
    recordDate: "2024-01-05",
  };

  const crossDayIssue = dirtyDataService.detectCrossDayIssue(
    "PaymentRecord",
    crossDayData.id,
    crossDayData,
    "paymentDate",
    crossDayData.recordDate
  );

  if (crossDayIssue) {
    await dirtyDataService.recordDirtyData(
      crossDayIssue.sourceTable,
      crossDayIssue.sourceRecordId ?? null,
      JSON.parse(crossDayIssue.originalData),
      crossDayIssue.dirtyType,
      crossDayIssue.fieldIssues ? JSON.parse(crossDayIssue.fieldIssues) : undefined,
      crossDayIssue.conflictDetails ? JSON.parse(crossDayIssue.conflictDetails) : undefined
    );
    console.log("  ✓ 跨日数据异常已记录");
  }

  console.log("\n4. 创建名称变更记录...");

  const nameIssue = dirtyDataService.detectNameConflict(
    "Contract",
    "temp-id-003",
    "东三环路抢修工程(新名称)",
    "东三环路抢修工程"
  );

  if (nameIssue) {
    await dirtyDataService.recordDirtyData(
      nameIssue.sourceTable,
      nameIssue.sourceRecordId ?? null,
      JSON.parse(nameIssue.originalData),
      nameIssue.dirtyType,
      nameIssue.fieldIssues ? JSON.parse(nameIssue.fieldIssues) : undefined,
      nameIssue.conflictDetails ? JSON.parse(nameIssue.conflictDetails) : undefined
    );
    console.log("  ✓ 名称变更记录已创建");
  }

  console.log("\n5. 创建金额差异记录...");

  const amountIssue = dirtyDataService.detectAmountConflict(
    "PaymentNode",
    "temp-id-004",
    "amount",
    105000,
    100000,
    1000
  );

  if (amountIssue) {
    await dirtyDataService.recordDirtyData(
      amountIssue.sourceTable,
      amountIssue.sourceRecordId ?? null,
      JSON.parse(amountIssue.originalData),
      amountIssue.dirtyType,
      amountIssue.fieldIssues ? JSON.parse(amountIssue.fieldIssues) : undefined,
      amountIssue.conflictDetails ? JSON.parse(amountIssue.conflictDetails) : undefined
    );
    console.log("  ✓ 金额差异记录已创建");
  }

  console.log("\n6. 创建模拟失败的重试任务...");

  const failTask1 = await retryQueueService.enqueue(
    "PAYMENT_PROCESS",
    {
      contractId: "test-contract-001",
      amount: 50000,
      bankAccount: "6222****9999",
    },
    {
      source: "simulation",
      maxRetries: 3,
      createdBy: "test_operator",
    }
  );
  console.log(`  ✓ 创建失败任务1: ${failTask1.id.substring(0, 8)}...`);

  await retryQueueService.markFailed(
    failTask1.id,
    new Error("NETWORK_ERROR: 连接银行系统超时，请检查网络连接后重试")
  );
  console.log("    - 标记为失败: 网络错误");

  const failTask2 = await retryQueueService.enqueue(
    "EXTERNAL_RECEIPT",
    {
      receiptNo: "RCPT-BAD-001",
      amount: 25000,
    },
    {
      source: "simulation",
      maxRetries: 3,
      createdBy: "test_operator",
    }
  );
  console.log(`  ✓ 创建失败任务2: ${failTask2.id.substring(0, 8)}...`);

  await retryQueueService.markFailed(
    failTask2.id,
    new Error("MISSING_DATA: 缺少必填字段: transactionNo, paymentDate")
  );
  console.log("    - 标记为失败: 缺失数据");

  const failTask3 = await retryQueueService.enqueue(
    "PAYMENT_PROCESS",
    {
      contractId: "test-contract-002",
      amount: 75000,
    },
    {
      source: "simulation",
      maxRetries: 3,
      createdBy: "test_operator",
    }
  );
  console.log(`  ✓ 创建失败任务3: ${failTask3.id.substring(0, 8)}...`);

  await retryQueueService.markFailed(
    failTask3.id,
    new Error("AMOUNT_CONFLICT: 付款金额与合同约定金额不符")
  );
  console.log("    - 标记为失败: 金额冲突");

  console.log("\n7. 模拟重试达到上限移入死信队列...");

  const deadLetterTask = await retryQueueService.enqueue(
    "EMAIL_REMINDER",
    {
      email: "test@example.com",
      subject: "测试邮件",
    },
    {
      source: "simulation",
      maxRetries: 2,
      createdBy: "test_operator",
    }
  );

  await retryQueueService.markFailed(
    deadLetterTask.id,
    new Error("SYSTEM_ERROR: 邮件服务暂时不可用")
  );
  await retryQueueService.markFailed(
    deadLetterTask.id,
    new Error("SYSTEM_ERROR: 邮件服务暂时不可用 - 第二次重试")
  );

  console.log(`  ✓ 死信任务: ${deadLetterTask.id.substring(0, 8)}...`);

  console.log("\n8. 创建需要人工干预的任务...");

  const manualTask = await retryQueueService.enqueue(
    "CONTRACT_ARCHIVE",
    {
      contractId: "test-contract-003",
      archiveType: "FULL",
    },
    {
      source: "simulation",
      createdBy: "test_operator",
    }
  );

  await retryQueueService.manualIntervention(
    manualTask.id,
    "manager_zhang",
    "归档规则不明确，需要业务部门确认后处理"
  );

  console.log(`  ✓ 人工干预任务: ${manualTask.id.substring(0, 8)}...`);

  const dirtyStats = await dirtyDataService.getDirtyStats();
  const queueStats = await retryQueueService.getQueueStats();

  console.log("\n=== 坏数据场景触发完成 ===");
  console.log(`
  当前状态统计:

  【脏数据记录】
  - 总数: ${dirtyStats.total} 条
    - 待处理: ${dirtyStats.pending} 条
    - 审核中: ${dirtyStats.reviewed} 条
    - 已解决: ${dirtyStats.resolved} 条

  【重试队列】
  - 总数: ${queueStats.total} 个
    - 待处理: ${queueStats.pending} 个
    - 处理中: ${queueStats.processing} 个
    - 重试中: ${queueStats.retrying} 个
    - 成功: ${queueStats.success} 个
    - 失败: ${queueStats.failed} 个
    - 人工干预: ${queueStats.manualIntervention} 个
    - 死信: ${queueStats.deadLetter} 个

  下一步操作:
  - npm run generate-report  生成业务报告
  - npm run dev              启动开发服务器查看详情
  `);

  await AppDataSource.destroy();
}

triggerBadData().catch((error) => {
  console.error("触发坏数据失败:", error);
  process.exit(1);
});
