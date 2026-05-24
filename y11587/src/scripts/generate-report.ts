import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { ReportService } from "../services/report.service";
import * as path from "path";

async function generateReport() {
  console.log("=== 生成业务报告 ===");
  await AppDataSource.initialize();

  const reportService = new ReportService();

  console.log("\n正在生成业务报告...");
  const report = await reportService.generateBusinessReport();

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("               法务合同履约重试补偿队列 - 业务报告");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`\n生成时间: ${report.summary.generatedAt}`);

  console.log("\n┌─────────────────────────────────────────────────────────┐");
  console.log("│                    重试队列统计                          │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(`│  总任务数:    ${String(report.retryQueueStats.total).padEnd(8)}                              │`);
  console.log(`│  待处理:      ${String(report.retryQueueStats.pending).padEnd(8)}                              │`);
  console.log(`│  处理中:      ${String(report.retryQueueStats.processing).padEnd(8)}                              │`);
  console.log(`│  重试中:      ${String(report.retryQueueStats.retrying).padEnd(8)}                              │`);
  console.log(`│  成功:        ${String(report.retryQueueStats.success).padEnd(8)}                              │`);
  console.log(`│  失败:        ${String(report.retryQueueStats.failed).padEnd(8)}                              │`);
  console.log(`│  人工干预:    ${String(report.retryQueueStats.manualIntervention).padEnd(8)}                              │`);
  console.log(`│  死信:        ${String(report.retryQueueStats.deadLetter).padEnd(8)}                              │`);
  console.log("└─────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────┐");
  console.log("│                    死信统计                              │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(`│  总数:        ${String(report.deadLetterStats.total).padEnd(8)}                              │`);
  console.log(`│  待处理:      ${String(report.deadLetterStats.pending).padEnd(8)}                              │`);
  console.log(`│  已解决:      ${String(report.deadLetterStats.resolved).padEnd(8)}                              │`);
  console.log(`│  已驳回:      ${String(report.deadLetterStats.dismissed).padEnd(8)}                              │`);
  console.log(`│  已复活:      ${String(report.deadLetterStats.resurrected).padEnd(8)}                              │`);
  console.log("└─────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────┐");
  console.log("│                    脏数据统计                            │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(`│  总数:        ${String(report.dirtyDataStats.total).padEnd(8)}                              │`);
  console.log(`│  待处理:      ${String(report.dirtyDataStats.pending).padEnd(8)}                              │`);
  console.log(`│  审核中:      ${String(report.dirtyDataStats.reviewed).padEnd(8)}                              │`);
  console.log(`│  已解决:      ${String(report.dirtyDataStats.resolved).padEnd(8)}                              │`);
  console.log("└─────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────┐");
  console.log("│                    补偿统计                              │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(`│  总数:        ${String(report.compensationStats.total).padEnd(8)}                              │`);
  console.log(`│  总金额:      ¥${report.compensationStats.totalAmount.toFixed(2).padEnd(8)}                          │`);
  console.log(`│  待审批:      ${String(report.compensationStats.pending).padEnd(8)}                              │`);
  console.log(`│  已批准:      ${String(report.compensationStats.approved).padEnd(8)}                              │`);
  console.log(`│  处理中:      ${String(report.compensationStats.processing).padEnd(8)}                              │`);
  console.log(`│  已完成:      ${String(report.compensationStats.completed).padEnd(8)}                              │`);
  console.log("└─────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────┐");
  console.log("│                    按分类统计 - 重试失败                 │");
  console.log("├─────────────────────────────────────────────────────────┤");

  if (report.retryQueueStats.byCategory.length > 0) {
    report.retryQueueStats.byCategory.forEach((item: any) => {
      const label = getCategoryLabel(item.category);
      console.log(`│  ${label.padEnd(18)}: ${String(item.count).padEnd(8)}                          │`);
    });
  } else {
    console.log("│  暂无数据                                                │");
  }
  console.log("└─────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────┐");
  console.log("│                    按类型统计 - 脏数据                   │");
  console.log("├─────────────────────────────────────────────────────────┤");

  if (report.dirtyDataStats.byType.length > 0) {
    report.dirtyDataStats.byType.forEach((item: any) => {
      const label = getDirtyTypeLabel(item.type);
      console.log(`│  ${label.padEnd(18)}: ${String(item.count).padEnd(8)}                          │`);
    });
  } else {
    console.log("│  暂无数据                                                │");
  }
  console.log("└─────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────┐");
  console.log("│                    主要问题TOP                           │");
  console.log("├─────────────────────────────────────────────────────────┤");

  if (report.topIssues.length > 0) {
    report.topIssues.forEach((issue, index) => {
      console.log(`│  ${index + 1}. [${issue.type}] ${issue.category}`.padEnd(56) + "│");
      console.log(`│     数量: ${issue.count} - ${issue.description}`.padEnd(56) + "│");
    });
  } else {
    console.log("│  暂无主要问题                                             │");
  }
  console.log("└─────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────┐");
  console.log("│                    恢复建议                              │");
  console.log("├─────────────────────────────────────────────────────────┤");

  report.recoverySuggestions.forEach((suggestion, index) => {
    const lines = wrapText(suggestion, 50);
    lines.forEach((line, i) => {
      const prefix = i === 0 ? `  ${index + 1}. ` : "     ";
      console.log(`│${prefix}${line.padEnd(52)}│`);
    });
  });
  console.log("└─────────────────────────────────────────────────────────┘");

  console.log("\n正在导出CSV文件...");
  const exportDir = path.join(process.cwd(), "exports");
  const csvPath = await reportService.exportToCSV(report, exportDir);
  console.log(`✓ 业务报告CSV已导出: ${csvPath}`);

  const deadLetterCsv = await reportService.exportDeadLetterToCSV(exportDir);
  console.log(`✓ 死信列表CSV已导出: ${deadLetterCsv}`);

  const dirtyRecordsCsv = await reportService.exportDirtyRecordsToCSV(exportDir);
  console.log(`✓ 脏数据列表CSV已导出: ${dirtyRecordsCsv}`);

  console.log("\n=== 报告生成完成 ===");
  console.log(`
  导出文件目录: ${exportDir}

  可使用以下命令启动服务查看详情:
  - npm run dev
  `);

  await AppDataSource.destroy();
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    NETWORK_ERROR: "网络错误",
    VALIDATION_ERROR: "验证错误",
    MISSING_DATA: "缺失数据",
    CROSS_DAY_ISSUE: "跨日问题",
    NAME_CONFLICT: "名称冲突",
    AMOUNT_CONFLICT: "金额冲突",
    QUANTITY_CONFLICT: "数量冲突",
    SYSTEM_ERROR: "系统错误",
    BUSINESS_RULE: "业务规则",
    UNKNOWN: "未知",
  };
  return labels[category] || category;
}

function getDirtyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MISSING_FIELDS: "缺失字段",
    CROSS_DAY: "跨日异常",
    NAME_CHANGED: "名称变更",
    AMOUNT_CONFLICT: "金额冲突",
    QUANTITY_CONFLICT: "数量冲突",
    DUPLICATE: "重复记录",
    FORMAT_ERROR: "格式错误",
    OTHER: "其他",
  };
  return labels[type] || type;
}

function wrapText(text: string, maxLength: number): string[] {
  const lines: string[] = [];
  let currentLine = "";
  const words = text.split(" ");

  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxLength) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

generateReport().catch((error) => {
  console.error("生成报告失败:", error);
  process.exit(1);
});
