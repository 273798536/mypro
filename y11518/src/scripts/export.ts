import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { ExportService } from "../services/ExportService";

async function exportAll() {
  await AppDataSource.initialize();
  console.log("开始导出所有报表...\n");

  const exportService = new ExportService();

  try {
    const woPath = await exportService.exportWorkOrders();
    console.log(`✓ 工单报表: ${woPath}`);
  } catch (e: any) {
    console.log(`✗ 工单报表导出失败: ${e.message}`);
  }

  try {
    const invPath = await exportService.exportInventory();
    console.log(`✓ 库存报表: ${invPath}`);
  } catch (e: any) {
    console.log(`✗ 库存报表导出失败: ${e.message}`);
  }

  try {
    const recPath = await exportService.exportReconciliation();
    console.log(`✓ 对账报表: ${recPath}`);
  } catch (e: any) {
    console.log(`✗ 对账报表导出失败: ${e.message}`);
  }

  try {
    const dirtyPath = await exportService.exportDirtyRecords();
    console.log(`✓ 异常记录报表: ${dirtyPath}`);
  } catch (e: any) {
    console.log(`✗ 异常记录导出失败: ${e.message}`);
  }

  console.log("\n导出完成!");
  process.exit(0);
}

exportAll().catch(console.error);
