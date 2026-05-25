"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const data_source_1 = require("../data-source");
const AuditService_1 = require("../services/AuditService");
const WorkOrder_1 = require("../entities/WorkOrder");
const AuditSnapshot_1 = require("../entities/AuditSnapshot");
async function diffCheck() {
    await data_source_1.AppDataSource.initialize();
    console.log("开始差异检查...\n");
    const auditService = new AuditService_1.AuditService();
    const workOrderRepo = data_source_1.AppDataSource.getRepository(WorkOrder_1.WorkOrder);
    const snapshotRepo = data_source_1.AppDataSource.getRepository(AuditSnapshot_1.AuditSnapshot);
    console.log("=== 1. 审计快照汇总 ===");
    const allSnapshots = await snapshotRepo.find();
    console.log(`总快照数量: ${allSnapshots.length}`);
    const typeCounts = {};
    const targetCounts = {};
    for (const s of allSnapshots) {
        typeCounts[s.snapshotType] = (typeCounts[s.snapshotType] || 0) + 1;
        targetCounts[s.targetType] = (targetCounts[s.targetType] || 0) + 1;
    }
    console.log("按快照类型统计:");
    for (const [type, count] of Object.entries(typeCounts)) {
        console.log(`  ${type}: ${count}`);
    }
    console.log("按目标类型统计:");
    for (const [type, count] of Object.entries(targetCounts)) {
        console.log(`  ${type}: ${count}`);
    }
    console.log("\n=== 2. 工单快照检查 ===");
    const workOrders = await workOrderRepo.find({ take: 5 });
    for (const wo of workOrders) {
        console.log(`\n工单: ${wo.orderNo}`);
        const history = await auditService.getSnapshotHistory("work_order", wo.id);
        console.log(`  快照数量: ${history.snapshots.length}`);
        if (history.snapshots.length > 0) {
            console.log("  快照列表:");
            for (const s of history.snapshots) {
                console.log(`    - ${s.snapshotType} @ ${s.createdAt?.toLocaleString()}${s.operationName ? ` (${s.operationName})` : ""}`);
            }
        }
        if (history.changeSummary.length > 0) {
            console.log("  变更字段:");
            history.changeSummary.forEach((c) => {
                console.log(`    - ${c.field}: 变更${c.changeCount}次，最后变更: ${new Date(c.lastChangedAt).toLocaleString()}`);
            });
        }
        if (history.snapshots.length >= 2) {
            const latest = history.snapshots[0];
            if (latest.diff && latest.diff.length > 0) {
                console.log("  最后一次变更差异:");
                latest.diff.forEach((d) => {
                    console.log(`    ${d.op.toUpperCase()} ${d.field}: ${d.oldValue || "空"} → ${d.newValue || "空"}`);
                });
            }
        }
    }
    console.log("\n=== 3. 导出快照检查 ===");
    const exportSnapshots = await snapshotRepo.find({
        where: [{ snapshotType: "before_export" }, { snapshotType: "after_export" }],
        order: { createdAt: "DESC" },
    });
    console.log(`导出操作快照: ${exportSnapshots.length}`);
    for (const s of exportSnapshots.slice(0, 5)) {
        console.log(`  - ${s.snapshotType}: ${s.operationName || "export"} @ ${s.createdAt?.toLocaleString()}`);
        if (s.data?.filename)
            console.log(`    文件: ${s.data.filename}`);
        if (s.data?.recordCount)
            console.log(`    记录数: ${s.data.recordCount}`);
    }
    console.log("\n=== 4. 对账快照检查 ===");
    const reconcileSnapshots = await snapshotRepo.find({
        where: [
            { snapshotType: "before_reconcile" },
            { snapshotType: "after_reconcile" },
            { snapshotType: "before_rereconcile" },
            { snapshotType: "after_rereconcile" },
        ],
        order: { createdAt: "DESC" },
    });
    console.log(`对账操作快照: ${reconcileSnapshots.length}`);
    for (const s of reconcileSnapshots.slice(0, 5)) {
        console.log(`  - ${s.snapshotType}: ${s.operationName || "reconcile"} @ ${s.createdAt?.toLocaleString()}`);
    }
    console.log("\n差异检查完成!");
    process.exit(0);
}
diffCheck().catch(console.error);
