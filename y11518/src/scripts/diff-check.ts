import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { AuditService } from "../services/AuditService";
import { WorkOrder } from "../entities/WorkOrder";

async function diffCheck() {
  await AppDataSource.initialize();
  console.log("开始差异检查...\n");

  const auditService = new AuditService();
  const workOrderRepo = AppDataSource.getRepository(WorkOrder);

  const workOrders = await workOrderRepo.find({ take: 3 });

  for (const wo of workOrders) {
    console.log(`工单: ${wo.orderNo}`);
    const history = await auditService.getSnapshotHistory("work_order", wo.id);

    console.log(`  快照数量: ${history.snapshots.length}`);

    if (history.changeSummary.length > 0) {
      console.log("  变更字段:");
      history.changeSummary.forEach((c: any) => {
        console.log(
          `    - ${c.field}: 变更${c.changeCount}次，最后变更: ${new Date(c.lastChangedAt).toLocaleString()}`
        );
      });
    }

    if (history.snapshots.length >= 2) {
      const latest = history.snapshots[0];
      const previous = history.snapshots[1];

      if (latest.diff && latest.diff.length > 0) {
        console.log("  最后一次变更差异:");
        latest.diff.forEach((d: any) => {
          console.log(
            `    ${d.op.toUpperCase()} ${d.field}: ${d.oldValue || "空"} → ${d.newValue || "空"}`
          );
        });
      }
    }

    console.log("");
  }

  console.log("差异检查完成!");
  process.exit(0);
}

diffCheck().catch(console.error);
