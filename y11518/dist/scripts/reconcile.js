"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const data_source_1 = require("../data-source");
const ReconciliationService_1 = require("../services/ReconciliationService");
const WorkOrder_1 = require("../entities/WorkOrder");
async function reconcileAll() {
    await data_source_1.AppDataSource.initialize();
    console.log("开始对账流程...\n");
    const reconciliationService = new ReconciliationService_1.ReconciliationService();
    const workOrderRepo = data_source_1.AppDataSource.getRepository(WorkOrder_1.WorkOrder);
    const workOrders = await workOrderRepo.find();
    console.log(`找到 ${workOrders.length} 个工单，开始对账...\n`);
    const results = [];
    for (const wo of workOrders) {
        try {
            console.log(`[对账中] 工单: ${wo.orderNo}`);
            const result = await reconciliationService.reconcileWorkOrder(wo.orderNo, "system_batch");
            results.push(result);
            const statusText = {
                matched: "✓ 匹配",
                mismatch: "✗ 不匹配",
                partial_match: "⚠ 部分匹配",
                pending: "○ 待处理",
            }[result.status] || result.status;
            console.log(`  状态: ${statusText} | 数量差异: ${result.matchResult.quantityDiff} | 金额差异: ${result.matchResult.amountDiff}`);
        }
        catch (error) {
            console.log(`  ✗ 失败: ${error.message}`);
        }
    }
    const stats = await reconciliationService.getReconciliationStats();
    console.log("\n========== 对账汇总 ==========");
    console.log(`总工单数: ${stats.total}`);
    console.log(`已匹配: ${stats.matched}`);
    console.log(`不匹配: ${stats.mismatch}`);
    console.log(`部分匹配: ${stats.partialMatch}`);
    console.log(`总数量差异: ${stats.totalQuantityDiff}`);
    console.log(`总金额差异: ${stats.totalAmountDiff.toFixed(2)}`);
    console.log("\n对账完成!");
    process.exit(0);
}
reconcileAll().catch(console.error);
