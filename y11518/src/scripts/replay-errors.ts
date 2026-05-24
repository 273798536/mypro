import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { DirtyRecordService } from "../services/DirtyRecordService";

async function replayErrors() {
  await AppDataSource.initialize();
  console.log("开始回放异常记录...\n");

  const dirtyRecordService = new DirtyRecordService();

  const stats = await dirtyRecordService.getDirtyRecordStats();
  console.log("========== 异常统计 ==========");
  console.log(`总数: ${stats.total}`);
  console.log(`待处理: ${stats.pending}`);
  console.log(`已解决: ${stats.resolved}`);
  console.log("\n按类型统计:");
  Object.entries(stats.byType).forEach(([type, count]) => {
    const typeText = {
      missing_field: "缺失字段",
      cross_day: "跨日处理",
      name_changed: "名称变更",
      amount_conflict: "金额冲突",
      quantity_conflict: "数量冲突",
      other: "其他",
    }[type] || type;
    console.log(`  ${typeText}: ${count}`);
  });

  const pending = await dirtyRecordService.getDirtyRecords("pending");
  console.log(`\n========== 待处理异常 (${pending.length} 条) ==========`);

  for (const record of pending) {
    const typeText = {
      missing_field: "[缺失字段]",
      cross_day: "[跨日处理]",
      name_changed: "[名称变更]",
      amount_conflict: "[金额冲突]",
      quantity_conflict: "[数量冲突]",
      other: "[其他]",
    }[record.dirtyType] || `[${record.dirtyType}]`;

    console.log(`\n${typeText} ${record.id}`);
    console.log(`  记录类型: ${record.recordType}`);
    console.log(`  描述: ${record.description}`);

    if (record.fieldErrors && record.fieldErrors.length > 0) {
      console.log("  字段错误:");
      record.fieldErrors.forEach((e: any) => {
        console.log(`    - ${e.field}: ${e.message}`);
        if (e.expected !== undefined) {
          console.log(`      期望: ${e.expected}, 实际: ${e.actual}`);
        }
      });
    }

    if (record.originalData) {
      console.log("  原始数据已保存，可用于修正");
    }
  }

  console.log("\n========== 自动修复建议 ==========");
  const autoFixable = pending.filter(
    (r) =>
      r.dirtyType === "amount_conflict" || r.dirtyType === "missing_field"
  );
  console.log(`可自动修复: ${autoFixable.length} 条`);

  for (const record of autoFixable) {
    if (record.dirtyType === "amount_conflict") {
      console.log(`  - ${record.id}: 金额冲突，可根据数量×单价重新计算`);
    } else if (record.dirtyType === "missing_field") {
      console.log(`  - ${record.id}: 缺失字段，需人工补充`);
    }
  }

  console.log("\n回放完成!");
  process.exit(0);
}

replayErrors().catch(console.error);
