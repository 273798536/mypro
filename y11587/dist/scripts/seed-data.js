"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const data_source_1 = require("../data-source");
const contract_service_1 = require("../services/contract.service");
const retry_queue_service_1 = require("../services/retry-queue.service");
const external_receipt_service_1 = require("../services/external-receipt.service");
const dirty_data_service_1 = require("../services/dirty-data.service");
async function seedData() {
    console.log("=== 导入样例数据 ===");
    await data_source_1.AppDataSource.initialize();
    const contractService = new contract_service_1.ContractService();
    const retryQueueService = new retry_queue_service_1.RetryQueueService();
    const externalReceiptService = new external_receipt_service_1.ExternalReceiptService();
    const dirtyDataService = new dirty_data_service_1.DirtyDataService();
    console.log("\n1. 创建合同样例数据...");
    const contract1 = await contractService.createContract({
        contractNo: "HT-202401-QX001",
        contractName: "东三环路抢修工程合同",
        repairSection: "东三环路K12-K15段",
        partyA: "市交通建设集团",
        partyB: "快速抢修工程有限公司",
        signDate: "2024-01-15",
        effectiveDate: "2024-01-20",
        expiryDate: "2024-12-31",
        totalAmount: 5800000.0,
        status: "ACTIVE",
    }, "admin");
    console.log(`  ✓ 创建合同: ${contract1.contractNo}`);
    const contract2 = await contractService.createContract({
        contractNo: "HT-202402-QX002",
        contractName: "北二环路管道修复合同",
        repairSection: "北二环路K5-K8段",
        partyA: "市市政工程管理处",
        partyB: "通达管道工程有限公司",
        signDate: "2024-02-10",
        effectiveDate: "2024-02-15",
        expiryDate: "2024-08-15",
        totalAmount: 2350000.0,
        status: "ACTIVE",
    }, "admin");
    console.log(`  ✓ 创建合同: ${contract2.contractNo}`);
    const contract3 = await contractService.createContract({
        contractNo: "HT-202403-QX003",
        contractName: "南区道路维护合同",
        repairSection: "南区各主干道",
        partyA: "南区建设局",
        partyB: "恒信市政工程有限公司",
        signDate: "2024-03-01",
        effectiveDate: "2024-03-05",
        expiryDate: "2024-09-05",
        totalAmount: 1200000.0,
        status: "PENDING",
    }, "admin");
    console.log(`  ✓ 创建合同: ${contract3.contractNo}`);
    console.log("\n2. 创建付款节点...");
    await contractService.addPaymentNode(contract1.id, {
        nodeName: "预付款",
        nodeType: "DEPOSIT",
        amount: 1160000.0,
        percentage: 20,
        expectedDate: "2024-01-25",
        actualDate: "2024-01-26",
        sortOrder: 1,
        status: "PAID",
        remark: "合同预付款20%",
    }, "admin");
    console.log("  ✓ 创建预付款节点");
    await contractService.addPaymentNode(contract1.id, {
        nodeName: "进度款-第一期",
        nodeType: "PROGRESS",
        amount: 1740000.0,
        percentage: 30,
        expectedDate: "2024-04-01",
        sortOrder: 2,
        status: "READY",
        remark: "完成工程量30%",
    }, "admin");
    console.log("  ✓ 创建进度款节点");
    await contractService.addPaymentNode(contract1.id, {
        nodeName: "验收款",
        nodeType: "ACCEPTANCE",
        amount: 2320000.0,
        percentage: 40,
        expectedDate: "2024-07-01",
        sortOrder: 3,
        status: "PENDING",
        remark: "竣工验收后支付",
    }, "admin");
    console.log("  ✓ 创建验收款节点");
    await contractService.addPaymentNode(contract1.id, {
        nodeName: "质保金",
        nodeType: "RETENTION",
        amount: 580000.0,
        percentage: 10,
        expectedDate: "2025-01-20",
        sortOrder: 4,
        status: "PENDING",
        remark: "质保期满后支付",
    }, "admin");
    console.log("  ✓ 创建质保金节点");
    console.log("\n3. 创建重试队列任务...");
    const task1 = await retryQueueService.enqueue("PAYMENT_PROCESS", {
        contractId: contract1.id,
        contractNo: contract1.contractNo,
        paymentNode: "进度款-第一期",
        amount: 1740000.0,
        action: "银行转账",
    }, {
        contractId: contract1.id,
        source: "manual_trigger",
        maxRetries: 3,
        createdBy: "operator_zhang",
    });
    console.log(`  ✓ 创建付款处理任务: ${task1.id.substring(0, 8)}...`);
    const task2 = await retryQueueService.enqueue("EMAIL_REMINDER", {
        contractId: contract1.id,
        emailType: "ACCEPTANCE_REMINDER",
        recipient: "finance@example.com",
        subject: "付款到期提醒",
    }, {
        contractId: contract1.id,
        source: "scheduled_job",
        createdBy: "system",
    });
    console.log(`  ✓ 创建邮件提醒任务: ${task2.id.substring(0, 8)}...`);
    const task3 = await retryQueueService.enqueue("CONTRACT_ARCHIVE", {
        contractId: contract2.id,
        archiveType: "FULL_ARCHIVE",
        includePDF: true,
        includePaymentHistory: true,
    }, {
        contractId: contract2.id,
        source: "manual_trigger",
        createdBy: "archivist_li",
    });
    console.log(`  ✓ 创建归档任务: ${task3.id.substring(0, 8)}...`);
    console.log("\n4. 创建外部回执...");
    const receipt1 = await externalReceiptService.submitReceipt("PAYMENT_CONFIRMATION", {
        amount: 1160000.0,
        paymentDate: "2024-01-26",
        transactionNo: "BANK-20240126-00892",
        payerAccount: "6222****1234",
        payeeAccount: "6228****5678",
    }, {
        contractId: contract1.id,
        sourceSystem: "银行系统",
        sourceRefNo: "BANK-20240126-00892",
        submittedBy: "system",
    });
    console.log(`  ✓ 创建付款回执: ${receipt1.receiptNo}`);
    const receipt2 = await externalReceiptService.submitReceipt("ACCEPTANCE_CONFIRMATION", {
        acceptanceDate: "2024-03-15",
        acceptedBy: "engineer_wang",
        acceptanceResult: "PASS",
        remark: "工程质量合格，同意验收",
    }, {
        contractId: contract1.id,
        sourceSystem: "项目管理系统",
        sourceRefNo: "PM-2024-0315-001",
        submittedBy: "engineer_wang",
    });
    console.log(`  ✓ 创建验收回执: ${receipt2.receiptNo}`);
    console.log("\n5. 创建补偿记录...");
    const compensation1 = await externalReceiptService.createCompensation("ERROR_CORRECTION", 5000.0, {
        contractId: contract1.id,
        externalReceiptId: receipt1.id,
        reason: "付款金额计算错误，需补付差额",
        createdBy: "finance_chen",
        currency: "CNY",
    });
    console.log(`  ✓ 创建补偿记录: ${compensation1.compensationNo}`);
    console.log("\n6. 为补偿记录创建重试队列任务...");
    const compTask = await retryQueueService.enqueue("COMPENSATION", {
        compensationId: compensation1.id,
        compensationNo: compensation1.compensationNo,
        receiptId: receipt1.id,
        receiptNo: receipt1.receiptNo,
        amount: compensation1.amount,
    }, {
        contractId: contract1.id,
        source: "compensation_create",
        sourceRef: compensation1.compensationNo,
        maxRetries: 3,
        createdBy: "finance_chen",
    });
    console.log(`  ✓ 创建补偿处理任务: ${compTask.id.substring(0, 8)}...`);
    console.log("\n=== 样例数据导入完成 ===");
    console.log(`
  统计摘要:
  - 合同: 3 份
  - 付款节点: 4 个
  - 重试任务: 6 个 (3个手动 + 2个回执 + 1个补偿)
  - 外部回执: 2 个
  - 补偿记录: 1 个

  下一步操作:
  - npm run trigger-bad-data  触发坏数据场景
  - npm run dev                启动开发服务器
  `);
    await data_source_1.AppDataSource.destroy();
}
seedData().catch((error) => {
    console.error("导入样例数据失败:", error);
    process.exit(1);
});
